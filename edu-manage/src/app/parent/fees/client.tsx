'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Typography, Tag, Button, Image, Segmented, Progress } from 'antd'
import {
  CheckCircleOutlined, ClockCircleOutlined, SafetyCertificateOutlined,
  MessageOutlined, WalletOutlined, FileTextOutlined, HistoryOutlined,
  BookOutlined, UserOutlined,
} from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ChildSwitcher } from '@/components/Parent/ChildSwitcher'
import { ResponsiveTable } from '@/components/Layout/ResponsiveTable'
import { AnimatedNumber } from '@/components/Common/AnimatedNumber'

const { Title, Text } = Typography

interface FeeRow {
  key: string
  id: string
  student: string
  course: string
  amount: number
  type: string
  status: string
  date: string
  paidAt: string | null
}

interface HourDeductionRow {
  id: string
  studentName: string
  date: string
  time: string
  courseName: string
  teacherName: string
  hoursDeducted: number
  status: string
}

interface EnrollmentBalanceRow {
  id: string
  studentName: string
  courseName: string
  totalHours: number
  usedHours: number
  remainHours: number
}

export function ParentFeesClient({
  feeData,
  hourDeductions = [],
  enrollmentBalances = [],
  linkedChildren,
  activeChildId,
  totalPaid,
  totalPending,
}: {
  feeData: FeeRow[]
  hourDeductions?: HourDeductionRow[]
  enrollmentBalances?: EnrollmentBalanceRow[]
  linkedChildren: Array<{ id: string; name: string; grade?: string | null; membershipLevel?: string | null }>
  activeChildId: string
  totalPaid: number
  totalPending: number
}) {
  const isMobile = useIsMobile() ?? false
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'fees' | 'hours'>('fees')

  const handlePay = () => {
    router.push(`/parent/messages${activeChildId !== 'all' ? `?childId=${encodeURIComponent(activeChildId)}` : ''}`)
  }

  const header = (
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(150deg,#1B4A3D 0%,#0E5E4E 55%,#123C35 100%)',
      borderRadius: '0 0 26px 26px', padding: '20px 18px 24px', color: '#fff',
      boxShadow: '0 10px 26px rgba(14,94,78,.22)',
    }}>
      <div style={{ position: 'absolute', top: -50, right: -40, width: 170, height: 170, borderRadius: 999, background: 'radial-gradient(circle,rgba(201,164,92,.30),transparent 65%)' }} />
      <div style={{ position: 'absolute', bottom: -70, left: -40, width: 150, height: 150, borderRadius: 999, background: 'radial-gradient(circle,rgba(255,255,255,.08),transparent 65%)' }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Image src="/images/logo-small-128.webp" width={46} height={46} style={{ borderRadius: 12, objectFit: 'cover' }} preview={false} alt="牧哲学堂" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.68)', letterSpacing: .5 }}>家长端 · 账单与课时</div>
          <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: .3, marginTop: 2 }}>学费与课时流水</div>
        </div>
      </div>
      <div style={{
        position: 'relative', marginTop: 14, display: 'flex', gap: 8, alignItems: 'flex-start',
        background: 'rgba(255,255,255,.10)', border: '1px solid rgba(255,255,255,.16)',
        borderRadius: 12, padding: '10px 12px', fontSize: 12.5, lineHeight: 1.6, color: 'rgba(255,255,255,.92)',
      }}>
        <SafetyCertificateOutlined style={{ color: '#C9A45C', marginTop: 2, fontSize: 15 }} />
        <span>本页供核对账单与出勤课时消耗，线上不涉及实际扣款。如有疑问可随时联系老师。</span>
      </div>
    </div>
  )

  const stats = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '14px 16px 0' }}>
      <div style={{ borderRadius: 16, padding: '14px 14px 12px', background: 'linear-gradient(135deg,rgba(39,166,68,.10),rgba(39,166,68,.04))', border: '1px solid rgba(39,166,68,.16)' }}>
        <div style={{ fontSize: 12, color: '#4E7B52', display: 'flex', alignItems: 'center', gap: 5 }}>
          <CheckCircleOutlined /> 已缴总额
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#27a644', marginTop: 6 }}>¥<AnimatedNumber value={totalPaid} /></div>
      </div>
      <div style={{ borderRadius: 16, padding: '14px 14px 12px', background: 'linear-gradient(135deg,rgba(232,120,74,.10),rgba(232,120,74,.04))', border: '1px solid rgba(232,120,74,.18)' }}>
        <div style={{ fontSize: 12, color: '#C2572C', display: 'flex', alignItems: 'center', gap: 5 }}>
          <ClockCircleOutlined /> 待缴总额
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#E8784A', marginTop: 6 }}>¥<AnimatedNumber value={totalPending} /></div>
      </div>
      <div style={{ borderRadius: 16, padding: '14px 16px 12px', gridColumn: '1 / -1', background: 'linear-gradient(135deg,#1B4A3D,#0E5E4E)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,.85)' }}>
          <WalletOutlined /> 合计学费应付
        </div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>¥<AnimatedNumber value={totalPaid + totalPending} /></div>
      </div>
    </div>
  )

  const emptyFeeBlock = (
    <div style={{ textAlign: 'center', padding: '40px 20px 36px' }}>
      <div style={{
        width: 62, height: 62, borderRadius: 22, margin: '0 auto 14px',
        background: 'linear-gradient(135deg,rgba(201,164,92,.22),rgba(232,120,74,.12))',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9A45C', fontSize: 26,
      }}>
        <FileTextOutlined />
      </div>
      <div style={{ fontWeight: 800, fontSize: 15, color: '#123C35' }}>暂无缴费记录</div>
      <div style={{ fontSize: 12.5, color: '#7A6A55', lineHeight: 1.7, marginTop: 6, maxWidth: 280, margin: '6px auto 0' }}>
        本页仅用于核对账单，如有疑问请随时联系机构。
      </div>
    </div>
  )

  const emptyHourBlock = (
    <div style={{ textAlign: 'center', padding: '40px 20px 36px' }}>
      <div style={{
        width: 62, height: 62, borderRadius: 22, margin: '0 auto 14px',
        background: 'linear-gradient(135deg,rgba(14,94,78,.15),rgba(20,87,77,.08))',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0E5E4E', fontSize: 26,
      }}>
        <HistoryOutlined />
      </div>
      <div style={{ fontWeight: 800, fontSize: 15, color: '#123C35' }}>暂无课时扣除流水</div>
      <div style={{ fontSize: 12.5, color: '#7A6A55', lineHeight: 1.7, marginTop: 6, maxWidth: 280, margin: '6px auto 0' }}>
        上课考勤确认后，扣除的课时流水将自动呈现在这里。
      </div>
    </div>
  )

  return (
    <div style={isMobile ? { padding: '0 0 60px', overflowX: 'clip' } : undefined}>
      {header}

      <div style={{ padding: isMobile ? '0 16px' : '0 24px', marginTop: 14 }}>
        <ChildSwitcher linkedChildren={linkedChildren} activeChildId={activeChildId} allowAll />

        {/* 顶部标签切换：缴费记录 / 课时流水 */}
        <div style={{ marginBottom: 16 }}>
          <Segmented
            block
            size="large"
            value={activeTab}
            onChange={(val) => setActiveTab(val as 'fees' | 'hours')}
            options={[
              { label: '💰 缴费记录与账单', value: 'fees' },
              { label: '⏱️ 课时账户与消耗流水', value: 'hours' },
            ]}
          />
        </div>

        {activeTab === 'fees' && (
          <>
            {isMobile ? stats : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
                <div style={{ borderRadius: 16, padding: '16px 18px', background: 'linear-gradient(135deg,rgba(39,166,68,.10),rgba(39,166,68,.04))', border: '1px solid rgba(39,166,68,.16)' }}>
                  <div style={{ fontSize: 13, color: '#4E7B52' }}><CheckCircleOutlined /> 已缴总额</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#27a644', marginTop: 8 }}>¥<AnimatedNumber value={totalPaid} /></div>
                </div>
                <div style={{ borderRadius: 16, padding: '16px 18px', background: 'linear-gradient(135deg,rgba(232,120,74,.10),rgba(232,120,74,.04))', border: '1px solid rgba(232,120,74,.18)' }}>
                  <div style={{ fontSize: 13, color: '#C2572C' }}><ClockCircleOutlined /> 待缴总额</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#E8784A', marginTop: 8 }}>¥<AnimatedNumber value={totalPending} /></div>
                </div>
                <div style={{ borderRadius: 16, padding: '16px 18px', background: 'linear-gradient(135deg,#1B4A3D,#0E5E4E)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.85)' }}><WalletOutlined /> 合计学费应付</div>
                  <div style={{ fontSize: 26, fontWeight: 800 }}>¥<AnimatedNumber value={totalPaid + totalPending} /></div>
                </div>
              </div>
            )}

            <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
              <ResponsiveTable
                dataSource={feeData}
                rowKey="key"
                pagination={false}
                size="small"
                scroll={{ x: 820 }}
                locale={{ emptyText: <div style={{ padding: '24px 0' }}>{emptyFeeBlock}</div> }}
                mobileEmpty={<div style={{ padding: '24px 0' }}>{emptyFeeBlock}</div>}
                renderMobileItem={(record: FeeRow, index: number) => (
                  <div
                    key={record.key}
                    className="responsive-record-card stagger-item"
                    style={{
                      borderRadius: 16,
                      padding: '14px 15px',
                      background: 'var(--color-surface-1, #ffffff)',
                      border: '1px solid rgba(20, 87, 77, 0.08)',
                      boxShadow: '0 3px 10px rgba(20, 60, 50, 0.03)',
                      marginBottom: 12,
                      animationDelay: `${Math.min(index, 8) * 40}ms`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(20,87,77,0.08)', color: '#14574D', border: '1px solid rgba(20,87,77,0.16)' }}>
                            {record.student}
                          </span>
                          <Text strong style={{ fontSize: 14.5, color: '#17352F' }} ellipsis>{record.course}</Text>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, color: '#8A7E6B' }}>{record.type}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1, color: record.status === 'paid' ? '#1E7A3C' : '#D97706', fontVariantNumeric: 'tabular-nums' }}>
                          ¥{record.amount.toLocaleString()}
                        </div>
                        <div style={{ marginTop: 5 }}>
                          {record.status === 'paid'
                            ? <Tag color="green" style={{ margin: 0, borderRadius: 999, fontWeight: 600 }}>已缴费</Tag>
                            : <Tag color="orange" style={{ margin: 0, borderRadius: 999, fontWeight: 600 }}>待缴费</Tag>}
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed rgba(60,80,72,0.12)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
                        <span style={{ color: '#8A7E6B' }}>账单日期</span>
                        <span style={{ fontWeight: 700, color: '#17352F', fontVariantNumeric: 'tabular-nums' }}>{record.date}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
                        <span style={{ color: '#8A7E6B' }}>缴费时间</span>
                        <span style={{ color: record.paidAt ? '#5A4E3A' : '#9A8E7A', fontVariantNumeric: 'tabular-nums' }}>{record.paidAt || '尚未缴费'}</span>
                      </div>
                    </div>
                    {record.status === 'pending' && (
                      <Button
                        block
                        style={{
                          marginTop: 12,
                          minHeight: 44,
                          borderRadius: 12,
                          background: 'linear-gradient(135deg, #14574D 0%, #0E483F 100%)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: '#ffffff',
                          fontWeight: 700,
                          boxShadow: '0 3px 10px rgba(20, 87, 77, 0.22)',
                        }}
                        onClick={handlePay}
                        icon={<MessageOutlined />}
                      >
                        咨询缴费方式
                      </Button>
                    )}
                  </div>
                )}
                columns={[
                  {
                    title: '学员',
                    dataIndex: 'student',
                    key: 'student',
                    render: (v: string) => (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(20,87,77,0.08)', color: '#14574D', border: '1px solid rgba(20,87,77,0.16)' }}>
                        {v}
                      </span>
                    ),
                  },
                  { title: '课程', dataIndex: 'course', key: 'course' },
                  { title: '金额', dataIndex: 'amount', key: 'amount', render: (v: number) => <Text strong style={{ fontSize: 16 }}>¥{v.toLocaleString()}</Text> },
                  { title: '类型', dataIndex: 'type', key: 'type' },
                  { title: '账单日期', dataIndex: 'date', key: 'date' },
                  { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => s === 'paid' ? <Tag color="green" style={{ borderRadius: 999 }}>已缴费</Tag> : <Tag color="orange" style={{ borderRadius: 999 }}>待缴费</Tag> },
                  { title: '缴费时间', dataIndex: 'paidAt', key: 'paidAt', render: (d: string | null) => d || '-' },
                  { title: '操作', key: 'action', render: (_: unknown, r: FeeRow) => r.status === 'pending' ? <Button onClick={handlePay} icon={<MessageOutlined />} style={{ borderRadius: 8 }}>咨询缴费方式</Button> : null },
                ]}
              />
            </Card>
          </>
        )}

        {activeTab === 'hours' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* 课时账户余额概览 */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {enrollmentBalances.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 14,
                    padding: '16px',
                    border: '1.5px solid rgba(20, 87, 77, 0.16)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 10 }}>
                    <Text strong style={{ fontSize: 15, color: '#1B4A3D' }}>{item.courseName}</Text>
                    {item.studentName && (
                      <Tag style={{ borderRadius: 999, fontSize: 10.5, margin: 0, background: '#F5EFE6', color: '#8A6D3B' }}>
                        {item.studentName}
                      </Tag>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 11.5, color: '#8A7E6B' }}>剩余课时</span>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#0E5E4E' }}>
                        {item.remainHours} <small style={{ fontSize: 13, fontWeight: 500 }}>课时</small>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 12, color: '#8A7E6B' }}>
                      已消耗 {item.usedHours} / 总计 {item.totalHours}h
                    </div>
                  </div>
                  <Progress
                    percent={item.totalHours > 0 ? Math.min(100, Math.round((item.usedHours / item.totalHours) * 100)) : 0}
                    strokeColor="#0E5E4E"
                    size="small"
                  />
                </div>
              ))}
            </div>

            {/* 最近课时扣除时间轴流水 */}
            <Card
              bordered={false}
              title={<span style={{ fontSize: 15, fontWeight: 700, color: '#1B4A3D' }}><HistoryOutlined style={{ marginRight: 6, color: '#C9A45C' }} />最近课时消耗流水</span>}
              style={{ borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}
            >
              {hourDeductions.length === 0 ? (
                emptyHourBlock
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {hourDeductions.map((row) => (
                    <div
                      key={row.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        background: '#FAF8F4',
                        border: '1px solid rgba(0,0,0,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: 14, color: '#1B4A3D' }}>{row.courseName}</strong>
                          <span style={{ fontSize: 11, color: '#8A7E6B' }}>· {row.teacherName}</span>
                          {row.studentName && (
                            <span style={{ fontSize: 10.5, padding: '1px 6px', borderRadius: 6, background: '#EAE5DB', color: '#5A4E3A' }}>
                              {row.studentName}
                            </span>
                          )}
                        </div>
                        <div style={{ marginTop: 4, fontSize: 12, color: '#8A7E6B' }}>
                          📅 {row.date} {row.time && `(${row.time})`} · {row.status}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ fontSize: 17, fontWeight: 800, color: '#C2572C' }}>
                          -{row.hoursDeducted} 课时
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
