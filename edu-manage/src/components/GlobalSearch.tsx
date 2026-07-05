'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input, Modal, Spin } from 'antd'
import type { InputRef } from 'antd'
import { SearchOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'

type SearchItem = {
  id: string
  name: string
  detail?: string | null
  href: string
  kind: 'student' | 'teacher' | 'group'
}

type SearchResponse = {
  students: Array<{ id: string; name: string; grade?: string | null; status: string }>
  teachers: Array<{ id: string; name: string; subjects: string }>
  groups: Array<{ id: string; name: string }>
}

const emptyResults: SearchResponse = { students: [], teachers: [], groups: [] }

export function GlobalSearch() {
  const router = useRouter()
  const inputRef = useRef<InputRef>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResponse>(emptyResults)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const sections = useMemo(() => [
    {
      label: '学员',
      items: results.students.map((item): SearchItem => ({
        id: item.id, name: item.name, detail: [item.grade, item.status].filter(Boolean).join(' · '),
        href: `/students/${item.id}`, kind: 'student',
      })),
    },
    {
      label: '教师',
      items: results.teachers.map((item): SearchItem => ({
        id: item.id, name: item.name, detail: item.subjects, href: `/teachers/${item.id}`, kind: 'teacher',
      })),
    },
    {
      label: '班级',
      items: results.groups.map((item): SearchItem => ({
        id: item.id, name: item.name, href: `/courses?groupId=${item.id}`, kind: 'group',
      })),
    },
  ], [results])
  const allItems = sections.flatMap((section) => section.items)

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    const q = query.trim()
    if (!open || !q) {
      setResults(emptyResults)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/admin/global-search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        if (response.ok) setResults(await response.json())
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 300)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [open, query])

  useEffect(() => setActiveIndex(0), [results])

  const navigate = (item: SearchItem) => {
    setOpen(false)
    setQuery('')
    router.push(item.href)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: 320, height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 9,
          border: '1px solid rgba(0,0,0,.10)', borderRadius: 10, background: '#fff', color: '#7a6f5d', cursor: 'pointer',
        }}
      >
        <SearchOutlined style={{ color: '#9a8e7a' }} />
        <span style={{ flex: 1, textAlign: 'left' }}>搜索学员、教师或班级</span>
        <kbd style={{ padding: '1px 6px', borderRadius: 5, background: '#F7F4EF', color: '#9a8e7a', fontSize: 11 }}>Ctrl K</kbd>
      </button>
      <Modal open={open} onCancel={() => setOpen(false)} footer={null} width={620} destroyOnHidden>
        <Input
          ref={inputRef}
          size="large"
          allowClear
          prefix={<SearchOutlined style={{ color: '#E8784A' }} />}
          placeholder="输入姓名或班级名称"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActiveIndex((index) => Math.min(index + 1, allItems.length - 1))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActiveIndex((index) => Math.max(index - 1, 0))
            } else if (event.key === 'Enter' && allItems[activeIndex]) {
              navigate(allItems[activeIndex])
            }
          }}
        />
        <div style={{ minHeight: 160, marginTop: 16 }}>
          {loading ? <div style={{ padding: 48, textAlign: 'center' }}><Spin /></div> : sections.map((section) => (
            section.items.length > 0 && <div key={section.label} style={{ marginBottom: 14 }}>
              <div style={{ marginBottom: 5, color: '#9a8e7a', fontSize: 12, fontWeight: 600 }}>{section.label}</div>
              {section.items.map((item) => {
                const index = allItems.findIndex((candidate) => candidate.kind === item.kind && candidate.id === item.id)
                return (
                  <button key={`${item.kind}-${item.id}`} type="button" onClick={() => navigate(item)}
                    style={{ width: '100%', border: 0, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, background: index === activeIndex ? '#FFF3EC' : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                    {item.kind === 'group' ? <TeamOutlined style={{ color: '#E8784A' }} /> : <UserOutlined style={{ color: '#E8784A' }} />}
                    <span style={{ color: '#1a1201', fontWeight: 600 }}>{item.name}</span>
                    {item.detail && <span style={{ marginLeft: 'auto', color: '#9a8e7a', fontSize: 12 }}>{item.detail}</span>}
                  </button>
                )
              })}
            </div>
          ))}
          {!loading && query.trim() && allItems.length === 0 && <div style={{ padding: 48, textAlign: 'center', color: '#9a8e7a' }}>没有找到匹配结果</div>}
        </div>
      </Modal>
    </>
  )
}
