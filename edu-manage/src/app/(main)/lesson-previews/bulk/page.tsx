'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import dayjs, { type Dayjs } from 'dayjs'
import { Alert, Button, Checkbox, DatePicker, Empty, Select, Spin, Upload } from 'antd'
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CalendarOutlined,
  CheckOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import { suggestLessonForFile } from '@/lib/lesson-preview'
import { groupLessonPreviewSlots } from '@/lib/lesson-preview-groups'
import styles from './bulk.module.css'

type LessonMaterial = {
  id: string
  fileName: string
  uploadedByRole: string
  createdAt: string
}

type Lesson = {
  id: string
  groupId: string
  uploadGroupKey: string
  lessonDate: string
  startTime: string
  endTime: string
  subject: string
  groupName: string
  teacherId: string | null
  teacherName: string
  studentCount: number
  material: LessonMaterial | null
}

type LessonResponse = {
  grades: string[]
  lessons: Lesson[]
  selectedTerm: { id: string; name: string; status: string } | null
  date: string
}

type PendingFile = {
  id: string
  file: File
  uploadGroupKey: string
  autoMatched: boolean
}

const MAX_BATCH_FILE_SIZE = 200 * 1024 * 1024

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || '课次加载失败')
  return payload
}

function nextWeekendDate() {
  const today = dayjs()
  const weekday = today.day()
  if (weekday === 0 || weekday === 6) return today
  return today.add(6 - weekday, 'day')
}

function readableDate(date: Dayjs) {
  return date.format('M月D日') + (date.day() === 6 ? '周六' : '周日')
}

function fileSizeLabel(file: File) {
  return file.size >= 1024 * 1024
    ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.ceil(file.size / 1024))} KB`
}

function materialStatus(lesson: Lesson) {
  if (!lesson.material) return { key: 'pending', label: '待上传' }
  if (lesson.material.uploadedByRole === 'ADMIN') return { key: 'admin', label: '管理员已代传' }
  return { key: 'self', label: '老师已自传' }
}

export default function BulkLessonPreviewPage() {
  const [step, setStep] = useState(0)
  const [grade, setGrade] = useState('')
  const [date, setDate] = useState(nextWeekendDate)
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [files, setFiles] = useState<PendingFile[]>([])
  const [publishing, setPublishing] = useState(false)
  const initializedScope = useRef('')
  const dateKey = date.format('YYYY-MM-DD')
  const query = `/api/admin/materials/lesson-previews?grade=${encodeURIComponent(grade)}&date=${dateKey}`
  const { data, error, isLoading, mutate } = useSWR<LessonResponse>(query, fetcher, {
    refreshInterval: step === 0 ? 5000 : 0,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })
  const lessons = useMemo(() => data?.lessons || [], [data?.lessons])
  const uploadGroups = useMemo(() => groupLessonPreviewSlots(lessons), [lessons])
  const isHistoricalTerm = Boolean(data?.selectedTerm && data.selectedTerm.status !== 'ACTIVE')

  useEffect(() => {
    if (!grade && data?.grades?.length) setGrade(data.grades[0])
  }, [data?.grades, grade])

  useEffect(() => {
    const scope = `${grade}:${dateKey}`
    if (!grade || isLoading || initializedScope.current === scope) return
    initializedScope.current = scope
    setSelectedGroupIds(isHistoricalTerm ? [] : uploadGroups.filter((group) => group.pendingLessons.length > 0).map((group) => group.id))
    setFiles([])
    setStep(0)
  }, [dateKey, grade, isHistoricalTerm, isLoading, uploadGroups])

  const selectedGroups = useMemo(
    () => uploadGroups.filter((group) => selectedGroupIds.includes(group.id) && group.pendingLessons.length > 0),
    [uploadGroups, selectedGroupIds],
  )
  const assignmentCounts = useMemo(() => files.reduce<Record<string, number>>((counts, item) => {
    if (item.uploadGroupKey) counts[item.uploadGroupKey] = (counts[item.uploadGroupKey] || 0) + 1
    return counts
  }, {}), [files])
  const conflictingLessonIds = useMemo(
    () => new Set(Object.entries(assignmentCounts).filter(([, count]) => count > 1).map(([groupId]) => groupId)),
    [assignmentCounts],
  )
  const assignedFiles = useMemo(
    () => files.filter((item) => item.uploadGroupKey && !conflictingLessonIds.has(item.uploadGroupKey)),
    [conflictingLessonIds, files],
  )
  const hasUnassignedFiles = files.some((item) => !item.uploadGroupKey)
  const assignedGroups = useMemo(() => new Map(selectedGroups.map((group) => [group.id, group])), [selectedGroups])
  const familyReach = assignedFiles.reduce((total, item) => total + (assignedGroups.get(item.uploadGroupKey)?.studentCount || 0), 0)

  const updateScope = (nextGrade: string, nextDate: Dayjs) => {
    initializedScope.current = ''
    setGrade(nextGrade)
    setDate(nextDate)
    setSelectedGroupIds([])
    setFiles([])
    setStep(0)
  }

  const addFiles = (incoming: File[]) => {
    if (files.length + incoming.length > 20) toast.warning('单次最多添加 20 份文件，超出的文件未加入')
    if ([...files.map((item) => item.file), ...incoming].reduce((total, file) => total + file.size, 0) > MAX_BATCH_FILE_SIZE) {
      toast.warning('单批文件总大小不能超过 200MB，请拆分后上传')
      return
    }
    setFiles((current) => {
      const available = selectedGroups
      const occupied = new Set(current.map((item) => item.uploadGroupKey).filter(Boolean))
      const additions: PendingFile[] = []
      for (const file of incoming.slice(0, Math.max(0, 20 - current.length))) {
        const matched = suggestLessonForFile(file.name, available, occupied)
        if (matched) occupied.add(matched.id)
        additions.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          uploadGroupKey: matched?.id || '',
          autoMatched: Boolean(matched),
        })
      }
      return [...current, ...additions]
    })
  }

  const changeAssignment = (fileId: string, uploadGroupKey: string) => {
    if (uploadGroupKey && files.some((item) => item.id !== fileId && item.uploadGroupKey === uploadGroupKey)) {
      toast.warning('这组同科目连堂课已经分配了另一个文件，请调整其中一份文件')
    }
    setFiles((current) => current.map((item) => item.id === fileId
      ? { ...item, uploadGroupKey, autoMatched: false }
      : item))
  }

  const publish = async () => {
    if (!assignedFiles.length) return toast.warning('请至少为一份文件选择对应课次')
    if (hasUnassignedFiles) return toast.warning('请先为所有文件选择课次，或移除本次不发布的文件')
    if (conflictingLessonIds.size) return toast.warning('请先解决重复分配的课次')
    setPublishing(true)
    try {
      const formData = new FormData()
      const assignments = assignedFiles.map((item, index) => {
        const fileKey = `file-${index}`
        formData.append(fileKey, item.file)
        const group = assignedGroups.get(item.uploadGroupKey)
        return {
          fileKey,
          lessonIds: group?.pendingLessons.map((lesson) => lesson.id) || [],
          title: item.file.name.replace(/\.[^.]+$/, ''),
        }
      })
      formData.append('assignments', JSON.stringify(assignments))
      const response = await fetch('/api/admin/materials/lesson-previews', { method: 'POST', body: formData })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '批量发布失败')
      toast.success(`已上传 ${payload.count || assignedFiles.length} 份文件，覆盖 ${payload.sessionCount || assignedFiles.length} 个课次，家长端已同步更新`)
      setFiles([])
      setStep(0)
      initializedScope.current = ''
      await mutate()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '批量发布失败')
    } finally {
      setPublishing(false)
    }
  }

  const stepLabels = ['选择年级与日期', '批量上传与分配', '确认并发布']

  return (
    <main className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <h1>周末课讲义批量上传</h1>
          <p>按年级一次性上传多个学科讲义，确认课次对应关系后统一发布，家长端同步展示。</p>
        </div>
        <span className={styles.termBadge}><CalendarOutlined /> {data?.selectedTerm?.name || '当前运营批次'}</span>
      </header>

      <nav className={styles.steps} aria-label="上传步骤">
        {stepLabels.map((label, index) => (
          <button
            type="button"
            key={label}
            className={`${styles.step} ${index === step ? styles.active : ''} ${index < step ? styles.done : ''}`}
            onClick={() => index < step && setStep(index)}
            disabled={index > step}
          >
            <span>{index < step ? <CheckOutlined /> : index + 1}</span>{label}
          </button>
        ))}
      </nav>

      {isHistoricalTerm && <Alert className={styles.scopeAlert} type="info" showIcon message="当前正在查看历史运营批次" description="历史批次的讲义状态可以查看，但不能新增或覆盖。请先在“运营批次”中进入当前工作区。" />}

      {step === 0 && (
        <section className={styles.pane} aria-labelledby="scope-heading">
          <div className={styles.filterBar}>
            <label>
              <span>年级</span>
              <Select
                value={grade || undefined}
                placeholder="选择年级"
                options={(data?.grades || []).map((item) => ({ label: `${item}年级`, value: item }))}
                onChange={(value) => updateScope(value, date)}
                notFoundContent="当前批次暂无年级"
              />
            </label>
            <label>
              <span>周末课日期</span>
              <DatePicker
                value={date}
                allowClear={false}
                inputReadOnly
                format={(value) => readableDate(value)}
                disabledDate={(value) => value.day() !== 0 && value.day() !== 6}
                onChange={(value) => value && updateScope(grade, value)}
                suffixIcon={<CalendarOutlined />}
              />
            </label>
          </div>

          {error ? (
            <Alert type="error" showIcon message="课次清单加载失败" description={error.message} action={<Button icon={<ReloadOutlined />} onClick={() => void mutate()}>重试</Button>} />
          ) : isLoading ? (
            <div className={styles.loading}><Spin /><span>正在核对当天课次与讲义状态…</span></div>
          ) : !grade ? (
            <Empty description="当前运营批次还没有可选年级" />
          ) : (
            <>
              <div className={styles.listHeading} id="scope-heading">
                <strong>{grade}年级 · {readableDate(date)}</strong>
                <span>共 {lessons.length} 个课次，合并为 {uploadGroups.length} 组；已选 {selectedGroupIds.length} 组待上传内容</span>
              </div>
              <div className={styles.slotList}>
                {uploadGroups.map((group) => {
                  const pending = group.pendingLessons.length > 0
                  const representative = group.lessons[0]
                  const status = pending ? { key: 'pending', label: `${group.pendingLessons.length}/${group.lessons.length}节待上传` } : materialStatus(representative)
                  return (
                    <label className={`${styles.slotRow} ${!pending ? styles.locked : ''}`} key={group.id}>
                      <Checkbox
                        checked={selectedGroupIds.includes(group.id)}
                        disabled={!pending || isHistoricalTerm}
                        onChange={(event) => setSelectedGroupIds((current) => event.target.checked
                          ? [...current, group.id]
                          : current.filter((id) => id !== group.id))}
                      />
                      <time>{group.timeRanges.join('、')}</time>
                      <span className={styles.slotBody}>
                        <strong>{group.subject} · {group.groupName}</strong>
                        <small>{group.teacherName} · {group.lessons.length} 节 · {group.studentCount} 人{!pending && representative?.material ? ` · ${representative.material.fileName}` : ''}</small>
                      </span>
                      <span className={`${styles.status} ${styles[status.key]}`}>{status.label}</span>
                    </label>
                  )
                })}
                {!lessons.length && <div className={styles.empty}><CalendarOutlined /><strong>当天没有符合条件的周末课</strong><span>请换一个年级或周末日期查看。</span></div>}
              </div>
              <div className={styles.actions}>
                <Button type="primary" size="large" disabled={!selectedGroups.length} onClick={() => setStep(1)}>
                  下一步：上传 {selectedGroups.length || ''} 份学科讲义 <ArrowRightOutlined />
                </Button>
              </div>
            </>
          )}
        </section>
      )}

      {step === 1 && (
        <section className={styles.pane}>
          <div className={styles.sectionHead}>
            <h2>批量上传与智能分配</h2>
            <p>同班级、同日期、同学科、同任课教师的多节连堂课共用一份讲义；文件名包含学科时会自动匹配。</p>
          </div>
          <div className={styles.uploadLayout}>
            <Upload.Dragger
              className={styles.dropzone}
              multiple
              showUploadList={false}
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z"
              beforeUpload={(file, list) => {
                if (file === list[0]) addFiles(list)
                return false
              }}
            >
              <CloudUploadOutlined />
              <strong>拖入全部讲义文件</strong>
              <span>或点击选择多个文件，单个文件最大 50MB</span>
              <small>支持 PDF、Word、PPT、Excel、图片与压缩包</small>
            </Upload.Dragger>

            <div className={styles.fileColumn}>
              <div className={styles.fileColumnHead}>
                <strong>待发布文件</strong><span>{files.length} 份</span>
              </div>
              {conflictingLessonIds.size > 0 && <Alert type="warning" showIcon message="存在重复分配" description="同一组连堂课只能对应一份文件，请修改标红的分配。" />}
              {hasUnassignedFiles && <Alert type="info" showIcon message="还有文件未分配" description="请手动选择对应课次；本次不发布的文件请先从列表移除。" />}
              <div className={styles.fileList}>
                {files.map((item) => {
                  const conflict = item.uploadGroupKey && conflictingLessonIds.has(item.uploadGroupKey)
                  return (
                    <article className={`${styles.fileItem} ${conflict ? styles.conflict : ''}`} key={item.id}>
                      <span className={styles.fileIcon}><FileTextOutlined /></span>
                      <span className={styles.fileInfo}>
                        <strong title={item.file.name}>{item.file.name}</strong>
                        <small>{fileSizeLabel(item.file)}</small>
                      </span>
                      <Select
                        value={item.uploadGroupKey || undefined}
                        placeholder="请选择对应课次…"
                        status={conflict ? 'error' : undefined}
                        options={selectedGroups.map((group) => ({ value: group.id, label: `${group.subject} · ${group.groupName} · ${group.teacherName} · ${group.timeRanges.join('、')}` }))}
                        onChange={(value) => changeAssignment(item.id, value)}
                      />
                      <span className={`${styles.matchTag} ${item.uploadGroupKey ? styles.matched : styles.unmatched}`}>
                        {conflict ? '分配冲突' : item.autoMatched ? '已自动匹配' : item.uploadGroupKey ? '已手动匹配' : '未识别，需手动选择'}
                      </span>
                      <Button type="text" danger aria-label={`移除 ${item.file.name}`} icon={<DeleteOutlined />} onClick={() => setFiles((current) => current.filter((file) => file.id !== item.id))} />
                    </article>
                  )
                })}
                {!files.length && <div className={styles.fileEmpty}><FileTextOutlined /><span>文件加入后会在这里逐一确认课次</span></div>}
              </div>
            </div>
          </div>
          <div className={styles.actionsSplit}>
            <Button size="large" icon={<ArrowLeftOutlined />} onClick={() => setStep(0)}>上一步</Button>
            <Button type="primary" size="large" disabled={!assignedFiles.length || hasUnassignedFiles || conflictingLessonIds.size > 0} onClick={() => setStep(2)}>
              下一步：确认信息 <ArrowRightOutlined />
            </Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className={styles.pane}>
          <div className={styles.sectionHead}>
            <h2>确认并发布</h2>
            <p>发布后，对应课次的家长会在首页立即看到讲义预告卡片。</p>
          </div>
          <div className={styles.summaryList}>
            {assignedFiles.map((item) => {
              const group = assignedGroups.get(item.uploadGroupKey)
              if (!group) return null
              return (
                <article className={styles.summaryCard} key={item.id}>
                  <div className={styles.summaryTop}>
                    <strong>{group.subject} · {group.groupName} · {group.teacherName} · {group.timeRanges.join('、')}</strong>
                    <span>预计覆盖 {group.studentCount} 名学员家庭</span>
                  </div>
                  <p>此文件会关联 {group.pendingLessons.length} 个待发布课次。</p>
                  <div className={styles.summaryFile}><FileTextOutlined /><span>{item.file.name}</span><small>{fileSizeLabel(item.file)}</small></div>
                  <p><SafetyCertificateOutlined /> 本条由管理员代传，教师端会显示“管理员代传”，不计入老师本人上传。</p>
                </article>
              )
            })}
          </div>
          <div className={styles.publishBar}>
            <div>
              <strong>本次将上传 {assignedFiles.length} 份文件，覆盖 {assignedFiles.reduce((count, item) => count + (assignedGroups.get(item.uploadGroupKey)?.pendingLessons.length || 0), 0)} 个课次、预计触达 {familyReach} 名学员家庭</strong>
              <span>发布后不可批量撤回，如需下架请单条删除。</span>
            </div>
            <Button type="primary" size="large" loading={publishing} icon={<CheckOutlined />} onClick={() => void publish()}>确认发布</Button>
          </div>
          <div className={styles.actionsBack}><Button size="large" icon={<ArrowLeftOutlined />} disabled={publishing} onClick={() => setStep(1)}>返回调整</Button></div>
        </section>
      )}
    </main>
  )
}
