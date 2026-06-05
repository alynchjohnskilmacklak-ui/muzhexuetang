'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Button, Card, Empty, Input, Select, Space, Spin, Tag } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { toast } from 'sonner'
import { PageLayout } from '@/components/Layout/PageLayout'
import { MobileSelect } from '@/components/MobileSelect'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MOOD_META } from '@/lib/performance'
import { BadgeWall } from './_components/BadgeWall'
import { FeedItem } from './_components/FeedItem'
import { PostComposer } from './_components/PostComposer'

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('加载失败')
  return res.json()
})

export default function PerformancePage() {
  const isMobile = useIsMobile() ?? false
  const today = new Date().toISOString().slice(0, 10)
  const [viewDate, setViewDate] = useState(today)
  const [activeTab, setActiveTab] = useState<'today' | 'compose'>('today')
  const [studentId, setStudentId] = useState('')
  const [mood, setMood] = useState('')
  const [q, setQ] = useState('')
  const { data: studentsData } = useSWR('/api/students?status=ACTIVE&limit=200', fetcher)
  const students = Array.isArray(studentsData?.students) ? studentsData.students : []

  const params = new URLSearchParams({ limit: '20' })
  if (studentId) params.set('studentId', studentId)
  if (mood) params.set('mood', mood)
  const { data, mutate, isLoading } = useSWR(`/api/performance?${params.toString()}`, fetcher)
  const { data: badgeData, mutate: mutateBadges } = useSWR(studentId ? `/api/performance/badges?studentId=${studentId}` : null, fetcher)

  const posts = useMemo(() => {
    const list = Array.isArray(data?.posts) ? data.posts : []
    if (!q.trim()) return list
    return list.filter((post: Record<string, unknown>) => {
      const student = post.student as Record<string, unknown> | undefined
      return `${post.content || ''} ${student?.name || ''}`.includes(q.trim())
    })
  }, [data, q])

  const earnedBadges = useMemo(() => (
    Array.isArray(badgeData?.badges)
      ? badgeData.badges.map((badge: Record<string, unknown>) => badge.badgeType).filter(Boolean) as string[]
      : []
  ), [badgeData])

  const refresh = async () => {
    await Promise.all([mutate(), mutateBadges()])
    toast.success('已刷新')
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/performance/${id}`, { method: 'DELETE' })
    if (!res.ok) return toast.error('删除失败')
    toast.success('已删除')
    await Promise.all([mutate(), mutateBadges()])
  }

  return (
    <PageLayout
      title="在校表现"
      subtitle="课堂观察、成长动态、徽章激励和家长沟通"
      actions={<Button icon={<ReloadOutlined />} onClick={refresh}>刷新</Button>}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('today')}
          style={{
            padding: '6px 18px',
            borderRadius: 20,
            cursor: 'pointer',
            fontWeight: activeTab === 'today' ? 700 : 400,
            background: activeTab === 'today' ? '#E8784A' : '#fff',
            color: activeTab === 'today' ? '#fff' : '#5a4e3a',
            border: `1px solid ${activeTab === 'today' ? '#E8784A' : '#EEE7E1'}`,
          }}
        >
          今日反馈情况
        </button>
        <button
          onClick={() => setActiveTab('compose')}
          style={{
            padding: '6px 18px',
            borderRadius: 20,
            cursor: 'pointer',
            fontWeight: activeTab === 'compose' ? 700 : 400,
            background: activeTab === 'compose' ? '#E8784A' : '#fff',
            color: activeTab === 'compose' ? '#fff' : '#5a4e3a',
            border: `1px solid ${activeTab === 'compose' ? '#E8784A' : '#EEE7E1'}`,
          }}
        >
          发布表现反馈
        </button>
      </div>

      {activeTab === 'today' && <TodayFeedbackView date={viewDate} onDateChange={setViewDate} />}

      {activeTab === 'compose' && (
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(360px, 440px) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <PostComposer onPublished={(publishedStudentId) => {
            if (publishedStudentId) setStudentId(publishedStudentId)
            mutate()
            mutateBadges()
          }} />
          <Card
            title={studentId ? '该学员已获徽章' : '该学员已获徽章'}
            extra={!studentId ? <span style={{ color: '#98A2B3', fontSize: 12 }}>先选择学员</span> : null}
            bordered={false}
            style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}
          >
            <BadgeWall earned={studentId ? earnedBadges : []} />
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
            <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space wrap>
                <MobileSelect
                  allowClear
                  placeholder="按学员筛选"
                  value={studentId || undefined}
                  onChange={(value) => setStudentId(value || '')}
                  options={students.map((student: Record<string, unknown>) => ({
                    label: `${student.name}${student.grade ? ` / ${student.grade}` : ''}`,
                    value: student.id as string,
                  }))}
                  style={{ width: 220 }}
                />
                <Select
                  allowClear
                  placeholder="按情绪筛选"
                  value={mood || undefined}
                  onChange={(value) => setMood(value || '')}
                  options={Object.entries(MOOD_META).map(([value, item]) => ({ value, label: `${item.icon} ${item.label}` }))}
                  style={{ width: 160 }}
                />
              </Space>
              <Input.Search placeholder="搜索内容或学员" value={q} onChange={(event) => setQ(event.target.value)} style={{ width: 220 }} />
            </Space>
          </Card>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
          ) : posts.length === 0 ? (
            <Card bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
              <Empty description="暂无表现动态" />
            </Card>
          ) : (
            posts.map((post: never) => <FeedItem key={(post as { id: string }).id} post={post} onDelete={handleDelete} />)
          )}
        </div>
      </div>
      )}
    </PageLayout>
  )
}

function TodayFeedbackView({ date, onDateChange }: { date: string; onDateChange: (value: string) => void }) {
  const { data, isLoading } = useSWR(`/api/admin/classroom-feedback?date=${date}&limit=200`, fetcher)
  const feedbacks: Array<{
    id: string
    teacherName: string
    lessonName?: string
    courseName?: string
    status: string
    students?: Array<{ id: string; name: string }>
    knowledgePoints?: string[]
    summary?: string | null
  }> = Array.isArray(data?.feedbacks) ? data.feedbacks : []
  const noFeedback: Array<{ id: string; name: string }> = Array.isArray(data?.teachersWithoutFeedback) ? data.teachersWithoutFeedback : []

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <Input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} style={{ width: 160 }} />
        <span style={{ fontSize: 12, color: '#98A2B3' }}>共 {feedbacks.length} 条课堂反馈</span>
      </div>
      {noFeedback.length > 0 && (
        <div style={{ background: '#FFFBF5', border: '1px solid #FED7AA', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: '#D97706', fontWeight: 600 }}>今日尚未反馈的老师：</span>
          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {noFeedback.map((teacher) => <Tag key={teacher.id} color="orange">{teacher.name}</Tag>)}
          </div>
        </div>
      )}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : feedbacks.length === 0 ? (
        <Card bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
          <Empty description={`${date} 暂无课堂反馈`} />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {feedbacks.map((item) => {
            const students = Array.isArray(item.students) ? item.students : []
            return (
              <Card key={item.id} bordered={false} style={{ borderRadius: 10, border: '1px solid #EEE7E1' }} bodyStyle={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: '#1F2329' }}>{item.teacherName} · {item.courseName || item.lessonName || '-'}</span>
                  <Tag color={item.status === 'PUBLISHED' ? 'green' : 'orange'}>{item.status === 'PUBLISHED' ? '已发布' : '草稿'}</Tag>
                </div>
                <div style={{ fontSize: 12, color: '#98A2B3', marginBottom: 6 }}>
                  学员：{students.map((student) => student.name).join('、') || '-'} · 知识点：{item.knowledgePoints?.join('、') || '无'}
                </div>
                {item.summary && <p style={{ fontSize: 13, color: '#5a4e3a', margin: 0, lineHeight: 1.6 }}>{item.summary}</p>}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
