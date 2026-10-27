'use client'

import { useRouter } from 'next/navigation'
import { Card, Typography, Tag, Button, Image } from 'antd'
import {
  CheckCircleOutlined, ClockCircleOutlined, SafetyCertificateOutlined,
  MessageOutlined, WalletOutlined, FileTextOutlined,
} from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ChildSwitcher } from '@/components/Parent/ChildSwitcher'
import { ResponsiveTable } from '@/components/Layout/ResponsiveTable'

const { Title, Text } = Typography

interface FeeRow { key: string; id: string; student: string; course: string; amount: number; type: string; status: string; date: string; paidAt: string | null }

export function ParentFeesClient({
  feeData, linkedChildren, activeChildId, totalPaid, totalPending
}: {
  feeData: FeeRow[]
  linkedChildren: Array<{ id: string; name: string; grade?: string | null; membershipLevel?: string | null }>
  activeChildId: string
  totalPaid: number
  totalPending: number
}) {
  const isMobile = useIsMobile() ?? false
  const router = useRouter()
  const filtered = feeData

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
        <Image src="/images/logo-small.png" width={46} height={46} style={{ borderRadius: 12, objectFit: 'cover' }} preview={false} alt="牧哲学堂" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.68)', letterSpacing: .5 }}>家长端 · 账单核对</div>
          <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: .3, marginTop: 2 }}>缴费记录</div>
        </div>
      </div>
      <div style={{
        position: 'relative', marginTop: 14, display: 'flex', gap: 8, alignItems: 'flex-start',
        background: 'rgba(255,255,255,.10)', border: '1px solid rgba(255,255,255,.16)',
        borderRadius: 12, padding: '10px 12px', fontSize: 12.5, lineHeight: 1.6, color: 'rgba(255,255,255,.92)',
      }}>
        <SafetyCertificateOutlined style={{ color: '#C9A45C', marginTop: 2, fontSize: 15 }} />
        <span>本页仅用于核对账单，线上不涉及缴费。如需缴费，请联系机构确认缴费方式。</span>
      </div>
    </div>
  )

  const stats = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '14px 16px 0' }}>
      <div style={{ borderRadius: 16, padding: '14px 14px 12px', background: 'linear-gradient(135deg,rgba(39,166,68,.10),rgba(39,166,68,.04))', border: '1px solid rgba(39,166,68,.16)' }}>
        <div style={{ fontSize: 12, color: '#4E7B52', display: 'flex', alignItems: 'center', gap: 5 }}>
          <CheckCircleOutlined /> 已缴总额
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#27a644', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>¥{totalPaid.toLocaleString()}</div>
      </div>
      <div style={{ borderRadius: 16, padding: '14px 14px 12px', background: 'linear-gradient(135deg,rgba(232,120,74,.10),rgba(232,120,74,.04))', border: '1px solid rgba(232,120,74,.18)' }}>
        <div style={{ fontSize: 12, color: '#C2572C', display: 'flex', alignItems: 'center', gap: 5 }}>
          <ClockCircleOutlined /> 待缴总额
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#E8784A', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>¥{totalPending.toLocaleString()}</div>
      </div>
      <div style={{ borderRadius: 16, padding: '14px 16px 12px', gridColumn: '1 / -1', background: 'linear-gradient(135deg,#1B4A3D,#0E5E4E)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,.85)' }}>
          <WalletOutlined /> 合计
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>¥{(totalPaid + totalPending).toLocaleString()}</div>
      </div>
    </div>
  )

  const emptyBlock = (
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
        本页仅用于核对账单，线上不涉及缴费，如有疑问请联系机构。
      </div>
    </div>
  )

  return (
    <div style={isMobile ? { padding: '0 0 60px', overflowX: 'clip' } : undefined}>
      {header}

      {isMobile ? (
        <ChildSwitcher linkedChildren={linkedChildren} activeChildId={activeChildId} allowAll />
      ) : (
        <div style={{ marginTop: 16 }}>
          <ChildSwitcher linkedChildren={linkedChildren} activeChildId={activeChildId} allowAll />
        </div>
      )}

      {isMobile ? stats : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, margin: '16px 0' }}>
          <div style={{ borderRadius: 16, padding: '16px 18px', background: 'linear-gradient(135deg,rgba(39,166,68,.10),rgba(39,166,68,.04))', border: '1px solid rgba(39,166,68,.16)' }}>
            <div style={{ fontSize: 13, color: '#4E7B52' }}><CheckCircleOutlined /> 已缴总额</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#27a644', marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>¥{totalPaid.toLocaleString()}</div>
          </div>
          <div style={{ borderRadius: 16, padding: '16px 18px', background: 'linear-gradient(135deg,rgba(232,120,74,.10),rgba(232,120,74,.04))', border: '1px solid rgba(232,120,74,.18)' }}>
            <div style={{ fontSize: 13, color: '#C2572C' }}><ClockCircleOutlined /> 待缴总额</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#E8784A', marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>¥{totalPending.toLocaleString()}</div>
          </div>
          <div style={{ borderRadius: 16, padding: '16px 18px', background: 'linear-gradient(135deg,#1B4A3D,#0E5E4E)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.85)' }}><WalletOutlined /> 合计</div>
            <div style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>¥{(totalPaid + totalPending).toLocaleString()}</div>
          </div>
        </div>
      )}

      <Card bordered={false} style={{ borderRadius: 16 }}>
        <ResponsiveTable
          dataSource={filtered}
          rowKey="key"
          pagination={false}
          size="small"
          scroll={{ x: 820 }}
          locale={{ emptyText: <div style={{ padding: '24px 0' }}>{emptyBlock}</div> }}
          mobileEmpty={<div style={{ padding: '24px 0' }}>{emptyBlock}</div>}
          renderMobileItem={(record: FeeRow) => (
            <div key={record.key} className="responsive-record-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Tag color="blue" style={{ margin: 0 }}>{record.student}</Tag>
                    <Text strong style={{ fontSize: 14 }} ellipsis>{record.course}</Text>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: '#9A8E7A' }}>{record.type}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1, color: record.status === 'paid' ? '#27a644' : '#E8784A', fontVariantNumeric: 'tabular-nums' }}>
                    ¥{record.amount.toLocaleString()}
                  </div>
                  <div style={{ marginTop: 5 }}>
                    {record.status === 'paid'
                      ? <Tag color="green" style={{ margin: 0 }}>已缴费</Tag>
                      : <Tag color="orange" style={{ margin: 0 }}>待缴费</Tag>}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #F0E7DE', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
                  <span style={{ color: '#9A8E7A' }}>账单日期</span>
                  <span style={{ fontWeight: 700, color: '#123C35', fontVariantNumeric: 'tabular-nums' }}>{record.date}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
                  <span style={{ color: '#9A8E7A' }}>缴费时间</span>
                  <span style={{ color: record.paidAt ? '#5A4E3A' : '#9A8E7A', fontVariantNumeric: 'tabular-nums' }}>{record.paidAt || '尚未缴费'}</span>
                </div>
              </div>
              {record.status === 'pending' && (
                <Button block style={{ marginTop: 12, minHeight: 44, borderRadius: 10, background: 'var(--color-primary)', border: 'none', color: 'var(--color-on-primary)', fontWeight: 700 }} onClick={handlePay} icon={<MessageOutlined />}>
                  咨询缴费方式
                </Button>
              )}
            </div>
          )}
          columns={[
            { title: '学员', dataIndex: 'student', key: 'student', render: (v: string) => <Tag color="blue">{v}</Tag> },
            { title: '课程', dataIndex: 'course', key: 'course' },
            { title: '金额', dataIndex: 'amount', key: 'amount', render: (v: number) => <Text strong style={{ fontSize: 16 }}>¥{v.toLocaleString()}</Text> },
            { title: '类型', dataIndex: 'type', key: 'type' },
            { title: '账单日期', dataIndex: 'date', key: 'date' },
            { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => s === 'paid' ? <Tag color="green">已缴费</Tag> : <Tag color="orange">待缴费</Tag> },
            { title: '缴费时间', dataIndex: 'paidAt', key: 'paidAt', render: (d: string | null) => d || '-' },
            { title: '操作', key: 'action', render: (_: unknown, r: FeeRow) => r.status === 'pending' ? <Button onClick={handlePay} icon={<MessageOutlined />}>咨询缴费方式</Button> : null },
          ]}
        />
      </Card>
    </div>
  )
}
