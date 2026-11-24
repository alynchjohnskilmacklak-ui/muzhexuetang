'use client'

import { useEffect, useState } from 'react'
import { Alert, Button, Input, Radio, Space, Typography } from 'antd'
import { toast } from 'sonner'

type CheckinStatus = 'DONE' | 'NEED_HELP'
type Checkin = { status: CheckinStatus; note: string | null; submittedAt: string }

export function ParentFeedbackHomeworkCheckin({ feedbackId, studentId }: { feedbackId: string; studentId: string }) {
  const [checkin, setCheckin] = useState<Checkin | null>(null)
  const [status, setStatus] = useState<CheckinStatus | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    fetch(`/api/parent/classroom-feedback/${encodeURIComponent(feedbackId)}/homework-checkin?studentId=${encodeURIComponent(studentId)}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || '作业进度加载失败')
        if (active) {
          setCheckin(payload.checkin || null)
          setStatus(payload.checkin?.status || null)
          setNote(payload.checkin?.note || '')
          setError(null)
        }
      })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : '作业进度加载失败') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [feedbackId, studentId, reloadKey])

  const save = async () => {
    if (!status) return
    if (status === 'NEED_HELP' && note.trim().length < 3) {
      toast.error('请简单说明遇到的困难')
      return
    }
    setSaving(true)
    try {
      const response = await fetch(`/api/parent/classroom-feedback/${encodeURIComponent(feedbackId)}/homework-checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, status, note }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '作业进度保存失败')
      setCheckin(payload.checkin)
      toast.success(status === 'NEED_HELP' ? '已请老师跟进作业困难' : '作业进度已保存')
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : '作业进度保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-label="作业完成情况" style={{ marginTop: 10, padding: 13, borderRadius: 12, background: 'var(--color-surface-1)', border: '1px solid var(--color-hairline)' }}>
      <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>作业完成情况</Typography.Text>
      {loading ? <Typography.Text type="secondary">正在加载…</Typography.Text> : null}
      {error && <Alert type="error" showIcon message={error} action={<Button size="small" onClick={() => { setLoading(true); setReloadKey((key) => key + 1) }}>重试</Button>} style={{ marginBottom: 8 }} />}
      {!loading && !error && checkin && (
        <Alert
          type={checkin.status === 'DONE' ? 'success' : 'warning'}
          showIcon
          message={checkin.status === 'DONE' ? '已登记：作业完成' : '已登记：作业需要老师帮助'}
          description={checkin.note || undefined}
          style={{ marginBottom: 10 }}
        />
      )}
      {!loading && !error && (
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Radio.Group
            value={status}
            onChange={(event) => setStatus(event.target.value as CheckinStatus)}
            options={[{ label: '已完成', value: 'DONE' }, { label: '需要帮助', value: 'NEED_HELP' }]}
          />
          {status === 'NEED_HELP' && (
            <Input.TextArea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="请简要说明遇到的困难，老师会收到提醒。"
              maxLength={500}
              showCount
              rows={3}
              aria-label="作业困难说明"
            />
          )}
          <Button type="primary" size="small" disabled={!status} loading={saving} onClick={() => void save()}>
            {checkin ? '更新作业进度' : '提交作业进度'}
          </Button>
        </Space>
      )}
    </section>
  )
}
