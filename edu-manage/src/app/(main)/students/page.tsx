'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import useSWR, { useSWRConfig } from 'swr'
import {
  Alert,
  Button,
  Card,
  Input,
  Select,
  Skeleton,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  FilterOutlined,
  ImportOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { StudentCard } from './_components/StudentCard'
import { StudentForm } from './_components/StudentForm'
import { StudentTabsNav, type StudentTabKey } from './_components/StudentTabsNav'
import { StudentHoursTab } from './_components/StudentHoursTab'
import { StudentAttendanceTab } from './_components/StudentAttendanceTab'
import { StudentFeesTab } from './_components/StudentFeesTab'
import { PageLayout } from '@/components/Layout/PageLayout'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useDivision } from '@/contexts/DivisionContext'
import { hasLowPrepaidHours } from '@/lib/student-billing-status'
import { isAdminTermScopedSWRKey } from '@/lib/admin-term-scope-client'
import { GuidedEmpty } from '@/components/Common/GuidedEmpty'
import { BrandModal } from '@/components/Common/BrandModal'
import styles from './students.module.css'

const ImportModal = dynamic(
  () => import('./_components/ImportModal').then((module) => module.ImportModal),
  { ssr: false },
)

const { Text } = Typography

const GRADE_ORDER = ['高三', '高二', '高一', '初三', '初二', '初一']
const GRADE_TABS = ['全部', '初一', '初二', '初三', '高一', '高二', '高三']
const GRADE_SELECT_OPTIONS = [
  '小学一年级',
  '小学二年级',
  '小学三年级',
  '小学四年级',
  '小学五年级',
  '小学六年级',
  '初一',
  '初二',
  '初三',
  '高一',
  '高二',
  '高三',
]

const TYPE_TABS = [
  { value: 'all', label: '全部班型', color: '#98A2B3' },
  { value: 'ONE_ON_ONE', label: '一对一', color: '#534AB7' },
  { value: 'ONE_ON_TWO', label: '一对二', color: '#185FA5' },
  { value: 'ONE_ON_THREE', label: '一对三', color: '#D4537E' },
  { value: 'GROUP', label: '精品班课', color: '#E8784A' },
  { value: 'STUDY_HALL', label: '晚托作业班', color: '#A63F18' },
]

type Student = {
  id: string
  name: string
  status: string
  gender?: string | null
  grade?: string | null
  school?: string | null
  enrolledAt: string
  remainHours: number
  totalHours: number
  taughtHours: number
  source?: string | null
  courseType?: string | null
  fees?: Array<{
    id: string
    status?: string | null
    dueDate?: string | null
    amount?: number | null
  }>
  enrollments?: Array<{
    id: string
    remainHours?: number | null
    totalHours?: number | null
    usedHours?: number | null
    group?: {
      name?: string | null
      lessonMinutes?: number | null
      intensiveMode?: string | null
      course?: { name?: string | null; type?: string | null } | null
    } | null
  }>
  studyHallMemberships?: Array<{
    id: string
    remainingDays: number | null
    totalDays: number | null
    quotaState: 'UNSET' | 'ACTIVE' | 'LOW' | 'EXPIRED'
    studyClass: { name: string; scheduleType: 'WEEKDAY_LATE' | 'WEEKEND' }
  }>
  mainTeacher?: { id: string; name: string } | null
  schedules?: Array<{ schedule: { course?: { id: string; name: string } | null } }>
}

type GroupedStudents = Record<string, Student[]>
type StudentSortBy = 'createdAt' | 'nameAsc' | 'nameDesc' | 'remainHoursAsc' | 'remainHoursDesc'
type AcademicTerm = {
  id: string
  name: string
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  startDate: string
  endDate: string
}

function appendStudentPage(current: GroupedStudents, next: GroupedStudents): GroupedStudents {
  const merged: GroupedStudents = { ...current }
  for (const [grade, students] of Object.entries(next)) {
    const existing = merged[grade] || []
    const existingIds = new Set(existing.map((student) => student.id))
    merged[grade] = [...existing, ...students.filter((student) => !existingIds.has(student.id))]
  }
  return merged
}

const termFetcher = (url: string) =>
  fetch(url).then(async (response) => {
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || '运营批次加载失败')
    return payload
  })

function readQuery() {
  if (typeof window === 'undefined')
    return {
      grade: 'all',
      courseType: 'all',
      q: '',
      status: '',
      sortBy: 'createdAt' as StudentSortBy,
      tab: 'roster' as StudentTabKey,
    }
  const params = new URLSearchParams(window.location.search)
  const requestedSort = params.get('sortBy')
  const sortBy: StudentSortBy =
    requestedSort === 'nameAsc' ||
    requestedSort === 'nameDesc' ||
    requestedSort === 'remainHoursAsc' ||
    requestedSort === 'remainHoursDesc'
      ? requestedSort
      : 'createdAt'
  const requestedTab = params.get('tab')
  const tab: StudentTabKey =
    requestedTab === 'hours' ||
    requestedTab === 'attendance' ||
    requestedTab === 'fees'
      ? requestedTab
      : 'roster'
  return {
    grade: params.get('grade') || 'all',
    courseType: params.get('courseType') || 'all',
    q: params.get('q') || '',
    status: params.get('status') || '',
    sortBy,
    tab,
  }
}

export default function StudentsPage() {
  const router = useRouter()
  const { mutate: mutateCache } = useSWRConfig()
  const isMobile = useIsMobile() ?? false
  const { division } = useDivision()
  const [grouped, setGrouped] = useState<GroupedStudents>({})
  const [gradeCounts, setGradeCounts] = useState<Record<string, number>>({})
  const [totalCount, setTotalCount] = useState(0)
  const [truncated, setTruncated] = useState(false)
  const [loadedPage, setLoadedPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [filterGrade, setFilterGrade] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState<string | undefined>()
  const [lowHourOnly, setLowHourOnly] = useState(false)
  const [sortBy, setSortBy] = useState<StudentSortBy>('createdAt')
  const [activeTab, setActiveTab] = useState<StudentTabKey>('roster')
  const [visitedTabs, setVisitedTabs] = useState<Set<StudentTabKey>>(new Set(['roster']))
  const [filtersReady, setFiltersReady] = useState(false)
  const hasLoadedRef = useRef(false)
  const requestIdRef = useRef(0)
  const activeRequestRef = useRef<AbortController | null>(null)
  const activeRequestKeyRef = useRef('')
  const activeRequestPromiseRef = useRef<Promise<void> | null>(null)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const studentCacheRef = useRef(
    new Map<
      string,
      {
        grouped: GroupedStudents
        gradeCounts: Record<string, number>
        totalCount: number
        truncated: boolean
      }
    >()
  )

  const {
    data: termData,
    error: termError,
    mutate: mutateTerms,
  } = useSWR<{ terms: AcademicTerm[]; selectedTermId?: string | null }>(
    '/api/admin/academic-terms',
    termFetcher
  )
  const terms = useMemo(() => termData?.terms || [], [termData?.terms])
  const [selectedTermId, setSelectedTermId] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [deleting, setDeleting] = useState<Record<string, unknown> | null>(null)
  const [deleteImpact, setDeleteImpact] = useState<{
    enrollments?: number
    attendances?: number
    papers?: number
    feedbacks?: number
    parentAccount?: number
  } | null>(null)
  const [deletePreviewLoading, setDeletePreviewLoading] = useState(false)

  useEffect(() => {
    const query = readQuery()
    setFilterGrade(query.grade)
    setFilterType(query.courseType)
    setSearch(query.q)
    setSearchInput(query.q)
    setFilterStatus(query.status || undefined)
    setSortBy(query.sortBy)
    setActiveTab(query.tab)
    setVisitedTabs(new Set(['roster', query.tab]))
    setFiltersReady(true)
  }, [])

  const handleTabChange = useCallback((newTab: StudentTabKey) => {
    setActiveTab(newTab)
    setVisitedTabs((prev) => new Set([...prev, newTab]))
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (newTab === 'roster') {
        params.delete('tab')
      } else {
        params.set('tab', newTab)
      }
      const queryString = params.toString() ? `?${params.toString()}` : ''
      window.history.replaceState(null, '', `${window.location.pathname}${queryString}`)
    }
  }, [])

  useEffect(() => {
    if (terms.length === 0) return
    const queryTermId =
      typeof window === 'undefined'
        ? ''
        : new URLSearchParams(window.location.search).get('termId') || ''
    const selected =
      terms.find((term) => term.id === queryTermId) ||
      terms.find((term) => term.id === termData?.selectedTermId) ||
      terms.find((term) => term.status === 'ACTIVE') ||
      terms[0]
    const nextTermId = selected?.id || ''
    setSelectedTermId((current) => (current === nextTermId ? current : nextTermId))
  }, [termData?.selectedTermId, terms])

  const selectedTerm = useMemo(
    () => terms.find((term) => term.id === selectedTermId),
    [selectedTermId, terms]
  )
  const canEditCurrentTerm = selectedTerm?.status === 'ACTIVE'

  const allStudents = useMemo(() => Object.values(grouped).flat(), [grouped])
  const activeCount = allStudents.filter((student) => student.status === 'ACTIVE').length
  const lowHourCount = allStudents.filter(
    (student) => student.status === 'ACTIVE' && hasLowPrepaidHours(student.enrollments)
  ).length

  const updateUrl = useCallback(
    (next: {
      grade?: string
      courseType?: string
      q?: string
      status?: string
      lowHour?: boolean
      sortBy?: StudentSortBy
    }) => {
      if (typeof window === 'undefined') return
      const params = new URLSearchParams(window.location.search)
      const merged = {
        grade: next.grade ?? filterGrade,
        courseType: next.courseType ?? filterType,
        q: next.q ?? searchInput,
        status: next.status ?? filterStatus ?? '',
      }
      if (merged.grade && merged.grade !== 'all') params.set('grade', merged.grade)
      else params.delete('grade')
      if (merged.courseType && merged.courseType !== 'all') params.set('courseType', merged.courseType)
      else params.delete('courseType')
      if (merged.q) params.set('q', merged.q)
      else params.delete('q')
      if (merged.status) params.set('status', merged.status)
      else params.delete('status')
      if (next.lowHour) params.set('lowHours', '1')
      else if (next.lowHour === false) params.delete('lowHours')
      const nextSortBy = next.sortBy ?? sortBy
      if (nextSortBy !== 'createdAt') params.set('sortBy', nextSortBy)
      else params.delete('sortBy')
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${params.toString() ? `?${params}` : ''}`
      )
    },
    [filterGrade, filterStatus, filterType, searchInput, sortBy]
  )

  const fetchStudents = useCallback(
    async (forceRefresh = false, page = 1, append = false) => {
      if (
        !filtersReady ||
        (!termData && !termError) ||
        (terms.length > 0 && !selectedTermId)
      )
        return

      const params = new URLSearchParams()
      params.set('groupByGrade', 'true')
      params.set('limit', '500')
      params.set('page', String(page))
      params.set('division', division)
      if (filterGrade !== 'all') params.set('grade', filterGrade)
      if (filterType !== 'all') params.set('courseType', filterType)
      if (filterStatus) params.set('status', filterStatus)
      if (search) params.set('q', search)
      if (lowHourOnly) params.set('lowHours', '1')
      params.set('sortBy', sortBy)
      if (selectedTermId) params.set('termId', selectedTermId)
      const requestKey = params.toString()
      if (
        activeRequestKeyRef.current === requestKey &&
        activeRequestPromiseRef.current &&
        !activeRequestRef.current?.signal.aborted &&
        !forceRefresh
      ) {
        return activeRequestPromiseRef.current
      }

      activeRequestRef.current?.abort()
      const requestId = ++requestIdRef.current
      const cached = forceRefresh ? undefined : studentCacheRef.current.get(requestKey)
      if (forceRefresh) studentCacheRef.current.clear()
      if (cached) {
        setGrouped(cached.grouped)
        setGradeCounts(cached.gradeCounts)
        setTotalCount(cached.totalCount)
        setTruncated(cached.truncated)
        setLoadedPage(1)
        hasLoadedRef.current = true
        setHasLoaded(true)
        setLoading(false)
      } else if (!hasLoadedRef.current) {
        setLoading(true)
      }
      setRefreshing(true)
      setLoadError('')

      const controller = new AbortController()
      activeRequestRef.current = controller
      activeRequestKeyRef.current = requestKey
      const request = (async () => {
        try {
          const response = await fetch(`/api/students?${params}`, { signal: controller.signal })
          const payload = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(payload.error || '学员数据加载失败')
          if (requestId !== requestIdRef.current) return
          const nextGrouped: GroupedStudents = payload.studentsByGrade || {}
          const nextGradeCounts: Record<string, number> = payload.gradeCounts || {}
          const nextTotalCount = Number(payload.total || 0)
          const nextTruncated = page * Number(payload.limit || 500) < nextTotalCount
          if (page === 1) {
            studentCacheRef.current.set(requestKey, {
              grouped: nextGrouped,
              gradeCounts: nextGradeCounts,
              totalCount: nextTotalCount,
              truncated: nextTruncated,
            })
          }
          setGrouped((current) => (append ? appendStudentPage(current, nextGrouped) : nextGrouped))
          setGradeCounts(nextGradeCounts)
          setTotalCount(nextTotalCount)
          setTruncated(nextTruncated)
          setLoadedPage(page)
          hasLoadedRef.current = true
          setHasLoaded(true)
        } catch (error) {
          if (controller.signal.aborted || requestId !== requestIdRef.current) return
          const description =
            error instanceof Error ? error.message : '学员数据加载失败，请稍后重试。'
          setLoadError(description)
          if (!hasLoadedRef.current) message.error(description)
        } finally {
          if (requestId === requestIdRef.current) {
            setLoading(false)
            setRefreshing(false)
            activeRequestRef.current = null
            activeRequestKeyRef.current = ''
            activeRequestPromiseRef.current = null
          }
        }
      })()
      activeRequestPromiseRef.current = request
      return request
    },
    [
      division,
      filterGrade,
      filterStatus,
      filterType,
      filtersReady,
      lowHourOnly,
      search,
      selectedTermId,
      sortBy,
      termData,
      termError,
      terms.length,
    ]
  )

  const handleLoadMoreStudents = useCallback(async () => {
    if (loadingMore || refreshing || !truncated) return
    setLoadingMore(true)
    try {
      await fetchStudents(false, loadedPage + 1, true)
    } finally {
      setLoadingMore(false)
    }
  }, [fetchStudents, loadedPage, loadingMore, refreshing, truncated])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  useEffect(
    () => () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
      activeRequestRef.current?.abort()
    },
    []
  )

  const handleGradeChange = (grade: string) => {
    setFilterGrade(grade)
    updateUrl({ grade })
  }

  const handleTypeChange = (courseType: string) => {
    setFilterType(courseType)
    updateUrl({ courseType })
  }

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    updateUrl({ q: value })
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => setSearch(value), 280)
  }

  const handleStatusChange = (value?: string) => {
    setFilterStatus(value)
    updateUrl({ status: value || '' })
  }

  const handleSortChange = (value: StudentSortBy) => {
    setSortBy(value)
    updateUrl({ sortBy: value })
  }

  const handleEdit = (student: Record<string, unknown>) => {
    setEditData(student)
    setFormOpen(true)
  }
  const handleFormClose = () => {
    setFormOpen(false)
    setEditData(null)
    fetchStudents(true)
  }

  const handleDeleteClick = async (student: Record<string, unknown>) => {
    setDeleting(student)
    setDeleteImpact(null)
    setDeletePreviewLoading(true)
    try {
      const response = await fetch(
        `/api/admin/trash/preview?type=Student&id=${encodeURIComponent(String(student.id))}`
      )
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || '无法加载影响范围')
      setDeleteImpact(payload.data.impact)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '无法加载影响范围')
    } finally {
      setDeletePreviewLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleting) return
    try {
      const res = await fetch(`/api/students/${deleting.id}`, { method: 'DELETE' })
      if (res.ok) {
        message.success(`「${deleting.name}」已移入回收站`)
        fetchStudents(true)
      } else {
        const err = await res.json().catch(() => null)
        message.error(err?.error || `操作失败：${res.status}`)
      }
    } catch {
      message.error('网络错误')
    }
    setDeleting(null)
  }

  const groupedEntries = useMemo(() => {
    const ordered = GRADE_ORDER.filter((grade) => grouped[grade]?.length).map(
      (grade) => [grade, grouped[grade]] as const
    )
    const rest = Object.entries(grouped).filter(
      ([grade]) => !GRADE_ORDER.includes(grade) && grouped[grade]?.length
    )
    return [...ordered, ...rest]
  }, [grouped])

  const hasActiveFilters = Boolean(
    searchInput ||
      filterGrade !== 'all' ||
      filterType !== 'all' ||
      filterStatus ||
      lowHourOnly
  )

  const clearAllFilters = () => {
    setSearch('')
    setSearchInput('')
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    setFilterGrade('all')
    setFilterType('all')
    setFilterStatus(undefined)
    setLowHourOnly(false)
    router.replace('/students')
  }

  return (
    <PageLayout
      title="学员管理"
      subtitle={
        selectedTerm
          ? `${selectedTerm.name}学员名单${
              selectedTerm.status === 'ARCHIVED' ? '（历史归档，只读查看）' : ''
            }`
          : '请选择运营批次'
      }
    >
      <div className={styles.container}>
        {/* ==============================================================
            1. 顶部 KPI 运营大盘指标条 (Executive KPI Header)
            ============================================================== */}
        <div className={styles.kpiGrid}>
          {/* 总学员数 */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHead}>
              <span className={styles.kpiLabel}>学员总数</span>
              <TeamOutlined className={styles.kpiIcon} />
            </div>
            <div className={styles.kpiValue}>{totalCount}</div>
            <div className={styles.kpiSubText}>当前批次登记在册人数</div>
          </div>

          {/* 在读学员 */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHead}>
              <span className={styles.kpiLabel}>在读学员</span>
              <CheckCircleOutlined className={styles.kpiIcon} style={{ color: 'var(--color-success)' }} />
            </div>
            <div className={`${styles.kpiValue} ${styles.kpiValueSuccess}`}>{activeCount}</div>
            <div className={styles.kpiSubText}>状态为“在读”学员</div>
          </div>

          {/* 欠费预警（可点击切换高亮筛选） */}
          <div
            className={`${styles.kpiCard} ${styles.kpiCardInteractive} ${
              lowHourOnly ? styles.kpiCardActive : ''
            }`}
            onClick={() => {
              const next = !lowHourOnly
              setLowHourOnly(next)
              updateUrl({ lowHour: next })
            }}
            title="点击仅查看课时告急学员"
          >
            <div className={styles.kpiHead}>
              <span className={styles.kpiLabel} style={{ color: '#E03E2D', fontWeight: 600 }}>
                课时告急预警
              </span>
              <WarningOutlined className={styles.kpiIcon} style={{ color: '#E03E2D' }} />
            </div>
            <div className={`${styles.kpiValue} ${styles.kpiValueWarning}`}>{lowHourCount}</div>
            <div className={styles.kpiSubText} style={{ color: '#E03E2D' }}>
              剩余课时 ≤ 3 节 {lowHourOnly ? '(正在筛选)' : '(点击筛选)'}
            </div>
          </div>

          {/* 运营批次状态 */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHead}>
              <span className={styles.kpiLabel}>当前运营批次</span>
              <CalendarOutlined className={styles.kpiIcon} />
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--color-ink)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {selectedTerm?.name || '未选批次'}
            </div>
            <div className={styles.kpiSubText}>
              <Tag color={selectedTerm?.status === 'ACTIVE' ? 'green' : 'default'} style={{ margin: 0, fontSize: 11 }}>
                {selectedTerm?.status === 'ACTIVE'
                  ? '进行中'
                  : selectedTerm?.status === 'ARCHIVED'
                  ? '已归档'
                  : '未启用'}
              </Tag>
            </div>
          </div>
        </div>

        {/* ==============================================================
            2. 同页面内 Tab 聚合导航条 (Tabs Navigation)
            ============================================================== */}
        <StudentTabsNav
          activeTab={activeTab}
          onChange={handleTabChange}
          lowHourCount={lowHourCount}
        />

        {/* ==============================================================
            3. 紧凑智能筛选工作台 (Filter Card - 共享搜索与批次)
            ============================================================== */}
        <div className={styles.filterCard}>
          {/* 第一行：搜索框与主要操作按钮同行混排 */}
          <div className={styles.filterTopRow}>
            <Input
              className={styles.searchInput}
              placeholder={
                activeTab === 'roster'
                  ? '搜索姓名、手机号、家长'
                  : activeTab === 'hours'
                  ? '搜索学员姓名、课程或教师进行课时核对'
                  : activeTab === 'attendance'
                  ? '搜索学员姓名或课程进行消课流水核验'
                  : '搜索学员姓名进行学费与订单核账'
              }
              prefix={<SearchOutlined style={{ color: 'var(--color-ink-subtle)' }} />}
              value={searchInput}
              onChange={(event) => handleSearchChange(event.target.value)}
              allowClear
            />

            <div className={styles.actionsGroup}>
              <Button
                icon={<ImportOutlined />}
                disabled={!canEditCurrentTerm}
                onClick={() => setImportOpen(true)}
              >
                {isMobile ? '导入' : '批量导入'}
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                disabled={!canEditCurrentTerm}
                onClick={() => {
                  setEditData(null)
                  setFormOpen(true)
                }}
                style={{
                  background: 'var(--color-primary)',
                  borderColor: 'var(--color-primary)',
                }}
              >
                {isMobile ? '添加' : '添加学员'}
              </Button>
            </div>
          </div>

          {/* 第二行：批次、状态、排序 紧凑单行网格 */}
          <div className={styles.filterSelectsRow}>
            <Select
              aria-label="运营批次"
              value={selectedTermId || undefined}
              placeholder="运营批次"
              onChange={async (value: string) => {
                const response = await fetch('/api/admin/academic-terms/scope', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ termId: value }),
                })
                const payload = await response.json().catch(() => ({}))
                if (!response.ok) {
                  message.error(payload.error || '切换运营批次失败')
                  return
                }
                const persistedTermId = payload.term?.id || value
                setSelectedTermId(persistedTermId)
                await mutateTerms(
                  (current) =>
                    current
                      ? {
                          ...current,
                          selectedTermId: persistedTermId,
                        }
                      : current,
                  { revalidate: false }
                )
                await mutateCache(isAdminTermScopedSWRKey, undefined, { revalidate: false })
                const params = new URLSearchParams(window.location.search)
                params.delete('termId')
                window.history.replaceState(
                  null,
                  '',
                  `${window.location.pathname}${params.toString() ? `?${params}` : ''}`
                )
                await mutateTerms()
                router.refresh()
                message.success(`已切换到“${payload.term?.name || '所选批次'}”`)
              }}
              style={{ width: isMobile ? '100%' : 180 }}
              options={terms.map((term) => ({
                label: `${term.name}${
                  term.status === 'ACTIVE'
                    ? '（当前）'
                    : term.status === 'ARCHIVED'
                    ? '（已归档）'
                    : '（未启用）'
                }`,
                value: term.id,
              }))}
              getPopupContainer={(trigger) => trigger.parentElement || document.body}
              virtual={false}
            />

            {activeTab === 'roster' && (
              <>
                <Select
                  placeholder="全部状态"
                  value={filterStatus}
                  onChange={handleStatusChange}
                  allowClear
                  style={{ width: isMobile ? '100%' : 120 }}
                  options={[
                    { label: '全部状态', value: '' },
                    { label: '在读', value: 'ACTIVE' },
                    { label: '试听', value: 'TRIAL' },
                    { label: '潜客', value: 'LEAD' },
                    { label: '结课', value: 'COMPLETED' },
                    { label: '离校', value: 'INACTIVE' },
                  ]}
                />

                <Select
                  value={sortBy}
                  onChange={handleSortChange}
                  style={{ width: isMobile ? '100%' : 140 }}
                  options={[
                    { label: '按添加时间', value: 'createdAt' },
                    { label: '姓名 A-Z', value: 'nameAsc' },
                    { label: '姓名 Z-A', value: 'nameDesc' },
                    { label: '剩余课时升序', value: 'remainHoursAsc' },
                    { label: '剩余课时降序', value: 'remainHoursDesc' },
                  ]}
                />
              </>
            )}
          </div>

          {/* 第三行：年级分段胶囊 + 班型分段胶囊（横向平滑滚动） */}
          {activeTab === 'roster' && (
            <div className={styles.pillTabsRow}>
            {/* 年级分段 */}
            <div className={styles.pillGroup}>
              {GRADE_TABS.map((grade) => {
                const value = grade === '全部' ? 'all' : grade
                const active = filterGrade === value
                const count =
                  value === 'all'
                    ? Object.values(gradeCounts).reduce((sum, item) => sum + item, 0)
                    : gradeCounts[value] || 0
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleGradeChange(value)}
                    className={`${styles.pillBtn} ${active ? styles.pillBtnActive : ''}`}
                  >
                    <span>{grade}</span>
                    <span style={{ fontSize: 11, opacity: 0.75 }}>({count})</span>
                  </button>
                )
              })}
            </div>

            {/* 班型分段 */}
            <div className={styles.pillGroup}>
              {TYPE_TABS.map((item) => {
                const active = filterType === item.value
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleTypeChange(item.value)}
                    className={`${styles.pillBtn} ${active ? styles.pillBtnActive : ''}`}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: item.color,
                        display: 'inline-block',
                      }}
                    />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>

            {/* 筛选指示与一键清空 */}
            {hasActiveFilters && (
              <div className={styles.filterSummaryText}>
                <span>已筛选</span>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className={styles.clearFilterLink}
                  title="清空当前所有筛选"
                >
                  清空
                </button>
              </div>
            )}
          </div>
        )}
        </div>

        {/* ==============================================================
            3. 学员名册卡片流 (Student Cards Stream - Roster Tab)
            ============================================================== */}
        <div style={{ display: activeTab === 'roster' ? 'block' : 'none' }}>
        {refreshing && hasLoaded ? (
          <div
            role="status"
            aria-live="polite"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--color-ink-subtle)',
              fontSize: 12,
            }}
          >
            <Spin size="small" />
            <span>正在更新学员名单，当前内容可继续操作</span>
          </div>
        ) : null}

        {loadError ? (
          <Alert
            showIcon
            type="error"
            message={hasLoaded ? '学员信息更新失败' : '学员信息暂时无法加载'}
            description={loadError}
            action={
              <Button size="small" onClick={() => fetchStudents(true)}>
                重试
              </Button>
            }
            style={{ borderRadius: 12 }}
          />
        ) : null}

        {!hasLoaded && loading ? (
          <section aria-label="正在加载学员列表" aria-busy="true">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile
                  ? '1fr'
                  : 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 12,
              }}
            >
              {Array.from({ length: 6 }, (_, index) => (
                <Card key={index} style={{ borderRadius: 14, borderColor: 'var(--color-hairline)' }}>
                  <Skeleton active avatar paragraph={{ rows: 2 }} />
                </Card>
              ))}
            </div>
          </section>
        ) : groupedEntries.length === 0 ? (
          <Card
            bordered={false}
            style={{
              borderRadius: 16,
              textAlign: 'center',
              padding: 48,
              background: '#ffffff',
              border: '1px solid var(--color-hairline)',
            }}
          >
            <GuidedEmpty
              title={
                selectedTerm?.status === 'ARCHIVED'
                  ? '该历史批次没有学员记录'
                  : hasActiveFilters
                  ? '没有符合条件的学员'
                  : '当前批次还没有学员'
              }
              description={
                selectedTerm?.status === 'ARCHIVED'
                  ? '历史批次只供核查档案，如需排课与日常教务请切换至当前活跃批次。'
                  : hasActiveFilters
                  ? '可以清空筛选条件，查看当前运营批次的全部学员。'
                  : '点击上方“添加学员”或“批量导入”开始建立学员学情档案。'
              }
              actionLabel={
                selectedTerm?.status === 'ARCHIVED'
                  ? undefined
                  : hasActiveFilters
                  ? '清除所有筛选'
                  : canEditCurrentTerm
                  ? '添加第一位学员'
                  : undefined
              }
              actionIcon={!hasActiveFilters ? <PlusOutlined /> : undefined}
              onAction={
                selectedTerm?.status === 'ARCHIVED'
                  ? undefined
                  : hasActiveFilters
                  ? clearAllFilters
                  : canEditCurrentTerm
                  ? () => setFormOpen(true)
                  : undefined
              }
            />
          </Card>
        ) : (
          <div
            aria-busy={refreshing}
            style={{
              opacity: refreshing ? 0.75 : 1,
              transition: 'opacity 160ms ease',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            {truncated ? (
              <Alert
                type="info"
                showIcon
                message={`当前筛选共 ${totalCount} 位，已加载 ${allStudents.length} 位`}
                description={
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>可继续分批加载，也可通过年级、班型或姓名快速精确定位。</span>
                    <Button
                      size="small"
                      type="link"
                      loading={loadingMore}
                      onClick={handleLoadMoreStudents}
                    >
                      加载下一批（500 位）
                    </Button>
                  </div>
                }
                style={{ borderRadius: 12 }}
              />
            ) : null}

            {/* 按年级分组的学员卡片流 */}
            {groupedEntries.map(([grade, students]) => (
              <section key={grade} className={styles.gradeSection}>
                <div className={styles.gradeHeader}>
                  <h2 className={styles.gradeTitle}>
                    {grade}
                  </h2>
                  <div className={styles.gradeDivider} />
                  <span className={styles.gradeCountBadge}>{students.length} 位学员</span>
                </div>

                <div className={styles.studentGrid}>
                  {students.map((student) => (
                    <StudentCard
                      key={student.id}
                      student={student}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
        </div>

        {/* ==============================================================
            4. 课时账本面板 (Hours Ledger Tab)
            ============================================================== */}
        {visitedTabs.has('hours') && (
          <div style={{ display: activeTab === 'hours' ? 'block' : 'none' }}>
            <StudentHoursTab
              students={allStudents}
              searchQuery={searchInput}
              isMobile={isMobile}
            />
          </div>
        )}

        {/* ==============================================================
            5. 消课流水面板 (Attendance Tab)
            ============================================================== */}
        {visitedTabs.has('attendance') && (
          <div style={{ display: activeTab === 'attendance' ? 'block' : 'none' }}>
            <StudentAttendanceTab
              searchQuery={searchInput}
              division={division}
              isMobile={isMobile}
            />
          </div>
        )}

        {/* ==============================================================
            6. 学费订单面板 (Fees Tab)
            ============================================================== */}
        {visitedTabs.has('fees') && (
          <div style={{ display: activeTab === 'fees' ? 'block' : 'none' }}>
            <StudentFeesTab
              searchQuery={searchInput}
              division={division}
              isMobile={isMobile}
            />
          </div>
        )}
      </div>

      {/* 弹窗组件 */}
      <StudentForm
        open={formOpen}
        onClose={handleFormClose}
        initialData={editData}
        mode={editData ? 'edit' : 'create'}
      />
      {importOpen && (
        <ImportModal
          open
          onClose={() => {
            setImportOpen(false)
            fetchStudents(true)
          }}
        />
      )}

      <BrandModal
        title="删除学员"
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        onOk={handleDeleteConfirm}
        okText="确认删除并移入回收站"
        cancelText="取消"
        okButtonProps={{ danger: true, disabled: deletePreviewLoading || !deleteImpact }}
      >
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <Text>
            确认删除 <Text strong>{deleting?.name as string}</Text>？
          </Text>
          <Card
            size="small"
            loading={deletePreviewLoading}
            className="impact-list"
            styles={{ body: { background: 'var(--color-surface-3)' } }}
          >
            {deleteImpact && (
              <Space direction="vertical" size={6}>
                <Text strong>这次删除将一并影响</Text>
                <Text>班级归属：{deleteImpact.enrollments || 0} 个</Text>
                <Text>考勤记录：{deleteImpact.attendances || 0} 条</Text>
                <Text>
                  试卷与反馈：{(deleteImpact.papers || 0) + (deleteImpact.feedbacks || 0)} 条
                </Text>
                <Text>
                  家长账号：
                  {deleteImpact.parentAccount ? '暂停登录，恢复学员时一并恢复' : '无关联账号'}
                </Text>
              </Space>
            )}
          </Card>
          <Alert
            className="modal-note"
            type="info"
            showIcon
            message="学员档案会进入回收站，30 天内可恢复；关联的班级归属会同步退出。"
          />
        </Space>
      </BrandModal>
    </PageLayout>
  )
}
