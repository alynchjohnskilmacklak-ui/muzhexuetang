'use client'

import { Suspense, useMemo, useState } from 'react'
import useSWR from 'swr'
import { useSearchParams } from 'next/navigation'
import { Avatar, Button, Card, Input, List, message, Rate, Space, Tag, Typography } from 'antd'
import { MessageOutlined, SendOutlined, StarFilled, UserOutlined } from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input
const fetcher = (url: string) => fetch(url).then(res => res.json())

const MOODS = [
  { value: 'GREAT', label: '非常棒', color: '#1D9E75' },
  { value: 'GOOD', label: '不错', color: '#6B5BD6' },
  { value: 'OKAY', label: '一般', color: '#f5a623' },
  { value: 'NEEDS_ATTENTION', label: '需关注', color: '#D4537E' },
]
const QUICK_TAGS = ['积极发言', '专注听讲', '作业优秀', '进步明显', '思维活跃', '独立解题', '需加强练习', '上课走神', '状态很好', '回答精彩']
const RATING_KEYS = [
  { key: 'focus', label: '课堂专注' },
  { key: 'mastery', label: '知识掌握' },
  { key: 'interaction', label: '课堂互动' },
  { key: 'homework', label: '作业情况' },
]
const BADGES = ['今日之星', '进步飞速', '思维达人', '作业之王', '坚持不懈', '精准破题', '满分出击', '✨闪光时刻']
const STUDENT_COLORS = ['#E8784A','#1D9E75','#534AB7','#D4537E','#BA7517','#185FA5','#27500A','#72243E']
function getStudentColor(id: string) { return STUDENT_COLORS[(id || '').split('').reduce((a,c) => a + c.charCodeAt(0), 0) % STUDENT_COLORS.length] }

function TeacherPerformancePageInner() {
  const searchParams = useSearchParams()
  const preselectStudentId = searchParams.get('studentId') || ''
  const isMobile = useIsMobile()
  const [selectedStudents, setSelectedStudents] = useState<string[]>(
    preselectStudentId ? [preselectStudentId] : []
  )
  const [mood, setMood] = useState('GOOD')
  const [tags, setTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState('')
  const [ratings, setRatings] = useState<Record<string, number>>({ focus: 4, mastery: 4, interaction: 4, homework: 4 })
  const [badge, setBadge] = useState('')
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [replyLoading, setReplyLoading] = useState(false)
  const [replyingId, setReplyingId] = useState('')
  const [replyText, setReplyText] = useState('')
  const [extras, setExtras] = useState<Record<string, boolean>>({})

  const { data: students = [] } = useSWR('/api/teacher/students', fetcher)
  const { data: dashboard } = useSWR('/api/teacher/dashboard', fetcher)
  const teacherId = dashboard?.teacher?.id
  const { data, mutate } = useSWR(teacherId ? `/api/performance?teacherId=${teacherId}&limit=10` : null, fetcher)
  const posts = data?.posts || []

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }
  const selectAll = () => setSelectedStudents(students.map((s: any) => s.id))
  const clearAll = () => setSelectedStudents([])
  const toggleExtra = (key: string) => setExtras(prev => ({ ...prev, [key]: !prev[key] }))

  const toggleTag = (tag: string) => {
    setTags(current => current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag])
  }
  const addCustomTag = () => {
    const tag = customTag.trim()
    if (!tag) return
    if (!tags.includes(tag)) setTags(current => [...current, tag])
    setCustomTag('')
  }

  const publish = async () => {
    if (!selectedStudents.length || !content.trim()) {
      message.warning('请选择学员并填写评语', 4)
      return
    }
    setPosting(true)
    try {
      const res = await fetch('/api/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: selectedStudents,
          mood, tags, ratings,
          badges: badge ? [badge] : [],
          content,
          type: 'DAILY',
          visibility: 'PARENT_ONLY',
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) { message.error(payload.error || '发布失败，请重试', 4); return }
      message.success(`✅ 已推送给 ${selectedStudents.length} 位家长`, 4)
      setContent(''); setTags([]); setBadge(''); setSelectedStudents([])
      mutate()
    } finally {
      setPosting(false)
    }
  }

  const submitReply = async (postId: string) => {
    if (!replyText.trim()) return
    setReplyLoading(true)
    try {
      const res = await fetch(`/api/performance/${postId}/comment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyText }),
      })
      if (!res.ok) { message.error('回复失败，请重试', 3); return }
      message.success('✅ 已回复家长', 3)
      setReplyText(''); setReplyingId('')
      mutate()
    } finally {
      setReplyLoading(false)
    }
  }

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>表现反馈</Title>
      <div style={{
        display: 'grid',
        gridTemplateColumns: (isMobile ?? false) ? '1fr' : 'minmax(420px, 480px) minmax(0, 1fr)',
        gap: 16,
        alignItems: 'start',
      }}>
        <Card title="发布在校表现" bordered={false} style={{ borderRadius: 10 }}>
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            {/* Multi-student chip selection */}
            <div style={{ border: '0.5px solid var(--color-border-secondary, #EEE7E1)', borderRadius: 9, padding: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 7 }}>
                <span>选择学员（可多选）</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={selectAll} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#E8784A', fontSize: 10 }}>全选</button>
                  <button onClick={clearAll} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#98A2B3', fontSize: 10 }}>清空</button>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {students.map((s: any) => {
                  const selected = selectedStudents.includes(s.id)
                  const color = getStudentColor(s.id)
                  return (
                    <div key={s.id} onClick={() => toggleStudent(s.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 10,
                      border: selected ? '0.5px solid #E8784A' : '0.5px solid var(--color-border-secondary, #EEE7E1)',
                      background: selected ? '#FAEEDA' : 'var(--color-background-secondary, #faf8f5)',
                      cursor: 'pointer', fontSize: 11,
                      color: selected ? '#854F0B' : 'var(--color-text-secondary, #666)',
                    }}>
                      <div style={{ width: 20, height: 20, borderRadius: 5, background: color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 500, color: '#fff' }}>
                        {s.name?.[0]}
                      </div>
                      {s.name}
                    </div>
                  )
                })}
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-text-tertiary, #98A2B3)', marginTop: 6 }}>
                已选 {selectedStudents.length} 人 · 发布后将分别推送给各自家长
              </div>
            </div>

            {/* Mood */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {MOODS.map(item => (
                <button key={item.value} onClick={() => setMood(item.value)} style={{
                  border: `1px solid ${mood === item.value ? item.color : '#e5d9ce'}`,
                  background: mood === item.value ? `${item.color}18` : '#fff', color: item.color,
                  borderRadius: 8, padding: '10px 4px', cursor: 'pointer',
                }}>{item.label}</button>
              ))}
            </div>

            {/* Tags */}
            <div>
              <Text type="secondary">快捷标签</Text>
              <Space wrap style={{ marginTop: 8 }}>
                {QUICK_TAGS.map(tag => <Tag.CheckableTag key={tag} checked={tags.includes(tag)} onChange={() => toggleTag(tag)}>{tag}</Tag.CheckableTag>)}
              </Space>
              <Space.Compact style={{ width: '100%', marginTop: 8 }}>
                <Input placeholder="自定义标签" value={customTag} onChange={e => setCustomTag(e.target.value)} onPressEnter={addCustomTag} />
                <Button onClick={addCustomTag}>添加</Button>
              </Space.Compact>
            </div>

            {/* Ratings */}
            <div>
              <Text type="secondary">分维度评分</Text>
              <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
                {RATING_KEYS.map(item => (
                  <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text>{item.label}</Text>
                    <Rate
                      value={ratings[item.key]}
                      onChange={v => setRatings(c => ({ ...c, [item.key]: v }))}
                      style={{ color: '#f5a623', fontSize: (isMobile ?? false) ? 20 : 24 }}
                    />
                  </div>
                ))}
              </Space>
            </div>

            {/* Badges */}
            <div>
              <Text type="secondary">徽章颁发</Text>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 8 }}>
                {BADGES.map(item => (
                  <Button key={item} type={badge === item ? 'primary' : 'default'} icon={<StarFilled />}
                    onClick={() => setBadge(badge === item ? '' : item)}
                    style={badge === item ? { background: '#E8784A' } : undefined}>{item}</Button>
                ))}
              </div>
            </div>

            {/* Extra features */}
            <div style={{ background: 'var(--color-background-secondary, #faf8f5)', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary, #98A2B3)', marginBottom: 6 }}>更多功能</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { icon: '📷', label: '上传课堂照片', key: 'photo' },
                  { icon: '📋', label: '布置课后作业', key: 'homework' },
                  { icon: '📅', label: '预告下次内容', key: 'preview' },
                  { icon: '📞', label: '家长沟通记录', key: 'call' },
                ].map(({ icon, label, key }) => (
                  <button key={key} onClick={() => toggleExtra(key)} style={{
                    fontSize: 10, padding: '4px 9px', borderRadius: 7,
                    border: extras[key] ? '0.5px solid rgba(232,120,74,.4)' : '0.5px solid var(--color-border-secondary, #EEE7E1)',
                    background: extras[key] ? '#FAEEDA' : 'var(--color-background-primary, #fff)',
                    color: extras[key] ? '#854F0B' : 'var(--color-text-secondary, #666)',
                    cursor: 'pointer',
                  }}>{icon} {label}</button>
                ))}
              </div>
            </div>

            <TextArea value={content} onChange={e => setContent(e.target.value)} maxLength={300} showCount rows={5}
              placeholder="具体描述今天的亮点，家长最想看到具体细节..." />
            <Button type="primary" icon={<SendOutlined />} loading={posting} disabled={posting || selectedStudents.length === 0} onClick={publish}
              style={{ background: '#E8784A', borderColor: '#E8784A' }} block>
              {posting ? '发布中...' : `发布反馈 · 推送给 ${selectedStudents.length} 位家长`}
            </Button>
          </Space>
        </Card>

        {/* Published posts */}
        <Card title="已发布动态" bordered={false} style={{ borderRadius: 10 }}>
          <List dataSource={posts} locale={{ emptyText: '暂无表现动态' }}
            renderItem={(post: any) => {
              const moodMeta = MOODS.find(m => m.value === post.mood) || MOODS[1]
              const badgeTypes = post.badges?.map((b: any) => b.badgeType) || []
              return (
                <List.Item style={{ display: 'block', borderBottom: '1px solid #f0e7de' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <Space>
                      <Avatar icon={<UserOutlined />} />
                      <div>
                        <Text strong>{post.student?.name}</Text>
                        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>{new Date(post.createdAt).toLocaleString('zh-CN')}</Text>
                      </div>
                    </Space>
                    <Tag color={moodMeta.color}>{moodMeta.label}</Tag>
                  </div>
                  <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: '展开' }} style={{ marginTop: 10 }}>{post.content}</Paragraph>
                  <Space wrap>
                    {post.tags?.map((tag: string) => <Tag key={tag}>{tag}</Tag>)}
                    {badgeTypes.map((b: string) => <Tag key={b} color="gold">{b}</Tag>)}
                  </Space>
                  {post.ratings && (
                    <Space wrap size={14} style={{ marginTop: 10 }}>
                      {RATING_KEYS.map(item => <Text key={item.key} type="secondary" style={{ fontSize: 12 }}>{item.label} <Rate disabled value={Number(post.ratings[item.key] || 0)} style={{ fontSize: 12, color: '#f5a623' }} /></Text>)}
                    </Space>
                  )}
                  <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary">{post.reactions?.length || 0} 点赞 · {post.comments?.length || 0} 留言</Text>
                    <Button size="small" icon={<MessageOutlined />} onClick={() => setReplyingId(replyingId === post.id ? '' : post.id)}>回复留言</Button>
                  </div>
                  {post.comments?.length > 0 && (
                    <div style={{ marginTop: 8, background: '#faf8f5', borderRadius: 8, padding: 10 }}>
                      {post.comments.map((c: any) => <div key={c.id} style={{ fontSize: 13, marginBottom: 4 }}><Text strong>{c.author?.name}: </Text>{c.content}</div>)}
                    </div>
                  )}
                  {replyingId === post.id && (
                    <Space.Compact style={{ width: '100%', marginTop: 8 }}>
                      <Input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="回复家长留言" />
                      <Button type="primary" loading={replyLoading} onClick={() => submitReply(post.id)}>发送</Button>
                    </Space.Compact>
                  )}
                </List.Item>
              )
            }}
          />
        </Card>
      </div>
    </div>
  )
}

export default function TeacherPerformancePage() {
  return (
    <Suspense fallback={null}>
      <TeacherPerformancePageInner />
    </Suspense>
  )
}
