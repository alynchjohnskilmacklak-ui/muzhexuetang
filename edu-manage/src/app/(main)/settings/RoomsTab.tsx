'use client'

import useSWR from 'swr'
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Space, Popconfirm } from 'antd'
import { toast } from 'sonner'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useState } from 'react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function RoomsTab() {
  const { data, isLoading, mutate } = useSWR('/api/rooms', fetcher)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<{ id: string; name: string; capacity: number; type: string } | null>(null)
  const [form] = Form.useForm()

  const handleSubmit = async (values: { name: string; capacity: number; type: string }) => {
    if (editing) {
      await fetch(`/api/rooms/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      toast.success('教室已更新')
    } else {
      await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      toast.success('教室已添加')
    }
    setOpen(false)
    setEditing(null)
    form.resetFields()
    mutate()
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/rooms/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error || '删除失败')
    } else {
      toast.success('教室已删除')
      mutate()
    }
  }

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '容量', dataIndex: 'capacity', key: 'capacity' },
    { title: '类型', dataIndex: 'type', key: 'type' },
    {
      title: '操作', key: 'actions', render: (_: unknown, record: { id: string; name: string; capacity: number; type: string }) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(record); form.setFieldsValue(record); setOpen(true) }}>编辑</Button>
          <Popconfirm title="确定删除此教室？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card bordered={false} style={{ borderRadius: 10 }}>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        style={{ marginBottom: 16, background: '#E8784A' }}
        onClick={() => { setEditing(null); form.resetFields(); setOpen(true) }}
      >添加教室</Button>
      <Table columns={columns} dataSource={data || []} rowKey="id" loading={isLoading} pagination={false} />
      <Modal
        title={editing ? '编辑教室' : '添加教室'}
        open={open}
        onCancel={() => { setOpen(false); setEditing(null) }}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="capacity" label="容量"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="type" label="类型"><Input /></Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
