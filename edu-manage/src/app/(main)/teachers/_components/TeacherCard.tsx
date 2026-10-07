'use client'

import { Card, Typography, Button, Space, Tag, Image as AntImage } from 'antd'
import { EditOutlined, EyeOutlined, DeleteOutlined, AlertOutlined, TrophyOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import NextImage from 'next/image'

import { SUBJECT_COLORS } from '@/constants/subjects'
import { normalizeAvatarUrl } from '@/lib/upload-url'
import { femaleDefaultAvatar } from '@/lib/teacher-avatars'
import { resolveTier, TIER_THEME } from '@/constants/teacher-tier'

const { Text } = Typography
const AVATAR_COLORS = ['#E8784A', '#27a644', '#b37feb', '#f5a623', '#828fff', '#e03e2d']
function getAvatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] }

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
  const initials = teacher.name.charAt(0)
  const subjects = (teacher.subjects || '').split(',').filter(Boolean)
  const typeBadge = teacher.employmentType === 'FULL_TIME'
    ? { label: '全职', color: '#E8784A' }
    : { label: '兼职', color: '#f5a623' }
  const tier = resolveTier(teacher.tierLevel)
  const tierTheme = TIER_THEME[tier]

  return (
    <Card bordered style={{ borderRadius: 12 }} styles={{ body: { padding: 20 } }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 76, height: 96, position: 'relative', borderRadius: 10, backgroundColor: getAvatarColor(teacher.name), overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 700, flexShrink: 0, border: '1px solid #23252a' }}>
          {teacher.avatar ? (
            <NextImage src={normalizeAvatarUrl(teacher.avatar)} alt={teacher.name} fill sizes="76px" unoptimized style={{ objectFit: 'cover', objectPosition: 'center top' }} />
          ) : (
            <AntImage src={teacher.gender === '男' ? '/avatars/teacher-male.png' : femaleDefaultAvatar(teacher.name)} alt={teacher.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} preview={{ mask: '查看大图' }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text strong style={{ fontSize: 16, color: '#1F2329' }}>{teacher.name}</Text>
            <span style={{ background: tierTheme.bg, color: tierTheme.accent, border: `1px solid ${tierTheme.border}`, borderRadius: 999, fontSize: 10, padding: '1px 7px', whiteSpace: 'nowrap' }}>
              {tier === 'SENIOR' && <span style={{ color: tierTheme.gold, marginRight: 3 }}>★</span>}
              {tierTheme.label}
            </span>
            <Tag style={{ borderRadius: 9999, border: 'none', fontWeight: 600, fontSize: 11, background: typeBadge.color + '22', color: typeBadge.color }}>{typeBadge.label}</Tag>
          </div>
          <Text style={{ fontSize: 13, color: '#5a4e3a', display: 'block', marginTop: 2 }}>
            {[teacher.education, teacher.university, teacher.major].filter(Boolean).join(' · ') || '待完善教育背景'}
          </Text>
        </div>
      </div>

      {subjects.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {subjects.map(s => {
            const sc = SUBJECT_COLORS[s] || { bg: '#1e1e2e', color: '#8a8f98' }
            return <span key={s} style={{ padding: '2px 10px', borderRadius: 6, fontSize: 12, background: sc.bg + '22', color: sc.color }}>{s}</span>
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
        <div><Text style={{ color: '#5a4e3a', fontSize: 12 }}>月课时 </Text><Text strong style={{ color: '#1F2329' }}>{teacher.monthlyHours}</Text></div>
        <div><Text style={{ color: '#5a4e3a', fontSize: 12 }}>学员 </Text><Text strong style={{ color: '#1F2329' }}>{teacher._count?.students || 0}</Text></div>
        <div><Text style={{ color: '#5a4e3a', fontSize: 12 }}>评分 </Text><Text strong style={{ color: '#f5a623' }}>{'⭐'.repeat(Math.round(teacher.rating || 0)) || '-'}</Text></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space size={12}>
          <Text style={{ fontSize: 12, color: '#62666d' }}>{new Date(teacher.joinedAt).toLocaleDateString('zh-CN')} 入职</Text>
          {unreadCount > 0 && (
            <Text style={{ fontSize: 12, color: '#E8784A', fontWeight: 600 }}>
              <AlertOutlined /> {unreadCount} 条提醒/表扬未读
            </Text>
          )}
        </Space>
        <Space>
          <Button type="text" size="small" icon={<EyeOutlined />} style={{ color: '#8a8f98' }} onClick={() => router.push(`/teachers/${teacher.id}`)} />
          {onMessage && (
            <>
              <Button
                type="text"
                size="small"
                icon={<AlertOutlined />}
                title="发提醒"
                style={{ color: '#E8784A' }}
                onClick={() => onMessage(teacher as unknown as Record<string, unknown>, 'remind')}
              />
              <Button
                type="text"
                size="small"
                icon={<TrophyOutlined />}
                title="发表扬"
                style={{ color: '#27a644' }}
                onClick={() => onMessage(teacher as unknown as Record<string, unknown>, 'praise')}
              />
            </>
          )}
          <Button type="text" size="small" icon={<EditOutlined />} style={{ color: '#8a8f98' }} onClick={() => onEdit(teacher as unknown as Record<string, unknown>)} />
          <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(teacher as unknown as Record<string, unknown>)} />
        </Space>
      </div>
    </Card>
  )
}
