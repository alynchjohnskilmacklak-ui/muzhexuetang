'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Input,
  Row,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  AlertOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { PageLayout } from '@/components/Layout/PageLayout'
import { useDivision } from '@/contexts/DivisionContext'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Text } = Typography

type RowData = {
  student: {
    id: string
    name: string
    grade: string | null
    remainHours: number
    division: string
  }
  term: {
    id: string
    name: string
    endDate: string
  }
  daysRemaining: number
  trigger: string[]
  followUp: {
    id: string
    status: string
    note: string | null
    nextFollowUpAt: string | null
  } | null
}

type RenewalsData = {
  renewals: RowData[]
  lowHoursWarn: number
}

const fetcher = async (url: string) => {
  const r = await fetch(url)
  const d = await r.json()
  if (!r.ok) throw new Error(d.error || '加载续费跟进失败')
  return d
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: '待联系',
  CONTACTED: '已联系',
  RENEWED: '已续费',
  NOT_RENEWING: '暂不续费',
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'orange',
  CONTACTED: 'blue',
  RENEWED: 'success',
  NOT_RENEWING: 'default',
}

export default function RenewalsPage() {
  const { division } = useDivision()
  const isMobile = useIsMobile() ?? false
  const { data, error, mutate, isLoading } = useSWR<RenewalsData>(
    `/api/renewals?division=${division}`,
    fetcher,
  )

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [form, setForm] = useState<
    Record<string, { status: string; note: string; nextFollowUpAt: string }>
  >({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const allList = useMemo(() => data?.renewals || [], [data])

  // KPI Statistics
  const stats = useMemo(() => {
    let pendingCount = 0
    let lowHoursCount = 0
    let termEndingCount = 0
    let renewedCount = 0

    allList.forEach((r) => {
      const currentStatus = form[r.student.id]?.status ?? r.followUp?.status ?? 'OPEN'
      if (currentStatus === 'OPEN') pendingCount++
      if (currentStatus === 'RENEWED') renewedCount++
      if (r.trigger.includes('LOW_HOURS')) lowHoursCount++
      if (r.trigger.some((t) => t.includes('TERM') || t.includes('END'))) termEndingCount++
    })

    return {
      total: allList.length,
      pending: pendingCount,
      lowHours: lowHoursCount,
      termEnding: termEndingCount,
      renewed: renewedCount,
    }
  }, [allList, form])

  // Filtered list
  const filteredList = useMemo(() => {
    return allList.filter((r) => {
      const currentStatus = form[r.student.id]?.status ?? r.followUp?.status ?? 'OPEN'
      if (statusFilter !== 'ALL' && currentStatus !== statusFilter) return false

      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const nameMatch = r.student.name.toLowerCase().includes(q)
        const gradeMatch = r.student.grade?.toLowerCase().includes(q)
        const termMatch = r.term.name.toLowerCase().includes(q)
        if (!nameMatch && !gradeMatch && !termMatch) return false
      }

      return true
    })
  }, [allList, statusFilter, search, form])

  const save = async (row: RowData) => {
    const f = form[row.student.id] || {
      status: row.followUp?.status || 'OPEN',
      note: row.followUp?.note || '',
      nextFollowUpAt: row.followUp?.nextFollowUpAt?.slice(0, 10) || '',
    }
    setSavingId(row.student.id)
    try {
      const r = await fetch(`/api/renewals?division=${row.student.division}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: row.student.id,
          termId: row.term.id,
          status: f.status,
          note: f.note,
          nextFollowUpAt: f.nextFollowUpAt || null,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || '保存失败')
      await mutate()
      message.success(`${row.student.name} 的跟进记录已保存`)
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSavingId(null)
    }
  }

  const columns: ColumnsType<RowData> = [
    {
      title: '学员',
      key: 'student',
      width: 140,
      render: (_, r) => (
        <Space size={8}>
          <Avatar
            icon={<UserOutlined />}
            style={{ backgroundColor: 'var(--color-primary, #14574D)', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--color-ink, #1F2329)' }}>
              {r.student.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-ink-muted, #8D806F)' }}>
              {r.student.grade || '未填年级'}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: '剩余课时',
      dataIndex: ['student', 'remainHours'],
      key: 'remainHours',
      width: 110,
      render: (v: number) => (
        <Text strong style={{ color: v <= (data?.lowHoursWarn || 3) ? '#E8784A' : 'inherit' }}>
          {v} 节
        </Text>
      ),
    },
    {
      title: '提醒原因',
      key: 'reason',
      width: 180,
      render: (_, r) => (
        <Space wrap size={4}>
          {r.trigger.map((t) => (
            <Tag
              key={t}
              color={t === 'LOW_HOURS' ? 'orange' : 'blue'}
              style={{ borderRadius: 6, margin: 0 }}
            >
              {t === 'LOW_HOURS' ? `低于 ${data?.lowHoursWarn ?? 3} 课时` : `批次剩 ${r.daysRemaining} 天`}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '所属批次',
      dataIndex: ['term', 'name'],
      key: 'term',
      width: 140,
      render: (name: string, r) => (
        <div>
          <div style={{ fontSize: 13, color: 'var(--color-ink, #1F2329)' }}>{name}</div>
          <div style={{ fontSize: 11, color: 'var(--color-ink-muted, #8D806F)' }}>
            截止 {r.term.endDate ? dayjs(r.term.endDate).format('YYYY-MM-DD') : '-'}
          </div>
        </div>
      ),
    },
    {
      title: '跟进状态',
      key: 'status',
      width: 130,
      render: (_, r) => {
        const f = form[r.student.id]
        const currentVal = f?.status || r.followUp?.status || 'OPEN'
        return (
          <Select
            value={currentVal}
            onChange={(status) =>
              setForm((prev) => ({
                ...prev,
                [r.student.id]: {
                  status,
                  note: f?.note ?? r.followUp?.note ?? '',
                  nextFollowUpAt: f?.nextFollowUpAt ?? r.followUp?.nextFollowUpAt?.slice(0, 10) ?? '',
                },
              }))
            }
            options={Object.entries(STATUS_LABELS).map(([value, label]) => ({
              value,
              label: (
                <Tag color={STATUS_COLORS[value]} style={{ margin: 0 }}>
                  {label}
                </Tag>
              ),
            }))}
            style={{ width: '100%' }}
          />
        )
      },
    },
    {
      title: '沟通记录',
      key: 'note',
      render: (_, r) => {
        const f = form[r.student.id]
        return (
          <Input.TextArea
            value={f?.note ?? r.followUp?.note ?? ''}
            rows={2}
            maxLength={1200}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                [r.student.id]: {
                  status: f?.status ?? r.followUp?.status ?? 'OPEN',
                  note: e.target.value,
                  nextFollowUpAt: f?.nextFollowUpAt ?? r.followUp?.nextFollowUpAt?.slice(0, 10) ?? '',
                },
              }))
            }
            placeholder="登记家长沟通意向、待续费科目与考量点..."
            style={{ borderRadius: 8, fontSize: 13 }}
          />
        )
      },
    },
    {
      title: '下次联系',
      key: 'next',
      width: 140,
      render: (_, r) => {
        const f = form[r.student.id]
        const dateVal = f?.nextFollowUpAt ?? r.followUp?.nextFollowUpAt?.slice(0, 10) ?? ''
        return (
          <DatePicker
            value={dateVal ? dayjs(dateVal) : null}
            onChange={(d) =>
              setForm((prev) => ({
                ...prev,
                [r.student.id]: {
                  status: f?.status ?? r.followUp?.status ?? 'OPEN',
                  note: f?.note ?? r.followUp?.note ?? '',
                  nextFollowUpAt: d ? d.format('YYYY-MM-DD') : '',
                },
              }))
            }
            placeholder="下次日期"
            style={{ width: '100%', borderRadius: 8 }}
          />
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      fixed: 'right',
      render: (_, r) => (
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={savingId === r.student.id}
          onClick={() => void save(r)}
          style={{
            background: 'var(--color-primary, #14574D)',
            borderColor: 'var(--color-primary, #14574D)',
            borderRadius: 8,
          }}
        >
          保存
        </Button>
      ),
    },
  ]

  return (
    <PageLayout
      title="续费跟进"
      subtitle="课时告急预警与批次临期跟进台账，支持快速记录家长意向与下次跟进日程"
      actions={
        <Button icon={<ReloadOutlined />} onClick={() => mutate()} loading={isLoading}>
          刷新
        </Button>
      }
    >
      {error && (
        <Alert
          type="error"
          showIcon
          message={error instanceof Error ? error.message : '加载续费跟进失败'}
          style={{ marginBottom: 16, borderRadius: 10 }}
        />
      )}

      {/* 4 KPI Metrics */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card
            className="pressable"
            bordered={false}
            style={{
              borderRadius: 12,
              border: statusFilter === 'OPEN' ? '2px solid #E8784A' : '1px solid #EEE7E1',
              background: '#FFF9F5',
              cursor: 'pointer',
            }}
            styles={{ body: { padding: '14px 16px' } }}
            onClick={() => setStatusFilter(statusFilter === 'OPEN' ? 'ALL' : 'OPEN')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#8D806F' }}>待联系跟进</span>
              <AlertOutlined style={{ color: '#E8784A', fontSize: 15 }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#E8784A', marginTop: 4 }}>
              {stats.pending}
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card
            className="pressable"
            bordered={false}
            style={{
              borderRadius: 12,
              border: '1px solid #EEE7E1',
              background: '#FEF2F2',
              cursor: 'default',
            }}
            styles={{ body: { padding: '14px 16px' } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#8D806F' }}>课时告急</span>
              <ClockCircleOutlined style={{ color: '#DC2626', fontSize: 15 }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#DC2626', marginTop: 4 }}>
              {stats.lowHours}
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card
            className="pressable"
            bordered={false}
            style={{
              borderRadius: 12,
              border: '1px solid #EEE7E1',
              background: '#EFF6FF',
              cursor: 'default',
            }}
            styles={{ body: { padding: '14px 16px' } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#8D806F' }}>批次临期</span>
              <CalendarOutlined style={{ color: '#2563EB', fontSize: 15 }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#2563EB', marginTop: 4 }}>
              {stats.termEnding}
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card
            className="pressable"
            bordered={false}
            style={{
              borderRadius: 12,
              border: statusFilter === 'RENEWED' ? '2px solid #27A644' : '1px solid #EEE7E1',
              background: '#F0FDF4',
              cursor: 'pointer',
            }}
            styles={{ body: { padding: '14px 16px' } }}
            onClick={() => setStatusFilter(statusFilter === 'RENEWED' ? 'ALL' : 'RENEWED')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#8D806F' }}>已续费</span>
              <CheckCircleOutlined style={{ color: '#27A644', fontSize: 15 }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#27A644', marginTop: 4 }}>
              {stats.renewed}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Filter and Search Bar */}
      <Card
        bordered={false}
        style={{ borderRadius: 12, border: '1px solid #EEE7E1', marginBottom: 16 }}
        styles={{ body: { padding: 14 } }}
      >
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Segmented
            value={statusFilter}
            onChange={(val) => setStatusFilter(String(val))}
            options={[
              { label: `全部 (${allList.length})`, value: 'ALL' },
              { label: `待联系 (${stats.pending})`, value: 'OPEN' },
              { label: '已联系', value: 'CONTACTED' },
              { label: `已续费 (${stats.renewed})`, value: 'RENEWED' },
              { label: '暂不续费', value: 'NOT_RENEWING' },
            ]}
          />
          <Input
            prefix={<SearchOutlined style={{ color: '#8D806F' }} />}
            placeholder="搜索学员姓名、年级或批次..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: isMobile ? '100%' : 260, borderRadius: 8 }}
          />
        </Space>
      </Card>

      {/* Content Area: Mobile Cards or Desktop Table */}
      {isMobile ? (
        <div style={{ display: 'grid', gap: 12 }}>
          {filteredList.length === 0 ? (
            <Card style={{ borderRadius: 14 }}>
              <Empty description="暂无符合条件的续费跟进记录" />
            </Card>
          ) : (
            filteredList.map((r) => {
              const f = form[r.student.id]
              const currentStatus = f?.status || r.followUp?.status || 'OPEN'
              const dateVal = f?.nextFollowUpAt ?? r.followUp?.nextFollowUpAt?.slice(0, 10) ?? ''

              return (
                <Card
                  key={r.student.id}
                  style={{
                    borderRadius: 14,
                    border: '1px solid #EEE7E1',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  }}
                  styles={{ body: { padding: 14 } }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <Space size={8}>
                      <Avatar
                        icon={<UserOutlined />}
                        style={{ backgroundColor: 'var(--color-primary, #14574D)' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: '#1F2329' }}>
                          {r.student.name}
                        </div>
                        <div style={{ fontSize: 12, color: '#8D806F' }}>
                          {r.student.grade || '未填年级'} · 剩余{' '}
                          <span style={{ color: '#E8784A', fontWeight: 600 }}>
                            {r.student.remainHours}
                          </span>{' '}
                          节
                        </div>
                      </div>
                    </Space>
                    <Tag color={STATUS_COLORS[currentStatus]} style={{ margin: 0 }}>
                      {STATUS_LABELS[currentStatus]}
                    </Tag>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {r.trigger.map((t) => (
                      <Tag
                        key={t}
                        color={t === 'LOW_HOURS' ? 'orange' : 'blue'}
                        style={{ borderRadius: 6, margin: 0 }}
                      >
                        {t === 'LOW_HOURS'
                          ? `低于 ${data?.lowHoursWarn ?? 3} 课时`
                          : `批次剩 ${r.daysRemaining} 天`}
                      </Tag>
                    ))}
                    <Tag style={{ borderRadius: 6, margin: 0 }}>{r.term.name}</Tag>
                  </div>

                  <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Select
                        value={currentStatus}
                        onChange={(status) =>
                          setForm((prev) => ({
                            ...prev,
                            [r.student.id]: {
                              status,
                              note: f?.note ?? r.followUp?.note ?? '',
                              nextFollowUpAt: f?.nextFollowUpAt ?? r.followUp?.nextFollowUpAt?.slice(0, 10) ?? '',
                            },
                          }))
                        }
                        options={Object.entries(STATUS_LABELS).map(([value, label]) => ({
                          value,
                          label: STATUS_LABELS[value],
                        }))}
                        style={{ width: 120 }}
                      />
                      <DatePicker
                        value={dateVal ? dayjs(dateVal) : null}
                        onChange={(d) =>
                          setForm((prev) => ({
                            ...prev,
                            [r.student.id]: {
                              status: f?.status ?? r.followUp?.status ?? 'OPEN',
                              note: f?.note ?? r.followUp?.note ?? '',
                              nextFollowUpAt: d ? d.format('YYYY-MM-DD') : '',
                            },
                          }))
                        }
                        placeholder="下次跟进"
                        style={{ flex: 1, borderRadius: 8 }}
                      />
                    </div>

                    <Input.TextArea
                      value={f?.note ?? r.followUp?.note ?? ''}
                      rows={2}
                      maxLength={1200}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          [r.student.id]: {
                            status: f?.status ?? r.followUp?.status ?? 'OPEN',
                            note: e.target.value,
                            nextFollowUpAt: f?.nextFollowUpAt ?? r.followUp?.nextFollowUpAt?.slice(0, 10) ?? '',
                          },
                        }))
                      }
                      placeholder="登记家长沟通意向..."
                      style={{ borderRadius: 8, fontSize: 13 }}
                    />

                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      block
                      loading={savingId === r.student.id}
                      onClick={() => void save(r)}
                      style={{
                        background: 'var(--color-primary, #14574D)',
                        borderColor: 'var(--color-primary, #14574D)',
                        borderRadius: 8,
                        marginTop: 4,
                      }}
                    >
                      保存记录
                    </Button>
                  </div>
                </Card>
              )
            })
          )}
        </div>
      ) : (
        <Card style={{ borderRadius: 14, border: '1px solid #EEE7E1' }}>
          {filteredList.length === 0 ? (
            <Empty description="暂无符合条件的续费跟进记录" />
          ) : (
            <Table
              rowKey={(r) => r.student.id}
              dataSource={filteredList}
              columns={columns}
              scroll={{ x: 1000 }}
              pagination={{ pageSize: 20, showTotal: (total) => `共 ${total} 位学员` }}
            />
          )}
        </Card>
      )}
    </PageLayout>
  )
}
