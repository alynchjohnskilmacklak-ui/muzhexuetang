'use client'

import { useEffect, useState } from 'react'
import { Button, Card, Col, Empty, Input, message, Modal, Pagination, Row, Segmented, Space, Statistic, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined, SafetyOutlined, SearchOutlined } from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { useIsMobile } from '@/hooks/useIsMobile'
import { isUserDisabled } from '@/lib/user-status'

const { Text } = Typography

type LoginRecordRow = {
  id: string
  division: 'JUNIOR' | 'SENIOR'
  email: string
  success: boolean
  failReason?: string
  ip?: string
  device?: string
  os?: string
  browser?: string
  createdAt: string
  userId?: string
  userName?: string
  userRole?: string
  userStatus?: string
}

type Stats = {
  todayTotal: number
  todayFail: number
  lockedCount: number
}

export default function LoginRecordsPage() {
  const isMobile = useIsMobile() ?? false
  const [records, setRecords] = useState<LoginRecordRow[]>([])
  const [stats, setStats] = useState<Stats>({ todayTotal: 0, todayFail: 0, lockedCount: 0 })
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string>('')
  const [division, setDivision] = useState<'ALL' | 'JUNIOR' | 'SENIOR'>('ALL')
  const [search, setSearch] = useState('')

  const fetchRecords = async (nextPage = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: '50',
      })
      if (success) params.set('success', success)
      params.set('division', division)
      if (search.trim()) params.set('search', search.trim())

      const res = await fetch(`/api/login-records?${params.toString()}`)
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      setRecords(data.records || [])
      setStats(data.stats || { todayTotal: 0, todayFail: 0, lockedCount: 0 })
      setTotal(data.total || 0)
      setPage(nextPage)
    } catch {
      message.error('登录记录加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success, division])

  const handleToggleStatus = async (row: LoginRecordRow) => {
    const isDisabled = isUserDisabled(row.userStatus)
    const action = isDisabled ? '恢复' : '禁用'

    Modal.confirm({
      title: `确认${action}该账号？`,
      content: isDisabled
        ? '恢复后该用户可以重新登录'
        : '禁用后该用户将立即被强制退出，且无法重新登录，直到管理员恢复',
      okText: `确认${action}`,
      cancelText: '取消',
      okButtonProps: { danger: !isDisabled },
      onOk: async () => {
        const newStatus = isDisabled ? 'active' : 'disabled'
        const res = await fetch(`/api/users/${row.userId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, division: row.division }),
        })
        if (res.ok) {
          message.success(`账号已${action}`)
          fetchRecords()
        } else {
          const data = await res.json().catch(() => null)
          message.error(data?.error || '操作失败，请重试')
        }
      },
    })
  }

  const columns: ColumnsType<LoginRecordRow> = [
    {
      title: '用户',
      dataIndex: 'email',
      render: (email: string, row) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Text strong style={{ fontSize: 14 }}>{row.userName || email}</Text>
            {row.userStatus && isUserDisabled(row.userStatus) && (
              <Tag color="error" style={{ fontSize: 10, padding: '0 4px' }}>已禁用</Tag>
            )}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>{email}</Text>
        </div>
      ),
    },
    {
      title: '学部',
      dataIndex: 'division',
      width: 80,
      render: (value: LoginRecordRow['division']) => (
        <Tag color={value === 'JUNIOR' ? 'orange' : 'blue'}>
          {value === 'JUNIOR' ? '初中' : '高中'}
        </Tag>
      ),
    },
    {
      title: '角色',
      dataIndex: 'userRole',
      width: 90,
      render: (role: string) => {
        const map: Record<string, { label: string; color: string }> = {
          admin: { label: '管理员', color: 'red' },
          teacher: { label: '教师', color: 'blue' },
          parent: { label: '家长', color: 'green' },
        }
        const item = map[role] || { label: '未知', color: 'default' }
        return <Tag color={item.color}>{item.label}</Tag>
      },
    },
    {
      title: '结果',
      dataIndex: 'success',
      width: 110,
      render: (ok: boolean, row) => {
        if (ok) {
          return row.failReason === 'session_resume'
            ? <Tag color="processing">免密访问</Tag>
            : <Tag color="success">密码登录</Tag>
        }
        const reasonMap: Record<string, string> = {
          wrong_password: '密码错误',
          not_found: '账号不存在',
          locked: '账号锁定',
          disabled: '账号禁用',
        }
        return <Tag color="error">{reasonMap[row.failReason || ''] || '登录失败'}</Tag>
      },
    },
    {
      title: '设备',
      dataIndex: 'device',
      render: (device: string, row) => (
        <div>
          <Text style={{ fontSize: 13 }}>{device || '未知设备'}</Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{row.os || row.browser || '未知系统'}</Text>
        </div>
      ),
    },
    {
      title: 'IP 地址',
      dataIndex: 'ip',
      width: 140,
      render: (ip: string) => <Text style={{ fontSize: 13, fontFamily: 'monospace' }}>{ip || '-'}</Text>,
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (t: string) => (
        <Text style={{ fontSize: 12 }}>
          {new Date(t).toLocaleDateString('zh-CN')}
          <br />
          {new Date(t).toLocaleTimeString('zh-CN')}
        </Text>
      ),
    },
    {
      title: '操作',
      width: 130,
      render: (_: unknown, row: LoginRecordRow) => {
        if (!row.userId) return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>

        return (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {isUserDisabled(row.userStatus) ? (
              <Button
                size="small"
                style={{
                  color: '#27a644',
                  borderColor: '#27a644',
                  fontSize: 12,
                }}
                onClick={() => handleToggleStatus(row)}
              >
                恢复账号
              </Button>
            ) : (
              <Button
                size="small"
                danger
                type="text"
                style={{ fontSize: 12 }}
                onClick={() => handleToggleStatus(row)}
              >
                禁用账号
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <PageLayout
      title="登录记录"
      subtitle="查看全校管理员、教师及家长的登录访问明细、安全状态与设备审计"
      actions={
        <Button icon={<ReloadOutlined />} onClick={() => fetchRecords()} loading={loading}>
          刷新
        </Button>
      }
    >
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={8}>
          <Card bordered={false} style={{ borderRadius: 10, border: '1px solid #EDE9E1', background: '#fff' }}>
            <Statistic
              title={<span style={{ fontSize: isMobile ? 11 : 12, color: '#8C827A' }}>今日成功访问</span>}
              value={stats.todayTotal}
              suffix={<span style={{ fontSize: 12, color: '#8C827A' }}>次</span>}
              valueStyle={{ fontWeight: 700, color: '#14574D', fontSize: isMobile ? 20 : 24 }}
              prefix={<SafetyOutlined style={{ fontSize: 16, color: '#14574D' }} />}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card bordered={false} style={{ borderRadius: 10, border: `1px solid ${stats.todayFail > 0 ? '#F3D2BA' : '#EDE9E1'}`, background: stats.todayFail > 0 ? '#FFF7F0' : '#fff' }}>
            <Statistic
              title={<span style={{ fontSize: isMobile ? 11 : 12, color: stats.todayFail > 0 ? '#C45724' : '#8C827A' }}>今日失败次数</span>}
              value={stats.todayFail}
              suffix={<span style={{ fontSize: 12, color: stats.todayFail > 0 ? '#C45724' : '#8C827A' }}>次</span>}
              valueStyle={{ fontWeight: 700, color: stats.todayFail > 0 ? '#E8784A' : '#17352F', fontSize: isMobile ? 20 : 24 }}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card bordered={false} style={{ borderRadius: 10, border: `1px solid ${stats.lockedCount > 0 ? '#FCD3D1' : '#EDE9E1'}`, background: stats.lockedCount > 0 ? '#FFF5F5' : '#fff' }}>
            <Statistic
              title={<span style={{ fontSize: isMobile ? 11 : 12, color: stats.lockedCount > 0 ? '#CF1322' : '#8C827A' }}>当前锁定账号</span>}
              value={stats.lockedCount}
              suffix={<span style={{ fontSize: 12, color: stats.lockedCount > 0 ? '#CF1322' : '#8C827A' }}>个</span>}
              valueStyle={{ fontWeight: 700, color: stats.lockedCount > 0 ? '#CF1322' : '#17352F', fontSize: isMobile ? 20 : 24 }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        size="small"
        title="登录明细"
        extra={
          <Space wrap>
            <Segmented
              size="small"
              aria-label="登录记录学部筛选"
              value={division}
              onChange={setDivision}
              options={[
                { value: 'ALL', label: '全部学部' },
                { value: 'JUNIOR', label: '初中部' },
                { value: 'SENIOR', label: '高中部' },
              ]}
            />
            <Segmented
              size="small"
              aria-label="登录结果筛选"
              value={success}
              onChange={setSuccess}
              options={[
                { value: '', label: '全部' },
                { value: 'true', label: '仅成功' },
                { value: 'false', label: '仅失败' },
              ]}
            />
            <Input.Search
              allowClear
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onSearch={() => fetchRecords(1)}
              placeholder="搜索邮箱或姓名"
              prefix={<SearchOutlined />}
              style={{ width: isMobile ? '100%' : 200 }}
            />
          </Space>
        }
      >
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {records.length > 0 ? (
              records.map((row) => {
                const isDisabled = isUserDisabled(row.userStatus)
                return (
                  <Card
                    key={`${row.division}:${row.id}`}
                    size="small"
                    style={{ borderRadius: 10, border: '1px solid #EDE9E1', background: '#FAFAF8' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Text strong style={{ fontSize: 14 }}>{row.userName || row.email}</Text>
                          {row.userStatus && isDisabled && (
                            <Tag color="error" style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>已禁用</Tag>
                          )}
                        </div>
                        <Text type="secondary" style={{ fontSize: 11 }}>{row.email}</Text>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <Tag color={row.division === 'JUNIOR' ? 'orange' : 'blue'} style={{ margin: 0 }}>
                          {row.division === 'JUNIOR' ? '初中' : '高中'}
                        </Tag>
                        {row.success ? (
                          <Tag color={row.failReason === 'session_resume' ? 'processing' : 'success'} style={{ margin: 0 }}>
                            {row.failReason === 'session_resume' ? '免密' : '成功'}
                          </Tag>
                        ) : (
                          <Tag color="error" style={{ margin: 0 }}>
                            {({ wrong_password: '密码错', not_found: '不存在', locked: '锁定', disabled: '禁用' } as Record<string, string>)[row.failReason || ''] || '失败'}
                          </Tag>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: 8, fontSize: 12, color: '#5A6578', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
                      <div>设备：{row.device || '未知设备'}</div>
                      <div>系统：{row.os || row.browser || '未知'}</div>
                      <div>IP：<span style={{ fontFamily: 'monospace' }}>{row.ip || '-'}</span></div>
                      <div>时间：{new Date(row.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>

                    {row.userId && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #EDE9E1', display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          size="small"
                          danger={!isDisabled}
                          style={{
                            fontSize: 12,
                            color: isDisabled ? '#27a644' : undefined,
                            borderColor: isDisabled ? '#27a644' : undefined,
                          }}
                          onClick={() => handleToggleStatus(row)}
                        >
                          {isDisabled ? '恢复账号' : '禁用账号'}
                        </Button>
                      </div>
                    )}
                  </Card>
                )
              })
            ) : (
              <Empty description="暂无登录记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
            {total > 50 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                <Pagination
                  size="small"
                  current={page}
                  pageSize={50}
                  total={total}
                  showSizeChanger={false}
                  onChange={(nextPage) => fetchRecords(nextPage)}
                />
              </div>
            )}
          </div>
        ) : (
          <Table
            rowKey={(row) => `${row.division}:${row.id}`}
            loading={loading}
            columns={columns}
            dataSource={records}
            scroll={{ x: 900 }}
            pagination={{
              current: page,
              pageSize: 50,
              total,
              showSizeChanger: false,
              onChange: (nextPage) => fetchRecords(nextPage),
            }}
          />
        )}
      </Card>
    </PageLayout>
  )
}
