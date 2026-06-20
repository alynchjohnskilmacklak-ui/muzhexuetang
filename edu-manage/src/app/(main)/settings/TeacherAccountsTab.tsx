'use client'

import useSWR from 'swr'
import { Alert, Button, Card, Popconfirm, Space, Table, Tag, Typography } from 'antd'
import { toast } from 'sonner'
import { StopOutlined } from '@ant-design/icons'

type AccountStatus = 'active' | 'disabled' | string

interface UserAccount {
  id: string
  email: string
  name: string
  status: AccountStatus
  lastLoginAt: string | null
  createdAt: string
}

interface AccountsResponse {
  accounts: UserAccount[]
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '请求失败')
  return data
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('zh-CN') : '-'
}

function statusTag(status: AccountStatus) {
  return <Tag color={status === 'active' ? 'green' : 'red'}>{status === 'active' ? '正常' : '已停用'}</Tag>
}

export function TeacherAccountsTab() {
  const { data, isLoading, mutate } = useSWR<AccountsResponse>('/api/settings/teacher-accounts', fetcher)

  const changeStatus = async (record: UserAccount, status: 'active' | 'disabled') => {
    try {
      const res = await fetch(`/api/users/${record.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || '操作失败')
      toast.success(status === 'active' ? '账号已恢复' : '账号已停用')
      mutate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  const columns = [
    { title: '姓名', dataIndex: 'name', key: 'name', width: 140 },
    { title: '邮箱（拼音@tea.com）', dataIndex: 'email', key: 'email', width: 240 },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: statusTag },
    { title: '最近登录', dataIndex: 'lastLoginAt', key: 'lastLoginAt', width: 180, render: formatDate },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: unknown, record: UserAccount) => record.status === 'active' ? (
        <Popconfirm title="确定停用该教师账号？" onConfirm={() => changeStatus(record, 'disabled')}>
          <Button size="small" danger icon={<StopOutlined />}>停用</Button>
        </Popconfirm>
      ) : (
        <Button size="small" onClick={() => changeStatus(record, 'active')}>恢复</Button>
      ),
    },
  ]

  return (
    <Card bordered={false} style={{ borderRadius: 10 }}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>教师登录账号</Typography.Title>
        <Alert
          type="info"
          message="教师账号由系统自动创建，邮箱格式为「拼音@tea.com」，初始密码为手机号后6位。停用后教师将立即无法登录，直到恢复。"
          style={{ marginBottom: 12 }}
          showIcon
        />
        <Table
          columns={columns}
          dataSource={data?.accounts || []}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
        />
      </Space>
    </Card>
  )
}
