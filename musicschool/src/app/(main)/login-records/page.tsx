'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Input, message, Modal, Select, Space, Statistic, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined, SafetyOutlined, SearchOutlined } from '@ant-design/icons'

const { Text, Title } = Typography

type LoginRecordRow = {
  id: string
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
  const [records, setRecords] = useState<LoginRecordRow[]>([])
  const [stats, setStats] = useState<Stats>({ todayTotal: 0, todayFail: 0, lockedCount: 0 })
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string>('')
  const [search, setSearch] = useState('')

  const fetchRecords = async (nextPage = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: '50',
      })
      if (success) params.set('success', success)
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
  }, [success])

  const handleToggleStatus = async (userId: string, currentStatus?: string) => {
    const isDisabled = currentStatus === 'disabled'
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
        const res = await fetch(`/api/users/${userId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
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

  const columns = useMemo<ColumnsType<LoginRecordRow>>(() => [
    {
      title: '用户',
      dataIndex: 'email',
      render: (email: string, row) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Text strong style={{ fontSize: 14 }}>{row.userName || email}</Text>
            {row.userStatus === 'disabled' && (
              <Tag color="error" style={{ fontSize: 10, padding: '0 4px' }}>已禁用</Tag>
            )}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>{email}</Text>
        </div>
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
        if (ok) return <Tag color="success">登录成功</Tag>
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
            {row.userStatus === 'disabled' ? (
              <Button
                size="small"
                style={{
                  color: '#27a644',
                  borderColor: '#27a644',
                  fontSize: 12,
                }}
                onClick={() => handleToggleStatus(row.userId!, row.userStatus)}
              >
                恢复账号
              </Button>
            ) : (
              <Button
                size="small"
                danger
                type="text"
                style={{ fontSize: 12 }}
                onClick={() => handleToggleStatus(row.userId!, row.userStatus)}
              >
                禁用账号
              </Button>
            )}
          </div>
        )
      },
    },
  ], [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>登录记录</Title>
          <Text type="secondary">查看登录成功、失败、锁定和设备信息</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => fetchRecords()} loading={loading}>刷新</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <Card size="small"><Statistic title="今日登录次数" value={stats.todayTotal} prefix={<SafetyOutlined />} /></Card>
        <Card size="small"><Statistic title="今日失败次数" value={stats.todayFail} valueStyle={{ color: '#cf1322' }} /></Card>
        <Card size="small"><Statistic title="当前锁定账号" value={stats.lockedCount} valueStyle={{ color: '#d46b08' }} /></Card>
      </div>

      <Card
        size="small"
        title="登录明细"
        extra={
          <Space wrap>
            <Select
              value={success}
              style={{ width: 120 }}
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
              style={{ width: 220 }}
            />
          </Space>
        }
      >
        <Table
          rowKey="id"
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
      </Card>
    </div>
  )
}
