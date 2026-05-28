'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { useParams, useRouter } from 'next/navigation'
import { Alert, Button, Card, Col, Empty, Input, InputNumber, message, Modal, Popconfirm, Progress, Row, Select, Space, Spin, Statistic, Table, Tag } from 'antd'
import { ArrowLeftOutlined, CalendarOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined, TeamOutlined } from '@ant-design/icons'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { PageLayout } from '@/components/Layout/PageLayout'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('加载失败')
  return res.json()
}

export default function CourseGroupDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [studentGrade, setStudentGrade] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [totalHours, setTotalHours] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [starting, setStarting] = useState(false)

  const { data: group, mutate, isLoading } = useSWR(params.id ? `/api/class-groups/${params.id}` : null, fetcher)
  const { data: studentsData } = useSWR(enrollOpen ? `/api/students?limit=200&q=${encodeURIComponent(studentSearch)}` : null, fetcher)

  const lessons = Array.isArray(group?.classLessons) ? group.classLessons : []
  const enrollments = Array.isArray(group?.enrollments) ? group.enrollments : []
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
  const teacherTeam = Array.isArray(group?.teacherAssignments) && group.teacherAssignments.length
    ? group.teacherAssignments.map((item: Record<string, unknown>) => (item.teacher as Record<string, unknown>)?.name).filter(Boolean).join('、')
    : group?.teacher?.name

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

  if (isLoading) {
    return <PageLayout title="班级管理"><div style={{ padding: 80, textAlign: 'center' }}><Spin size="large" /></div></PageLayout>
  }

  if (!group) {
    return <PageLayout title="班级管理"><Empty description="班级不存在" /></PageLayout>
  }

  return (
    <PageLayout
      title={group.name}
      subtitle={`${group.course?.name || ''} / 授课团队：${teacherTeam || '未分配'} / ${group.room?.name || '未分配教室'}`}
      actions={
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEnrollOpen(true)} style={{ background: '#e8784a' }}>添加学员</Button>
          {group.status === 'WAITING' && <Button type="primary" loading={starting} onClick={handleStartGroup} style={{ background: '#27a644' }}>开班并通知家长</Button>}
          <Button icon={<ReloadOutlined />} onClick={handleRegenerateLessons}>重新生成课表</Button>
          <Popconfirm title="确定删除这个班级？" description="删除后班级会归档，不再出现在课程和排课列表。" onConfirm={handleDeleteGroup}>
            <Button danger icon={<DeleteOutlined />}>删除班级</Button>
          </Popconfirm>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/courses')}>返回课程管理</Button>
        </Space>
      }
    >
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}><Metric title="在读人数" value={enrollments.length} /></Col>
        <Col xs={12} lg={6}><Metric title="总课次" value={total} /></Col>
        <Col xs={12} lg={6}><Metric title="已上课次" value={completed} /></Col>
        <Col xs={12} lg={6}><Metric title="剩余课次" value={Math.max(0, total - completed)} /></Col>
      </Row>

      <Card bordered={false} style={{ borderRadius: 8, marginBottom: 16, background: '#ffffff', border: '1px solid #EEE7E1' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ color: '#98A2B3' }}>课程进度</div>
          <Progress percent={total ? Math.round((completed / total) * 100) : 0} strokeColor="#5e6ad2" />
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card
            title={<span style={{ color: '#1F2329' }}><TeamOutlined /> 学员名单</span>}
            extra={<Button size="small" icon={<PlusOutlined />} onClick={() => setEnrollOpen(true)}>添加</Button>}
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
                        <div style={{ color: '#98A2B3', fontSize: 12 }}>{student?.grade as string || '-'} / 剩余 {String(enrollment.remainHours ?? 0)} 课时</div>
                      </div>
                      <Popconfirm title="确定把该学员移出班级？" onConfirm={() => handleRemoveStudent(enrollment.id as string)}>
                        <Button size="small" danger type="text">移出</Button>
                      </Popconfirm>
                    </div>
                  )
                })}
              </Space>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title={<span style={{ color: '#1F2329' }}><CalendarOutlined /> 课次列表</span>} bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
            <Table
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
              dataSource={lessons}
              columns={[
                { title: '日期', dataIndex: 'lessonDate', render: (value: string) => format(new Date(value), 'yyyy-MM-dd EEEE', { locale: zhCN }) },
                { title: '时间', render: (_, row: Record<string, unknown>) => `${row.startTime}-${row.endTime}` },
                { title: '科目/老师', render: (_, row: Record<string, unknown>) => `${row.subject || group.course?.subject || '-'} / ${(row.teacher as Record<string, unknown> | undefined)?.name || teacherTeam || '-'}` },
                { title: '状态', dataIndex: 'status', render: (value: string) => <Tag>{value}</Tag> },
              ]}
            />
          </Card>
        </Col>
      </Row>

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
          <InputNumber
            min={0}
            precision={1}
            placeholder={`购买课时，留空则按班级总课时 ${((group.totalLessons || 0) * (group.lessonMinutes || 0)) / 60} 自动计算`}
            value={totalHours}
            onChange={(value) => setTotalHours(value)}
            style={{ width: '100%' }}
          />
        </Space>
      </Modal>
    </PageLayout>
  )
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <Card bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
      <Statistic title={<span style={{ color: '#98A2B3' }}>{title}</span>} value={value} valueStyle={{ color: '#1F2329' }} />
    </Card>
  )
}
