'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { useParams, useRouter } from 'next/navigation'
import { Alert, Button, Card, Col, Dropdown, Empty, Input, InputNumber, message, Modal, Popconfirm, Progress, Row, Select, Space, Statistic, Table, Tag } from 'antd'
import { ArrowLeftOutlined, CalendarOutlined, DeleteOutlined, MoreOutlined, PlusOutlined, ReloadOutlined, TeamOutlined, UserSwitchOutlined } from '@ant-design/icons'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { PageLayout } from '@/components/Layout/PageLayout'
import { useIsMobile } from '@/hooks/useIsMobile'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { formatRemaining } from '@/lib/lesson-units'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('加载失败')
  return res.json()
}

export default function CourseGroupDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const isMobile = useIsMobile() ?? false
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [studentGrade, setStudentGrade] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [totalHours, setTotalHours] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [starting, setStarting] = useState(false)
  const [syncingHours, setSyncingHours] = useState(false)
  const [replaceOpen, setReplaceOpen] = useState(false)
  const [replaceKey, setReplaceKey] = useState<string>('')
  const [replaceOldTeacherId, setReplaceOldTeacherId] = useState<string>('')
  const [replaceOldSubject, setReplaceOldSubject] = useState<string>('')
  const [replaceOldTeacherName, setReplaceOldTeacherName] = useState<string>('')
  const [replaceNewTeacherId, setReplaceNewTeacherId] = useState<string>()
  const [replacing, setReplacing] = useState(false)

  const [addTeacherOpen, setAddTeacherOpen] = useState(false)
  const [addTeacherId, setAddTeacherId] = useState<string>()
  const [addTeacherSubject, setAddTeacherSubject] = useState('')
  const [addingTeacher, setAddingTeacher] = useState(false)
  const [reviewOpenId, setReviewOpenId] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const [reviewing, setReviewing] = useState(false)

  const { data: group, mutate, isLoading } = useSWR(params.id ? `/api/class-groups/${params.id}` : null, fetcher)
  const { data: reviewData, mutate: mutateReviews } = useSWR(
    group?.intensiveMode === 'INTENSIVE'
      ? `/api/admin/intensive-reviews?division=${group.division}&status=PENDING`
      : null,
    fetcher,
    { refreshInterval: 15_000, revalidateOnFocus: true },
  )
  const { data: studentsData } = useSWR(enrollOpen ? `/api/students?limit=200&q=${encodeURIComponent(studentSearch)}` : null, fetcher)
  const { data: teachers } = useSWR('/api/teachers?status=ACTIVE', fetcher)

  const lessons = useMemo(() => Array.isArray(group?.classLessons) ? group.classLessons : [], [group])
  const enrollments = useMemo(() => Array.isArray(group?.enrollments) ? group.enrollments : [], [group])
  const students = Array.isArray(studentsData?.students) ? studentsData.students : []
  const enrolledStudentIds = useMemo(() => new Set(enrollments.map((item: Record<string, unknown>) => (item.student as Record<string, unknown>)?.id)), [enrollments])
  const availableStudents = students.filter((student: Record<string, unknown>) => !enrolledStudentIds.has(student.id))
  const filteredAvailableStudents = availableStudents.filter((student: Record<string, unknown>) => {
    const matchGrade = !studentGrade || student.grade === studentGrade
    const matchSearch = !studentSearch.trim() || String(student.name || '').includes(studentSearch.trim())
    return matchGrade && matchSearch
  })
  const completed = Number(group?.completedLessons || lessons.filter((lesson: Record<string, unknown>) => lesson.status === 'COMPLETED').length)
  const total = Number(group?.totalLessons || lessons.length)
  const isIntensive = group?.intensiveMode === 'INTENSIVE'
  const intensiveScheduled = lessons.filter((lesson: Record<string, unknown>) => (
    lesson.status === 'SCHEDULED' || lesson.status === 'IN_PROGRESS'
  )).length
  const intensiveApproved = lessons.filter((lesson: Record<string, unknown>) => (
    lesson.intensiveReviewStatus === 'APPROVED'
  )).length
  const intensivePendingReview = lessons.filter((lesson: Record<string, unknown>) => (
    lesson.intensiveReviewStatus === 'PENDING'
  )).length
  const pendingReviews = Array.isArray(reviewData?.reviews)
    ? reviewData.reviews.filter((review: Record<string, unknown>) => (
      lessons.some((lesson: Record<string, unknown>) => lesson.id === review.lessonId)
    ))
    : []
  const selectedReview = pendingReviews.find((review: Record<string, unknown>) => review.id === reviewOpenId)
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todayLessons = lessons.filter((lesson: Record<string, unknown>) => String(lesson.lessonDate || '').slice(0, 10) === todayStr)
  const visibleLessons = isIntensive
    ? [...lessons].sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const pendingOrder = Number(b.intensiveReviewStatus === 'PENDING') - Number(a.intensiveReviewStatus === 'PENDING')
      if (pendingOrder !== 0) return pendingOrder
      return new Date(String(b.lessonDate)).getTime() - new Date(String(a.lessonDate)).getTime()
    })
    : todayLessons.length > 0 ? todayLessons : lessons.slice(0, 5)
  const teacherList = Array.isArray(teachers?.teachers) ? teachers.teachers : Array.isArray(teachers) ? teachers : []
  const teacherAssignments = useMemo(() => Array.isArray(group?.teacherAssignments) ? group.teacherAssignments : [], [group])

  // 合并 teacherAssignments + classLessons 去重作为数据源
  const mergedTeacherRecords = useMemo(() => {
    const map = new Map<string, { teacherId: string; subject: string; teacherName: string }>()
    for (const item of teacherAssignments) {
      const tId = item.teacherId as string
      const sub = (item.subject as string) || ''
      const tName = (item.teacher as Record<string, unknown> | undefined)?.name as string || tId
      const key = `${tId}::${sub}`
      if (!map.has(key)) map.set(key, { teacherId: tId, subject: sub, teacherName: tName })
    }
    for (const lesson of lessons) {
      const tId = lesson.teacherId as string
      const sub = (lesson.subject as string) || ''
      const tName = (lesson.teacher as Record<string, unknown> | undefined)?.name as string || tId
      if (!tId) continue
      const key = `${tId}::${sub}`
      if (!map.has(key)) map.set(key, { teacherId: tId, subject: sub, teacherName: tName })
    }
    return Array.from(map.values())
  }, [teacherAssignments, lessons])

  const replaceAffectedLessons = replaceOldTeacherId
    ? lessons.filter((lesson: Record<string, unknown>) => (
      lesson.status !== 'COMPLETED'
      && lesson.status !== 'CANCELLED'
      && lesson.teacherId === replaceOldTeacherId
      && (replaceOldSubject ? lesson.subject === replaceOldSubject : true)
    )).length
    : 0

  const replaceTeacherOptions = teacherList
    .filter((teacher: Record<string, unknown>) => teacher.id && teacher.id !== replaceOldTeacherId)
    .map((teacher: Record<string, unknown>) => ({ label: String(teacher.name || '未命名老师'), value: teacher.id as string }))
  const replaceNewTeacherName = teacherList.find((teacher: Record<string, unknown>) => teacher.id === replaceNewTeacherId)?.name || '新老师'
  const teacherTeam = Array.isArray(group?.teacherAssignments) && group.teacherAssignments.length
    ? group.teacherAssignments.map((item: Record<string, unknown>) => (item.teacher as Record<string, unknown>)?.name).filter(Boolean).join('、')
    : group?.teacher?.name
  const isHistoricalTerm = Boolean(group?.term && group.term.status !== 'ACTIVE')

  const handleStartGroup = async () => {
    setStarting(true)
    try {
      const res = await fetch(`/api/class-groups/${params.id}/start`, { method: 'POST' })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || '开班失败')
      message.success(payload.alreadyActive ? '班级已经是进行中' : `开班成功，已通知 ${payload.notifiedParents || 0} 位家长`)
      mutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '开班失败')
    } finally {
      setStarting(false)
    }
  }

  const handleAddStudents = async () => {
    if (!selectedStudentIds.length) {
      message.error('请选择要加入班级的学员')
      return
    }
    setSubmitting(true)
    try {
      for (const studentId of selectedStudentIds) {
        const res = await fetch(`/api/class-groups/${params.id}/enrollments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, totalHours }),
        })
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(payload.error || '添加学员失败')
      }
      message.success(`已添加 ${selectedStudentIds.length} 位学员`)
      handleCloseEnrollModal()
      setTotalHours(null)
      mutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '添加学员失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCloseEnrollModal = () => {
    setEnrollOpen(false)
    setStudentSearch('')
    setStudentGrade('')
    setSelectedStudentIds([])
  }

  const handleSelectGradeStudents = () => {
    if (!studentGrade) {
      message.warning('请先选择年级')
      return
    }
    setSelectedStudentIds(filteredAvailableStudents.map((student: Record<string, unknown>) => student.id as string))
  }

  const handleRemoveStudent = async (enrollmentId: string) => {
    const res = await fetch(`/api/class-groups/${params.id}/enrollments?enrollmentId=${enrollmentId}`, { method: 'DELETE' })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      message.error(payload.error || '移出失败')
      return
    }
    message.success('已移出班级')
    mutate()
  }

  const handleDeleteGroup = async () => {
    const res = await fetch(`/api/class-groups/${params.id}`, { method: 'DELETE' })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      message.error(payload.error || '删除失败')
      return
    }
    message.success('班级已删除')
    router.push('/courses')
  }

  const handleRegenerateLessons = async () => {
    try {
      const res = await fetch(`/api/class-groups/${params.id}/generate-lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || '重新生成失败')
      message.success(`课表已重新生成，共 ${payload.count || 0} 节课`)
      mutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '重新生成失败')
    }
  }

  const syncInsertedStudentHours = async () => {
    setSyncingHours(true)
    try {
      const res = await fetch(`/api/class-groups/${params.id}/sync-hours`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { message.error(data.error || '同步失败'); return }
      message.success(data.message || `已同步 ${data.updated} 位学员课时`)
      mutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '校准插班生课时失败')
    } finally {
      setSyncingHours(false)
    }
  }

  const openReplaceTeacher = () => {
    setReplaceKey('')
    setReplaceOldTeacherId('')
    setReplaceOldSubject('')
    setReplaceOldTeacherName('')
    setReplaceNewTeacherId(undefined)
    setReplaceOpen(true)
  }

  const handleSelectReplaceEntry = (entry: { teacherId: string; subject: string; teacherName: string }) => {
    const key = `${entry.teacherId}::${entry.subject}`
    setReplaceKey(key)
    setReplaceOldTeacherId(entry.teacherId)
    setReplaceOldSubject(entry.subject)
    setReplaceOldTeacherName(entry.teacherName)
    setReplaceNewTeacherId(undefined)
  }

  const handleReplaceTeacher = async () => {
    if (!replaceOldTeacherId || !replaceNewTeacherId) {
      message.warning('请选择新的任课老师')
      return
    }
    setReplacing(true)
    try {
      const res = await fetch(`/api/class-groups/${params.id}/replace-teacher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldTeacherId: replaceOldTeacherId,
          newTeacherId: replaceNewTeacherId,
          subject: replaceOldSubject || null,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || '更换老师失败')
      message.success(`已更换，影响 ${payload.affectedLessons || 0} 节课次`)
      setReplaceOpen(false)
      setReplaceKey('')
      setReplaceOldTeacherId('')
      setReplaceOldSubject('')
      setReplaceOldTeacherName('')
      setReplaceNewTeacherId(undefined)
      mutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '更换老师失败')
    } finally {
      setReplacing(false)
    }
  }

  const handleAddTeacher = async () => {
    if (!addTeacherId || !addTeacherSubject.trim()) {
      message.warning('请选择老师和科目')
      return
    }
    setAddingTeacher(true)
    try {
      const res = await fetch(`/api/class-groups/${params.id}/add-teacher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: addTeacherId, subject: addTeacherSubject.trim() }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || '添加任课老师失败')
      message.success(`已添加 ${addTeacherSubject} 任课老师`)
      setAddTeacherOpen(false)
      setAddTeacherId(undefined)
      setAddTeacherSubject('')
      mutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '添加任课老师失败')
    } finally {
      setAddingTeacher(false)
    }
  }

  const openLessonReview = (lessonId?: string) => {
    const review = pendingReviews.find((item: Record<string, unknown>) => (
      lessonId ? item.lessonId === lessonId : true
    ))
    if (!review) {
      message.info('审核记录正在刷新，请稍后再试')
      void mutateReviews()
      return
    }
    setReviewNote('')
    setReviewOpenId(String(review.id))
  }

  const handleIntensiveReview = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedReview) return
    if (action === 'REJECT' && reviewNote.trim().length < 2) {
      message.warning('驳回时请填写原因，方便教师修改')
      return
    }
    setReviewing(true)
    try {
      const response = await fetch(
        `/api/admin/intensive-reviews/${selectedReview.id}?division=${group.division}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, reviewNote: reviewNote.trim() }),
        },
      )
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '审核失败')
      if (action === 'APPROVE') {
        message.success(
          `审核通过：计入${(Number(selectedReview.actualMinutes || 0) / 60).toFixed(2)}小时，工资￥${Number(payload.salaryAmount || 0).toFixed(2)}`,
        )
      } else {
        message.success('已驳回，教师可修改后重新提交')
      }
      setReviewOpenId('')
      setReviewNote('')
      await Promise.all([mutate(), mutateReviews()])
    } catch (error) {
      message.error(error instanceof Error ? error.message : '审核失败')
    } finally {
      setReviewing(false)
    }
  }

  if (isLoading) {
    return <PageLayout title="班级管理"><CardSkeleton rows={3} /></PageLayout>
  }

  if (!group) {
    return <PageLayout title="班级管理"><Empty description="班级不存在" /></PageLayout>
  }

  return (
    <PageLayout
      title={group.name}
      subtitle={`${group.course?.name || ''} / 授课团队：${teacherTeam || '未分配'} / ${isIntensive ? '上课地点灵活安排' : group.room?.name || '未分配教室'}`}
      actions={isMobile ? (
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              { key: 'change-teacher', icon: <UserSwitchOutlined />, label: '更换老师', disabled: isHistoricalTerm, onClick: openReplaceTeacher },
              { key: 'regenerate', icon: <ReloadOutlined />, label: '重新生成课表', disabled: isHistoricalTerm, onClick: handleRegenerateLessons },
              { key: 'back', icon: <ArrowLeftOutlined />, label: '返回课程管理', onClick: () => router.push('/courses') },
              {
                key: 'delete',
                icon: <DeleteOutlined />,
                label: '删除班级',
                danger: true,
                disabled: isHistoricalTerm,
                onClick: () => {
                  Modal.confirm({
                    title: '确定删除这个班级？',
                    content: '删除后班级会归档，不再出现在课程和排课列表。',
                    okText: '确认删除',
                    cancelText: '取消',
                    okButtonProps: { danger: true },
                    onOk: handleDeleteGroup,
                  })
                },
              },
            ],
          }}
        >
          <Button icon={<MoreOutlined />} />
        </Dropdown>
      ) : (
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} disabled={isHistoricalTerm} onClick={() => setEnrollOpen(true)} style={{ background: '#e8784a' }}>添加学员</Button>
          {group.status === 'WAITING' && <Button type="primary" disabled={isHistoricalTerm} loading={starting} onClick={handleStartGroup} style={{ background: '#27a644' }}>开班并通知家长</Button>}
          <Button icon={<UserSwitchOutlined />} disabled={isHistoricalTerm} onClick={openReplaceTeacher}>更换老师</Button>
          {group.status === 'WAITING' && <Button icon={<ReloadOutlined />} disabled={isHistoricalTerm} onClick={handleRegenerateLessons}>重新生成课表</Button>}
          <Popconfirm title="确定删除这个班级？" description="删除后班级会归档，不再出现在课程和排课列表。" onConfirm={handleDeleteGroup}>
            <Button danger disabled={isHistoricalTerm} icon={<DeleteOutlined />}>删除班级</Button>
          </Popconfirm>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/courses')}>返回课程管理</Button>
        </Space>
      )}
    >
      {isHistoricalTerm && (
        <Alert
          showIcon
          type="info"
          message={`正在查看历史批次：${group.term?.name || '历史批次'}`}
          description="历史班级、课次、考勤、反馈和工资仅供核对；如需新增或修改，请先在数据总览切换到当前运营批次。"
          style={{ marginBottom: 16 }}
        />
      )}
      {isMobile && (
        <Space.Compact block style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} disabled={isHistoricalTerm} onClick={() => setEnrollOpen(true)} style={{ background: '#e8784a', flex: 1 }}>添加学员</Button>
          {group.status === 'WAITING' && <Button type="primary" disabled={isHistoricalTerm} loading={starting} onClick={handleStartGroup} style={{ background: '#27a644', flex: 1 }}>开班通知</Button>}
        </Space.Compact>
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}><Metric title="在读人数" value={enrollments.length} /></Col>
        {isIntensive ? (
          <>
            <Col xs={12} lg={6}><Metric title="已安排课次" value={intensiveScheduled} /></Col>
            <Col xs={12} lg={6}><Metric title="已审核课次" value={intensiveApproved} /></Col>
            <Col xs={12} lg={6}>
              <Metric
                title="待审核课次"
                value={intensivePendingReview}
                actionLabel={!isHistoricalTerm && intensivePendingReview > 0 ? '立即审核' : undefined}
                onAction={isHistoricalTerm ? undefined : () => openLessonReview()}
              />
            </Col>
          </>
        ) : (
          <>
            <Col xs={12} lg={6}><Metric title="总课次" value={total} /></Col>
            <Col xs={12} lg={6}><Metric title="已上课次" value={completed} /></Col>
            <Col xs={12} lg={6}><Metric title="剩余课次" value={Math.max(0, total - completed)} /></Col>
          </>
        )}
      </Row>

      <Card bordered={false} style={{ borderRadius: 8, marginBottom: 16, background: '#ffffff', border: '1px solid #EEE7E1' }}>
        {isIntensive ? (
          <Alert
            type="info"
            showIcon
            message="个性化课程按实际授课累计"
            description="不设置固定总课次。教师约课并完成考勤后，由管理员审核实际授课时间，再计入学生课时和教师工资。"
          />
        ) : (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ color: '#98A2B3' }}>课程进度</div>
            <Progress percent={total ? Math.round((completed / total) * 100) : 0} strokeColor="#E8784A" />
          </Space>
        )}
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card
            title={<span style={{ color: '#1F2329' }}><TeamOutlined /> 学员名单</span>}
            extra={(
              <Space size={8}>
                <Popconfirm
                  title="按剩余有效课次校准插班生？"
                  description="仅处理开班后加入的学生，并保留已经消耗的课时记录。"
                  onConfirm={syncInsertedStudentHours}
                  okText="确认校准"
                  cancelText="取消"
                >
                  <Button size="small" disabled={isHistoricalTerm} loading={syncingHours}>校准插班生课时</Button>
                </Popconfirm>
                <Button size="small" icon={<PlusOutlined />} disabled={isHistoricalTerm} onClick={() => setEnrollOpen(true)}>添加</Button>
              </Space>
            )}
            bordered={false}
            style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}
          >
            {!enrollments.length ? <Empty description="暂无学员，先添加学员后再开班通知" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
              <Space direction="vertical" style={{ width: '100%' }}>
                {enrollments.map((enrollment: Record<string, unknown>) => {
                  const student = enrollment.student as Record<string, unknown> | undefined
                  return (
                    <div key={enrollment.id as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #EEE7E1' }}>
                      <div>
                        <div style={{ color: '#1F2329' }}>{student?.name as string}</div>
                        <div style={{ color: '#98A2B3', fontSize: 12 }}>
                          {student?.grade as string || '-'} / 剩余 {formatRemaining(Number(enrollment.remainHours ?? 0), group.course?.type || null, Number(group.lessonMinutes || 40)).text}
                        </div>
                      </div>
                      <Popconfirm title="确定把该学员移出班级？" onConfirm={() => handleRemoveStudent(enrollment.id as string)}>
                        <Button size="small" danger type="text" disabled={isHistoricalTerm}>移出</Button>
                      </Popconfirm>
                    </div>
                  )
                })}
              </Space>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card
            title={(
              <span style={{ color: '#1F2329' }}>
                <CalendarOutlined /> {isIntensive ? '个性化课次' : todayLessons.length > 0 ? '今日课次' : '近期课次'}
              </span>
            )}
            extra={isIntensive
              ? <Tag color={intensivePendingReview > 0 ? 'orange' : 'green'}>{intensivePendingReview} 节待审核</Tag>
              : <Tag color={todayLessons.length > 0 ? 'orange' : 'blue'}>{todayLessons.length > 0 ? `${todayLessons.length} 节` : '前 5 节'}</Tag>}
            bordered={false}
            style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}
          >
            <Table
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
              scroll={{ x: isIntensive ? 720 : 620 }}
              dataSource={visibleLessons}
              columns={[
                { title: '日期', dataIndex: 'lessonDate', render: (value: string) => format(new Date(value), 'yyyy-MM-dd EEEE', { locale: zhCN }) },
                { title: '时间', render: (_, row: Record<string, unknown>) => `${row.startTime}-${row.endTime}` },
                { title: '科目/老师', render: (_, row: Record<string, unknown>) => `${row.subject || group.course?.subject || '-'} / ${(row.teacher as Record<string, unknown> | undefined)?.name || teacherTeam || '-'}` },
                {
                  title: '状态',
                  dataIndex: 'status',
                  render: (value: string, row: Record<string, unknown>) => (
                    <Space size={4}>
                      <Tag>{value}</Tag>
                      {row.isManual === true && <Tag color="orange">临时</Tag>}
                      {isIntensive && row.intensiveReviewStatus === 'PENDING' && <Tag color="orange">待审核</Tag>}
                      {isIntensive && row.intensiveReviewStatus === 'APPROVED' && <Tag color="green">已审核</Tag>}
                      {isIntensive && row.intensiveReviewStatus === 'REJECTED' && <Tag color="red">已驳回</Tag>}
                    </Space>
                  ),
                },
                ...(isIntensive ? [{
                  title: '操作',
                  width: 90,
                  render: (_: unknown, row: Record<string, unknown>) => (
                    !isHistoricalTerm && row.intensiveReviewStatus === 'PENDING' ? (
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => openLessonReview(String(row.id))}
                      >
                        审核
                      </Button>
                    ) : (
                      <span style={{ color: '#98A2B3', fontSize: 12 }}>无需处理</span>
                    )
                  ),
                }] : []),
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title="审核个性化课程"
        open={Boolean(selectedReview)}
        onCancel={() => {
          if (reviewing) return
          setReviewOpenId('')
          setReviewNote('')
        }}
        footer={null}
        width={isMobile ? 'calc(100vw - 24px)' : 620}
        centered
        destroyOnHidden
      >
        {selectedReview && (
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message={`${selectedReview.groupName} · ${selectedReview.subject}`}
              description={`${selectedReview.teacherName}申报 ${selectedReview.actualMinutes} 分钟（${(Number(selectedReview.actualMinutes) / 60).toFixed(2)}小时）`}
            />
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: 10,
              padding: 12,
              borderRadius: 10,
              background: 'var(--color-surface-3)',
            }}>
              <div>
                <div style={{ color: 'var(--color-ink-subtle)', fontSize: 12 }}>上课日期</div>
                <div style={{ marginTop: 3, fontWeight: 600 }}>
                  {format(new Date(String(selectedReview.lessonDate)), 'yyyy-MM-dd EEEE', { locale: zhCN })}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--color-ink-subtle)', fontSize: 12 }}>上课时间</div>
                <div style={{ marginTop: 3, fontWeight: 600 }}>{selectedReview.startTime}-{selectedReview.endTime}</div>
              </div>
            </div>
            <div>
              <div style={{ marginBottom: 7, fontWeight: 600 }}>学生考勤</div>
              <Space wrap size={[6, 6]}>
                {(Array.isArray(selectedReview.students) ? selectedReview.students : []).map((student: Record<string, unknown>) => (
                  <Tag key={String(student.id)} color={student.status === 'PRESENT' ? 'green' : student.status === 'LEAVE' ? 'gold' : 'red'}>
                    {String(student.name)} · {student.status === 'PRESENT' ? '出勤' : student.status === 'LEAVE' ? '请假' : student.status === 'MAKEUP' ? '补课' : '缺勤'}
                  </Tag>
                ))}
              </Space>
            </div>
            {selectedReview.teacherNote && (
              <Alert message={`教师说明：${selectedReview.teacherNote}`} type="warning" />
            )}
            <Input.TextArea
              rows={3}
              maxLength={500}
              showCount
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              placeholder="审核备注（驳回时必填）"
            />
            <Row gutter={10}>
              <Col span={12}>
                <Button
                  block
                  danger
                  disabled={reviewing}
                  onClick={() => handleIntensiveReview('REJECT')}
                  style={{ minHeight: 42 }}
                >
                  驳回修改
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  block
                  type="primary"
                  loading={reviewing}
                  onClick={() => handleIntensiveReview('APPROVE')}
                  style={{ minHeight: 42 }}
                >
                  核对无误并通过
                </Button>
              </Col>
            </Row>
          </Space>
        )}
      </Modal>

      <Modal
        title="添加学员到班级"
        open={enrollOpen}
        onCancel={handleCloseEnrollModal}
        onOk={handleAddStudents}
        confirmLoading={submitting}
        okText="确认添加"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }} size={14}>
          <Select
            allowClear
            placeholder="按年级筛选"
            value={studentGrade || undefined}
            onChange={(value) => {
              setStudentGrade(value || '')
              setSelectedStudentIds([])
            }}
            style={{ width: '100%' }}
            options={['初一', '初二', '初三', '高一', '高二', '高三'].map((grade) => ({ label: grade, value: grade }))}
          />
          <Button onClick={handleSelectGradeStudents} disabled={!studentGrade || filteredAvailableStudents.length === 0}>
            一键选择该年级 {filteredAvailableStudents.length} 人
          </Button>
          <Input.Search
            placeholder="输入姓名搜索学员"
            allowClear
            value={studentSearch}
            onChange={(event) => {
              setStudentSearch(event.target.value)
              setSelectedStudentIds([])
            }}
            style={{ marginBottom: 8 }}
          />
          {students.length > 0 && availableStudents.length === 0 && (
            <Alert type="info" showIcon message="该班所有已找到的学员均已报名" />
          )}
          <Select
            mode="multiple"
            showSearch
            optionFilterProp="label"
            placeholder="选择学员，可一次添加多人"
            value={selectedStudentIds}
            onChange={setSelectedStudentIds}
            style={{ width: '100%' }}
            filterOption={(input, option) => String(option?.label || '').includes(input)}
            options={filteredAvailableStudents.map((student: Record<string, unknown>) => ({
              label: `${student.name}${student.grade ? ` / ${student.grade}` : ''}${student.parentPhone ? ` / ${student.parentPhone}` : ''}`,
              value: student.id as string,
            }))}
          />
          <div style={{ fontSize: 12, color: '#98A2B3', marginBottom: 8, padding: '6px 10px', background: '#F5F2EE', borderRadius: 6 }}>
            插班生将按当前尚未完成的有效课次自动计算剩余课时，不追溯加入前已完成的课程；如购买课时不同，可在下方自定义。
          </div>
          <InputNumber
            min={0}
            precision={1}
            placeholder="购买课时，留空则按剩余有效课次自动计算"
            value={totalHours}
            onChange={(value) => setTotalHours(value)}
            style={{ width: '100%' }}
          />
        </Space>
      </Modal>
      <Modal
        title="更换任课老师"
        open={replaceOpen}
        onCancel={() => setReplaceOpen(false)}
        footer={null}
        width={480}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={14}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1201', marginBottom: 8 }}>选择要替换的任课记录</div>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              {mergedTeacherRecords.map((entry) => {
                const key = `${entry.teacherId}::${entry.subject}`
                const selected = replaceKey === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectReplaceEntry(entry)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: selected ? '1px solid #E8784A' : '1px solid #EEE7E1',
                      background: selected ? '#FFF3EC' : '#fff',
                      borderRadius: 10,
                      padding: '10px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ color: '#1a1201', fontWeight: 700 }}>{entry.subject || '主讲'}</span>
                      <span style={{ color: selected ? '#E8784A' : '#5a4e3a' }}>{entry.teacherName || '未分配老师'}</span>
                    </div>
                  </button>
                )
              })}
              {!mergedTeacherRecords.length && <Alert type="warning" showIcon message="该班级暂无任课老师记录，请先添加授课团队。" />}
            </Space>
          </div>
          {replaceOldTeacherId && (
            <>
              <Select
                placeholder="更换为"
                value={replaceNewTeacherId}
                onChange={setReplaceNewTeacherId}
                options={replaceTeacherOptions}
                style={{ width: '100%' }}
                optionFilterProp="label"
                showSearch
                listHeight={240}
                virtual={false}
                getPopupContainer={(trigger) => trigger.parentElement || document.body}
              />
              <div style={{ fontSize: 12, color: '#8d806f', padding: '10px 12px', borderRadius: 8, background: '#FFF8F4', border: '1px solid #F0EBE5', lineHeight: 1.7 }}>
                将把【{replaceOldSubject || '主讲'}】的【{replaceOldTeacherName || replaceOldTeacherId}】更换为【{replaceNewTeacherName}】，
                影响 {replaceAffectedLessons} 节尚未完成的课次，已完成课次不受影响。
              </div>
              <Button
                type="primary"
                block
                loading={replacing}
                disabled={!replaceNewTeacherId}
                onClick={handleReplaceTeacher}
                style={{ background: '#e8784a', borderColor: '#e8784a' }}
              >
                确认更换
              </Button>
            </>
          )}
          <div style={{ borderTop: '1px solid #EEE7E1', paddingTop: 12 }}>
            <Button
              type="dashed"
              block
              icon={<PlusOutlined />}
              onClick={() => {
                setAddTeacherId(undefined)
                setAddTeacherSubject('')
                setAddTeacherOpen(true)
              }}
            >
              添加任课老师
            </Button>
          </div>
        </Space>
      </Modal>

      <Modal
        title="添加任课老师"
        open={addTeacherOpen}
        onCancel={() => setAddTeacherOpen(false)}
        onOk={handleAddTeacher}
        confirmLoading={addingTeacher}
        okText="确认添加"
        cancelText="取消"
        okButtonProps={{ style: { background: '#e8784a', borderColor: '#e8784a' } }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={14}>
          <Select
            placeholder="选择老师"
            value={addTeacherId}
            onChange={setAddTeacherId}
            options={teacherList.map((t: Record<string, unknown>) => ({ label: String(t.name || ''), value: t.id as string }))}
            style={{ width: '100%' }}
            optionFilterProp="label"
            showSearch
            listHeight={240}
            virtual={false}
            getPopupContainer={(trigger) => trigger.parentElement || document.body}
          />
          <Select
            placeholder="选择科目"
            value={addTeacherSubject || undefined}
            onChange={setAddTeacherSubject}
            style={{ width: '100%' }}
            options={['语文', '数学', '英语', '物理', '化学', '生物', '地理', '历史', '政治'].map((s) => ({ label: s, value: s }))}
          />
          <div style={{ fontSize: 12, color: '#8d806f', padding: '10px 12px', borderRadius: 8, background: '#FFF8F4', border: '1px solid #F0EBE5', lineHeight: 1.7 }}>
            仅补入对应表，不自动排课。排课请用&ldquo;新增上课日&rdquo;或重新生成课表。
          </div>
        </Space>
      </Modal>
    </PageLayout>
  )
}

function Metric({
  title,
  value,
  actionLabel,
  onAction,
}: {
  title: string
  value: number
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <Card
      bordered={false}
      style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}
      extra={actionLabel ? <Button type="link" size="small" onClick={onAction}>{actionLabel}</Button> : null}
    >
      <Statistic title={<span style={{ color: '#98A2B3' }}>{title}</span>} value={value} valueStyle={{ color: '#1F2329' }} />
    </Card>
  )
}
