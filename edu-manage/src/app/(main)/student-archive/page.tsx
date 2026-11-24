'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Empty, Spin } from 'antd'
import {
  CheckCircleOutlined, CloseCircleOutlined, FileSearchOutlined, BookOutlined,
  MessageOutlined, FileTextOutlined, TrophyOutlined, SearchOutlined, CalendarOutlined,
} from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { StudentAvatar } from '@/components/Common/StudentAvatar'
import { useIsMobile } from '@/hooks/useIsMobile'

type CompletenessItem = {
  studentId: string
  name: string
  grade: string | null
  gender?: string | null
  mainTeacherName: string | null
  hasPractice: boolean
  hasFeedback: boolean
  hasSummary: boolean
  missingCount: number
}

type CompletenessPayload = {
  summary: { noPractice: number; noFeedback: number; noSummary: number }
  items: CompletenessItem[]
}

const fetcher = (url: string) => fetch(url).then(async (res) => {
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '请求失败')
  return data
})

const GRADE_ORDER = ['初一', '初二', '初三', '高一', '高二', '高三', '个性化']

function AvatarBlock({ name, gender, size = 40 }: { name: string; gender?: string | null; size?: number }) {
  return <StudentAvatar name={name} gender={gender} size={size} />
}

function MissingTag({ ok, label, missingLabel }: { ok: boolean; label: string; missingLabel: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
      color: ok ? '#1D7A52' : '#C2413C',
      background: ok ? 'rgba(29,154,98,.1)' : 'rgba(194,65,60,.09)',
      border: `1px solid ${ok ? 'rgba(29,154,98,.28)' : 'rgba(194,65,60,.25)'}`,
    }}>
      {ok ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
      {ok ? `${label}齐` : `缺${missingLabel}`}
    </div>
  )
}

export default function StudentArchiveDashboardPage() {
  const isMobile = useIsMobile() ?? false
  const [months, setMonths] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'all' | 'noPractice' | 'noFeedback' | 'noSummary' | 'complete'>('all')
  const [search, setSearch] = useState('')
  const { data, isLoading } = useSWR<CompletenessPayload>(`/api/admin/profile-completeness?months=${months}`, fetcher)

  const items = data?.items ?? []
  const filtered = useMemo(() => {
    let result = items
    if (statusFilter === 'noPractice') result = result.filter((item) => !item.hasPractice)
    if (statusFilter === 'noFeedback') result = result.filter((item) => !item.hasFeedback)
    if (statusFilter === 'noSummary') result = result.filter((item) => !item.hasSummary)
    if (statusFilter === 'complete') result = result.filter((item) => item.missingCount === 0)
    if (search.trim()) result = result.filter((item) => item.name.includes(search.trim()))
    return [...result].sort((a, b) => {
      const ga = GRADE_ORDER.indexOf(a.grade || ''), gb = GRADE_ORDER.indexOf(b.grade || '')
      if ((ga === -1 ? 99 : ga) !== (gb === -1 ? 99 : gb)) return (ga === -1 ? 99 : ga) - (gb === -1 ? 99 : gb)
      return b.missingCount - a.missingCount
    })
  }, [items, statusFilter, search])

  const summary = data?.summary ?? { noPractice: 0, noFeedback: 0, noSummary: 0 }
  const total = items.length
  const completeCount = items.filter((item) => item.missingCount === 0).length

  const statCards = [
    { key: 'noPractice', label: '本期未做题', value: summary.noPractice, color: '#E8784A', icon: <FileTextOutlined />, note: total ? `占学员 ${Math.round((summary.noPractice / total) * 100)}%` : '暂无数据' },
    { key: 'noFeedback', label: '本期无反馈', value: summary.noFeedback, color: '#7C5CFF', icon: <MessageOutlined />, note: total ? `占学员 ${Math.round((summary.noFeedback / total) * 100)}%` : '暂无数据' },
    { key: 'noSummary', label: '本期无小结', value: summary.noSummary, color: '#D9534F', icon: <BookOutlined />, note: total ? `占学员 ${Math.round((summary.noSummary / total) * 100)}%` : '暂无数据' },
    { key: 'complete', label: '资料齐全学员', value: completeCount, color: '#1D9E75', icon: <TrophyOutlined />, note: total ? `完成率 ${Math.round((completeCount / total) * 100)}%` : '暂无数据' },
  ]

  const filterButtons = [
    { key: 'all', label: '全部' },
    { key: 'noPractice', label: '未做题' },
    { key: 'noFeedback', label: '缺反馈' },
    { key: 'noSummary', label: '缺小结' },
    { key: 'complete', label: '齐全' },
  ] as const

  return (
    <PageLayout
      title="学情资料检查"
      subtitle="按月核对做题练习、课堂反馈与阶段小结的记录情况，优先处理红色缺项"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* 顶部紧凑型总览指标小盘 (2x2 on mobile, 4 cols on desktop) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: isMobile ? 8 : 10,
        }}>
          {statCards.map((card) => {
            const isSelected = statusFilter === card.key
            return (
              <div
                key={card.key}
                onClick={() => setStatusFilter(statusFilter === card.key ? 'all' : (card.key as any))}
                title="点击按此状态筛选学员"
                style={{
                  borderRadius: 14,
                  padding: isMobile ? '10px 10px 8px' : '12px 14px',
                  background: card.key === 'complete'
                    ? (isSelected ? 'linear-gradient(150deg,#123C35,#094539)' : 'linear-gradient(150deg,#17352F,#0E5E4E)')
                    : (isSelected ? '#FFFDF8' : '#FFFFFF'),
                  border: isSelected
                    ? (card.key === 'complete' ? '2px solid #D6B45B' : `2px solid ${card.color}`)
                    : (card.key === 'complete' ? '1px solid rgba(214,180,91,.5)' : '1px solid rgba(58,50,39,.1)'),
                  boxShadow: isSelected
                    ? '0 4px 12px rgba(20,87,77,.18)'
                    : '0 2px 6px rgba(58,50,39,.04)',
                  cursor: 'pointer',
                  transition: 'all 0.16s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center', fontSize: 13,
                      background: card.key === 'complete' ? 'rgba(214,180,91,.2)' : `${card.color}15`,
                      color: card.key === 'complete' ? '#D6B45B' : card.color,
                    }}>
                      {card.icon}
                    </div>
                    <span style={{
                      fontSize: isMobile ? 12 : 13,
                      fontWeight: 650,
                      color: card.key === 'complete' ? '#FAF6EE' : '#5A4E3A',
                      whiteSpace: 'nowrap',
                    }}>
                      {card.label}
                    </span>
                  </div>
                  {isSelected && (
                    <span style={{ fontSize: 10, color: card.key === 'complete' ? '#D6B45B' : card.color, fontWeight: 800 }}>
                      ✓ 筛选中
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 6 }}>
                  <div style={{
                    fontSize: isMobile ? 22 : 26,
                    fontWeight: 800,
                    color: card.key === 'complete' ? '#FFFFFF' : '#1F2329',
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {card.value}
                  </div>
                  <div style={{
                    fontSize: 10.5,
                    color: card.key === 'complete' ? 'rgba(250,246,238,.8)' : '#8C7E6A',
                    whiteSpace: 'nowrap',
                  }}>
                    {card.note}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 醒目的模块/分类选项卡栏 (Prominent Segmented Tabs) */}
        <div
          role="tablist"
          aria-label="学情分类选项卡"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 6px',
            borderRadius: 14,
            background: '#FAF6EE',
            border: '1px solid rgba(214, 180, 91, 0.35)',
            boxShadow: 'inset 0 1px 3px rgba(58, 50, 39, 0.05)',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {filterButtons.map((button) => {
            const isActive = statusFilter === button.key
            const count = button.key === 'all'
              ? total
              : button.key === 'noPractice'
              ? summary.noPractice
              : button.key === 'noFeedback'
              ? summary.noFeedback
              : button.key === 'noSummary'
              ? summary.noSummary
              : completeCount

            return (
              <button
                key={button.key}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => setStatusFilter(button.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: isMobile ? '8px 12px' : '8px 16px',
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: isActive ? 750 : 600,
                  color: isActive ? '#FFFFFF' : '#5A4E3A',
                  backgroundColor: isActive ? '#14574D' : 'transparent',
                  boxShadow: isActive ? '0 2px 8px rgba(20, 87, 77, 0.26)' : 'none',
                  transition: 'all 0.16s ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  outline: 'none',
                }}
              >
                <span>{button.label}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 750,
                    padding: '1px 6px',
                    borderRadius: 999,
                    background: isActive ? 'rgba(214, 180, 91, 0.28)' : 'rgba(58, 50, 39, 0.08)',
                    color: isActive ? '#D6B45B' : '#756A58',
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* 紧凑搜索与月份工具条 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          background: '#FFFFFF',
          padding: '8px 12px',
          borderRadius: 12,
          border: '1px solid rgba(58, 50, 39, 0.08)',
        }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 140 }}>
            <SearchOutlined style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#98A2B3' }} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索学员姓名..."
              style={{
                width: '100%',
                fontFamily: 'inherit',
                fontSize: 13,
                padding: '6px 10px 6px 28px',
                borderRadius: 8,
                border: '1px solid #E5DFD6',
                outline: 'none',
                background: '#FAF8F5',
              }}
            />
          </div>
          <select
            value={months}
            onChange={(event) => setMonths(Number(event.target.value))}
            style={{
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 600,
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #E5DFD6',
              background: '#FAF8F5',
              color: '#14574D',
              outline: 'none',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <option value={1}>近 1 个月</option>
            <option value={3}>近 3 个月</option>
            <option value={6}>近 6 个月</option>
            <option value={12}>近 12 个月</option>
          </select>
        </div>

        {/* 学员卡片列表 */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 64 }}><Spin size="large" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F0E9DF', padding: 40 }}>
            <Empty description={items.length === 0 ? '暂无学员数据' : '没有符合筛选条件的学员'} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((item) => {
              const complete = item.missingCount === 0
              return (
                <div
                  key={item.studentId}
                  style={{
                    borderRadius: 16, overflow: 'hidden',
                    background: complete ? '#fff' : '#FFFDF9',
                    border: complete ? '1px solid #F0E9DF' : '1px solid rgba(232,120,74,.35)',
                    boxShadow: complete ? '0 3px 12px rgba(58,50,39,.05)' : '0 4px 14px rgba(232,120,74,.08)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px 10px' }}>
                    <AvatarBlock name={item.name} gender={item.gender} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14.5, fontWeight: 800, color: '#1F2329' }}>{item.name}</span>
                        {item.grade && (
                          <span style={{
                            fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 999,
                            color: '#0E5E4E', background: 'rgba(14,94,78,.08)', border: '1px solid rgba(14,94,78,.25)',
                          }}>{item.grade}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 2 }}>
                        主教师：{item.mainTeacherName || '未分配'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontSize: 11, color: '#98A2B3' }}>完整度</span>
                        <span style={{ fontSize: 16, fontWeight: 800, color: complete ? '#1D9E75' : '#E8784A', fontVariantNumeric: 'tabular-nums' }}>
                          {3 - item.missingCount}/3
                        </span>
                      </div>
                      <div style={{ width: 72, height: 5, borderRadius: 999, background: 'rgba(152,162,179,.15)', overflow: 'hidden', marginTop: 4 }}>
                        <div style={{
                          height: '100%', width: `${((3 - item.missingCount) / 3) * 100}%`, borderRadius: 999,
                          background: complete ? 'linear-gradient(90deg,#1D9E75,#27A644)' : 'linear-gradient(90deg,#E8784A,#D9534F)',
                        }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '0 14px 12px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <MissingTag ok={item.hasPractice} label="做题" missingLabel="做题" />
                      <MissingTag ok={item.hasFeedback} label="反馈" missingLabel="反馈" />
                      <MissingTag ok={item.hasSummary} label="小结" missingLabel="小结" />
                    </div>
                  </div>

                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                    padding: '8px 14px', borderTop: '1px solid #F4EFE8', background: 'rgba(247,245,241,.6)',
                  }}>
                    {!item.hasPractice && (
                      <Link
                        href="/grades/practice"
                        style={{
                          fontSize: 12, fontWeight: 700, color: '#C2413C', textDecoration: 'none',
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '5px 9px', borderRadius: 8,
                          border: '1px solid rgba(194,65,60,.3)', background: '#fff',
                        }}
                      >去题库统计</Link>
                    )}
                    <Link
                      href="/gradebook"
                      style={{
                        fontSize: 12, fontWeight: 600, color: '#8A6517', textDecoration: 'none',
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '5px 9px', borderRadius: 8,
                        border: '1px solid #E5C37A', background: '#FEF8E8',
                      }}
                    ><TrophyOutlined /> 录测评</Link>
                    <Link
                      href={`/schedule/intensive?studentId=${item.studentId}`}
                      style={{
                        fontSize: 12, fontWeight: 600, color: '#14574D', textDecoration: 'none',
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '5px 9px', borderRadius: 8,
                        border: '1px solid rgba(20,87,77,.25)', background: '#E8F2F0',
                      }}
                    ><CalendarOutlined /> 安排排课</Link>
                    <Link
                      href={`/students/${item.studentId}#learning`}
                      style={{
                        fontSize: 12, fontWeight: 700, color: '#0E5E4E', textDecoration: 'none',
                        display: 'inline-flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center', minWidth: 100,
                        padding: '5px 9px', borderRadius: 8,
                        border: '1px solid rgba(14,94,78,.3)', background: '#fff',
                      }}
                    ><FileSearchOutlined /> 查看完整学情</Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
