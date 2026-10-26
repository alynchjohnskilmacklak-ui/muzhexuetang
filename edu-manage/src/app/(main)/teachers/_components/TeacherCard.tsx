'use client'

import { Button } from 'antd'
import { EditOutlined, EyeOutlined, DeleteOutlined, AlertOutlined, TrophyOutlined, StarFilled, IdcardOutlined, ReadOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'

import { SUBJECT_COLORS } from '@/constants/subjects'
import { DEFAULT_TEACHER_AVATAR, getTeacherAvatarUrl } from '@/lib/teacher-avatars'
import { resolveTier, TIER_THEME } from '@/constants/teacher-tier'
import { CachedAvatarImage } from '@/components/Common/CachedAvatarImage'

type Teacher = {
  id: string; name: string; gender?: string | null; phone: string; email?: string | null
  avatar?: string | null
  employmentType: string; status: string; education?: string | null; university?: string | null
  tierLevel?: string | null
  major?: string | null; subjects: string; bio?: string | null; monthlyHours: number
  rating: number; joinedAt: string; contractEnd?: string | null
  _count?: { students: number; schedules: number }
}

export function TeacherCard({ teacher, onEdit, onDelete, onMessage, unreadCount = 0 }: {
  teacher: Teacher
  onEdit: (t: Record<string, unknown>) => void
  onDelete: (t: Record<string, unknown>) => void
  onMessage?: (t: Record<string, unknown>, type: 'remind' | 'praise') => void
  unreadCount?: number
}) {
  const router = useRouter()
  const subjects = (teacher.subjects || '').split(',').filter(Boolean)
  const typeBadge = teacher.employmentType === 'FULL_TIME'
    ? { label: '全职', color: '#0E5E4E' }
    : { label: '兼职', color: '#B98A2F' }
  const tier = resolveTier(teacher.tierLevel)
  const tierTheme = TIER_THEME[tier]
  const rating = Math.round(teacher.rating || 0)
  return (
    <div style={{
      borderRadius: 16, background: '#fff', border: '1px solid #EDE9E1',
      boxShadow: '0 2px 10px rgba(23,47,41,.05)', padding: 18, marginBottom: 0,
      transition: 'box-shadow .15s, transform .15s', cursor: 'pointer',
    }}
      onClick={() => router.push(`/teachers/${teacher.id}`)}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 22px rgba(23,47,41,.12)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(23,47,41,.05)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {/* 头部：头像 + 名称/等级/类型 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 72, height: 72, position: 'relative', borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
          border: '2px solid rgba(201,164,92,.5)', boxShadow: '0 3px 10px rgba(23,47,41,.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--color-surface-2, #F3EEE3)',
        }}>
          <CachedAvatarImage
            src={getTeacherAvatarUrl(teacher.avatar, teacher.gender, teacher.id)}
            fallbackSrc={getTeacherAvatarUrl(null, teacher.gender, teacher.id) || DEFAULT_TEACHER_AVATAR}
            alt={teacher.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 26%' }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16.5, fontWeight: 800, color: '#17352F' }}>{teacher.name}</span>
            <span style={{ background: tierTheme.bg, color: tierTheme.accent, border: `1px solid ${tierTheme.border}`, borderRadius: 999, fontSize: 10, padding: '1px 8px', whiteSpace: 'nowrap', fontWeight: 700 }}>
              {tier === 'SENIOR' && <span style={{ color: tierTheme.gold, marginRight: 3 }}>★</span>}
              {tierTheme.label}
            </span>
            <span style={{ borderRadius: 999, border: 'none', fontWeight: 700, fontSize: 10.5, background: typeBadge.color + '14', color: typeBadge.color, padding: '1px 8px', whiteSpace: 'nowrap' }}>{typeBadge.label}</span>
          </div>
          <div style={{ fontSize: 12, color: '#667085', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[teacher.education, teacher.university, teacher.major].filter(Boolean).join(' · ') || '待完善教育背景'}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#667085' }}>
              <IdcardOutlined style={{ color: '#0E5E4E' }} /> <span style={{ fontWeight: 700, color: '#17352F', fontVariantNumeric: 'tabular-nums' }}>{teacher.monthlyHours}</span> 月课时
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#667085' }}>
              <ReadOutlined style={{ color: '#185FA5' }} /> <span style={{ fontWeight: 700, color: '#17352F', fontVariantNumeric: 'tabular-nums' }}>{teacher._count?.students || 0}</span> 学员
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#667085' }}>
              <StarFilled style={{ color: '#B98A2F' }} /> <span style={{ fontWeight: 700, color: '#8A6B2F', fontVariantNumeric: 'tabular-nums' }}>{rating || '-'}</span> 评分
            </div>
          </div>
        </div>
      </div>

      {/* 学科胶囊 */}
      {subjects.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {subjects.map(s => {
            const sc = SUBJECT_COLORS[s] || { bg: '#1e1e2e', color: '#8a8f98' }
            return <span key={s} style={{ padding: '2px 11px', borderRadius: 999, fontSize: 11.5, background: sc.bg + '16', color: sc.color, fontWeight: 600 }}>{s}</span>
          })}
        </div>
      )}

      {/* 底部：入职 + 未读 + 操作 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', borderTop: '1px solid #F0EBE2', paddingTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11.5, color: '#98A2B3' }}>{new Date(teacher.joinedAt).toLocaleDateString('zh-CN')} 入职</span>
          {unreadCount > 0 && (
            <span style={{ fontSize: 11.5, color: '#C2541F', fontWeight: 700, background: 'rgba(232,120,74,.1)', padding: '1px 8px', borderRadius: 999 }}>
              <AlertOutlined /> {unreadCount} 条未读
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} onClick={e => e.stopPropagation()}>
          <Button type="text" size="small" icon={<EyeOutlined />} style={{ color: '#667085' }} title="查看档案" onClick={() => router.push(`/teachers/${teacher.id}`)} />
          {onMessage && (
            <>
              <Button type="text" size="small" icon={<AlertOutlined />} title="发提醒" style={{ color: '#C2541F' }} onClick={() => onMessage(teacher as unknown as Record<string, unknown>, 'remind')} />
              <Button type="text" size="small" icon={<TrophyOutlined />} title="发表扬" style={{ color: '#1D9E75' }} onClick={() => onMessage(teacher as unknown as Record<string, unknown>, 'praise')} />
            </>
          )}
          <Button type="text" size="small" icon={<EditOutlined />} style={{ color: '#667085' }} title="编辑" onClick={() => onEdit(teacher as unknown as Record<string, unknown>)} />
          <Button type="text" size="small" danger icon={<DeleteOutlined />} title="删除" onClick={() => onDelete(teacher as unknown as Record<string, unknown>)} />
        </div>
      </div>
    </div>
  )
}
