'use client'

import { useMemo } from 'react'
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
  const rawStudents = linkedChildren ?? fallbackStudents
  const students = useMemo(() => {
    const seen = new Set<string>()
    return rawStudents.filter((s) => {
      const name = typeof s?.name === 'string' ? s.name.trim() : ''
      const grade = typeof s?.grade === 'string' ? s.grade.trim() : ''
      const key = `${name}_${grade}`
      if (!name) return true
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [rawStudents])

  if (students.length <= 1) return null

  const setChild = (id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (id) params.set('childId', id)
    else params.delete('childId')
    params.delete('page')
    const selected = students.find(student => student.id === id)
    if (selected) {
      rememberParentChild(selected.id, selected.membershipLevel)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('parent-child-switch', { detail: selected }))
        if (selected.membershipLevel) {
          window.dispatchEvent(new CustomEvent('parent-theme-change', { detail: selected.membershipLevel }))
        }
      }
    }
    const query = params.toString()
    router.replace(query ? `${window.location.pathname}?${query}` : window.location.pathname, { scroll: false })
  }

  const renderButton = (id: string, name: string, grade: string | null | undefined, active: boolean) => (
    <button
      key={id || 'all'}
      type="button"
      onClick={() => setChild(id)}
      style={{
        flexShrink: 0,
        padding: '6px 14px',
        minHeight: 40,
        borderRadius: 22,
        fontSize: 13,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        border: active ? '1.5px solid #C9A45C' : '1px solid rgba(0,0,0,0.08)',
        background: active ? 'linear-gradient(135deg, #0E5E4E 0%, #123C35 100%)' : '#FFFFFF',
        color: active ? '#F6ECD2' : '#5A4E3A',
        fontWeight: active ? 700 : 500,
        boxShadow: active ? '0 3px 10px rgba(14, 94, 78, 0.22)' : '0 1px 3px rgba(0,0,0,0.02)',
        cursor: 'pointer',
        transition: 'all .16s ease',
      }}
    >
      <span style={{ fontSize: 13.5 }}>{id === 'all' ? '👥' : '👶'}</span>
      <span>{name}</span>
      {grade && (
        <span
          style={{
            fontSize: 10.5,
            padding: '1px 6px',
            borderRadius: 10,
            background: active ? 'rgba(246, 236, 210, 0.18)' : '#F5EFE6',
            color: active ? '#F2E3B6' : '#8A6D3B',
            fontWeight: 600,
          }}
        >
          {grade}
        </span>
      )}
    </button>
  )

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 0 14px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {allowAll && renderButton('all', '全部孩子', null, activeId === 'all')}
      {students.map((student) =>
        renderButton(
          student.id,
          student.name,
          student.grade,
          activeId === student.id || (!activeId && !allowAll && students[0]?.id === student.id),
        ),
      )}
    </div>
  )
}
