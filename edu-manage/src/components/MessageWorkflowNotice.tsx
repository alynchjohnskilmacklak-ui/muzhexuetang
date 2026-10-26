'use client'

import { useEffect, useState } from 'react'
import { BellOutlined, MessageOutlined, RightOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'

type WorkflowSummary = {
  count: number
  pendingTeacherReplies?: number
  pendingParentReads?: number
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error || '留言状态暂时无法加载')
  return data
}

export function MessageWorkflowNotice({
  audience,
  deferMs = 0,
}: {
  audience: 'parent' | 'teacher'
  deferMs?: number
}) {
  const router = useRouter()
  const [ready, setReady] = useState(deferMs <= 0)

  useEffect(() => {
    if (deferMs <= 0) return
    const timer = window.setTimeout(() => setReady(true), deferMs)
    return () => window.clearTimeout(timer)
  }, [deferMs])

  const { data, error, mutate } = useSWR<WorkflowSummary>(ready ? '/api/messages/unread-count' : null, fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 2_000,
  })

  if (error && !data) {
    return (
      <div role="status" style={{
        width: '100%',
        minHeight: 68,
        padding: '12px 16px',
        border: '1px solid var(--color-hairline)',
        borderRadius: 14,
        background: 'var(--color-surface-1)',
        color: 'var(--color-ink-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <span style={{ fontSize: 13, lineHeight: 1.5 }}>家校沟通状态暂时无法加载</span>
        <button
          type="button"
          onClick={() => void mutate()}
          style={{
            minHeight: 44,
            padding: '8px 12px',
            border: '1px solid var(--color-hairline-strong)',
            borderRadius: 10,
            background: 'var(--color-surface-1)',
            color: 'var(--color-ink)',
            cursor: 'pointer',
          }}
        >
          重试
        </button>
      </div>
    )
  }

  const count = audience === 'parent'
    ? Number(data?.pendingParentReads || 0)
    : Number(data?.count || 0)
  if (count <= 0) return null

  const isParent = audience === 'parent'
  const title = isParent
    ? `您有 ${count} 条新回复`
    : `有 ${count} 条未读家长留言`
  const description = isParent
    ? '老师或管理员已经回复您的留言，点击即可查看。'
    : '进入家校沟通查看后会自动标记已读，尚未回复的对话仍会保留在列表中。'

  return (
    <button
      type="button"
      onClick={() => router.push(isParent ? '/parent/messages' : '/teacher/messages')}
      style={{
        width: '100%',
        minHeight: 68,
        padding: '13px 16px',
        border: '1px solid rgba(232,120,74,.24)',
        borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(232,120,74,.12), rgba(255,255,255,.96))',
        color: '#1a1201',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        textAlign: 'left',
        cursor: 'pointer',
        boxShadow: '0 6px 18px rgba(232,120,74,.08)',
      }}
    >
      <span style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        background: 'var(--color-primary)',
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: 18,
      }}>
        {isParent ? <BellOutlined /> : <MessageOutlined />}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 800 }}>{title}</span>
        <span style={{ display: 'block', marginTop: 3, color: '#746755', fontSize: 12, lineHeight: 1.55 }}>
          {description}
        </span>
      </span>
      <RightOutlined style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
    </button>
  )
}
