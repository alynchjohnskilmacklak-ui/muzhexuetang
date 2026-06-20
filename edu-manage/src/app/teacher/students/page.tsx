'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Avatar, Button, Card, Empty, Input, Segmented, Select, Skeleton, Tag, Typography } from 'antd'
import { FileTextOutlined, ProfileOutlined, SearchOutlined } from '@ant-design/icons'
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

function avatarColor(name: string) {
  const palette = ['#E8784A', '#534AB7', '#1D9E75', '#5B8FF9', '#f5a623', '#8892f0', '#FF6B6B']
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0
  return palette[Math.abs(h) % palette.length]
}

function getStatusChip(student: TeacherStudent) {
  const remain = Number(student.remainHours || 0)
  const days = Number(student.daysSinceLastFeedback || 999)
  if (remain <= 2) return { text: '课时不足', color: '#E24B4A' }
  if (days > 7) return { text: '未反馈', color: '#D4537E' }
  return { text: '已反馈', color: '#1D9E75' }
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
    const status = getStatusChip(student)
    const initial = (student.name || '?')[0]
    const gradeGender = [student.grade, student.gender].filter(Boolean).join(' · ')
    const remainColor = remain <= 2 ? '#E24B4A' : remain <= 15 ? '#f5a623' : '#1F2329'
    const subjects = [
      ...new Set(
        (student.enrollments || [])
          .flatMap((e) => (e.group?.teacherAssignments || []).map((a) => a?.subject).filter(Boolean) as string[]),
      ),
    ].slice(0, 3)

    return (
      <Card
        key={student.id}
        bordered={false}
        style={{
          width: '100%',
          borderRadius: 10,
          borderLeft: remain <= 2 ? '3px solid #E24B4A' : '3px solid transparent',
          cursor: 'pointer',
        }}
        styles={{ body: { padding: isMobile ? 12 : 14 } }}
        onClick={() => router.push(`/teacher/student/${student.id}`)}
      >
        {/* Row 1: Avatar + Name + Grade·Gender + Status Chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Avatar
            size={36}
            style={{ background: avatarColor(student.name || ''), flexShrink: 0, fontSize: 16, fontWeight: 600 }}
          >
            {initial}
          </Avatar>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong style={{ fontSize: 15 }}>{student.name}</Text>
            {gradeGender && (
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>
                {gradeGender}
              </Text>
            )}
          </div>
          <Tag
            color={status.color}
            style={{ margin: 0, flexShrink: 0, fontSize: 11, borderRadius: 6 }}
          >
            {status.text}
          </Tag>
        </div>

        {/* Row 2: Subject tags */}
        {subjects.length > 0 && (
          <div style={{ marginBottom: 6, marginLeft: 46, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {subjects.map((s, i) => (
              <Tag key={i} style={{ fontSize: 11, margin: 0, lineHeight: '18px' }}>{s}</Tag>
            ))}
          </div>
        )}

        {/* Row 3: Metrics in one line */}
        <div
          style={{
            fontSize: 12,
            color: '#5a4e3a',
            marginBottom: 10,
            marginLeft: 46,
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <span>
            出勤{' '}
            <b style={{ color: '#1D9E75' }}>{formatPercent(student.attendanceRate)}</b>
          </span>
          <span>
            剩余{' '}
            <b style={{ color: remainColor }}>{formatHours(remain)}</b>
          </span>
          <span>
            已用 <b>{total ? formatHourPair(used, total) : '0/0'}</b>
          </span>
        </div>

        {/* Row 4: Action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            type="primary"
            size="small"
            icon={<ProfileOutlined />}
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/teacher/student/${student.id}`)
            }}
            style={{ flex: 1, background: '#E8784A', borderColor: '#E8784A' }}
          >
            工作台
          </Button>
          <Button
            size="small"
            icon={<FileTextOutlined />}
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/teacher/students/${student.id}`)
            }}
            style={{ flex: 1 }}
          >
            档案
          </Button>
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

      {!filtered.length ? (
        <Empty description="暂无匹配学员" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {[
            { key: 'oneOnOne', label: '一对一', color: '#534AB7', students: groupedStudents.oneOnOne },
            { key: 'smallGroup', label: '小组课', color: '#D4537E', students: groupedStudents.smallGroup },
            { key: 'group', label: '精品班课', color: '#E8784A', students: groupedStudents.group },
          ]
            .filter((group) => group.students.length > 0)
            .map((group) => (
              <div key={group.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 4, height: 18, borderRadius: 2, background: group.color }} />
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#1F2329' }}>{group.label}</span>
                  <span style={{ fontSize: 12, color: '#98A2B3' }}>{group.students.length} 位学员</span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile
                      ? 'minmax(0, 1fr)'
                      : 'repeat(auto-fill, minmax(270px, 1fr))',
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
