'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input, Select, Typography, Modal, Skeleton } from 'antd'
import { SearchOutlined, BankOutlined } from '@ant-design/icons'
import { SchoolCard } from '@/components/Volunteer/SchoolCard'

const { Title, Text } = Typography

type School = {
  id: string; schoolId: string; name: string; fullName?: string; type: string; location: string
  address: string | null; distanceFromXinle: string | null
  yiTong: number | null; tongZhao: number; allocationLine: number | null; enrollment: number | null
  boardingAvail: boolean; boardingFee: string | null; tuitionFee: string | null
  keyFeature: string | null; gaokaoRate: string | null
  intro: string | null; tips: string | null
  website: string | null; phone: string | null
  xinleAccessible?: boolean
}

const TYPE_GROUPS = ['省示范', '市重点', '县中', '民办'] as const

const GROUP_META: Record<string, { label: string; subtitle: string }> = {
  '省示范': { label: '省级示范高中', subtitle: '重点高中，设分配生名额' },
  '市重点': { label: '市级重点高中', subtitle: '市级优质教育资源' },
  '县中': { label: '县级中学', subtitle: '县区范围内招生为主' },
  '民办': { label: '民办学校', subtitle: '灵活招生，部分跨区' },
}

// Warm light tokens
const C = {
  canvas: '#faf8f5',
  surface1: '#ffffff',
  surface3: '#f5f2ee',
  hairline: 'rgba(0,0,0,.06)',
  hairlineStrong: 'rgba(0,0,0,.12)',
  ink: '#1a1201',
  inkMuted: '#5a4e3a',
  inkSubtle: '#9a8e7a',
  primary: '#E8784A',
  primaryBg: '#fff3ec',
  success: '#1D9E75',
  successBg: '#eaf7f1',
}

export default function ParentSchoolsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [detailSchool, setDetailSchool] = useState<School | null>(null)

  useEffect(() => {
    fetch('/api/schools')
      .then(r => r.json())
      .then(d => { setSchools(d.schools || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return schools.filter((s) => {
      const matchSearch = !search
        || s.name.includes(search)
        || s.location.includes(search)
        || (s.keyFeature || '').includes(search)
        || (s.intro || '').includes(search)
      const matchType = !filterType || s.type === filterType
      const matchLocation = !filterLocation || s.location === filterLocation
      return matchSearch && matchType && matchLocation
    })
  }, [schools, search, filterType, filterLocation])

  const locations = [...new Set(schools.map((s) => s.location))] as string[]

  // Group filtered schools by type for tiered display
  const grouped = useMemo(() => {
    const map = new Map<string, School[]>()
    for (const t of TYPE_GROUPS) {
      const group = filtered.filter(s => s.type === t)
      if (group.length > 0) map.set(t, group)
    }
    // Ungrouped
    const ungrouped = filtered.filter(s => !TYPE_GROUPS.includes(s.type as typeof TYPE_GROUPS[number]))
    if (ungrouped.length > 0) map.set('其他', ungrouped)
    return map
  }, [filtered])

  return (
    <div style={{ color: C.ink }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={5} style={{ margin: 0, marginBottom: 2, fontSize: 16, color: C.ink }}>
          高中学校信息
        </Title>
        <Text style={{ fontSize: 13, color: C.inkSubtle }}>
          了解石家庄及新乐周边高中学校详细信息，助力志愿填报
        </Text>
      </div>

      {/* Search & Filter bar — sticky on mobile */}
      <div className="school-filter-bar" style={{
        background: C.surface1,
        border: `1px solid ${C.hairline}`,
        borderRadius: 12,
        padding: '12px 16px',
        marginBottom: 20,
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <Input
          prefix={<SearchOutlined style={{ color: C.inkSubtle }} />}
          placeholder="搜索学校名称、特色..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 180 }}
          allowClear
          size="middle"
        />
        <Select
          placeholder="学校类型"
          allowClear
          getPopupContainer={() => document.body}
          listHeight={240}
          style={{ width: 120 }}
          size="middle"
          value={filterType || undefined}
          onChange={v => setFilterType(v || '')}
          options={TYPE_GROUPS.map(t => ({ label: t, value: t }))}
        />
        <Select
          placeholder="所在地"
          allowClear
          getPopupContainer={() => document.body}
          listHeight={240}
          style={{ width: 120 }}
          size="middle"
          value={filterLocation || undefined}
          onChange={v => setFilterLocation(v || '')}
          options={locations.map(l => ({ label: l, value: l }))}
        />
      </div>

      {/* School list — grouped by tier */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} active paragraph={{ rows: 2 }} title={{ width: 200 }}
              style={{ background: C.surface1, borderRadius: 14, padding: '16px 20px', border: `1px solid ${C.hairline}` }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60, color: C.inkSubtle,
          background: C.surface1, borderRadius: 14, border: `1px solid ${C.hairline}`,
        }}>
          <BankOutlined style={{ fontSize: 40, marginBottom: 12, color: C.hairline }} />
          <div style={{ fontSize: 15 }}>没有找到匹配的学校</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>尝试调整搜索或筛选条件</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {Array.from(grouped.entries()).map(([type, groupSchools]) => {
            const meta = GROUP_META[type] || { label: type, subtitle: '' }
            return (
              <div key={type}>
                {/* Group header */}
                <div style={{
                  display: 'flex', alignItems: 'baseline', gap: 8,
                  marginBottom: 12, paddingBottom: 8,
                  borderBottom: `1px solid ${C.hairline}`,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: C.primary, flexShrink: 0,
                  }} />
                  <Text strong style={{ fontSize: 14, color: C.ink }}>{meta.label}</Text>
                  <Text style={{ fontSize: 12, color: C.inkSubtle }}>{meta.subtitle}</Text>
                  <Text style={{ fontSize: 11, color: C.inkSubtle, marginLeft: 'auto' }}>
                    {groupSchools.length}所
                  </Text>
                </div>

                {/* List rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {groupSchools.map(school => (
                    <SchoolCard
                      key={school.schoolId}
                      school={school}
                      compact
                      onClick={() => setDetailSchool(school)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        title={detailSchool?.name}
        open={!!detailSchool}
        onCancel={() => setDetailSchool(null)}
        footer={null}
        width={600}
        style={{ top: 30 }}
      >
        {detailSchool && <SchoolCard school={detailSchool} compact={false} />}
      </Modal>
    </div>
  )
}
