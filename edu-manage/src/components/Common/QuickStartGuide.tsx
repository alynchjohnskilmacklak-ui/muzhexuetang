'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Button, Card, Progress, Space, Typography } from 'antd'
import { CheckCircleOutlined, CloseOutlined, RightOutlined } from '@ant-design/icons'
import { useRouter, useSearchParams } from 'next/navigation'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Text, Title } = Typography

export type QuickStartStep = {
  title: string
  description: string
  actionLabel: string
  href: string
  icon: ReactNode
}

export function QuickStartGuide({
  storageKey,
  title,
  steps,
}: {
  storageKey: string
  title: string
  steps: QuickStartStep[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile() ?? false
  const [visible, setVisible] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const replay = searchParams.get('guide') === '1'

  useEffect(() => {
    let completed = false
    try { completed = window.localStorage.getItem(storageKey) === 'completed' } catch { /* storage may be unavailable */ }
    setVisible(replay || !completed)
  }, [replay, storageKey])

  const remember = () => {
    try { window.localStorage.setItem(storageKey, 'completed') } catch { /* storage may be unavailable */ }
  }

  const close = () => {
    remember()
    setVisible(false)
  }

  const openStep = () => {
    remember()
    setVisible(false)
    router.push(step.href)
  }

  if (!visible || !steps.length) return null
  const step = steps[Math.min(activeStep, steps.length - 1)]

  return (
    <Card
      bordered={false}
      style={{ marginBottom: 16, borderRadius: 14, border: '1px solid var(--color-hairline)', background: 'var(--color-primary-bg)' }}
      styles={{ body: { padding: isMobile ? 12 : 16 } }}
      aria-label={title}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <Text style={{ color: 'var(--color-primary)', fontSize: 12, fontWeight: 650 }}>首次使用引导</Text>
          <Title level={5} style={{ margin: '3px 0 0', color: 'var(--color-ink)' }}>{title}</Title>
        </div>
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={close}>跳过</Button>
      </div>

      <Progress percent={Math.round(((activeStep + 1) / steps.length) * 100)} showInfo={false} strokeColor="var(--color-primary)" trailColor="var(--color-surface-4)" size="small" style={{ margin: '12px 0' }} />

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0 }}>
        <div style={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 10, color: 'var(--color-primary)', background: 'var(--color-surface-1)' }}>{step.icon}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Text strong style={{ display: 'block', color: 'var(--color-ink)' }}>{activeStep + 1}. {step.title}</Text>
          <Text style={{ display: 'block', marginTop: 4, color: 'var(--color-ink-muted)', lineHeight: 1.7 }}>{step.description}</Text>
        </div>
      </div>

      <div style={{ marginTop: 14, display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'space-between', gap: 8 }}>
        <Button disabled={activeStep === 0} onClick={() => setActiveStep((value) => Math.max(0, value - 1))}>上一步</Button>
        <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: isMobile ? '100%' : undefined }}>
          <Button block={isMobile} onClick={openStep}>{step.actionLabel} <RightOutlined /></Button>
          {activeStep < steps.length - 1
            ? <Button block={isMobile} type="primary" onClick={() => setActiveStep((value) => Math.min(steps.length - 1, value + 1))}>下一步</Button>
            : <Button block={isMobile} type="primary" icon={<CheckCircleOutlined />} onClick={close}>完成引导</Button>}
        </Space>
      </div>
    </Card>
  )
}
