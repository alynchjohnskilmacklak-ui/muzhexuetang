'use client'

import { useEffect, useMemo, useState } from 'react'
import NextImage from 'next/image'
import { Image, Input, Skeleton, Tag, Typography } from 'antd'
import {
  BankOutlined, CloseOutlined, EnvironmentOutlined, HomeOutlined,
  SearchOutlined, WalletOutlined, TrophyOutlined, SafetyCertificateOutlined,
} from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'
import { BrandModal } from '@/components/Common/BrandModal'

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
  { key: 'accessible', label: '✓ 可报名' },
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
  brand: '#123C35',
}

function validScore(value?: number | null) {
  return typeof value === 'number' && value > 0 ? value : null
}

function ParentSchoolCard({ school, onClick }: { school: School; onClick?: () => void }) {
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
        width: '100%', maxWidth: '100%', marginBottom: 10, padding: 14,
        borderRadius: 16,
        border: `1px solid ${accessible ? 'rgba(29,158,117,.18)' : C.hairline}`,
        borderLeft: `4px solid ${accessible ? C.success : '#D5CCC0'}`,
        background: C.surface,
        opacity: accessible ? 1 : 0.78,
        cursor: onClick ? 'pointer' : 'default',
        boxSizing: 'border-box',
        boxShadow: '0 2px 10px rgba(26,18,1,.04)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <Text strong style={{ display: 'block', color: C.ink, fontSize: 15 }}>{school.name}</Text>
          <Text style={{ display: 'block', marginTop: 3, color: C.subtle, fontSize: 11.5 }}>
            {[school.batch, school.category, school.location].filter(Boolean).join(' · ')}
          </Text>
        </div>
        <Tag
          color={accessible ? 'green' : 'default'}
          style={{ flexShrink: 0, margin: 0, borderRadius: 999, fontWeight: 600, border: accessible ? 'none' : '1px solid rgba(0,0,0,.12)' }}
        >
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
          <div style={{ minWidth: 92, flex: 1, padding: '8px 10px', borderRadius: 12, background: 'linear-gradient(135deg,rgba(232,120,74,.12),rgba(232,120,74,.05))', border: '1px solid rgba(232,120,74,.16)' }}>
            <Text style={{ display: 'block', color: C.subtle, fontSize: 10.5 }}>统招线</Text>
            <Text strong style={{ color: validScore(school.tongZhao) ? C.primary : C.subtle, fontSize: 15 }}>
              {validScore(school.tongZhao) ? `${school.tongZhao} 分` : '待更新'}
            </Text>
          </div>
          <div style={{ minWidth: 92, flex: 1, padding: '8px 10px', borderRadius: 12, background: 'linear-gradient(135deg,rgba(29,158,117,.12),rgba(29,158,117,.05))', border: '1px solid rgba(29,158,117,.16)' }}>
            <Text style={{ display: 'block', color: C.subtle, fontSize: 10.5 }}>分配线</Text>
            <Text strong style={{ color: allocationScore ? C.success : C.subtle, fontSize: 15 }}>
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

      {school.keyFeature && (
        <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 10, background: C.canvas, color: C.muted, fontSize: 12, lineHeight: 1.6 }}>
          <SafetyCertificateOutlined style={{ color: C.primary, marginRight: 5 }} />{school.keyFeature}
        </div>
      )}
    </article>
  )
}

function SchoolDetailContent({ school, onClose }: { school: School; onClose: () => void }) {
  const accessible = school.xinleAccessible === true
  const allocationScore = validScore(school.allocationLine) ?? validScore(school.xinleLine)

  const items: Array<{ label: string; value: string; color?: string }> = [
    { label: '统招线', value: validScore(school.tongZhao) ? `${school.tongZhao} 分` : '待更新', color: '#E8784A' },
    { label: '分配线', value: allocationScore ? `${allocationScore} 分` : '待更新', color: '#1D9E75' },
    { label: '学费', value: school.tuitionFee || '—' },
    { label: '住宿', value: school.boardingAvail ? (school.boardingFee || '可住宿') : '走读' },
    { label: '距离', value: school.distanceFromXinle ? `距新乐 ${school.distanceFromXinle}` : '—' },
    { label: '批次', value: school.batch || '—' },
  ]

  return (
    <div>
      {/* 品牌头部 */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(150deg,#1B4A3D 0%,#0E5E4E 60%,#123C35 100%)',
        padding: '18px 20px', color: '#fff',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -30, width: 150, height: 150, borderRadius: 999, background: 'radial-gradient(circle,rgba(201,164,92,.28),transparent 65%)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <Image src="/images/logo-small.png" alt="牧哲学堂" width={40} height={40} style={{ borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} preview={false} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.3 }}>{school.name}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.72)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {[school.category, school.location].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
          <button onClick={onClose} aria-label="关闭详情" style={{
            width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,.25)',
            background: 'rgba(255,255,255,.12)', color: '#fff', cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CloseOutlined style={{ fontSize: 14 }} />
          </button>
        </div>
        <div style={{ position: 'relative', marginTop: 10, display: 'inline-flex' }}>
          <Tag
            color={accessible ? 'green' : 'default'}
            style={{ borderRadius: 999, margin: 0, fontWeight: 700, border: accessible ? 'none' : '1px solid rgba(255,255,255,.3)', color: accessible ? '#fff' : 'rgba(255,255,255,.85)', background: accessible ? undefined : 'rgba(255,255,255,.12)' }}
          >
            {accessible ? '✓ 新乐考生可报名' : '新乐考生不可报名'}
          </Tag>
        </div>
      </div>

      {/* 数据网格 */}
      <div style={{ padding: '16px 18px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {items.map(item => (
            <div key={item.label} style={{
              borderRadius: 12, padding: '10px 12px',
              background: item.color ? `linear-gradient(135deg,${item.color}14,${item.color}08)` : 'rgba(0,0,0,.03)',
              border: item.color ? `1px solid ${item.color}28` : '1px solid rgba(0,0,0,.06)',
            }}>
              <Text style={{ display: 'block', color: C.subtle, fontSize: 11 }}>{item.label}</Text>
              <Text strong style={{ display: 'block', marginTop: 3, color: item.color || C.ink, fontSize: 15 }}>
                {item.value}
              </Text>
            </div>
          ))}
        </div>

        {!accessible && (
          <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: '#f5f2ee', color: C.error, fontSize: 12.5, fontWeight: 600 }}>
            该学校对新乐考生不开放报名，请关注其他目标学校。
          </div>
        )}

        {school.keyFeature && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <TrophyOutlined style={{ color: '#C9A45C' }} />
              <Text strong style={{ color: C.brand, fontSize: 13.5 }}>学校特色</Text>
            </div>
            <Text style={{ display: 'block', color: C.muted, fontSize: 12.5, lineHeight: 1.7 }}>{school.keyFeature}</Text>
          </div>
        )}

        {school.intro && (
          <div style={{ marginTop: 14 }}>
            <Text strong style={{ color: C.brand, fontSize: 13.5, display: 'block', marginBottom: 6 }}>学校介绍</Text>
            <Text style={{ display: 'block', color: C.muted, fontSize: 13, lineHeight: 1.8 }}>{school.intro}</Text>
          </div>
        )}

        {school.tips && (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: 'linear-gradient(135deg,rgba(201,164,92,.14),rgba(232,120,74,.06))', border: '1px solid rgba(201,164,92,.24)', color: '#7A5C22', fontSize: 12.5, lineHeight: 1.7 }}>
            <SafetyCertificateOutlined style={{ marginRight: 5 }} />{school.tips}
          </div>
        )}

        <div style={{ marginTop: 14, textAlign: 'center', color: C.subtle, fontSize: 11.5 }}>
          数据以官方招生计划为准，报名前请咨询机构确认
        </div>
      </div>
    </div>
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
      || (filter === 'provincial' && (school.batch || '').includes('省级示范'))
      || (filter === 'public' && !(school.category || '').includes('民办'))
      || (filter === 'private' && (school.category || '').includes('民办'))
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
      {/* 品牌头部 */}
      <header style={{
        position: 'relative', overflow: 'hidden', marginBottom: 14,
        borderRadius: 18, padding: '16px 18px', color: '#fff',
        background: 'linear-gradient(145deg,#1B4A3D 0%,#0E5E4E 60%,#123C35 100%)',
        boxShadow: '0 10px 24px rgba(14,94,78,.20)',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -30, width: 160, height: 160, borderRadius: 999, background: 'radial-gradient(circle,rgba(201,164,92,.28),transparent 65%)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Image src="/images/logo-small.png" alt="牧哲学堂" width={44} height={44} style={{ borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} preview={false} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.66)', letterSpacing: .5 }}>家长端 · 志愿参考</div>
            <Title level={5} style={{ margin: '2px 0 0', color: '#fff', fontSize: isMobile ? 17 : 19, fontWeight: 800 }}>高中学校库</Title>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.75)', marginTop: 3 }}>
              共 {schools.length} 所 · 可报名 {accessibleCount} 所 · 数据以官方招生计划为准
            </div>
          </div>
        </div>
      </header>

      <div style={{ marginBottom: 12 }}>
        <Input
          prefix={<SearchOutlined style={{ color: C.subtle }} />}
          placeholder="搜索学校、批次或类别"
          value={search}
          onChange={event => setSearch(event.target.value)}
          allowClear
          style={{ borderRadius: 12, height: 44, borderColor: 'rgba(0,0,0,.1)' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: 3, scrollbarWidth: 'none' }}>
        {FILTERS.map(item => {
          const active = filter === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              style={{
                flexShrink: 0, padding: '7px 14px', borderRadius: 999,
                border: `1.5px solid ${active ? C.primary : 'rgba(0,0,0,.10)'}`,
                background: active ? 'linear-gradient(135deg,rgba(232,120,74,.14),rgba(232,120,74,.06))' : C.surface,
                color: active ? C.primary : C.muted, fontSize: 12.5, fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                boxShadow: active ? '0 4px 10px rgba(232,120,74,.14)' : 'none',
              }}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div>{[1, 2, 3, 4].map(item => <Skeleton key={item} active paragraph={{ rows: 2 }} style={{ marginBottom: 10, padding: 16, borderRadius: 14, background: C.surface }} />)}</div>
      ) : grouped.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', borderRadius: 16, background: C.surface, border: '1px solid ' + C.hairline }}>
          <BankOutlined style={{ display: 'block', marginBottom: 10, fontSize: 36, color: C.subtle }} />
          <Text style={{ color: C.subtle, fontSize: 14 }}>没有找到匹配的学校</Text>
        </div>
      ) : (
        <div>
          {grouped.map(([category, groupSchools]) => (
            <section key={category} style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingLeft: 9, borderLeft: `3px solid ${C.brand}` }}>
                <Text strong style={{ color: C.brand, fontSize: 14 }}>{category}</Text>
                <Text style={{ marginLeft: 'auto', color: C.subtle, fontSize: 11 }}>{groupSchools.length} 所</Text>
              </div>
              {groupSchools.map(school => <ParentSchoolCard key={school.schoolId} school={school} onClick={() => setDetailSchool(school)} />)}
            </section>
          ))}
        </div>
      )}

      {!loading && <footer style={{ padding: '4px 0 18px', textAlign: 'center', color: C.subtle, fontSize: 11.5 }}>
        共 {schools.length} 所 · 可报名 {accessibleCount} 所 · 数据以官方招生计划为准
      </footer>}

      {/* 学校详情弹窗：居中 + logo 水印 */}
      <BrandModal
        open={!!detailSchool}
        onCancel={() => setDetailSchool(null)}
        title={null}
        footer={null}
        className="brand-centered-modal"
        width={isMobile ? '100vw' : 620}
        styles={{
          mask: { background: 'rgba(18,60,53,.48)', backdropFilter: 'blur(2px)' },
          content: {
            borderRadius: 20, overflow: 'hidden',
            background: 'linear-gradient(180deg, rgba(255,255,255,.97) 0%, rgba(251,247,238,.97) 100%), url(/images/logo.jpg) right bottom / 240px auto no-repeat',
          },
          body: { padding: 0, maxHeight: '82dvh', overflowY: 'auto' },
        }}
      >
        {detailSchool && <SchoolDetailContent school={detailSchool} onClose={() => setDetailSchool(null)} />}
      </BrandModal>
    </div>
  )
}
