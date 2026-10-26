'use client'

import { useEffect, useState } from 'react'
import { BellOutlined, MessageOutlined, RightOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'

type WorkflowSummary = {
  count: number
  pendingTeacherReplies: number
  pendingParentReads: number
}

const fetcher = (url: string) => fetch(url).then((response) => (
  response.ok
    ? response.json()
    : { count: 0, pendingTeacherReplies: 0, pendingParentReads: 0 }
))

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

  const { data } = useSWR<WorkflowSummary>(ready ? '/api/messages/unread-count' : null, fetcher, {
    refreshInterval: 5_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 2_000,
  })

  const count = audience === 'parent'
    ? Number(data?.pendingParentReads || 0)
    : Number(data?.pendingTeacherReplies || 0)
  if (count <= 0) return null

  const isParent = audience === 'parent'
  const title = isParent
    ? `您有 ${count} 条新回复`
    : `有 ${count} 个家长留言等待回复`
  const description = isParent
    ? '老师或管理员已经回复您的留言，点击即可查看。'
    : '请及时查看家长诉求并完成回复，回复后家长首页会收到提示。'

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
        background: '#E8784A',
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
      <RightOutlined style={{ color: '#E8784A', flexShrink: 0 }} />
    </button>
  )
}
