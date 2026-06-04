'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import {
  Button,
  Card,
  Col,
  Drawer,
  Dropdown,
  Empty,
  Input,
  InputNumber,
  message,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Steps,
  Tag,
} from 'antd'
import {
  BookOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  EnvironmentOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { addDays, format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { PageLayout } from '@/components/Layout/PageLayout'
import { CLASS_PERIODS_ONLY } from '@/lib/schedule-periods'

type CourseType = 'GROUP' | 'ONE_ON_ONE' | 'SMALL_GROUP'

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '地理', '历史', '政治']
const SUBJECT_COLOR: Record<string, string> = {
  语文: '#e8784a',
  数学: '#E8784A',
  英语: '#2f80ed',
  物理: '#7c5cff',
  化学: '#20a779',
  生物: '#6aaa2d',
  地理: '#1f9bb4',
  历史: '#b86b35',
  政治: '#d14d72',
}
const ALL_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const DAY_LABELS: Record<string, string> = {
  MON: '周一',
  TUE: '周二',
  WED: '周三',
  THU: '周四',
  FRI: '周五',
  SAT: '周六',
  SUN: '周日',
}
const GROUP_STATUS_MAP: Record<string, { color: string; label: string }> = {
  WAITING: { color: 'orange', label: '待开班' },
  ACTIVE: { color: 'green', label: '进行中' },
  COMPLETED: { color: 'blue', label: '已结束' },
  ARCHIVED: { color: 'default', label: '已归档' },
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('加载失败')
  return res.json()
}

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

function generatePreview(startDate: string, recurringDays: string[], totalLessons: number) {
  if (!startDate || !recurringDays.length || totalLessons <= 0) return []
  const dates: Date[] = []
  let cursor = new Date(`${startDate}T00:00:00`)
  const dayMap: Record<string, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 }
  const targets = recurringDays.map((day) => dayMap[day]).filter((day) => day !== undefined)
  const stopAt = addDays(cursor, 730)

  while (dates.length < totalLessons && cursor <= stopAt) {
    if (targets.includes(cursor.getDay())) dates.push(new Date(cursor))
    cursor = addDays(cursor, 1)
  }

  return dates
}

export default function CoursesPage() {
  const router = useRouter()
  const { data: groups, mutate: mutateGroups, isLoading } = useSWR('/api/class-groups', fetcher)
  const { data: courses, mutate: mutateCourses } = useSWR('/api/courses', fetcher)
  const { data: teachers } = useSWR('/api/teachers?status=ACTIVE', fetcher)
  const { data: rooms } = useSWR('/api/rooms', fetcher)
  const { data: dashboard, mutate: mutateDashboard } = useSWR('/api/dashboard', fetcher)

  const [courseTab, setCourseTab] = useState<'GROUP'|'SMALL'>('GROUP')
  const [filterType, setFilterType] = useState('')
  const [filterGrade, setFilterGrade] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [createStep, setCreateStep] = useState(0)
  const [createLoading, setCreateLoading] = useState(false)
  const [createData, setCreateData] = useState<Record<string, unknown>>({})
  const [copyOpen, setCopyOpen] = useState(false)
  const [copySource, setCopySource] = useState('')
  const [copyStartDate, setCopyStartDate] = useState('')
  const [copyName, setCopyName] = useState('')
  const [copyLoading, setCopyLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerGroupId, setDrawerGroupId] = useState('')
  const [postponeOpen, setPostponeOpen] = useState(false)
  const [postponeLessonId, setPostponeLessonId] = useState('')
  const [postponeDays, setPostponeDays] = useState(7)
  const [startingGroupId, setStartingGroupId] = useState('')
  const [regeneratingGroupId, setRegeneratingGroupId] = useState('')
  const [deletingGroupId, setDeletingGroupId] = useState('')

  const groupList = Array.isArray(groups) ? groups : []
  const courseList = (Array.isArray(courses) ? courses : []).filter((course: Record<string, unknown>) =>
    SUBJECTS.includes(course.subject as string)
  )
  const teacherList = Array.isArray(teachers?.teachers) ? teachers.teachers : Array.isArray(teachers) ? teachers : []
  const roomList = Array.isArray(rooms) ? rooms : []
  const { data: drawerLessons } = useSWR(drawerGroupId ? `/api/class-groups/${drawerGroupId}/lessons` : null, fetcher)

  const filteredGroups = useMemo(() => groupList.filter((group: Record<string, unknown>) => {
    const course = group.course as Record<string, unknown> | undefined
    // Tab filter
    if (courseTab === 'GROUP' && course?.type !== 'GROUP') return false
    if (courseTab === 'SMALL' && !['ONE_ON_ONE', 'SMALL_GROUP'].includes(course?.type as string)) return false
    // Additional filters
    if (filterType && course?.type !== filterType) return false
    if (filterGrade && course?.grade !== filterGrade) return false
    if (filterStatus && group.status !== filterStatus) return false
    return true
  }), [groupList, courseTab, filterType, filterGrade, filterStatus])

  const grades = useMemo(() => {
    const set = new Set<string>()
    groupList.forEach((group: Record<string, unknown>) => {
      const course = group.course as Record<string, unknown> | undefined
      if (course?.grade) set.add(course.grade as string)
    })
    return [...set].sort()
  }, [groupList])

  const previewDates = useMemo(() => generatePreview(
    (createData.startDate as string) || todayString(),
    (createData.recurringDays as string[]) || [],
    Number(createData.totalLessons || 16)
  ), [createData.startDate, createData.recurringDays, createData.totalLessons])

  const stats = {
    activeGroups: dashboard?.metrics?.activeGroups ?? 0,
    waitingGroups: dashboard?.metrics?.waitingGroups ?? 0,
    monthlyHours: dashboard?.metrics?.monthlyHoursDeducted ?? 0,
    renewalWarnings: dashboard?.metrics?.renewalWarnings ?? 0,
  }

  const openCreate = () => {
    setCreateStep(0)
    setCreateData({
      type: courseTab === 'SMALL' ? 'ONE_ON_ONE' : 'GROUP',
      subjects: [] as string[],
      lessonMinutes: 40,
      totalLessons: 16,
      startDate: todayString(),
      lessonStartTime: '08:00',
      recurringDays: ['MON', 'WED', 'FRI'],
      maxStudents: 20,
      teacherAssignments: [{ teacherId: '', subject: '' }],
      scheduleTemplate: CLASS_PERIODS_ONLY.map(p => ({
        periodId: p.id, periodName: p.name, startTime: p.start, endTime: p.end, teacherId: '', subject: '',
      })),
    })
    setCreateOpen(true)
  }

  const handleNextStep = () => {
    if (createStep === 0) {
      if (!createData.courseId && !createData.courseName) {
        message.error('请选择已有课程，或填写课程名称')
        return
      }
    }
    if (createStep === 1) {
      const teacherAssignments = Array.isArray(createData.teacherAssignments) ? createData.teacherAssignments as Record<string, unknown>[] : []
      const validAssignments = teacherAssignments.filter((item) => item.teacherId && item.subject)
      if (!createData.name || !validAssignments.length || !createData.startDate) {
        message.error('请填写班级名称、授课教师、负责科目和开班日期')
        return
      }
    }
    setCreateStep((step) => step + 1)
  }

  const createCourseIfNeeded = async () => {
    if (createData.courseId) return createData.courseId as string
    const assignments = (Array.isArray(createData.teacherAssignments) ? createData.teacherAssignments as Record<string, unknown>[] : [])
      .filter((item) => item.teacherId && item.subject)
    const subjects = assignments.map((item) => String(item.subject)).filter(Boolean)
    const primarySubject = subjects[0] || '数学'

    const courseRes = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: createData.courseName,
        subject: subjects.join('、') || primarySubject,
        grade: createData.grade,
        type: createData.type || 'GROUP',
        lessonMinutes: createData.lessonMinutes || 90,
        totalLessons: createData.totalLessons || 16,
        color: SUBJECT_COLOR[primarySubject] || '#e8784a',
      }),
    })

    const coursePayload = await courseRes.json().catch(() => ({}))
    if (!courseRes.ok) throw new Error(coursePayload.error || '课程创建失败')
    mutateCourses()
    return coursePayload.id as string
  }

  const handleCreate = async () => {
    const recurringDays = (createData.recurringDays as string[]) || []
    if (!recurringDays.length) {
      message.error('请选择至少一个上课日')
      return
    }
    if (!previewDates.length) {
      message.error('无法生成课次，请检查开班日期、上课日和总课次数')
      return
    }

    setCreateLoading(true)
    try {
      const courseId = await createCourseIfNeeded()
      const teacherAssignments = (Array.isArray(createData.teacherAssignments) ? createData.teacherAssignments as Record<string, unknown>[] : [])
        .filter((item) => item.teacherId && item.subject)
        .map((item) => ({ teacherId: item.teacherId, subject: item.subject }))
      if (!teacherAssignments.length) {
        message.error('请至少选择一位老师和对应科目')
        setCreateLoading(false)
        return
      }
      const groupPayload = {
        name: createData.name,
        courseId,
        teacherId: teacherAssignments[0]?.teacherId || undefined,
        teacherIds: teacherAssignments.map((item) => item.teacherId),
        teacherAssignments,
        roomId: createData.roomId || null,
        startDate: createData.startDate || todayString(),
        maxStudents: createData.maxStudents || 20,
        recurringDays,
        lessonStartTime: createData.lessonStartTime || '19:00',
        lessonMinutes: createData.lessonMinutes || 90,
        totalLessons: createData.totalLessons || 16,
      }

      const groupRes = await fetch('/api/class-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupPayload),
      })
      const group = await groupRes.json().catch(() => ({}))
      if (!groupRes.ok) throw new Error(group.error || '班级创建失败')

      const scheduleTemplate = (Array.isArray(createData.scheduleTemplate) ? createData.scheduleTemplate as Record<string, unknown>[] : [])
        .filter(row => row.teacherId && row.subject && row.startTime && row.endTime)

      const lessonRes = await fetch(`/api/class-groups/${group.id}/generate-lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...groupPayload, scheduleTemplate }),
      })
      const lessonPayload = await lessonRes.json().catch(() => ({}))
      if (!lessonRes.ok) throw new Error(lessonPayload.error || '课表生成失败')

      message.success(`「${createData.name}」已创建，并生成 ${lessonPayload.count || previewDates.length} 节课`)
      mutateGroups()
      mutateDashboard()
      setCreateOpen(false)
      setCreateStep(0)
      setCreateData({})
    } catch (error) {
      message.error(error instanceof Error ? error.message : '创建失败')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!copySource || !copyStartDate) {
      message.error('请选择原班级和新开班日期')
      return
    }

    setCopyLoading(true)
    try {
      const res = await fetch(`/api/class-groups/${copySource}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStartDate: copyStartDate, name: copyName || undefined }),
      })
      if (!res.ok) throw new Error('复制失败')
      message.success('班级复制成功')
      mutateGroups()
      setCopyOpen(false)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '复制失败')
    } finally {
      setCopyLoading(false)
    }
  }

  const handleCancelLesson = async (lessonId: string) => {
    Modal.confirm({
      title: '确认停课本次？',
      content: '停课后会标记本次课为已取消。',
      okText: '确认停课',
      okButtonProps: { danger: true },
      cancelText: '再想想',
      onOk: async () => {
        const res = await fetch(`/api/class-lessons/${lessonId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'CANCELLED' }),
        })
        if (!res.ok) throw new Error('停课失败')
        message.success('课次已取消')
        mutateGroups()
      },
    })
  }

  const handlePostpone = async () => {
    const res = await fetch('/api/class-lessons/postpone-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: postponeLessonId, offsetDays: postponeDays }),
    })
    if (!res.ok) {
      message.error('后移失败')
      return
    }
    message.success(`已后移 ${postponeDays} 天`)
    setPostponeOpen(false)
  }

  const handleStartGroup = async (groupId: string) => {
    setStartingGroupId(groupId)
    try {
      const res = await fetch(`/api/class-groups/${groupId}/start`, { method: 'POST' })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || '开班失败')
      message.success(payload.alreadyActive ? '班级已经是进行中' : `开班成功，已通知 ${payload.notifiedParents || 0} 位家长`)
      mutateGroups()
      mutateDashboard()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '开班失败')
    } finally {
      setStartingGroupId('')
    }
  }

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    Modal.confirm({
      title: '删除班级',
      content: `确定删除「${groupName}」吗？系统会先备份班级及相关课次、报名、考勤、测评数据，然后从业务数据库中清除。`,
      okText: '备份并删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        setDeletingGroupId(groupId)
        try {
          const res = await fetch(`/api/class-groups/${groupId}`, { method: 'DELETE' })
          const payload = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(payload.error || '删除失败')
          message.success('已备份并删除班级')
          mutateGroups()
          mutateDashboard()
        } catch (error) {
          message.error(error instanceof Error ? error.message : '删除失败')
          throw error
        } finally {
          setDeletingGroupId('')
        }
      },
    })
  }

  const handleRegenerateLessons = async (groupId: string) => {
    setRegeneratingGroupId(groupId)
    try {
      const res = await fetch(`/api/class-groups/${groupId}/generate-lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || '重新生成失败')
      message.success(`课表已重新生成，共 ${payload.count || 0} 节课`)
      mutateGroups()
      mutateDashboard()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '重新生成失败')
    } finally {
      setRegeneratingGroupId('')
    }
  }

  return (
    <PageLayout
      title="课程管理"
      subtitle="课程设置、班级创建、课表生成和课次调整"
      actions={
        <Space>
          <Button icon={<CopyOutlined />} onClick={() => setCopyOpen(true)}>批量复制</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ background: '#e8784a' }}>
            新建班级
          </Button>
        </Space>
      }
    >
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {[
          { label: '进行中班级', value: stats.activeGroups, color: '#27a644' },
          { label: '待开班', value: stats.waitingGroups, color: '#f5a623' },
          { label: '本月课耗', value: stats.monthlyHours, color: '#E8784A' },
          { label: '续报预警', value: stats.renewalWarnings, color: '#e03e2d' },
        ].map((item) => (
          <Col xs={12} lg={6} key={item.label}>
            <Card bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
              <div style={{ color: '#98A2B3', fontSize: 13 }}>{item.label}</div>
              <div style={{ color: item.color, fontSize: 28, fontWeight: 700 }}>{item.value}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Type tabs */}
      <div style={{ display: 'flex', border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 8, overflow: 'hidden', width: 'fit-content', marginBottom: 12 }}>
        <button onClick={() => setCourseTab('GROUP')} style={{
          padding: '7px 18px', background: courseTab === 'GROUP' ? '#E8784A' : 'transparent',
          color: courseTab === 'GROUP' ? '#fff' : 'var(--color-text-secondary, #666)',
          border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: courseTab === 'GROUP' ? 500 : 400,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>👥 精品班课</button>
        <button onClick={() => setCourseTab('SMALL')} style={{
          padding: '7px 18px', background: courseTab === 'SMALL' ? '#534AB7' : 'transparent',
          color: courseTab === 'SMALL' ? '#fff' : 'var(--color-text-secondary, #666)',
          border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: courseTab === 'SMALL' ? 500 : 400,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>👤 突击全能班（1对1/2/3）</button>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="课程类型"
          allowClear
          style={{ width: 128 }}
          value={filterType || undefined}
          onChange={(value) => setFilterType(value || '')}
          options={courseTab === 'GROUP'
            ? [{ label: '班课', value: 'GROUP' }]
            : [
                { label: '1对1', value: 'ONE_ON_ONE' },
                { label: '小组课', value: 'SMALL_GROUP' },
              ]
          }
        />
        <Select
          placeholder="年级"
          allowClear
          style={{ width: 128 }}
          value={filterGrade || undefined}
          onChange={(value) => setFilterGrade(value || '')}
          options={grades.map((grade) => ({ label: grade, value: grade }))}
        />
        <Select
          placeholder="状态"
          allowClear
          style={{ width: 128 }}
          value={filterStatus || undefined}
          onChange={(value) => setFilterStatus(value || '')}
          options={[
            { label: '待开班', value: 'WAITING' },
            { label: '进行中', value: 'ACTIVE' },
            { label: '已结束', value: 'COMPLETED' },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={() => mutateGroups()}>刷新</Button>
      </Space>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : filteredGroups.length === 0 ? (
        <Card bordered={false} style={{ borderRadius: 8, minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty description="暂无班级数据">
            <Button type="primary" onClick={openCreate} style={{ background: '#e8784a' }}>创建第一个班级</Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredGroups.map((group: Record<string, unknown>) => {
            const course = group.course as Record<string, unknown> | undefined
            const teacher = group.teacher as Record<string, unknown> | undefined
            const teacherAssignments = Array.isArray(group.teacherAssignments) ? group.teacherAssignments : []
            const teacherTeam = teacherAssignments.map((item: Record<string, unknown>) => {
              const name = (item.teacher as Record<string, unknown>)?.name
              return name ? `${name}${item.subject ? `(${item.subject})` : ''}` : ''
            }).filter(Boolean).join('、')
            const room = group.room as Record<string, unknown> | undefined
            const count = group._count as Record<string, number> | undefined
            const color = SUBJECT_COLOR[(course?.subject as string) || '数学'] || '#e8784a'
            const statusInfo = GROUP_STATUS_MAP[group.status as string] || { color: 'default', label: String(group.status || '-') }
            const completed = Number(group.completedLessons || 0)
            const total = Number(group.totalLessons || 0)
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0

            return (
              <Col xs={24} lg={12} key={group.id as string}>
                <Card
                  bordered={false}
                  style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 10, minWidth: 0 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 8, background: `${color}22`, color, display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                        {String(course?.subject || '?')[0]}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: '#1F2329', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.name as string}</div>
                        <div style={{ color: '#98A2B3', fontSize: 12 }}>{course?.name as string}</div>
                      </div>
                    </div>
                    <Tag color={statusInfo.color} style={{ borderRadius: 999 }}>{statusInfo.label}</Tag>
                  </div>

                  <Space size={14} wrap style={{ marginBottom: 12 }}>
                    <span style={{ color: '#98A2B3', fontSize: 12 }}><TeamOutlined /> {teacherTeam || teacher?.name as string || '-'}</span>
                    <span style={{ color: '#98A2B3', fontSize: 12 }}><BookOutlined /> {course?.type === 'ONE_ON_ONE' ? '1对1' : course?.type === 'SMALL_GROUP' ? '小组课' : '班课'}</span>
                    <span style={{ color: '#98A2B3', fontSize: 12 }}><ClockCircleOutlined /> {group.lessonStartTime as string}</span>
                    <span style={{ color: '#98A2B3', fontSize: 12 }}><EnvironmentOutlined /> {room?.name as string || '未分配'}</span>
                  </Space>

                  <Row gutter={12} style={{ marginBottom: 12 }}>
                    <Col span={8}><SmallMetric label="在读/限额" value={`${count?.enrollments ?? 0}/${group.maxStudents || 0}`} /></Col>
                    <Col span={8}><SmallMetric label="剩余课次" value={String(Math.max(0, total - completed))} /></Col>
                    <Col span={8}><SmallMetric label="总课次" value={String(total)} /></Col>
                  </Row>

                  <Progress percent={progress} size="small" strokeColor={color} format={() => `已上 ${completed}/${total}`} />

                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <Button size="small" icon={<CalendarOutlined />} onClick={(e) => { e.stopPropagation(); setDrawerGroupId(group.id as string); setDrawerOpen(true) }}>课表</Button>
                    <Button size="small" icon={<ReloadOutlined />} loading={regeneratingGroupId === group.id} onClick={(e) => { e.stopPropagation(); handleRegenerateLessons(group.id as string) }}>重新生成</Button>
                    <Button size="small" icon={<TeamOutlined />} onClick={(e) => { e.stopPropagation(); router.push(`/courses/${group.id}`) }}>管理</Button>
                    <Button size="small" danger loading={deletingGroupId === group.id} onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id as string, group.name as string) }}>删除</Button>
                  </div>

                  {group.status === 'WAITING' && (
                    <Button
                      block
                      type="primary"
                      loading={startingGroupId === group.id}
                      onClick={() => handleStartGroup(group.id as string)}
                      style={{ marginTop: 14, background: '#27a644', borderColor: '#27a644' }}
                    >
                      开班并通知家长
                    </Button>
                  )}
                </Card>
              </Col>
            )
          })}
        </Row>
      )}

      <Modal title="新建班级" open={createOpen} onCancel={() => setCreateOpen(false)} footer={null} width={760} destroyOnClose>
        <Steps
          current={createStep}
          size="small"
          style={{ marginBottom: 24 }}
          items={[{ title: '课程信息' }, { title: '班级设置' }, { title: '排课预览' }]}
        />

        {createStep === 0 && (
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <Select
              showSearch
              allowClear
              placeholder="可选：从已有课程继承"
              style={{ width: '100%' }}
              value={(createData.courseId as string) || undefined}
              onChange={(value) => {
                const course = courseList.find((item: Record<string, unknown>) => item.id === value)
                setCreateData((prev) => ({
                  ...prev,
                  courseId: value,
                  courseName: course?.name || prev.courseName,
                  grade: course?.grade || prev.grade,
                  type: course?.type || prev.type || 'GROUP',
                  lessonMinutes: course?.lessonMinutes || prev.lessonMinutes || 90,
                  totalLessons: course?.totalLessons || prev.totalLessons || 16,
                }))
              }}
              options={courseList.map((course: Record<string, unknown>) => ({
                label: `${course.name} / ${course.subject} / ${course.grade || '未设年级'}`,
                value: course.id as string,
              }))}
            />
            <Row gutter={12}>
              <Col span={16}>
                <Input placeholder="课程名称，例如：高一全科同步提高" value={(createData.courseName as string) || ''} onChange={(event) => setCreateData((prev) => ({ ...prev, courseName: event.target.value, courseId: undefined }))} />
              </Col>
              <Col span={8}>
                <Input placeholder="年级，例如：高一" value={(createData.grade as string) || ''} onChange={(event) => setCreateData((prev) => ({ ...prev, grade: event.target.value, courseId: undefined }))} />
              </Col>
            </Row>
            <Select
              style={{ width: 180 }}
              value={(createData.type as CourseType) || 'GROUP'}
              onChange={(value) => setCreateData((prev) => ({ ...prev, type: value }))}
              options={[
                { label: '班课', value: 'GROUP' },
                { label: '1对1', value: 'ONE_ON_ONE' },
                { label: '小组课', value: 'SMALL_GROUP' },
              ]}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="primary" onClick={handleNextStep}>下一步</Button>
            </div>
          </Space>
        )}

        {createStep === 1 && (
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <Input placeholder="班级名称，例如：高一全科同步班" value={(createData.name as string) || ''} onChange={(event) => setCreateData((prev) => ({ ...prev, name: event.target.value }))} />
            <div style={{ background: '#FCFBF9', border: '1px solid #EEE7E1', borderRadius: 8, padding: 12 }}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700, color: '#1F2329' }}>老师-科目对应表</div>
                <div style={{ fontSize: 12, color: '#98A2B3' }}>先选老师，再指定这位老师负责的科目。教师端课表、考勤、课堂反馈都会按这里分配。</div>
              </div>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {(((createData.teacherAssignments as Record<string, unknown>[]) || [{ teacherId: '', subject: '' }])).map((assignment, index) => {
                  const assignments = (createData.teacherAssignments as Record<string, unknown>[]) || []
                  const subjectOptions = SUBJECTS.map((subject) => ({ label: subject, value: subject }))
                  return (
                    <Row gutter={8} key={index} align="middle">
                      <Col span={10}>
                        <Select
                          showSearch
                          placeholder="选择授课老师"
                          style={{ width: '100%' }}
                          value={(assignment.teacherId as string) || undefined}
                          onChange={(value) => setCreateData((prev) => {
                            const rows = [...((prev.teacherAssignments as Record<string, unknown>[]) || [])]
                            while (rows.length <= index) rows.push({ teacherId: '', subject: '' })
                            rows[index] = { ...rows[index], teacherId: value }
                            return { ...prev, teacherAssignments: rows }
                          })}
                          options={teacherList.map((teacher: Record<string, unknown>) => ({
                            label: String(teacher.name || ''),
                            value: teacher.id as string,
                          }))}
                        />
                      </Col>
                      <Col span={10}>
                        <Select
                          showSearch
                          placeholder="选择负责科目"
                          style={{ width: '100%' }}
                          value={(assignment.subject as string) || undefined}
                          onChange={(value) => setCreateData((prev) => {
                            const rows = [...((prev.teacherAssignments as Record<string, unknown>[]) || [])]
                            while (rows.length <= index) rows.push({ teacherId: '', subject: '' })
                            rows[index] = { ...rows[index], subject: value }
                            return { ...prev, teacherAssignments: rows, courseId: undefined }
                          })}
                          options={subjectOptions}
                        />
                      </Col>
                      <Col span={4}>
                        {index > 0 && (
                          <Button
                            block
                            size="small"
                            onClick={() => setCreateData((prev) => {
                              const rows = ((prev.teacherAssignments as Record<string, unknown>[]) || []).filter((_, i) => i !== index)
                              return { ...prev, teacherAssignments: rows.length ? rows : [{ teacherId: '', subject: '' }], courseId: undefined }
                            })}
                          >
                            移除
                          </Button>
                        )}
                      </Col>
                    </Row>
                  )
                })}
              </Space>
              <div style={{ marginTop: 12, borderTop: '1px solid #EEE7E1', paddingTop: 12 }}>
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateData((prev) => {
                    const rows = [...((prev.teacherAssignments as Record<string, unknown>[]) || []), { teacherId: '', subject: '' }]
                    return { ...prev, teacherAssignments: rows, courseId: undefined }
                  })}
                >
                  添加老师科目
                </Button>
              </div>
            </div>
            <Select allowClear placeholder="教室" style={{ width: '100%' }} value={(createData.roomId as string) || undefined} onChange={(value) => setCreateData((prev) => ({ ...prev, roomId: value }))} options={roomList.map((room: Record<string, unknown>) => ({ label: `${room.name} / ${room.capacity || 0}人`, value: room.id as string }))} />
            <Row gutter={12}>
              <Col span={8}><Input type="date" value={(createData.startDate as string) || todayString()} onChange={(event) => setCreateData((prev) => ({ ...prev, startDate: event.target.value }))} /></Col>
              <Col span={8}><InputNumber min={1} max={100} addonBefore="限额" addonAfter="人" style={{ width: '100%' }} value={Number(createData.maxStudents || 20)} onChange={(value) => setCreateData((prev) => ({ ...prev, maxStudents: value || 20 }))} /></Col>
              <Col span={8}><InputNumber min={1} max={120} addonBefore="课次" style={{ width: '100%' }} value={Number(createData.totalLessons || 16)} onChange={(value) => setCreateData((prev) => ({ ...prev, totalLessons: value || 16 }))} /></Col>
            </Row>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={() => setCreateStep(0)}>上一步</Button>
              <Button type="primary" onClick={handleNextStep}>下一步</Button>
            </div>
          </Space>
        )}

        {createStep === 2 && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <div>
              <div style={{ color: '#98A2B3', marginBottom: 10 }}>选择上课日</div>
              <Space wrap>
                {ALL_DAYS.map((day) => {
                  const days = (createData.recurringDays as string[]) || []
                  const active = days.includes(day)
                  return (
                    <Tag
                      key={day}
                      onClick={() => setCreateData((prev) => ({ ...prev, recurringDays: active ? days.filter((item) => item !== day) : [...days, day] }))}
                      style={{ cursor: 'pointer', borderRadius: 999, padding: '5px 14px', border: 'none', background: active ? '#E8784A' : '#202226', color: active ? '#fff' : '#98A2B3' }}
                    >
                      {DAY_LABELS[day]}
                    </Tag>
                  )
                })}
              </Space>
            </div>

            {/* Daily schedule template */}
            <div>
              <div style={{ color: '#98A2B3', marginBottom: 10 }}>每日上课时间段（与排课系统同步）</div>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 180px 100px 80px 80px', gap: 8, color: '#8D806F', fontSize: 11, marginBottom: 8 }}>
                <div>节次</div><div>老师 / 科目</div><div>科目</div><div>开始</div><div>结束</div>
              </div>
              {(Array.isArray(createData.scheduleTemplate) ? createData.scheduleTemplate as Record<string, unknown>[] : []).map((row, index) => {
                const assignments = (Array.isArray(createData.teacherAssignments) ? createData.teacherAssignments as Record<string, unknown>[] : [])
                return (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '100px 180px 100px 80px 80px', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#E8784A' }}>{row.periodName as string}</span>
                    <Select
                      size="small"
                      placeholder="老师科目"
                      value={row.teacherId && row.subject ? `${row.teacherId}::${row.subject}` : undefined}
                      onChange={v => {
                        const [tid, subj] = String(v).split('::')
                        const template = [...(Array.isArray(createData.scheduleTemplate) ? createData.scheduleTemplate as Record<string, unknown>[] : [])]
                        template[index] = { ...template[index], teacherId: tid, subject: subj }
                        setCreateData(prev => ({ ...prev, scheduleTemplate: template }))
                      }}
                      options={assignments.filter(a => a.teacherId && a.subject).map(a => ({
                        label: `${teacherList.find((t: Record<string, unknown>) => t.id === a.teacherId)?.name || '老师'} / ${a.subject}`,
                        value: `${a.teacherId}::${a.subject}`,
                      }))}
                    />
                    <Select
                      size="small"
                      placeholder="科目"
                      value={(row.subject as string) || undefined}
                      onChange={v => {
                        const template = [...(Array.isArray(createData.scheduleTemplate) ? createData.scheduleTemplate as Record<string, unknown>[] : [])]
                        template[index] = { ...template[index], subject: v }
                        setCreateData(prev => ({ ...prev, scheduleTemplate: template }))
                      }}
                      options={SUBJECTS.map(s => ({ label: s, value: s }))}
                    />
                    <Input size="small" type="time" value={(row.startTime as string) || ''} readOnly style={{ background: '#f5f5f5' }} />
                    <Input size="small" type="time" value={(row.endTime as string) || ''} readOnly style={{ background: '#f5f5f5' }} />
                  </div>
                )
              })}
            </div>

            <Row gutter={12}>
              <Col span={8}><InputNumber min={30} max={240} step={5} addonBefore="课时" addonAfter="分钟" style={{ width: '100%' }} value={Number(createData.lessonMinutes || 40)} onChange={(value) => setCreateData((prev) => ({ ...prev, lessonMinutes: value || 40 }))} /></Col>
              <Col span={8}><InputNumber min={1} max={120} addonBefore="总天次" style={{ width: '100%' }} value={Number(createData.totalLessons || 16)} onChange={(value) => setCreateData((prev) => ({ ...prev, totalLessons: value || 16 }))} /></Col>
            </Row>
            <div style={{ background: '#FCFBF9', border: '1px solid #EEE7E1', borderRadius: 8, padding: 14, minHeight: 104 }}>
              <div style={{ color: '#1F2329', fontWeight: 700, marginBottom: 8 }}>课次预览（共{previewDates.length}天，每天{
                (Array.isArray(createData.scheduleTemplate) ? createData.scheduleTemplate as Record<string, unknown>[] : []).filter(r => r.teacherId).length
              }节，合计{previewDates.length * (Array.isArray(createData.scheduleTemplate) ? createData.scheduleTemplate as Record<string, unknown>[] : []).filter(r => r.teacherId).length}节）</div>
              {previewDates.length ? previewDates.slice(0, 6).map((date, index) => (
                <div key={date.toISOString()} style={{ color: '#98A2B3', fontSize: 12, lineHeight: '22px' }}>
                  第{index + 1}天 · {format(date, 'yyyy-MM-dd EEEE', { locale: zhCN })}
                </div>
              )) : <div style={{ color: '#98A2B3' }}>请选择上课日后生成预览</div>}
              {previewDates.length > 6 && <div style={{ color: '#98A2B3', fontSize: 12 }}>... 还有 {previewDates.length - 6} 天</div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={() => setCreateStep(1)}>上一步</Button>
              <Button type="primary" loading={createLoading} onClick={handleCreate} style={{ background: '#e8784a' }}>
                确认创建并生成课表
              </Button>
            </div>
          </Space>
        )}
      </Modal>

      <Modal title="批量复制班次" open={copyOpen} onCancel={() => setCopyOpen(false)} onOk={handleCopy} confirmLoading={copyLoading} okText="确认复制">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select showSearch placeholder="选择原班级" style={{ width: '100%' }} value={copySource || undefined} onChange={(value) => setCopySource(value)} options={filteredGroups.map((group: Record<string, unknown>) => ({ label: group.name as string, value: group.id as string }))} />
          <Input placeholder="新班级名称" value={copyName} onChange={(event) => setCopyName(event.target.value)} />
          <Input type="date" value={copyStartDate} onChange={(event) => setCopyStartDate(event.target.value)} />
        </Space>
      </Modal>

      <Drawer title="课次管理" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={420}>
        {drawerLessons ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            {drawerLessons.map((lesson: Record<string, unknown>) => {
              const isCompleted = lesson.status === 'COMPLETED'
              const isCancelled = lesson.status === 'CANCELLED'
              return (
                <div key={lesson.id as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FCFBF9', border: '1px solid #EEE7E1', borderRadius: 8, padding: 12, opacity: isCancelled ? 0.55 : 1 }}>
                  <div>
                    <div style={{ color: '#1F2329', fontWeight: 600 }}>{format(new Date(lesson.lessonDate as string), 'M月d日 EEEE', { locale: zhCN })}</div>
                    <div style={{ color: '#98A2B3', fontSize: 12 }}>{lesson.startTime as string}-{lesson.endTime as string}</div>
                  </div>
                  {isCompleted ? <Tag color="green">已完成</Tag> : isCancelled ? <Tag color="red">已取消</Tag> : (
                    <Dropdown menu={{ items: [
                      { key: 'postpone', label: '一键后移', onClick: () => { setPostponeLessonId(lesson.id as string); setPostponeOpen(true) } },
                      { key: 'cancel', label: '停课本次', danger: true, onClick: () => handleCancelLesson(lesson.id as string) },
                    ]}}>
                      <Button type="text" icon={<MoreOutlined />} />
                    </Dropdown>
                  )}
                </div>
              )
            })}
          </Space>
        ) : <Spin />}
      </Drawer>

      <Modal title="一键后移课次" open={postponeOpen} onCancel={() => setPostponeOpen(false)} onOk={handlePostpone} okText="确认后移">
        <Space>
          <span>后移</span>
          <InputNumber min={1} max={90} value={postponeDays} onChange={(value) => setPostponeDays(value || 7)} />
          <span>天</span>
        </Space>
      </Modal>
    </PageLayout>
  )
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: '#98A2B3', fontSize: 11 }}>{label}</div>
      <div style={{ color: '#1F2329', fontSize: 15, fontWeight: 700 }}>{value}</div>
    </div>
  )
}
