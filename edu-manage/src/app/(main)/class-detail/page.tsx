'use client'

import useSWR from 'swr'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, Empty, Skeleton, Tag } from 'antd'
import {
  ArrowLeftOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined,
  FileTextOutlined, TeamOutlined, UserOutlined,
} from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { resolveTier, TIER_THEME } from '@/constants/teacher-tier'
import { CachedAvatarImage } from '@/components/Common/CachedAvatarImage'
import { getTeacherAvatarUrl } from '@/lib/teacher-avatars'

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error('加载失败')
  return r.json()
})

type ClassDetailData = {
  id: string
  courseName: string
  time: string
  room: string
  subject: string
  grade: string
  statusLabel: string
  teacher?: { name: string; avatar: string | null; gender?: string; tierLevel?: string; subjects?: string }
  students?: Array<{ id: string; name: string; membershipLevel: string; attendanceStatus: string | null; feedbackDone?: boolean }>
  attendanceDone?: boolean
  feedbackDone?: boolean
}

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  待上课: { label: '待上课', bg: '#FFF2D9', color: '#A06E0B' },
  上课中: { label: '上课中', bg: '#DFF5E8', color: '#1E7A3C' },
  待考勤: { label: '待考勤', bg: '#FFEDE4', color: '#C05A2E' },
  已完成: { label: '已结束', bg: '#F1F1F2', color: '#8B8B8B' },
}

export default function ClassDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const classId = searchParams.get('classId') || ''
  const { data, isLoading } = useSWR<ClassDetailData>(
    classId ? `/api/dashboard/class-detail?classId=${encodeURIComponent(classId)}` : null,
    fetcher,
  )

  if (!classId) {
    return (
      <PageLayout title="班级详情" subtitle="从首页今日课表进入">
        <Empty description="缺少班级信息，请从首页「今日课表」卡片进入" />
      </PageLayout>
    )
  }

  const statusMeta = STATUS_META[data?.statusLabel ?? ''] || { label: data?.statusLabel ?? '', bg: '#F1F1F2', color: '#8B8B8B' }
  const teacher = data?.teacher
  const students = data?.students ?? []
  const tierKey = resolveTier(teacher?.tierLevel ?? 'NEW')
  const tier = TIER_THEME[tierKey]

  return (
    <PageLayout title="班级详情" subtitle={data ? `${data.courseName} · 学员与教师信息` : undefined}>
      {isLoading || !data ? (
        <Card bordered={false}><Skeleton active paragraph={{ rows: 6 }} /></Card>
      ) : (
        <>
          {/* 返回 */}
          <button
            onClick={() => router.push('/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: '#A06E0B', fontSize: 13, cursor: 'pointer', marginBottom: 10, padding: 0 }}
          >
            <ArrowLeftOutlined /> 返回管理台
          </button>

          {/* 班级信息 hero */}
          <Card bordered={false} style={{ borderRadius: 16, marginBottom: 14, overflow: 'hidden', border: '1px solid rgba(232,120,74,.14)', background: 'linear-gradient(150deg,#FFFDF7,#FBF3E4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 17, color: '#2B2110' }}>{data.courseName}</strong>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, color: statusMeta.color, background: statusMeta.bg }}>{statusMeta.label}</span>
                </div>
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 14, color: '#5C4F3F', fontSize: 12.5 }}>
                  <span><ClockCircleOutlined style={{ marginRight: 4 }} />{data.time}</span>
                  <span><TeamOutlined style={{ marginRight: 4 }} />{data.grade}</span>
                  <span><FileTextOutlined style={{ marginRight: 4 }} />{data.subject}</span>
                  {data.room && <span><UserOutlined style={{ marginRight: 4 }} />{data.room}</span>}
                </div>
              </div>
              <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(155deg,#FFB84D,#E8784A)', color: '#fff', fontSize: 20 }}><TeamOutlined /></span>
            </div>
          </Card>

          {/* 任课教师 */}
          <Card bordered={false} style={{ borderRadius: 16, marginBottom: 14, border: '1px solid rgba(232,120,74,.14)', background: '#FFFDF7' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#2B2110', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg,#FFB84D,#E8784A)' }} />任课教师
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CachedAvatarImage
                src={getTeacherAvatarUrl(teacher?.avatar, teacher?.gender, teacher?.name)}
                fallbackSrc={getTeacherAvatarUrl(null, teacher?.gender, teacher?.name)}
                alt={teacher?.name || '教师头像'}
                style={{ width: 48, height: 48, borderRadius: 999, objectFit: 'cover', border: `2px solid ${tier.border}`, flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 15, color: '#2B2110' }}>{teacher?.name}</strong>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, color: tier.accent, background: tier.bg, border: `1px solid ${tier.border}` }}>{tier.label}</span>
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: '#9A8E7A' }}>{teacher?.subjects || '未设置学科'}</div>
              </div>
            </div>
          </Card>

          {/* 概要 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
            {[
              { label: '学员人数', value: students.length, color: '#2B2110', icon: <TeamOutlined /> },
              { label: '考勤', value: data.attendanceDone ? '已提交' : '未提交', color: data.attendanceDone ? 'var(--color-success-action)' : 'var(--color-primary)', icon: <CheckCircleOutlined />, small: true },
              { label: '课堂反馈', value: data.feedbackDone ? '已发布' : '未发布', color: data.feedbackDone ? 'var(--color-success-action)' : '#C0392B', icon: <FileTextOutlined />, small: true },
            ].map((s) => (
              <div key={s.label} style={{ padding: '12px 8px', borderRadius: 14, background: '#FFFDF7', border: '1px solid rgba(232,120,74,.14)', textAlign: 'center', boxShadow: '0 2px 8px rgba(58,50,39,.05)' }}>
                <div style={{ color: s.color, fontSize: 14 }}>{s.icon}</div>
                <div style={{ marginTop: 4, fontSize: s.small ? 13 : 20, fontWeight: 800, color: s.color, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{s.value}</div>
                <div style={{ marginTop: 2, fontSize: 11, color: '#9A8E7A' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* 学员明细 */}
          <div style={{ fontSize: 13, fontWeight: 700, color: '#2B2110', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg,#FFB84D,#E8784A)' }} />学员明细（{students.length}人）
          </div>
          {students.length === 0 ? (
            <Card bordered={false}><Empty description="暂无学员" /></Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {students.map((s) => {
                const levelStyle =
                  s.membershipLevel === 'SVIP'
                    ? { background: '#0E5E4E', border: '1px solid #C9A45C' }
                    : s.membershipLevel === 'VIP'
                      ? { background: '#FFF7F1', border: '1px solid #F0875B' }
                      : { background: '#F7FBF8', border: '1px solid #3E8E6E' }
                const nameColor =
                  s.membershipLevel === 'SVIP' ? '#F2E3B6'
                    : s.membershipLevel === 'VIP' ? '#B0552B'
                      : '#285247'
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 8px', borderRadius: 10, ...levelStyle }}>
                    <span style={{ fontSize: 12.5, color: nameColor, fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                    <span style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      {s.attendanceStatus === null
                        ? <Tag color="default" style={{ margin: 0, borderRadius: 999, fontSize: 9, lineHeight: '15px', padding: '0 5px' }}>未录</Tag>
                        : s.attendanceStatus === '出勤' || s.attendanceStatus === '补课'
                          ? <Tag color="success" style={{ margin: 0, borderRadius: 999, fontSize: 9, lineHeight: '15px', padding: '0 5px' }}>{s.attendanceStatus}</Tag>
                          : <Tag color="warning" style={{ margin: 0, borderRadius: 999, fontSize: 9, lineHeight: '15px', padding: '0 5px' }}>{s.attendanceStatus}</Tag>}
                      {s.feedbackDone === false && <span style={{ fontSize: 9, color: s.membershipLevel === 'SVIP' ? '#C9A45C' : '#C0392B', fontWeight: 600, lineHeight: 1 }}>反馈未发</span>}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </PageLayout>
  )
}
