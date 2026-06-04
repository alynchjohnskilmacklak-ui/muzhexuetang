'use client'

import Image from 'next/image'
import { Avatar, Button, Card, Image as AntImage, Popconfirm, Rate, Space, Tag } from 'antd'
import { DeleteOutlined, UserOutlined } from '@ant-design/icons'
import { MOOD_META, PERFORMANCE_BADGES, RATING_LABELS } from '@/lib/performance'
import { normalizeUploadUrl } from '@/lib/upload-url'

type FeedPost = {
  id: string
  mood: keyof typeof MOOD_META
  type: string
  content: string
  images: string[]
  tags: string[]
  ratings?: Record<string, number> | null
  createdAt: string
  student?: { name: string; grade?: string | null }
  teacher?: { name: string; avatar?: string | null }
  comments?: Array<{ content: string; author?: { name: string } }>
  badges?: Array<{ badgeType: string }>
}

function timeLabel(value: string) {
  return new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function FeedItem({ post, onDelete }: { post: FeedPost; onDelete?: (id: string) => void }) {
  const mood = MOOD_META[post.mood] || MOOD_META.GOOD
  const latestComment = post.comments?.[0]
  const badgeTypes = post.badges?.map((badge) => badge.badgeType) || []

  return (
    <Card bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '3px 1fr', gap: 14 }}>
        <div style={{ background: mood.color, borderRadius: 999 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <Space align="center">
              <Avatar src={normalizeUploadUrl(post.teacher?.avatar) || undefined} icon={<UserOutlined />} style={{ background: '#E8784A' }} />
              <div>
                <div style={{ color: '#1F2329', fontWeight: 700 }}>{post.teacher?.name || '老师'}</div>
                <div style={{ color: '#98A2B3', fontSize: 12 }}>
                  {post.student?.name || '-'} {post.student?.grade ? `· ${post.student.grade}` : ''} · {timeLabel(post.createdAt)}
                </div>
              </div>
            </Space>
            <Space>
              <Tag color={mood.color}><span style={{ marginRight: 4 }}>{mood.icon}</span>{mood.label}</Tag>
              {onDelete && (
                <Popconfirm title="确认删除这条动态？" okText="删除" cancelText="取消" onConfirm={() => onDelete(post.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              )}
            </Space>
          </div>

          <div style={{ color: '#1F2329', lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: 12 }}>{post.content}</div>

          {!!post.tags.length && (
            <Space wrap style={{ marginBottom: 12 }}>
              {post.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
            </Space>
          )}

          {!!badgeTypes.length && (
            <Space wrap style={{ marginBottom: 12 }}>
              {badgeTypes.map((type) => {
                const badge = PERFORMANCE_BADGES.find((item) => item.type === type)
                return <Tag key={type} color="gold">{badge?.icon || '🏅'} {badge?.label || type}</Tag>
              })}
            </Space>
          )}

          {!!post.images.length && (
            <AntImage.PreviewGroup>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 88px)', gap: 8, marginBottom: 12 }}>
                {post.images.map((src) => {
                  const imageUrl = normalizeUploadUrl(src)
                  return (
                    <AntImage
                      key={src}
                      src={imageUrl}
                      alt="课堂照片"
                      width={88}
                      height={88}
                      style={{ objectFit: 'cover', borderRadius: 8, background: '#FCFBF9' }}
                      preview={{ src: imageUrl }}
                    />
                  )
                })}
              </div>
            </AntImage.PreviewGroup>
          )}

          {post.ratings && (
            <Space wrap size={14} style={{ marginBottom: latestComment ? 12 : 0 }}>
              {(Object.keys(RATING_LABELS) as Array<keyof typeof RATING_LABELS>).map((key) => (
                <span key={key} style={{ color: '#98A2B3', fontSize: 12 }}>
                  {RATING_LABELS[key]} <Rate disabled value={Number(post.ratings?.[key] || 0)} style={{ color: '#f5a623', fontSize: 13 }} />
                </span>
              ))}
            </Space>
          )}

          {latestComment && (
            <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: '#FCFBF9', color: '#5a4e3a', fontSize: 13 }}>
              家长留言：{latestComment.content}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
