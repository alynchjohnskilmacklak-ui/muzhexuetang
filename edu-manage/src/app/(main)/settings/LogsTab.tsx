'use client'

import useSWR from 'swr'
import { Card, Table, Input, Space, Typography, Tag } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useState } from 'react'

const { Text } = Typography

const roleColors: Record<string, string> = { admin: 'red', teacher: 'blue', parent: 'green' }
const roleLabels: Record<string, string> = { admin: '管理员', teacher: '教师', parent: '家长' }

interface LogEntry {
  id: string; user: string; role: string; action: string; detail: string; createdAt: string
}

export function LogsTab() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const params = new URLSearchParams({ page: String(page), pageSize: '20' })
  if (search) params.set('search', search)

  const { data, isLoading } = useSWR(`/api/settings/logs?${params}`, (url: string) => fetch(url).then((r) => r.json()))

  const columns = [
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 160, render: (v: string) => new Date(v).toLocaleString('zh-CN') },
    { title: '操作者', dataIndex: 'user', key: 'user', width: 100 },
    { title: '角色', dataIndex: 'role', key: 'role', width: 80, render: (v: string) => <Tag color={roleColors[v] || 'default'}>{roleLabels[v] || v}</Tag> },
    { title: '操作', dataIndex: 'action', key: 'action', width: 140 },
    { title: '详情', dataIndex: 'detail', key: 'detail', render: (v: string) => <Text type="secondary">{v || '-'}</Text> },
  ]

  return (
    <Card bordered={false} style={{ borderRadius: 10 }}>
      <Space style={{ marginBottom: 16 }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索操作或详情..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          style={{ width: 240 }}
        />
      </Space>
      <Table
        columns={columns}
        dataSource={data?.data || []}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: 20,
          total: data?.total || 0,
          onChange: setPage,
          showSizeChanger: false,
        }}
        scroll={{ x: 600 }}
      />
    </Card>
  )
}
