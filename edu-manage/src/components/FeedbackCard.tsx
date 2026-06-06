'use client'

import { useState } from 'react'
import { Image as AntImage, Input, Space, Tag } from 'antd'
import { Button } from 'antd'
import { normalizeUploadUrl } from '@/lib/upload-url'

export const MOODS = [
  { value: 'GREAT', label: '非常棒', emoji: '🌟', color: '#1D9E75' },
  { value: 'GOOD', label: '不错', emoji: '😊', color: '#534AB7' },
  { value: 'OKAY', label: '一般', emoji: '😐', color: '#D97706' },
  { value: 'NEEDS_ATTENTION', label: '需关注', emoji: '⚠️', color: '#D4537E' },
] as const

export const QUICK_TAGS = ['积极发言', '专注听讲', '作业优秀', '进步明显', '思维活跃', '独立解题', '需加强', '状态好', '阅读理解', '计算训练']
export const QUICK_KPS = ['新知识讲解', '错题订正', '课堂练习', '复习巩固', '测验讲评', '作业讲解']
export const BADGES = ['🌟今日之星', '🚀进步飞速', '💡思维达人', '✅作业之王', '💪坚持不懈', '🎯精准破题']

export function FeedbackCard({ item, compact = false, onReply }: { item: any; compact?: boolean; onReply?: (id: string, text: string) => void }) {
  const [replyText, setReplyText] = useState('')
  const [showReply, setShowReply] = useState(false)
  const moodInfo = MOODS.find(m => m.value === item.mood) || MOODS[1]
  const students: any[] = Array.isArray(item.students) ? item.students : []
  const kps: string[] = Array.isArray(item.knowledgePoints) ? item.knowledgePoints : []
  const tags: string[] = Array.isArray(item.tags) ? item.tags : []
  const images: string[] = Array.isArray(item.imageUrls) ? item.imageUrls : []
  const hw: any[] = Array.isArray(item.homework) ? item.homework : []

  return (
    <div style={{
      background: '#fff', borderRadius: 14,
      border: `1px solid ${item.status === 'DRAFT' ? '#FED7AA' : '#EEE7E1'}`,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #F5F2EE' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>{moodInfo.emoji}</span>
            <div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#1F2329' }}>
                {item.teacher?.name || item.teacherName}
              </span>
              {item.classLesson?.group?.course?.name && (
                <span style={{ fontSize: 12, color: '#98A2B3', marginLeft: 6 }}>{item.classLesson.group.course.name}</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {item.badge && <span style={{ fontSize: 12, background: '#FFF5D8', color: '#B7791F', padding: '2px 10px', borderRadius: 9999 }}>{item.badge}</span>}
            <span style={{ fontSize: 11, color: '#C4BAB0' }}>
              {new Date(item.createdAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
            </span>
            {item.status === 'DRAFT' && <Tag color="orange" style={{ borderRadius: 9999, fontSize: 10, margin: 0 }}>草稿</Tag>}
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {students.length > 0 && (
          <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {students.map((s: any) => (
              <span key={s.id} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, background: '#F5F2EE', color: '#5a4e3a' }}>
                {s.name}
              </span>
            ))}
          </div>
        )}
        {item.overallComment && (
          <div style={{ fontSize: 14, color: '#1F2329', lineHeight: 1.7, marginBottom: 8, padding: '8px 12px', background: '#FFFBF6', borderRadius: 8, borderLeft: '3px solid #E8784A' }}>
            {item.overallComment}
          </div>
        )}
        {(kps.length > 0 || tags.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {kps.map(kp => <span key={kp} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, background: '#FFF3EC', color: '#E8784A' }}>{kp}</span>)}
            {tags.map(t => <span key={t} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, background: '#EEEEFF', color: '#534AB7' }}>{t}</span>)}
          </div>
        )}
        {!compact && item.summary && (
          <div style={{ fontSize: 13, color: '#5a4e3a', marginBottom: 8 }}>{item.summary}</div>
        )}
        {!compact && hw.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#98A2B3' }}>作业 {hw.length} 项：</span>
            {hw.map((h, i) => (
              <div key={i} style={{ fontSize: 12, color: '#5a4e3a', marginLeft: 8 }}>
                {i + 1}. {typeof h === 'string' ? h : h.content}
              </div>
            ))}
          </div>
        )}
        {!compact && images.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            <AntImage.PreviewGroup>
              {images.map((url, i) => (
                <AntImage key={i} src={normalizeUploadUrl(url)} width={60} height={60} style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid #EEE7E1' }} />
              ))}
            </AntImage.PreviewGroup>
          </div>
        )}
        {item.parentReply && (
          <div style={{ padding: '6px 10px', background: '#FFF3EC', borderRadius: 8, fontSize: 12, color: '#5a4e3a', marginTop: 8 }}>
            💬 家长：{item.parentReply}
          </div>
        )}
        {item.adminReply && (
          <div style={{ padding: '6px 10px', background: '#F0FDF4', borderRadius: 8, fontSize: 12, color: '#1D9E75', marginTop: 4 }}>
            👨‍💼 老师回复：{item.adminReply}
          </div>
        )}
        {onReply && (
          <div style={{ marginTop: 8 }}>
            {showReply ? (
              <Space.Compact style={{ width: '100%' }}>
                <Input size="small" value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="回复家长留言..." />
                <Button size="small" type="primary" style={{ background: '#E8784A' }} onClick={() => { onReply(item.id, replyText); setReplyText(''); setShowReply(false) }}>回复</Button>
              </Space.Compact>
            ) : (
              <button onClick={() => setShowReply(true)} style={{ fontSize: 12, color: '#98A2B3', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {item.parentReply ? '📝 回复家长' : '+ 添加回复'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
