'use client'
import { AdaptiveSelect } from '@/components/AdaptiveSelect';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import NextImage from 'next/image'
import {
  Button, Checkbox, Collapse, Divider, Form, InputNumber,
  Spin, Switch, Tag, Tooltip, Typography, Popover,
} from 'antd'
import { BrandModal } from '@/components/Common/BrandModal'
import { PageLayout } from '@/components/Layout/PageLayout'
import { VolunteerReferenceNotice, VOLUNTEER_REFERENCE_TEXT } from './VolunteerReferenceNotice'
import { VolunteerBasket } from './VolunteerBasket'
import {
  ReloadOutlined, TrophyOutlined,
  CloseOutlined, FilePdfOutlined, FormOutlined, ShareAltOutlined, SwapOutlined,
  ThunderboltOutlined, SafetyCertificateOutlined, WarningOutlined, DeleteOutlined,
  CompassOutlined, BankOutlined, InfoCircleOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/useIsMobile'
import { seniorSchoolNameMatches } from '@/lib/volunteer-school-names'
import { applyWatermark, domToCanvas, drawBrandHeader } from '@/lib/export-brand'
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
  `本方案依据2025年普通高中录取线与2026年石家庄17县一分一档进行位次换算，结果仅供模拟参考，非官方录取结果。所填信息仍需家长仔细核对。${VOLUNTEER_REFERENCE_TEXT}`

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

type VolunteerDataHealth = {
  yifenYidang: Array<{ year: number; count: number }>
  allocationQuota: Array<{ year: number; count: number; juniorSchoolCount: number }>
  highSchools: {
    total: number
    suspectedDuplicateCount: number
    suspectedDuplicates: Array<{ normalizedName: string; schools: Array<{ id: string; name: string; tongZhao: number }> }>
  }
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
  surface2: '#fbf9f6',
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

export default function VolunteerSimulator({ portal = 'admin' }: { portal?: 'admin' | 'parent' }) {
  const isParent = portal === 'parent'
  const simulatorPath = isParent ? '/parent/volunteer/simulation' : '/volunteer-sim'
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
  const [dataHealth, setDataHealth] = useState<VolunteerDataHealth | null>(null)

  const [filterTag, setFilterTag] = useState<string>('全部')
  const [filterType, setFilterType] = useState<string>('全部')
  const [filterLocation, setFilterLocation] = useState<string>('全部')
  const [availabilityFilter, setAvailabilityFilter] = useState<(typeof AVAILABILITY_OPTIONS)[number]>('全部')
  const [onlyAccessible, setOnlyAccessible] = useState(true)

  const [allocationSlots, setAllocationSlots] = useState<(DBSchool | null)[]>(Array(3).fill(null))
  const [shifanSlots, setShifanSlots] = useState<(DBSchool | null)[]>(Array(6).fill(null))
  const [putongSlots, setPutongSlots] = useState<(DBSchool | null)[]>(Array(6).fill(null))

  const [detailSchool, setDetailSchool] = useState<ProcessedSchool | null>(null)
  const [compareSchoolIds, setCompareSchoolIds] = useState<string[]>([])
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
        if (seniorSchoolNameMatches(school.name, school.fullName, key) || nameMatches(school.name, school.fullName, key)) return quota
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

  const compareSchools = useMemo(
    () => compareSchoolIds.map((id) => processedSchools.find((school) => school.schoolId === id)).filter((school): school is ProcessedSchool => Boolean(school)),
    [compareSchoolIds, processedSchools],
  )

  const toggleCompareSchool = useCallback((schoolId: string) => {
    setCompareSchoolIds((current) => {
      if (current.includes(schoolId)) return current.filter((id) => id !== schoolId)
      if (current.length >= 3) {
        toast.warning('最多同时对比 3 所学校')
        return current
      }
      return [...current, schoolId]
    })
  }, [])

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
    setOnlyAccessible(true)
    setCompareSchoolIds([])
  }

  const addToAllocation = useCallback((school: DBSchool) => {
    if (!school.xinleStatus.includes('分配生可报')) {
      toast.warning(`【${school.name}】非新乐分配生学校，不可加入分配生志愿`)
      return
    }
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

  useEffect(() => {
    if (isParent) return
    fetch('/api/admin/volunteer-data-health')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setDataHealth(data))
      .catch((error) => console.warn('志愿数据健康状态加载失败', error))
  }, [isParent])

  const removeAllocation = useCallback((index: number) => {
    setAllocationSlots(prev => {
      const next = [...prev]
      next[index] = null
      return next
    })
  }, [])

  const addToShifan = useCallback((school: DBSchool) => {
    const isAccessible = school.xinleStatus.includes('统招可报') || Boolean(school.xinleAccessibleOverride ?? school.xinleAccessible)
    if (!isAccessible) {
      toast.warning(`【${school.name}】非新乐统招可报高中，不可加入志愿栏`)
      return
    }
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
    const isAccessible = school.xinleStatus.includes('统招可报') || Boolean(school.xinleAccessibleOverride ?? school.xinleAccessible)
    if (!isAccessible) {
      toast.warning(`【${school.name}】非新乐统招可报高中，不可加入志愿栏`)
      return
    }
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
      const { jsPDF } = await import('jspdf')
      // modern-screenshot 兼容 color-mix/oklch 等现代 CSS；顶部叠加品牌条 + 全图水印
      const canvas = await domToCanvas(el, { scale: 2, backgroundColor: '#ffffff' })
      const out = document.createElement('canvas')
      out.width = canvas.width
      out.height = canvas.height + 74
      const octx = out.getContext('2d')
      if (!octx) throw new Error('无法创建导出画布')
      const barH = await drawBrandHeader(octx, out.width, '志愿方案')
      octx.drawImage(canvas, 0, barH)
      applyWatermark(octx, out.width, out.height)
      const img = out.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageW = 210
      const pageH = 297
      const imgH = (out.height * pageW) / out.width
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
      const canvas = await domToCanvas(el, { scale: 2 })
      // 合成画布：顶部品牌条 + 底部原海报 + 斜向水印（不改动原画布内容与文件名）
      const out = document.createElement('canvas')
      out.width = canvas.width
      out.height = canvas.height + 74
      const octx = out.getContext('2d')
      if (!octx) throw new Error('无法创建导出画布')
      const barH = await drawBrandHeader(octx, out.width, '志愿模拟海报')
      octx.drawImage(canvas, 0, barH)
      applyWatermark(octx, out.width, out.height)
      out.toBlob((blob) => {
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
      tagBySchoolId: Object.fromEntries(processedSchools.map((school) => [school.schoolId, school.tag])),
    }))
    router.push(`${simulatorPath}/official-form`)
  }

  const handleClearSlots = useCallback(() => {
    setAllocationSlots(Array(3).fill(null))
    setShifanSlots(Array(6).fill(null))
    setPutongSlots(Array(6).fill(null))
    toast.info('已清空已选志愿')
  }, [])

  const handleAutoGenerateLadder = useCallback(() => {
    if (!submitted || !processedSchools.length) {
      toast.warning('请先完成成绩模拟测算')
      return
    }

    const newAllocation: (DBSchool | null)[] = Array(3).fill(null)
    const newShifan: (DBSchool | null)[] = Array(6).fill(null)
    const newPutong: (DBSchool | null)[] = Array(6).fill(null)
    const chosenSchoolIds = new Set<string>()

    // 1. 分配生 C段（最多 3 所）：优先匹配初中具有配额的优质高中
    const allocPool = officialAllocationOptions.filter((s) => !chosenSchoolIds.has(s.schoolId))
    for (let i = 0; i < Math.min(3, allocPool.length); i++) {
      newAllocation[i] = allocPool[i]
      chosenSchoolIds.add(allocPool[i].schoolId)
    }

    // 2. 省级示范高中 D段（最多 6 所）：黄金配比 2 冲刺 + 2 稳妥 + 2 保底
    const demoPool = processedSchools.filter(
      (s) => s.accessible && s.isProvincialDemo && !chosenSchoolIds.has(s.schoolId)
    )
    const demoChong = demoPool.filter((s) => s.tag === '冲刺')
    const demoWen = demoPool.filter((s) => s.tag === '稳妥')
    const demoBao = demoPool.filter((s) => s.tag === '保底')
    const demoOther = demoPool.filter((s) => !['冲刺', '稳妥', '保底'].includes(s.tag))

    const selectedDemo: DBSchool[] = []
    selectedDemo.push(...demoChong.slice(0, 2))
    selectedDemo.push(...demoWen.slice(0, 2))
    selectedDemo.push(...demoBao.slice(0, 2))

    const remainingDemo = [
      ...demoWen.slice(2),
      ...demoBao.slice(2),
      ...demoChong.slice(2),
      ...demoOther,
    ].filter((s) => !selectedDemo.some((x) => x.schoolId === s.schoolId))

    while (selectedDemo.length < 6 && remainingDemo.length > 0) {
      selectedDemo.push(remainingDemo.shift()!)
    }

    selectedDemo.forEach((s, idx) => {
      if (idx < 6) {
        newShifan[idx] = s
        chosenSchoolIds.add(s.schoolId)
      }
    })

    // 3. 普通高中 C段（最多 6 所）：托底防滑档配比 2 稳妥 + 4 保底
    const putongPool = processedSchools.filter(
      (s) => s.accessible && !s.isProvincialDemo && !chosenSchoolIds.has(s.schoolId)
    )
    const putongWen = putongPool.filter((s) => s.tag === '稳妥')
    const putongBao = putongPool.filter((s) => s.tag === '保底')
    const putongOther = putongPool.filter((s) => !['稳妥', '保底'].includes(s.tag))

    const selectedPutong: DBSchool[] = []
    selectedPutong.push(...putongWen.slice(0, 2))
    selectedPutong.push(...putongBao.slice(0, 4))

    const remainingPutong = [
      ...putongBao.slice(4),
      ...putongWen.slice(2),
      ...putongOther,
    ].filter((s) => !selectedPutong.some((x) => x.schoolId === s.schoolId))

    while (selectedPutong.length < 6 && remainingPutong.length > 0) {
      selectedPutong.push(remainingPutong.shift()!)
    }

    selectedPutong.forEach((s, idx) => {
      if (idx < 6) {
        newPutong[idx] = s
        chosenSchoolIds.add(s.schoolId)
      }
    })

    setAllocationSlots(newAllocation)
    setShifanSlots(newShifan)
    setPutongSlots(newPutong)

    const totalCount =
      newAllocation.filter(Boolean).length +
      newShifan.filter(Boolean).length +
      newPutong.filter(Boolean).length
    toast.success(`已智能生成 ${totalCount} 所学校的冲稳保梯度方案，可在此基础上自由微调！`)
  }, [submitted, processedSchools, officialAllocationOptions])

  const ladderSummary = useMemo(() => {
    const allSelected = [...allocationSlots, ...shifanSlots, ...putongSlots].filter(
      (s): s is DBSchool => Boolean(s)
    )
    const total = allSelected.length
    if (total === 0) return null

    const tags = allSelected.map((s) => {
      const ps = processedSchools.find((p) => p.schoolId === s.schoolId)
      return ps?.tag || '稳妥'
    })

    const chongCount = tags.filter((t) => t === '冲刺').length
    const wenCount = tags.filter((t) => t === '稳妥').length
    const baoCount = tags.filter((t) => t === '保底').length

    let level: 'good' | 'warning' | 'danger' = 'good'
    let title = '梯队结构健康均衡'
    let advice = '冲、稳、保比例符合中考录取最佳实践，抗滑档能力强！'

    if (total >= 4 && baoCount === 0) {
      level = 'danger'
      title = '存在滑档高危风险'
      advice = '未选择任何“保底”高中！中考录取不退档，一旦分数出现波动将无学可上，请务必添加2-4所保底学校！'
    } else if (chongCount >= 4 && baoCount <= 1) {
      level = 'warning'
      title = '梯队方案偏激进'
      advice = '冲刺学校过多且保底不足，建议减少1-2所冲刺校，增加保底校以拉开级差。'
    } else if (chongCount === 0 && wenCount === 0 && baoCount >= 3) {
      level = 'warning'
      title = '梯队方案偏保守'
      advice = '当前全为保底学校，若考生成绩稳定，建议在省级示范高中前2个志愿大胆尝试冲刺校。'
    }

    return {
      total,
      chongCount,
      wenCount,
      baoCount,
      level,
      title,
      advice,
    }
  }, [allocationSlots, shifanSlots, putongSlots, processedSchools])

  return (
    <PageLayout
      eyebrow={isParent ? '牧哲学堂 · 升学服务' : undefined}
      title="中考模拟填报"
      subtitle="基于石家庄中考录取位次 · 测算冲稳保梯队志愿方案 · 仅供模拟参考"
      actions={
        submitted ? (
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置输入
          </Button>
        ) : undefined
      }
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', color: C.ink }}>
      {/* 典雅轻量的升学参考须知 */}
      <div style={{
        background: '#faf8f5',
        border: '1px solid rgba(20, 87, 77, 0.1)',
        borderRadius: 12,
        padding: '10px 14px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.inkMuted }}>
          <SafetyCertificateOutlined style={{ color: '#14574D', fontSize: 15 }} />
          <span>权威模型：基于石家庄17县一分一档位次换算与2026新乐分配生指标</span>
        </div>
        <Popover
          content={(
            <div style={{ maxWidth: 300, fontSize: 12, lineHeight: 1.7, color: C.inkMuted }}>
              {DISCLAIMER_TEXT}
            </div>
          )}
          title={<span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>模拟填报须知</span>}
          trigger="click"
        >
          <Button type="link" size="small" style={{ padding: 0, height: 'auto', fontSize: 12, color: '#14574D', fontWeight: 500 }}>
            查看免责声明 &gt;
          </Button>
        </Popover>
      </div>

      {dataHealth && (() => {
        const rank2026 = dataHealth.yifenYidang.find((item) => item.year === 2026)
        const allocation2026 = dataHealth.allocationQuota.find((item) => item.year === 2026)
        const duplicateCount = dataHealth.highSchools.suspectedDuplicateCount
        return (
          <Collapse
            ghost
            style={{ marginBottom: 16, background: C.surface1, border: `1px solid ${C.hairline}`, borderRadius: 12 }}
            items={[{
              key: 'health',
              label: (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text strong style={{ color: C.ink }}>数据状态</Text>
                  <Tag color={rank2026?.count === 480 ? 'success' : 'warning'} style={{ margin: 0 }}>
                    2026一分一档 {rank2026?.count ?? 0} {rank2026?.count === 480 ? '✓' : '⚠️'}
                  </Tag>
                  <Tag color={allocation2026?.count ? 'success' : 'warning'} style={{ margin: 0 }}>
                    2026分配生 {allocation2026?.count ?? 0}{allocation2026?.count ? ` · 覆盖初中${allocation2026.juniorSchoolCount}所 ✓` : ' ⚠️ 未导入'}
                  </Tag>
                  <Tag color={duplicateCount === 0 ? 'success' : 'warning'} style={{ margin: 0 }}>
                    学校库 {dataHealth.highSchools.total} {duplicateCount === 0 ? '✓' : `⚠️ 疑似重复${duplicateCount}`}
                  </Tag>
                </div>
              ),
              children: (
                <div style={{ color: C.inkMuted, fontSize: 12, lineHeight: 1.8 }}>
                  <div>一分一档：{dataHealth.yifenYidang.map((item) => `${item.year}年 ${item.count}档`).join(' / ') || '暂无数据'}</div>
                  <div>分配生：{dataHealth.allocationQuota.map((item) => `${item.year}年 ${item.count}条，覆盖${item.juniorSchoolCount}所初中`).join(' / ') || '暂无数据'}</div>
                  {dataHealth.highSchools.suspectedDuplicates.map((group) => (
                    <div key={group.normalizedName} style={{ color: C.warning }}>
                      疑似重复：{group.schools.map((school) => `${school.name}（${school.tongZhao}分）`).join(' / ')}
                    </div>
                  ))}
                </div>
              ),
            }]}
          />
        )
      })()}

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



      {/* Input Area */}
      {!submitted ? (
        <div style={{
          background: C.surface1,
          border: '1px solid rgba(20, 87, 77, 0.12)',
          borderRadius: 18,
          padding: isMobile ? '24px 18px 28px' : '36px 36px 40px',
          maxWidth: 520,
          margin: '0 auto 24px',
          boxShadow: '0 16px 40px -12px rgba(20, 87, 77, 0.09), 0 2px 8px rgba(0, 0, 0, 0.02)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Top Brand Accent Stripe */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 4,
            background: 'linear-gradient(90deg, #14574D 0%, #207d6f 55%, #d6b45b 100%)',
          }} />

          <Spin spinning={!schoolsReady} tip="正在加载学校数据...">
            {schoolsError && (
              <div style={{ background: C.errorBg, border: `1px solid ${C.error}`, borderRadius: 8, padding: '8px 14px', marginBottom: 16, color: C.error, fontSize: 13 }}>
                学校数据加载失败，请刷新页面重试
              </div>
            )}
            <Form form={form} layout="vertical">
              {/* Header inside Card */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#EAF4F1', color: '#14574D',
                  padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  marginBottom: 10,
                }}>
                  <CompassOutlined /> 新乐中考志愿模拟测算
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>
                  请输入学生中考成绩
                </div>
                <Text style={{ fontSize: 12, color: C.inkSubtle, marginTop: 4, display: 'block' }}>
                  输入考分与校内排名，秒级匹配全市高中冲稳保梯度
                </Text>
              </div>

              {/* Score — Hero Box */}
              <div style={{
                background: '#faf8f5',
                border: '1.5px solid #e7efe9',
                borderRadius: 16,
                padding: '16px 20px 12px',
                maxWidth: 320,
                margin: '0 auto 24px',
                textAlign: 'center',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
                  <Form.Item
                    name="score"
                    noStyle
                    rules={[
                      { required: true, message: '请输入分数' },
                      { type: 'number', min: 0, max: 800, message: '分数范围 0 - 800' },
                    ]}
                  >
                    <InputNumber
                      inputMode="numeric"
                      placeholder="678"
                      min={0}
                      max={800}
                      size="large"
                      style={{
                        width: 170,
                        fontSize: 38,
                        fontWeight: 800,
                        textAlign: 'center',
                        background: 'transparent',
                        border: 'none',
                        boxShadow: 'none',
                        color: '#14574D',
                        fontFamily: 'var(--font-geist-sans), -apple-system, sans-serif',
                      }}
                      className="score-hero-input"
                    />
                  </Form.Item>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#14574D' }}>分</span>
                </div>
                <div style={{
                  fontSize: 11, color: C.inkSubtle, marginTop: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <span>满分 800 分</span>
                  <span style={{ color: '#d8cfc4' }}>•</span>
                  <span>2026 石家庄考制</span>
                </div>
              </div>

              {/* Secondary inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 16, marginBottom: 28 }}>
                <div style={{
                  background: '#faf8f5',
                  borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.06)',
                  padding: '10px 14px 12px',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.inkMuted, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <BankOutlined style={{ color: '#14574D' }} /> 就读初中 <span style={{ color: C.error }}>*</span>
                  </div>
                  <Form.Item
                    name="schoolName"
                    noStyle
                    rules={[{ required: true, message: '请选择初中' }]}
                  >
                    <AdaptiveSelect
                      placeholder="选择新乐初中"
                      size="middle"
                      showSearch
                      filterOption={(input, option) =>
                        (option?.label as string || '').includes(input)
                      }
                      options={XINLE_SCHOOLS.map((school) => ({ label: school, value: school }))}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </div>
                <div style={{
                  background: '#faf8f5',
                  borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.06)',
                  padding: '10px 14px 12px',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.inkMuted, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <TrophyOutlined style={{ color: '#14574D' }} /> 本校排名 <span style={{ color: C.error }}>*</span>
                  </div>
                  <Form.Item
                    name="schoolRank"
                    noStyle
                    rules={[
                      { required: true, message: '请输入排名' },
                      { type: 'number', min: 1, message: '至少第1名' },
                    ]}
                  >
                    <InputNumber
                      inputMode="numeric"
                      style={{ width: '100%' }}
                      placeholder="例：5"
                      min={1}
                      size="middle"
                    />
                  </Form.Item>
                </div>
              </div>

              {/* Action Button */}
              <div style={{ textAlign: 'center' }}>
                <Button
                  type="primary"
                  size="large"
                  onClick={handleSimulate}
                  loading={loading}
                  style={{
                    width: '100%',
                    maxWidth: 320,
                    height: 50,
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #14574D 0%, #1e6d60 100%)',
                    borderColor: '#14574D',
                    fontSize: 16,
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                    boxShadow: '0 8px 20px -4px rgba(20, 87, 77, 0.35)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <ThunderboltOutlined style={{ fontSize: 16 }} /> 开始模拟
                </Button>
              </div>
            </Form>
          </Spin>
        </div>
      ) : (
        /* Summary bar — 现代升学成绩仪表盘 */
        <div style={{
          background: C.surface1,
          border: '1px solid rgba(20, 87, 77, 0.12)',
          borderRadius: 16,
          padding: isMobile ? '16px 18px 14px' : '20px 24px',
          marginBottom: 16,
          boxShadow: '0 8px 24px -6px rgba(20, 87, 77, 0.06)',
          position: 'relative',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 12,
            paddingBottom: 12,
            borderBottom: `1px solid ${C.hairline}`,
          }}>
            {/* 左侧：大分数与控制线状态 */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: 11, color: C.inkSubtle, display: 'block', marginBottom: 2 }}>中考成绩</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: '#14574D', lineHeight: 1, fontFamily: 'var(--font-geist-sans), sans-serif' }}>
                    {inputScore}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#14574D' }}>分</span>
                </div>
              </div>
              <div style={{ alignSelf: 'center' }}>
                <Tag
                  color={inputScore !== null && inputScore >= CONTROL_LINES_2025['新乐市'] ? 'success' : 'error'}
                  style={{ margin: 0, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 10 }}
                >
                  {inputScore !== null && inputScore >= CONTROL_LINES_2025['新乐市']
                    ? `超控制线 ${inputScore - CONTROL_LINES_2025['新乐市']}分`
                    : '未达控制线'}
                </Tag>
              </div>
            </div>

            {/* 右侧：预估全域位次与重新输入 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginLeft: 'auto' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 11, color: C.inkSubtle, display: 'block', marginBottom: 2 }}>2026全市预估位次</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>
                  {marketRankResult?.rank != null ? `约第 ${marketRankResult.rank.toLocaleString()} 名` : '—'}
                </span>
                <span style={{ fontSize: 11, color: C.inkSubtle, display: 'block', marginTop: 1 }}>
                  同分 {student2026Metrics?.count != null ? formatNum(student2026Metrics.count) : '—'}人 · 全市 {student2026Metrics?.total != null ? (student2026Metrics.total / 10000).toFixed(1) + '万' : '—'}考生
                </span>
              </div>
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={handleReset}
                style={{ borderRadius: 8, color: C.inkMuted, fontSize: 12, height: 32 }}
              >
                重新输入
              </Button>
            </div>
          </div>

          {/* 底部考生背景与学校库概览 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: C.inkMuted, flexWrap: 'wrap', gap: 6 }}>
            <div>
              就读：<strong style={{ color: C.ink }}>{inputSchool || '新乐初中'}</strong> · 本校排名第 <strong style={{ color: C.ink }}>{inputRank}</strong> 名
            </div>
            <div style={{ color: C.inkSubtle }}>
              新乐可报高中 <strong style={{ color: '#14574D' }}>56</strong> 所（省示范 17 · 普高 39）
            </div>
          </div>
          {marketRankResult?.message && (
            <Text style={{ fontSize: 11, color: C.warning, display: 'block', marginTop: 6 }}>{marketRankResult.message}</Text>
          )}
        </div>
      )}

      {submitted && (
        <div style={{
          background: '#EAF4F1',
          border: '1px solid rgba(20, 87, 77, 0.16)',
          borderRadius: 14,
          padding: '12px 18px',
          marginBottom: 16,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: ladderSummary?.level === 'danger' ? '#fee2e2' : ladderSummary?.level === 'warning' ? '#fef3c7' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            }}>
              {ladderSummary?.level === 'danger' ? (
                <WarningOutlined style={{ fontSize: 18, color: '#dc2626' }} />
              ) : ladderSummary?.level === 'warning' ? (
                <WarningOutlined style={{ fontSize: 18, color: '#d97706' }} />
              ) : (
                <SafetyCertificateOutlined style={{ fontSize: 18, color: '#14574D' }} />
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text strong style={{ fontSize: 14, color: '#0d3732' }}>
                  {ladderSummary ? `志愿健康度诊断：${ladderSummary.title}` : '智能梯队辅助推荐'}
                </Text>
                {ladderSummary && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Tag color="volcano" style={{ margin: 0, fontSize: 11 }}>冲刺 {ladderSummary.chongCount}</Tag>
                    <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>稳妥 {ladderSummary.wenCount}</Tag>
                    <Tag color="green" style={{ margin: 0, fontSize: 11 }}>保底 {ladderSummary.baoCount}</Tag>
                  </div>
                )}
              </div>
              <Text style={{
                display: 'block',
                fontSize: 12,
                color: ladderSummary?.level === 'danger' ? '#b91c1c' : ladderSummary?.level === 'warning' ? '#b45309' : '#336158',
                marginTop: 2,
                lineHeight: 1.4,
              }}>
                {ladderSummary ? ladderSummary.advice : '还未添加志愿？点击右侧“一键生成冲稳保方案”，算法将自动按照分配生+示范高中+普高黄金梯队智能配比。'}
              </Text>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, justifyContent: isMobile ? 'flex-end' : 'flex-start' }}>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              style={{
                background: '#14574D',
                borderColor: '#14574D',
                fontWeight: 600,
                borderRadius: 10,
                height: 38,
                boxShadow: '0 4px 12px rgba(20, 87, 77, 0.25)',
              }}
              onClick={handleAutoGenerateLadder}
            >
              {ladderSummary ? '重新智能生成' : '一键生成冲稳保方案'}
            </Button>
            {ladderSummary && (
              <Button
                icon={<DeleteOutlined />}
                style={{ color: C.inkMuted, borderRadius: 10, height: 38 }}
                onClick={handleClearSlots}
              >
                清空已选
              </Button>
            )}
          </div>
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
            {/* 分配生资格自选专区（仅当初中有配额时展示，精致紧凑） */}
            {officialAllocationOptions.length > 0 && (
              <div style={{
                background: C.surface1,
                border: '1px solid rgba(20, 87, 77, 0.12)',
                borderRadius: 14,
                padding: isMobile ? '12px 14px' : '16px 20px',
                marginBottom: 16,
                boxShadow: '0 4px 14px rgba(20, 87, 77, 0.04)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  <div>
                    <Text strong style={{ fontSize: 14, color: '#0d3732' }}>第一批 C段 · 分配生自选机会</Text>
                    <Text style={{ display: 'block', fontSize: 11, color: C.inkSubtle, marginTop: 1 }}>
                      对【{inputSchool}】有定向名额的高中（按本校名额降序），最多自选3所
                    </Text>
                  </div>
                  <Tag color="cyan" style={{ margin: 0, fontSize: 11 }}>已选分配生 {allocationFilled}/3</Tag>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  {officialAllocationOptions.map((school) => {
                    const quota = getAllocationQuota(school)
                    const eligible = canUseAllocation(school)
                    const hopeful = !eligible && inputRank !== null && inputRank <= quota * 1.5
                    const recommended = school.schoolId === recommendedAllocationId
                    return (
                      <div key={`official-allocation-${school.schoolId}`} style={{
                        background: eligible ? '#f0fdf4' : hopeful ? '#fffbeb' : C.surface3,
                        border: `1px solid ${eligible ? '#bbf7d0' : hopeful ? '#fef08a' : C.hairline}`,
                        borderRadius: 10,
                        padding: '10px 12px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ minWidth: 0 }}>
                            <Text strong style={{ color: C.ink, fontSize: 13 }}>{school.name}</Text>
                            <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              <Tag color={eligible ? 'success' : hopeful ? 'warning' : 'default'} style={{ margin: 0, fontSize: 10 }}>
                                {eligible ? '✅ 有资格(稳)' : hopeful ? '△ 有希望(冲)' : '资格偏紧'}
                              </Tag>
                              {recommended && <Tag color="orange" style={{ margin: 0, fontSize: 10 }}>⭐ 优先推荐</Tag>}
                            </div>
                            <Text style={{ display: 'block', color: C.inkSubtle, fontSize: 11, marginTop: 4 }}>
                              本校名额 {quota} 个 · 你的校排名第 {inputRank} 名 · 新乐总配额 {school.xinleFenpeiQuota} 个
                            </Text>
                          </div>
                          <Button size="small" type={eligible ? 'primary' : 'default'} disabled={allocationFilled >= 3 || isInBasket(school.schoolId)} onClick={() => addToAllocation(school)} style={{ fontSize: 11, borderRadius: 8 }}>
                            {isInBasket(school.schoolId) ? '已选' : '+分配生'}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 对比栏 */}
            {compareSchools.length > 0 && (
              <div style={{ background: C.surface1, border: `1px solid ${C.hairline}`, borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <Text strong style={{ color: C.ink }}>学校对比（{compareSchools.length}/3）</Text>
                    {compareSchools.length < 2 && <Text style={{ marginLeft: 8, color: C.warning, fontSize: 12 }}>再勾选 1 所即可并排比较</Text>}
                  </div>
                  <Button size="small" type="text" onClick={() => setCompareSchoolIds([])}>清空</Button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(${compareSchools.length}, minmax(0, 1fr))`, gap: 8 }}>
                  {compareSchools.map((school) => (
                    <div key={`compare-${school.schoolId}`} style={{ background: C.surface3, border: `1px solid ${C.hairline}`, borderRadius: 10, padding: '10px 12px' }}>
                      <Text strong style={{ color: C.ink }}>{school.name}</Text>
                      <div style={{ marginTop: 8, display: 'grid', gap: 5, color: C.inkMuted, fontSize: 12 }}>
                        <span>2025录取线：{school.lineCompare.lineScore}分</span>
                        <span>2026等效分：{school.lineCompare.equivalent2026Score != null ? `${school.lineCompare.equivalent2026Score}分` : '暂无'}</span>
                        <span>距新乐：{school.distanceFromXinle || '暂未收录'}</span>
                        <span>学费：{school.tuitionFee || '暂未收录'}</span>
                        <span>住宿：{school.boardingAvail ? (school.boardingFee || '可住宿') : '走读'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category tabs on Desktop only */}
            {!isMobile && (
              <div style={{
                display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap',
              }}>
              {TAG_OPTIONS.map(t => {
                const cfg = t === '全部' ? null : SCORE_TAG_CONFIG[t]
                return (
                  <button
                    type="button"
                    key={t}
                    aria-pressed={filterTag === t}
                    onClick={() => setFilterTag(t)}
                    style={{
                      padding: '6px 14px',
                      minHeight: 44,
                      borderRadius: 20,
                      cursor: 'pointer',
                      font: 'inherit',
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
                  </button>
                )
              })}
              </div>
            )}

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
                  compareSchoolIds={compareSchoolIds}
                  onToggleCompare={toggleCompareSchool}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* School Detail Modal */}
      <BrandModal
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
                  <Tag color="warning" style={{ margin: 0, fontWeight: 600 }}>
                    ⚠️ 非新乐统招 · 仅供参考
                  </Tag>
                )}
              </div>

              {!detailSchool.accessible && (
                <div style={{
                  background: '#fffbe6',
                  border: '1px solid #ffe58f',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 12,
                  fontSize: 12,
                  color: '#d46b08',
                  lineHeight: 1.6,
                }}>
                  <strong>⚠️ 招生范围特别提醒：</strong>
                  本校为石家庄市区公办高中，新乐市生源无对应统招批次志愿代码，<strong>不可填报中考志愿</strong>。此处提供往年录取线、学校简介与高考升学率等信息，仅供家长全面了解全市高中整体格局与定位参考。
                </div>
              )}

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
                  <Button disabled block style={{ height: 42, background: '#f5f5f5', color: '#8c8c8c', fontSize: 13 }}>
                    ⚠️ 非新乐统招学校 · 仅供了解行情，不可加入志愿栏
                  </Button>
                )}
              </div>
              <div style={{ height: 24 }} />
            </div>
          )
        })()}
      </BrandModal>

      {/* Keep the school list visible; mobile basket details open on demand. */}
      {submitted && (
        <VolunteerBasket
          isMobile={isMobile}
          allocationCount={allocationFilled}
          shifanCount={shifanFilled}
          putongCount={putongFilled}
          onOpenForm={openOfficialForm}
        >
          {ladderSummary && (
            <div style={{
              background: ladderSummary.level === 'danger' ? '#fef2f2' : ladderSummary.level === 'warning' ? '#fffbeb' : '#f0fdf4',
              border: `1px solid ${ladderSummary.level === 'danger' ? '#fca5a5' : ladderSummary.level === 'warning' ? '#fcd34d' : '#86efac'}`,
              borderRadius: 8,
              padding: '8px 12px',
              marginBottom: 12,
              fontSize: 12,
              color: ladderSummary.level === 'danger' ? '#991b1b' : ladderSummary.level === 'warning' ? '#92400e' : '#166534',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {ladderSummary.level === 'danger' || ladderSummary.level === 'warning' ? (
                  <WarningOutlined />
                ) : (
                  <SafetyCertificateOutlined />
                )}
                <span><strong>{ladderSummary.title}</strong>：{ladderSummary.advice}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Button size="small" type="link" onClick={handleAutoGenerateLadder} style={{ padding: 0, height: 'auto', fontSize: 12 }}>
                  ⚡ 一键重新配比
                </Button>
                <Button size="small" type="link" danger onClick={handleClearSlots} style={{ padding: 0, height: 'auto', fontSize: 12 }}>
                  清空
                </Button>
              </div>
            </div>
          )}

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
        </VolunteerBasket>
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
    </PageLayout>
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
        <NextImage src={CONSULT_QR_SRC} alt="咨询二维码" width={200} height={200} unoptimized style={{ background: '#ffffff', border: '10px solid #ffffff', borderRadius: 18 }} />
        <div style={{ fontSize: 30, fontWeight: 800, color: C.ink, lineHeight: 1.35 }}>
          扫码找牧哲学堂老师，做专业人工解读
        </div>
      </div>

      <div style={{ position: 'absolute', left: 54, right: 54, bottom: 36, fontSize: 10, color: C.inkSubtle, textAlign: 'center' }}>
        {VOLUNTEER_REFERENCE_TEXT}
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
          <button
            type="button"
            aria-label={`移除${school.name}`}
            onClick={onRemove}
            style={{ width: 44, height: 44, margin: '-8px -10px -8px 0', border: 0, background: 'transparent', color: C.inkSubtle, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
          >
            <CloseOutlined style={{ fontSize: 12 }} />
          </button>
        </div>
        <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
          <Text style={{ fontSize: 10, color: C.primary }}>{segmentLabel}志愿{numeral}</Text>
          {swapping ? (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {allSlots.map((_, i) => (
                <button
                  type="button"
                  key={i}
                  disabled={i === index}
                  aria-label={`与第${i + 1}志愿交换位置`}
                  onClick={() => { onSwap(i); setSwapping(false) }}
                  style={{
                    width: 44, height: 44, borderRadius: 8,
                    background: i === index ? C.primary : C.surface1,
                    border: `1px solid ${C.hairline}`,
                    cursor: i === index ? 'default' : 'pointer',
                    fontSize: 12, textAlign: 'center',
                    color: C.inkSubtle,
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              aria-label={`调整${school.name}的志愿顺序`}
              onClick={() => setSwapping(true)}
              style={{ width: 44, height: 44, margin: '-14px 0', border: 0, background: 'transparent', color: C.inkSubtle, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
            >
              <SwapOutlined style={{ fontSize: 12 }} />
            </button>
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
  addToAllocation, addToShifan, addToPutong, onDetail, compareSchoolIds, onToggleCompare,
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
  compareSchoolIds: string[]
  onToggleCompare: (schoolId: string) => void
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

                // 智能拆分校名与招生说明，彻底杜绝重复
                const matchBracket = school.name.match(/^(.+?)[（(]([^）)]+)[）)]$/)
                const mainSchoolName = matchBracket ? matchBracket[1].trim() : school.name
                const bracketNote = matchBracket ? matchBracket[2].trim() : null
                const showFullName = Boolean(
                  school.fullName &&
                  school.fullName !== school.name &&
                  school.fullName !== mainSchoolName &&
                  !school.name.includes(school.fullName) &&
                  !school.fullName.includes(mainSchoolName)
                )

                // 梯队指示器色彩体系
                const tierStyle = tier === '冲刺'
                  ? { bg: '#FFF7ED', color: '#C2410C', border: '#FFEDD5', dotColor: '#F59E0B' }
                  : tier === '稳妥'
                    ? { bg: '#ECFDF5', color: '#047857', border: '#D1FAE5', dotColor: '#10B981' }
                    : tier === '保底'
                      ? { bg: '#EFF6FF', color: '#1D4ED8', border: '#DBEAFE', dotColor: '#3B82F6' }
                      : tier === '分配生机会'
                        ? { bg: '#FFF1F2', color: '#BE123C', border: '#FFE4E6', dotColor: '#F43F5E' }
                        : { bg: '#F9FAFB', color: '#4B5563', border: '#E5E7EB', dotColor: '#9CA3AF' }

                return (
                  <div
                    key={school.schoolId}
                    role="button"
                    tabIndex={0}
                    aria-label={`查看${school.name}详情`}
                    style={{
                      background: inBasket ? '#F8FCFA' : '#FFFFFF',
                      border: inBasket ? '1.5px solid #14574D' : '1px solid rgba(0, 0, 0, 0.07)',
                      borderRadius: 14,
                      padding: isMobile ? '12px 14px' : '16px 20px',
                      cursor: 'pointer',
                      opacity: school.accessible ? 1 : 0.72,
                      boxShadow: inBasket ? '0 4px 16px rgba(20, 87, 77, 0.08)' : '0 2px 8px rgba(0, 0, 0, 0.02)',
                      transition: 'all .15s ease',
                    }}
                    onClick={() => onDetail(school)}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onDetail(school)
                      }
                    }}
                  >
                    {/* Header Row: Tags + School Name + Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 8px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 700,
                            background: tierStyle.bg,
                            color: tierStyle.color,
                            border: `1px solid ${tierStyle.border}`,
                            lineHeight: 1.3,
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: tierStyle.dotColor }} />
                            {cfg.label}
                          </span>

                          <span style={{ fontSize: 11, color: C.inkMuted, background: '#f5f5f4', padding: '1px 6px', borderRadius: 4 }}>
                            {school.isProvincialDemo ? '省示范' : school.type}
                          </span>
                          <span style={{ fontSize: 11, color: C.inkSubtle }}>{school.location}</span>

                          {school.xinleStatus.map((status) => (
                            <Tag key={status} color={status === '统招可报' ? 'success' : status === '分配生可报' ? 'orange' : 'default'} style={{ margin: 0, fontSize: 10, borderRadius: 4 }}>
                              {status}
                            </Tag>
                          ))}

                          {selectedSegment && (
                            <span style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#14574D',
                              background: '#EAF4F1',
                              border: '1px solid rgba(20,87,77,0.25)',
                              padding: '1px 8px',
                              borderRadius: 10,
                            }}>
                              ✓ 已选入{selectedSegment}
                            </span>
                          )}

                          {!school.accessible && (
                            <Tag color="warning" style={{ margin: 0, fontSize: 10, fontWeight: 600 }}>
                              ⚠️ 非新乐统招 · 仅供参考
                            </Tag>
                          )}
                        </div>

                        {/* 主校名行（彻底去重） */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text strong style={{ fontSize: isMobile ? 15 : 16, color: C.ink }}>
                            {mainSchoolName}
                          </Text>
                          {bracketNote && (
                            <span style={{
                              fontSize: 11,
                              color: '#4b5563',
                              background: '#f3f4f6',
                              border: '1px solid #e5e7eb',
                              padding: '1px 6px',
                              borderRadius: 4,
                              lineHeight: 1.2,
                            }}>
                              {bracketNote}
                            </span>
                          )}
                          {showFullName && (
                            <Text style={{ fontSize: 11, color: C.inkSubtle }}>
                              ({school.fullName})
                            </Text>
                          )}
                        </div>
                      </div>

                      {/* 右侧操作按钮组 */}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={compareSchoolIds.includes(school.schoolId)}
                          onChange={() => onToggleCompare(school.schoolId)}
                          style={{ fontSize: 12, color: C.inkMuted }}
                        >
                          对比
                        </Checkbox>

                        {!school.accessible && (
                          <>
                            <Tag style={{ background: '#f5f5f5', color: '#8c8c8c', border: '1px solid #d9d9d9', fontSize: 11, margin: 0 }}>
                              不可填报
                            </Tag>
                            <Button
                              size="small"
                              style={{ fontSize: 11, color: C.inkMuted, borderRadius: 6 }}
                              onClick={() => onDetail(school)}
                            >
                              看简介
                            </Button>
                          </>
                        )}

                        {allocationEligible && (
                          <Button
                            size="small"
                            disabled={allocationFilled >= 3 || inBasket}
                            style={{
                              fontSize: 11,
                              borderRadius: 8,
                              borderColor: inBasket ? undefined : '#E8784A',
                              color: inBasket ? C.inkSubtle : '#E8784A',
                              background: inBasket ? undefined : '#FFF7ED',
                              fontWeight: 500,
                            }}
                            onClick={() => addToAllocation(school)}
                          >
                            {selectedSegment ? `已选${selectedSegment}` : isMobile ? `+分配生(${allocationFilled}/3)` : `加入分配生（${allocationFilled}/3）`}
                          </Button>
                        )}

                        {school.accessible && (
                          academicSegment === 'shifan' ? (
                            <Button
                              size="small"
                              disabled={shifanFilled >= 6 || inBasket}
                              style={{
                                fontSize: 11,
                                borderRadius: 8,
                                borderColor: inBasket ? undefined : '#14574D',
                                color: inBasket ? C.inkSubtle : '#14574D',
                                background: inBasket ? undefined : '#EAF4F1',
                                fontWeight: 500,
                              }}
                              onClick={() => addToShifan(school)}
                            >
                              {selectedSegment ? `已选${selectedSegment}` : isMobile ? `+省示范(${shifanFilled}/6)` : `加入省示范（${shifanFilled}/6）`}
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              disabled={putongFilled >= 6 || inBasket}
                              style={{
                                fontSize: 11,
                                borderRadius: 8,
                                borderColor: inBasket ? undefined : '#14574D',
                                color: inBasket ? C.inkSubtle : '#14574D',
                                background: inBasket ? undefined : '#EAF4F1',
                                fontWeight: 500,
                              }}
                              onClick={() => addToPutong(school)}
                            >
                              {selectedSegment ? `已选${selectedSegment}` : isMobile ? `+普高(${putongFilled}/6)` : `加入普高（${putongFilled}/6）`}
                            </Button>
                          )
                        )}
                      </div>
                    </div>

                    {/* 录取与折算数据微仪表盘 */}
                    <div style={{
                      marginTop: 10,
                      background: inBasket ? '#ffffff' : '#faf8f5',
                      border: '1px solid rgba(0, 0, 0, 0.04)',
                      borderRadius: 10,
                      padding: '10px 14px',
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                      gap: isMobile ? 8 : 16,
                    }}>
                      {/* 左栏：2025录取基线 */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                          <span style={{ fontSize: 11, color: C.inkSubtle }}>
                            2025 <Tooltip title={school.sourceNote || '暂无补充说明'}>{school.lineCompare.sourceLabel.replace('（新乐）', '').replace('（仅参考）', '')}</Tooltip>线
                          </span>
                          {school.yiTong && (
                            <span style={{ fontSize: 10, color: C.inkSubtle }}>
                              {school.type === '民办' ? '市区' : '一统'}{school.yiTong}分
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 3 }}>
                          <span style={{ fontSize: 17, fontWeight: 800, color: C.ink, fontFamily: 'var(--font-geist-sans), sans-serif', lineHeight: 1 }}>
                            {school.lineCompare.lineScore}
                          </span>
                          <span style={{ fontSize: 11, color: C.inkSubtle }}>分</span>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: school.lineCompare.scoreGap >= 0 ? '#ECFDF5' : '#FEF2F2',
                            color: school.lineCompare.scoreGap >= 0 ? '#047857' : '#B91C1C',
                            border: `1px solid ${school.lineCompare.scoreGap >= 0 ? '#A7F3D0' : '#FECACA'}`,
                          }}>
                            {school.lineCompare.scoreGap >= 0 ? `高 ${school.lineCompare.scoreGap} 分` : `差 ${Math.abs(school.lineCompare.scoreGap)} 分`}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: C.inkSubtle, marginTop: 4 }}>
                          {school.lineCompare.lineRank2025 != null ? `录取线对应位次 约第 ${formatNum(school.lineCompare.lineRank2025)} 名` : '2025线位次暂无'}
                        </div>
                      </div>

                      {/* 右栏：2026折算位次与竞争优势 */}
                      <div style={{
                        borderLeft: isMobile ? 'none' : `1px solid ${C.hairline}`,
                        paddingLeft: isMobile ? 0 : 14,
                        paddingTop: isMobile ? 6 : 0,
                        borderTop: isMobile ? `1px dashed ${C.hairline}` : 'none',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                          <span style={{ fontSize: 11, color: C.inkSubtle }}>2026位次折算研判</span>
                          {school.lineCompare.rankCompareLabel && (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '0 4px',
                              borderRadius: 4,
                              background: school.lineCompare.rankGap != null && school.lineCompare.rankGap <= 0 ? '#ECFDF5' : '#FFFBEB',
                              color: school.lineCompare.rankGap != null && school.lineCompare.rankGap <= 0 ? '#047857' : '#B45309',
                              border: `1px solid ${school.lineCompare.rankGap != null && school.lineCompare.rankGap <= 0 ? '#A7F3D0' : '#FDE68A'}`,
                            }}>
                              {school.lineCompare.rankCompareLabel}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: school.lineCompare.rankGap != null && school.lineCompare.rankGap <= 0 ? '#047857' : '#B45309', marginTop: 3 }}>
                          {school.lineCompare.equivalent2026Score != null
                            ? `折算约 ${school.lineCompare.equivalent2026Score} 分 · ${school.lineCompare.rankGapText}`
                            : '折算2026暂无'}
                        </div>
                        <div style={{ fontSize: 10, color: C.inkSubtle, marginTop: 4 }}>
                          以2026一分一档同位分测算 · 建议梯队填报
                        </div>
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
            <button type="button" key={t} aria-pressed={filterTag === t} onClick={() => setFilterTag(t)} style={{
              width: '100%', border: 0, textAlign: 'left', font: 'inherit',
              padding: '7px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: filterTag === t ? C.primaryBg : 'transparent',
              color: filterTag === t ? C.primary : C.inkMuted,
              fontWeight: filterTag === t ? 600 : 400,
              transition: 'background .15s', minHeight: 44,
            }}>
              <span>{t}</span>
              <span style={{ fontSize: 11, color: C.inkSubtle, minWidth: 18, textAlign: 'right' }}>
                {tagCounts[t] ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      <Divider style={{ margin: '12px 0', borderColor: C.hairline }} />

      <Text strong style={{ color: C.ink, fontSize: 13 }}>学校类型</Text>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {TYPE_OPTIONS.map(t => (
          <button type="button" key={t} aria-pressed={filterType === t} onClick={() => setFilterType(t)} style={{
            width: '100%', border: 0, textAlign: 'left', font: 'inherit',
            padding: '7px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
            background: filterType === t ? C.primaryBg : 'transparent',
            color: filterType === t ? C.primary : C.inkMuted,
            fontWeight: filterType === t ? 600 : 400, minHeight: 44,
          }}>
            {t}
          </button>
        ))}
      </div>

      <Divider style={{ margin: '12px 0', borderColor: C.hairline }} />

      <Text strong style={{ color: C.ink, fontSize: 13 }}>地区</Text>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button type="button" aria-pressed={filterLocation === '全部'} onClick={() => setFilterLocation('全部')} style={{
          width: '100%', border: 0, textAlign: 'left', font: 'inherit',
          padding: '7px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
          background: filterLocation === '全部' ? C.primaryBg : 'transparent',
          color: filterLocation === '全部' ? C.primary : C.inkMuted,
          fontWeight: filterLocation === '全部' ? 600 : 400, minHeight: 44,
        }}>
          全部
        </button>
        {locations.map(l => (
          <button type="button" key={l} aria-pressed={filterLocation === l} onClick={() => setFilterLocation(l)} style={{
            width: '100%', border: 0, textAlign: 'left', font: 'inherit',
            padding: '7px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
            background: filterLocation === l ? C.primaryBg : 'transparent',
            color: filterLocation === l ? C.primary : C.inkMuted,
            fontWeight: filterLocation === l ? 600 : 400, minHeight: 44,
          }}>
            {l}
          </button>
        ))}
      </div>

      <Divider style={{ margin: '12px 0', borderColor: C.hairline }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Text style={{ fontSize: 12, color: C.ink, fontWeight: 500 }}>仅新乐可报</Text>
          <Text style={{ display: 'block', fontSize: 10, color: C.inkSubtle }}>
            {onlyAccessible ? '当前显示新乐可报学校' : '当前已包含全市参考学校'}
          </Text>
        </div>
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
      background: '#ffffff',
      border: '1px solid rgba(20, 87, 77, 0.12)',
      borderRadius: 14,
      padding: '10px 12px',
      position: 'sticky',
      top: 72,
      zIndex: 40,
      boxShadow: '0 4px 16px rgba(20, 87, 77, 0.05)',
    }}>
      <style>{`
        .filter-scroll-container::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `}</style>

      {/* Score match chips — horizontal scroll without ugly scrollbars */}
      <div
        className="filter-scroll-container"
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 2,
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {TAG_OPTIONS.map(t => {
          const isSelected = filterTag === t
          const dotColor = t === '全部' ? '#9ca3af'
            : t === '冲刺' ? '#f59e0b'
            : t === '稳妥' ? '#10b981'
            : t === '保底' ? '#3b82f6'
            : t === '分配生机会' ? '#f43f5e'
            : '#9ca3af'

          return (
            <button
              type="button"
              key={t}
              aria-pressed={isSelected}
              onClick={() => setFilterTag(t)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: isSelected ? 600 : 400,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                background: isSelected ? '#14574D' : '#faf8f5',
                border: `1px solid ${isSelected ? '#14574D' : 'rgba(0,0,0,0.06)'}`,
                color: isSelected ? '#ffffff' : '#4b5563',
                minHeight: 36,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                font: 'inherit',
                transition: 'all .15s ease',
                boxShadow: isSelected ? '0 2px 8px rgba(20, 87, 77, 0.25)' : 'none',
              }}
            >
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: isSelected ? '#a7f3d0' : dotColor,
                display: 'inline-block',
              }} />
              <span>{t}</span>
              <span style={{
                fontSize: 11,
                color: isSelected ? 'rgba(255,255,255,0.75)' : '#9ca3af',
                fontWeight: 500,
              }}>
                {tagCounts[t] ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      {/* Type + Location + Switch row */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <AdaptiveSelect
          size="small"
          value={filterType || undefined}
          onChange={v => setFilterType(v || '全部')}
          style={{ width: 92, minHeight: 32 }}
          options={[
            { label: '全部类型', value: '全部' },
            ...TYPE_OPTIONS.filter(t => t !== '全部').map(t => ({ label: t, value: t })),
          ]}
        />
        <AdaptiveSelect
          size="small"
          value={filterLocation || undefined}
          onChange={v => setFilterLocation(v || '全部')}
          style={{ width: 92, minHeight: 32 }}
          showSearch={locations.length > 10}
          filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          options={[
            { label: '全部地区', value: '全部' },
            ...locations.map(l => ({ label: l, value: l })),
          ]}
        />
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          marginLeft: 'auto',
          background: onlyAccessible ? '#EAF4F1' : '#f5f5f4',
          border: `1px solid ${onlyAccessible ? 'rgba(20,87,77,0.2)' : 'rgba(0,0,0,0.06)'}`,
          padding: '3px 8px',
          borderRadius: 14,
        }}>
          <Text style={{ fontSize: 11, color: onlyAccessible ? '#14574D' : C.inkSubtle, fontWeight: onlyAccessible ? 600 : 400 }}>
            {onlyAccessible ? '仅新乐可报' : '含全市参考'}
          </Text>
          <Switch size="small" checked={onlyAccessible} onChange={setOnlyAccessible} />
        </div>
      </div>
    </div>
  )
}
