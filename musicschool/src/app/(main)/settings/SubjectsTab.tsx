'use client'

import useSWR from 'swr'
import { Card, Button, Input, Modal, Form, Popconfirm, Tag, Space, message, ColorPicker } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { useState } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface SubjectItem {
  id: string; name: string; color: string; textColor: string; isActive: boolean; order: number
}

function SortableTag({ subject, onEdit }: { subject: SubjectItem; onEdit: (s: SubjectItem) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: subject.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Tag
        color={subject.color}
        style={{ fontSize: 14, padding: '4px 12px', cursor: 'grab', margin: 4 }}
        closable
        onClose={(e) => { e.preventDefault(); onEdit(subject) }}
      >
        {subject.name}
      </Tag>
    </div>
  )
}

export function SubjectsTab() {
  const { data, isLoading, mutate } = useSWR<SubjectItem[]>('/api/settings/subjects', fetcher)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SubjectItem | null>(null)
  const [form] = Form.useForm()

  const sensors = useSensors(useSensor(PointerSensor))

  const handleSubmit = async (values: { name: string; color?: string; textColor?: string }) => {
    if (editing) {
      await fetch(`/api/settings/subjects/${editing.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values),
      })
      message.success('学科已更新')
    } else {
      await fetch('/api/settings/subjects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values),
      })
      message.success('学科已添加')
    }
    setOpen(false); setEditing(null); form.resetFields(); mutate()
  }

  const handleDelete = async (id: string, name: string) => {
    const res = await fetch(`/api/settings/subjects/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json()
      Modal.warning({ title: '无法删除', content: err.error || err.details || '该学科有关联数据' })
      return
    }
    message.success(`已删除「${name}」`)
    mutate()
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !data) return
    const oldIdx = data.findIndex((s) => s.id === active.id)
    const newIdx = data.findIndex((s) => s.id === over.id)
    const reordered = [...data]
    const [moved] = reordered.splice(oldIdx, 1)
    reordered.splice(newIdx, 0, moved)
    mutate(reordered, false)
    await fetch('/api/settings/subjects/reorder', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: reordered.map((s) => s.id) }),
    })
  }

  return (
    <Card bordered={false} style={{ borderRadius: 10 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} style={{ background: '#E8784A' }} onClick={() => { setEditing(null); form.resetFields(); setOpen(true) }}>添加学科</Button>
      </Space>

      <div style={{ minHeight: 60 }}>
        {isLoading ? null : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={(data || []).map((s) => s.id)} strategy={horizontalListSortingStrategy}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(data || []).map((s) => (
                  <div key={s.id} style={{ position: 'relative' }}>
                    <SortableTag subject={s} onEdit={(sub) => {
                      setEditing(sub)
                      form.setFieldsValue({ name: sub.name, color: sub.color, textColor: sub.textColor })
                      setOpen(true)
                    }} />
                    <Popconfirm title={`确定删除「${s.name}」？`} onConfirm={() => handleDelete(s.id, s.name)}>
                      <DeleteOutlined style={{ position: 'absolute', top: -4, right: -4, fontSize: 10, color: '#ff4d4f', cursor: 'pointer', background: '#fff', borderRadius: '50%', padding: 2 }} />
                    </Popconfirm>
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
        {!isLoading && (!data || data.length === 0) && (
          <div style={{ color: '#9a8e7a', padding: 24, textAlign: 'center' }}>暂无学科，点击上方按钮添加</div>
        )}
      </div>

      <Modal title={editing ? '编辑学科' : '添加学科'} open={open} onCancel={() => { setOpen(false); setEditing(null) }} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="学科名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="color" label="标签颜色"><ColorPicker format="hex" /></Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
