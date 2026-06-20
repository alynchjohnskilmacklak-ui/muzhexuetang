'use client'

import useSWR from 'swr'
import { Card, Switch, InputNumber, Divider, Typography } from 'antd'
import { toast } from 'sonner'
import { useState, useCallback } from 'react'

const { Text } = Typography
const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function NotifyTab() {
  const { data, isLoading, mutate } = useSWR('/api/settings/notify', fetcher)
  const [saving, setSaving] = useState(false)

  const patch = useCallback(async (values: Record<string, unknown>) => {
    setSaving(true)
    await fetch('/api/settings/notify', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values),
    })
    toast.success('通知设置已更新')
    mutate()
    setSaving(false)
  }, [mutate])

  if (!data) return null

  const config = data

  return (
    <Card bordered={false} style={{ borderRadius: 10 }} loading={isLoading}>
      <div style={{ maxWidth: 500 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
          <div><Text strong>试卷推送通知</Text><br /><Text type="secondary">向家长推送学生试卷</Text></div>
          <Switch checked={config.paperPush} onChange={(v) => patch({ paperPush: v })} loading={saving} />
        </div>
        <Divider style={{ margin: '4px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
          <div><Text strong>旷课提醒</Text><br /><Text type="secondary">学员旷课时发送通知</Text></div>
          <Switch checked={config.absenceAlert} onChange={(v) => patch({ absenceAlert: v })} loading={saving} />
        </div>
        <Divider style={{ margin: '4px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
          <div><Text strong>低课时预警阈值</Text><br /><Text type="secondary">剩余课时低于此值时提醒</Text></div>
          <InputNumber
            value={config.lowHoursWarn}
            min={1}
            max={20}
            onChange={(v) => v !== null && patch({ lowHoursWarn: v })}
            style={{ width: 80 }}
          />
        </div>
        <Divider style={{ margin: '4px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
          <div><Text strong>在校表现推送</Text><br /><Text type="secondary">推送学生课堂表现动态</Text></div>
          <Switch checked={config.performancePush} onChange={(v) => patch({ performancePush: v })} loading={saving} />
        </div>
      </div>
    </Card>
  )
}
