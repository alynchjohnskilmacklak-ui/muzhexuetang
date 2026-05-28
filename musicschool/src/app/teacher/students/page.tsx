'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Avatar, Badge, Button, Card, Empty, Input, Progress, Segmented, Select, Space, Tag, Typography } from 'antd'
import { FileTextOutlined, MessageOutlined, SearchOutlined, UserOutlined, WarningFilled } from '@ant-design/icons'
import { formatHourPair, formatHours, formatPercent } from '@/lib/format'

const { Title, Text } = Typography
const fetcher = (url: string) => fetch(url).then((res) => res.json())

function feedbackLabel(days: number) {
  if (days === 0) return { text: '最后反馈：今天', color: '#1D9E75' }
  if (days <= 3) return { text: `最后反馈：${days}天前`, color: '#8d806f' }
  if (days > 7) return { text: `⚠️ ${days === 999 ? '从未' : `${days}天未`}发布反馈`, color: '#D4537E' }
  return { text: `最后反馈：${days}天前`, color: '#8d806f' }
}

export default function TeacherStudentsPage() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('全部')
  const [gradeFilter, setGradeFilter] = useState('')
  const { data: students = [] } = useSWR('/api/teacher/students', fetcher)

  const grades = useMemo(() => Array.from(new Set(students.map((student: any) => student.grade).filter(Boolean))), [students])
  const filters = ['全部', '课时不足', '未反馈', ...grades]

  const filtered = useMemo(() => students.filter((student: any) => {
    const searchText = `${student.name || ''}${student.grade || ''}${student.school || ''}${student.enrollments?.map((enrollment: any) => enrollment.group?.course?.name).join('') || ''}`
    const matchSearch = !q.trim() || searchText.includes(q.trim())
    const matchFilter = filter === '全部'
      || (filter === '课时不足' && Number(student.remainHours || 0) <= 2)
      || (filter === '未反馈' && Number(student.daysSinceLastFeedback || 999) > 7)
      || student.grade === filter
    const matchGrade = !gradeFilter || student.grade === gradeFilter
    return matchSearch && matchFilter && matchGrade
  }), [students, q, filter, gradeFilter])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>我的学员</Title>
          <Text type="secondary">按课时、反馈状态和年级快速筛选</Text>
        </div>
        <Space wrap>
          <Select
            placeholder="年级筛选"
            allowClear
            value={gradeFilter || undefined}
            onChange={(value) => setGradeFilter(value || '')}
            options={grades.map((grade) => ({ label: String(grade), value: String(grade) }))}
            style={{ width: 132 }}
          />
          <Input prefix={<SearchOutlined />} placeholder="搜索学员、年级、学校或课程" value={q} onChange={(event) => setQ(event.target.value)} allowClear style={{ width: 320 }} />
        </Space>
      </div>

      <Card bordered={false} style={{ borderRadius: 10, marginBottom: 16 }} styles={{ body: { padding: 12 } }}>
        <Segmented value={filter} onChange={(value) => setFilter(String(value))} options={filters} />
      </Card>

      {!filtered.length ? <Empty description="暂无匹配学员" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filtered.map((student: any) => {
            const remain = Number(student.remainHours || 0)
            const total = Number(student.totalHours || 0)
            const used = Math.max(0, total - remain)
            const usedRate = total ? Math.round((used / total) * 100) : 0
            const feedback = feedbackLabel(Number(student.daysSinceLastFeedback || 999))
            const numberStyle = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const
            return (
              <Card key={student.id} bordered={false} style={{ borderRadius: 10, borderLeft: remain <= 2 ? '4px solid #D4537E' : '4px solid transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <Space>
                    <Avatar icon={<UserOutlined />} style={{ background: '#E8784A' }} />
                    <div>
                      <Text strong>{student.name}</Text>
                      <div style={{ fontSize: 12, color: '#8d806f' }}>{student.grade || '-'} / {student.gender || '-'} / {student.school || '-'}</div>
                    </div>
                  </Space>
                  {remain <= 2 && <Badge dot color="#D4537E"><WarningFilled style={{ color: '#D4537E' }} /></Badge>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div style={{ background: '#faf8f5', borderRadius: 8, padding: 10 }}>
                    <Text type="secondary">剩余课时</Text>
                    <div style={{ color: remain <= 2 ? '#D4537E' : remain <= 15 ? '#f5a623' : '#1F2329', fontSize: 22, fontWeight: 700, ...numberStyle }}>{formatHours(remain)}</div>
                  </div>
                  <div style={{ background: '#faf8f5', borderRadius: 8, padding: 10 }}>
                    <Text type="secondary">出勤率</Text>
                    <div style={{ color: '#1D9E75', fontSize: 22, fontWeight: 700, ...numberStyle }}>{formatPercent(student.attendanceRate)}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text type="secondary">已用/总课时</Text>
                  <Text style={numberStyle}>{total ? formatHourPair(used, total) : '0/0'}</Text>
                </div>
                <Progress percent={usedRate} showInfo={false} strokeColor={usedRate <= 30 ? '#1D9E75' : usedRate <= 70 ? '#f5a623' : '#D4537E'} />
                <div style={{ color: feedback.color, fontSize: 12, marginTop: 10 }}>{feedback.text}</div>

                <Space wrap style={{ marginTop: 10 }}>
                  {student.enrollments?.slice(0, 3).map((enrollment: any) => <Tag key={enrollment.id}>{enrollment.group?.teacherAssignments?.[0]?.subject || enrollment.group?.course?.name || '课程'}</Tag>)}
                </Space>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
                  <Button icon={<FileTextOutlined />} onClick={() => router.push(`/teacher/classroom-feedback?studentId=${student.id}`)}>上传</Button>
                  <Button icon={<MessageOutlined />} onClick={() => router.push(`/teacher/performance?studentId=${student.id}`)}>反馈</Button>
                  <Button onClick={() => router.push(`/teacher/students/${student.id}`)}>档案</Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
