'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button, Collapse, Divider, Form, InputNumber, Modal, Select,
  Spin, Switch, Tag, Typography,
} from 'antd'
import {
  ArrowLeftOutlined, TrophyOutlined,
  CloseOutlined, FilePdfOutlined, FormOutlined, ShareAltOutlined, SwapOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  CONTROL_LINES_2025,
  getAllocationLine,
  getMarketRank,
  getScoreTag,
  nameMatches,
  SCORE_TAG_CONFIG,
  XINLE_ALLOCATION_2025,
  type ScoreTag,
} from '@/data/volunteer-2025'

const { Title, Text } = Typography

const XINLE_SCHOOLS = Object.keys(XINLE_ALLOCATION_2025).filter((school) => school !== '超击武校')

const DISCLAIMER_TEXT =
  '本方案依据2025年普通高中录取线与2026年石家庄17县一分一档进行位次换算，结果仅供模拟参考，非官方录取结果。所填信息仍需家长仔细核对。'

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
  xinleFenpeiQuota: number
  xinleLine: number | null
  xinleStatus: string[]
  isProvincialDemo: boolean
  lineRank?: number | null
  cutoffVariants2025?: CutoffVariant2025[]
}

interface ProcessedSchool extends DBSchool {
  tag: ScoreTag
  gap: number
  quota: number
  accessible: boolean
  lineCompare: LineCompare
}

type RankRowObject = { score: number; count: number; cumulative: number }
type RankYear = '2025' | '2026'
type RankMaps = Record<RankYear, Record<string, number>>
type RankRows = Record<RankYear, RankRowObject[]>
type RankMeta = Record<RankYear, { total: number; minScore: number; maxScore: number }>
type CutoffVariant2025 = {
  regionLabel: string
  regionType: string
  yiTong: number | null
  tongZhao: number
  sourceName: string
}
type Student2026Metrics = {
  score: number
  rank: number | null
  count: number | null
  rankStart: number | null
  rankEnd: number | null
  total: number | null
  missing: boolean
}
type LineCompare = {
  lineScore: number
  lineRank2025: number | null
  equivalent2026Score: number | null
  equivalent2026Rank: number | null
  equivalentDiff: number | null
  rankGap: number | null
  rankGapText: string
  rankCompareLabel: string
  scoreGap: number
  sourceLabel: string
  regionWarning: string | null
}

function formatNum(value?: number | null) {
  return typeof value === 'number' ? value.toLocaleString() : '—'
}

function getRankRowByScore(rows: RankRowObject[] | undefined, score: number | null) {
  if (score == null || !rows?.length) return null
  return rows.find((row) => row.score === score) || null
}

function getRankByScore(rankMaps: Partial<RankMaps>, year: RankYear, score: number | null) {
  if (score == null) return null
  const value = rankMaps[year]?.[String(score)]
  return typeof value === 'number' ? value : null
}

function findClosestScoreByRank(rows: RankRowObject[] | undefined, targetRank: number | null) {
  if (!rows?.length || targetRank == null) return null
  let best = rows[0]
  for (const row of rows) {
    if (Math.abs(row.cumulative - targetRank) < Math.abs(best.cumulative - targetRank)) best = row
  }
  return {
    score: best.score,
    count: best.count,
    cumulative: best.cumulative,
    diff: best.cumulative - targetRank,
    absDiff: Math.abs(best.cumulative - targetRank),
  }
}

function getStudent2026Metrics(
  inputScore: number | null,
  rows: RankRowObject[] | undefined,
  meta: RankMeta[RankYear] | undefined,
  fallbackRank: number | null,
): Student2026Metrics | null {
  if (inputScore == null) return null
  const row = getRankRowByScore(rows, inputScore)
  if (!row) return { score: inputScore, rank: fallbackRank, count: null, rankStart: null, rankEnd: null, total: meta?.total || null, missing: true }
  return {
    score: inputScore,
    rank: row.cumulative,
    count: row.count,
    rankStart: row.cumulative - row.count + 1,
    rankEnd: row.cumulative,
    total: meta?.total || rows?.at(-1)?.cumulative || null,
    missing: false,
  }
}

function buildLineCompare({
  school, inputScore, student2026Rank, rankRows2025, rankRows2026, rankMaps,
}: {
  school: DBSchool
  inputScore: number
  student2026Rank: number | null
  rankRows2025: RankRowObject[] | undefined
  rankRows2026: RankRowObject[] | undefined
  rankMaps: Partial<RankMaps>
}): LineCompare {
  const nameText = `${school.name}${school.fullName}`
  const namedOtherCounty = nameText.includes('其他县区')
  const xinleVariant = school.cutoffVariants2025?.find((item) => item.regionType === 'XINLE')
  const generalVariant = school.cutoffVariants2025?.find((item) => item.regionType === 'GENERAL')
  const otherCountyVariant = school.cutoffVariants2025?.find((item) => item.regionType === 'OTHER_COUNTY')
  const otherCountyOnly = namedOtherCounty || (!school.xinleLine && !xinleVariant && Boolean(otherCountyVariant))
  const lineScore = namedOtherCounty
    ? otherCountyVariant?.tongZhao ?? school.tongZhao
    : school.xinleLine ?? xinleVariant?.tongZhao ?? school.tongZhao ?? generalVariant?.tongZhao
  const lineRank2025 = getRankByScore(rankMaps, '2025', lineScore) ?? getRankRowByScore(rankRows2025, lineScore)?.cumulative ?? null
  const equivalent2026 = findClosestScoreByRank(rankRows2026, lineRank2025)
  const rankGap = student2026Rank != null && lineRank2025 != null ? student2026Rank - lineRank2025 : null
  const rankGapText = rankGap == null
    ? '位次差暂无'
    : rankGap < 0
      ? `领先约${formatNum(Math.abs(rankGap))}名`
      : rankGap > 0 ? `落后约${formatNum(rankGap)}名` : '位次基本持平'
  const rankCompareLabel = rankGap == null
    ? '位次对比暂无'
    : rankGap <= -3000
      ? '位次优势明显'
      : rankGap <= -1000
        ? '位次有优势'
        : rankGap <= 1000 ? '位次接近，需谨慎' : '位次落后，建议冲刺或慎报'
  let sourceLabel = school.xinleLine != null || xinleVariant ? '新乐线' : '统招线'
  if (otherCountyOnly || nameText.includes('其他县区')) sourceLabel = '其他县区线（仅参考）'
  else if (sourceLabel === '新乐线' || nameText.includes('新乐')) sourceLabel = '新乐线（新乐）'
  const hasMultipleRegions = (school.cutoffVariants2025?.length || 0) > 1
  const regionWarning = otherCountyOnly
    ? '该线为其他县区线，新乐考生不可直接按此线判断'
    : hasMultipleRegions
      ? '该校存在不同招生区域分数线，系统已优先按新乐考生可参考线测算。其他县区线仅作了解，不能直接用于新乐考生判断。'
      : null

  return {
    lineScore,
    lineRank2025,
    equivalent2026Score: equivalent2026?.score ?? null,
    equivalent2026Rank: equivalent2026?.cumulative ?? null,
    equivalentDiff: equivalent2026?.diff ?? null,
    rankGap,
    rankGapText,
    rankCompareLabel,
    scoreGap: inputScore - lineScore,
    sourceLabel,
    regionWarning,
  }
}

const TAG_OPTIONS: ('全部' | ScoreTag)[] = ['全部', '分配生机会', '保底', '稳妥', '冲刺', '差距较大', '暂未达线']
const TYPE_OPTIONS = ['全部', '省示范', '普通高中', '市重点', '县中', '民办']
const AVAILABILITY_OPTIONS = ['全部', '统招可报', '分配生可报', '仅供参考'] as const
const VOLUNTEER_SIM_STATE_KEY = 'volunteer_sim_state'

type PersistedVolunteerSimState = {
  inputScore: number | null
  inputRank: number | null
  inputSchool: string
  submitted: boolean
  allocationSlots: (DBSchool | null)[]
  shifanSlots: (DBSchool | null)[]
  putongSlots: (DBSchool | null)[]
}

function normalizeStoredSlots(slots: unknown, length: number): (DBSchool | null)[] {
  if (!Array.isArray(slots)) return Array(length).fill(null)
  return Array.from({ length }, (_, index) => slots[index] && typeof slots[index] === 'object' ? slots[index] as DBSchool : null)
}

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
  const skipNextPersistRef = useRef(false)

  const [inputScore, setInputScore] = useState<number | null>(null)
  const [inputSchool, setInputSchool] = useState<string>('')
  const [inputRank, setInputRank] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [stateRestored, setStateRestored] = useState(false)

  const [schools, setSchools] = useState<DBSchool[]>([])
  const [loading, setLoading] = useState(false)
  const [schoolsReady, setSchoolsReady] = useState(false)
  const [schoolsError, setSchoolsError] = useState(false)
  const [allocationQuotaMap, setAllocationQuotaMap] = useState<Record<string, Record<string, number>>>({})
  const [scoreRankMap, setScoreRankMap] = useState<Record<string, number>>({})
  const [rankMaps, setRankMaps] = useState<Partial<RankMaps>>({})
  const [rankRows, setRankRows] = useState<Partial<RankRows>>({})
  const [rankMeta, setRankMeta] = useState<Partial<RankMeta>>({})

  const [filterTag, setFilterTag] = useState<string>('全部')
  const [filterType, setFilterType] = useState<string>('全部')
  const [filterLocation, setFilterLocation] = useState<string>('全部')
  const [availabilityFilter, setAvailabilityFilter] = useState<(typeof AVAILABILITY_OPTIONS)[number]>('全部')
  const [onlyAccessible, setOnlyAccessible] = useState(false)

  const [allocationSlots, setAllocationSlots] = useState<(DBSchool | null)[]>(Array(3).fill(null))
  const [shifanSlots, setShifanSlots] = useState<(DBSchool | null)[]>(Array(6).fill(null))
  const [putongSlots, setPutongSlots] = useState<(DBSchool | null)[]>(Array(6).fill(null))

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
    try {
      const raw = sessionStorage.getItem(VOLUNTEER_SIM_STATE_KEY)
      if (raw) {
        const stored = JSON.parse(raw) as Partial<PersistedVolunteerSimState>
        const restoredScore = typeof stored.inputScore === 'number' ? stored.inputScore : null
        const restoredRank = typeof stored.inputRank === 'number' ? stored.inputRank : null
        const restoredSchool = typeof stored.inputSchool === 'string' ? stored.inputSchool : ''
        setInputScore(restoredScore)
        setInputRank(restoredRank)
        setInputSchool(restoredSchool)
        setSubmitted(stored.submitted === true)
        setAllocationSlots(normalizeStoredSlots(stored.allocationSlots, 3))
        setShifanSlots(normalizeStoredSlots(stored.shifanSlots, 6))
        setPutongSlots(normalizeStoredSlots(stored.putongSlots, 6))
        form.setFieldsValue({ score: restoredScore, schoolName: restoredSchool || undefined, schoolRank: restoredRank })
      }
    } catch (error) {
      console.warn('恢复志愿模拟状态失败', error)
      sessionStorage.removeItem(VOLUNTEER_SIM_STATE_KEY)
    } finally {
      setStateRestored(true)
    }
  }, [form])

  useEffect(() => {
    if (!stateRestored) return
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false
      return
    }
    const state: PersistedVolunteerSimState = {
      inputScore,
      inputRank,
      inputSchool,
      submitted,
      allocationSlots,
      shifanSlots,
      putongSlots,
    }
    sessionStorage.setItem(VOLUNTEER_SIM_STATE_KEY, JSON.stringify(state))
  }, [stateRestored, inputScore, inputRank, inputSchool, submitted, allocationSlots, shifanSlots, putongSlots])

  useEffect(() => {
    fetch('/api/volunteer/schools')
      .then(r => r.json())
      .then(d => {
        setSchools(Array.isArray(d?.schools) ? d.schools : [])
        setAllocationQuotaMap(d?.allocationQuotas || {})
        setScoreRankMap(d?.scoreRanks || {})
        setRankMaps(d?.rankMaps || {})
        setRankRows(d?.rankRows || {})
        setRankMeta(d?.rankMeta || {})
      })
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
    const quotaMap = allocationQuotaMap[inputSchool]
    if (quotaMap) {
      if (quotaMap[school.name] != null) return quotaMap[school.name]
      if (quotaMap[school.fullName] != null) return quotaMap[school.fullName]
      for (const [key, quota] of Object.entries(quotaMap)) {
        if (nameMatches(school.name, school.fullName, key)) return quota
      }
    }
    return 0
  }, [allocationQuotaMap, inputSchool])

  const getRankForScore = useCallback((score: number) => {
    if (scoreRankMap[String(score)] != null) return scoreRankMap[String(score)]
    for (let candidate = score + 1; candidate <= 780; candidate++) {
      if (scoreRankMap[String(candidate)] != null) return scoreRankMap[String(candidate)]
    }
    return getMarketRank(score).rank
  }, [scoreRankMap])

  const student2026Metrics = useMemo(() => submitted && inputScore !== null
    ? getStudent2026Metrics(inputScore, rankRows['2026'], rankMeta['2026'], getRankForScore(inputScore))
    : null, [submitted, inputScore, rankRows, rankMeta, getRankForScore])
  const marketRankResult = student2026Metrics
    ? { rank: student2026Metrics.rank, message: student2026Metrics.missing ? '2026一分一档暂未完整导入，当前为历史数据估算' : undefined }
    : null

  const processedSchools = useMemo((): ProcessedSchool[] => {
    if (!submitted || inputScore === null) return []
    return schools
      .map(school => {
        const quota = getAllocationQuota(school)
        const allocationLine = getAllocationLine(school)
        const lineCompare = buildLineCompare({
          school,
          inputScore,
          student2026Rank: student2026Metrics?.rank ?? null,
          rankRows2025: rankRows['2025'],
          rankRows2026: rankRows['2026'],
          rankMaps,
        })
        const effectiveLine = lineCompare.lineScore
        const tag = getScoreTag(
          inputScore,
          effectiveLine,
          allocationLine,
          quota,
          inputRank ?? 9999
        )
        const gap = inputScore - effectiveLine
        const accessible = school.xinleStatus.includes('统招可报')
        return { ...school, tongZhao: effectiveLine, lineRank: lineCompare.lineRank2025, allocationLine, tag, gap, quota, accessible, lineCompare }
      })
      .sort((a, b) => {
        if (a.accessible !== b.accessible) return a.accessible ? -1 : 1
        const pa = SCORE_TAG_CONFIG[a.tag].priority
        const pb = SCORE_TAG_CONFIG[b.tag].priority
        if (pa !== pb) return pa - pb
        return b.tongZhao - a.tongZhao
      })
  }, [schools, submitted, inputScore, inputRank, getAllocationQuota, student2026Metrics, rankRows, rankMaps])

  const filteredSchools = useMemo(() => {
    return processedSchools.filter(s => {
      if (onlyAccessible && !s.accessible) return false
      if (availabilityFilter !== '全部' && !s.xinleStatus.includes(availabilityFilter)) return false
      if (filterTag !== '全部' && s.tag !== filterTag) return false
      if (filterType === '省示范' && !s.isProvincialDemo) return false
      if (filterType === '普通高中' && s.isProvincialDemo) return false
      if (!['全部', '省示范', '普通高中'].includes(filterType) && s.type !== filterType) return false
      if (filterLocation !== '全部' && s.location !== filterLocation) return false
      return true
    })
  }, [processedSchools, onlyAccessible, availabilityFilter, filterTag, filterType, filterLocation])

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

  const handleSimulate = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 300))
      setInputScore(values.score)
      setInputSchool(values.schoolName)
      setInputRank(values.schoolRank)
      setSubmitted(true)
      setAllocationSlots(Array(3).fill(null))
      setShifanSlots(Array(6).fill(null))
      setPutongSlots(Array(6).fill(null))
      setTimeout(() => {
        document.getElementById('sim-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 150)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    skipNextPersistRef.current = true
    sessionStorage.removeItem(VOLUNTEER_SIM_STATE_KEY)
    sessionStorage.removeItem('volunteer_form_data')
    form.resetFields()
    setSubmitted(false)
    setInputScore(null)
    setInputSchool('')
    setInputRank(null)
    setAllocationSlots(Array(3).fill(null))
    setShifanSlots(Array(6).fill(null))
    setPutongSlots(Array(6).fill(null))
    setFilterTag('全部')
    setFilterType('全部')
    setFilterLocation('全部')
    setAvailabilityFilter('全部')
    setOnlyAccessible(false)
  }

  const addToAllocation = useCallback((school: DBSchool) => {
    setAllocationSlots(prev => {
      if (prev.some(item => item?.schoolId === school.schoolId)) return prev
      const emptyIndex = prev.findIndex(item => item === null)
      if (emptyIndex === -1) {
        toast.warning('分配生最多3个')
        return prev
      }
      const next = [...prev]
      next[emptyIndex] = school
      return next
    })
  }, [])

  const removeAllocation = useCallback((index: number) => {
    setAllocationSlots(prev => {
      const next = [...prev]
      next[index] = null
      return next
    })
  }, [])

  const addToShifan = useCallback((school: DBSchool) => {
    setShifanSlots(prev => {
      if (prev.some(item => item?.schoolId === school.schoolId)) return prev
      const emptyIndex = prev.findIndex(item => item === null)
      if (emptyIndex === -1) {
        toast.warning('省示范最多6个')
        return prev
      }
      const next = [...prev]
      next[emptyIndex] = school
      return next
    })
  }, [])

  const removeShifan = useCallback((index: number) => {
    setShifanSlots(prev => {
      const next = [...prev]
      next[index] = null
      return next
    })
  }, [])

  const addToPutong = useCallback((school: DBSchool) => {
    setPutongSlots(prev => {
      if (prev.some(item => item?.schoolId === school.schoolId)) return prev
      const emptyIndex = prev.findIndex(item => item === null)
      if (emptyIndex === -1) {
        toast.warning('普高最多6个')
        return prev
      }
      const next = [...prev]
      next[emptyIndex] = school
      return next
    })
  }, [])

  const removePutong = useCallback((index: number) => {
    setPutongSlots(prev => {
      const next = [...prev]
      next[index] = null
      return next
    })
  }, [])

  const swapSlots = useCallback((segment: 'allocation' | 'shifan' | 'putong', from: number, to: number) => {
    const setter = segment === 'allocation' ? setAllocationSlots : segment === 'shifan' ? setShifanSlots : setPutongSlots
    setter(prev => {
      const next = [...prev]
      const tmp = next[from]
      next[from] = next[to]
      next[to] = tmp
      return next
    })
  }, [])

  const isInBasket = useCallback((schoolId: string) => {
    return [...allocationSlots, ...shifanSlots, ...putongSlots].some(s => s?.schoolId === schoolId)
  }, [allocationSlots, shifanSlots, putongSlots])

  const allocationFilled = allocationSlots.filter(Boolean).length
  const shifanFilled = shifanSlots.filter(Boolean).length
  const putongFilled = putongSlots.filter(Boolean).length

  const hasAllocationOption = useCallback((school: DBSchool) => {
    const quota = getAllocationQuota(school)
    return school.xinleStatus.includes('分配生可报') && school.xinleFenpeiQuota > 0 && quota > 0
  }, [getAllocationQuota])

  const canUseAllocation = useCallback((school: DBSchool) => {
    const quota = getAllocationQuota(school)
    return hasAllocationOption(school) && inputRank !== null && inputRank <= quota
  }, [getAllocationQuota, hasAllocationOption, inputRank])

  const getSchoolSegment = useCallback((school: DBSchool): 'allocation' | 'shifan' | 'putong' => {
    if (hasAllocationOption(school)) return 'allocation'
    return school.isProvincialDemo ? 'shifan' : 'putong'
  }, [hasAllocationOption])

  const allocationSchoolsForSelectedJunior = useMemo(
    () => processedSchools.filter((school) => hasAllocationOption(school)),
    [processedSchools, hasAllocationOption]
  )
  const officialAllocationOptions = useMemo(
    () => [...allocationSchoolsForSelectedJunior].sort((a, b) => getAllocationQuota(b) - getAllocationQuota(a)),
    [allocationSchoolsForSelectedJunior, getAllocationQuota]
  )
  const recommendedAllocationId = officialAllocationOptions[0]?.schoolId || null
  const shifanAvailableCount = useMemo(
    () => processedSchools.filter((school) => school.accessible && school.isProvincialDemo).length,
    [processedSchools]
  )
  const putongAvailableCount = useMemo(
    () => processedSchools.filter((school) => school.accessible && !school.isProvincialDemo).length,
    [processedSchools]
  )

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

  const openOfficialForm = () => {
    sessionStorage.setItem(VOLUNTEER_SIM_STATE_KEY, JSON.stringify({
      inputScore,
      inputRank,
      inputSchool,
      submitted,
      allocationSlots,
      shifanSlots,
      putongSlots,
    } satisfies PersistedVolunteerSimState))
    sessionStorage.setItem('volunteer_form_data', JSON.stringify({
      allocation: allocationSlots,
      shifan: shifanSlots,
      putong: putongSlots,
    }))
    router.push('/volunteer-sim/official-form')
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
              { step: '3', text: '分配生3个 + 省级示范6个 + 普通高中6个，共15个志愿', color: C.purple },
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
          children: <span style={{ color: C.inkMuted, fontSize: 13, lineHeight: 1.8 }}>本系统基于2025年普通高中录取线与2026年石家庄17县一分一档进行位次换算，结果仅供模拟参考，非官方录取结果。梯度标签（冲刺/稳妥/保底）仍按原有规则计算；分配生资格仍按本校排名与对应高中名额比较。</span>,
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
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) auto',
          gap: isMobile ? 14 : 20,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(100px, 1fr))', gap: isMobile ? 12 : 24 }}>
            <div>
              <Text style={{ color: C.inkSubtle, fontSize: isMobile ? 11 : 12 }}>分数</Text>
              <div style={{ fontSize: isMobile ? 26 : 28, fontWeight: 700, color: C.primary, lineHeight: 1.2 }}>{inputScore}</div>
            </div>
            <div>
              <Text style={{ color: C.inkSubtle, fontSize: isMobile ? 11 : 12 }}>2026位次</Text>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>
                {marketRankResult?.rank != null ? `约第 ${marketRankResult.rank.toLocaleString()} 名` : '—'}
              </div>
              <Text style={{ fontSize: 10, color: C.inkSubtle, display: 'block' }}>按2026年石家庄17县一分一档测算</Text>
            </div>
            <div>
              <Text style={{ color: C.inkSubtle, fontSize: isMobile ? 11 : 12 }}>2026同分人数</Text>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>
                {student2026Metrics?.count != null ? `${formatNum(student2026Metrics.count)} 人` : '暂无'}
              </div>
            </div>
            <div>
              <Text style={{ color: C.inkSubtle, fontSize: isMobile ? 11 : 12 }}>2026参考总人数</Text>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>
                {student2026Metrics?.total != null ? `${formatNum(student2026Metrics.total)} 人` : '暂无'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-end', gap: 8, flexWrap: 'wrap', borderTop: isMobile ? `1px solid ${C.hairline}` : undefined, paddingTop: isMobile ? 12 : 0 }}>
            <div>
              <Text style={{ color: C.inkSubtle, fontSize: 11 }}>新乐控制线</Text>
              <Text strong style={{ color: C.ink, marginLeft: 6 }}>{CONTROL_LINES_2025['新乐市']}分</Text>
            </div>
            <Tag color={inputScore !== null && inputScore >= CONTROL_LINES_2025['新乐市'] ? 'success' : 'error'} style={{ margin: 0 }}>
              {inputScore !== null && inputScore >= CONTROL_LINES_2025['新乐市'] ? '已过控制线' : '未过控制线'}
            </Tag>
            <Button onClick={handleReset} style={{ color: C.inkMuted }}>重新输入</Button>
          </div>
          {marketRankResult?.message && (
            <Text style={{ fontSize: 11, color: C.warning, gridColumn: '1 / -1' }}>{marketRankResult.message}</Text>
          )}
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
              <Text style={{ fontSize: 12, color: C.inkMuted }}>分配生C段 {officialAllocationOptions.length} 所</Text>
              <span style={{ color: C.inkSubtle }}>·</span>
              <Text style={{ fontSize: 12, color: C.inkMuted }}>省示范D段 {shifanAvailableCount} 所</Text>
              <span style={{ color: C.inkSubtle }}>·</span>
              <Text style={{ fontSize: 12, color: C.inkMuted }}>普高二批C段 {putongAvailableCount} 所</Text>
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

            {officialAllocationOptions.length > 0 && (
              <div style={{ background: C.surface1, border: `1px solid ${C.hairline}`, borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <div>
                    <Text strong style={{ fontSize: 15, color: C.ink }}>第一批 C段·分配生自选</Text>
                    <Text style={{ display: 'block', fontSize: 12, color: C.inkSubtle, marginTop: 2 }}>
                      展示所有对{inputSchool}有精确名额的高中，按本校名额从多到少排列，最多自选3所
                    </Text>
                  </div>
                  <Text style={{ fontSize: 12, color: C.primary }}>{allocationFilled}/3</Text>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  {officialAllocationOptions.map((school) => {
                    const quota = getAllocationQuota(school)
                    const eligible = canUseAllocation(school)
                    const hopeful = !eligible && inputRank !== null && inputRank <= quota * 1.5
                    const recommended = school.schoolId === recommendedAllocationId
                    return (
                      <div key={`official-allocation-${school.schoolId}`} style={{ background: eligible ? C.successBg : hopeful ? C.warningBg : C.surface3, border: `1px solid ${eligible ? C.successBorder : hopeful ? C.warningBorder : C.hairline}`, borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ minWidth: 0 }}>
                            <Text strong style={{ color: C.ink, fontSize: 13 }}>{school.name}</Text>
                            <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              <Tag color={eligible ? 'success' : hopeful ? 'warning' : 'default'} style={{ margin: 0, fontSize: 11 }}>
                                {eligible ? '✅有资格（稳）' : hopeful ? '△有希望（冲）' : '资格较难，可冲'}
                              </Tag>
                              {recommended && <Tag color="orange" style={{ margin: 0, fontSize: 11 }}>⭐推荐（保底稳妥）</Tag>}
                            </div>
                            <Text style={{ display: 'block', color: C.inkSubtle, fontSize: 11, marginTop: 5 }}>
                              本校名额{quota}个 · 你的本校排名第{inputRank}名 · 该校给新乐总名额{school.xinleFenpeiQuota}个
                            </Text>
                          </div>
                          <Button size="small" disabled={allocationFilled >= 3 || isInBasket(school.schoolId)} onClick={() => addToAllocation(school)}>
                            {isInBasket(school.schoolId) ? '已选' : '加入C段'}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {allocationSchoolsForSelectedJunior.length === 0 && (
              <div style={{
                background: C.warningBg, border: `1px solid ${C.warningBorder}`,
                borderRadius: 10, padding: '12px 16px', marginBottom: 16,
              }}>
                <Text style={{ fontSize: 13, color: C.warning }}>
                  该初中（{inputSchool}）目前无精确分配生名额数据，请检查分配表是否覆盖此初中。
                </Text>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              {AVAILABILITY_OPTIONS.map((status) => {
                const count = status === '全部' ? processedSchools.length : processedSchools.filter((school) => school.xinleStatus.includes(status)).length
                const selected = availabilityFilter === status
                return (
                  <Button key={status} size="small" type={selected ? 'primary' : 'default'} onClick={() => setAvailabilityFilter(status)}>
                    {status} {count}
                  </Button>
                )
              })}
            </div>

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
              <>
                <div style={{ marginBottom: 12, padding: isMobile ? 10 : '11px 14px', borderRadius: 10, background: C.primaryBg, border: `1px solid ${C.primaryBorder}`, color: C.inkMuted, fontSize: 12, lineHeight: 1.7 }}>
                  <strong style={{ color: C.ink }}>怎样看位次对比：</strong>2025线位次表示该校去年录取线在2025一分一档中的大致位置；2026等效分表示把去年位次放到今年一分一档中，大约对应多少分。
                  <div style={{ marginTop: 3 }}>同一所学校可能存在不同招生区域分数线，例如新伏羲中学2025年新乐线660分、其他县区线474分。系统测算新乐考生时优先使用新乐线，不能混用其他县区线。</div>
                </div>
                <TieredSchoolList
                  schools={filteredSchools}
                  isMobile={isMobile}
                  isInBasket={isInBasket}
                  allocationSlots={allocationSlots}
                  shifanSlots={shifanSlots}
                  putongSlots={putongSlots}
                  allocationFilled={allocationFilled}
                  shifanFilled={shifanFilled}
                  putongFilled={putongFilled}
                  hasAllocationOption={hasAllocationOption}
                  getSchoolSegment={getSchoolSegment}
                  addToAllocation={addToAllocation}
                  addToShifan={addToShifan}
                  addToPutong={addToPutong}
                  onDetail={setDetailSchool}
                />
              </>
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
                    新乐不可统招报，仅供了解全市行情
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
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                gap: 10,
              }}>
                <ScoreBlock label="2025录取线" value={`${detailSchool.lineCompare.lineScore}分`} sub={`${detailSchool.lineCompare.sourceLabel} · ${detailSchool.lineCompare.scoreGap >= 0 ? '高' : '差'}${Math.abs(detailSchool.lineCompare.scoreGap)}分`} />
                <ScoreBlock label="2025线位次" value={detailSchool.lineCompare.lineRank2025 != null ? `约第${formatNum(detailSchool.lineCompare.lineRank2025)}名` : '暂无'} sub="按2025一分一档换算" />
                <ScoreBlock label="2026等效分" value={detailSchool.lineCompare.equivalent2026Score != null ? `约${detailSchool.lineCompare.equivalent2026Score}分` : '暂无'} sub={detailSchool.lineCompare.equivalent2026Rank != null ? `对应位次约第${formatNum(detailSchool.lineCompare.equivalent2026Rank)}名` : '请先导入2026一分一档'} />
                <ScoreBlock label="考生2026位次" value={student2026Metrics?.rank != null ? `第${formatNum(student2026Metrics.rank)}名` : '暂无'} sub={detailSchool.lineCompare.rankGapText} />
              </div>

              {detailSchool.lineCompare.regionWarning && (
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: C.warningBg, border: `1px solid ${C.warningBorder}`, color: C.warning, fontSize: 12, lineHeight: 1.7 }}>
                  {detailSchool.lineCompare.regionWarning}
                </div>
              )}

              {!!detailSchool.cutoffVariants2025?.length && (
                <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: C.surface3, border: `1px solid ${C.hairline}` }}>
                  <Text strong style={{ display: 'block', color: C.inkMuted, fontSize: 12, marginBottom: 6 }}>2025招生区域分数线</Text>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {detailSchool.cutoffVariants2025.map((variant) => (
                      <Tag key={`${variant.regionType}-${variant.tongZhao}`} color={variant.regionType === 'XINLE' ? 'orange' : 'default'} style={{ margin: 0 }}>
                        {variant.regionLabel}：{variant.tongZhao}分
                      </Tag>
                    ))}
                  </div>
                </div>
              )}

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
                {hasAllocationOption(detailSchool) && (
                  <Button
                    type="primary"
                    disabled={allocationFilled >= 3 || isInBasket(detailSchool.schoolId)}
                    style={{ background: C.primary, borderColor: C.primary }}
                    onClick={() => { addToAllocation(detailSchool); setDetailSchool(null) }}
                  >
                    {isInBasket(detailSchool.schoolId) ? '已在志愿篮' : `加入分配生（${allocationFilled}/3）`}
                  </Button>
                )}
                {detailSchool.accessible ? (
                  detailSchool.isProvincialDemo ? (
                    <Button
                      disabled={shifanFilled >= 6 || isInBasket(detailSchool.schoolId)}
                      onClick={() => { addToShifan(detailSchool); setDetailSchool(null) }}
                    >
                      {isInBasket(detailSchool.schoolId) ? '已在志愿篮' : `加入省示范（${shifanFilled}/6）`}
                    </Button>
                  ) : (
                    <Button
                      disabled={putongFilled >= 6 || isInBasket(detailSchool.schoolId)}
                      onClick={() => { addToPutong(detailSchool); setDetailSchool(null) }}
                    >
                      {isInBasket(detailSchool.schoolId) ? '已在志愿篮' : `加入普高（${putongFilled}/6）`}
                    </Button>
                  )
                ) : (
                  <Button disabled>新乐不可统招报，仅供了解全市行情</Button>
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
          {allocationFilled >= 3 && shifanFilled >= 6 && putongFilled >= 6 && (
            <div style={{
              textAlign: 'center',
              marginBottom: 10,
              color: C.success,
              fontSize: 13,
              fontWeight: 600,
            }}>
              志愿已填满，共15个
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <VolunteerSegmentBlock title="第一批 C段·分配生类" subtitle="最多3个" segment="allocation" slots={allocationSlots} isMobile={isMobile} onRemove={removeAllocation} onSwap={(from, to) => swapSlots('allocation', from, to)} />
            <VolunteerSegmentBlock title="第一批 D段·省级示范文化类" subtitle="最多6个" segment="shifan" slots={shifanSlots} isMobile={isMobile} onRemove={removeShifan} onSwap={(from, to) => swapSlots('shifan', from, to)} />
            <VolunteerSegmentBlock title="第二批 C段·普通高中文化类" subtitle="最多6个" segment="putong" slots={putongSlots} isMobile={isMobile} onRemove={removePutong} onSwap={(from, to) => swapSlots('putong', from, to)} />
          </div>

          <div style={{ display:'flex', gap:12, justifyContent:'center', marginTop:16, flexWrap:'wrap' }}>
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              disabled={!submitted || allocationFilled + shifanFilled + putongFilled === 0}
              loading={exportingPdf}
              onClick={exportPdf}
            >导出志愿方案 PDF</Button>
            <Button
              icon={<ShareAltOutlined />}
              disabled={!submitted}
              loading={exportingPoster}
              onClick={exportPoster}
            >生成分享海报</Button>
            <Button
              type="primary"
              icon={<FormOutlined />}
              disabled={!submitted}
              onClick={openOfficialForm}
            >前往志愿填报</Button>
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
            student2026Metrics={student2026Metrics}
            allocationSlots={allocationSlots}
            shifanSlots={shifanSlots}
            putongSlots={putongSlots}
            processedSchools={processedSchools}
          />
        )}
      </div>
      <div ref={posterRef} style={{ position:'fixed', left:-99999, top:0, zIndex:-1 }}>
        {submitted && (
          <SharePoster
            marketRankResult={marketRankResult}
            student2026Metrics={student2026Metrics}
            allocationSlots={allocationSlots}
            shifanSlots={shifanSlots}
            putongSlots={putongSlots}
          />
        )}
      </div>
    </div>
  )
}

type RankResult = { rank: number | null; message?: string } | null
function ReportDocument({
  inputScore,
  inputSchool,
  inputRank,
  marketRankResult,
  student2026Metrics,
  allocationSlots,
  shifanSlots,
  putongSlots,
  processedSchools,
}: {
  inputScore: number | null
  inputSchool: string
  inputRank: number | null
  marketRankResult: RankResult
  student2026Metrics: Student2026Metrics | null
  allocationSlots: (DBSchool | null)[]
  shifanSlots: (DBSchool | null)[]
  putongSlots: (DBSchool | null)[]
  processedSchools: ProcessedSchool[]
}) {
  const rankText = marketRankResult?.rank != null ? marketRankResult.rank.toLocaleString() : '—'

  return (
    <div style={{ width: 794, background: '#ffffff', padding: 32, color: C.ink, boxSizing: 'border-box', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #E8784A', paddingBottom: 14, marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#E8784A' }}>牧哲学堂 · 中考志愿模拟方案</div>
        <div style={{ fontSize: 13, color: C.inkSubtle }}>{new Date().toLocaleDateString('zh-CN')}</div>
      </div>

      <section style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 12 }}>考生测算概览</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <ReportMetric label="分数" value={inputScore !== null ? `${inputScore}分` : '—'} />
          <ReportMetric label="毕业初中" value={inputSchool || '—'} />
          <ReportMetric label="校内排名" value={inputRank !== null ? `第${inputRank}名` : '—'} />
          <ReportMetric label="2026位次" value={rankText === '—' ? '—' : `第${rankText}名`} />
          <ReportMetric label="2026同分人数" value={student2026Metrics?.count != null ? `${formatNum(student2026Metrics.count)}人` : '暂无'} />
          <ReportMetric label="参考总人数" value={student2026Metrics?.total != null ? `${formatNum(student2026Metrics.total)}人` : '暂无'} />
        </div>
      </section>

      <ReportVolunteerSegment title="第一批 C段·分配生类（最多3所）" slots={allocationSlots} processedSchools={processedSchools} />
      <ReportVolunteerSegment title="第一批 D段·省级示范文化类（最多6所）" slots={shifanSlots} processedSchools={processedSchools} />
      <ReportVolunteerSegment title="第二批 C段·普通高中文化类（最多6所）" slots={putongSlots} processedSchools={processedSchools} />

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
  student2026Metrics,
  allocationSlots,
  shifanSlots,
  putongSlots,
}: {
  marketRankResult: RankResult
  student2026Metrics: Student2026Metrics | null
  allocationSlots: (DBSchool | null)[]
  shifanSlots: (DBSchool | null)[]
  putongSlots: (DBSchool | null)[]
}) {
  const rankText = marketRankResult?.rank != null
    ? `2026位次 第 ${marketRankResult.rank.toLocaleString()} 名`
    : '已完成志愿模拟测算'

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
          志愿模拟完成{student2026Metrics?.count != null ? ` · 同分${formatNum(student2026Metrics.count)}人` : ''}
        </div>
      </div>

      <div style={{ marginTop: 120, background: '#ffffff', border: '1px solid #f5c9b3', borderRadius: 24, padding: '36px 34px', boxShadow: '0 18px 50px #f5c9b3' }}>
        <div style={{ fontSize: 31, fontWeight: 800, color: C.ink, lineHeight: 1.45 }}>
          系统支持 15 个文化生志愿 —— 分配生3个 / 省示范6个 / 普高6个
        </div>
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: '第一批 C段·分配生', slots: allocationSlots },
            { label: '第一批 D段·省示范', slots: shifanSlots },
            { label: '第二批 C段·普高', slots: putongSlots },
          ].map(section => {
            const names = section.slots.filter(Boolean).map(item => item!.name)
            return (
              <div key={section.label} style={{ fontSize: 20, color: C.inkMuted, lineHeight: 1.45 }}>
                <strong style={{ color: '#E8784A' }}>{section.label}：</strong>
                {names.length > 0 ? names.join('、') : '暂未选择'}
              </div>
            )
          })}
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

type VolunteerSegment = 'allocation' | 'shifan' | 'putong'

function VolunteerSegmentBlock({
  title, subtitle, segment, slots, isMobile, onRemove, onSwap,
}: {
  title: string
  subtitle: string
  segment: VolunteerSegment
  slots: (DBSchool | null)[]
  isMobile: boolean
  onRemove: (index: number) => void
  onSwap: (from: number, to: number) => void
}) {
  return (
    <div style={{ background: C.canvas, border: `1px solid ${C.hairline}`, borderRadius: 10, padding: isMobile ? 10 : 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <Text strong style={{ color: C.ink, fontSize: 13 }}>{title}</Text>
        <Text style={{ color: C.inkSubtle, fontSize: 11 }}>{subtitle}</Text>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {slots.map((school, index) => (
          <SlotItem
            key={`${segment}-${index}`}
            index={index}
            segment={segment}
            school={school}
            onRemove={() => onRemove(index)}
            onSwap={(targetIndex) => onSwap(index, targetIndex)}
            allSlots={slots}
          />
        ))}
      </div>
    </div>
  )
}

function ReportVolunteerSegment({ title, slots, processedSchools }: {
  title: string
  slots: (DBSchool | null)[]
  processedSchools: ProcessedSchool[]
}) {
  const filled = slots.filter(Boolean) as DBSchool[]
  return (
    <section style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 12 }}>{title}</div>
      {filled.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filled.map((school, index) => {
            const processed = processedSchools.find(item => item.schoolId === school.schoolId)
            const cfg = SCORE_TAG_CONFIG[processed?.tag ?? '稳妥']
            const lineRank = processed?.lineRank ?? getMarketRank(school.tongZhao).rank
            return (
              <div key={`${school.schoolId}-${index}`} style={{ display: 'grid', gridTemplateColumns: '58px 1fr 150px 100px', alignItems: 'center', gap: 12, border: '1px solid #EEE7E1', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 12, color: C.inkSubtle }}>志愿{index + 1}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{school.name}</div>
                <div style={{ fontSize: 12, color: C.inkMuted }}>录取线 {school.tongZhao}分 · {lineRank === null ? '位次暂无' : `约第${lineRank.toLocaleString()}名`}</div>
                <div style={{ textAlign: 'center', border: `1px solid ${cfg.border}`, background: cfg.bg, color: cfg.color, borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 700 }}>{cfg.label}</div>
              </div>
            )
          })}
        </div>
      ) : <div style={{ border: '1px dashed #e5ddd0', background: C.surface3, borderRadius: 10, padding: 14, color: C.inkSubtle }}>未选择</div>}
    </section>
  )
}

function SlotItem({
  index, segment, school, onRemove, onSwap, allSlots,
}: {
  index: number
  segment: VolunteerSegment
  school: DBSchool | null
  onRemove: () => void
  onSwap: (targetIdx: number) => void
  allSlots: (DBSchool | null)[]
}) {
  const [swapping, setSwapping] = useState(false)
  const numeral = ['①','②','③','④','⑤','⑥'][index]
  const segmentLabel = segment === 'allocation' ? '分配生' : segment === 'shifan' ? '省示范' : '普高'
  const lineRank = school ? school.lineRank ?? getMarketRank(school.tongZhao).rank : null

  if (school) {
    return (
      <div style={{
        minWidth: 0, padding: '10px 12px', borderRadius: 10,
        background: C.surface3, border: `1px solid ${C.hairline}`,
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>
              {school.name.length > 6 ? school.name.slice(0, 6) + '…' : school.name}
            </div>
            <div style={{ fontSize: 11, color: C.inkSubtle }}>
              {school.tongZhao}分{lineRank !== null ? ` · 约第${lineRank.toLocaleString()}名` : ''}
            </div>
          </div>
          <CloseOutlined style={{ color: C.inkSubtle, fontSize: 12, cursor: 'pointer' }} onClick={onRemove} />
        </div>
        <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
          <Text style={{ fontSize: 10, color: C.primary }}>{segmentLabel}志愿{numeral}</Text>
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
      minWidth: 0, minHeight: 62, padding: '10px 12px', borderRadius: 10,
      background: C.surface3, border: `1px dashed ${C.hairlineStrong}`,
      color: C.inkSubtle, fontSize: 12, textAlign: 'center',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
    }}>
      <span>志愿{numeral}</span>
      <span style={{ fontSize: 11 }}>空位</span>
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
  schools, isMobile, isInBasket, allocationSlots, shifanSlots, putongSlots,
  allocationFilled, shifanFilled, putongFilled, hasAllocationOption, getSchoolSegment,
  addToAllocation, addToShifan, addToPutong, onDetail,
}: {
  schools: ProcessedSchool[]
  isMobile: boolean
  isInBasket: (id: string) => boolean
  allocationSlots: (DBSchool | null)[]
  shifanSlots: (DBSchool | null)[]
  putongSlots: (DBSchool | null)[]
  allocationFilled: number
  shifanFilled: number
  putongFilled: number
  hasAllocationOption: (school: DBSchool) => boolean
  getSchoolSegment: (school: DBSchool) => 'allocation' | 'shifan' | 'putong'
  addToAllocation: (s: DBSchool) => void
  addToShifan: (s: DBSchool) => void
  addToPutong: (s: DBSchool) => void
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {Array.from(grouped.entries()).map(([tier, tierSchools]) => {
        const cfg = SCORE_TAG_CONFIG[tier as ScoreTag]
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
                const allocationEligible = hasAllocationOption(school)
                const primarySegment = getSchoolSegment(school)
                const academicSegment = primarySegment === 'allocation'
                  ? (school.isProvincialDemo ? 'shifan' : 'putong')
                  : primarySegment
                const selectedSegment = allocationSlots.some(item => item?.schoolId === school.schoolId)
                  ? '分配生'
                  : shifanSlots.some(item => item?.schoolId === school.schoolId)
                    ? '省示范'
                    : putongSlots.some(item => item?.schoolId === school.schoolId) ? '普高' : null

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
                        <Text style={{ fontSize: 11, color: C.inkSubtle }}>{school.isProvincialDemo ? '省示范' : school.type}</Text>
                        <Text style={{ fontSize: 11, color: C.inkSubtle }}>{school.location}</Text>
                        {school.xinleStatus.map((status) => (
                          <Tag key={status} color={status === '统招可报' ? 'success' : status === '分配生可报' ? 'orange' : 'default'} style={{ margin: 0, fontSize: 10 }}>
                            {status}
                          </Tag>
                        ))}
                        {!school.accessible && (
                          <Text style={{ fontSize: 11, color: C.inkSubtle }}>新乐不可统招报，仅供了解全市行情</Text>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                        {allocationEligible && (
                          <Button size="small" disabled={allocationFilled >= 3 || inBasket}
                            style={{ fontSize: 11, borderColor: C.primary, color: C.primary }}
                            onClick={() => addToAllocation(school)}>
                            {selectedSegment ? `已加入${selectedSegment}` : `加入分配生（${allocationFilled}/3）`}
                          </Button>
                        )}
                        {school.accessible && (
                          academicSegment === 'shifan' ? (
                            <Button size="small" disabled={shifanFilled >= 6 || inBasket}
                              style={{ fontSize: 11 }}
                              onClick={() => addToShifan(school)}>
                              {selectedSegment ? `已加入${selectedSegment}` : `加入省示范（${shifanFilled}/6）`}
                            </Button>
                          ) : (
                            <Button size="small" disabled={putongFilled >= 6 || inBasket}
                              style={{ fontSize: 11 }}
                              onClick={() => addToPutong(school)}>
                              {selectedSegment ? `已加入${selectedSegment}` : `加入普高（${putongFilled}/6）`}
                            </Button>
                          )
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: 8, display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'baseline', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <Text strong style={{ fontSize: 15, color: C.ink }}>{school.name}</Text>
                        <Text style={{ fontSize: 11, color: C.inkSubtle, marginLeft: 6 }}>{school.fullName}</Text>
                      </div>
                      <div style={{ textAlign: isMobile ? 'left' : 'right', minWidth: isMobile ? 0 : 250, padding: isMobile ? '9px 10px' : 0, borderRadius: isMobile ? 8 : 0, background: isMobile ? C.surface1 : 'transparent', border: isMobile ? `1px solid ${C.hairline}` : undefined }}>
                        {school.yiTong && (
                          <Text style={{ fontSize: 11, color: C.inkSubtle, marginRight: 12 }}>
                            {school.type === '民办' ? '市区' : '一统'}{school.yiTong}分
                          </Text>
                        )}
                        <Text style={{ fontSize: 13 }}>
                          2025{school.lineCompare.sourceLabel.replace('（新乐）', '').replace('（仅参考）', '')}
                          <Text strong style={{ color: school.gap >= 0 ? C.success : C.error, fontSize: 15, margin: '0 2px' }}>
                            {school.lineCompare.lineScore}
                          </Text>
                          分
                          <Text style={{ fontSize: 11, marginLeft: 3, color: school.gap >= 0 ? C.success : C.error }}>
                            ({school.lineCompare.scoreGap >= 0 ? `高${school.lineCompare.scoreGap}` : `差${Math.abs(school.lineCompare.scoreGap)}`})
                          </Text>
                        </Text>
                        <Text style={{ display: 'block', fontSize: 11, color: C.inkSubtle }}>
                          {school.lineCompare.lineRank2025 != null ? `2025线位次 约第${formatNum(school.lineCompare.lineRank2025)}名` : '2025线位次暂无'}
                        </Text>
                        <Text style={{ display: 'block', fontSize: 11, color: school.lineCompare.rankGap != null && school.lineCompare.rankGap <= 0 ? C.success : C.warning }}>
                          {school.lineCompare.equivalent2026Score != null
                            ? `折算2026约${school.lineCompare.equivalent2026Score}分 · 你${school.lineCompare.rankGapText}`
                            : '折算2026暂无 · 请先导入2026一分一档'}
                        </Text>
                        <Text style={{ display: 'block', fontSize: 10, color: C.inkSubtle }}>
                          {school.lineCompare.rankCompareLabel}
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
