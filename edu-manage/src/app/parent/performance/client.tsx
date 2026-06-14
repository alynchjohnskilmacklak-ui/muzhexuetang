'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Avatar, Button, Card, Empty, Image as AntImage, Input, Rate, Space, Tag } from 'antd'
import { HeartFilled, HeartOutlined, MessageOutlined, StarOutlined, UserOutlined } from '@ant-design/icons'
import { toast } from 'sonner'
import { MOOD_META, PERFORMANCE_BADGES, RATING_LABELS } from '@/lib/mood-meta'
import { normalizeUploadUrl } from '@/lib/upload-url'
import { formatHours } from '@/lib/format'
import { ChildSwitcher } from '@/components/Parent/ChildSwitcher'

type ParentPost = {
  id: string
  mood: keyof typeof MOOD_META
  type: string
  content: string
  images: string[]
  tags: string[]
  ratings?: Record<string, number> | null
  createdAt: string
  teacher?: { name: string; avatar?: string | null }
  reactions: Array<{ userId: string; type: string }>
  comments: Array<{ id: string; content: string; author?: { name: string; role: string }; createdAt: string }>
  badges: Array<{ badgeType: string }>
}

type Student = {
  id: string
  name: string
  grade?: string | null
  remainHours: number
  mainTeacher?: { name: string } | null
  achievementBadges?: Array<{ badgeType: string; earnedAt: string; description?: string | null; teacher?: { name: string } }>
} | null

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('加载失败')
  return res.json()
})

function averageRating(posts: ParentPost[]) {
  const values = posts.flatMap((post) => post.ratings ? Object.values(post.ratings).map(Number) : [])
  if (!values.length) return 0
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
}

function MoodCalendar({ posts }: { posts: ParentPost[] }) {
  const days = Array.from({ length: 35 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - 34 + index)
    const key = date.toISOString().slice(0, 10)
    const post = posts.find((item) => new Date(item.createdAt).toISOString().slice(0, 10) === key)
    const mood = post ? MOOD_META[post.mood] : null
    return { key, day: date.getDate(), mood }
  })
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
      {days.map((day) => (
        <div key={day.key} style={{
          height: 34,
          borderRadius: 6,
          display: 'grid',
          placeItems: 'center',
          background: day.mood ? `${day.mood.color}33` : '#141516',
          color: day.mood ? day.mood.color : '#98A2B3',
          border: `1px solid ${day.mood ? `${day.mood.color}55` : '#23252a'}`,
          fontSize: 12,
        }}>
          {day.day}
        </div>
      ))}
    </div>
  )
}

function BadgeWall({ badges }: { badges: NonNullable<Student>['achievementBadges'] }) {
  const earned = new Set((badges || []).map((badge) => badge.badgeType))
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
      {PERFORMANCE_BADGES.map((badge) => {
        const active = earned.has(badge.type)
        return (
          <div key={badge.type} style={{
            padding: 12,
            borderRadius: 8,
            border: `1px solid ${active ? '#f5a62366' : '#23252a'}`,
            background: active ? 'rgba(245,166,35,0.12)' : '#0f1011',
            opacity: active ? 1 : 0.35,
            color: active ? '#f5a623' : '#98A2B3',
          }}>
            <div style={{ fontSize: 22 }}>{badge.icon}</div>
            <div style={{ fontWeight: 700 }}>{badge.label}</div>
          </div>
        )
      })}
    </div>
  )
}

function FeedCard({ post, mutate }: { post: ParentPost; mutate: () => void }) {
  const [replyOpen, setReplyOpen] = useState(false)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const mood = MOOD_META[post.mood] || MOOD_META.GOOD
  const hearted = post.reactions.some((reaction) => reaction.type === 'HEART')

  const react = async () => {
    const res = await fetch(`/api/performance/${post.id}/react`, {
      method: hearted ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: hearted ? undefined : JSON.stringify({ type: 'HEART' }),
    })
    if (!res.ok) return toast.error('操作失败')
    mutate()
  }

  const submitComment = async () => {
    if (!content.trim()) return toast.error('请输入留言')
    setSending(true)
    const res = await fetch(`/api/performance/${post.id}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    setSending(false)
    if (!res.ok) return toast.error('发送失败')
    toast.success('已发送给老师')
    setContent('')
    setReplyOpen(false)
    mutate()
  }

  return (
    <Card bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '3px 1fr', gap: 14 }}>
        <div style={{ background: mood.color, borderRadius: 999 }} />
        <div>
          <Space align="center" style={{ marginBottom: 12 }}>
            <Avatar src={normalizeUploadUrl(post.teacher?.avatar) || undefined} icon={<UserOutlined />} style={{ background: '#E8784A' }} />
            <div>
              <div style={{ color: '#1F2329', fontWeight: 700 }}>{post.teacher?.name || '老师'}</div>
              <div style={{ color: '#98A2B3', fontSize: 12 }}>{new Date(post.createdAt).toLocaleString('zh-CN')}</div>
            </div>
            <Tag color={mood.color}>{mood.icon} {mood.label}</Tag>
          </Space>
          <div style={{ color: '#1F2329', lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: 12 }}>{post.content}</div>
          {!!post.tags.length && <Space wrap style={{ marginBottom: 12 }}>{post.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</Space>}
          {!!post.badges.length && <Space wrap style={{ marginBottom: 12 }}>{post.badges.map((item) => {
            const badge = PERFORMANCE_BADGES.find((b) => b.type === item.badgeType)
            return <Tag color="gold" key={item.badgeType}>{badge?.icon} {badge?.label || item.badgeType}</Tag>
          })}</Space>}
          {!!post.images.length && (
            <AntImage.PreviewGroup>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 88px)', gap: 8, marginBottom: 12 }}>
                {post.images.map((src) => <AntImage key={src} src={normalizeUploadUrl(src)} alt="课堂照片" width={88} height={88} style={{ objectFit: 'cover', borderRadius: 8 }} />)}
              </div>
            </AntImage.PreviewGroup>
          )}
          {post.ratings && <Space wrap size={14} style={{ marginBottom: 12 }}>
            {(Object.keys(RATING_LABELS) as Array<keyof typeof RATING_LABELS>).map((key) => (
              <span key={key} style={{ color: '#98A2B3', fontSize: 12 }}>{RATING_LABELS[key]} <Rate disabled value={Number(post.ratings?.[key] || 0)} style={{ color: '#f5a623', fontSize: 13 }} /></span>
            ))}
          </Space>}
          <Space>
            <Button icon={hearted ? <HeartFilled /> : <HeartOutlined />} onClick={react}>{hearted ? '已喜欢' : '太棒了'}</Button>
            <Button icon={<MessageOutlined />} onClick={() => setReplyOpen((open) => !open)}>回复</Button>
          </Space>
          {replyOpen && <Space.Compact style={{ width: '100%', marginTop: 12 }}>
            <Input.TextArea value={content} onChange={(event) => setContent(event.target.value)} maxLength={200} showCount autoSize={{ minRows: 2, maxRows: 4 }} />
            <Button type="primary" loading={sending} onClick={submitComment}>发送</Button>
          </Space.Compact>}
          {!!post.comments.length && <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {post.comments.slice(0, 3).map((comment) => <div key={comment.id} style={{ padding: 10, borderRadius: 8, background: '#FCFBF9', color: '#5a4e3a' }}>{comment.author?.name || '家长'}：{comment.content}</div>)}
          </div>}
        </div>
      </div>
    </Card>
  )
}

export default function PerformanceClient({ student, initialPosts }: { student: Student; initialPosts: ParentPost[] }) {
  const [visibleLimit, setVisibleLimit] = useState(10)
  const { data, mutate, isLoading } = useSWR(student ? `/api/performance?studentId=${student.id}&limit=${visibleLimit}` : null, fetcher, {
    fallbackData: { posts: initialPosts },
    refreshInterval: 300_000,
  })
  const posts: ParentPost[] = Array.isArray(data?.posts) ? data.posts : []
  const totalPosts = Number(data?.total || posts.length)
  const avg = averageRating(posts)

  if (!student) {
    return <Empty description="暂未绑定学员" />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ChildSwitcher />
      <Card bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
        <Space align="center" size={16}>
          <Avatar size={56} icon={<UserOutlined />} style={{ background: '#E8784A' }} />
          <div>
            <div style={{ color: '#1F2329', fontSize: 20, fontWeight: 700 }}>{student.name}</div>
            <div style={{ color: '#98A2B3' }}>{student.grade || '未设年级'} · {student.mainTeacher?.name || '未分配老师'}</div>
          </div>
        </Space>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 18 }}>
          {[['动态', posts.length], ['平均评分', avg || '-'], ['已获徽章', student.achievementBadges?.length || 0], ['剩余课时', formatHours(student.remainHours)]].map(([label, value]) => (
            <div key={label} style={{ background: '#FCFBF9', borderRadius: 8, padding: 12 }}>
              <div style={{ color: '#98A2B3', fontSize: 12 }}>{label}</div>
              <div style={{ color: '#1F2329', fontSize: 22, fontWeight: 700 }}>{value}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="情绪日历" bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
        <MoodCalendar posts={posts} />
      </Card>

      <Card title="成长动态" bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.length ? posts.map((post) => <FeedCard key={post.id} post={post} mutate={() => mutate()} />) : <Empty description="暂无成长动态" />}
          {posts.length < totalPosts && (
            <Button loading={isLoading} onClick={() => setVisibleLimit((value) => value + 10)}>
              加载更多
            </Button>
          )}
        </div>
      </Card>

      <Card title="成就徽章墙" bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
        <BadgeWall badges={student.achievementBadges || []} />
      </Card>
    </div>
  )
}
