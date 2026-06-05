'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type TodayStudent = {
  student?: { id: string; name: string; grade?: string | null }
  id?: string
  name?: string
  grade?: string | null
}

export function ChildSwitcher() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeId = searchParams.get('childId') || ''
  const { data } = useSWR('/api/parent/today', fetcher)
  const students: { id: string; name: string; grade?: string | null }[] = Array.isArray(data?.students)
    ? data.students.map((item: TodayStudent) => item.student || item).filter((item: TodayStudent) => item?.id)
    : []

  if (students.length <= 1) return null

  const setChild = (id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (id) params.set('childId', id)
    else params.delete('childId')
    const query = params.toString()
    router.replace(query ? `?${query}` : window.location.pathname, { scroll: false })
  }

  const renderButton = (id: string, label: string, active: boolean) => (
    <button
      key={id || 'all'}
      onClick={() => setChild(id)}
      style={{
        flexShrink: 0,
        padding: '5px 14px',
        borderRadius: 20,
        fontSize: 13,
        border: `1.5px solid ${active ? '#E8784A' : '#EEE7E1'}`,
        background: active ? 'rgba(232,120,74,.08)' : '#fff',
        color: active ? '#E8784A' : '#5a4e3a',
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
      {renderButton('', '全部孩子', !activeId)}
      {students.map((student) => renderButton(
        student.id,
        `${student.name}${student.grade ? ` · ${student.grade}` : ''}`,
        activeId === student.id
      ))}
    </div>
  )
}
