'use client'

import { useEffect, useState } from 'react'
import { Button, Input, Modal, Select, Space, Typography, message } from 'antd'
import { DeleteOutlined, PlusOutlined, UndoOutlined } from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'
import { SchedulePeriod, SCHEDULE_PERIODS } from '@/lib/schedule-periods'

const { Text } = Typography
const TYPE_OPTIONS = [
  { value: 'CLASS', label: '上课' },
  { value: 'BREAK', label: '课间' },
  { value: 'BIG_BREAK', label: '大课间' },
  { value: 'LUNCH', label: '午休' },
]

export function SchedulePeriodSettingsModal({ open, periods, onClose, onSaved }: {
  open: boolean
  periods: SchedulePeriod[]
  onClose: () => void
  onSaved: () => void
}) {
  const isMobile = useIsMobile() ?? false
  const [rows, setRows] = useState<SchedulePeriod[]>(periods)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setRows(periods.map(period => ({ ...period })))
  }, [open, periods])

  const updateRow = (index: number, patch: Partial<SchedulePeriod>) => {
    setRows(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row))
  }

  const save = async () => {
    if (rows.some(row => !row.name.trim() || !row.start || !row.end || row.start >= row.end)) {
      message.error('请填写完整名称和有效起止时间')
      return
    }
    setSaving(true)
    try {
      const response = await fetch('/api/settings/schedule-periods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periods: rows }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '保存失败')
      message.success('时间段已更新，新生成的课表将使用新时间')
      onSaved()
      onClose()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="时间段设置"
      open={open}
      onCancel={onClose}
      onOk={save}
      okText="保存时间段"
      cancelText="取消"
      confirmLoading={saving}
      width={isMobile ? '100%' : 720}
      style={isMobile ? { top: 0, margin: 0, padding: 0, maxWidth: '100vw' } : undefined}
      styles={{ body: { maxHeight: isMobile ? 'calc(100dvh - 120px)' : '68vh', overflowY: 'auto', padding: isMobile ? 12 : 20 } }}
      destroyOnHidden
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          可按常规班、寒假班或暑假班调整。已生成课次不会被改动，新建或重新生成课表时生效。
        </Text>
        <Button size="small" icon={<UndoOutlined />} onClick={() => setRows(SCHEDULE_PERIODS.map(period => ({ ...period })))}>
          恢复默认
        </Button>
      </div>

      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        {rows.map((row, index) => (
          <div key={row.id} style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'minmax(0, 1fr) 96px 36px' : 'minmax(140px, 1fr) 110px 120px 120px 36px',
            gap: 8,
            alignItems: 'center',
            padding: isMobile ? 10 : '8px 10px',
            border: '1px solid var(--color-border, #EEE7E1)',
            borderRadius: 10,
            background: '#FCFBF9',
          }}>
            <Input value={row.name} aria-label="时间段名称" placeholder="时间段名称" onChange={event => updateRow(index, { name: event.target.value })} />
            <Select value={row.type} aria-label="时间段类型" options={TYPE_OPTIONS} onChange={type => updateRow(index, { type })} />
            {isMobile ? (
              <Button danger type="text" icon={<DeleteOutlined />} aria-label="删除时间段" disabled={rows.length === 1} onClick={() => setRows(current => current.filter((_, rowIndex) => rowIndex !== index))} />
            ) : (
              <>
                <Input type="time" value={row.start} aria-label="开始时间" onChange={event => updateRow(index, { start: event.target.value })} />
                <Input type="time" value={row.end} aria-label="结束时间" onChange={event => updateRow(index, { end: event.target.value })} />
                <Button danger type="text" icon={<DeleteOutlined />} aria-label="删除时间段" disabled={rows.length === 1} onClick={() => setRows(current => current.filter((_, rowIndex) => rowIndex !== index))} />
              </>
            )}
            {isMobile && (
              <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Input type="time" value={row.start} aria-label="开始时间" onChange={event => updateRow(index, { start: event.target.value })} />
                <Input type="time" value={row.end} aria-label="结束时间" onChange={event => updateRow(index, { end: event.target.value })} />
              </div>
            )}
          </div>
        ))}
      </Space>

      <Button
        block={isMobile}
        icon={<PlusOutlined />}
        style={{ marginTop: 12 }}
        onClick={() => setRows(current => [...current, {
          id: `custom-${Date.now()}`,
          name: '新时间段',
          type: 'CLASS',
          start: current.at(-1)?.end || '08:00',
          end: current.at(-1)?.end || '08:40',
        }])}
      >
        添加时间段
      </Button>
    </Modal>
  )
}
