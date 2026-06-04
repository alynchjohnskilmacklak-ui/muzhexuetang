'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Avatar, Badge, Button, Card, Empty, Input, Progress, Segmented, Select, Skeleton, Space, Tag, Typography } from 'antd'
import { FileTextOutlined, MessageOutlined, SearchOutlined, UserOutlined, WarningFilled } from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'
import { formatHourPair, formatHours, formatPercent } from '@/lib/format'

const { Title, Text } = Typography
const fetcher = (url: string) => fetch(url).then((res) => res.json())

type TeacherStudent = {
  id: string
  name?: string
  grade?: string | null
  gender?: string | null
  school?: string | null
  remainHours?: number | string | null
  totalHours?: number | string | null
  attendanceRate?: number | null
  daysSinceLastFeedback?: number | null
  primaryCourseType?: 'ONE_ON_ONE' | 'SMALL_GROUP' | 'GROUP' | string | null
  enrollments?: Array<{
    id: string
    group?: {
      course?: { name?: string | null } | null
      teacherAssignments?: Array<{ subject?: string | null }>
    } | null
  }>
}

function feedbackLabel(days: number) {
  if (days === 0) return { text: '课堂反馈：今天', color: '#1D9E75' }
  if (days <= 3) return { text: `课堂反馈：${days}天前`, color: '#8d806f' }
  if (days <= 7) return { text: `课堂反馈：${days}天前`, color: '#f5a623' }
  if (days === 999) return { text: '尚未发布课堂反馈', color: '#D4537E' }
  return { text: `${days}天未发布课堂反馈`, color: '#D4537E' }
}

export default function TeacherStudentsPage() {
  const router = useRouter()
  const isMobile = useIsMobile() ?? false
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('全部')
  const [gradeFilter, setGradeFilter] = useState('')
  const { data: rawStudents, isLoading } = useSWR<TeacherStudent[]>('/api/teacher/students', fetcher)
  const students = useMemo(() => rawStudents ?? [], [rawStudents])

  const grades = useMemo(
    () => Array.from(new Set(students.map((student) => student.grade).filter(Boolean))).map(String),
    [students],
  )
  const filters = ['全部', '课时不足', '未反馈', '初一', '初二', '初三']

  const filtered = useMemo(() => students.filter((student) => {
    const searchText = [
      student.name,
      student.grade,
      student.school,
      ...(student.enrollments?.map((enrollment) => enrollment.group?.course?.name || '') || []),
    ].join('')
    const matchSearch = !q.trim() || searchText.includes(q.trim())
    const matchFilter = filter === '全部'
      || (filter === '课时不足' && Number(student.remainHours || 0) <= 2)
      || (filter === '未反馈' && Number(student.daysSinceLastFeedback || 999) > 7)
      || student.grade === filter
    const matchGrade = !gradeFilter || student.grade === gradeFilter
    return matchSearch && matchFilter && matchGrade
  }), [students, q, filter, gradeFilter])

  const groupedStudents = useMemo(() => {
    const oneOnOne = filtered.filter((student) => student.primaryCourseType === 'ONE_ON_ONE')
    const smallGroup = filtered.filter((student) => student.primaryCourseType === 'SMALL_GROUP')
    const group = filtered.filter((student) => student.primaryCourseType === 'GROUP' || !student.primaryCourseType)
    return { oneOnOne, smallGroup, group }
  }, [filtered])

  const renderStudentCard = (student: TeacherStudent) => {
    const remain = Number(student.remainHours || 0)
    const total = Number(student.totalHours || 0)
    const used = Math.max(0, total - remain)
    const usedRate = total ? Math.round((used / total) * 100) : 0
    const feedback = feedbackLabel(Number(student.daysSinceLastFeedback || 999))
    const numberStyle = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const
    return (
      <Card
        key={student.id}
        bordered={false}
        style={{
          width: '100%',
          borderRadius: 10,
          borderLeft: remain <= 2 ? '4px solid #D4537E' : '4px solid transparent',
        }}
        styles={{ body: { padding: isMobile ? 14 : 24 } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
          <Space align="start" style={{ minWidth: 0 }}>
            <Avatar icon={<UserOutlined />} style={{ background: '#E8784A', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <Text strong style={{ fontSize: isMobile ? 16 : 14 }}>{student.name}</Text>
              <div style={{ fontSize: 12, color: '#8d806f', marginTop: 2 }}>
                {student.grade || '-'} / {student.gender || '-'} / {student.school || '-'}
              </div>
            </div>
          </Space>
          {remain <= 2 && <Badge dot color="#D4537E"><WarningFilled style={{ color: '#D4537E' }} /></Badge>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10, marginBottom: 12 }}>
          <div style={{ background: '#faf8f5', borderRadius: 8, padding: isMobile ? 10 : 12, minWidth: 0 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>剩余课时</Text>
            <div style={{ color: remain <= 2 ? '#D4537E' : remain <= 15 ? '#f5a623' : '#1F2329', fontSize: isMobile ? 20 : 22, fontWeight: 700, ...numberStyle }}>
              {formatHours(remain)}
            </div>
          </div>
          <div style={{ background: '#faf8f5', borderRadius: 8, padding: isMobile ? 10 : 12, minWidth: 0 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>出勤率</Text>
            <div style={{ color: '#1D9E75', fontSize: isMobile ? 20 : 22, fontWeight: 700, ...numberStyle }}>
              {formatPercent(student.attendanceRate)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
          <Text type="secondary">已用/总课时</Text>
          <Text style={numberStyle}>{total ? formatHourPair(used, total) : '0/0'}</Text>
        </div>
        <Progress percent={usedRate} showInfo={false} strokeColor={usedRate <= 30 ? '#1D9E75' : usedRate <= 70 ? '#f5a623' : '#D4537E'} />
        <div style={{ color: feedback.color, fontSize: 12, marginTop: 10 }}>{feedback.text}</div>

        <Space wrap style={{ marginTop: 10 }}>
          {student.enrollments?.slice(0, 3).map((enrollment) => (
            <Tag key={enrollment.id}>{enrollment.group?.teacherAssignments?.[0]?.subject || enrollment.group?.course?.name || '课程'}</Tag>
          ))}
        </Space>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
            gap: 8,
            marginTop: 14,
          }}
        >
          <Button icon={<FileTextOutlined />} onClick={() => router.push(`/teacher/classroom-feedback?studentId=${student.id}`)}>上传</Button>
          <Button icon={<MessageOutlined />} onClick={() => router.push(`/teacher/performance?studentId=${student.id}`)}>反馈</Button>
          <Button onClick={() => router.push(`/teacher/students/${student.id}`)}>档案</Button>
        </div>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div style={{ padding: 16 }}>
        <Skeleton active avatar paragraph={{ rows: 2 }} style={{ marginBottom: 12 }} />
        <Skeleton active avatar paragraph={{ rows: 2 }} style={{ marginBottom: 12 }} />
        <Skeleton active avatar paragraph={{ rows: 2 }} />
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: isMobile ? 88 : 0, overflowX: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          gap: isMobile ? 12 : 16,
          alignItems: isMobile ? 'stretch' : 'flex-end',
          marginBottom: 16,
          minWidth: 0,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <Title
            level={isMobile ? 3 : 4}
            style={{
              margin: 0,
              whiteSpace: 'nowrap',
              lineHeight: 1.25,
              wordBreak: 'keep-all',
            }}
          >
            我的学员
          </Title>
          <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
            按课时、反馈状态和年级快速筛选
          </Text>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 8,
            width: isMobile ? '100%' : undefined,
          }}
        >
          <Select
            placeholder="年级筛选"
            allowClear
            value={gradeFilter || undefined}
            onChange={(value) => setGradeFilter(value || '')}
            options={grades.map((grade) => ({ label: grade, value: grade }))}
            style={{ width: isMobile ? '100%' : 132 }}
          />
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索学员、年级、学校或课程"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            allowClear
            style={{ width: isMobile ? '100%' : 320, height: isMobile ? 40 : undefined }}
          />
        </div>
      </div>

      <Card
        bordered={false}
        style={{ borderRadius: 10, marginBottom: 16, overflow: 'hidden' }}
        styles={{ body: { padding: isMobile ? 8 : 12 } }}
      >
        <div style={{ overflowX: isMobile ? 'auto' : 'visible', paddingBottom: isMobile ? 2 : 0 }}>
          <Segmented
            value={filter}
            onChange={(value) => setFilter(String(value))}
            options={filters}
            block={!isMobile}
            style={{ minWidth: isMobile ? 420 : undefined }}
          />
        </div>
      </Card>

      {!filtered.length ? <Empty description="暂无匹配学员" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {[
            { key: 'oneOnOne', label: '一对一', color: '#534AB7', students: groupedStudents.oneOnOne },
            { key: 'smallGroup', label: '小组课', color: '#D4537E', students: groupedStudents.smallGroup },
            { key: 'group', label: '精品班课', color: '#E8784A', students: groupedStudents.group },
          ].filter((group) => group.students.length > 0).map((group) => (
            <div key={group.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 4, height: 18, borderRadius: 2, background: group.color }} />
                <span style={{ fontWeight: 700, fontSize: 15, color: '#1F2329' }}>{group.label}</span>
                <span style={{ fontSize: 12, color: '#98A2B3' }}>{group.students.length} 位学员</span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: isMobile ? 12 : 14,
                  minWidth: 0,
                }}
              >
                {group.students.map(renderStudentCard)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
