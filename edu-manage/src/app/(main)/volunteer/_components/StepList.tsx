'use client'

import { Button, Popconfirm, Space, Switch, Tag } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'

export type GuideStepItem = {
  id: string
  order: number
  title: string
  content: string
  isPublished: boolean
}

export function StepList({
  steps,
  selectedId,
  published,
  onSelect,
  onAdd,
  onDelete,
  onPublishedChange,
}: {
  steps: GuideStepItem[]
  selectedId?: string
  published: boolean
  onSelect: (id: string) => void
  onAdd: () => void
  onDelete: (id: string) => void
  onPublishedChange: (value: boolean) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: '#1F2329', fontWeight: 700 }}>志愿填报指南</div>
          <div style={{ color: '#98A2B3', fontSize: 12 }}>家长端发布状态</div>
        </div>
        <Switch checked={published} onChange={onPublishedChange} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((step) => {
          const active = selectedId === step.id
          const empty = !step.content.trim()
          return (
            <div
              key={step.id}
              onClick={() => onSelect(step.id)}
              style={{
                display: 'grid',
                gridTemplateColumns: '28px 1fr auto',
                gap: 8,
                alignItems: 'center',
                padding: 10,
                borderRadius: 8,
                cursor: 'pointer',
                border: `1px solid ${active ? '#E8784A' : empty ? '#e03e2d66' : '#23252a'}`,
                background: active ? 'rgba(232,120,74,0.12)' : '#0f1011',
              }}
            >
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: active ? '#E8784A' : '#141516', display: 'grid', placeItems: 'center', color: '#1F2329', fontSize: 12 }}>{step.order}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#1F2329', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{step.title}</div>
                <Space size={4} wrap>
                  <Tag color={step.isPublished ? 'green' : 'default'}>{step.isPublished ? '已发布' : '草稿'}</Tag>
                  {empty && <Tag color="red">内容为空</Tag>}
                </Space>
              </div>
              <Popconfirm title="删除此步骤？" okText="删除" cancelText="取消" onConfirm={(event) => { event?.stopPropagation(); onDelete(step.id) }}>
                <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={(event) => event.stopPropagation()} />
              </Popconfirm>
            </div>
          )
        })}
      </div>

      <Button block icon={<PlusOutlined />} onClick={onAdd}>新增步骤</Button>
    </div>
  )
}
