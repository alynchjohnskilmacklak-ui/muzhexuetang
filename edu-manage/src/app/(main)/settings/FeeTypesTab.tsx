'use client'

import useSWR from 'swr'
import { Card, Table, Button, Modal, Form, Input, Switch, Space, Popconfirm } from 'antd'
import { toast } from 'sonner'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useState } from 'react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function FeeTypesTab() {
  const { data, isLoading, mutate } = useSWR('/api/settings/fee-types', fetcher)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<{ id: string; name: string; description?: string } | null>(null)
  const [form] = Form.useForm()

  const handleSubmit = async (values: { name: string; description?: string }) => {
    if (editing) {
      await fetch(`/api/settings/fee-types/${editing.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values),
      })
      toast.success('已更新')
    } else {
      await fetch('/api/settings/fee-types', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values),
      })
      toast.success('已添加')
    }
    setOpen(false); setEditing(null); form.resetFields(); mutate()
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/settings/fee-types/${id}`, { method: 'DELETE' })
    if (!res.ok) { const e = await res.json(); toast.error(e.error) }
    else { toast.success('已删除'); mutate() }
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    await fetch(`/api/settings/fee-types/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive }),
    })
    mutate()
  }

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description', render: (v: string | null) => v || '-' },
    { title: '启用', dataIndex: 'isActive', key: 'isActive', render: (v: boolean, record: { id: string }) => <Switch checked={v} onChange={(checked) => toggleActive(record.id, checked)} /> },
    {
      title: '操作', key: 'actions', render: (_: unknown, record: { id: string; name: string; description?: string }) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(record); form.setFieldsValue(record); setOpen(true) }}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card bordered={false} style={{ borderRadius: 10 }}>
      <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16, background: '#E8784A' }} onClick={() => { setEditing(null); form.resetFields(); setOpen(true) }}>添加类型</Button>
      <Table columns={columns} dataSource={data || []} rowKey="id" loading={isLoading} pagination={false} />
      <Modal title={editing ? '编辑费用类型' : '添加费用类型'} open={open} onCancel={() => { setOpen(false); setEditing(null) }} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
