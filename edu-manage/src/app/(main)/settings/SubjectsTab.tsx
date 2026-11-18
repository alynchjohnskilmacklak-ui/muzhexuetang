'use client'

import useSWR from 'swr'
import { fetchJson } from '@/lib/fetch-json'
import { saveSettingsRequest } from '@/lib/settings-client'
import { Alert, Card, Button, Input, Form, Popconfirm, Tag, Space, Spin, message, ColorPicker } from 'antd'
import { BrandModal } from '@/components/Common/BrandModal'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useState } from 'react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, horizontalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const fetcher = (url: string) => fetchJson<SubjectItem[]>(url)

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
    <div ref={setNodeRef} style={{ ...style, display: 'flex', alignItems: 'center' }}>
      <span {...attributes} {...listeners} aria-label={`拖动排序：${subject.name}`} style={{ cursor: 'grab', padding: 12, minHeight: 44 }}>⋮⋮</span>
      <Tag
        color={subject.color}
        style={{ fontSize: 14, padding: '4px 12px', cursor: 'grab', margin: 4 }}
      >
        {subject.name}
      </Tag>
      <Button type="text" icon={<EditOutlined />} aria-label={`编辑${subject.name}`} onClick={() => onEdit(subject)} style={{ minHeight: 44 }}>编辑</Button>
    </div>
  )
}

export function SubjectsTab() {
  const { data, error, isLoading, mutate } = useSWR<SubjectItem[]>('/api/settings/subjects', fetcher)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<SubjectItem | null>(null)
  const [form] = Form.useForm()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleSubmit = async (values: { name: string; color?: string; textColor?: string }) => {
    if (saving) return
    setSaving(true)
    try {
    if (editing) {
      if (!await saveSettingsRequest(`/api/settings/subjects/${editing.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values),
      })) return
      message.success('学科已更新')
    } else {
      if (!await saveSettingsRequest('/api/settings/subjects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values),
      })) return
      message.success('学科已添加')
    }
    setOpen(false); setEditing(null); form.resetFields(); mutate()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!await saveSettingsRequest(`/api/settings/subjects/${id}`, { method: 'DELETE' })) return
    message.success('已删除')
    void mutate()
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
    if (!await saveSettingsRequest('/api/settings/subjects/reorder', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: reordered.map((s) => s.id) }),
    })) { await mutate(); return }
  }

  return (
    <Card bordered={false} style={{ borderRadius: 14 }}>
      {error && <Alert type="error" showIcon message="加载失败，请重试" description={error.message} action={<Button onClick={() => mutate()}>重试</Button>} style={{ marginBottom: 16 }} />}
      <Alert type="info" showIcon message="学科目录只维护名称、标签与顺序，不会修改教材和题库目录；已被课程使用的学科不能直接改名。" style={{ marginBottom: 16 }} />
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} style={{  }} onClick={() => { setEditing(null); form.resetFields(); setOpen(true) }}>添加学科</Button>
      </Space>

      <div style={{ minHeight: 60 }}>
        {isLoading ? <Spin /> : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={(data || []).map((s) => s.id)} strategy={horizontalListSortingStrategy}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(data || []).map((s) => (
                  <div key={s.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', maxWidth: '100%' }}>
                    <SortableTag subject={s} onEdit={(sub) => {
                      setEditing(sub)
                      form.setFieldsValue({ name: sub.name, color: sub.color, textColor: sub.textColor })
                      setOpen(true)
                    }} />
                    <Popconfirm title={`确定删除「${s.name}」？`} onConfirm={() => handleDelete(s.id)}>
                      <Button danger type="text" icon={<DeleteOutlined />} aria-label={`删除${s.name}`} style={{ minHeight: 44 }}>删除</Button>
                    </Popconfirm>
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
        {!error && !isLoading && (!data || data.length === 0) && (
          <div style={{ color: '#9a8e7a', padding: 24, textAlign: 'center' }}>暂无学科，点击上方按钮添加</div>
        )}
      </div>

      <BrandModal title={editing ? '编辑学科' : '添加学科'} open={open} onCancel={() => { if (!saving) { setOpen(false); setEditing(null) } }} confirmLoading={saving} maskClosable={!saving} closable={!saving} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="学科名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="color" label="标签颜色" getValueFromEvent={(_, hex: string) => hex}><ColorPicker format="hex" /></Form.Item>
        </Form>
      </BrandModal>
    </Card>
  )
}
