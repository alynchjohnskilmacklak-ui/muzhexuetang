'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Drawer, Input, Popconfirm, Segmented, Skeleton, Upload } from 'antd'
import {
  CalendarOutlined,
  CameraOutlined,
  CheckCircleFilled,
  DeleteOutlined,
  FileTextOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import { useContainTouchScroll } from '@/hooks/useContainTouchScroll'

interface LessonMaterial {
  id: string
  title: string
  fileName: string
  fileType: string
  description: string | null
  createdAt: string
  uploadedByRole: string
}

interface WeekendLesson {
  id: string
  groupId: string
  grade: string | null
  startTime: string
  endTime: string
  subject: string
  groupName: string
  roomName: string
  studentCount: number
  material: LessonMaterial | null
}

/** 同一天内同 group 的相邻节合并为一个连堂组 */
function mergeConsecutive(lessons: WeekendLesson[]): Array<WeekendLesson & { groupLessons: WeekendLesson[] }> {
  const out: Array<WeekendLesson & { groupLessons: WeekendLesson[] }> = []
  for (const lesson of lessons) {
    const last = out[out.length - 1]
    const adjacent = last && last.groupId === lesson.groupId
      && Math.abs(timeToMin(lesson.startTime) - timeToMin(last.endTime)) <= 15
    if (adjacent) {
      last.groupLessons.push(lesson)
      last.endTime = lesson.endTime
      if (!last.material && lesson.material) last.material = lesson.material
    } else {
      out.push({ ...lesson, groupLessons: [lesson] })
    }
  }
  return out
}

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

interface WeekendDay {
  id: string
  lessonDate: string
  grade: string
  teacherName: string
  lessons: WeekendLesson[]
}

type LessonFilter = 'this-week' | 'next-week' | 'all'

function dayLabel(date: string, today: string, tomorrow: string) {
  if (date === today) return '今天'
  if (date === tomorrow) return '明天'
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short', timeZone: 'Asia/Shanghai' }).format(new Date(`${date}T12:00:00+08:00`))
}

function fileSizeLabel(file: File) {
  return file.size >= 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(file.size / 1024)} KB`
}

function dateValue(date: string) {
  return Date.parse(`${date}T12:00:00Z`)
}

function weekStartValue(date: string) {
  const value = dateValue(date)
  const weekday = new Date(value).getUTCDay()
  return value - (weekday === 0 ? 6 : weekday - 1) * 86400000
}

function compactDate(date: string) {
  const parsed = new Date(`${date}T12:00:00Z`)
  return {
    date: `${parsed.getUTCMonth() + 1}/${parsed.getUTCDate()}`,
    weekday: new Intl.DateTimeFormat('zh-CN', { weekday: 'short', timeZone: 'Asia/Shanghai' }).format(new Date(`${date}T12:00:00+08:00`)),
  }
}

export function LessonPreviewWorkspace() {
  const [days, setDays] = useState<WeekendDay[]>([])
  const [today, setToday] = useState('')
  const [tomorrow, setTomorrow] = useState('')
  const [filter, setFilter] = useState<LessonFilter>('this-week')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState<{ day: WeekendDay; lesson: WeekendLesson } | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const cameraRef = useRef<HTMLInputElement>(null)
  useContainTouchScroll(!!selectedTarget, '.weekend-upload-drawer .ant-drawer-body')

  const loadLessons = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/teacher/materials/lesson-previews')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '周末课加载失败')
      setDays(data.days || [])
      setToday(data.today || '')
      setTomorrow(data.tomorrow || '')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '周末课加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadLessons() }, [loadLessons])

  const visibleDays = useMemo(() => {
    if (filter === 'all' || !today) return days
    const thisWeekStart = weekStartValue(today)
    const nextWeekStart = thisWeekStart + 7 * 86400000
    const followingWeekStart = nextWeekStart + 7 * 86400000
    return days.filter((day) => {
      const value = dateValue(day.lessonDate)
      return filter === 'this-week'
        ? value >= thisWeekStart && value < nextWeekStart
        : value >= nextWeekStart && value < followingWeekStart
    })
  }, [days, filter, today])

  const chooseLesson = (day: WeekendDay, lesson: WeekendLesson) => {
    setSelectedTarget({ day, lesson })
    setTitle(lesson.material?.title || '')
    setDescription(lesson.material?.description || '')
    setSelectedFile(null)
  }

  const setPickedFile = (file: File) => {
    setSelectedFile(file)
    if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ''))
  }

  const submit = async () => {
    if (!selectedTarget || !selectedFile) return toast.warning('请先选择讲义文件或拍照')
    if (!title.trim()) return toast.warning('请填写讲义标题')
    setSaving(true)
    try {
      const body = new FormData()
      body.append('file', selectedFile)
      body.append('title', title.trim())
      body.append('description', description.trim())
      body.append('classLessonId', selectedTarget.lesson.id)
      body.append('grade', selectedTarget.lesson.grade || selectedTarget.day.grade)
      body.append('subject', selectedTarget.lesson.subject)
      body.append('audience', 'STUDENT')
      body.append('status', 'PUBLISHED')
      const response = await fetch('/api/teacher/materials', { method: 'POST', body })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '讲义上传失败')
      toast.success(selectedTarget.lesson.material ? '本节讲义已替换，家长端已同步更新' : '本节讲义已发布，家长可以查看')
      setSelectedTarget(null)
      await loadLessons()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '讲义上传失败')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (materialId: string) => {
    const response = await fetch(`/api/teacher/materials/${materialId}`, { method: 'DELETE' })
    if (!response.ok) return toast.error('讲义删除失败')
    toast.success('讲义已撤下')
    await loadLessons()
  }

  return (
    <main className="lesson-preview-page">
      <header className="lesson-preview-page__header">
        <div>
          <h1>周末课讲义</h1>
          <p>按具体课次准备讲义。发布后，本节周末课对应家长的首页会立即看到。</p>
        </div>
      </header>

      <div className="lesson-preview-page__toolbar">
        <Segmented<LessonFilter>
          value={filter}
          onChange={setFilter}
          options={[
            { label: '本周', value: 'this-week' },
            { label: '下周', value: 'next-week' },
            { label: `全部 ${days.length}`, value: 'all' },
          ]}
        />
      </div>
      <p className="lesson-preview-page__week-hint">默认只显示本周需要准备的讲义，想提前备课时可切换到下周或全部。</p>

      {loading ? (
        <div className="lesson-preview-page__loading"><Skeleton active paragraph={{ rows: 4 }} /><Skeleton active paragraph={{ rows: 4 }} /></div>
      ) : visibleDays.length ? (
        <div className="lesson-preview-list">
          {visibleDays.map((day) => (
            <article className="lesson-preview-row" key={day.lessonDate}>
              <div className="lesson-preview-row__top">
                <div className="lesson-preview-row__date">
                  <strong>{compactDate(day.lessonDate).date}</strong>
                  <span>{compactDate(day.lessonDate).weekday}</span>
                </div>
                <div className="lesson-preview-row__summary">
                  <strong>共 {day.lessons.length} 节课 · {day.lessons.filter((lesson) => lesson.material).length} 节已上传</strong>
                  <span>{[...new Set(day.lessons.map((lesson) => lesson.subject))].join('、')} · {day.teacherName}</span>
                </div>
              </div>
              <div className="lesson-preview-row__sessions">
                {mergeConsecutive(day.lessons).map((lesson) => (
                  <div className="lesson-preview-row__lesson" key={lesson.id}>
                    <span>{lesson.startTime}-{lesson.endTime} · {lesson.subject} · {lesson.groupName}{lesson.groupLessons.length > 1 ? `（${lesson.groupLessons.length}节连堂）` : ''}</span>
                    <div className="lesson-preview-row__actions">
                      <Button className={lesson.material ? 'is-done' : ''} type={lesson.material ? 'default' : 'primary'} icon={lesson.material ? <CheckCircleFilled /> : <UploadOutlined />} onClick={() => chooseLesson(day, lesson)}>
                        {lesson.material ? `${lesson.material.uploadedByRole === 'ADMIN' ? '管理员代传' : '已上传'} ${lesson.material.fileName} · 点击替换` : '上传本节讲义'}
                      </Button>
                      {lesson.material && (
                        <Popconfirm title="确认撤下这份讲义？" description="撤下后家长将不能继续查看。" onConfirm={() => remove(lesson.material!.id)}>
                          <Button aria-label={`撤下 ${lesson.material.fileName}`} danger type="text" icon={<DeleteOutlined />} />
                        </Popconfirm>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="lesson-preview-empty">
          <CalendarOutlined />
          <strong>{days.length ? '当前筛选下没有日期' : '暂时没有后续周末课'}</strong>
          <span>{days.length ? '切换上方分类查看其他日期。' : '排课完成后，课程会按日期自动汇总在这里。'}</span>
        </div>
      )}

      <Drawer
        title={selectedTarget?.lesson.material ? '替换本节讲义' : '上传本节讲义'}
        open={!!selectedTarget}
        onClose={() => setSelectedTarget(null)}
        placement="bottom"
        height="min(650px, calc(100dvh - 18px))"
        className="weekend-upload-drawer"
        maskClosable={!saving}
        styles={{ body: { overflowY: 'auto', overscrollBehaviorY: 'contain', padding: '12px 16px 18px' }, footer: { padding: '10px 16px calc(10px + env(safe-area-inset-bottom))' } }}
        footer={<Button type="primary" block size="large" loading={saving} onClick={submit}>发布给家长</Button>}
      >
        {selectedTarget && <div className="weekend-upload-form">
          <label>适用日期与课程</label>
          <div className="weekend-course-locked"><strong>{dayLabel(selectedTarget.day.lessonDate, today, tomorrow)} · {selectedTarget.lesson.subject}</strong><small>{selectedTarget.lesson.startTime}-{selectedTarget.lesson.endTime} · {selectedTarget.lesson.groupName}</small></div>
          <label>讲义文件</label>
          <div className="weekend-upload-zone">
            <Upload beforeUpload={(file) => { setPickedFile(file); return false }} showUploadList={false} accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.ppt,.pptx">
              <Button type="text" icon={<UploadOutlined />}>选择文件或相册</Button>
            </Upload>
            <span>PDF、Word、PPT 或图片，最大 50MB</span>
            <Button type="link" icon={<CameraOutlined />} onClick={() => cameraRef.current?.click()}>拍照上传</Button>
            <input ref={cameraRef} hidden type="file" accept="image/*" capture="environment" onChange={(event) => { const file = event.target.files?.[0]; if (file) setPickedFile(file); event.currentTarget.value = '' }} />
          </div>
          {selectedFile && <div className="weekend-file-chip"><FileTextOutlined /><span><strong>{selectedFile.name}</strong><small>{fileSizeLabel(selectedFile)}</small></span></div>}
          <label htmlFor="lesson-preview-title">讲义标题</label>
          <Input id="lesson-preview-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} showCount placeholder="例如：二次函数图像与性质" />
          <label htmlFor="lesson-preview-description">给家长的说明（选填）</label>
          <Input.TextArea id="lesson-preview-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={2} maxLength={200} showCount placeholder="简单说明本节课重点" />
        </div>}
      </Drawer>

      <style jsx>{`
        .lesson-preview-page { width: 100%; max-width: 980px; margin: 0 auto; }
        .lesson-preview-page__header { margin-bottom: 18px; }
        .lesson-preview-page__header h1 { margin: 0 0 6px; color: var(--color-ink); font-size: 28px; line-height: 1.25; }
        .lesson-preview-page__header p { max-width: 620px; margin: 0; color: var(--color-ink-muted); font-size: 14px; line-height: 1.65; }
        .lesson-preview-page__toolbar { display: flex; margin-bottom: 8px; }
        .lesson-preview-page__week-hint { margin: 0 0 12px; color: var(--color-ink-subtle); font-size: 12px; }
        .lesson-preview-page__loading { display: grid; gap: 12px; }
        .lesson-preview-list { display: flex; flex-direction: column; gap: 10px; }
        .lesson-preview-row { padding: 14px 15px; border: 1px solid var(--color-hairline); border-radius: var(--radius-lg); background: var(--color-surface-1); }
        .lesson-preview-row__top { display: flex; align-items: center; gap: 10px; }
        .lesson-preview-row__date { width: 42px; height: 42px; flex: 0 0 42px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: var(--radius-md); color: var(--color-role-teacher); background: var(--color-role-teacher-bg); }
        .lesson-preview-row__date strong { font-size: 14px; line-height: 1.1; font-variant-numeric: tabular-nums; }
        .lesson-preview-row__date span { margin-top: 1px; font-size: 12px; font-weight: 650; }
        .lesson-preview-row__summary { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .lesson-preview-row__summary strong { color: var(--color-ink); font-size: 16px; }
        .lesson-preview-row__summary span { overflow: hidden; color: var(--color-ink-subtle); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
        .lesson-preview-row__sessions { display: flex; flex-direction: column; gap: 9px; margin: 10px 0 0; }
        .lesson-preview-row__lesson { display: grid; gap: 6px; padding-top: 10px; border-top: 1px solid var(--color-hairline); }
        .lesson-preview-row__lesson > span { color: var(--color-ink-muted); font-size: 12px; font-variant-numeric: tabular-nums; }
        .lesson-preview-row__actions { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px; }
        .lesson-preview-row__actions :global(.ant-btn:first-child) { min-height: 42px; overflow: hidden; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
        .lesson-preview-row__actions :global(.ant-btn.is-done) { border-color: transparent; color: var(--color-role-teacher); background: var(--color-role-teacher-bg); }
        .lesson-preview-row__actions :global(.ant-btn.is-done:hover), .lesson-preview-row__actions :global(.ant-btn.is-done:focus-visible) { border-color: var(--color-role-teacher) !important; color: var(--color-role-teacher) !important; background: var(--color-role-teacher-bg) !important; }
        .lesson-preview-row__actions :global(.ant-btn:last-child) { min-width: 42px; min-height: 42px; }
        .lesson-preview-empty { min-height: 260px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; border: 1px dashed var(--color-hairline-strong); border-radius: var(--radius-lg); color: var(--color-ink-subtle); background: var(--color-surface-1); text-align: center; }
        .lesson-preview-empty > :first-child { font-size: 28px; }
        .lesson-preview-empty strong { color: var(--color-ink); font-size: 16px; }
        .lesson-preview-empty span { font-size: 12px; }
        .weekend-upload-form { max-width: 620px; margin: 0 auto; display: flex; flex-direction: column; gap: 8px; }
        .weekend-upload-form > label { margin-top: 7px; color: var(--color-ink-muted); font-size: 12px; font-weight: 700; }
        .weekend-course-locked { display: flex; flex-direction: column; gap: 5px; padding: 11px 13px; border-radius: var(--radius-md); color: var(--color-ink-muted); background: var(--color-canvas); font-size: 12px; }
        .weekend-course-locked strong { color: var(--color-ink); font-size: 13px; }
        .weekend-upload-zone { padding: 16px 14px; border: 1px dashed var(--color-role-teacher); border-radius: var(--radius-lg); background: var(--color-role-teacher-bg); text-align: center; }
        .weekend-upload-zone > span { display: block; margin: 4px 0 1px; color: var(--color-ink-muted); font-size: 12px; }
        .weekend-file-chip { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--color-hairline); border-radius: var(--radius-md); color: var(--color-role-teacher); }
        .weekend-file-chip > span { min-width: 0; display: flex; flex-direction: column; }
        .weekend-file-chip strong { overflow: hidden; color: var(--color-ink); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
        .weekend-file-chip small { color: var(--color-ink-muted); font-size: 12px; }
        :global(.weekend-upload-drawer .ant-drawer-content), :global(.weekend-upload-drawer .ant-drawer-wrapper-body) { overflow: hidden; }
        :global(.weekend-upload-drawer .ant-drawer-body) { -webkit-overflow-scrolling: touch; touch-action: pan-y; }
        @media (max-width: 700px) {
          .lesson-preview-page__header h1 { font-size: 20px; }
          .lesson-preview-page__toolbar { overflow-x: auto; }
          .lesson-preview-row { padding: 12px; }
        }
      `}</style>
    </main>
  )
}
