'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { rememberParentChild } from '@/lib/parent-child-preference'
import { fetchJson } from '@/lib/fetch-json'

const fetcher = (url: string) => fetchJson<{ students?: TodayStudent[] }>(url)

type TodayStudent = {
  student?: { id: string; name: string; grade?: string | null }
  id?: string
  name?: string
  grade?: string | null
}

type LinkedChild = { id: string; name: string; grade?: string | null; membershipLevel?: string | null }

export function ChildSwitcher({
  linkedChildren,
  activeChildId,
  allowAll = false,
}: {
  linkedChildren?: LinkedChild[]
  activeChildId?: string
  allowAll?: boolean
} = {}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeId = activeChildId ?? searchParams.get('childId') ?? ''
  const { data } = useSWR(linkedChildren ? null : '/api/parent/today', fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })
  const fallbackStudents: LinkedChild[] = Array.isArray(data?.students)
    ? data.students.flatMap((item: TodayStudent) => {
        const student = item.student || item
        return student.id && student.name ? [{ id: student.id, name: student.name, grade: student.grade }] : []
      })
    : []
  const students = linkedChildren ?? fallbackStudents

  if (students.length <= 1) return null

  const setChild = (id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (id) params.set('childId', id)
    else params.delete('childId')
    params.delete('page')
    const selected = students.find(student => student.id === id)
    if (selected) rememberParentChild(selected.id, selected.membershipLevel)
    const query = params.toString()
    router.replace(query ? `${window.location.pathname}?${query}` : window.location.pathname, { scroll: false })
  }

  const renderButton = (id: string, label: string, active: boolean) => (
    <button
      key={id || 'all'}
      onClick={() => setChild(id)}
      style={{
        flexShrink: 0,
        padding: '5px 14px',
        minHeight: 44,
        minWidth: 44,
        borderRadius: 20,
        fontSize: 13,
        border: `1.5px solid ${active ? 'var(--color-primary)' : 'var(--color-hairline-strong)'}`,
        background: active ? 'var(--color-primary-bg)' : 'var(--color-surface-1)',
        color: active ? 'var(--color-primary)' : 'var(--color-ink-muted)',
        fontWeight: active ? 700 : 400,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{
      display: 'flex',
      gap: 8,
      padding: '8px 0 14px',
      overflowX: 'auto',
    }}>
      {allowAll && renderButton('all', '全部孩子', activeId === 'all')}
      {students.map((student) => renderButton(
        student.id,
        `${student.name}${student.grade ? ` · ${student.grade}` : ''}`,
        activeId === student.id
      ))}
    </div>
  )
}
