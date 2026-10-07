'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Avatar, Button, Card, Input, Segmented, Tag, Typography } from 'antd'
import { FileTextOutlined, ProfileOutlined, SearchOutlined } from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'
import { formatPercent } from '@/lib/format'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'

const { Title, Text } = Typography
const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`加载失败（${response.status}）`)
  return response.json()
}

type TeacherStudent = {
  id: string
  name?: string
  grade?: string | null
  gender?: string | null
  school?: string | null
  membershipLevel?: string | null
  remainHours?: number | string | null
  totalHours?: number | string | null
  taughtHours?: number | string | null
  attendanceRate?: number | null
  daysSinceLastFeedback?: number | null
  primaryCourseType?: 'ONE_ON_ONE' | 'SMALL_GROUP' | 'GROUP' | 'STUDY_HALL' | string | null
  studyHallMemberships?: Array<{
    id: string
    purchasedDays?: number | null
    adjustedDays?: number
    studyClass: { id: string; name: string; scheduleType: 'WEEKDAY_LATE' | 'WEEKEND'; gradeScope?: string[] }
  }>
  enrollments?: Array<{
    id: string
    remainHours?: number | string | null
    totalHours?: number | string | null
    group?: {
      lessonMinutes?: number | null
      course?: { name?: string | null; type?: string | null } | null
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
  if (!student.enrollments?.length && student.studyHallMemberships?.length) return { text: '作业班', color: 'orange' }
  const days = student.daysSinceLastFeedback == null ? 999 : Number(student.daysSinceLastFeedback)
  if (days > 7) return { text: '未反馈', color: '#D4537E' }
  return { text: '已反馈', color: '#1D9E75' }
}

export default function TeacherStudentsPage() {
  const router = useRouter()
  const isMobile = useIsMobile() ?? false
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('全部')
  const { data: rawStudents, error, isLoading, mutate } = useSWR<TeacherStudent[]>('/api/teacher/students', fetcher)
  const students = useMemo(() => rawStudents ?? [], [rawStudents])

  const filters = ['全部', '未反馈', '初一', '初二', '初三']

  const filtered = useMemo(() => students.filter((student) => {
    const searchText = [
      student.name,
      student.grade,
      student.school,
      ...(student.enrollments?.map((enrollment) => enrollment.group?.course?.name || '') || []),
      ...(student.studyHallMemberships?.map((membership) => membership.studyClass.name) || []),
    ].join('')
    const matchSearch = !q.trim() || searchText.includes(q.trim())
    const matchFilter = filter === '全部'
      || (filter === '未反馈' && (student.daysSinceLastFeedback == null ? 999 : Number(student.daysSinceLastFeedback)) > 7)
      || student.grade === filter
    return matchSearch && matchFilter
  }), [students, q, filter])

  const groupedStudents = useMemo(() => {
    const oneOnOne = filtered.filter((student) => student.primaryCourseType === 'ONE_ON_ONE')
    const smallGroup = filtered.filter((student) => student.primaryCourseType === 'SMALL_GROUP')
    const group = filtered.filter((student) => student.primaryCourseType === 'GROUP' || !student.primaryCourseType)
    const studyHall = filtered.filter((student) => student.primaryCourseType === 'STUDY_HALL')
    return { oneOnOne, smallGroup, group, studyHall }
  }, [filtered])

  const renderStudentCard = (student: TeacherStudent, index: number) => {
    const taughtHours = Number(student.taughtHours || 0)
    const status = getStatusChip(student)
    const initial = (student.name || '?')[0]
    const gradeGender = [student.grade, student.gender].filter(Boolean).join(' · ')
    const subjects = [
      ...new Set(
        (student.enrollments || [])
          .flatMap((e) => (e.group?.teacherAssignments || []).map((a) => a?.subject).filter(Boolean) as string[]),
      ),
    ].slice(0, 3)
    const studyHallOnly = !student.enrollments?.length && Boolean(student.studyHallMemberships?.length)
    const studyHallLabels = (student.studyHallMemberships || []).map((membership) => membership.studyClass.name).slice(0, 2)

    return (
      <Card
        key={student.id}
        className="pressable stagger-item"
        bordered={false}
        style={{
          width: '100%',
          borderRadius: 10,
          border: '1px solid var(--color-hairline)',
          cursor: 'pointer',
          animationDelay: `${Math.min(index, 8) * 40}ms`,
        }}
        styles={{ body: { padding: isMobile ? 12 : 14 } }}
        onClick={() => router.push(studyHallOnly ? '/teacher/study-hall' : `/teacher/student/${student.id}`)}
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
            {student.membershipLevel && (
              <span style={{
                display: 'inline-block', fontSize: 10, fontWeight: 700, lineHeight: 1.4, padding: '1px 6px', borderRadius: 999, marginLeft: 6, letterSpacing: .3, verticalAlign: 2,
                color: student.membershipLevel === 'SVIP' ? '#123C35' : student.membershipLevel === 'VIP' ? '#123C35' : 'rgba(40,60,50,.7)',
                background: student.membershipLevel === 'SVIP' ? 'linear-gradient(135deg,#C9A45C,#A8873D)' : student.membershipLevel === 'VIP' ? 'linear-gradient(135deg,#F0875B,#E8784A)' : 'rgba(40,60,50,.10)',
                border: student.membershipLevel === 'SVIP' ? '1px solid rgba(255,255,255,.35)' : student.membershipLevel === 'VIP' ? '1px solid rgba(255,255,255,.35)' : '1px solid rgba(40,60,50,.16)',
              }}>{student.membershipLevel === 'SVIP' ? '★SVIP' : student.membershipLevel === 'VIP' ? '★VIP' : '普通'}</span>
            )}
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
        {studyHallLabels.length > 0 && (
          <div style={{ marginBottom: 6, marginLeft: 46, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {studyHallLabels.map((label) => <Tag color="orange" key={label} style={{ fontSize: 11, margin: 0, lineHeight: '18px' }}>{label}</Tag>)}
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
            已上{' '}
            <b style={{ color: '#E8784A' }}>{taughtHours.toFixed(1)} 小时</b>
          </span>
          <span>
            班级 <b>{(student.enrollments?.length || 0) + (student.studyHallMemberships?.length || 0)} 个</b>
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
              router.push(studyHallOnly ? '/teacher/study-hall' : `/teacher/student/${student.id}`)
            }}
            style={{ flex: 1, background: '#E8784A', borderColor: '#E8784A' }}
          >
            {studyHallOnly ? '作业班工作台' : '工作台'}
          </Button>
          {!studyHallOnly && <Button
            size="small"
            icon={<FileTextOutlined />}
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/teacher/students/${student.id}`)
            }}
            style={{ flex: 1 }}
          >
            档案
          </Button>}
        </div>
      </Card>
    )
  }

  if (isLoading) {
    return <CardSkeleton rows={3} />
  }

  if (error) {
    return (
      <BrandEmpty
        title="学员列表加载失败"
        hint={error instanceof Error ? error.message : '请检查网络后重新加载'}
        icon={<ProfileOutlined />}
        actionText="重新加载"
        onAction={() => void mutate()}
      />
    )
  }

  return (
    <div style={{ paddingBottom: isMobile ? 88 : 0, overflowX: 'clip' }}>
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
            查看自己授课范围内学员的累计已上课时和反馈状态
          </Text>
        </div>

        <div style={{ width: isMobile ? '100%' : undefined }}>
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
        className="teacher-student-filter-card"
        bordered={false}
        style={{ borderRadius: 10, marginBottom: 16, overflow: 'hidden' }}
        styles={{ body: { padding: isMobile ? 8 : 12 } }}
      >
        <div className="teacher-student-filter-chips">
          <Segmented
            value={filter}
            onChange={(value) => setFilter(String(value))}
            options={filters}
            block
            style={{ width: '100%', maxWidth: '100%' }}
          />
        </div>
      </Card>

      {!filtered.length ? (
        <BrandEmpty title="暂无匹配学员" icon={<ProfileOutlined />} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {[
            { key: 'oneOnOne', label: '一对一', color: '#534AB7', students: groupedStudents.oneOnOne },
            { key: 'smallGroup', label: '小组课', color: '#D4537E', students: groupedStudents.smallGroup },
            { key: 'group', label: '精品班课', color: '#E8784A', students: groupedStudents.group },
            { key: 'studyHall', label: '晚托与作业辅导', color: '#E8784A', students: groupedStudents.studyHall },
          ]
            .filter((group) => group.students.length > 0)
            .map((group) => (
              <div key={group.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: group.color }} />
                  <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-ink)' }}>{group.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--color-ink-subtle)' }}>{group.students.length} 位学员</span>
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
