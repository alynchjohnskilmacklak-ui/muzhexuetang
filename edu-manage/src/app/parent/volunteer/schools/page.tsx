'use client'

import { useEffect, useMemo, useState } from 'react'
import { Image, Input, Tag, Typography } from 'antd'
import {
  BankOutlined, CloseOutlined, EnvironmentOutlined, HomeOutlined,
  SearchOutlined, WalletOutlined, TrophyOutlined, SafetyCertificateOutlined,
} from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'
import { BrandModal } from '@/components/Common/BrandModal'
import { AnimatedNumber } from '@/components/Common/AnimatedNumber'
import { getSchoolAdmissionHistory, type SchoolAdmissionYearRecord } from '@/lib/school-admission-history'

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
  xinleAccessibleOverride?: boolean | null
  xinleEligibility?: 'eligible' | 'allocation' | 'ineligible' | 'unverified'
  xinleStatus?: string[]
  sourceUrl?: string | null
  sourceNote?: string | null
  infoVerifiedAt?: string | null
  infoConfidence?: string | null
  isProvincialDemo?: boolean
  admissionHistory?: SchoolAdmissionYearRecord[] | null
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

const ADMISSIONS_2026_PDF = 'https://www.sjzjyksxx.com.cn/business/upload/2026/richeditor/7/19/08c6f4d3282f4f04bbb3c4a872c2872e.pdf'
const FULL_SCORE_REFERENCES = [
  { year: 2024, score: 670, url: 'https://www.sjz.gov.cn/zmhd/zfxxdetail.jsp?id=539102' },
  { year: 2025, score: 800, url: 'https://www.sjz.gov.cn/columns/b69e27e8-4d0f-4b31-a67c-06481996d304/202504/08/ac97d856-53e1-4717-937e-68c4703d9371.html' },
  { year: 2026, score: 800, url: 'https://www.sjz.gov.cn/columns/b69e27e8-4d0f-4b31-a67c-06481996d304/202604/09/2773d309-7a7f-456e-953c-9f236e4ac721.html' },
]

type XinleEligibility = NonNullable<School['xinleEligibility']>

function getXinleEligibility(school: School): XinleEligibility {
  if (school.xinleEligibility) return school.xinleEligibility
  if (school.xinleAccessibleOverride === true) return 'eligible'
  if (school.xinleAccessibleOverride === false || school.xinleAccessible === false) return 'ineligible'

  const statuses = school.xinleStatus || []
  if (statuses.some(status => status.includes('统招可报') || status.includes('新乐考生可报'))) return 'eligible'
  if (statuses.some(status => status.includes('分配生可报'))) return 'allocation'
  if (statuses.some(status => status.includes('不可报') || status.includes('不招新乐'))) return 'ineligible'
  return 'unverified'
}

const ELIGIBILITY_META: Record<XinleEligibility, { label: string; color: string; section: string; description: string }> = {
  eligible: { label: '目录标注可报', color: C.success, section: '目录标注可报', description: '学校库有明确的统招报名标注，仍请以当年招生计划为准。' },
  allocation: { label: '分配生路径', color: '#8A6517', section: '分配生报考路径', description: '适用于符合分配生条件、且初中学校有对应名额的学生。' },
  unverified: { label: '待核验', color: C.subtle, section: '报名范围待核验', description: '当前资料没有足够依据确认新乐考生的报名范围。' },
  ineligible: { label: '目录标注暂不可报', color: C.error, section: '目录标注暂不可报', description: '学校库标注为不面向新乐考生；请通过官方招生渠道再次确认。' },
}

function confidenceLabel(value?: string | null) {
  if (value === 'official') return '官方来源'
  if (value === 'school') return '学校来源'
  if (value === 'media') return '媒体资料'
  if (value === 'parent') return '家长反馈'
  if (value === 'high') return '高可信'
  if (value === 'medium') return '需复核'
  if (value === 'low') return '低可信'
  return '待核验'
}

function admissionDelta2026(
  record: SchoolAdmissionYearRecord,
  line: SchoolAdmissionYearRecord['lines'][number],
  history: SchoolAdmissionYearRecord[],
): number | null {
  if (record.year !== 2026) return null
  const scopeKey = line.comparisonScope ?? null
  if (!scopeKey) return null
  const previous = history.find((item) => item.year === 2025)
  const baseline = previous?.lines.find((item) =>
    item.label === line.label && (item.comparisonScope ?? item.scope) === scopeKey,
  )
  return baseline ? line.score - baseline.score : null
}

function ParentSchoolCard({ school, onClick }: { school: School; onClick?: () => void }) {
  const eligibility = getXinleEligibility(school)
  const eligibilityMeta = ELIGIBILITY_META[eligibility]
  const accessible = eligibility === 'eligible'
  const admissionHistory = getSchoolAdmissionHistory(school)
  const latestHistory = admissionHistory.find((record) => record.lines.length > 0) || admissionHistory[0]
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
        border: `1px solid ${accessible ? 'rgba(29,158,117,.22)' : eligibility === 'allocation' ? 'rgba(138,101,23,.24)' : 'rgba(20,87,77,0.08)'}`,
        background: C.surface,
        cursor: onClick ? 'pointer' : 'default',
        boxSizing: 'border-box',
        boxShadow: '0 3px 10px rgba(20, 60, 50, 0.03)',
        transition: 'transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 180ms ease',
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
          color={accessible ? 'green' : eligibility === 'allocation' ? 'gold' : 'default'}
          style={{ flexShrink: 0, margin: 0, borderRadius: 999, fontWeight: 600, border: accessible || eligibility === 'allocation' ? 'none' : '1px solid rgba(0,0,0,.12)' }}
        >
          {eligibilityMeta.label}
        </Tag>
      </div>

      {eligibility === 'ineligible' && (
        <div style={{ marginTop: 10, padding: '7px 10px', borderRadius: 8, background: 'var(--color-surface-3)', color: C.error, fontSize: 12, fontWeight: 600 }}>
          目录当前标注新乐考生不可报，请以当年官方招生计划核实。
        </div>
      )}

      {latestHistory ? (
        <div style={{ marginTop: 11, padding: '9px 10px', borderRadius: 12, background: 'linear-gradient(135deg,rgba(232,120,74,.09),rgba(29,158,117,.04))', border: '1px solid rgba(232,120,74,.13)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text strong style={{ color: C.ink, fontSize: 11.5 }}>{latestHistory.year} 年{latestHistory.lines.length ? '已整理' : ''}录取线</Text>
            <Text style={{ color: C.subtle, fontSize: 10.5 }}>满分 {latestHistory.fullScore}</Text>
            {latestHistory.confidence === 'unverified' && <Text style={{ color: C.muted, fontSize: 10.5 }}>待复核</Text>}
          </div>
          {latestHistory.lines.length > 0 ? (
            <div style={{ display: 'grid', gap: 4, marginTop: 6 }}>
              {latestHistory.lines.slice(0, 2).map((line, index) => (
                <div key={`${line.label}-${line.scope}-${index}`} style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 11.5 }}>
                  <span style={{ color: C.muted, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line.label} · {line.scope}</span>
                  <strong style={{ marginLeft: 'auto', color: C.primary, whiteSpace: 'nowrap' }}>{line.score} 分 <span style={{ color: C.subtle, fontWeight: 500 }}>({Math.round(line.score / latestHistory.fullScore * 100)}%)</span></strong>
                </div>
              ))}
              {latestHistory.lines.length > 2 && <Text style={{ color: C.subtle, fontSize: 10.5 }}>还有 {latestHistory.lines.length - 2} 条，点开查看</Text>}
            </div>
          ) : (
            <Text style={{ display: 'block', marginTop: 5, color: C.subtle, fontSize: 11 }}>该年度校级录取线待补充</Text>
          )}
          <Text style={{ display: 'block', marginTop: 6, color: C.brand, fontSize: 10.5 }}>查看多年对比 →</Text>
        </div>
      ) : (
        <div style={{ marginTop: 10, color: C.subtle, fontSize: 11.5 }}>历年校级录取线待整理，点击查看资料口径</div>
      )}

      {eligibility === 'unverified' && (
        <div style={{ marginTop: 10, color: C.muted, fontSize: 12, lineHeight: 1.6 }}>
          当前资料没有确认报名范围；历史分数只作定位参考，不能据此判断今年能否填报。
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
  const eligibility = getXinleEligibility(school)
  const eligibilityMeta = ELIGIBILITY_META[eligibility]
  const admissionHistory = getSchoolAdmissionHistory(school)
  const verifiedDate = school.infoVerifiedAt && !Number.isNaN(new Date(school.infoVerifiedAt).getTime())
    ? new Date(school.infoVerifiedAt).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })
    : null
  const sourceUrl = school.sourceUrl && /^https?:\/\//i.test(school.sourceUrl) ? school.sourceUrl : null
  const website = school.website && /^https?:\/\//i.test(school.website) ? school.website : null

  const items: Array<{ label: string; value: string; color?: string }> = [
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
            <Image src="/images/logo-small-128.webp" alt="牧哲学堂" width={40} height={40} style={{ borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} preview={false} />
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
            color={eligibility === 'eligible' ? 'green' : eligibility === 'allocation' ? 'gold' : 'default'}
            style={{ borderRadius: 999, margin: 0, fontWeight: 700, border: 'none' }}
          >
            {eligibilityMeta.label}
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

        {eligibility !== 'eligible' && (
          <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--color-surface-3)', color: eligibility === 'ineligible' ? C.error : C.muted, fontSize: 12.5, lineHeight: 1.6, fontWeight: 600 }}>
            {eligibilityMeta.description}
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

        <section aria-label="学校信息来源" style={{ marginTop: 16, padding: '12px 13px', borderRadius: 12, background: 'var(--color-surface-3)', border: '1px solid var(--color-hairline)' }}>
          <Text strong style={{ display: 'block', color: C.brand, fontSize: 13, marginBottom: 7 }}>资料来源与核验</Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontSize: 12 }}>
            {sourceUrl ? (
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.brand, textDecoration: 'underline', textUnderlineOffset: 3 }}>查看学校资料来源</a>
            ) : (
              <span style={{ color: C.muted }}>学校来源链接待补充</span>
            )}
            <a href={ADMISSIONS_2026_PDF} target="_blank" rel="noopener noreferrer" style={{ color: C.brand, textDecoration: 'underline', textUnderlineOffset: 3 }}>石家庄市教育考试院 · 2026高中录取线</a>
            {website && <a href={website} target="_blank" rel="noopener noreferrer" style={{ color: C.brand, textDecoration: 'underline', textUnderlineOffset: 3 }}>学校官网</a>}
          </div>
          <Text style={{ display: 'block', marginTop: 7, color: C.muted, fontSize: 12, lineHeight: 1.65 }}>
            {school.sourceNote || '学校基础资料的来源说明待补充。'}
          </Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 7, color: C.subtle, fontSize: 11.5 }}>
            <span>资料核验：{verifiedDate || '待核验'}</span>
            <span>资料可信度：{confidenceLabel(school.infoConfidence)}</span>
            <span>历年录取线：{admissionHistory.length ? `${admissionHistory.length} 个年份` : '待整理'}</span>
          </div>
        </section>

        <section aria-label="历年录取分数对比" style={{ marginTop: 16, padding: '13px 13px 8px', borderRadius: 13, background: '#fff', border: '1px solid var(--color-hairline)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <Text strong style={{ color: C.brand, fontSize: 14 }}>历年录取线对比</Text>
            <Text style={{ color: C.subtle, fontSize: 10.5 }}>分数 / 当年满分 · 百分比</Text>
          </div>
          <Text style={{ display: 'block', marginTop: 4, marginBottom: 9, color: C.muted, fontSize: 11.5, lineHeight: 1.6 }}>
            仅在同校、同范围、同线型时显示 2026 对比 2025 的涨跌；原表未标范围或类别不同的记录不强行比较。
          </Text>

          {admissionHistory.length === 0 ? (
            <div style={{ padding: 13, marginBottom: 8, borderRadius: 10, background: C.canvas, color: C.subtle, fontSize: 12 }}>
              该校暂时没有可展示的年度校线资料；可以先查看下方官方满分口径与 2026 录取公告。
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 9 }}>
              {admissionHistory.map((record) => (
                <article key={record.year} style={{ padding: 11, borderRadius: 11, background: 'var(--color-surface-2)', border: '1px solid var(--color-hairline)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <Text strong style={{ color: C.ink, fontSize: 13 }}>{record.year} 年</Text>
                    <span style={{ padding: '3px 8px', borderRadius: 999, background: 'rgba(232,120,74,.1)', color: C.primary, fontSize: 11, fontWeight: 700 }}>满分 {record.fullScore} 分</span>
                  </div>
                  {record.lines.length > 0 ? (
                    <div style={{ display: 'grid', gap: 6, marginTop: 9 }}>
                      {record.lines.map((line, index) => (
                        <div key={`${line.label}-${line.scope}-${index}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'center', gap: '2px 10px', paddingBottom: 6, borderBottom: index === record.lines.length - 1 ? 'none' : '1px solid var(--color-hairline)' }}>
                          <span style={{ color: C.ink, fontSize: 12, fontWeight: 600 }}>{line.label}</span>
                          <strong style={{ color: C.primary, fontSize: 13, whiteSpace: 'nowrap' }}>{line.score} <span style={{ color: C.subtle, fontWeight: 400 }}>/ {record.fullScore}</span></strong>
                          <span style={{ color: C.subtle, fontSize: 10.5 }}>{line.scope}</span>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 4, textAlign: 'right' }}>
                            <span style={{ color: C.brand, fontSize: 10.5 }}>{(line.score / record.fullScore * 100).toFixed(1)}%</span>
                            {(() => {
                              const delta = admissionDelta2026(record, line, admissionHistory)
                              if (delta == null) return null
                              const label = delta > 0 ? `较 2025 +${delta}` : delta < 0 ? `较 2025 ${delta}` : '较 2025 持平'
                              return <span aria-label={label} style={{ padding: '2px 6px', borderRadius: 999, color: delta > 0 ? 'var(--color-success)' : delta < 0 ? 'var(--color-error)' : C.muted, background: delta > 0 ? 'var(--color-success-bg)' : delta < 0 ? 'var(--color-error-bg)' : 'var(--color-surface-3)', fontSize: 10.5, fontWeight: 700 }}>{label}</span>
                            })()}
                            {line.reviewRequired && <span title="差异绝对值达到 100 分，建议核对原表和 2025 基线" style={{ padding: '2px 6px', borderRadius: 999, color: 'var(--color-warning-text)', background: 'var(--color-warning-bg)', fontSize: 10.5, fontWeight: 700 }}>需复核</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Text style={{ display: 'block', marginTop: 7, color: C.subtle, fontSize: 11.5 }}>该年度校级录取线尚未录入。</Text>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: 7, color: C.subtle, fontSize: 10.5 }}>
                    <span>可信度：{confidenceLabel(record.confidence)}</span>
                    {record.verifiedAt && <span>核验：{new Date(record.verifiedAt).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })}</span>}
                    {record.sourceUrl && /^https?:\/\//i.test(record.sourceUrl) && <a href={record.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.brand, textDecoration: 'underline' }}>{record.sourceName || '查看来源'} ↗</a>}
                    {!record.sourceUrl && record.sourceName && <span>来源：{record.sourceName}</span>}
                  </div>
                  {record.sourceNote && <Text style={{ display: 'block', marginTop: 5, color: C.muted, fontSize: 10.5, lineHeight: 1.55 }}>{record.sourceNote}</Text>}
                </article>
              ))}
            </div>
          )}

          <div style={{ marginTop: 10, paddingTop: 9, borderTop: '1px solid var(--color-hairline)' }}>
            <Text strong style={{ display: 'block', color: C.brand, fontSize: 11.5, marginBottom: 5 }}>石家庄中考满分口径</Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {FULL_SCORE_REFERENCES.map((item) => (
                <a key={item.year} href={item.url} target="_blank" rel="noopener noreferrer" style={{ padding: '4px 7px', borderRadius: 8, background: C.canvas, color: C.brand, fontSize: 10.5, textDecoration: 'none' }}>
                  {item.year} 年 {item.score} 分 ↗
                </a>
              ))}
            </div>
            <Text style={{ display: 'block', marginTop: 5, color: C.subtle, fontSize: 10.5, lineHeight: 1.5 }}>
              满分由当年计入中考总成绩的科目分值合计；各学校录取线按招生地区和批次分别记录，不等同于市级控制线。
            </Text>
          </div>
        </section>

        <div style={{ marginTop: 12, textAlign: 'center', color: C.muted, fontSize: 11.5, lineHeight: 1.6 }}>
          牧哲学堂资料整理，如有差异以官网为主。报名范围、批次和分数线以当年官方招生计划为准。
        </div>
      </div>
    </div>
  )
}

export default function ParentSchoolsPage() {
  const isMobile = useIsMobile() ?? false
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [detailSchool, setDetailSchool] = useState<School | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/schools', { cache: 'no-store' })
      .then(async response => {
        const data = await response.json().catch(() => null) as { schools?: School[]; error?: string } | null
        if (!response.ok) throw new Error(data?.error || '学校数据加载失败')
        return data
      })
      .then(data => {
        if (!active) return
        setSchools(Array.isArray(data?.schools) ? data.schools : [])
        setLoading(false)
      })
      .catch(error => {
        console.warn('学校数据加载失败', error)
        if (!active) return
        setLoadError(true)
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => schools.filter(school => {
    const matchSearch = !search
      || school.name.includes(search)
      || school.location.includes(search)
      || (school.category || '').includes(search)
      || (school.batch || '').includes(search)
      || (school.keyFeature || '').includes(search)
    const matchFilter = filter === 'all'
      || (filter === 'accessible' && ['eligible', 'allocation'].includes(getXinleEligibility(school)))
      || (filter === 'provincial' && (school.batch || '').includes('省级示范'))
      || (filter === 'public' && !(school.category || '').includes('民办'))
      || (filter === 'private' && (school.category || '').includes('民办'))
    return matchSearch && matchFilter
  }).map((school, index) => ({ school, index })).sort((a, b) => {
    const priorities: Record<XinleEligibility, number> = { eligible: 0, allocation: 1, unverified: 2, ineligible: 3 }
    return priorities[getXinleEligibility(a.school)] - priorities[getXinleEligibility(b.school)] || a.index - b.index
  }).map(item => item.school), [schools, search, filter])

  const grouped = useMemo(() => {
    const order: XinleEligibility[] = ['eligible', 'allocation', 'unverified', 'ineligible']
    return order.map((status) => ({
      key: status,
      ...ELIGIBILITY_META[status],
      schools: filtered.filter(school => getXinleEligibility(school) === status),
    })).filter(group => group.schools.length > 0)
  }, [filtered])

  const accessibleCount = schools.filter(school => getXinleEligibility(school) === 'eligible').length
  const allocationCount = schools.filter(school => getXinleEligibility(school) === 'allocation').length
  const unverifiedCount = schools.filter(school => getXinleEligibility(school) === 'unverified').length

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
          <Image src="/images/logo-small-128.webp" alt="牧哲学堂" width={44} height={44} style={{ borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} preview={false} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.66)', letterSpacing: .5 }}>家长端 · 志愿参考</div>
            <Title level={5} style={{ margin: '2px 0 0', color: '#fff', fontSize: isMobile ? 17 : 19, fontWeight: 800 }}>高中学校库</Title>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.75)', marginTop: 3 }}>
              共 <AnimatedNumber value={schools.length} /> 所 · 目录标注可报 <AnimatedNumber value={accessibleCount} /> 所 · 分配生路径 <AnimatedNumber value={allocationCount} /> 所
            </div>
          </div>
        </div>
      </header>

      <aside aria-label="学校信息说明" style={{
        display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 12, padding: '11px 13px',
        borderRadius: 12, color: 'var(--color-ink-muted)', background: 'var(--color-surface-1)',
        border: '1px solid var(--color-hairline)', boxShadow: '0 2px 8px rgba(26,18,1,.035)',
        fontSize: 12, lineHeight: 1.65,
      }}>
        <SafetyCertificateOutlined style={{ color: C.brand, marginTop: 2, flex: '0 0 auto' }} />
        <div>
          <div style={{ color: 'var(--color-ink)', fontWeight: 700 }}>牧哲学堂资料整理，如有差异以官网为主</div>
          <div>历史校线按年度展示并注明来源；未核验的项目数据会标注“待复核”。报名范围和当年分数请核对官方招生文件。</div>
          <a href={ADMISSIONS_2026_PDF} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 4, color: C.brand, textDecoration: 'underline', textUnderlineOffset: 3 }}>
            查看石家庄市教育考试院 2026 年高中录取分数线 ↗
          </a>
        </div>
      </aside>

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

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: 4, scrollbarWidth: 'none' }}>
        {FILTERS.map(item => {
          const active = filter === item.key
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(item.key)}
              style={{
                flexShrink: 0, padding: '7px 16px', borderRadius: 999,
                border: active ? '1px solid #14574D' : '1px solid rgba(60,80,72,.14)',
                background: active ? '#14574D' : '#ffffff',
                color: active ? '#ffffff' : '#5A4E3A',
                fontSize: 12.5, fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                boxShadow: active ? '0 3px 10px rgba(20,87,77,.25)' : '0 1px 3px rgba(0,0,0,.02)',
                transition: 'all .18s cubic-bezier(.2,.8,.2,1)',
              }}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div role="status" aria-label="正在加载学校资料" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3, 4].map(item => (
            <div key={item} style={{ padding: 14, borderRadius: 16, background: C.surface, border: `1px solid ${C.hairline}`, boxShadow: '0 2px 10px rgba(26,18,1,.04)' }}>
              <div className="mz-skeleton" style={{ width: '45%', height: 15, borderRadius: 6, marginBottom: 6 }} />
              <div className="mz-skeleton" style={{ width: '70%', height: 11, borderRadius: 6, marginBottom: 11 }} />
              <div className="mz-skeleton" style={{ width: '100%', height: 56, borderRadius: 12 }} />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div role="alert" style={{ padding: 20, textAlign: 'center', borderRadius: 16, background: 'var(--color-surface-1)', border: '1px solid var(--color-hairline)' }}>
          <Text style={{ display: 'block', color: C.muted, fontSize: 14 }}>学校资料暂时加载失败，请检查网络后刷新页面。</Text>
        </div>
      ) : grouped.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', borderRadius: 16, background: C.surface, border: '1px solid ' + C.hairline }}>
          <BankOutlined style={{ display: 'block', marginBottom: 10, fontSize: 36, color: C.subtle }} />
          <Text style={{ color: C.subtle, fontSize: 14 }}>没有找到匹配的学校</Text>
        </div>
      ) : (
        <div>
          {grouped.map(group => (
            <section key={group.key} style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <Text strong style={{ color: C.brand, fontSize: 14 }}>{group.section}</Text>
                <Text style={{ marginLeft: 'auto', color: C.subtle, fontSize: 11 }}>{group.schools.length} 所</Text>
              </div>
              <Text style={{ display: 'block', marginBottom: 10, color: C.subtle, fontSize: 11.5, lineHeight: 1.5 }}>{group.description}</Text>
              {group.schools.map((school, schoolIndex) => (
                <div key={school.schoolId} className="stagger-item" style={{ animationDelay: `${Math.min(schoolIndex, 8) * 40}ms` }}>
                  <ParentSchoolCard school={school} onClick={() => setDetailSchool(school)} />
                </div>
              ))}
            </section>
          ))}
        </div>
      )}

      {!loading && <footer style={{ padding: '4px 0 18px', textAlign: 'center', color: C.subtle, fontSize: 11.5 }}>
        共 <AnimatedNumber value={schools.length} /> 所 · 目录标注可报 <AnimatedNumber value={accessibleCount} /> 所 · 分配生路径 <AnimatedNumber value={allocationCount} /> 所 · 待核验 <AnimatedNumber value={unverifiedCount} /> 所
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
