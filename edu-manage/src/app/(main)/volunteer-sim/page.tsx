'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button, Collapse, Divider, Form, InputNumber, Modal, Select,
  Spin, Switch, Tag, Typography,
} from 'antd'
import {
  ArrowLeftOutlined, TrophyOutlined,
  CloseOutlined, FilePdfOutlined, ShareAltOutlined, SwapOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  CONTROL_LINES_2025,
  getAllocationBands,
  getAllocationLine,
  getAllocationQuotaByName,
  getMarketPercentile,
  getMarketRank,
  getScoreTag,
  getTopRecommendation,
  isXinleAccessible,
  SCORE_TAG_CONFIG,
  XINLE_ALLOCATION_2025,
  type AllocationBand,
  type ScoreTag,
} from '@/data/volunteer-2025'

const { Title, Text } = Typography

const XINLE_SCHOOLS = Object.keys(XINLE_ALLOCATION_2025).filter((school) => school !== '超击武校')

const DISCLAIMER_TEXT =
  '本方案依据 2025 年石家庄中考数据测算给出，结果仅供参考，并非百分之百准确，仅为方便孩子更好地对比择校。所填信息仍需家长仔细核对，本机构不承担任何后果。'

// 真实二维码替换后，standalone 部署需重新构建并同步 public 目录。
const CONSULT_QR_SRC = '/volunteer/consult-qr.png'

interface DBSchool {
  id: string
  schoolId: string
  name: string
  fullName: string
  type: string
  location: string
  address: string | null
  distanceFromXinle: string | null
  yiTong: number | null
  tongZhao: number
  allocationLine: number | null
  xinleAccessible: boolean
  xinleAccessibleOverride: boolean | null
  xinleAllocationId: string | null
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
  sourceUrl: string | null
  sourceNote: string | null
  infoVerifiedAt: string | null
  infoConfidence: string | null
  acceptsOtherCounty: boolean
}

interface ProcessedSchool extends DBSchool {
  tag: ScoreTag
  gap: number
  quota: number
  accessible: boolean
}

const TAG_OPTIONS: ('全部' | ScoreTag)[] = ['全部', '分配生机会', '保底', '稳妥', '冲刺', '差距较大', '暂未达线']
const TYPE_OPTIONS = ['全部', '省示范', '市重点', '县中', '民办']

// Warm light theme tokens — module scope for all functions
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
  warning: '#C77F00',
  warningBg: '#fdf4e3',
  warningBorder: '#f0dca8',
  successBorder: '#b6e2d2',
  primaryBorder: '#f5c9b3',
  error: '#E24B4A',
  errorBg: '#fdeceb',
  white: '#ffffff',
  blue: '#1890ff',
  purple: '#722ed1',
}

export default function VolunteerSimPage() {
  const router = useRouter()
  const isMobile = useIsMobile() ?? false
  const [form] = Form.useForm()
  const reportRef = useRef<HTMLDivElement>(null)
  const posterRef = useRef<HTMLDivElement>(null)

  const [inputScore, setInputScore] = useState<number | null>(null)
  const [inputSchool, setInputSchool] = useState<string>('')
  const [inputRank, setInputRank] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const [schools, setSchools] = useState<DBSchool[]>([])
  const [loading, setLoading] = useState(false)
  const [schoolsReady, setSchoolsReady] = useState(false)
  const [schoolsError, setSchoolsError] = useState(false)

  const [filterTag, setFilterTag] = useState<string>('全部')
  const [filterType, setFilterType] = useState<string>('全部')
  const [filterLocation, setFilterLocation] = useState<string>('全部')
  const [onlyAccessible, setOnlyAccessible] = useState(true)

  const [allocationSlot, setAllocationSlot] = useState<DBSchool | null>(null)
  const [tongzhaoSlots, setTongzhaoSlots] = useState<(DBSchool | null)[]>(Array(6).fill(null))

  const [detailSchool, setDetailSchool] = useState<ProcessedSchool | null>(null)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingPoster, setExportingPoster] = useState(false)

  // First-visit onboarding
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === 'undefined') return true
    return !localStorage.getItem('volunteer_sim_onboarding_done')
  })

  const dismissOnboarding = () => {
    localStorage.setItem('volunteer_sim_onboarding_done', '1')
    setShowOnboarding(false)
  }

  useEffect(() => {
    fetch('/api/volunteer/schools')
      .then(r => r.json())
      .then(d => setSchools(Array.isArray(d?.schools) ? d.schools : []))
      .catch((error) => { console.warn('学校数据加载失败', error); setSchoolsError(true) })
      .finally(() => setSchoolsReady(true))
  }, [])

  const locations = useMemo(() => {
    const set = new Set<string>()
    schools.forEach(s => { if (s.location) set.add(s.location) })
    return Array.from(set).sort()
  }, [schools])

  const getAllocationQuota = useCallback((school: DBSchool): number => {
    if (!inputSchool) return 0
    return getAllocationQuotaByName(school.name, school.fullName, inputSchool)
  }, [inputSchool])

  const marketRankResult = submitted && inputScore !== null ? getMarketRank(inputScore) : null
  const percentileResult = submitted && inputScore !== null ? getMarketPercentile(inputScore) : null

  const processedSchools = useMemo((): ProcessedSchool[] => {
    if (!submitted || inputScore === null) return []
    return schools
      .map(school => {
        const quota = getAllocationQuota(school)
        const allocationLine = getAllocationLine(school)
        const tag = getScoreTag(
          inputScore,
          school.tongZhao,
          allocationLine,
          quota,
          inputRank ?? 9999
        )
        const gap = inputScore - school.tongZhao
        const accessible = school.xinleAccessibleOverride ?? isXinleAccessible({...school, acceptsOtherCounty: school.acceptsOtherCounty})
        return { ...school, allocationLine, tag, gap, quota, accessible }
      })
      .sort((a, b) => {
        if (a.accessible !== b.accessible) return a.accessible ? -1 : 1
        const pa = SCORE_TAG_CONFIG[a.tag].priority
        const pb = SCORE_TAG_CONFIG[b.tag].priority
        if (pa !== pb) return pa - pb
        return b.tongZhao - a.tongZhao
      })
  }, [schools, submitted, inputScore, inputRank, getAllocationQuota])

  const filteredSchools = useMemo(() => {
    return processedSchools.filter(s => {
      if (onlyAccessible && !s.accessible) return false
      if (filterTag !== '全部' && s.tag !== filterTag) return false
      if (filterType !== '全部' && s.type !== filterType) return false
      if (filterLocation !== '全部' && s.location !== filterLocation) return false
      return true
    })
  }, [processedSchools, onlyAccessible, filterTag, filterType, filterLocation])

  // Tag counts reflect current visibility scope
  const tagCounts = useMemo(() => {
    const base = onlyAccessible ? processedSchools.filter(s => s.accessible) : processedSchools
    const counts: Record<string, number> = {}
    for (const t of TAG_OPTIONS) {
      counts[t] = t === '全部' ? base.length : base.filter(s => s.tag === t).length
    }
    return counts
  }, [processedSchools, onlyAccessible])

  // Accessibility summary counts
  const accessibleSummary = useMemo(() => {
    const accessible = processedSchools.filter(s => s.accessible)
    const counts: Record<string, number> = {}
    for (const t of TAG_OPTIONS) {
      if (t === '全部') continue
      counts[t] = accessible.filter(s => s.tag === t).length
    }
    return { total: accessible.length, counts }
  }, [processedSchools])

  // Allocation cascade bands
  const allocationBands = useMemo(() => {
    if (!submitted || inputScore === null || !inputSchool || inputRank === null) return null
    return getAllocationBands(
      inputSchool, inputRank, inputScore,
      (allocKey) => {
        const s = schools.find(school => {
          if (!school?.name || !school?.fullName) return false
          return (
            school.name === allocKey ||
            school.fullName === allocKey ||
            school.fullName.includes(allocKey) ||
            school.name.replace(/[(（][^)）]*[)）]\s*$/, '').trim() === allocKey
          )
        })
        return s ? { yiTong: s.yiTong, tongZhao: s.tongZhao, allocationLine: s.allocationLine } : null
      }
    )
  }, [submitted, inputScore, inputSchool, inputRank, schools])

  const allocationTop = useMemo(() => {
    if (!allocationBands) return null
    return getTopRecommendation(allocationBands)
  }, [allocationBands])

  const handleSimulate = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 300))
      setInputScore(values.score)
      setInputSchool(values.schoolName)
      setInputRank(values.schoolRank)
      setSubmitted(true)
      setAllocationSlot(null)
      setTongzhaoSlots(Array(6).fill(null))
      setTimeout(() => {
        document.getElementById('sim-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 150)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    form.resetFields()
    setSubmitted(false)
    setInputScore(null)
    setInputSchool('')
    setInputRank(null)
    setAllocationSlot(null)
    setTongzhaoSlots(Array(6).fill(null))
    setFilterTag('全部')
    setFilterType('全部')
    setFilterLocation('全部')
    setOnlyAccessible(true)
  }

  const addToAllocation = useCallback((school: DBSchool) => {
    setAllocationSlot(school)
  }, [])

  const removeAllocation = useCallback(() => {
    setAllocationSlot(null)
  }, [])

  const addToTongzhao = useCallback((school: DBSchool) => {
    setTongzhaoSlots(prev => {
      const idx = prev.findIndex(s => s?.schoolId === school.schoolId)
      if (idx !== -1) return prev
      const emptyIdx = prev.findIndex(s => s === null)
      if (emptyIdx === -1) return prev
      const next = [...prev]
      next[emptyIdx] = school
      return next
    })
  }, [])

  const removeTongzhao = useCallback((index: number) => {
    setTongzhaoSlots(prev => {
      const next = [...prev]
      next[index] = null
      return next
    })
  }, [])

  const swapTongzhao = useCallback((from: number, to: number) => {
    setTongzhaoSlots(prev => {
      const next = [...prev]
      const tmp = next[from]
      next[from] = next[to]
      next[to] = tmp
      return next
    })
  }, [])

  const isInBasket = useCallback((schoolId: string) => {
    if (allocationSlot?.schoolId === schoolId) return true
    return tongzhaoSlots.some(s => s?.schoolId === schoolId)
  }, [allocationSlot, tongzhaoSlots])

  const tongzhaoFilled = tongzhaoSlots.filter(Boolean).length

  const exportPdf = async () => {
    const el = reportRef.current
    if (!el) return
    try {
      setExportingPdf(true)
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      const img = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageW = 210
      const pageH = 297
      const imgH = (canvas.height * pageW) / canvas.width
      let heightLeft = imgH
      let position = 0
      pdf.addImage(img, 'PNG', 0, position, pageW, imgH)
      heightLeft -= pageH
      while (heightLeft > 0) {
        position -= pageH
        pdf.addPage()
        pdf.addImage(img, 'PNG', 0, position, pageW, imgH)
        heightLeft -= pageH
      }
      pdf.save(`志愿方案_${inputSchool || '未填写初中'}_${inputScore ?? '未填'}分_${new Date().toISOString().slice(0,10)}.pdf`)
    } catch (error) {
      console.error('PDF生成失败', error)
      toast.error('生成失败，请重试')
    } finally {
      setExportingPdf(false)
    }
  }

  const exportPoster = async () => {
    const el = posterRef.current
    if (!el) return
    try {
      setExportingPoster(true)
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(el, { scale: 2, useCORS: true })
      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `志愿模拟海报_${new Date().toISOString().slice(0,10)}.png`
        a.click()
        URL.revokeObjectURL(url)
      }, 'image/png')
    } catch (error) {
      console.error('海报生成失败', error)
      toast.error('生成失败，请重试')
    } finally {
      setExportingPoster(false)
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', color: C.ink }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.back()}
          style={{ color: C.inkSubtle }}
          aria-label="返回上一页"
        />
        <div>
          <Title level={4} style={{ margin: 0, fontSize: 18, color: C.ink }}>志愿模拟填报</Title>
          <Text style={{ fontSize: 13, color: C.inkSubtle }}>
            基于2025年石家庄中考数据 · 仅限新乐市考生 · 结果仅供参考
          </Text>
        </div>
      </div>

      {/* First-visit onboarding guide */}
      {showOnboarding && (
        <div style={{
          background: 'linear-gradient(135deg, #fff3ec 0%, #fdf4e3 100%)',
          border: `1px solid ${C.primaryBorder}`,
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 20,
          position: 'relative',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text strong style={{ fontSize: 14, color: C.primary }}>新手指南：三步完成志愿模拟</Text>
            <Button type="text" size="small" onClick={dismissOnboarding} style={{ color: C.inkSubtle, fontSize: 12 }}>
              知道了
            </Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { step: '1', text: '输入学生中考成绩、就读初中和本校排名', color: C.primary },
              { step: '2', text: '查看全市排名、分配生推荐和学校匹配结果', color: C.success },
              { step: '3', text: '从推荐列表中挑选7个志愿（1分配生+6统招）加入底部志愿篮', color: C.purple },
            ].map((item) => (
              <div key={item.step} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: item.color, color: '#fff', fontSize: 12, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {item.step}
                </span>
                <Text style={{ fontSize: 13, color: C.inkMuted }}>{item.text}</Text>
              </div>
            ))}
          </div>
          <Text style={{ display: 'block', marginTop: 10, fontSize: 11, color: C.inkSubtle }}>
            提示：分数和排名信息请从学校班主任处获取。不确定排名？可以先输入分数体验，排名留空不影响模拟。
          </Text>
        </div>
      )}

      <Collapse
        ghost
        size="small"
        style={{ marginBottom: 20 }}
        defaultActiveKey={showOnboarding ? ['disclaimer'] : undefined}
        items={[{
          key: 'disclaimer',
          label: <span style={{ color: C.warning, fontSize: 13, fontWeight: 500 }}>重要提示：本系统仅供模拟参考，非官方录取结果</span>,
          children: <span style={{ color: C.inkMuted, fontSize: 13, lineHeight: 1.8 }}>本系统基于2025年石家庄中考一分一档表、全市统招线和各初中分配生名额进行模拟，仅供志愿填报参考。全市排名基于一分一档表测算。梯度标签（冲刺/稳妥/保底）基于2025年分数线静态计算，不代表2026年实际录取结果。分配生级联推荐基于"全校按分数优先填报"的理想假设，实际录取受考生意愿、分配生控制线、同校竞争等因素影响。最终录取以石家庄市教育考试院和学校官方公布为准。</span>,
        }]}
      />

      {/* Input Area */}
      {!submitted ? (
        <div style={{
          background: C.surface1,
          border: `1px solid ${C.hairline}`,
          borderRadius: 14,
          padding: 24,
          marginBottom: 20,
        }}>
          <Spin spinning={!schoolsReady} tip="正在加载学校数据...">
            {schoolsError && (
              <div style={{ background: C.errorBg, border: `1px solid ${C.error}`, borderRadius: 8, padding: '8px 14px', marginBottom: 16, color: C.error, fontSize: 13 }}>
                学校数据加载失败，请刷新页面重试
              </div>
            )}
            <Form form={form} layout="vertical">
              {/* Score — hero input */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <Text style={{ display: 'block', fontSize: 14, color: C.inkMuted, fontWeight: 500, marginBottom: 12 }}>
                  请输入学生中考成绩
                </Text>
                <Form.Item
                  name="score"
                  noStyle
                  rules={[
                    { required: true, message: '请输入分数' },
                    { type: 'number', min: 0, max: 800, message: '分数范围 0 - 800' },
                  ]}
                >
                  <InputNumber
                    placeholder="678"
                    min={0}
                    max={800}
                    size="large"
                    style={{
                      width: '100%',
                      maxWidth: 320,
                      fontSize: 32,
                      fontWeight: 700,
                      fontFamily: 'var(--font-geist-sans)',
                    }}
                    className="score-hero-input"
                  />
                </Form.Item>
                <Text style={{ display: 'block', fontSize: 13, color: C.inkSubtle, marginTop: 8 }}>
                  满分 800 分
                </Text>
              </div>

              {/* Secondary inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', maxWidth: 480, margin: '0 auto' }}>
                <Form.Item
                  name="schoolName"
                  label={<span style={{ color: C.inkMuted, fontWeight: 500 }}>就读初中</span>}
                  rules={[{ required: true, message: '请选择初中' }]}
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    placeholder="选择新乐初中"
                    size="large"
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label as string || '').includes(input)
                    }
                    options={XINLE_SCHOOLS.map((school) => ({ label: school, value: school }))}
                  />
                </Form.Item>
                <Form.Item
                  name="schoolRank"
                  label={<span style={{ color: C.inkMuted, fontWeight: 500 }}>本校排名</span>}
                  rules={[
                    { required: true, message: '请输入排名' },
                    { type: 'number', min: 1, message: '至少第1名' },
                  ]}
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber style={{ width: '100%' }} placeholder="例：5" min={1} size="large" />
                </Form.Item>
              </div>

              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <Button
                  type="primary"
                  size="large"
                  onClick={handleSimulate}
                  loading={loading}
                  style={{ background: C.primary, borderColor: C.primary, minWidth: 200, height: 48, fontSize: 16, fontWeight: 600 }}
                >
                  开始模拟
                </Button>
              </div>
            </Form>
          </Spin>
        </div>
      ) : (
        /* Summary bar — white card */
        <div style={{
          background: C.surface1,
          border: `1px solid ${C.hairline}`,
          borderRadius: 12,
          padding: '16px 24px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <Text style={{ color: C.inkSubtle, fontSize: 12 }}>分数</Text>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.primary, lineHeight: 1.2 }}>{inputScore}</div>
            </div>
            <div style={{ width: 1, height: 32, background: C.hairline }} />
            <div>
              <Text style={{ color: C.inkSubtle, fontSize: 12 }}>全市排名</Text>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>
                {marketRankResult?.rank != null ? `约第 ${marketRankResult.rank.toLocaleString()} 名` : '—'}
              </div>
              {marketRankResult?.message && (
                <Text style={{ fontSize: 10, color: C.inkSubtle, display: 'block' }}>{marketRankResult.message}</Text>
              )}
            </div>
            <div style={{ width: 1, height: 32, background: C.hairline }} />
            <div>
              <Text style={{ color: C.inkSubtle, fontSize: 12 }}>超越全市</Text>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.success }}>
                {percentileResult?.percentile !== '—' ? `${(100 - parseFloat(percentileResult?.percentile || '0')).toFixed(1)}%` : '—'}
              </div>
            </div>
            <div style={{ width: 1, height: 32, background: C.hairline }} />
            <div>
              <Text style={{ color: C.inkSubtle, fontSize: 12 }}>新乐控制线</Text>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>
                {CONTROL_LINES_2025['新乐市']}分
              </div>
            </div>
            <Tag color={inputScore !== null && inputScore >= CONTROL_LINES_2025['新乐市'] ? 'success' : 'error'}>
              {inputScore !== null && inputScore >= CONTROL_LINES_2025['新乐市'] ? '已过控制线' : '未过控制线'}
            </Tag>
          </div>
          <Button onClick={handleReset} style={{ color: C.inkMuted }}>重新输入</Button>
        </div>
      )}

      {submitted && (
        <div id="sim-result" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 20 }}>
          {/* Filters — sidebar on desktop, horizontal chips on mobile */}
          {isMobile ? (
            <MobileFilterBar
              tagCounts={tagCounts}
              filterTag={filterTag}
              setFilterTag={setFilterTag}
              filterType={filterType}
              setFilterType={setFilterType}
              filterLocation={filterLocation}
              setFilterLocation={setFilterLocation}
              locations={locations}
              onlyAccessible={onlyAccessible}
              setOnlyAccessible={setOnlyAccessible}
            />
          ) : (
            <DesktopFilterSidebar
              tagCounts={tagCounts}
              filterTag={filterTag}
              setFilterTag={setFilterTag}
              filterType={filterType}
              setFilterType={setFilterType}
              filterLocation={filterLocation}
              setFilterLocation={setFilterLocation}
              locations={locations}
              onlyAccessible={onlyAccessible}
              setOnlyAccessible={setOnlyAccessible}
            />
          )}

          {/* Main content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Accessibility summary bar */}
            <div style={{
              background: C.surface1,
              border: `1px solid ${C.hairline}`,
              borderRadius: 10,
              padding: '10px 16px',
              marginBottom: 12,
              fontSize: 13,
              color: C.inkMuted,
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 6,
            }}>
              <Text strong style={{ color: C.primary, fontSize: 15, marginRight: 4 }}>
                共 {accessibleSummary.total} 所新乐可报学校
              </Text>
              <span style={{ color: C.inkSubtle }}>·</span>
              {TAG_OPTIONS.filter(t => t !== '全部').map(t => {
                const cfg = SCORE_TAG_CONFIG[t]
                return (
                  <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    <span style={{ color: cfg.color, fontWeight: 600 }}>{t}</span>
                    <span style={{ color: C.inkSubtle }}>{accessibleSummary.counts[t] ?? 0}</span>
                  </span>
                )
              }).reduce((prev, curr) => <>{prev} <span style={{ color: C.inkSubtle }}>·</span> {curr}</>)}
            </div>

            {/* Allocation cascade analysis */}
            {allocationBands && allocationBands.length > 0 && (
              <div style={{
                background: C.surface1,
                border: `1px solid ${C.hairline}`,
                borderRadius: 12,
                padding: '16px 20px',
                marginBottom: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 16 }}>📋</span>
                  <Text strong style={{ fontSize: 15, color: C.ink }}>分配生志愿（只能填1所）</Text>
                </div>

                {/* Top recommendation */}
                {allocationTop ? (
                  (() => {
                    const topBand = allocationTop.band
                    const topDb = schools.find(s => s.name === topBand.highSchoolName || s.fullName.includes(topBand.highSchoolName))
                    const isFallback = allocationTop.source === 'fallback_safe'
                    return (
                      <div style={{
                        background: isFallback ? C.warningBg : C.primaryBg,
                        border: `1px solid ${isFallback ? C.warningBorder : C.primary}`,
                        borderRadius: 10,
                        padding: '14px 18px',
                        marginBottom: 12,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 14 }}>{isFallback ? '🔶' : '💡'}</span>
                          <Text strong style={{ fontSize: 15, color: isFallback ? C.warning : C.primary }}>
                            {isFallback ? '稳妥选择：' : '分配生志愿首选建议：'}【{topBand.highSchoolName}】
                          </Text>
                        </div>
                        <Text style={{ fontSize: 13, color: C.inkMuted, lineHeight: 1.7 }}>
                          {isFallback
                            ? `排名高于该档（前${topBand.bandLo - 1}名通常会竞争更好的学校），可作为稳妥选择，但可能浪费分配生机会。`
                            : `你校内第${topBand.bandLo < topBand.bandHi ? `${topBand.bandLo}-${topBand.bandHi}` : topBand.bandLo}名，落在${topBand.highSchoolName}名额区间（第${topBand.bandLo}-${topBand.bandHi}名）${topBand.allocationLine ? `，分数${inputScore}已超分配线约${inputScore! - topBand.allocationLine.value}分` : ''}，可重点考虑。分配生只能填1所，建议填报此校。`}
                        </Text>
                        <div style={{ marginTop: 10 }}>
                          {topDb ? (
                            <Button
                              type="primary"
                              size="small"
                              style={{ background: C.primary, borderColor: C.primary }}
                              disabled={!!allocationSlot}
                              onClick={() => addToAllocation(topDb)}
                            >
                              {allocationSlot ? '分配生位已占用' : '设为首选分配生志愿'}
                            </Button>
                          ) : (
                            <Text style={{ fontSize: 12, color: C.inkSubtle }}>
                              该校尚未录入数据库，请通过管理端补充后即可选择。
                            </Text>
                          )}
                        </div>
                      </div>
                    )
                  })()
                ) : (
                  <div style={{
                    background: C.warningBg,
                    border: `1px solid ${C.warningBorder}`,
                    borderRadius: 10,
                    padding: '12px 18px',
                    marginBottom: 12,
                  }}>
                    <Text style={{ fontSize: 13, color: C.warning }}>
                      当前分数与排名条件下，该校无可推荐或可保底的分配生选项。建议重点考虑平行统招志愿。
                    </Text>
                  </div>
                )}

                {/* 推荐组（不含首选） */}
                {allocationBands.filter(b => b.tag === '推荐' && b !== allocationTop?.band).length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <Text strong style={{ fontSize: 13, color: C.inkMuted }}>其他匹配选项：</Text>
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {allocationBands.filter(b => b.tag === '推荐' && b !== allocationTop?.band).map(b => {
                        const db = schools.find(s => s.name === b.highSchoolName || s.fullName.includes(b.highSchoolName))
                        return (
                          <div key={b.highSchoolName} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 14px', borderRadius: 8,
                            background: C.surface3, border: `1px solid ${C.hairline}`,
                          }}>
                            <span style={{ fontSize: 13, color: C.ink }}>◎ {b.highSchoolName}</span>
                            <Text style={{ fontSize: 12, color: C.inkSubtle }}>
                              {b.allocationLine ? `${b.allocationLine.label} ${b.allocationLine.value}分 · ` : ''}名额第{b.bandLo}-{b.bandHi}名
                            </Text>
                            {db && (
                              <Button size="small" disabled={!!allocationSlot}
                                style={{ marginLeft: 'auto', fontSize: 11 }}
                                onClick={() => addToAllocation(db)}>
                                {allocationSlot ? '已占用' : '选为分配生'}
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 保底组 */}
                {allocationBands.filter(b => b.tag === '保底').length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <Text strong style={{ fontSize: 13, color: C.success }}>保底选项（排名优于该档，可重点考虑）：</Text>
                    <div style={{ marginTop: 4, fontSize: 12, color: C.inkSubtle, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {allocationBands.filter(b => b.tag === '保底').map(b => (
                        <span key={b.highSchoolName} style={{
                          background: C.successBg, padding: '3px 8px', borderRadius: 6,
                          border: `1px solid ${C.successBorder}`, color: C.success,
                        }}>
                          {b.highSchoolName}{b.allocationLine ? `（${b.allocationLine.label}${b.allocationLine.value}分）` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 排名不足 */}
                {allocationBands.filter(b => b.tag === '排名不足').length > 0 && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8, marginBottom: 8,
                    background: C.warningBg, border: `1px solid ${C.warningBorder}`,
                  }}>
                    <Text style={{ fontSize: 12, color: C.warning }}>
                      ⚠️ 以下学校存在校内排名竞争风险，难以争取：
                    </Text>
                    <div style={{ marginTop: 4, fontSize: 12, color: C.inkSubtle }}>
                      {allocationBands.filter(b => b.tag === '排名不足').map(b =>
                        `${b.highSchoolName}（校内前${b.bandHi}名）`
                      ).join('、')}
                    </div>
                  </div>
                )}

                {/* 分数不足 */}
                {allocationBands.filter(b => b.tag === '分数不足').length > 0 && (
                  <div style={{
                    padding: '8px 14px', borderRadius: 8, marginBottom: 8,
                    background: C.surface3, border: `1px solid ${C.hairline}`,
                  }}>
                    <Text style={{ fontSize: 12, color: C.inkSubtle }}>
                      以下学校分数未达分配线：{allocationBands.filter(b => b.tag === '分数不足').map(b =>
                        `${b.highSchoolName}（需≥${b.allocationLine?.value ?? '?'}分）`
                      ).join('、')}
                    </Text>
                  </div>
                )}

                {/* Disclaimer */}
                <div style={{
                  marginTop: 12, padding: '8px 14px', borderRadius: 8,
                  background: C.surface3, border: `1px solid ${C.hairline}`,
                }}>
                  <Text style={{ fontSize: 11, color: C.inkSubtle, lineHeight: 1.6 }}>
                    说明：级联模型基于“全校学生按分数优先选最好学校”的理想假设，实际中部分学生有偏好（如宁可就近上新乐一中也不去市区），会使各档边界浮动。分配线仅使用数据库录入的官方分配生录取线；未录入时页面不展示分配线。真实录取受考生填报意愿、分配生控制线、同校竞争、当年政策影响，最终以石家庄市教育考试院和学校官方公布为准。
                  </Text>
                </div>
              </div>
            )}

            {/* No allocation data warning */}
            {allocationBands && allocationBands.length === 0 && (
              <div style={{
                background: C.warningBg, border: `1px solid ${C.warningBorder}`,
                borderRadius: 10, padding: '12px 16px', marginBottom: 16,
              }}>
                <Text style={{ fontSize: 13, color: C.warning }}>
                  该初中（{inputSchool}）目前无分配生名额数据，请检查分配表是否覆盖此初中，或联系管理员核实。
                </Text>
              </div>
            )}

            {/* Category tabs */}
            <div style={{
              display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap',
            }}>
              {TAG_OPTIONS.map(t => {
                const cfg = t === '全部' ? null : SCORE_TAG_CONFIG[t]
                return (
                  <div
                    key={t}
                    onClick={() => setFilterTag(t)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: filterTag === t ? 600 : 400,
                      background: filterTag === t
                        ? (cfg?.bg ?? C.primaryBg)
                        : C.surface3,
                      border: `1px solid ${filterTag === t ? (cfg?.border ?? C.hairlineStrong) : C.hairline}`,
                      color: filterTag === t ? (cfg?.color ?? C.primary) : C.inkMuted,
                      transition: 'all .15s',
                    }}
                  >
                    {t}
                    <span style={{ marginLeft: 6, fontSize: 11, color: C.inkSubtle }}>
                      {tagCounts[t] ?? 0}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* School cards — grouped by tier */}
            {filteredSchools.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: 60, color: C.inkSubtle,
                background: C.surface1, borderRadius: 14, border: `1px solid ${C.hairline}`,
              }}>
                <TrophyOutlined style={{ fontSize: 40, marginBottom: 12, color: C.hairline }} />
                <div style={{ fontSize: 15 }}>暂无匹配学校</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>请调整筛选条件或修改分数后重试</div>
              </div>
            ) : (
              <TieredSchoolList
                schools={filteredSchools}
                isInBasket={isInBasket}
                allocationSlot={allocationSlot}
                tongzhaoSlots={tongzhaoSlots}
                tongzhaoFilled={tongzhaoFilled}
                addToAllocation={addToAllocation}
                addToTongzhao={addToTongzhao}
                onDetail={setDetailSchool}
              />
            )}
          </div>
        </div>
      )}

      {/* School Detail Modal */}
      <Modal
        title={null}
        open={!!detailSchool}
        onCancel={() => setDetailSchool(null)}
        footer={null}
        width={640}
        styles={{
          content: { background: C.surface1, padding: 0 },
          header: { background: C.surface1 },
        }}
      >
        {detailSchool && (() => {
          const cfg = SCORE_TAG_CONFIG[detailSchool.tag]
          return (
            <div style={{ padding: '24px 24px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <Tag style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, margin: 0 }}>
                  {cfg.label}
                </Tag>
                {detailSchool.accessible ? (
                  <Tag style={{ margin: 0, background: C.successBg, color: C.success, border: `1px solid ${C.successBorder}` }}>
                    ✓ 新乐可报
                  </Tag>
                ) : (
                  <Tag style={{ margin: 0, background: C.surface3, color: C.inkSubtle, border: `1px solid ${C.hairline}` }}>
                    ⊘ 新乐暂不可报
                  </Tag>
                )}
              </div>

              <Title level={4} style={{ margin: '0 0 4px', color: C.ink, fontSize: 20 }}>
                {detailSchool.fullName}
              </Title>
              <Text style={{ color: C.inkSubtle, fontSize: 13 }}>{detailSchool.name}</Text>

              {/* Info grid — basic info */}
              <div style={{
                marginTop: 20,
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: isMobile ? '6px' : '8px 24px',
                padding: '16px',
                background: C.surface3,
                borderRadius: 10,
                border: `1px solid ${C.hairline}`,
              }}>
                <InfoRow label="学校类型" value={detailSchool.type} />
                <InfoRow label="所在地" value={detailSchool.location} />
                <InfoRow label="地址" value={detailSchool.address || '暂未收录'} missing={!detailSchool.address} />
                <InfoRow label="距新乐" value={detailSchool.distanceFromXinle || '暂未收录'} missing={!detailSchool.distanceFromXinle} />
                <InfoRow label="电话" value={detailSchool.phone || '暂未收录'} missing={!detailSchool.phone} />
                <InfoRow label="官网" value={detailSchool.website || '暂未收录'} missing={!detailSchool.website} />
              </div>

              {/* Fee & enrollment info */}
              <div style={{
                marginTop: 12,
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: isMobile ? '6px' : '8px 24px',
                padding: '16px',
                background: C.surface3,
                borderRadius: 10,
                border: `1px solid ${C.hairline}`,
              }}>
                <InfoRow label="学费" value={detailSchool.tuitionFee || '暂未收录'} missing={!detailSchool.tuitionFee} />
                <InfoRow label="住宿费" value={detailSchool.boardingFee || '暂未收录'} missing={!detailSchool.boardingFee} />
                {detailSchool.enrollment && <InfoRow label="年招生人数" value={`约${detailSchool.enrollment}人`} />}
                <InfoRow label="住宿" value={detailSchool.boardingAvail ? `可住宿${detailSchool.boardingFee ? ' · ' + detailSchool.boardingFee : ''}` : '走读'} />
              </div>

              {/* Score data */}
              <div style={{
                marginTop: 12,
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr',
                gap: 10,
              }}>
                {detailSchool.yiTong && (
                  <ScoreBlock label={detailSchool.type === '民办' ? '市区统招分' : '一统线'} value={`${detailSchool.yiTong}分`} />
                )}
                <ScoreBlock label="统招线" value={`${detailSchool.tongZhao}分`} sub={`距统招线 ${detailSchool.gap >= 0 ? `高出${detailSchool.gap}` : `差${Math.abs(detailSchool.gap)}`}分`} />
                {detailSchool.allocationLine && (
                  <ScoreBlock label="分配生录取线" value={`${detailSchool.allocationLine}分`} />
                )}
              </div>

              {detailSchool.quota > 0 && (
                <div style={{
                  marginTop: 12,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: C.primaryBg,
                  border: `1px solid ${C.primaryBorder}`,
                  color: C.primary,
                  fontSize: 13,
                }}>
                  {inputSchool} → {detailSchool.name}：分配生名额 <Text strong style={{ color: C.primary }}>{detailSchool.quota}</Text> 个
                </div>
              )}

              {/* Features — always show, with fallback for missing */}
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <FeatureSection label="核心特色" content={detailSchool.keyFeature || '暂未收录'} missing={!detailSchool.keyFeature} />
                <FeatureSection label="高考/升学情况" content={detailSchool.gaokaoRate || '暂未收录'} missing={!detailSchool.gaokaoRate} />
                <div>
                  <Text strong style={{ color: C.inkMuted, fontSize: 13 }}>学校简介</Text>
                  <div style={{ color: detailSchool.intro ? C.inkMuted : C.inkSubtle, fontSize: 13, marginTop: 4, lineHeight: 1.7, fontStyle: detailSchool.intro ? 'normal' : 'italic' }}>
                    {detailSchool.intro || '暂未收录'}
                  </div>
                </div>
                <div>
                  <Text strong style={{ color: C.warning, fontSize: 13 }}>报考建议</Text>
                  <div style={{ color: detailSchool.tips ? C.inkMuted : C.inkSubtle, fontSize: 13, marginTop: 4, lineHeight: 1.7, fontStyle: detailSchool.tips ? 'normal' : 'italic' }}>
                    {detailSchool.tips || '暂未收录，以学校最新公布为准'}
                  </div>
                </div>

                {/* Source info — always show */}
                <div style={{
                  marginTop: 12, padding: '10px 14px', borderRadius: 8,
                  background: C.surface3, border: `1px solid ${C.hairline}`,
                }}>
                  <Text strong style={{ fontSize: 12, color: C.inkSubtle, display: 'block', marginBottom: 6 }}>信息来源</Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {detailSchool.sourceUrl ? (
                      <a href={detailSchool.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: C.blue }}>
                        {detailSchool.sourceUrl}
                      </a>
                    ) : (
                      <Text style={{ fontSize: 11, color: C.inkSubtle, fontStyle: 'italic' }}>暂未收录来源链接</Text>
                    )}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 11, color: detailSchool.sourceNote ? C.inkMuted : C.inkSubtle, fontStyle: detailSchool.sourceNote ? 'normal' : 'italic' }}>
                    {detailSchool.sourceNote || '暂未收录来源说明'}
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {detailSchool.infoVerifiedAt ? (
                      <Text style={{ fontSize: 11, color: C.inkSubtle }}>
                        核验时间：{new Date(detailSchool.infoVerifiedAt).toLocaleDateString('zh-CN')}
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 11, color: C.inkSubtle, fontStyle: 'italic' }}>待核实</Text>
                    )}
                    {detailSchool.infoConfidence && detailSchool.infoConfidence !== 'unknown' ? (
                      <Tag style={{ margin: 0, fontSize: 10 }} color={
                        detailSchool.infoConfidence === 'official' ? 'success' :
                        detailSchool.infoConfidence === 'school' || detailSchool.infoConfidence === 'media' ? 'processing' :
                        detailSchool.infoConfidence === 'parent' ? 'warning' : 'default'
                      }>
                        {detailSchool.infoConfidence === 'official' ? '官方来源' :
                         detailSchool.infoConfidence === 'school' ? '学校来源' :
                         detailSchool.infoConfidence === 'media' ? '第三方' :
                         detailSchool.infoConfidence === 'parent' ? '家长反馈' : '待核实'}
                      </Tag>
                    ) : (
                      <Tag style={{ margin: 0, fontSize: 10 }} color="default">待核实</Tag>
                    )}
                  </div>
                  {(!detailSchool.infoConfidence || detailSchool.infoConfidence === 'unverified' || detailSchool.infoConfidence === 'unknown') && (
                    <Text style={{ fontSize: 11, color: C.warning, display: 'block', marginTop: 4 }}>
                      该校部分信息暂未核实，请以学校官方招生简章为准。
                    </Text>
                  )}
                </div>
              </div>

              {/* Modal actions */}
              <div style={{
                display: 'flex', gap: 12, marginTop: 24, paddingTop: 16,
                borderTop: `1px solid ${C.hairline}`,
              }}>
                {detailSchool.tag === '分配生机会' && detailSchool.accessible && (
                  <Button
                    type="primary"
                    disabled={!!allocationSlot}
                    style={{ background: C.primary, borderColor: C.primary }}
                    onClick={() => { addToAllocation(detailSchool); setDetailSchool(null) }}
                  >
                    {allocationSlot ? '分配生位已占用' : '加入分配生志愿'}
                  </Button>
                )}
                {detailSchool.accessible ? (
                  <Button
                    disabled={tongzhaoFilled >= 6 || isInBasket(detailSchool.schoolId)}
                    onClick={() => { addToTongzhao(detailSchool); setDetailSchool(null) }}
                  >
                    {isInBasket(detailSchool.schoolId) ? '已在志愿篮' : tongzhaoFilled >= 6 ? '统招已满（6/6）' : '加入平行统招志愿'}
                  </Button>
                ) : (
                  <Button disabled>新乐暂不可报，无法加入志愿</Button>
                )}
              </div>
              <div style={{ height: 24 }} />
            </div>
          )
        })()}
      </Modal>

      {/* Bottom sticky volunteer basket — safe area for mobile */}
      {submitted && (
        <div style={{
          position: 'sticky',
          bottom: 0,
          marginTop: 24,
          background: C.surface1,
          borderTop: `1px solid ${C.hairline}`,
          borderLeft: `1px solid ${C.hairline}`,
          borderRight: `1px solid ${C.hairline}`,
          paddingBottom: isMobile ? 'calc(12px + env(safe-area-inset-bottom, 0px))' : undefined,
          borderRadius: '14px 14px 0 0',
          padding: '16px 24px',
          zIndex: 50,
        }}>
          {tongzhaoFilled >= 6 && allocationSlot && (
            <div style={{
              textAlign: 'center',
              marginBottom: 10,
              color: C.success,
              fontSize: 13,
              fontWeight: 600,
            }}>
              志愿已填满，共7个
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? 12 : 20, flexDirection: isMobile ? 'column' : 'row' }}>
            {/* Allocation slot */}
            <div style={{ flexShrink: 0, width: isMobile ? '100%' : undefined }}>
              <Text style={{ fontSize: 12, color: C.inkSubtle, display: 'block', marginBottom: 6 }}>
                分配生志愿
              </Text>
              {allocationSlot ? (
                <div style={{
                  width: isMobile ? '100%' : 130,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: C.primaryBg,
                  border: `1px solid ${C.primary}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.primary }}>
                      {allocationSlot.name.length > 6 ? allocationSlot.name.slice(0, 6) + '…' : allocationSlot.name}
                    </div>
                    <div style={{ fontSize: 11, color: C.inkSubtle }}>{allocationSlot.tongZhao}分</div>
                  </div>
                  <CloseOutlined
                    style={{ color: C.inkSubtle, fontSize: 12 }}
                    onClick={removeAllocation}
                  />
                </div>
              ) : (
                <div style={{
                  width: isMobile ? '100%' : 130,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: C.surface3,
                  border: `1px dashed ${C.hairlineStrong}`,
                  color: C.inkSubtle,
                  fontSize: 13,
                  textAlign: 'center',
                }}>
                  空位
                </div>
              )}
            </div>

            {/* Divider */}
            {!isMobile && <div style={{ width: 1, background: C.hairline, alignSelf: 'stretch', flexShrink: 0 }} />}

            {/* Tongzhao slots */}
            <div style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: C.inkSubtle, display: 'block', marginBottom: 6 }}>
                平行统招志愿（按意愿从高到低）
              </Text>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {tongzhaoSlots.map((slot, idx) => (
                  <SlotItem
                    key={idx}
                    index={idx}
                    school={slot}
                    onRemove={() => removeTongzhao(idx)}
                    onSwap={(targetIdx: number) => swapTongzhao(idx, targetIdx)}
                    allSlots={tongzhaoSlots}
                  />
                ))}
              </div>
            </div>
          </div>

          <div style={{ display:'flex', gap:12, justifyContent:'center', marginTop:16, flexWrap:'wrap' }}>
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              disabled={!submitted || (!allocationSlot && tongzhaoFilled === 0)}
              loading={exportingPdf}
              onClick={exportPdf}
            >导出志愿方案 PDF</Button>
            <Button
              icon={<ShareAltOutlined />}
              disabled={!submitted}
              loading={exportingPoster}
              onClick={exportPoster}
            >生成分享海报</Button>
          </div>
        </div>
      )}
      <div ref={reportRef} style={{ position:'fixed', left:-99999, top:0, zIndex:-1 }}>
        {submitted && (
          <ReportDocument
            inputScore={inputScore}
            inputSchool={inputSchool}
            inputRank={inputRank}
            marketRankResult={marketRankResult}
            percentileResult={percentileResult}
            allocationSlot={allocationSlot}
            allocationTop={allocationTop}
            tongzhaoSlots={tongzhaoSlots}
            processedSchools={processedSchools}
          />
        )}
      </div>
      <div ref={posterRef} style={{ position:'fixed', left:-99999, top:0, zIndex:-1 }}>
        {submitted && (
          <SharePoster
            marketRankResult={marketRankResult}
            percentileResult={percentileResult}
          />
        )}
      </div>
    </div>
  )
}

type RankResult = ReturnType<typeof getMarketRank> | null
type PercentileResult = ReturnType<typeof getMarketPercentile> | null
type AllocationTopResult = { band: AllocationBand; source: 'recommended' | 'fallback_safe' } | null

function ReportDocument({
  inputScore,
  inputSchool,
  inputRank,
  marketRankResult,
  percentileResult,
  allocationSlot,
  allocationTop,
  tongzhaoSlots,
  processedSchools,
}: {
  inputScore: number | null
  inputSchool: string
  inputRank: number | null
  marketRankResult: RankResult
  percentileResult: PercentileResult
  allocationSlot: DBSchool | null
  allocationTop: AllocationTopResult
  tongzhaoSlots: (DBSchool | null)[]
  processedSchools: ProcessedSchool[]
}) {
  const filledTongzhao = tongzhaoSlots.filter(Boolean) as DBSchool[]
  const rankText = marketRankResult?.rank != null ? marketRankResult.rank.toLocaleString() : '—'
  const percentileText = percentileResult?.percentile && percentileResult.percentile !== '—' ? `${percentileResult.percentile}%` : '—'

  return (
    <div style={{ width: 794, background: '#ffffff', padding: 32, color: C.ink, boxSizing: 'border-box', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #E8784A', paddingBottom: 14, marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#E8784A' }}>牧哲学堂 · 中考志愿模拟方案</div>
        <div style={{ fontSize: 13, color: C.inkSubtle }}>{new Date().toLocaleDateString('zh-CN')}</div>
      </div>

      <section style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 12 }}>考生测算概览</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          <ReportMetric label="分数" value={inputScore !== null ? `${inputScore}分` : '—'} />
          <ReportMetric label="毕业初中" value={inputSchool || '—'} />
          <ReportMetric label="校内排名" value={inputRank !== null ? `第${inputRank}名` : '—'} />
          <ReportMetric label="全市位次" value={rankText === '—' ? '—' : `第${rankText}名`} />
          <ReportMetric label="全市百分位" value={percentileText} />
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 12 }}>分配生志愿（C 段，1 所）</div>
        {allocationSlot ? (
          <div style={{ border: '1px solid #f5c9b3', background: '#fff3ec', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#E8784A' }}>{allocationSlot.name}</div>
              <div style={{ fontSize: 14, color: C.inkMuted }}>统招线 {allocationSlot.tongZhao} 分</div>
            </div>
            {allocationTop && (
              <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.7, color: C.inkMuted }}>
                推荐理由：{allocationTop.band.note}
              </div>
            )}
          </div>
        ) : (
          <div style={{ border: '1px dashed #e5ddd0', background: C.surface3, borderRadius: 10, padding: 16, color: C.inkSubtle }}>未选择</div>
        )}
      </section>

      <section style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 12 }}>平行统招志愿（D 段，最多 6 所）</div>
        {filledTongzhao.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filledTongzhao.map((slot, index) => {
              const processed = processedSchools.find((school) => school.schoolId === slot.schoolId)
              const tag = processed?.tag ?? '稳妥'
              const gap = processed?.gap ?? slot.tongZhao - slot.tongZhao
              const cfg = SCORE_TAG_CONFIG[tag]
              return (
                <div key={`${slot.schoolId}-${index}`} style={{ display: 'grid', gridTemplateColumns: '48px 1fr 100px 116px', alignItems: 'center', gap: 12, border: '1px solid #EEE7E1', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 13, color: C.inkSubtle }}>第{index + 1}志愿</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{slot.name}</div>
                  <div style={{ fontSize: 13, color: C.inkMuted }}>统招线 {slot.tongZhao}</div>
                  <div style={{ display: 'inline-flex', justifyContent: 'center', border: `1px solid ${cfg.border}`, background: cfg.bg, color: cfg.color, borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>
                    {cfg.label}{gap >= 0 ? ` +${gap}` : ` ${gap}`}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ border: '1px dashed #e5ddd0', background: C.surface3, borderRadius: 10, padding: 16, color: C.inkSubtle }}>未选择</div>
        )}
      </section>

      <div style={{ background: C.surface3, borderRadius: 10, padding: 14, fontSize: 12, lineHeight: 1.8, color: C.inkMuted }}>
        {DISCLAIMER_TEXT}
      </div>
    </div>
  )
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: C.surface3, borderRadius: 10, padding: '12px 10px', minHeight: 74 }}>
      <div style={{ fontSize: 12, color: C.inkSubtle, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, lineHeight: 1.3 }}>{value}</div>
    </div>
  )
}

function SharePoster({
  marketRankResult,
  percentileResult,
}: {
  marketRankResult: RankResult
  percentileResult: PercentileResult
}) {
  const rankText = marketRankResult?.rank != null
    ? `全市位次 第 ${marketRankResult.rank.toLocaleString()} 名`
    : '已完成志愿模拟测算'
  const percentileText = percentileResult?.percentile && percentileResult.percentile !== '—'
    ? `百分位 ${percentileResult.percentile}%`
    : '百分位 —'

  return (
    <div style={{ width: 750, height: 1334, background: 'linear-gradient(160deg,#fff3ec,#ffffff)', color: C.ink, boxSizing: 'border-box', padding: 54, fontFamily: 'Arial, sans-serif', position: 'relative', overflow: 'hidden' }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#E8784A', borderBottom: '2px solid #f5c9b3', paddingBottom: 18 }}>
        牧哲学堂 · 中考志愿模拟系统
      </div>

      <div style={{ marginTop: 150, textAlign: 'center' }}>
        <div style={{ fontSize: 54, fontWeight: 800, color: C.ink, lineHeight: 1.25 }}>
          {rankText}
        </div>
        <div style={{ marginTop: 22, fontSize: 28, fontWeight: 700, color: '#E8784A' }}>
          {percentileText}
        </div>
      </div>

      <div style={{ marginTop: 120, background: '#ffffff', border: '1px solid #f5c9b3', borderRadius: 24, padding: '36px 34px', boxShadow: '0 18px 50px #f5c9b3' }}>
        <div style={{ fontSize: 31, fontWeight: 800, color: C.ink, lineHeight: 1.45 }}>
          系统已生成 7 个梯度志愿建议 —— 冲刺 / 稳妥 / 保底一目了然
        </div>
        <div style={{ marginTop: 24, fontSize: 28, fontWeight: 700, color: '#E8784A', lineHeight: 1.45 }}>
          分配生名额怎么排？自己真算不清，找老师
        </div>
      </div>

      <div style={{ position: 'absolute', left: 54, right: 54, bottom: 96, display: 'flex', alignItems: 'center', gap: 32 }}>
        <img src={CONSULT_QR_SRC} alt="咨询二维码" width={200} height={200} style={{ width: 200, height: 200, background: '#ffffff', border: '10px solid #ffffff', borderRadius: 18 }} />
        <div style={{ fontSize: 30, fontWeight: 800, color: C.ink, lineHeight: 1.35 }}>
          扫码找牧哲学堂老师，做专业人工解读
        </div>
      </div>

      <div style={{ position: 'absolute', left: 54, right: 54, bottom: 36, fontSize: 10, color: C.inkSubtle, textAlign: 'center' }}>
        数据依据 2025 年石家庄中考测算，仅供参考
      </div>
    </div>
  )
}

function InfoRow({ label, value, missing }: { label: string; value: string; missing?: boolean }) {
  return (
    <div>
      <Text style={{ fontSize: 12, color: C.inkSubtle }}>{label}</Text>
      <div style={{
        fontSize: 13,
        color: missing ? C.inkSubtle : C.inkMuted,
        fontStyle: missing ? 'italic' : 'normal',
      }}>
        {missing ? (
          <span>
            {value}
            <Tag style={{ marginLeft: 4, fontSize: 10 }} color="default">待核实</Tag>
          </span>
        ) : value}
      </div>
    </div>
  )
}

function ScoreBlock({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 8,
      background: C.surface3, border: `1px solid ${C.hairline}`,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 12, color: C.inkSubtle }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.inkSubtle }}>{sub}</div>}
    </div>
  )
}

function FeatureSection({ label, content, missing }: { label: string; content: string; missing?: boolean }) {
  return (
    <div>
      <Text strong style={{ color: C.inkMuted, fontSize: 13 }}>{label}</Text>
      <div style={{
        color: missing ? C.inkSubtle : C.inkMuted,
        fontSize: 13,
        marginTop: 2,
        fontStyle: missing ? 'italic' : 'normal',
      }}>
        {missing ? (
          <span>
            {content}
            <Tag style={{ marginLeft: 4, fontSize: 10 }} color="warning">待核实</Tag>
          </span>
        ) : content}
      </div>
    </div>
  )
}

function SlotItem({
  index, school, onRemove, onSwap, allSlots,
}: {
  index: number
  school: DBSchool | null
  onRemove: () => void
  onSwap: (targetIdx: number) => void
  allSlots: (DBSchool | null)[]
}) {
  const [swapping, setSwapping] = useState(false)

  if (school) {
    return (
      <div style={{
        width: 130, padding: '10px 12px', borderRadius: 10,
        background: C.surface3, border: `1px solid ${C.hairline}`,
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>
              {school.name.length > 6 ? school.name.slice(0, 6) + '…' : school.name}
            </div>
            <div style={{ fontSize: 11, color: C.inkSubtle }}>{school.tongZhao}分</div>
          </div>
          <CloseOutlined style={{ color: C.inkSubtle, fontSize: 12, cursor: 'pointer' }} onClick={onRemove} />
        </div>
        <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
          <Text style={{ fontSize: 10, color: C.primary }}>统招{['①','②','③','④','⑤','⑥'][index]}</Text>
          {swapping ? (
            <div style={{ display: 'flex', gap: 2 }}>
              {allSlots.map((_, i) => (
                <div
                  key={i}
                  onClick={() => { onSwap(i); setSwapping(false) }}
                  style={{
                    width: 16, height: 16, borderRadius: 3,
                    background: i === index ? C.primary : C.surface1,
                    border: `1px solid ${C.hairline}`,
                    cursor: i === index ? 'default' : 'pointer',
                    fontSize: 9, textAlign: 'center', lineHeight: '14px',
                    color: C.inkSubtle,
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          ) : (
            <SwapOutlined
              style={{ fontSize: 10, color: C.inkSubtle, cursor: 'pointer', marginLeft: 4 }}
              onClick={() => setSwapping(!swapping)}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      width: 130, padding: '10px 12px', borderRadius: 10,
      background: C.surface3, border: `1px dashed ${C.hairlineStrong}`,
      color: C.inkSubtle, fontSize: 13, textAlign: 'center',
    }}>
      空位{['①','②','③','④','⑤','⑥'][index]}
    </div>
  )
}

// === Tiered School List ===

const TIER_ORDER: ScoreTag[] = ['分配生机会', '冲刺', '稳妥', '保底', '差距较大', '暂未达线']

const TIER_SECTION_LABELS: Record<string, string> = {
  '分配生机会': '分配生候选',
  '冲刺': '冲刺',
  '稳妥': '稳妥',
  '保底': '保底',
  '差距较大': '差距较大',
  '暂未达线': '暂未达线',
}

const TIER_SECTION_SUBTLE: Record<string, string> = {
  '分配生机会': '分数达到分配线，可争取分配生名额',
  '冲刺': '分数接近或略低于统招线，需冲刺',
  '稳妥': '分数超出统招线，录取把握较大',
  '保底': '分数远超统招线，作为安全选择',
  '差距较大': '与统招线差距明显',
  '暂未达线': '暂未达到统招线要求',
}

function TieredSchoolList({
  schools, isInBasket, allocationSlot, tongzhaoSlots, tongzhaoFilled,
  addToAllocation, addToTongzhao, onDetail,
}: {
  schools: ProcessedSchool[]
  isInBasket: (id: string) => boolean
  allocationSlot: DBSchool | null
  tongzhaoSlots: (DBSchool | null)[]
  tongzhaoFilled: number
  addToAllocation: (s: DBSchool) => void
  addToTongzhao: (s: DBSchool) => void
  onDetail: (s: ProcessedSchool) => void
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, ProcessedSchool[]>()
    for (const t of TIER_ORDER) {
      const group = schools.filter(s => s.tag === t)
      if (group.length > 0) map.set(t, group)
    }
    return map
  }, [schools])

  const allocFull = !!allocationSlot

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {Array.from(grouped.entries()).map(([tier, tierSchools]) => {
        const cfg = SCORE_TAG_CONFIG[tier as ScoreTag]
        const isAllocGroup = tier === '分配生机会'
        return (
          <div key={tier}>
            {/* Section header */}
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10,
              paddingBottom: 8, borderBottom: `1px solid ${C.hairline}`,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: cfg.color, flexShrink: 0,
              }} />
              <Text strong style={{ fontSize: 14, color: C.ink }}>
                {TIER_SECTION_LABELS[tier] || tier}
              </Text>
              <Text style={{ fontSize: 12, color: C.inkSubtle }}>
                {TIER_SECTION_SUBTLE[tier] || ''}
              </Text>
              <Text style={{ fontSize: 11, color: C.inkSubtle, marginLeft: 'auto' }}>
                {tierSchools.length}所
              </Text>
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tierSchools.map(school => {
                const inBasket = isInBasket(school.schoolId)
                const tongzhaoFull = tongzhaoFilled >= 6

                return (
                  <div
                    key={school.schoolId}
                    style={{
                      background: school.accessible ? cfg.bg : C.surface3,
                      border: `1px solid ${cfg.border}`,
                      borderRadius: 12,
                      padding: '14px 18px',
                      cursor: 'pointer',
                      opacity: school.accessible ? 1 : 0.7,
                      transition: 'border-color .15s, background .15s',
                    }}
                    onClick={() => onDetail(school)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Tag style={{
                          background: cfg.bg, color: cfg.color,
                          border: `1px solid ${cfg.border}`, margin: 0, fontSize: 11,
                          fontWeight: 600, flexShrink: 0,
                        }}>
                          {cfg.label}
                        </Tag>
                        <Text style={{ fontSize: 11, color: C.inkSubtle }}>{school.type}</Text>
                        <Text style={{ fontSize: 11, color: C.inkSubtle }}>{school.location}</Text>
                        {!school.accessible && (
                          <Text style={{ fontSize: 11, color: C.inkSubtle }}>新乐暂不可报</Text>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                        {isAllocGroup && school.accessible && (
                          allocFull && allocationSlot?.schoolId === school.schoolId ? (
                            <Button size="small" disabled style={{ fontSize: 11 }}>已选</Button>
                          ) : (
                            <Button size="small" disabled={allocFull}
                              style={{ fontSize: 11, borderColor: C.primary, color: C.primary }}
                              onClick={() => addToAllocation(school)}>
                              +分配生
                            </Button>
                          )
                        )}
                        {inBasket && tongzhaoSlots.some(s => s?.schoolId === school.schoolId) ? (
                          <Button size="small" disabled style={{ fontSize: 11 }}>已选</Button>
                        ) : (
                          school.accessible && (
                            <Button size="small" disabled={tongzhaoFull}
                              style={{ fontSize: 11 }}
                              onClick={() => addToTongzhao(school)}>
                              {tongzhaoFull ? '已满' : '+统招'}
                            </Button>
                          )
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <Text strong style={{ fontSize: 15, color: C.ink }}>{school.name}</Text>
                        <Text style={{ fontSize: 11, color: C.inkSubtle, marginLeft: 6 }}>{school.fullName}</Text>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {school.yiTong && (
                          <Text style={{ fontSize: 11, color: C.inkSubtle, marginRight: 12 }}>
                            {school.type === '民办' ? '市区' : '一统'}{school.yiTong}分
                          </Text>
                        )}
                        <Text style={{ fontSize: 13 }}>
                          统招
                          <Text strong style={{ color: school.gap >= 0 ? C.success : C.error, fontSize: 15, margin: '0 2px' }}>
                            {school.tongZhao}
                          </Text>
                          分
                          <Text style={{ fontSize: 11, marginLeft: 3, color: school.gap >= 0 ? C.success : C.error }}>
                            ({school.gap >= 0 ? `高${school.gap}` : `差${Math.abs(school.gap)}`})
                          </Text>
                        </Text>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// === Filter Components ===

function DesktopFilterSidebar({
  tagCounts, filterTag, setFilterTag, filterType, setFilterType,
  filterLocation, setFilterLocation, locations, onlyAccessible, setOnlyAccessible,
}: {
  tagCounts: Record<string, number>
  filterTag: string; setFilterTag: (v: string) => void
  filterType: string; setFilterType: (v: string) => void
  filterLocation: string; setFilterLocation: (v: string) => void
  locations: string[]
  onlyAccessible: boolean; setOnlyAccessible: (v: boolean) => void
}) {
  return (
    <div style={{
      width: 180, flexShrink: 0,
      background: C.surface1,
      border: `1px solid ${C.hairline}`,
      borderRadius: 14, padding: '16px 14px',
      height: 'fit-content', position: 'sticky', top: 80,
    }}>
      <Text strong style={{ color: C.ink, fontSize: 13 }}>分数匹配</Text>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {TAG_OPTIONS.map(t => {
          return (
            <div key={t} onClick={() => setFilterTag(t)} style={{
              padding: '7px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: filterTag === t ? C.primaryBg : 'transparent',
              color: filterTag === t ? C.primary : C.inkMuted,
              fontWeight: filterTag === t ? 600 : 400,
              transition: 'background .15s', minHeight: 36,
            }}>
              <span>{t}</span>
              <span style={{ fontSize: 11, color: C.inkSubtle, minWidth: 18, textAlign: 'right' }}>
                {tagCounts[t] ?? 0}
              </span>
            </div>
          )
        })}
      </div>

      <Divider style={{ margin: '12px 0', borderColor: C.hairline }} />

      <Text strong style={{ color: C.ink, fontSize: 13 }}>学校类型</Text>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {TYPE_OPTIONS.map(t => (
          <div key={t} onClick={() => setFilterType(t)} style={{
            padding: '7px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
            background: filterType === t ? C.primaryBg : 'transparent',
            color: filterType === t ? C.primary : C.inkMuted,
            fontWeight: filterType === t ? 600 : 400, minHeight: 36,
          }}>
            {t}
          </div>
        ))}
      </div>

      <Divider style={{ margin: '12px 0', borderColor: C.hairline }} />

      <Text strong style={{ color: C.ink, fontSize: 13 }}>地区</Text>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div onClick={() => setFilterLocation('全部')} style={{
          padding: '7px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
          background: filterLocation === '全部' ? C.primaryBg : 'transparent',
          color: filterLocation === '全部' ? C.primary : C.inkMuted,
          fontWeight: filterLocation === '全部' ? 600 : 400, minHeight: 36,
        }}>
          全部
        </div>
        {locations.map(l => (
          <div key={l} onClick={() => setFilterLocation(l)} style={{
            padding: '7px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
            background: filterLocation === l ? C.primaryBg : 'transparent',
            color: filterLocation === l ? C.primary : C.inkMuted,
            fontWeight: filterLocation === l ? 600 : 400, minHeight: 36,
          }}>
            {l}
          </div>
        ))}
      </div>

      <Divider style={{ margin: '12px 0', borderColor: C.hairline }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 12, color: C.inkSubtle }}>仅新乐可报</Text>
        <Switch size="small" checked={onlyAccessible} onChange={setOnlyAccessible} />
      </div>
    </div>
  )
}

function MobileFilterBar({
  tagCounts, filterTag, setFilterTag, filterType, setFilterType,
  filterLocation, setFilterLocation, locations, onlyAccessible, setOnlyAccessible,
}: {
  tagCounts: Record<string, number>
  filterTag: string; setFilterTag: (v: string) => void
  filterType: string; setFilterType: (v: string) => void
  filterLocation: string; setFilterLocation: (v: string) => void
  locations: string[]
  onlyAccessible: boolean; setOnlyAccessible: (v: boolean) => void
}) {
  return (
    <div style={{
      background: C.surface1,
      border: `1px solid ${C.hairline}`,
      borderRadius: 12, padding: '10px 12px',
      position: 'sticky', top: 76, zIndex: 40,
    }}>
      {/* Score match chips — horizontal scroll */}
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto',
        paddingBottom: 4, WebkitOverflowScrolling: 'touch',
      }}>
        {TAG_OPTIONS.map(t => {
          const cfg = t === '全部' ? null : SCORE_TAG_CONFIG[t]
          return (
            <div key={t} onClick={() => setFilterTag(t)} style={{
              padding: '6px 12px', borderRadius: 20, cursor: 'pointer',
              fontSize: 12, fontWeight: filterTag === t ? 600 : 400,
              whiteSpace: 'nowrap', flexShrink: 0,
              background: filterTag === t ? (cfg?.bg ?? C.primaryBg) : C.surface3,
              border: `1px solid ${filterTag === t ? (cfg?.border ?? C.hairlineStrong) : C.hairline}`,
              color: filterTag === t ? (cfg?.color ?? C.primary) : C.inkMuted,
              minHeight: 32, display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {t}
              <span style={{ fontSize: 10, color: C.inkSubtle }}>{tagCounts[t] ?? 0}</span>
            </div>
          )
        })}
      </div>

      {/* Type + Location + Switch row */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Select
          size="small"
          value={filterType || undefined}
          onChange={v => setFilterType(v || '全部')}
          style={{ width: 90, minHeight: 32 }}
          options={[
            { label: '全部类型', value: '全部' },
            ...TYPE_OPTIONS.filter(t => t !== '全部').map(t => ({ label: t, value: t })),
          ]}
        />
        <Select
          size="small"
          value={filterLocation || undefined}
          onChange={v => setFilterLocation(v || '全部')}
          style={{ width: 90, minHeight: 32 }}
          options={[
            { label: '全部地区', value: '全部' },
            ...locations.map(l => ({ label: l, value: l })),
          ]}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <Text style={{ fontSize: 11, color: C.inkSubtle }}>仅新乐可报</Text>
          <Switch size="small" checked={onlyAccessible} onChange={setOnlyAccessible} />
        </div>
      </div>
    </div>
  )
}
