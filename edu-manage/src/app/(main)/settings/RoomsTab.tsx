'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Alert, Button, Card, Col, Empty, Form, Input, InputNumber, Popconfirm, Row, Spin, Statistic, message } from 'antd'
import { DeleteOutlined, EditOutlined, HolderOutlined, PlusOutlined } from '@ant-design/icons'
import { BrandModal } from '@/components/Common/BrandModal'
import { fetchJson } from '@/lib/fetch-json'
import { saveSettingsRequest } from '@/lib/settings-client'

type Room = { id: string; name: string; capacity: number; type: string }

const ROOM_ORDER_KEY = 'muzhe-room-order-v1'
const fetcher = (url: string) => fetchJson<Room[]>(url)

function SortableRoomCard({ room, onEdit, onDelete }: {
  room: Room
  onEdit: (room: Room) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: room.id })
  return (
    <article
      ref={setNodeRef}
      className="settings-room-card"
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 2 : undefined }}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="settings-room-drag-handle"
        aria-label={`按住拖动${room.name}调整位置`}
        title="按住拖动调整位置"
        {...attributes}
        {...listeners}
      >
        <HolderOutlined aria-hidden="true" />
      </button>
      <div className="settings-room-card-main">
        <div className="settings-room-card-heading">
          <h3>{room.name}</h3>
          <span className="settings-room-type">{room.type || '普通教室'}</span>
        </div>
        <p className="settings-room-capacity"><strong>{room.capacity || 0}</strong><span>人容量</span></p>
      </div>
      <div className="settings-room-card-actions">
        <Button icon={<EditOutlined />} onClick={() => onEdit(room)}>编辑</Button>
        <Popconfirm title="确定删除此教室？" onConfirm={() => onDelete(room.id)}>
          <Button danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </div>
    </article>
  )
}

function readRoomOrder() {
  try {
    const saved = localStorage.getItem(ROOM_ORDER_KEY)
    const parsed = saved ? JSON.parse(saved) : []
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function RoomsTab() {
  const { data, error, isLoading, mutate } = useSWR<Room[]>('/api/rooms', fetcher)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Room | null>(null)
  const [orderIds, setOrderIds] = useState<string[]>([])
  const [form] = Form.useForm()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => { setOrderIds(readRoomOrder()) }, [])

  const rooms = [...(Array.isArray(data) ? data : [])].sort((a, b) => {
    const rank = new Map<string, number>(orderIds.map((id, index) => [id, index]))
    return (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER)
  })

  const totalCapacity = rooms.reduce((acc, r) => acc + (r.capacity || 0), 0)
  const avgCapacity = rooms.length ? Math.round(totalCapacity / rooms.length) : 0

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const oldIndex = rooms.findIndex((room) => room.id === active.id)
    const newIndex = rooms.findIndex((room) => room.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const reordered = arrayMove(rooms, oldIndex, newIndex).map((room) => room.id)
    setOrderIds(reordered)
    try {
      localStorage.setItem(ROOM_ORDER_KEY, JSON.stringify(reordered))
      message.success('教室顺序已保存到当前浏览器')
    } catch {
      message.warning('顺序已调整，但当前浏览器无法保存')
    }
  }

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
      void mutate()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!await saveSettingsRequest(`/api/rooms/${id}`, { method: 'DELETE' })) return
    message.success('已删除')
    void mutate()
  }

  return (
    <section className="settings-room-directory">
      <header className="settings-room-directory-header">
        <div>
          <h2>教室管理</h2>
          <p>维护教室名称、容量和用途，拖动卡片调整列表顺序。</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setOpen(true) }}>
          添加教室
        </Button>
      </header>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={8}>
          <Card bordered={false} style={{ borderRadius: 10, background: '#fff', border: '1px solid #EDE9E1' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: '#8C827A' }}>教室总数</span>}
              value={rooms.length}
              suffix={<span style={{ fontSize: 12, color: '#8C827A' }}>间</span>}
              valueStyle={{ fontWeight: 700, color: '#14574D', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card bordered={false} style={{ borderRadius: 10, background: '#fff', border: '1px solid #EDE9E1' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: '#8C827A' }}>总容纳席位</span>}
              value={totalCapacity}
              suffix={<span style={{ fontSize: 12, color: '#8C827A' }}>人</span>}
              valueStyle={{ fontWeight: 700, color: '#17352F', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card bordered={false} style={{ borderRadius: 10, background: '#fff', border: '1px solid #EDE9E1' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: '#8C827A' }}>平均教室容量</span>}
              value={avgCapacity}
              suffix={<span style={{ fontSize: 12, color: '#8C827A' }}>人/间</span>}
              valueStyle={{ fontWeight: 700, color: '#8A6517', fontSize: 22 }}
            />
          </Card>
        </Col>
      </Row>

      {error && <Alert type="error" showIcon message="教室列表加载失败" description={error.message} action={<Button onClick={() => void mutate()}>重试</Button>} />}
      {isLoading ? (
        <div className="settings-room-loading"><Spin /></div>
      ) : rooms.length === 0 ? (
        <div className="settings-room-empty">
          <Empty description="还没有教室资料">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setOpen(true) }}>添加第一间教室</Button>
          </Empty>
        </div>
      ) : (
        <>
          <div className="settings-room-summary">共 {rooms.length} 间教室 <span>按住卡片右上角拖动，顺序保存在本浏览器</span></div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={rooms.map((room) => room.id)} strategy={rectSortingStrategy}>
              <div className="settings-room-grid">
                {rooms.map((room) => <SortableRoomCard key={room.id} room={room}
                  onEdit={(record) => { setEditing(record); form.setFieldsValue(record); setOpen(true) }}
                  onDelete={handleDelete} />)}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}

      <BrandModal
        title={editing ? '编辑教室' : '添加教室'}
        open={open}
        onCancel={() => { if (!saving) { setOpen(false); setEditing(null) } }}
        confirmLoading={saving}
        maskClosable={!saving}
        closable={!saving}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="教室名称" rules={[{ required: true, whitespace: true, message: '请填写教室名称' }]}>
            <Input maxLength={40} />
          </Form.Item>
          <Form.Item name="capacity" label="容量（人）">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="type" label="用途类型">
            <Input maxLength={40} placeholder="例如：普通教室" />
          </Form.Item>
        </Form>
      </BrandModal>
    </section>
  )
}
