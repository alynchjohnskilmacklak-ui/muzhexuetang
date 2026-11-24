'use client'

import useSWR from 'swr'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, Empty, Skeleton, Tag } from 'antd'
import {
  ArrowLeftOutlined, CalendarOutlined, ClockCircleOutlined, CrownOutlined,
  FileTextOutlined, TeamOutlined, UserOutlined, WalletOutlined,
} from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { StudentAvatar } from '@/components/Common/StudentAvatar'
import { CachedAvatarImage } from '@/components/Common/CachedAvatarImage'
import { resolveTier, TIER_THEME } from '@/constants/teacher-tier'
import { DEFAULT_TEACHER_AVATAR, getTeacherAvatarUrl } from '@/lib/teacher-avatars'

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error('加载失败')
  return r.json()
})

type AppointmentDetail = {
  id: string
  groupName: string
  teachingType: string
  teachingTypeLabel: string
  studentName: string
  studentGender?: string | null
  studentLevel?: string
  teacher: string
  teacherAvatar?: string | null
  teacherGender?: string | null
  tierLevel?: string
  subject: string
  lessonDate: string
  time: string
  room?: string
  createdTimeAgo?: string
  isHistorical?: boolean
  packageLabel?: string
  totalHours?: number
  usedHours?: number
  remainingHours?: number
  amount?: number
  status: string
}

export default function AppointmentDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id') || ''
  const { data, isLoading } = useSWR<AppointmentDetail>(
    id ? `/api/dashboard/appointment-detail?id=${encodeURIComponent(id)}` : null,
    fetcher,
  )

  if (!id) {
    return (
      <PageLayout title="约课详情" subtitle="从首页教师约课动态进入">
        <Empty description="缺少约课信息，请从首页「教师约课动态」卡片进入" />
      </PageLayout>
    )
  }

  const isPremium = data?.teachingType === 'ONE_ON_ONE'
  const tierKey = resolveTier(data?.tierLevel ?? 'NEW')
  const tier = TIER_THEME[tierKey]
  const levelLabel = data?.studentLevel === 'SVIP' ? '★SVIP' : data?.studentLevel === 'VIP' ? '★VIP' : '普通'
  const date = data?.lessonDate ? new Date(data.lessonDate) : null
  const dateLabel = date && !Number.isNaN(date.getTime()) ? `${date.getMonth() + 1}月${date.getDate()}日` : data?.lessonDate || ''

  return (
    <PageLayout title="约课详情" subtitle={data ? `${data.groupName} · ${data.teachingTypeLabel}` : undefined}>
      {isLoading || !data ? (
        <Card bordered={false}><Skeleton active paragraph={{ rows: 6 }} /></Card>
      ) : (
        <>
          <button
            className="mobile-shell-back"
            onClick={() => router.push('/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: '#A06E0B', fontSize: 13, cursor: 'pointer', marginBottom: 10, padding: 0 }}
          >
            <ArrowLeftOutlined /> 返回管理台
          </button>

          {/* hero：个性化一对一 = 深墨绿鎏金高级卡；补课/普通 = 浅米金卡 */}
          <div style={{
            borderRadius: 18,
            overflow: 'hidden',
            marginBottom: 14,
            border: isPremium ? '1px solid #C9A45C' : '1px solid rgba(232,120,74,.18)',
            boxShadow: isPremium ? '0 12px 30px rgba(18,60,53,.28)' : '0 4px 14px rgba(58,50,39,.06)',
            background: isPremium
              ? 'linear-gradient(155deg, #123C35 0%, #0E5E4E 55%, #0B4B40 100%)'
              : 'linear-gradient(150deg,#FFFDF7,#FBF3E4)',
            color: isPremium ? '#F5F1E8' : '#2B2110',
            padding: 16,
          }}>
            {/* 顶部标识 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 700, letterSpacing: 1,
                color: isPremium ? '#F2E3B6' : '#A06E0B',
                background: isPremium ? 'rgba(201,164,92,.16)' : 'rgba(232,120,74,.12)',
                border: isPremium ? '1px solid rgba(201,164,92,.5)' : '1px solid rgba(232,120,74,.25)',
                padding: '3px 10px', borderRadius: 999,
              }}>
                <CrownOutlined /> {isPremium ? '尊享 · 一对一专属' : '个性化约课'}
              </span>
              <Tag style={{
                margin: 0, borderRadius: 999, fontSize: 11, fontWeight: 600,
                color: isPremium ? '#123C35' : '#8B8B8B',
                background: isPremium ? 'linear-gradient(135deg,#F2E3B6,#D8BC7C)' : '#F1F1F2',
                border: 'none',
              }}>{data.status}</Tag>
            </div>

            <div style={{ marginTop: 12, fontSize: 16, fontWeight: 800, color: isPremium ? '#F5F1E8' : '#2B2110' }}>{data.groupName}</div>

            {/* 学生 */}
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <StudentAvatar photoUrl={null} gender={data.studentGender} name={data.studentName} size={42} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 15, color: isPremium ? '#F5F1E8' : '#2B2110' }}>{data.studentName}</strong>
                  <span style={{
                    fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 999, whiteSpace: 'nowrap',
                    color: isPremium ? '#123C35' : '#123C35',
                    background: data.studentLevel === 'SVIP' ? 'linear-gradient(135deg,#F2E3B6,#D8BC7C)' : data.studentLevel === 'VIP' ? 'linear-gradient(135deg,#FDE2CD,#F8C9A8)' : 'rgba(40,60,50,.08)',
                    border: `1px solid ${data.studentLevel === 'SVIP' ? 'rgba(201,164,92,.6)' : data.studentLevel === 'VIP' ? 'rgba(232,120,74,.4)' : 'rgba(40,60,50,.16)'}`,
                  }}>{levelLabel}</span>
                </div>
                <div style={{ marginTop: 3, fontSize: 11.5, color: isPremium ? 'rgba(245,241,232,.72)' : '#9A8E7A' }}>{data.subject} · {data.teacher}</div>
              </div>
            </div>

            {/* 课程信息 */}
            <div style={{
              marginTop: 14, padding: '10px 12px', borderRadius: 12,
              background: isPremium ? 'rgba(255,255,255,.07)' : 'rgba(232,120,74,.07)',
              border: isPremium ? '1px solid rgba(242,227,182,.25)' : '1px solid rgba(232,120,74,.16)',
              display: 'flex', flexWrap: 'wrap', gap: '6px 16px',
              fontSize: 12, color: isPremium ? 'rgba(245,241,232,.85)' : '#5C4F3F',
            }}>
              <span><CalendarOutlined style={{ marginRight: 4 }} />{dateLabel}</span>
              <span><ClockCircleOutlined style={{ marginRight: 4 }} />{data.time}</span>
              <span><FileTextOutlined style={{ marginRight: 4 }} />{data.subject}</span>
              {data.room && <span><UserOutlined style={{ marginRight: 4 }} />{data.room}</span>}
              <span><TeamOutlined style={{ marginRight: 4 }} />{data.teacher}</span>
            </div>
          </div>

          {/* 任课教师 */}
          <Card bordered={false} style={{ borderRadius: 16, marginBottom: 14, border: '1px solid rgba(232,120,74,.14)', background: '#FFFDF7' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#2B2110', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg,#FFB84D,#E8784A)' }} />任课教师
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CachedAvatarImage src={getTeacherAvatarUrl(data.teacherAvatar, data.teacherGender, data.teacher)} fallbackSrc={getTeacherAvatarUrl(null, data.teacherGender, data.teacher) || DEFAULT_TEACHER_AVATAR} alt={data.teacher} style={{ width: 48, height: 48, borderRadius: 999, objectFit: 'cover', border: `2px solid ${tier.border}` }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 15, color: '#2B2110' }}>{data.teacher}</strong>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, color: tier.accent, background: tier.bg, border: `1px solid ${tier.border}` }}>{tier.label}</span>
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: '#9A8E7A' }}>{data.subject} 任课 · {data.teachingTypeLabel}</div>
              </div>
            </div>
          </Card>

          {/* 课包信息（一对一高级展示） */}
          {isPremium && data.totalHours != null && (
            <div style={{
              borderRadius: 16, marginBottom: 14, overflow: 'hidden',
              border: '1px solid rgba(201,164,92,.45)',
              background: 'linear-gradient(150deg, #17352F 0%, #0E5E4E 100%)',
              boxShadow: '0 8px 22px rgba(18,60,53,.2)',
              padding: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <WalletOutlined style={{ color: '#F2E3B6', fontSize: 15 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#F2E3B6' }}>课时包</span>
                <span style={{ fontSize: 11, color: 'rgba(242,227,182,.7)', marginLeft: 'auto' }}>{data.packageLabel}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { label: '总课时', value: data.totalHours, unit: '节' },
                  { label: '已用', value: data.usedHours, unit: '节' },
                  { label: '剩余', value: data.remainingHours, unit: '节', highlight: true },
                ].map((it) => (
                  <div key={it.label} style={{
                    textAlign: 'center', padding: '10px 4px', borderRadius: 12,
                    background: it.highlight ? 'linear-gradient(135deg,#F2E3B6,#D8BC7C)' : 'rgba(255,255,255,.08)',
                    border: it.highlight ? '1px solid rgba(242,227,182,.7)' : '1px solid rgba(242,227,182,.18)',
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: it.highlight ? '#123C35' : '#F5F1E8', fontVariantNumeric: 'tabular-nums' }}>
                      {it.value}<span style={{ fontSize: 12, fontWeight: 600 }}> {it.unit}</span>
                    </div>
                    <div style={{ marginTop: 2, fontSize: 10.5, color: it.highlight ? 'rgba(18,60,53,.7)' : 'rgba(245,241,232,.6)' }}>{it.label}</div>
                  </div>
                ))}
              </div>
              {data.amount != null && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'rgba(242,227,182,.7)' }}>课程金额</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: '#F2E3B6', fontVariantNumeric: 'tabular-nums' }}>¥{(data.amount / 100).toFixed(0)}</span>
                </div>
              )}
            </div>
          )}

          {/* 约课动态说明 */}
          <Card bordered={false} style={{ borderRadius: 16, border: '1px solid rgba(232,120,74,.14)', background: '#FFFDF7' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#2B2110', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg,#FFB84D,#E8784A)' }} />约课状态
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: '约课提交', desc: data.createdTimeAgo ? `${data.createdTimeAgo}提交` : '已提交', done: true },
                { label: '课程确认', desc: '教务已确认安排', done: !data.isHistorical },
                { label: data.isHistorical ? '课程完成' : '待上课', desc: data.isHistorical ? `已于 ${dateLabel} ${data.time} 完成` : `${dateLabel} ${data.time} 上课`, done: !!data.isHistorical },
              ].map((step, i) => (
                <div key={step.label} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: 999, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: step.done ? 'linear-gradient(135deg,#C9A45C,#A8873D)' : 'rgba(40,60,50,.08)',
                      color: step.done ? '#123C35' : '#9A8E7A',
                      fontSize: 9, fontWeight: 800,
                    }}>{step.done ? '✓' : i + 1}</span>
                    {i < 2 && <span style={{ width: 2, height: 26, background: step.done ? 'rgba(201,164,92,.4)' : 'rgba(40,60,50,.1)' }} />}
                  </div>
                  <div style={{ paddingBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: step.done ? '#2B2110' : '#9A8E7A' }}>{step.label}</div>
                    <div style={{ fontSize: 11.5, color: '#9A8E7A', marginTop: 2 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </PageLayout>
  )
}
