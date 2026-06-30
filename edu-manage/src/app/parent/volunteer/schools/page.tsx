'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input, Modal, Skeleton, Tag, Typography } from 'antd'
import { BankOutlined, EnvironmentOutlined, HomeOutlined, SearchOutlined, WalletOutlined } from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Title, Text } = Typography

type School = {
  id: string
  schoolId: string
  name: string
  fullName?: string
  type: string
  batch?: string | null
  category?: string | null
  location: string
  address: string | null
  distanceFromXinle: string | null
  yiTong: number | null
  tongZhao: number
  allocationLine: number | null
  xinleLine?: number | null
  enrollment: number | null
  boardingAvail: boolean
  boardingFee: string | null
  tuitionFee: string | null
  keyFeature: string | null
  gaokaoRate: string | null
  intro: string | null
  tips: string | null
  website: string | null
  phone: string | null
  xinleAccessible?: boolean
  isProvincialDemo?: boolean
}

type FilterKey = 'all' | 'accessible' | 'provincial' | 'public' | 'private'

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'accessible', label: '可报名' },
  { key: 'provincial', label: '省示范' },
  { key: 'public', label: '公办' },
  { key: 'private', label: '民办' },
]

const C = {
  canvas: '#faf8f5',
  surface: '#ffffff',
  hairline: 'rgba(0,0,0,.06)',
  ink: '#1a1201',
  muted: '#5a4e3a',
  subtle: '#9a8e7a',
  primary: '#E8784A',
  success: '#1D9E75',
  error: '#D9534F',
}

function validScore(value?: number | null) {
  return typeof value === 'number' && value > 0 ? value : null
}

function ParentSchoolCard({ school, onClick, detailed = false }: { school: School; onClick?: () => void; detailed?: boolean }) {
  const accessible = school.xinleAccessible === true
  const allocationScore = validScore(school.allocationLine) ?? validScore(school.xinleLine)
  const metaItems = [
    school.distanceFromXinle ? { icon: <EnvironmentOutlined />, text: `距新乐 ${school.distanceFromXinle}` } : null,
    { icon: <HomeOutlined />, text: school.boardingAvail ? '可住宿' : '走读' },
    school.tuitionFee ? { icon: <WalletOutlined />, text: `学费 ${school.tuitionFee}` } : null,
    school.boardingFee ? { icon: <WalletOutlined />, text: `住宿 ${school.boardingFee}` } : null,
  ].filter(Boolean) as Array<{ icon: React.ReactNode; text: string }>

  return (
    <article
      onClick={onClick}
      style={{
        width: '100%',
        maxWidth: '100%',
        marginBottom: 10,
        padding: detailed ? 18 : 14,
        borderRadius: 14,
        border: `1px solid ${C.hairline}`,
        borderLeft: `3px solid ${accessible ? C.success : C.error}`,
        background: C.surface,
        opacity: accessible ? 1 : 0.72,
        cursor: onClick ? 'pointer' : 'default',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <Text strong style={{ display: 'block', color: C.ink, fontSize: 15 }}>{school.name}</Text>
          <Text style={{ display: 'block', marginTop: 3, color: C.subtle, fontSize: 11.5 }}>
            {[school.batch, school.type].filter(Boolean).join(' · ')}
          </Text>
        </div>
        <Tag color={accessible ? 'green' : 'red'} style={{ flexShrink: 0, margin: 0, borderRadius: 999 }}>
          {accessible ? '可报名' : '不可报'}
        </Tag>
      </div>

      {!accessible && (
        <div style={{ marginTop: 10, padding: '7px 10px', borderRadius: 8, background: '#f5f2ee', color: C.error, fontSize: 12, fontWeight: 600 }}>
          新乐考生不可报名
        </div>
      )}

      {accessible && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <div style={{ minWidth: 92, padding: '8px 10px', borderRadius: 10, background: '#fff6f1' }}>
            <Text style={{ display: 'block', color: C.subtle, fontSize: 10.5 }}>统招线</Text>
            <Text strong style={{ color: validScore(school.tongZhao) ? C.primary : C.subtle, fontSize: 14 }}>
              {validScore(school.tongZhao) ? `${school.tongZhao} 分` : '待更新'}
            </Text>
          </div>
          <div style={{ minWidth: 92, padding: '8px 10px', borderRadius: 10, background: '#eaf7f1' }}>
            <Text style={{ display: 'block', color: C.subtle, fontSize: 10.5 }}>分配线</Text>
            <Text strong style={{ color: allocationScore ? C.success : C.subtle, fontSize: 14 }}>
              {allocationScore ? `${allocationScore} 分` : '待更新'}
            </Text>
          </div>
        </div>
      )}

      {metaItems.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 11, color: C.muted, fontSize: 11.5 }}>
          {metaItems.map(item => <span key={item.text}>{item.icon}<span style={{ marginLeft: 4 }}>{item.text}</span></span>)}
        </div>
      )}

      {school.keyFeature && <Text style={{ display: 'block', marginTop: 10, color: C.muted, fontSize: 12, lineHeight: 1.6 }}>{school.keyFeature}</Text>}
      {detailed && school.intro && <Text style={{ display: 'block', marginTop: 12, color: C.muted, fontSize: 13, lineHeight: 1.75 }}>{school.intro}</Text>}
      {detailed && school.tips && <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: C.canvas, color: C.muted, fontSize: 12, lineHeight: 1.7 }}>{school.tips}</div>}
    </article>
  )
}

export default function ParentSchoolsPage() {
  const isMobile = useIsMobile() ?? false
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [detailSchool, setDetailSchool] = useState<School | null>(null)

  useEffect(() => {
    fetch('/api/schools')
      .then(response => response.json())
      .then(data => { setSchools(data.schools || []); setLoading(false) })
      .catch(error => { console.warn('学校数据加载失败', error); setLoading(false) })
  }, [])

  const filtered = useMemo(() => schools.filter(school => {
    const matchSearch = !search
      || school.name.includes(search)
      || school.location.includes(search)
      || (school.category || '').includes(search)
      || (school.batch || '').includes(search)
      || (school.keyFeature || '').includes(search)
    const matchFilter = filter === 'all'
      || (filter === 'accessible' && school.xinleAccessible === true)
      || (filter === 'provincial' && (school.isProvincialDemo || school.type === '省示范' || school.batch === '第一批 省级示范性高中'))
      || (filter === 'public' && !school.type.includes('民办'))
      || (filter === 'private' && school.type.includes('民办'))
    return matchSearch && matchFilter
  }), [schools, search, filter])

  const grouped = useMemo(() => {
    const groups = new Map<string, School[]>()
    for (const school of filtered) {
      const category = school.category || '其它学校'
      const group = groups.get(category) || []
      group.push(school)
      groups.set(category, group)
    }
    return Array.from(groups.entries())
  }, [filtered])

  const accessibleCount = schools.filter(school => school.xinleAccessible === true).length

  return (
    <div style={{ width: '100%', maxWidth: '100%', color: C.ink, padding: isMobile ? '0 2px' : 0 }}>
      <header style={{ marginBottom: 14, padding: '14px 16px', borderRadius: 14, background: '#fff6f1', border: '1px solid rgba(232,120,74,.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/picture/牧哲学堂logo.jpg" alt="牧哲学堂" style={{ width: 28, height: 28, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
          <Title level={5} style={{ margin: 0, color: C.ink, fontSize: isMobile ? 16 : 18 }}>高中学校库 · 新乐可报名一览</Title>
        </div>
        <Text style={{ display: 'block', marginTop: 7, color: C.muted, fontSize: 12, lineHeight: 1.6 }}>
          绿色 = 新乐考生可报名，灰色 = 不可报名。数据由牧哲学堂整理，仅供参考。
        </Text>
      </header>

      <div style={{ marginBottom: 12 }}>
        <Input prefix={<SearchOutlined style={{ color: C.subtle }} />} placeholder="搜索学校、批次或类别" value={search} onChange={event => setSearch(event.target.value)} allowClear />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: 3, scrollbarWidth: 'none' }}>
        {FILTERS.map(item => {
          const active = filter === item.key
          return <button key={item.key} type="button" onClick={() => setFilter(item.key)} style={{ flexShrink: 0, padding: '6px 13px', borderRadius: 999, border: `1px solid ${active ? C.primary : 'rgba(0,0,0,.1)'}`, background: active ? '#fff3ec' : C.surface, color: active ? C.primary : C.muted, fontSize: 12.5, fontWeight: active ? 700 : 500, cursor: 'pointer' }}>{item.key === 'accessible' ? '✓ 可报名' : item.label}</button>
        })}
      </div>

      {loading ? (
        <div>{[1, 2, 3, 4].map(item => <Skeleton key={item} active paragraph={{ rows: 2 }} style={{ marginBottom: 10, padding: 16, borderRadius: 14, background: C.surface }} />)}</div>
      ) : grouped.length === 0 ? (
        <div style={{ padding: 50, textAlign: 'center', borderRadius: 14, background: C.surface, color: C.subtle }}><BankOutlined style={{ display: 'block', marginBottom: 10, fontSize: 36 }} />没有找到匹配的学校</div>
      ) : (
        <div>{grouped.map(([category, groupSchools]) => <section key={category} style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingLeft: 9, borderLeft: `3px solid ${C.primary}` }}>
            <Text strong style={{ color: C.ink, fontSize: 14 }}>{category}</Text>
            <Text style={{ marginLeft: 'auto', color: C.subtle, fontSize: 11 }}>{groupSchools.length} 所</Text>
          </div>
          {groupSchools.map(school => <ParentSchoolCard key={school.schoolId} school={school} onClick={() => setDetailSchool(school)} />)}
        </section>)}</div>
      )}

      {!loading && <footer style={{ padding: '4px 0 18px', textAlign: 'center', color: C.subtle, fontSize: 11.5 }}>
        共 {schools.length} 所 · 可报名 {accessibleCount} 所 · 数据以官方招生计划为准
      </footer>}

      <Modal title={detailSchool?.name} open={!!detailSchool} onCancel={() => setDetailSchool(null)} footer={null} width={isMobile ? 'calc(100vw - 24px)' : 600} style={{ top: isMobile ? 12 : 30 }}>
        {detailSchool && <ParentSchoolCard school={detailSchool} detailed />}
      </Modal>
    </div>
  )
}
