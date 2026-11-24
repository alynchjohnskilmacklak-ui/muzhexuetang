'use client'

import { useEffect, useState } from 'react'
import { Alert, Button, Card, InputNumber, Space, Switch, Typography, message } from 'antd'

type NotifySettings = { absenceAlert: boolean; lowHoursWarn: number; overdueFeeAlert: boolean }

export function NotifyTab() {
  const [settings, setSettings] = useState<NotifySettings>({ absenceAlert: true, lowHoursWarn: 3, overdueFeeAlert: true })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/settings/notify')
      .then(async (response) => {
        if (!response.ok) throw new Error('加载通知设置失败')
        return response.json()
      })
      .then((data: NotifySettings) => { if (active) setSettings(data) })
      .catch(() => { if (active) message.error('加载通知设置失败') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings/notify', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || '保存失败')
      setSettings(result)
      message.success('通知规则已保存')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card style={{ borderRadius: 14, width: '100%' }}>
      <Typography.Title level={4}>家长提醒规则</Typography.Title>
      <Alert
        type="info"
        showIcon
        message="提醒会先进入家长端站内通知"
        description="绑定企业微信的家长会按现有通知队列收到提醒；未绑定的家长仍可在家长端查看。"
        style={{ marginBottom: 16 }}
      />
      <Space direction="vertical" size={18} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <Typography.Text strong>旷课提醒</Typography.Text>
            <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
              教师提交考勤并标记为旷课后，通知该学生绑定的家长。
            </Typography.Paragraph>
          </div>
          <Switch
            checked={settings.absenceAlert}
            loading={loading}
            onChange={(absenceAlert) => setSettings((current) => ({ ...current, absenceAlert }))}
            aria-label="旷课提醒"
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <Typography.Text strong>剩余课时提醒</Typography.Text>
            <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
              课时余额首次降到阈值或以下时提醒家长；设为 0 可关闭。
            </Typography.Paragraph>
          </div>
          <InputNumber
            min={0}
            max={50}
            precision={0}
            value={settings.lowHoursWarn}
            disabled={loading}
            onChange={(lowHoursWarn) => setSettings((current) => ({ ...current, lowHoursWarn: lowHoursWarn ?? 0 }))}
            addonAfter="课时"
            aria-label="剩余课时提醒阈值"
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <Typography.Text strong>欠费到期提醒</Typography.Text>
            <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
              收费记录设为待缴并填写到期日后，逾期时提醒已绑定家长；未绑定家长的记录会进入管理端待跟进通知。
            </Typography.Paragraph>
          </div>
          <Switch
            checked={settings.overdueFeeAlert}
            loading={loading}
            onChange={(overdueFeeAlert) => setSettings((current) => ({ ...current, overdueFeeAlert }))}
            aria-label="欠费到期提醒"
          />
        </div>
        <Button type="primary" loading={saving} disabled={loading} onClick={save} style={{ alignSelf: 'flex-start' }}>
          保存提醒规则
        </Button>
      </Space>
    </Card>
  )
}
