'use client'

import useSWR from 'swr'
import { fetchJson } from '@/lib/fetch-json'
import { saveSettingsRequest } from '@/lib/settings-client'
import { Alert, Card, Table, Button, Modal, Form, Input, InputNumber, Space, Popconfirm, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useState } from 'react'

const fetcher = (url: string) => fetchJson(url)

export function RoomsTab() {
  const { data, error, isLoading, mutate } = useSWR('/api/rooms', fetcher)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<{ id: string; name: string; capacity: number; type: string } | null>(null)
  const [form] = Form.useForm()

  const handleSubmit = async (values: { name: string; capacity: number; type: string }) => {
    if (saving) return
    setSaving(true)
    try {
    if (editing) {
      if (!await saveSettingsRequest(`/api/rooms/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })) return
      message.success('教室已更新')
    } else {
      if (!await saveSettingsRequest('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })) return
      message.success('教室已添加')
    }
    setOpen(false)
    setEditing(null)
    form.resetFields()
    mutate()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!await saveSettingsRequest(`/api/rooms/${id}`, { method: 'DELETE' })) return
    message.success('已删除')
    void mutate()
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
    <Card bordered={false} style={{ borderRadius: 14 }}>
      {error && <Alert type="error" showIcon message="加载失败，请重试" description={error.message} action={<Button onClick={() => mutate()}>重试</Button>} style={{ marginBottom: 16 }} />}
      <Button
        type="primary"
        icon={<PlusOutlined />}
        style={{ marginBottom: 16,  }}
        onClick={() => { setEditing(null); form.resetFields(); setOpen(true) }}
      >添加教室</Button>
      <Table columns={columns} dataSource={Array.isArray(data) ? data : []} scroll={{ x: 480 }} rowKey="id" loading={isLoading} pagination={false} />
      <Modal
        title={editing ? '编辑教室' : '添加教室'}
        open={open}
        onCancel={() => { if (!saving) { setOpen(false); setEditing(null) } }}
        confirmLoading={saving} maskClosable={!saving} closable={!saving} onOk={() => form.submit()}
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
