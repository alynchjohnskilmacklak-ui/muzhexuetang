'use client'

import { useEffect, useState } from 'react'
import { Alert, Button, Input, Radio, Space, Typography } from 'antd'
import { toast } from 'sonner'

const { Text, Paragraph } = Typography

type Rating = 'SATISFIED' | 'UNSATISFIED'
type Evaluation = { rating: Rating; reason: string | null; createdAt: string }

export function ParentClassroomFeedbackEvaluation({ feedbackId }: { feedbackId: string }) {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [rating, setRating] = useState<Rating | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    void fetch(`/api/parent/classroom-feedback/${encodeURIComponent(feedbackId)}/evaluation`)
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as { evaluation?: Evaluation | null; error?: string } | null
        if (!response.ok) throw new Error(payload?.error || '评价状态加载失败')
        if (!cancelled) {
          setEvaluation(payload?.evaluation || null)
          setLoadError(null)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : '评价状态加载失败，请重试')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [feedbackId, loadAttempt])

  const submit = async () => {
    if (!rating) return
    if (rating === 'UNSATISFIED' && reason.trim().length < 5) {
      toast.error('请至少用 5 个字说明不满意的原因')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/parent/classroom-feedback/${encodeURIComponent(feedbackId)}/evaluation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, reason }),
      })
      const payload = await response.json().catch(() => null) as { evaluation?: Evaluation | null; error?: string; alreadySubmitted?: boolean } | null
      if (!response.ok) {
        if (response.status === 409 && payload?.alreadySubmitted) {
          const refresh = await fetch(`/api/parent/classroom-feedback/${encodeURIComponent(feedbackId)}/evaluation`)
          const fresh = await refresh.json().catch(() => null) as { evaluation?: Evaluation | null } | null
          if (refresh.ok && fresh?.evaluation) {
            setEvaluation(fresh.evaluation)
            return
          }
        }
        throw new Error(payload?.error || '提交评价失败，请稍后重试')
      }
      setEvaluation(payload?.evaluation || { rating, reason: rating === 'UNSATISFIED' ? reason.trim() : null, createdAt: new Date().toISOString() })
      toast.success('评价已提交给管理团队')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '提交评价失败，请检查网络后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section aria-labelledby="parent-classroom-evaluation-title" style={{ borderTop: '1px solid var(--color-hairline)', marginTop: 18, paddingTop: 18 }}>
      <Typography.Title id="parent-classroom-evaluation-title" level={5} style={{ margin: '0 0 6px', color: 'var(--color-ink)' }}>
        诚邀您评价老师本节课的教学内容
      </Typography.Title>
      <Paragraph style={{ margin: '0 0 10px', color: 'var(--color-ink-muted)', fontSize: 13, lineHeight: 1.75 }}>
        任课老师看不到您提交的评价，只有管理人员可查看。满意评价将纳入教师奖励；不满意时请说明原因，管理团队会跟进沟通并修正教学方法。经核实存在故意孤立学生或不认真教学等严重情况，牧哲学堂将按制度处理，包括解除合作。学生与家长始终是牧哲学堂服务的第一优先级，我们的服务围绕您展开。牧哲学堂承诺认真跟进每一条评价。
      </Paragraph>

      {loading ? <Text type="secondary">正在加载评价状态…</Text> : null}
      {loadError && (
        <Alert
          type="error"
          showIcon
          message={loadError}
          style={{ marginBottom: 10 }}
          action={<Button size="small" onClick={() => { setLoading(true); setLoadError(null); setLoadAttempt((attempt) => attempt + 1) }}>重新加载</Button>}
        />
      )}
      {!loading && !loadError && evaluation && (
        <Alert
          type={evaluation.rating === 'SATISFIED' ? 'success' : 'warning'}
          showIcon
          message={evaluation.rating === 'SATISFIED' ? '已收到您的满意评价，感谢您支持老师。' : '已收到您的意见，管理团队会跟进。'}
          description={evaluation.rating === 'UNSATISFIED' && evaluation.reason ? `您提交的原因：${evaluation.reason}` : '本次评价已提交，任课老师无法查看。'}
        />
      )}
      {!loading && !loadError && !evaluation && (
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Radio.Group
            aria-label="评价本节课的教学内容"
            value={rating}
            onChange={(event) => setRating(event.target.value as Rating)}
            optionType="button"
            buttonStyle="solid"
            options={[
              { label: '满意', value: 'SATISFIED' },
              { label: '不满意', value: 'UNSATISFIED' },
            ]}
          />
          {rating === 'UNSATISFIED' && (
            <Input.TextArea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="请说明具体情况，帮助管理团队了解并跟进。"
              aria-label="不满意的原因"
              maxLength={800}
              showCount
              rows={4}
              style={{ width: '100%', maxWidth: '100%' }}
            />
          )}
          <Button
            type="primary"
            loading={submitting}
            disabled={!rating || (rating === 'UNSATISFIED' && reason.trim().length < 5)}
            onClick={submit}
            style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
          >
            提交评价
          </Button>
        </Space>
      )}
    </section>
  )
}
