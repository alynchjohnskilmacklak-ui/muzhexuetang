'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Button, Card, Empty, Input, Select, Space, Spin } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { toast } from 'sonner'
import { PageLayout } from '@/components/Layout/PageLayout'
import { MobileSelect } from '@/components/MobileSelect'
import { MOOD_META } from '@/lib/performance'
import { BadgeWall } from './_components/BadgeWall'
import { FeedItem } from './_components/FeedItem'
import { PostComposer } from './_components/PostComposer'

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('加载失败')
  return res.json()
})

export default function PerformancePage() {
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
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 440px) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
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
    </PageLayout>
  )
}
