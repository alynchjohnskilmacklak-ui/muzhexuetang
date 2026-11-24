'use client'

import { Button } from 'antd'
import {
  AuditOutlined,
  DollarOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  AlertOutlined,
  TrophyOutlined,
  StarFilled,
  IdcardOutlined,
  ReadOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

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

export function TeacherCard({ teacher, onEdit, onDelete, onMessage, unreadCount = 0, dragHandle }: {
  teacher: Teacher
  onEdit: (t: Record<string, unknown>) => void
  onDelete: (t: Record<string, unknown>) => void
  onMessage?: (t: Record<string, unknown>, type: 'remind' | 'praise') => void
  unreadCount?: number
  dragHandle?: ReactNode
}) {
  const router = useRouter()
  const subjects = (teacher.subjects || '').split(',').filter(Boolean)
  const typeBadge = teacher.employmentType === 'FULL_TIME'
    ? { label: '全职', tone: 'full-time' }
    : { label: '兼职', tone: 'part-time' }
  const tier = resolveTier(teacher.tierLevel)
  const tierTheme = TIER_THEME[tier]
  const rating = Math.round(teacher.rating || 0)
  return (
    <article className="teacher-directory-card">
      {dragHandle}
      <button type="button" className="teacher-directory-card-main" onClick={() => router.push(`/teachers/${teacher.id}`)}>
        <div className="teacher-directory-card-heading">
          <div className="teacher-directory-avatar">
          <CachedAvatarImage
            src={getTeacherAvatarUrl(teacher.avatar, teacher.gender, teacher.id)}
            fallbackSrc={getTeacherAvatarUrl(null, teacher.gender, teacher.id) || DEFAULT_TEACHER_AVATAR}
            alt={teacher.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 26%' }}
          />
          </div>
          <div className="teacher-directory-card-identity">
            <div className="teacher-directory-card-name-row">
              <span className="teacher-directory-card-name">{teacher.name}</span>
              <span className="teacher-directory-tier" style={{ background: tierTheme.bg, color: tierTheme.accent, borderColor: tierTheme.border }}>
              {tier === 'SENIOR' && <span style={{ color: tierTheme.gold, marginRight: 3 }}>★</span>}
              {tierTheme.label}
              </span>
              <span className={`teacher-directory-employment is-${typeBadge.tone}`}>{typeBadge.label}</span>
            </div>
            <div className="teacher-directory-background">
              {[teacher.education, teacher.university, teacher.major].filter(Boolean).join(' · ') || '教育背景待完善'}
            </div>
            <div className="teacher-directory-card-meta">
              {teacher.status === 'RESIGNED' ? <span className="teacher-directory-status is-resigned">已离职</span> : <span className="teacher-directory-status is-active">在职</span>}
              {teacher.contractEnd && <span className="teacher-directory-contract">合同至 {new Date(teacher.contractEnd).toLocaleDateString('zh-CN')}</span>}
            </div>
          </div>
        </div>

        {subjects.length > 0 && (
          <div className="teacher-directory-subjects">
          {subjects.map(s => {
            const sc = SUBJECT_COLORS[s] || { bg: '#f3eee3', color: '#5a4e3a' }
            return <span key={s} className="teacher-directory-subject" style={{ background: sc.bg, color: sc.color }}>{s}</span>
          })}
          </div>
        )}

        <div className="teacher-directory-metrics">
          <span><IdcardOutlined /><strong>{teacher.monthlyHours || 0}</strong><small>月课时</small></span>
          <span><ReadOutlined /><strong>{teacher._count?.students || 0}</strong><small>学员</small></span>
          <span><StarFilled /><strong>{rating || '-'}</strong><small>评分</small></span>
        </div>
        <span className="teacher-directory-open-link"><EyeOutlined /> 打开教师档案 <span aria-hidden="true">→</span></span>
      </button>

      <footer className="teacher-directory-card-footer">
        <span className="teacher-directory-joined">{new Date(teacher.joinedAt).toLocaleDateString('zh-CN')} 入职</span>
        {unreadCount > 0 && <span className="teacher-directory-unread"><AlertOutlined /> {unreadCount} 条未读</span>}
        <div className="teacher-directory-card-actions" aria-label={`${teacher.name}的快捷操作`}>
          {onMessage && (
            <>
              <Button type="text" icon={<AlertOutlined />} title="发提醒" aria-label={`给${teacher.name}发提醒`} onClick={() => onMessage(teacher as unknown as Record<string, unknown>, 'remind')} />
              <Button type="text" icon={<TrophyOutlined />} title="发表扬" aria-label={`给${teacher.name}发表扬`} onClick={() => onMessage(teacher as unknown as Record<string, unknown>, 'praise')} />
            </>
          )}
          <Button type="text" icon={<EditOutlined />} title="编辑" aria-label={`编辑${teacher.name}`} onClick={() => onEdit(teacher as unknown as Record<string, unknown>)} />
          <Button type="text" danger icon={<DeleteOutlined />} title="删除" aria-label={`删除${teacher.name}`} onClick={() => onDelete(teacher as unknown as Record<string, unknown>)} />
        </div>
      </footer>
    </article>
  )
}
