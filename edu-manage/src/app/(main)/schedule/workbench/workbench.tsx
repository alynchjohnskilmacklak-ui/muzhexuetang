'use client'

import { useMemo, useState, type ReactNode } from 'react'
import useSWR from 'swr'
import { useSWRConfig } from 'swr'
import { useRouter } from 'next/navigation'
import dayjs, { type Dayjs } from 'dayjs'
import { Alert, Button, Card, DatePicker, Empty, Input, Popconfirm, Select, Space, Tag, message } from 'antd'
import {
  ArrowLeftOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined,
  CrownOutlined, PlusOutlined, ReloadOutlined, TeamOutlined, UserSwitchOutlined,
} from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { AdaptiveSelect } from '@/components/AdaptiveSelect'
import { ManualLessonModal } from '@/app/(main)/schedule/_components/ManualLessonModal'
import { ScheduleFormModal } from '@/app/(main)/schedule/_components/ScheduleFormModal'
import { CopyFridayToSaturdayModal } from '@/app/(main)/schedule/_components/CopyFridayToSaturdayModal'
import { SchedulePeriodSettingsModal } from '@/app/(main)/schedule/_components/SchedulePeriodSettingsModal'
import { useDivision } from '@/contexts/DivisionContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSchedulePeriods } from '@/hooks/useSchedulePeriods'

type ActionKey = 'move-date' | 'extra' | 'new' | 'copy' | 'teachers' | 'hours' | 'periods'
type Group = {
  id: string
  name: string
  status: string
  teacherId: string | null
  teacher?: { id: string; name: string } | null
  term?: { name: string; status: string } | null
  course?: { name: string; subject: string | null; grade: string | null } | null
  teacherAssignments?: Array<{ teacherId: string; subject: string | null; teacher?: { id: string; name: string } | null }>
  enrollments?: Array<{
    id: string
    studentId: string
    subjects: string[]
    remainHours: number
    usedHours: number
    totalHours: number
    enrolledAt: string
    student?: { name: string } | null
  }>
  lessonMinutes?: number
}
type Teacher = { id: string; name: string }

const fetchJson = async (url: string) => {
  const response = await fetch(url)
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || '数据加载失败')
  return payload
}

const actionItems: Array<{ key: ActionKey; label: string; description: string; icon: ReactNode }> = [
  { key: 'move-date', label: '调整上课日', description: '按原课表补入目标日期，并按规则处理替换日', icon: <CalendarOutlined /> },
  { key: 'extra', label: '现有班级临时加课', description: '为已开班的某个科目新增一次课', icon: <PlusOutlined /> },
  { key: 'new', label: '新建课次', description: '创建独立课程或个性化课次', icon: <CalendarOutlined /> },
  { key: 'copy', label: '周五复制到周六', description: '先检查冲突，再批量复制课次安排', icon: <CheckCircleOutlined /> },
  { key: 'teachers', label: '教师更换', description: '查看当前授课老师并调整后续课次', icon: <UserSwitchOutlined /> },
  { key: 'hours', label: '学生课时', description: '查看学生余额并按科目校准插班生课时', icon: <ClockCircleOutlined /> },
  { key: 'periods', label: '时间段设置', description: '管理常规课、寒假班和暑假班课时段', icon: <ClockCircleOutlined /> },
]

export function ScheduleWorkbench({ initialGroupId, initialAction, initialDate }: { initialGroupId?: string; initialAction?: string; initialDate?: string }) {
  const router = useRouter()
  const isMobile = useIsMobile() ?? false
  const { division } = useDivision()
  const { mutate: mutateCache } = useSWRConfig()
  const [groupId, setGroupId] = useState(initialGroupId || '')
  const initialKey = actionItems.some((item) => item.key === initialAction) ? initialAction as ActionKey : 'move-date'
  const initialDay = initialDate && dayjs(initialDate).isValid() ? dayjs(initialDate) : dayjs()
  const [activeAction, setActiveAction] = useState<ActionKey>(initialKey)
  const [moveDate, setMoveDate] = useState<Dayjs | null>(initialDay)
  const [moving, setMoving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [oldTeacherKey, setOldTeacherKey] = useState('')
  const [newTeacherId, setNewTeacherId] = useState<string>()
  const [replaceNote, setReplaceNote] = useState('')
  const [replacing, setReplacing] = useState(false)
  const [addTeacherId, setAddTeacherId] = useState<string>()
  const [addTeacherSubject, setAddTeacherSubject] = useState('')
  const [addingTeacher, setAddingTeacher] = useState(false)
  const initialModal = initialAction === 'extra' || initialAction === 'new' || initialAction === 'copy' || initialAction === 'periods' ? initialAction : null
  const [modal, setModal] = useState<'extra' | 'new' | 'copy' | 'periods' | null>(initialModal)
  const { periods, mutate: mutatePeriods } = useSchedulePeriods(division)

  const { data: groupRows, error: groupsError, isLoading: groupsLoading, mutate: mutateGroups } = useSWR<Group[]>(
    `/api/class-groups?division=${encodeURIComponent(division)}`,
    fetchJson,
    { refreshInterval: 30_000, revalidateOnFocus: true, revalidateOnReconnect: true },
  )
  const { data: group, error: groupError, isLoading: groupLoading, mutate: mutateGroup } = useSWR<Group>(
    groupId ? `/api/class-groups/${groupId}` : null,
    fetchJson,
    { revalidateOnFocus: true },
  )
  const {
    data: teacherData,
    error: teacherError,
    isLoading: teachersLoading,
    mutate: mutateTeachers,
  } = useSWR('/api/teachers?status=ACTIVE', fetchJson)
  const teachers: Teacher[] = Array.isArray(teacherData?.teachers) ? teacherData.teachers : Array.isArray(teacherData) ? teacherData : []
  const activeGroups = Array.isArray(groupRows) ? groupRows.filter((item) => item.status !== 'ARCHIVED') : []
  const historical = group?.term?.status !== 'ACTIVE'

  const assignments = useMemo(() => {
    const rows = Array.isArray(group?.teacherAssignments) ? group.teacherAssignments : []
    if (rows.length) return rows.map((item) => ({
      teacherId: item.teacherId,
      teacherName: item.teacher?.name || '教师待定',
      subject: item.subject || group?.course?.subject || '主讲',
    }))
    return group?.teacherId ? [{ teacherId: group.teacherId, teacherName: group.teacher?.name || '教师待定', subject: group.course?.subject || '主讲' }] : []
  }, [group])
  const replacementOptions = teachers.filter((teacher) => teacher.id !== oldTeacherKey.split('::')[0]).map((teacher) => ({ value: teacher.id, label: teacher.name }))
  const teacherOptions = teachers.map((teacher) => ({ value: teacher.id, label: teacher.name }))
  const selectedAssignment = assignments.find((item) => `${item.teacherId}::${item.subject}` === oldTeacherKey)
  const enrollments = Array.isArray(group?.enrollments) ? group.enrollments : []

  const changeGroup = (value: string) => {
    setGroupId(value)
    setOldTeacherKey('')
    setNewTeacherId(undefined)
  }

  const refreshGroupData = async () => {
    await Promise.all([
      mutateGroup(),
      mutateGroups(),
      mutateCache((key) => typeof key === 'string' && (key.startsWith('/api/class-lessons') || key.startsWith('/api/schedules'))),
    ])
  }

  const moveClassDate = async () => {
    if (!groupId || !moveDate) return message.warning('先选择班级和调整日期')
    if (historical) return message.error('历史批次只允许查看，不能调整课次')
    setMoving(true)
    try {
      const response = await fetch('/api/class-lessons/add-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: moveDate.format('YYYY-MM-DD'), division, groupIds: [groupId], keepPlannedTotal: true }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '调整上课日失败')
      const created = Number(payload.createdLessons || 0)
      const replaced = Number(payload.replacedLessons || 0)
      message.success(`已处理「${group?.name || '当前班级'}」：新增 ${created} 节，按规则替换 ${replaced} 节`)
      await refreshGroupData()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '调整上课日失败')
    } finally {
      setMoving(false)
    }
  }

  const replaceTeacher = async () => {
    if (!groupId || !selectedAssignment || !newTeacherId) return message.warning('请选择原任课安排和新老师')
    setReplacing(true)
    try {
      const response = await fetch(`/api/class-groups/${groupId}/replace-teacher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldTeacherId: selectedAssignment.teacherId,
          newTeacherId,
          subject: selectedAssignment.subject === '主讲' ? null : selectedAssignment.subject,
          note: replaceNote.trim() || undefined,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '更换老师失败')
      message.success(`已更换任课老师，更新 ${payload.affectedLessons || 0} 节未完成课次`)
      setOldTeacherKey('')
      setNewTeacherId(undefined)
      setReplaceNote('')
      await refreshGroupData()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '更换老师失败')
    } finally {
      setReplacing(false)
    }
  }

  const syncStudentHours = async () => {
    if (!groupId) return message.warning('先选择班级')
    setSyncing(true)
    try {
      const response = await fetch(`/api/class-groups/${groupId}/sync-hours`, { method: 'POST' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '课时校准失败')
      message.success(payload.message || `已校准 ${payload.updated || 0} 位插班生课时`)
      await mutateGroup()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '课时校准失败')
    } finally {
      setSyncing(false)
    }
  }

  const addTeacherAssignment = async () => {
    if (!groupId || !addTeacherId || !addTeacherSubject) return message.warning('请选择老师和科目')
    setAddingTeacher(true)
    try {
      const response = await fetch(`/api/class-groups/${groupId}/add-teacher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: addTeacherId, subject: addTeacherSubject }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '添加任课老师失败')
      message.success(`已添加 ${addTeacherSubject} 任课老师`)
      setAddTeacherId(undefined)
      setAddTeacherSubject('')
      await refreshGroupData()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '添加任课老师失败')
    } finally {
      setAddingTeacher(false)
    }
  }

  const groupOptions = activeGroups.map((item) => ({
    value: item.id,
    label: `${item.name} · ${item.course?.name || '课程'} · ${item.status === 'ACTIVE' ? '在读' : '待开班'}`,
  }))

  return (
    <PageLayout
      title="排课与课时工作台"
      subtitle="把调课、临时加课、教师安排与学生课时放在同一处管理；每项操作仍按原业务规则记录。"
    >
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(260px, 1.1fr) minmax(260px, 1fr)', gap: 12, marginBottom: 16 }}>
        <Card bordered={false} style={{ borderRadius: 14, border: '1px solid var(--color-hairline)', background: 'var(--color-surface-1)' }}>
          <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginBottom: 7 }}>先选择班级</div>
          {groupsError ? <Alert type="error" showIcon message="班级清单加载失败" description={groupsError.message} action={<Button size="small" icon={<ReloadOutlined />} onClick={() => void mutateGroups()}>重试</Button>} /> : (
            <AdaptiveSelect
              showSearch={!isMobile}
              optionFilterProp="label"
              placeholder={groupsLoading ? '正在加载班级…' : '搜索班级或课程'}
              value={groupId || undefined}
              options={groupOptions}
              onChange={changeGroup}
              listHeight={260}
              virtual={false}
              style={{ width: '100%' }}
              getPopupContainer={(trigger) => trigger.parentElement || document.body}
            />
          )}
          {groupId && group && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              <Tag color={group.status === 'ACTIVE' ? 'green' : 'gold'}>{group.status === 'ACTIVE' ? '在读' : '待开班'}</Tag>
              {group.course?.grade && <Tag>{group.course.grade}</Tag>}
              {group.term?.name && <Tag>{group.term.name}</Tag>}
              <span style={{ color: 'var(--color-ink-muted)', fontSize: 12, alignSelf: 'center' }}>{group.course?.name || '课程'} · {enrollments.length} 名学员</span>
            </div>
          )}
        </Card>
        <Card bordered={false} style={{ borderRadius: 14, border: '1px solid var(--color-hairline)', background: 'var(--color-surface-1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9, color: 'var(--color-ink-muted)', fontSize: 12 }}><TeamOutlined /> 当前任课安排</div>
          {groupLoading ? <span>正在加载班级资料…</span> : groupError ? <Alert type="error" showIcon message={groupError.message} /> : assignments.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {assignments.map((item) => <Tag key={`${item.teacherId}::${item.subject}`} color="processing">{item.subject} · {item.teacherName}</Tag>)}
            </div>
          ) : <span style={{ color: 'var(--color-ink-muted)' }}>尚未配置老师</span>}
        </Card>
      </div>

      {historical && group && <Alert type="info" showIcon style={{ marginBottom: 14 }} message="当前班级属于历史批次" description="可查看课时和老师资料，但排课、换老师和课时校准操作已锁定。" />}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, minmax(0, 1fr))', gap: 9, marginBottom: 16 }}>
        {actionItems.map((item) => {
          const active = activeAction === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setActiveAction(item.key)
                if (item.key === 'extra') setModal('extra')
                if (item.key === 'new') setModal('new')
                if (item.key === 'copy') setModal('copy')
                if (item.key === 'periods') setModal('periods')
              }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0, minHeight: 74,
                padding: isMobile ? 10 : 13, textAlign: 'left', borderRadius: 13,
                border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-hairline)'}`,
                background: active ? 'var(--color-primary-bg)' : 'var(--color-surface-1)',
                color: 'var(--color-ink)', cursor: 'pointer',
              }}
            >
              <span style={{ color: 'var(--color-primary)', fontSize: 18, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
              <span style={{ minWidth: 0 }}><strong style={{ display: 'block', fontSize: 13, lineHeight: 1.4 }}>{item.label}</strong><small style={{ display: 'block', color: 'var(--color-ink-muted)', fontSize: 11, lineHeight: 1.4, marginTop: 3 }}>{item.description}</small></span>
            </button>
          )
        })}
      </div>

      {activeAction === 'move-date' && (
        <Card title="计划内调整上课日" bordered={false} style={{ borderRadius: 14, border: '1px solid var(--color-hairline)' }}>
          {!groupId ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="选择一个班级后开始调整" /> : (
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <DatePicker value={moveDate} onChange={setMoveDate} allowClear={false} style={{ width: isMobile ? '100%' : 280, minHeight: 44 }} />
              <Alert type="info" showIcon message="仅处理当前班级" description="系统会按该班级已有时段、学科和教师补入课次，并按原规则取消一教学日的同课次数量，保留取消记录供审计。重复执行会先检查目标日期，避免重复创建。" />
              <Popconfirm title={`确认把 ${moveDate?.format('YYYY-MM-DD') || '所选日期'} 加入「${group?.name || '当前班级'}」？`} description="本操作会写入课次安排并可能取消对应未来教学日。" onConfirm={() => void moveClassDate()} okText="确认调整" cancelText="返回">
                <Button type="primary" icon={<CalendarOutlined />} loading={moving} disabled={!moveDate || historical}>确认调课</Button>
              </Popconfirm>
            </Space>
          )}
        </Card>
      )}

      {activeAction === 'teachers' && (
        <Card title="教师更换" bordered={false} style={{ borderRadius: 14, border: '1px solid var(--color-hairline)' }}>
          {!groupId ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="先选择班级，查看任课安排" /> : (
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              {teacherError ? (
                <Alert
                  type="error"
                  showIcon
                  message="教师名单加载失败，暂时无法选择接任老师"
                  description={teacherError.message}
                  action={<Button size="small" icon={<ReloadOutlined />} onClick={() => void mutateTeachers()}>重试</Button>}
                />
              ) : teachersLoading ? (
                <span style={{ color: 'var(--color-ink-muted)', fontSize: 12 }}>正在加载教师名单…</span>
              ) : null}
              <AdaptiveSelect
                placeholder="选择要调整的学科教师"
                value={oldTeacherKey || undefined}
                onChange={(value) => { setOldTeacherKey(value); setNewTeacherId(undefined) }}
                options={assignments.map((item) => ({ value: `${item.teacherId}::${item.subject}`, label: `${item.subject} · ${item.teacherName}` }))}
                style={{ width: '100%' }}
                getPopupContainer={(trigger) => trigger.parentElement || document.body}
              />
              <AdaptiveSelect
                showSearch={!isMobile}
                optionFilterProp="label"
                placeholder="选择接任老师"
                value={newTeacherId}
                onChange={setNewTeacherId}
                options={replacementOptions}
                style={{ width: '100%' }}
                getPopupContainer={(trigger) => trigger.parentElement || document.body}
              />
              <Input placeholder="更换原因（可选，便于后续追溯）" maxLength={120} value={replaceNote} onChange={(event) => setReplaceNote(event.target.value)} />
              {selectedAssignment && <Alert type="warning" showIcon message={`将把 ${selectedAssignment.subject} 的后续任课调整给新老师`} description="已完成课次保留原记录；若目标老师在相同时间已有课程，系统会阻止本次更换并列出冲突。" />}
              <Popconfirm title="确认更换该学科任课老师？" description="操作会更新后续未完成课次、任课关系和家长课表通知。" onConfirm={() => void replaceTeacher()} okText="确认更换" cancelText="取消">
                <Button type="primary" icon={<UserSwitchOutlined />} loading={replacing} disabled={!selectedAssignment || !newTeacherId || historical}>确认更换</Button>
              </Popconfirm>
              <div style={{ borderTop: '1px solid var(--color-hairline)', paddingTop: 12, marginTop: 4 }}>
                <strong style={{ display: 'block', marginBottom: 8 }}>添加任课科目</strong>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr auto', gap: 8 }}>
                  <AdaptiveSelect
                    showSearch={!isMobile}
                    optionFilterProp="label"
                    placeholder="选择老师"
                    value={addTeacherId}
                    onChange={setAddTeacherId}
                    options={teacherOptions}
                    style={{ width: '100%' }}
                    getPopupContainer={(trigger) => trigger.parentElement || document.body}
                  />
                  <Select
                    placeholder="选择科目"
                    value={addTeacherSubject || undefined}
                    onChange={setAddTeacherSubject}
                    options={['语文', '数学', '英语', '物理', '化学', '生物', '地理', '历史', '政治'].map((subject) => ({ label: subject, value: subject }))}
                    style={{ width: '100%' }}
                  />
                  <Button loading={addingTeacher} disabled={!addTeacherId || !addTeacherSubject || historical} onClick={() => void addTeacherAssignment()}>添加</Button>
                </div>
              </div>
            </Space>
          )}
        </Card>
      )}

      {activeAction === 'hours' && (
        <Card
          title="学生课时查询"
          extra={<Button icon={<ReloadOutlined />} loading={syncing} disabled={!groupId || historical} onClick={() => void syncStudentHours()}>按报名科目校准插班生</Button>}
          bordered={false}
          style={{ borderRadius: 14, border: '1px solid var(--color-hairline)' }}
        >
          {!groupId ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="先选择班级，查看学员课时" /> : !enrollments.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前班级暂无在读学员" /> : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 9 }}>
              {enrollments.map((enrollment) => (
                <div key={enrollment.id} style={{ padding: 12, borderRadius: 12, background: 'var(--color-surface-2)', border: '1px solid var(--color-hairline)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <strong style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{enrollment.student?.name || '未命名学员'}</strong>
                    <Tag color="green">剩余 {Number(enrollment.remainHours || 0).toFixed(2)} 小时</Tag>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 7, color: 'var(--color-ink-muted)', fontSize: 12 }}>
                    <span>已用 {Number(enrollment.usedHours || 0).toFixed(2)} 小时</span>
                    <span>总计 {Number(enrollment.totalHours || 0).toFixed(2)} 小时</span>
                    <span>报名：{enrollment.subjects?.length ? enrollment.subjects.join('、') : '未填写科目'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 12, color: 'var(--color-ink-muted)', fontSize: 12, lineHeight: 1.6 }}>
            校准只处理开班后加入的插班生，按每人报名科目、加入时间和未完成有效课次计算；已使用课时保留并写入调整流水。
          </div>
        </Card>
      )}

      {groupError && <Alert style={{ marginTop: 12 }} type="error" showIcon message="班级详情加载失败" description={groupError.message} action={<Button size="small" onClick={() => void mutateGroup()}>重试</Button>} />}

      {modal === 'extra' && <ManualLessonModal initialGroupId={groupId || undefined} initialDate={initialDate || undefined} onClose={() => setModal(null)} onSuccess={() => void refreshGroupData()} />}
      {modal === 'new' && <ScheduleFormModal open onClose={() => setModal(null)} onSuccess={() => void refreshGroupData()} />}
      {modal === 'copy' && <CopyFridayToSaturdayModal open onClose={() => setModal(null)} onSuccess={() => void refreshGroupData()} groupIds={groupId ? [groupId] : undefined} />}
      {modal === 'periods' && <SchedulePeriodSettingsModal open periods={periods} onClose={() => setModal(null)} onSaved={() => void mutatePeriods()} />}
    </PageLayout>
  )
}
