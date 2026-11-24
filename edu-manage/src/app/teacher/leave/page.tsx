'use client'

import useSWR from 'swr'
import { Button, Card, Input, Segmented, Space, Tag, Typography } from 'antd'
import {
  AlertOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  CheckOutlined,
  CloseCircleFilled,
  CloseOutlined,
  HistoryOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/useIsMobile'
import { fmtDate, fmtDateTime } from '@/lib/format-date'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { BrandModal } from '@/components/Common/BrandModal'
import { resolveTier, TIER_APP, TIER_THEME, type TeacherTier } from '@/constants/teacher-tier'

const { Title, Text, Paragraph } = Typography

type LeaveStatus = 'all' | 'pending' | 'approved' | 'rejected'

type LeaveRecord = {
  id: string
  student: { id: string; name: string }
  schedule?: { id: string; startTime?: string; title?: string; course?: { name: string } } | null
  reason: string
  leaveDate: string
  status: 'pending' | 'approved' | 'rejected' | string
  replyNote?: string | null
  repliedAt?: string | null
  createdAt: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: '待审批', color: '#BA7517', bg: '#FAEEDA', border: 'rgba(186, 117, 23, 0.3)' },
  approved: { label: '已批准', color: '#14574D', bg: '#EAF5F0', border: 'rgba(20, 87, 77, 0.25)' },
  rejected: { label: '已驳回', color: '#DC2626', bg: '#FDECEB', border: 'rgba(220, 38, 38, 0.25)' },
}

function statusMeta(status: string) {
  return STATUS_META[status] || { label: status || '未知', color: '#5A4E3A', bg: '#F5F2EE', border: 'rgba(0,0,0,0.1)' }
}

function formatDate(value: string) {
  return fmtDate(value)
}

function formatTime(value?: string) {
  if (!value) return ''
  return fmtDateTime(value)
}

export default function TeacherLeavePage() {
  const isMobile = useIsMobile() ?? false
  const [status, setStatus] = useState<LeaveStatus>('pending')
  const [action, setAction] = useState<{ record: LeaveRecord; status: 'approved' | 'rejected' } | null>(null)
  const [replyNote, setReplyNote] = useState('')

  // 教师身份与梯队主题
  const { data: dashData } = useSWR<{ teacher?: { id: string; name: string; tierLevel?: string | null } }>(
    '/api/teacher/dashboard',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  )

  const currentTier: TeacherTier = resolveTier(dashData?.teacher?.tierLevel)
  const tierTheme = TIER_THEME[currentTier]
  const appTheme = TIER_APP[currentTier]

  // 梯队专属视觉风格
  const tierVisual = useMemo(() => {
    switch (currentTier) {
      case 'MANAGER':
        return {
          gradient: 'linear-gradient(135deg, #241A5E 0%, #4C3FA8 55%, #6B5DC2 100%)',
          shadow: '0 12px 30px rgba(76, 63, 168, 0.32)',
          subColor: '#E2D9F4',
          badgeBg: 'rgba(255, 255, 255, 0.16)',
          badgeFg: '#E2D9F4',
          badgeBorder: 'rgba(226, 217, 244, 0.28)',
          accentColor: '#4C3FA8',
          goldColor: '#FDE68A',
          bannerTag: `🛡️ ${tierTheme.label} · 请假审批`,
        }
      case 'ELITE':
        return {
          gradient: 'linear-gradient(135deg, #061A17 0%, #0D3732 55%, #18524B 100%)',
          shadow: '0 12px 30px rgba(13, 55, 50, 0.38)',
          subColor: '#F6E9C8',
          badgeBg: 'rgba(201, 164, 92, 0.24)',
          badgeFg: '#F6E9C8',
          badgeBorder: 'rgba(201, 164, 92, 0.38)',
          accentColor: '#0D3732',
          goldColor: '#C9A45C',
          bannerTag: `👑 ${tierTheme.label} · 请假审批`,
        }
      case 'SENIOR':
        return {
          gradient: 'linear-gradient(135deg, #0B2923 0%, #14574D 55%, #1E7E6F 100%)',
          shadow: '0 12px 30px rgba(20, 87, 77, 0.35)',
          subColor: '#D1FAE5',
          badgeBg: 'rgba(255, 255, 255, 0.16)',
          badgeFg: '#A7F3D0',
          badgeBorder: 'rgba(167, 243, 208, 0.25)',
          accentColor: '#14574D',
          goldColor: '#F3D98F',
          bannerTag: `⭐ ${tierTheme.label} · 请假审批`,
        }
      case 'EXPERIENCED':
        return {
          gradient: 'linear-gradient(135deg, #103B31 0%, #267461 55%, #38957E 100%)',
          shadow: '0 12px 30px rgba(38, 116, 97, 0.32)',
          subColor: '#CCFBF1',
          badgeBg: 'rgba(255, 255, 255, 0.16)',
          badgeFg: '#99F6E4',
          badgeBorder: 'rgba(153, 246, 228, 0.25)',
          accentColor: '#267461',
          goldColor: '#FDE68A',
          bannerTag: `🌿 ${tierTheme.label} · 请假审批`,
        }
      case 'NEW':
      default:
        return {
          gradient: 'linear-gradient(135deg, #174233 0%, #3D8A6F 55%, #52A687 100%)',
          shadow: '0 12px 30px rgba(61, 138, 111, 0.32)',
          subColor: '#D1FAE5',
          badgeBg: 'rgba(255, 255, 255, 0.16)',
          badgeFg: '#A7F3D0',
          badgeBorder: 'rgba(167, 243, 208, 0.25)',
          accentColor: '#3D8A6F',
          goldColor: '#FEF08A',
          bannerTag: `🌱 ${tierTheme.label} · 请假审批`,
        }
    }
  }, [currentTier, tierTheme])

  const { data, isLoading, mutate } = useSWR<{ records: LeaveRecord[]; total: number }>(
    `/api/leave-requests?status=${status === 'all' ? '' : status}&limit=80`,
    fetcher
  )

  const records = useMemo(() => data?.records || [], [data])
  const pendingCount = useMemo(() => records.filter((record) => record.status === 'pending').length, [records])

  const submitAction = async () => {
    if (!action) return
    const toastId = toast.loading(action.status === 'approved' ? '正在批准请假...' : '正在驳回请假...')
    try {
      const res = await fetch(`/api/leave-requests/${action.record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action.status, replyNote }),
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error || '处理失败')
      }
      toast.success(action.status === 'approved' ? '已批准请假' : '已驳回请假')
      setAction(null)
      setReplyNote('')
      mutate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '处理失败')
    } finally {
      toast.dismiss(toastId)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: isMobile ? 88 : 32, color: '#17352F' }}>
      {/* ========================================================= */}
      {/* 顶部根据老师等级/标签动态渲染专属高光数据看板 (HERO BANNER) */}
      {/* ========================================================= */}
      <div
        style={{
          background: tierVisual.gradient,
          borderRadius: 22,
          padding: isMobile ? '20px 18px' : '24px 26px',
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: tierVisual.shadow,
        }}
      >
        {/* 背景光晕 */}
        <div
          style={{
            position: 'absolute',
            top: -30,
            right: -25,
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: tierVisual.badgeBg,
                border: `1px solid ${tierVisual.badgeBorder}`,
                backdropFilter: 'blur(8px)',
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 800,
                color: tierVisual.badgeFg,
                marginBottom: 8,
                letterSpacing: '0.04em',
              }}
            >
              <CalendarOutlined style={{ color: tierVisual.goldColor }} />
              <span>{tierVisual.bannerTag}</span>
            </div>
            <div
              style={{
                color: '#FFFFFF !important',
                fontSize: isMobile ? 24 : 28,
                fontWeight: 900,
                letterSpacing: '-0.02em',
                lineHeight: 1.25,
                textShadow: '0 2px 8px rgba(0,0,0,0.45)',
              }}
            >
              学生请假与调课审批
            </div>
            <div style={{ fontSize: 12.5, color: tierVisual.subColor, marginTop: 5, opacity: 0.95 }}>
              审核学生请假与调课事由，审批回执实时推送至家长端
            </div>
          </div>

          <Button
            icon={<ReloadOutlined />}
            onClick={() => mutate()}
            style={{
              background: 'rgba(255, 255, 255, 0.16)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#FFFFFF',
              borderRadius: 12,
              height: 38,
              fontWeight: 700,
            }}
          >
            刷新
          </Button>
        </div>

        {/* 核心统计小卡片 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            marginTop: 18,
          }}
        >
          {/* 指标 1：待审批 */}
          <div
            onClick={() => setStatus('pending')}
            style={{
              background: status === 'pending' ? 'rgba(224, 120, 61, 0.35)' : 'rgba(255, 255, 255, 0.12)',
              border: status === 'pending' ? '1.5px solid #FFAB91' : '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: 14,
              padding: '10px 12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: 11, color: pendingCount > 0 ? '#FFE0B2' : tierVisual.subColor }}>待审批请假</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: pendingCount > 0 ? '#FFE082' : '#FFFFFF', marginTop: 2 }}>
              {pendingCount} <span style={{ fontSize: 11, fontWeight: 600 }}>人次</span>
            </div>
            <div style={{ fontSize: 10, color: pendingCount > 0 ? '#FFAB91' : tierVisual.subColor, marginTop: 1 }}>
              {pendingCount > 0 ? '⚠️ 点击优先处理' : '全部审批完毕'}
            </div>
          </div>

          {/* 指标 2：已批准 */}
          <div
            onClick={() => setStatus('approved')}
            style={{
              background: status === 'approved' ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.12)',
              border: status === 'approved' ? `1.5px solid ${tierVisual.goldColor}` : '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: 14,
              padding: '10px 12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: 11, color: tierVisual.subColor }}>已批准记录</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF', marginTop: 2 }}>
              {status === 'approved' ? records.length : '查看'}
            </div>
            <div style={{ fontSize: 10, color: tierVisual.subColor, opacity: 0.9, marginTop: 1 }}>准假回执已发</div>
          </div>

          {/* 指标 3：已驳回 */}
          <div
            onClick={() => setStatus('rejected')}
            style={{
              background: status === 'rejected' ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.12)',
              border: status === 'rejected' ? `1.5px solid ${tierVisual.goldColor}` : '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: 14,
              padding: '10px 12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: 11, color: tierVisual.subColor }}>已驳回申请</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF', marginTop: 2 }}>
              {status === 'rejected' ? records.length : '查看'}
            </div>
            <div style={{ fontSize: 10, color: tierVisual.subColor, opacity: 0.9, marginTop: 1 }}>附驳回理由</div>
          </div>
        </div>
      </div>

      {/* 状态切换与卡片列表 */}
      <Card
        bordered={false}
        style={{
          borderRadius: 18,
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 3px 12px rgba(0,0,0,0.03)',
        }}
        styles={{ body: { padding: isMobile ? 12 : 16 } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <Segmented
            value={status}
            onChange={(value) => setStatus(value as LeaveStatus)}
            options={[
              { label: '待审批', value: 'pending' },
              { label: '已批准', value: 'approved' },
              { label: '已驳回', value: 'rejected' },
              { label: '全部记录', value: 'all' },
            ]}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            当前 {records.length} 条{status === 'pending' ? `，待处理 ${pendingCount} 条` : ''}
          </Text>
        </div>

        {isLoading ? (
          <CardSkeleton rows={3} />
        ) : records.length === 0 ? (
          <BrandEmpty title="暂无请假申请" hint="有新申请会出现在这里" icon={<CalendarOutlined />} />
        ) : (
          <div className="scroll-area" style={{ display: 'grid', gap: 10 }}>
            {records.map((record, index) => {
              const meta = statusMeta(record.status)
              const canReview = record.status === 'pending'
              return (
                <div
                  className="stagger-item"
                  key={record.id}
                  style={{
                    padding: isMobile ? 14 : 16,
                    borderRadius: 14,
                    background: canReview ? '#FFFDF8' : '#FFFFFF',
                    border: canReview ? `1.5px solid ${tierVisual.accentColor}44` : '1px solid rgba(0,0,0,0.08)',
                    boxShadow: canReview ? '0 2px 8px rgba(0,0,0,0.03)' : 'none',
                    animationDelay: `${Math.min(index, 8) * 40}ms`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <Space wrap size={6}>
                        <UserOutlined style={{ color: tierVisual.accentColor }} />
                        <Text strong style={{ fontSize: 15, color: '#17352F' }}>
                          {record.student?.name || '学员'}
                        </Text>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: meta.color,
                            background: meta.bg,
                            border: `1px solid ${meta.border}`,
                            padding: '2px 8px',
                            borderRadius: 999,
                          }}
                        >
                          {meta.label}
                        </span>
                      </Space>
                      <div style={{ color: '#7D6D5E', fontSize: 12, marginTop: 6 }}>
                        <CalendarOutlined style={{ marginRight: 4 }} />
                        请假日期：{formatDate(record.leaveDate)}
                        {record.schedule?.startTime ? ` · 课次：${formatTime(record.schedule.startTime)}` : ''}
                      </div>
                    </div>
                    <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                      提交于 {formatTime(record.createdAt)}
                    </Text>
                  </div>

                  {/* 请假事由 */}
                  <div
                    style={{
                      marginTop: 10,
                      padding: '10px 12px',
                      background: '#F9F8F5',
                      borderRadius: 10,
                      fontSize: 13,
                      color: '#423727',
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ fontWeight: 800, color: '#17352F' }}>请假事由：</span>
                    {record.reason}
                  </div>

                  {/* 审批回执与备注 */}
                  {record.replyNote && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#6A5C47', padding: '6px 10px', background: '#F5FAF7', borderRadius: 8 }}>
                      <span style={{ fontWeight: 700 }}>审批回执：</span>
                      {record.replyNote}
                      {record.repliedAt && <span style={{ marginLeft: 6, color: '#A09380' }}>（{formatTime(record.repliedAt)}）</span>}
                    </div>
                  )}

                  {/* 审批动作按钮 */}
                  {canReview && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 12, justifyContent: 'flex-end' }}>
                      <Button
                        danger
                        icon={<CloseOutlined />}
                        onClick={() => {
                          setAction({ record, status: 'rejected' })
                          setReplyNote('')
                        }}
                        style={{ borderRadius: 8, fontWeight: 700 }}
                      >
                        驳回
                      </Button>
                      <Button
                        type="primary"
                        icon={<CheckOutlined />}
                        onClick={() => {
                          setAction({ record, status: 'approved' })
                          setReplyNote('同意请假，请注意课后补课进度。')
                        }}
                        style={{
                          borderRadius: 8,
                          fontWeight: 700,
                          background: tierVisual.accentColor,
                          borderColor: tierVisual.accentColor,
                        }}
                      >
                        批准请假
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* 审批确认与备注弹窗 */}
      <BrandModal
        open={Boolean(action)}
        onCancel={() => setAction(null)}
        title={action?.status === 'approved' ? '批准请假申请' : '驳回请假申请'}
        okText={action?.status === 'approved' ? '确认批准' : '确认驳回'}
        okButtonProps={{ danger: action?.status === 'rejected' }}
        onOk={submitAction}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13.5, color: '#423727' }}>
            确定要{action?.status === 'approved' ? '批准' : '驳回'}学员 <b>{action?.record.student.name}</b> 在{' '}
            <b>{action?.record.leaveDate ? formatDate(action.record.leaveDate) : ''}</b> 的请假申请吗？
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#17352F', marginBottom: 6 }}>
              审批回执与留言（将同步发送给家长）：
            </div>
            <Input.TextArea
              rows={3}
              value={replyNote}
              onChange={(e) => setReplyNote(e.target.value)}
              placeholder="请输入审批留言或课后辅导建议..."
              style={{ borderRadius: 10 }}
            />
          </div>
        </div>
      </BrandModal>
    </div>
  )
}
