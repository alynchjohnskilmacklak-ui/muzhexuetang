'use client'
import { AdaptiveSelect } from '@/components/AdaptiveSelect';

import { useState } from 'react'
import useSWR from 'swr'
import { useParams, useRouter } from 'next/navigation'
import { Alert, Button, Card, Checkbox, Col, DatePicker, Descriptions, Empty, Form, Input, InputNumber, Modal, Progress, Radio, Row, Segmented, Skeleton, Space, Spin, Table, Tag, Typography, message } from 'antd'
import { ArrowLeftOutlined, BookOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, DisconnectOutlined, DownloadOutlined, HeartOutlined, HistoryOutlined, LinkOutlined, MessageOutlined, PlusOutlined, ReadOutlined, TeamOutlined, UserAddOutlined } from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { StudentAvatar } from '@/components/Common/StudentAvatar'
import { ImageUploader } from '@/app/(main)/performance/_components/ImageUploader'
import { formatDeducted } from '@/lib/lesson-units'
import { formatLocaleDate } from '@/lib/format-date'
import dayjs, { type Dayjs } from 'dayjs'
import dynamic from 'next/dynamic'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { StudentGrowthArchive } from '@/lib/student-growth/archive'
import type { StudentProfile } from '@/lib/student-profile'
import type { AdminReportStudent, AdminReportStageSummary } from '@/lib/student-growth/admin-report'
import { SubjectChangeModal } from '@/components/Enrollment/SubjectChangeModal'
import { BrandModal } from '@/components/Common/BrandModal'
import { StudentCommunicationTimeline } from '../_components/StudentCommunicationTimeline'

const StudentLearningRecord = dynamic(
  () => import('../../student-archive/[id]/client').then((module) => module.StudentLearningRecord),
  { ssr: false },
)

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('加载失败')
  return res.json()
}

type EnrollmentLine = {
  id: string
  remainHours?: number | null
  totalHours?: number | null
  group?: {
    name?: string | null
    lessonMinutes?: number | null
    course?: { name?: string | null; type?: string | null } | null
  } | null
}

type EnrollableGroup = {
  id: string
  name?: string | null
  course?: {
    id: string
    name?: string | null
    type?: string | null
    lessonMinutes?: number | null
    subject?: string | null
  } | null
  teacher?: { name?: string | null } | null
  room?: { name?: string | null } | null
  _count?: { enrollments?: number; classLessons?: number } | null
  classLessons?: { subject?: string | null }[] | null
  subjects?: string[]
}

type EnrollmentRow = {
  id: string
  groupId?: string
  remainHours?: number | null
  totalHours?: number | null
  subjects?: string[]
  group?: {
    name?: string | null
    intensiveMode?: string | null
    subjects?: string[]
    course?: { name?: string | null; type?: string | null } | null
  } | null
}

function distinctGroupSubjects(group: EnrollableGroup): string[] {
  const fromLessons = Array.isArray(group.classLessons)
    ? [...new Set(group.classLessons.map((lesson) => lesson.subject).filter((s): s is string => Boolean(s)))]
    : []
  if (fromLessons.length) return fromLessons
  if (group.subjects?.length) return group.subjects
  return group.course?.subject ? [group.course.subject] : []
}

type FamilyChild = {
  id: string
  name: string
  grade: string | null
  status: string
  totalHours: number
  remainHours: number
  isCurrent: boolean
  enrollments: Array<{ id: string; group: { name: string | null } | null }>
}

type FamilyCandidate = {
  id: string
  name: string
  grade: string | null
  status: string
  remainHours: number
  enrollments?: Array<{ group: { name: string | null } | null }>
}

function groupEnrollableByCourse(groups: EnrollableGroup[]) {
  const map = new Map<string, EnrollableGroup[]>()
  for (const group of groups) {
    const key = group.course?.name || '未分类'
    map.set(key, [...(map.get(key) || []), group])
  }
  return Array.from(map.entries())
}

type AttendanceDeductionRecord = {
  hoursDeducted?: number | null
  lesson?: { group?: EnrollmentLine['group'] } | null
  enrollment?: { group?: EnrollmentLine['group'] } | null
}

function attendanceDeductedText(record: AttendanceDeductionRecord) {
  const group = record.lesson?.group || record.enrollment?.group
  return formatDeducted(Number(record.hoursDeducted || 0), group?.course?.type || null, Number(group?.lessonMinutes || 40))
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const isMobile = useIsMobile() ?? false
  const { data: student, isLoading, error: studentError, mutate } = useSWR(params.id ? `/api/students/${params.id}` : null, fetcher)
  const { data: academicTermsData } = useSWR('/api/admin/academic-terms', fetcher)
  const [growthArchiveScope, setGrowthArchiveScope] = useState<'term' | 'all'>('term')
  const selectedArchiveTermId = academicTermsData?.selectedTermId as string | null | undefined
  const selectedArchiveTerm = (academicTermsData?.terms || []).find((term: { id: string }) => term.id === selectedArchiveTermId)
  const growthArchiveKey = params.id
    ? growthArchiveScope === 'all'
      ? `/api/admin/students/${params.id}/growth-archive?scope=all`
      : selectedArchiveTermId
        ? `/api/admin/students/${params.id}/growth-archive?termId=${encodeURIComponent(selectedArchiveTermId)}`
        : null
    : null
  const { data: growthArchive, isLoading: growthLoading, error: growthError } = useSWR<StudentGrowthArchive>(
    growthArchiveKey,
    fetcher,
  )
  const { data: parentAccountsData } = useSWR('/api/settings/parent-accounts', fetcher)
  const [parentModalOpen, setParentModalOpen] = useState(false)
  const [parentMode, setParentMode] = useState<'existing' | 'new'>('existing')
  const [linkingParent, setLinkingParent] = useState(false)
  const [quickPraiseOpen, setQuickPraiseOpen] = useState(false)
  const [growthFeedbackOpen, setGrowthFeedbackOpen] = useState(false)
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [quickPraise, setQuickPraise] = useState('')
  const [feedbackContent, setFeedbackContent] = useState('')
  const [feedbackMood, setFeedbackMood] = useState('GOOD')
  const [feedbackTags, setFeedbackTags] = useState<string[]>([])
  const [feedbackImages, setFeedbackImages] = useState<string[]>([])
  const [exportingFeedback, setExportingFeedback] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [exportMode, setExportMode] = useState<'full' | 'incremental'>('incremental')
  const [dateRangeType, setDateRangeType] = useState<'preset' | 'custom'>('preset')
  const [reportMonths, setReportMonths] = useState(3)
  const [customDateRange, setCustomDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [startPageNumber, setStartPageNumber] = useState(1)
  const [lastExportedDate, setLastExportedDate] = useState<string | null>(null)
  const [exportingFullReport, setExportingFullReport] = useState(false)
  const [reportProgress, setReportProgress] = useState('')

  const handleOpenReportModal = () => {
    try {
      const savedDate = window.localStorage.getItem(`muzhe_last_export_date_${student.id}`)
      if (savedDate) {
        setLastExportedDate(savedDate)
        setCustomDateRange([dayjs(savedDate), dayjs()])
        setDateRangeType('custom')
      }
      const savedPage = window.localStorage.getItem(`muzhe_last_export_page_${student.id}`)
      if (savedPage && !Number.isNaN(Number(savedPage))) {
        setStartPageNumber(Number(savedPage) + 1)
      }
    } catch {}
    setReportModalOpen(true)
  }
  const [parentForm] = Form.useForm()
  const parentAccounts = Array.isArray(parentAccountsData?.accounts) ? parentAccountsData.accounts : []
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [availableGroups, setAvailableGroups] = useState<EnrollableGroup[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<Record<string, string[]>>({})
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [editingEnrollment, setEditingEnrollment] = useState<EnrollmentRow | null>(null)
  // 同父母孩子关联模块
  const [familyModalOpen, setFamilyModalOpen] = useState(false)
const [hoursModalOpen, setHoursModalOpen] = useState(false)
const [hoursRange, setHoursRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [familySearch, setFamilySearch] = useState('')
  const [familyCandidates, setFamilyCandidates] = useState<FamilyCandidate[]>([])
  const [familyLoading, setFamilyLoading] = useState(false)
  const [selectedFamilyIds, setSelectedFamilyIds] = useState<string[]>([])
  const [linkingFamily, setLinkingFamily] = useState(false)
  const familyChildren: FamilyChild[] = Array.isArray(student?.family) ? student.family : []

  const searchFamilyCandidates = async () => {
    const keyword = familySearch.trim()
    if (!keyword) {
      message.warning('请输入学员姓名或家长电话')
      return
    }
    setFamilyLoading(true)
    try {
      const res = await fetch(`/api/students?q=${encodeURIComponent(keyword)}&limit=20`)
      const payload = await res.json()
      const list = Array.isArray(payload?.students) ? payload.students : []
      const currentIds = new Set(familyChildren.map((child) => child.id))
      setFamilyCandidates(list.filter((item: FamilyCandidate) => !currentIds.has(item.id)))
      if (!list.length) message.info('未找到匹配的学员')
    } catch {
      message.error('学员搜索失败')
    } finally {
      setFamilyLoading(false)
    }
  }

  // 上课时长查询：按日期范围过滤考勤记录并汇总扣课时
  const hoursQueryRows = Array.isArray(student?.attendances)
    ? (hoursRange
      ? student.attendances.filter((record: { createdAt?: string; hoursDeducted?: number | null }) => {
        const time = dayjs(record.createdAt)
        return time.isValid() && !time.isBefore(hoursRange[0].startOf('day')) && !time.isAfter(hoursRange[1].endOf('day'))
      })
      : [])
    : []
  const hoursQueryTotal = hoursQueryRows.reduce((total: number, record: { hoursDeducted?: number | null }) => total + Math.abs(Number(record.hoursDeducted || 0)), 0)

  const openFamilyModal = () => {
    setFamilyModalOpen(true)
    setFamilySearch('')
    setFamilyCandidates([])
    setSelectedFamilyIds([])
  }

  const linkFamilyChildren = async () => {
    if (!selectedFamilyIds.length) {
      message.warning('请先勾选要关联的学员')
      return
    }
    setLinkingFamily(true)
    try {
      const res = await fetch(`/api/admin/students/${student.id}/family`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selectedFamilyIds }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || '关联失败')
      message.success(payload.message || '关联成功')
      setFamilyModalOpen(false)
      setSelectedFamilyIds([])
      setFamilySearch('')
      setFamilyCandidates([])
      mutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '关联失败')
    } finally {
      setLinkingFamily(false)
    }
  }

  const [unlinkTarget, setUnlinkTarget] = useState<{ id: string; name: string } | null>(null)
  const [unlinking, setUnlinking] = useState(false)

  const confirmUnlink = async () => {
    if (!unlinkTarget) return
    setUnlinking(true)
    try {
      const res = await fetch(`/api/admin/students/${student.id}/family?studentId=${unlinkTarget.id}`, { method: 'DELETE' })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || '解除失败')
      message.success(payload.message || '已解除关联')
      setUnlinkTarget(null)
      mutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '解除失败')
    } finally {
      setUnlinking(false)
    }
  }


  if (isLoading) return <PageLayout title="学员详情"><div role="status" aria-live="polite" style={{ padding: 24, maxWidth: 760, margin: '0 auto' }}><Skeleton active paragraph={{ rows: 5 }} /></div></PageLayout>
  if (studentError) return <PageLayout title="学员详情"><div style={{ padding: 24, maxWidth: 760, margin: '0 auto' }}><Alert type="error" showIcon message="学员详情暂时无法加载" description="请检查网络连接后重试。" action={<Button onClick={() => void mutate()}>重新加载</Button>} /></div></PageLayout>
  if (!student) return <PageLayout title="学员详情"><Empty description="学员不存在" /></PageLayout>

  const remainHours = Number(student.remainHours || 0)
  const totalHours = Number(student.totalHours || 0)
  const prepaidUsedHours = Math.max(0, totalHours - remainHours)


  const openEditSubjects = (record: EnrollmentRow) => {
    setEditingEnrollment(record)
  }


  const openEnrollModal = async () => {
    setEnrollOpen(true)
    setGroupsLoading(true)
    setSelectedSubjects({})
    try {
      const res = await fetch('/api/class-groups?include=all')
      const groups = await res.json()
      if (!Array.isArray(groups)) throw new Error('数据格式错误')
      const enrolledGroupIds = new Set(
        (Array.isArray(student.enrollments) ? student.enrollments : []).map(
          (enrollment: { groupId?: string }) => enrollment.groupId,
        ),
      )
      setAvailableGroups(groups.filter((group: EnrollableGroup) => !enrolledGroupIds.has(group.id)))
    } catch {
      message.error('班级列表加载失败')
    } finally {
      setGroupsLoading(false)
    }
  }

  const submitEnroll = async () => {
    const entries = Object.entries(selectedSubjects).filter(([, subjectList]) => subjectList.length > 0)
    if (!entries.length) {
      message.warning('请先勾选要报的学科/班级')
      return
    }
    setEnrolling(true)
    try {
      for (const [groupId, subjectList] of entries) {
        const res = await fetch(`/api/class-groups/${groupId}/enrollments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // 累计制：课时从 0 起步，考勤按实际时长累加；subjects 限定只报这些学科
          body: JSON.stringify({ studentId: student.id, mode: 'ACCRUAL', subjects: subjectList }),
        })
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(payload.error || '报名失败')
      }
      message.success(`已为 ${student.name} 添加 ${entries.length} 个学科/班级`)
      setEnrollOpen(false)
      setSelectedSubjects({})
      mutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '报名失败')
    } finally {
      setEnrolling(false)
    }
  }

  const removeEnrollment = (enrollmentId: string, groupId: string) => {
    Modal.confirm({
      title: '移出学科/班级',
      content: '移出后该生不再参加此学科课程，已产生的历史考勤记录保留。确定移出吗？',
      okText: '确认移出',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        const res = await fetch(`/api/class-groups/${groupId}/enrollments?enrollmentId=${enrollmentId}`, { method: 'DELETE' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          message.error(data.error || '移出失败')
          return
        }
        message.success('已移出该学科')
        mutate()
      },
    })
  }

  const unlinkParent = async () => {
    Modal.confirm({
      title: '解除家长账号绑定',
      content: `确定解除 ${student.name} 与当前家长账号的绑定吗？`,
      okText: '确认解绑',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        const res = await fetch(`/api/students/${student.id}/link-parent`, { method: 'DELETE' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          message.error(data.error || '解绑失败')
          return
        }
        message.success('已解绑家长账号')
        mutate()
      },
    })
  }

  const submitParentLink = async () => {
    const values = await parentForm.validateFields()
    setLinkingParent(true)
    try {
      const res = await fetch(`/api/students/${student.id}/link-parent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: parentMode, ...values }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        message.error(data.error || '操作失败')
        return
      }
      message.success(data.message || '绑定成功')
      setParentModalOpen(false)
      parentForm.resetFields()
      mutate()
      if (data.email && data.password) {
        Modal.success({
          title: '家长账号已创建',
          content: (
            <div>
              <p>登录账号：<strong>{data.email}</strong></p>
              <p>初始密码：<strong>{data.password}</strong></p>
              <p style={{ color: '#98A2B3', fontSize: 12 }}>请告知家长，首次登录后可修改密码。</p>
            </div>
          ),
        })
      }
    } finally {
      setLinkingParent(false)
    }
  }

  const submitStudentFeedback = async (quick: boolean) => {
    const content = (quick ? quickPraise : feedbackContent).trim()
    if (!content) {
      message.error(quick ? '请填写表扬内容' : '请填写成长反馈')
      return
    }
    setSubmittingFeedback(true)
    try {
      const res = await fetch('/api/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          type: quick ? 'HIGHLIGHT' : 'DAILY',
          mood: quick ? 'GREAT' : feedbackMood,
          visibility: 'PARENT_ONLY',
          content,
          tags: quick ? ['表扬'] : feedbackTags,
          images: quick ? [] : feedbackImages,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '发送失败')
      message.success(quick ? '表扬已发送给家长' : '成长反馈已发送给家长')
      if (quick) {
        setQuickPraise('')
        setQuickPraiseOpen(false)
      } else {
        setFeedbackContent('')
        setFeedbackMood('GOOD')
        setFeedbackTags([])
        setFeedbackImages([])
        setGrowthFeedbackOpen(false)
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '发送失败，请重试')
    } finally {
      setSubmittingFeedback(false)
    }
  }

  const loadFeedbackArchive = async (params = new URLSearchParams()) => {
      const loadPage = async (page: number) => {
        const query = new URLSearchParams(params)
        query.set('page', String(page))
        query.set('pageSize', '100')
        query.set('includeLinkedRecords', '1')
        const response = await fetch(
          `/api/admin/students/${student.id}/feedback-archive?${query}`,
        )
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || '反馈档案加载失败')
        return payload
      }
      const firstPage = await loadPage(1)
      const pages = [firstPage]
      for (let page = 2; page <= firstPage.pagination.totalPages; page += 3) {
        pages.push(...await Promise.all(
          Array.from({ length: Math.min(3, firstPage.pagination.totalPages - page + 1) }, (_value, index) => loadPage(page + index)),
        ))
      }
      return {
        ...firstPage,
        items: pages.flatMap((entry) => entry.items),
      }
  }

  const saveReportBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  const exportFeedbackArchive = async () => {
    setExportingFeedback(true)
    try {
      const archive = await loadFeedbackArchive()
      const { renderParentFeedbackPdf } = await import('@/lib/classroom-feedback/parent-pdf')
      const { blob, embeddedImages, skippedImages } = await renderParentFeedbackPdf(archive)
      saveReportBlob(blob, `${student.name}_课堂反馈档案.pdf`)
      setReportModalOpen(false)
      if (skippedImages) {
        message.warning(
          `PDF已导出，已加入${embeddedImages}张课堂照片，另有${skippedImages}张读取失败`,
        )
      } else if (embeddedImages) {
        message.success(`家长版课堂反馈PDF已导出，已加入${embeddedImages}张课堂照片`)
      } else {
        message.success('家长版课堂反馈PDF已导出')
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导出失败')
    } finally {
      setExportingFeedback(false)
    }
  }

  const exportFullReport = async () => {
    setExportingFullReport(true)
    setReportProgress('正在读取学情资料…')
    try {
      let queryParams = ''
      if (dateRangeType === 'custom' && customDateRange && customDateRange[0] && customDateRange[1]) {
        const s = customDateRange[0].format('YYYY-MM-DD')
        const e = customDateRange[1].format('YYYY-MM-DD')
        queryParams = `studentId=${encodeURIComponent(student.id)}&startDate=${s}&endDate=${e}`
      } else {
        queryParams = `studentId=${encodeURIComponent(student.id)}&months=${reportMonths}`
      }

      const response = await fetch(`/api/admin/student-profile?${queryParams}`)
      const payload = await response.json().catch(() => ({})) as {
        student?: AdminReportStudent
        profile?: StudentProfile
        range?: { from: string; to: string }
        summaries?: AdminReportStageSummary[]
        error?: string
      }
      if (!response.ok || !payload.student || !payload.profile || !payload.range || !payload.summaries) {
        throw new Error(payload.error || '学情资料加载失败，请重试')
      }
      const rangeStart = dayjs(payload.range.from).format('YYYY-MM-DD')
      const rangeEnd = dayjs(payload.range.to).format('YYYY-MM-DD')
      const filter = new URLSearchParams({
        startDate: rangeStart,
        endDate: rangeEnd,
      })
      setReportProgress('正在整理课堂反馈与照片…')
      const archive = await loadFeedbackArchive(filter)
      const [{ buildAdminLearningReport }, { renderParentFeedbackPdf }] = await Promise.all([
        import('@/lib/student-growth/admin-report'),
        import('@/lib/classroom-feedback/parent-pdf'),
      ])
      const isIncremental = exportMode === 'incremental'
      const learningReport = isIncremental
        ? undefined
        : buildAdminLearningReport(
            payload.student, payload.profile, payload.range, archive.summary, payload.summaries,
          )
      const startPage = Math.max(1, startPageNumber || 1)
      const { blob, embeddedImages, skippedImages } = await renderParentFeedbackPdf(archive, {
        learningReport,
        skipCover: isIncremental,
        startPageNumber: startPage,
        reportSubtitle: `课堂学习反馈（阶段增量更新 · ${rangeStart} 至 ${rangeEnd}）`,
        onPageRendered: (_dataUrl, pageNumber) => setReportProgress(`正在生成 PDF 第 ${pageNumber} 页…`),
      })

      const filename = isIncremental
        ? `${student.name}_学情增量补充页_${rangeStart}至${rangeEnd}_第${startPage}页起.pdf`
        : `${student.name}_完整学情报告_A4_${rangeStart}至${rangeEnd}.pdf`
      saveReportBlob(blob, filename)

      // 记录本次导出的截止日期与续打页码参考
      try {
        window.localStorage.setItem(`muzhe_last_export_date_${student.id}`, rangeEnd)
      } catch {}

      setReportModalOpen(false)
      const successPrefix = isIncremental ? '学情增量补充页已导出' : '完整学情报告已导出'
      if (skippedImages > 0) {
        message.warning(`${successPrefix}（包含 ${archive.summary.totalCount} 条课堂反馈与 ${embeddedImages} 张照片，${skippedImages} 张失效照片已自动跳过）`)
      } else {
        message.success(`${successPrefix}，包含 ${archive.summary.totalCount} 条课堂反馈和 ${embeddedImages} 张课堂照片`)
      }
    } catch (error) {
      message.error({ content: error instanceof Error ? error.message : '学情报告生成失败，请重试', duration: 8 })
    } finally {
      setExportingFullReport(false)
      setReportProgress('')
    }
  }

  const studentStatusLabel: Record<string, string> = {
    ACTIVE: '在读', TRIAL: '试听', INACTIVE: '已停用', GRADUATED: '已结业',
    RESIGNED: '已离职', WAITING: '待开班', ARCHIVED: '已归档',
  }

  return (
    <PageLayout
      title={student.name}
      subtitle={`${student.grade || '未设年级'} · ${student.school || '学校待补充'} · ${studentStatusLabel[student.status || ''] || student.status || '-'}`}
      actions={<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button type="primary" shape="round" icon={<DownloadOutlined />} onClick={handleOpenReportModal} style={{ background: '#0E5E4E', borderColor: '#0E5E4E', boxShadow: '0 3px 10px rgba(14,94,78,.25)' }}>导出学情报告</Button>
        <Button shape="round" icon={<HistoryOutlined />} onClick={() => router.push(`/students/${student.id}/feedback-archive`)}>课堂反馈档案</Button>
        <Button shape="round" icon={<HeartOutlined />} style={{ background: '#1D9E75', borderColor: '#1D9E75', color: '#ffffff' }} onClick={() => setQuickPraiseOpen(true)}>快速表扬</Button>
        <Button shape="round" icon={<MessageOutlined />} style={{ background: '#534AB7', borderColor: '#534AB7', color: '#ffffff' }} onClick={() => setGrowthFeedbackOpen(true)}>成长反馈</Button>
        <Button className="mobile-shell-back" shape="round" icon={<ArrowLeftOutlined />} onClick={() => router.push('/students')}>返回学员管理</Button>
      </div>}
    >
      <section id="learning" style={{ scrollMarginTop: 90 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
          <div>
            <Typography.Text strong>学员成长档案</Typography.Text>
            {growthArchiveScope === 'term' && selectedArchiveTerm && (
              <Tag style={{ marginLeft: 8 }}>{selectedArchiveTerm.name}</Tag>
            )}
          </div>
          <Segmented
            value={growthArchiveScope}
            onChange={(value) => setGrowthArchiveScope(value as 'term' | 'all')}
            options={[
              { label: '当前批次', value: 'term' },
              { label: '全部历史', value: 'all' },
            ]}
          />
        </div>
        {growthArchiveScope === 'term' && !selectedArchiveTermId ? (
          <Card bordered={false} style={{ marginBottom: 16, border: '1px solid var(--color-hairline)', borderRadius: 14 }}>
            <Empty description="当前没有可查看的运营批次" />
          </Card>
        ) : (
          <StudentGrowthArchivePanel
            archive={growthArchive}
            loading={growthLoading}
            error={growthError as Error | undefined}
            isMobile={isMobile}
            onViewAllFeedback={() => router.push(`/students/${student.id}/feedback-archive`)}
          />
        )}
        <StudentLearningRecord studentId={student.id} />
      </section>

      <Card bordered={false} style={{ borderRadius: 14, marginBottom: 16, background: '#ffffff', border: '1px solid #EDE9E1', boxShadow: '0 2px 8px rgba(23,47,41,.05)' }}>
        <Descriptions column={isMobile ? 1 : 2} size="small" labelStyle={{ color: '#98A2B3' }} contentStyle={{ color: '#1F2329' }}>
          <Descriptions.Item label="姓名">{student.name}</Descriptions.Item>
          <Descriptions.Item label="状态"><span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 999, background: student.status === 'ACTIVE' ? 'rgba(29,158,117,.12)' : 'rgba(152,162,179,.15)', color: student.status === 'ACTIVE' ? '#1D9E75' : '#667085', fontSize: 12, fontWeight: 700 }}>{studentStatusLabel[student.status || ''] || student.status || '-'}</span></Descriptions.Item>
          <Descriptions.Item label="电话">{student.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="家长账号" span={isMobile ? 1 : 2}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', width: '100%' }}>
              {student.parent ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: '100%', padding: '3px 10px', borderRadius: 999, background: 'rgba(29,158,117,.1)', color: '#1D9E75', fontSize: 12, fontWeight: 600 }}>
                  <LinkOutlined /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.parent.name || '家长'}（{student.parent.email}）</span>
                </span>
              ) : (
                <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(232,120,74,.1)', color: '#C2541F', fontSize: 12, fontWeight: 600 }}>未绑定家长账号</span>
              )}
              <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {student.parent && (
                  <Button size="small" danger icon={<DisconnectOutlined />} onClick={unlinkParent}>解绑</Button>
                )}
                <Button
                  size="small"
                  icon={<UserAddOutlined />}
                  onClick={() => {
                    setParentMode('existing')
                    setParentModalOpen(true)
                    parentForm.resetFields()
                  }}
                >
                  {student.parent ? '更换/合并家长账号' : '绑定家长账号'}
                </Button>
              </span>
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="家长电话">{student.parentPhone || '-'}</Descriptions.Item>
          <Descriptions.Item label="主教老师">{student.mainTeacher?.name || '-'}</Descriptions.Item>
        </Descriptions>
        <div style={{ marginTop: 18 }}>
          <div style={{ color: '#98A2B3', marginBottom: 6 }}>课时进度</div>
          <Progress percent={totalHours ? Math.round((prepaidUsedHours / totalHours) * 100) : 0} strokeColor={{ '0%': '#C9A45C', '100%': '#0E5E4E' }} />
        </div>
      </Card>

      {/* 家校沟通与回访台账 Timeline */}
      <StudentCommunicationTimeline
        studentId={student.id}
        studentName={student.name}
        isMobile={isMobile}
      />

      {/* 同父母孩子 · 家庭账号关联模块 */}
      <Card
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <TeamOutlined /> 同父母孩子
            <span style={{ color: '#98A2B3', fontSize: 12, fontWeight: 400 }}>家长登录后可切换查看各孩子档案</span>
          </span>
        }
        extra={
          student.parent ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, maxWidth: isMobile ? 170 : 280, padding: '3px 10px', borderRadius: 999, background: 'rgba(29,158,117,.1)', color: '#1D9E75', fontSize: 12, fontWeight: 600 }}>
                <LinkOutlined /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.parent.name || '家长'}（{student.parent.email}）</span>
              </span>
              <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openFamilyModal} style={{ background: 'linear-gradient(135deg,#0E5E4E,#0B4B40)', borderColor: '#0E5E4E', boxShadow: '0 2px 8px rgba(14,94,78,.2)' }}>
                关联其他孩子
              </Button>
            </div>
          ) : undefined
        }
        bordered={false}
        style={{ borderRadius: 14, marginBottom: 16, background: '#ffffff', border: '1px solid #EDE9E1', boxShadow: '0 2px 8px rgba(23,47,41,.05)' }}
      >
        {!student.parent ? (
          <Empty
            description="当前学员尚未绑定家长账号。先点击上方「绑定家长账号」，即可把同父母的兄弟姐妹关联到同一个家长账号下"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : familyChildren.length ? (
          <Table<FamilyChild>
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ x: isMobile ? 320 : undefined }}
            dataSource={familyChildren}
            columns={[
              {
                title: '学员',
                render: (_: unknown, record: FamilyChild) => (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, color: '#17352F' }}>{record.name}</span>
                    {record.isCurrent && <span style={{ padding: '1px 7px', borderRadius: 999, background: 'rgba(201,164,92,.16)', color: '#8A6B2F', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' }}>当前学员</span>}
                  </span>
                ),
              },
              ...(isMobile ? [] : [
                { title: '年级', key: 'grade', render: (_: unknown, record: FamilyChild) => record.grade || '-' },
                {
                  title: '班级', key: 'className', render: (_: unknown, record: FamilyChild) => record.enrollments?.[0]?.group?.name || '-',
                },
                { title: '累计课时', key: 'total', render: (_: unknown, record: FamilyChild) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{Number(record.totalHours || 0).toFixed(2)}h</span> },
                { title: '剩余课时', key: 'remain', render: (_: unknown, record: FamilyChild) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{Number(record.remainHours || 0).toFixed(2)}h</span> },
              ]),
              {
                title: '状态',
                render: (_: unknown, record: FamilyChild) => {
                  const map: Record<string, string> = { ACTIVE: '在读', TRIAL: '试听', INACTIVE: '已停用', STUDYING: '学习中', GRADUATED: '已结业' }
                  const label = map[record.status] || record.status
                  const ok = record.status === 'ACTIVE' || record.status === 'STUDYING'
                  return <span style={{ padding: '1px 8px', borderRadius: 999, background: ok ? 'rgba(29,158,117,.1)' : 'rgba(152,162,179,.15)', color: ok ? '#1D9E75' : '#667085', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</span>
                },
              },
              {
                title: '操作',
                render: (_: unknown, record: FamilyChild) => (
                  <span style={{ display: 'inline-flex', gap: 4, whiteSpace: 'nowrap' }}>
                    <Button size="small" type="link" onClick={() => router.push(`/students/${record.id}`)}>查看档案</Button>
                    {!record.isCurrent && (
                      <Button size="small" type="link" danger onClick={() => setUnlinkTarget({ id: record.id, name: record.name })}>解除关联</Button>
                    )}
                  </span>
                ),
              },
            ]}
          />
        ) : (
          <Empty
            description="该家长账号下暂无其他孩子，可点击右上角「关联其他孩子」把同父母的兄弟姐妹关联进来"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openFamilyModal} style={{ background: 'linear-gradient(135deg,#0E5E4E,#0B4B40)', borderColor: '#0E5E4E' }}>
              关联其他孩子
            </Button>
          </Empty>
        )}
        <div style={{ marginTop: 12, color: '#98A2B3', fontSize: 12, lineHeight: 1.7 }}>
          说明：关联后，家长使用同一账号登录，在家长端顶部可切换查看每个孩子的课时、考勤与课堂反馈。解除关联不会删除任何学员数据。
        </div>
      </Card>

      <Card
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TeamOutlined /> 已报学科/班级
            <span style={{ color: '#98A2B3', fontSize: 12, fontWeight: 400 }}>学员可以只报部分学科，不必上全天所有课</span>
          </span>
        }
        extra={
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openEnrollModal} style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>
            添加学科
          </Button>
        }
        bordered={false}
        style={{ borderRadius: 8, marginBottom: 16, background: '#ffffff', border: '1px solid #EEE7E1' }}
      >
        {Array.isArray(student.enrollments) && student.enrollments.length ? (
          <Table<EnrollmentRow>
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={student.enrollments as EnrollmentRow[]}
            columns={[
              {
                title: '学科/课程',
                render: (_: unknown, record: EnrollmentRow) =>
                  record.subjects?.length
                    ? <>{record.subjects.map((subject) => <Tag key={subject} style={{ marginInlineEnd: 4 }}>{subject}</Tag>)}</>
                    : (record.group?.course?.name || '-'),
              },
              {
                title: '班级',
                render: (_: unknown, record: EnrollmentRow) => record.group?.name || '-',
              },
              {
                title: '班型',
                render: (_: unknown, record: EnrollmentRow) => (
                  <Tag>{record.group?.intensiveMode === 'INTENSIVE' ? '集训' : record.group?.course?.type || '-'}</Tag>
                ),
              },
              {
                title: '课时',
                render: (_: unknown, record: EnrollmentRow) =>
                  record.group?.intensiveMode === 'INTENSIVE'
                    ? '累计计费'
                    : `余 ${Number(record.remainHours || 0)} / ${Number(record.totalHours || 0)} 时`,
              },
              {
                title: '操作',
                render: (_: unknown, record: EnrollmentRow) => (
                  <Space>
                    <Button size="small" onClick={() => openEditSubjects(record)}>修改学科</Button>
                    <Button size="small" danger onClick={() => removeEnrollment(record.id, record.groupId || '')}>
                      移出
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        ) : (
          <Empty description="暂未报名任何学科" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button type="primary" onClick={openEnrollModal} style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>
              添加首个学科
            </Button>
          </Empty>
        )}
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
          title="考勤记录"
          extra={(
            <Button size="small" icon={<ClockCircleOutlined />} onClick={() => setHoursModalOpen(true)}>
              查询上课时长
            </Button>
          )}
          bordered={false}
          style={{ borderRadius: 14, background: '#ffffff', border: '1px solid #EDE9E1', boxShadow: '0 2px 8px rgba(23,47,41,.05)' }}
        >
            <Table
              rowKey="id"
              size="small"
              pagination={{ pageSize: 8 }}
              dataSource={student.attendances || []}
              columns={[
                {
                  title: '状态',
                  dataIndex: 'status',
                  render: (value: string) => {
                    const ok = value === 'PRESENT' || value === 'MAKEUP'
                    return <span style={{ padding: '2px 10px', borderRadius: 999, background: ok ? 'rgba(29,158,117,.12)' : value === 'LEAVE' ? 'rgba(201,164,92,.14)' : 'rgba(232,120,74,.12)', color: ok ? '#1D9E75' : value === 'LEAVE' ? '#8A6B2F' : '#C2541F', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{attendanceLabel(value)}</span>
                  },
                },
                { title: '扣课时', key: 'hoursDeducted', render: (_: unknown, record: AttendanceDeductionRecord) => attendanceDeductedText(record) },
                { title: '日期', dataIndex: 'createdAt', render: (value: string) => new Date(value).toLocaleDateString('zh-CN') },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="缴费记录" bordered={false} style={{ borderRadius: 14, background: '#ffffff', border: '1px solid #EDE9E1', boxShadow: '0 2px 8px rgba(23,47,41,.05)' }}>
            <Table
              rowKey="id"
              size="small"
              pagination={{ pageSize: 8 }}
              dataSource={student.fees || []}
              columns={[
                { title: '类型', dataIndex: 'type' },
                { title: '金额', dataIndex: 'amount' },
                {
                  title: '状态',
                  dataIndex: 'status',
                  render: (value: string) => {
                    const map: Record<string, { label: string; ok: boolean }> = { PAID: { label: '已缴费', ok: true }, PENDING: { label: '待缴费', ok: false }, REFUNDED: { label: '已退款', ok: false }, PARTIAL: { label: '部分缴费', ok: false } }
                    const item = map[value] || { label: value, ok: false }
                    return <span style={{ padding: '2px 10px', borderRadius: 999, background: item.ok ? 'rgba(29,158,117,.12)' : 'rgba(152,162,179,.15)', color: item.ok ? '#1D9E75' : '#667085', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{item.label}</span>
                  },
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <BrandModal
        title={`快速表扬 · ${student.name}`}
        open={quickPraiseOpen}
        onCancel={() => setQuickPraiseOpen(false)}
        onOk={() => submitStudentFeedback(true)}
        confirmLoading={submittingFeedback}
        okText="发送表扬"
        cancelText="取消"
        okButtonProps={{ style: { background: '#1D9E75', borderColor: '#1D9E75' } }}
      >
        <Input.TextArea value={quickPraise} onChange={event => setQuickPraise(event.target.value)} maxLength={300} showCount rows={4} placeholder="如：今天主动帮同学讲题，很棒！" />
      </BrandModal>

      <BrandModal
        title={`导出给家长的报告 · ${student.name}`}
        open={reportModalOpen}
        onCancel={() => { if (!exportingFullReport && !exportingFeedback) setReportModalOpen(false) }}
        confirmLoading={exportingFullReport || exportingFeedback}
        width={isMobile ? 'calc(100vw - 24px)' : 560}
        footer={<Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={() => setReportModalOpen(false)} disabled={exportingFullReport || exportingFeedback}>取消</Button>
          <Button loading={exportingFeedback} disabled={exportingFullReport} onClick={exportFeedbackArchive}>仅课堂反馈 PDF</Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            loading={exportingFullReport}
            disabled={exportingFeedback}
            onClick={exportFullReport}
            style={{ background: '#0E5E4E', borderColor: '#0E5E4E' }}
          >
            {exportMode === 'incremental' ? '下载增量续打 PDF' : '下载 A4 完整学情报告'}
          </Button>
        </Space>}
      >
        {/* 1. 导出模式选择 */}
        <div style={{ marginBottom: 16, padding: '12px 14px', background: '#F8F6F1', borderRadius: 10, border: '1px solid #E8E2D6' }}>
          <div style={{ marginBottom: 8, color: '#1A332B', fontWeight: 700, fontSize: 13 }}>导出模式</div>
          <Radio.Group
            value={exportMode}
            onChange={(e) => setExportMode(e.target.value)}
            style={{ width: '100%', display: 'flex', gap: 12 }}
          >
            <Radio
              value="incremental"
              style={{
                flex: 1,
                padding: '8px 10px',
                background: exportMode === 'incremental' ? '#FAF4EA' : '#ffffff',
                border: exportMode === 'incremental' ? '1.5px solid #C9A45C' : '1px solid #D9D9D9',
                borderRadius: 8,
                marginRight: 0,
              }}
            >
              <div style={{ fontWeight: 600, color: '#17352F' }}>增量补充续打</div>
              <div style={{ fontSize: 11, color: '#738079', marginTop: 2 }}>免封面，只打印新内容，页码顺延</div>
            </Radio>
            <Radio
              value="full"
              style={{
                flex: 1,
                padding: '8px 10px',
                background: exportMode === 'full' ? '#FAF4EA' : '#ffffff',
                border: exportMode === 'full' ? '1.5px solid #0E5E4E' : '1px solid #D9D9D9',
                borderRadius: 8,
                marginRight: 0,
              }}
            >
              <div style={{ fontWeight: 600, color: '#17352F' }}>A4 完整报告</div>
              <div style={{ fontSize: 11, color: '#738079', marginTop: 2 }}>含诊断封面、总览数据与全部明细</div>
            </Radio>
          </Radio.Group>
        </div>

        {/* 2. 时间范围选择 */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: 'var(--color-ink)', fontWeight: 600, fontSize: 13 }}>报告时间范围</span>
            <Radio.Group
              size="small"
              value={dateRangeType}
              onChange={(e) => setDateRangeType(e.target.value)}
            >
              <Radio.Button value="preset">按周期</Radio.Button>
              <Radio.Button value="custom">自定义日期</Radio.Button>
            </Radio.Group>
          </div>

          {dateRangeType === 'preset' ? (
            <AdaptiveSelect
              value={reportMonths}
              onChange={setReportMonths}
              style={{ width: '100%' }}
              options={[1, 3, 6, 12, 24].map((months) => ({ value: months, label: `近 ${months} 个月` }))}
              getPopupContainer={(trigger) => trigger.parentElement || document.body}
              virtual={false}
            />
          ) : (
            <DatePicker.RangePicker
              value={customDateRange}
              onChange={(dates) => setCustomDateRange(dates as [Dayjs, Dayjs] | null)}
              style={{ width: '100%' }}
              allowClear={false}
              placeholder={['起始日期', '截止日期']}
            />
          )}

          {lastExportedDate && (
            <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(201,164,92,0.12)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#8A6B2F' }}>
                💡 上次导出截止至：<strong>{lastExportedDate}</strong>
              </span>
              <Button
                type="link"
                size="small"
                style={{ padding: 0, height: 'auto', fontSize: 12, color: '#0E5E4E', fontWeight: 600 }}
                onClick={() => {
                  setDateRangeType('custom')
                  setCustomDateRange([dayjs(lastExportedDate), dayjs()])
                  setExportMode('incremental')
                }}
              >
                自上次导出至今
              </Button>
            </div>
          )}
        </div>

        {/* 3. 活页续打设置 */}
        {exportMode === 'incremental' && (
          <div style={{ marginBottom: 14, padding: '10px 12px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #EAECF0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#344054' }}>起始页码编号</div>
                <div style={{ fontSize: 11, color: '#667085', marginTop: 1 }}>顺接已打印档案的最后一页（如之前打到第5页，此处填6）</div>
              </div>
              <InputNumber
                min={1}
                max={999}
                value={startPageNumber}
                onChange={(val) => setStartPageNumber(val || 1)}
                style={{ width: 100 }}
                addonBefore="第"
                addonAfter="页"
              />
            </div>
          </div>
        )}

        {/* 说明提示 */}
        <p style={{ marginTop: 10, color: 'var(--color-ink-subtle)', fontSize: 12, lineHeight: 1.6 }}>
          {exportMode === 'incremental'
            ? '增量续打模式将跳过封面诊断大卡片，只输出选定时间段内的新增课堂反馈，页码按设定连续编号，便于活页夹装订。'
            : '完整报告包含封面学情档案、考勤与课时概况、阶段诊断评定，以及所选期间全部已发布的课堂反馈。'}
        </p>
        {reportProgress && <p role="status" aria-live="polite" style={{ color: 'var(--color-primary)', fontSize: 13, fontWeight: 600 }}>{reportProgress}</p>}
      </BrandModal>

      <BrandModal
        title={`查询上课时长 · ${student.name}`}
        open={hoursModalOpen}
        onCancel={() => setHoursModalOpen(false)}
        footer={null}
        width={640}
      >
        <div style={{ marginBottom: 14 }}>
          <div style={{ marginBottom: 6, color: '#667085', fontSize: 13 }}>选择日期范围，统计该时间段的上课时长（按考勤扣课时统计）</div>
          <DatePicker.RangePicker
            value={hoursRange}
            onChange={(value) => setHoursRange(value as [Dayjs, Dayjs] | null)}
            style={{ width: '100%' }}
            allowClear
            placeholder={['开始日期', '结束日期']}
          />
        </div>
        {hoursRange ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '12px 14px', borderRadius: 10, background: '#FFF4EE', marginBottom: 12 }}>
              <span style={{ color: '#667085', fontSize: 13 }}>该时间段上课时长</span>
              <strong style={{ color: '#C2541F', fontSize: 24, fontVariantNumeric: 'tabular-nums' }}>{hoursQueryTotal.toFixed(2)} 小时</strong>
              <span style={{ color: '#98A2B3', fontSize: 12 }}>共 {hoursQueryRows.length} 次考勤</span>
            </div>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={hoursQueryRows}
              columns={[
                { title: '日期', dataIndex: 'createdAt', render: (value: string) => dayjs(value).format('YYYY-MM-DD') },
                { title: '状态', dataIndex: 'status' },
                { title: '上课时长', key: 'hours', render: (_: unknown, record: AttendanceDeductionRecord) => `${Math.abs(Number(record.hoursDeducted || 0)).toFixed(2)} 小时` },
              ]}
            />
          </>
        ) : (
          <div style={{ color: '#98A2B3', padding: '28px 0', textAlign: 'center', fontSize: 13 }}>
            选择日期范围后，可查询该时间段内孩子实际上课的小时数
          </div>
        )}
      </BrandModal>

      <BrandModal
        title={`成长反馈 · ${student.name}`}
        open={growthFeedbackOpen}
        onCancel={() => setGrowthFeedbackOpen(false)}
        onOk={() => submitStudentFeedback(false)}
        confirmLoading={submittingFeedback}
        okText="发送反馈"
        cancelText="取消"
        width={640}
        okButtonProps={{ style: { background: '#534AB7', borderColor: '#534AB7' } }}
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <div><div style={{ marginBottom: 6 }}>反馈内容</div><Input.TextArea value={feedbackContent} onChange={event => setFeedbackContent(event.target.value)} maxLength={300} showCount rows={5} placeholder="记录孩子今天的课堂表现与成长变化" /></div>
          <div><div style={{ marginBottom: 6 }}>课堂状态</div><Radio.Group value={feedbackMood} onChange={event => setFeedbackMood(event.target.value)} optionType="button" buttonStyle="solid" options={[{ label: '很棒', value: 'GREAT' }, { label: '良好', value: 'GOOD' }, { label: '一般', value: 'OKAY' }, { label: '需关注', value: 'NEEDS_ATTENTION' }]} /></div>
          <div><div style={{ marginBottom: 6 }}>表现标签</div><AdaptiveSelect mode="tags" value={feedbackTags} onChange={setFeedbackTags} maxCount={20} maxTagCount="responsive" tokenSeparators={[',', '，', '、']} placeholder="输入标签后回车，如：主动提问" style={{ width: '100%' }} /></div>
          <div><div style={{ marginBottom: 6 }}>课堂图片（可选）</div><ImageUploader value={feedbackImages} onChange={setFeedbackImages} /></div>
        </div>
      </BrandModal>

      <BrandModal
        title={student.parent ? '更换或合并家长账号' : '绑定家长账号'}
        open={parentModalOpen}
        onCancel={() => setParentModalOpen(false)}
        onOk={submitParentLink}
        confirmLoading={linkingParent}
        okText="确认绑定"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16 }}>
          <Radio.Group
            value={parentMode}
            onChange={(event) => {
              setParentMode(event.target.value)
              parentForm.resetFields()
            }}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="existing">绑定已有家长账号</Radio.Button>
            <Radio.Button value="new">新建家长账号</Radio.Button>
          </Radio.Group>
        </div>
        <Form form={parentForm} layout="vertical">
          {parentMode === 'existing' ? (
            <Form.Item name="existingParentUserId" label="选择家长账号" rules={[{ required: true, message: '请选择家长账号' }]}>
              <AdaptiveSelect
                showSearch
                placeholder="搜索家长姓名或邮箱"
                filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())}
                options={parentAccounts.map((parent: Record<string, unknown>) => {
                  const kids = Array.isArray(parent.students) ? parent.students as Record<string, unknown>[] : []
                  const kidNames = kids.map((kid) => kid.name).filter(Boolean).join('、') || '暂无'
                  return {
                    label: `${parent.name || '家长'}（${parent.email}） · 名下：${kidNames}`,
                    value: parent.id as string,
                  }
                })}
              />
            </Form.Item>
          ) : (
            <>
              <Form.Item name="email" label="登录邮箱" rules={[{ required: true, message: '请输入邮箱' }]}>
                <Input placeholder="例如：parent@example.com" />
              </Form.Item>
              <Form.Item name="name" label="家长姓名">
                <Input placeholder={`默认：${student.parentName || `${student.name}家长`}`} />
              </Form.Item>
              <Form.Item name="password" label="初始密码">
                <Input placeholder={`留空默认使用 ${student.name} 的姓名拼音`} />
              </Form.Item>
            </>
          )}
        </Form>
        {parentMode === 'existing' && (
          <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 8, background: '#f5f2ee', padding: '8px 12px', borderRadius: 6 }}>
            选择已有家长账号后，这个孩子会直接出现在该家长端的孩子列表中。
          </div>
        )}
      </BrandModal>

      {/* 关联其他孩子弹窗 */}
      <BrandModal
        title={`关联其他孩子到当前家长账号（${student.parent?.name || '家长'} · ${student.parent?.email || ''}）`}
        open={familyModalOpen}
        onCancel={() => setFamilyModalOpen(false)}
        footer={null}
        width={640}
      >
        <div style={{ marginBottom: 12 }}>
          <Input.Search
            placeholder="输入学员姓名或家长电话搜索，如：马子墨"
            value={familySearch}
            onChange={(event) => setFamilySearch(event.target.value)}
            onSearch={searchFamilyCandidates}
            loading={familyLoading}
            enterButton="搜索"
            allowClear
          />
        </div>
        {familyCandidates.length ? (
          <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #EEE7E1', borderRadius: 8 }}>
            {familyCandidates.map((candidate) => {
              const checked = selectedFamilyIds.includes(candidate.id)
              return (
                <div
                  key={candidate.id}
                  onClick={() => setSelectedFamilyIds((prev) => (checked ? prev.filter((itemId) => itemId !== candidate.id) : [...prev, candidate.id]))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer',
                    borderBottom: '1px solid #F5F2EE', background: checked ? '#FDF8F7' : undefined,
                  }}
                >
                  <Checkbox checked={checked} />
                  <span style={{ fontWeight: 600 }}>{candidate.name}</span>
                  <Tag>{candidate.grade || '未设年级'}</Tag>
                  <Tag color={candidate.status === 'ACTIVE' ? 'green' : 'default'}>{candidate.status}</Tag>
                  <span style={{ marginLeft: 'auto', color: '#98A2B3', fontSize: 12 }}>
                    剩余 {Number(candidate.remainHours || 0).toFixed(2)}h
                  </span>
                </div>
              )
            })}
          </div>
        ) : familySearch ? (
          <Empty description="未找到匹配的学员" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Empty description="输入学员姓名或家长电话，搜索要关联的孩子" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
        <div style={{ marginTop: 12, fontSize: 12, color: '#98A2B3', lineHeight: 1.7 }}>
          关联后，所选学员将出现在当前家长账号下；若学员原本绑定其他家长账号，将转移到当前账号（原账号解绑，数据不受影响）。
        </div>
        <div style={{ marginTop: 12, textAlign: 'right' }}>
          <Space>
            <Button onClick={() => setFamilyModalOpen(false)}>取消</Button>
            <Button type="primary" loading={linkingFamily} onClick={linkFamilyChildren} style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>
              确认关联{selectedFamilyIds.length ? `（${selectedFamilyIds.length} 人）` : ''}
            </Button>
          </Space>
        </div>
      </BrandModal>

      {/* 解除关联确认弹窗（受控，避免静态 Modal.confirm 在部分环境不弹） */}
      <BrandModal
        title="解除关联"
        open={Boolean(unlinkTarget)}
        onCancel={() => setUnlinkTarget(null)}
        okText="确认解除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        confirmLoading={unlinking}
        onOk={confirmUnlink}
      >
        <p style={{ color: '#4B5563', margin: 0 }}>
          确定将 <b>{unlinkTarget?.name}</b> 从当前家长账号下移除吗？移除后家长端将看不到该孩子（学员数据不受影响，可重新关联）。
        </p>
      </BrandModal>

      <BrandModal
        title={`为 ${student.name} 添加学科/班级`}
        open={enrollOpen}
        onCancel={() => setEnrollOpen(false)}
        onOk={submitEnroll}
        confirmLoading={enrolling}
        okText="确认报名"
        cancelText="取消"
      >
        <div style={{ color: '#98A2B3', fontSize: 12, marginBottom: 10 }}>
          累计制：报名后课时从 0 起步，每次上课按实际时长自动累加，不需要预购课时包。可只勾选该生实际报名的学科。
        </div>
        {groupsLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : availableGroups.length ? (
          <div style={{ maxHeight: 420, overflow: 'auto' }}>
            {groupEnrollableByCourse(availableGroups).map(([courseName, groups]) => (
              <div key={courseName} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{courseName}</div>
                {groups.map((group) => {
                  const subjects = distinctGroupSubjects(group)
                  const checked = selectedSubjects[group.id] || []
                  const toggleSubject = (subject: string, on: boolean) => {
                    setSelectedSubjects((prev) => {
                      const current = prev[group.id] || []
                      const next = on ? [...new Set([...current, subject])] : current.filter((s) => s !== subject)
                      return { ...prev, [group.id]: next }
                    })
                  }
                  const toggleAll = (on: boolean) => {
                    setSelectedSubjects((prev) => ({ ...prev, [group.id]: on ? subjects : [] }))
                  }
                  return (
                    <div key={group.id} style={{ border: '1px solid #EEE7E1', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                        <span style={{ fontWeight: 500 }}>{group.name}</span>
                        <span style={{ color: '#98A2B3', fontSize: 12 }}>
                          {group.teacher?.name || ''}{group.room?.name ? ` · ${group.room.name}` : ''} · {group._count?.enrollments ?? 0}人
                        </span>
                      </div>
                      <div style={{ marginTop: 6 }}>
                        {subjects.length ? (
                          <>
                            {subjects.map((subject) => (
                              <Checkbox
                                key={subject}
                                checked={checked.includes(subject)}
                                onChange={(event) => toggleSubject(subject, event.target.checked)}
                                style={{ marginInlineEnd: 12, fontSize: 13 }}
                              >
                                {subject}
                              </Checkbox>
                            ))}
                            <button
                              type="button"
                              style={{ marginLeft: 4, padding: '4px 6px', border: 0, background: 'transparent', color: 'var(--color-primary)', font: 'inherit', fontSize: 12, cursor: 'pointer' }}
                              onClick={() => toggleAll(checked.length !== subjects.length)}
                            >
                              {checked.length === subjects.length ? '取消全选' : '全选'}
                            </button>
                          </>
                        ) : (
                          <div style={{ color: '#98A2B3', fontSize: 12 }}>该班暂无已排课次，报名后默认全学科</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        ) : (
          <Empty description="当前运营期没有可添加的班级" />
        )}
      </BrandModal>
      {editingEnrollment?.groupId && (
        <SubjectChangeModal
          key={editingEnrollment.id}
          groupId={editingEnrollment.groupId}
          groupName={editingEnrollment.group?.name || ''}
          studentId={student.id}
          studentName={student.name}
          initialSubjects={editingEnrollment.subjects || []}
          availableSubjects={editingEnrollment.group?.subjects || []}
          onClose={() => setEditingEnrollment(null)}
          onSaved={() => mutate()}
        />
      )}
    </PageLayout>
  )
}

function attendanceLabel(status: string) {
  return ({ PRESENT: '出勤', LEAVE: '请假', ABSENT: '缺勤', MAKEUP: '补课' } as Record<string, string>)[status] || status
}

function StudentGrowthArchivePanel({
  archive,
  loading,
  error,
  isMobile,
  onViewAllFeedback,
}: {
  archive?: StudentGrowthArchive
  loading: boolean
  error?: Error
  isMobile: boolean
  onViewAllFeedback: () => void
}) {
  if (loading) {
    return <Card bordered={false} style={{ marginBottom: 16, border: '1px solid var(--color-hairline)', borderRadius: 14 }}><div style={{ display: 'grid', placeItems: 'center', minHeight: 220 }}><Spin size="large" /></div></Card>
  }
  if (error || !archive) {
    return <Card bordered={false} style={{ marginBottom: 16, border: '1px solid var(--color-hairline)', borderRadius: 14 }}><Empty description={error?.message || '成长档案暂时无法加载'} /></Card>
  }

  const totalUsedHours = Number(archive.overview.usedHours || 0) + Number(archive.overview.approvedIntensiveHours || 0)
  const attendanceRate = archive.attendance.summary.rate ?? 0
  const rateColor = attendanceRate >= 90 ? '#1D9E75' : attendanceRate >= 75 ? '#C9A45C' : '#C0392B'

  const overviewItems = [
    { label: '累计反馈', value: `${archive.overview.feedbackCount} 次`, icon: <MessageOutlined />, accent: '#4E7FC7' },
    { label: '累计上课', value: `${totalUsedHours} 小时`, icon: <BookOutlined />, accent: '#1D9E75' },
    { label: '剩余课时', value: `${archive.overview.remainingHours} 小时`, icon: <CheckCircleOutlined />, accent: '#C9A45C' },
    { label: '最近反馈', value: formatLocaleDate(archive.overview.latestFeedbackDate), icon: <CalendarOutlined />, accent: '#E8784A' },
  ]

  const feedbackList = archive.feedback.items || []

  return (
    <section style={{ marginBottom: 24, maxWidth: '100%', overflow: 'hidden' }}>
      {/* Hero 卡 */}
      <Card bordered={false} style={{ marginBottom: 12, borderRadius: 16, border: '1px solid rgba(201,164,92,.4)', background: 'linear-gradient(135deg,#123C35 0%,#0E5E4E 55%,#0B4B40 100%)', overflow: 'hidden', boxShadow: '0 8px 24px rgba(14,94,78,.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ border: '2px solid rgba(201,164,92,.7)', borderRadius: '50%', padding: 2 }}>
              <StudentAvatar name={archive.student.name} size={isMobile ? 48 : 60} />
            </div>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: '#F7F3E8', fontSize: isMobile ? 19 : 23, fontWeight: 800, letterSpacing: .3 }}>{archive.student.name}</div>
            <div style={{ color: 'rgba(242,227,182,.75)', marginTop: 3, fontSize: 12.5 }}>
              {archive.student.grade || '未设置年级'} · {archive.student.className || '未加入班级'}
            </div>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999,
            background: 'rgba(201,164,92,.18)', border: '1px solid rgba(201,164,92,.55)', color: '#F2E3B6',
            fontSize: 12, fontWeight: 700, marginLeft: isMobile ? 0 : 'auto',
          }}>
            <TeamOutlined /> {archive.attendance.summary.total} 条考勤记录
          </span>
        </div>
      </Card>

      {/* 核心统计卡 */}
      <Row gutter={[10, 10]} style={{ marginBottom: 12 }}>
        {overviewItems.map((item) => (
          <Col xs={12} lg={6} key={item.label}>
            <Card bordered={false} style={{ height: '100%', borderRadius: 14, border: '1px solid #EDE9E1', background: '#fff', boxShadow: '0 2px 8px rgba(23,47,41,.05)' }} styles={{ body: { padding: isMobile ? 12 : 14 } }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${item.accent}18`, color: item.accent, fontSize: 16 }}>{item.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#98A2B3', fontSize: 11.5 }}>{item.label}</div>
                  <div style={{ color: '#17352F', fontSize: isMobile ? 16 : 19, fontWeight: 800, marginTop: 1, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{item.value}</div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 课堂反馈：卡片列表 */}
      <Card
        title={<span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}><MessageOutlined style={{ color: '#0E5E4E' }} /> 课堂反馈</span>}
        extra={<Button type="link" onClick={onViewAllFeedback}>查看全部反馈</Button>}
        bordered={false}
        style={{ marginBottom: 12, borderRadius: 14, border: '1px solid #EDE9E1' }}
      >
        {feedbackList.length ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {feedbackList.map((item) => (
              <div key={item.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 12, background: '#FAF8F4', border: '1px solid #F0EBE2', alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, width: 44, textAlign: 'center', borderRadius: 10, background: 'rgba(14,94,78,.08)', padding: '4px 2px' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0E5E4E', fontVariantNumeric: 'tabular-nums' }}>{item.date ? item.date.slice(8, 10) : '--'}</div>
                  <div style={{ fontSize: 9.5, color: '#98A2B3' }}>{item.date ? item.date.slice(5, 7) : ''}月</div>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 999, background: 'rgba(232,120,74,.12)', color: '#C2541F', fontSize: 11.5, fontWeight: 700 }}>{item.subject || '综合'}</span>
                    <span style={{ color: '#667085', fontSize: 12.5, fontWeight: 600 }}>{item.teacher?.name || '教师'}</span>
                    {Array.isArray(item.tags) && item.tags.length > 0 && (
                      <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {item.tags.slice(0, 3).map((tag) => (
                          <span key={tag} style={{ display: 'inline-block', padding: '1px 7px', borderRadius: 999, background: 'rgba(78,127,199,.1)', color: '#3A5E8F', fontSize: 10.5 }}>{tag}</span>
                        ))}
                      </span>
                    )}
                  </div>
                  <div style={{ color: '#4B5563', fontSize: 12.5, marginTop: 4, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.summary || item.overallComment || '暂无简评'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty description="暂无课堂反馈" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>

      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={24} lg={10}>
          <Card title={<span style={{ fontWeight: 700 }}><CalendarOutlined style={{ color: '#0E5E4E', marginRight: 6 }} />考勤情况</span>} bordered={false} style={{ height: '100%', borderRadius: 14, border: '1px solid #EDE9E1' }}>
            <Row gutter={[8, 10]}>
              <Col span={12}>
                <div style={{ borderRadius: 12, background: 'rgba(14,94,78,.06)', padding: '10px 12px' }}>
                  <div style={{ color: '#98A2B3', fontSize: 11.5 }}>总课次</div>
                  <div style={{ color: '#17352F', fontSize: 20, fontWeight: 800, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{archive.attendance.summary.total}</div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ borderRadius: 12, background: 'rgba(29,158,117,.07)', padding: '10px 12px' }}>
                  <div style={{ color: '#98A2B3', fontSize: 11.5 }}>出勤率</div>
                  <div style={{ color: rateColor, fontSize: 20, fontWeight: 800, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{attendanceRate}%</div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ borderRadius: 12, background: 'rgba(232,120,74,.07)', padding: '10px 12px' }}>
                  <div style={{ color: '#98A2B3', fontSize: 11.5 }}>请假次数</div>
                  <div style={{ color: '#C2541F', fontSize: 18, fontWeight: 700, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{archive.attendance.summary.leave}</div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ borderRadius: 12, background: 'rgba(192,57,43,.07)', padding: '10px 12px' }}>
                  <div style={{ color: '#98A2B3', fontSize: 11.5 }}>缺勤次数</div>
                  <div style={{ color: '#C0392B', fontSize: 18, fontWeight: 700, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{archive.attendance.summary.absent}</div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title={<span style={{ fontWeight: 700 }}><BookOutlined style={{ color: '#0E5E4E', marginRight: 6 }} />课时情况</span>} bordered={false} style={{ height: '100%', borderRadius: 14, border: '1px solid #EDE9E1' }}>
            <Row gutter={[8, 10]} style={{ marginBottom: 12 }}>
              <Col span={8}>
                <div style={{ borderRadius: 12, background: 'rgba(201,164,92,.1)', padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ color: '#98A2B3', fontSize: 11.5 }}>购买课时</div>
                  <div style={{ color: '#8A6B2F', fontSize: 18, fontWeight: 800, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{archive.hours.totalHours}</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ borderRadius: 12, background: 'rgba(78,127,199,.08)', padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ color: '#98A2B3', fontSize: 11.5 }}>已消耗</div>
                  <div style={{ color: '#3A5E8F', fontSize: 18, fontWeight: 800, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{archive.hours.usedHours}</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ borderRadius: 12, background: 'rgba(29,158,117,.08)', padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ color: '#98A2B3', fontSize: 11.5 }}>剩余</div>
                  <div style={{ color: '#1D9E75', fontSize: 18, fontWeight: 800, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{archive.hours.remainingHours}</div>
                </div>
              </Col>
            </Row>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ x: 'max-content' }}
              dataSource={archive.hours.transactions}
              columns={[
                { title: '日期', dataIndex: 'createdAt', width: 110, render: (value: string | null) => formatLocaleDate(value) },
                { title: '类型', dataIndex: 'type', width: 130, render: (value: string | null) => <span style={{ fontWeight: 600, fontSize: 12.5 }}>{( { ATTENDANCE_DEDUCT: '考勤扣课时', ENROLL_PACKAGE: '报名课时包', MANUAL_ADJUST: '人工调整', INTENSIVE_DEDUCT: '一对一扣课时', REFUND: '退费', TRANSFER: '转班调整', MAKEUP_GRANT: '补课发放', EXPIRY: '到期清零' } as Record<string, string>)[value || ''] || value || '-'}</span> },
                { title: '变动', dataIndex: 'amount', width: 90, render: (value: unknown) => {
                  const num = Number(value || 0)
                  return <span style={{ color: num < 0 ? '#C0392B' : '#1D9E75', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{num > 0 ? `+${num}` : num}</span>
                } },
                { title: '原因', dataIndex: 'reason', width: 200, render: (value: string | null) => value || '-' },
              ]}
              locale={{ emptyText: <Empty description="暂无课时流水" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            />
          </Card>
        </Col>
      </Row>

      <Card title={<span style={{ fontWeight: 700 }}><ReadOutlined style={{ color: '#0E5E4E', marginRight: 6 }} />成绩变化</span>} bordered={false} style={{ borderRadius: 14, border: '1px solid #EDE9E1' }}>
        {archive.grades.trend.length ? (
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ x: 'max-content' }}
            dataSource={archive.grades.trend}
            columns={[
              { title: '日期', dataIndex: 'date', width: 120, render: (value: string | null) => formatLocaleDate(value) },
              { title: '考试', dataIndex: 'assessmentName', width: 180 },
              { title: '学科', dataIndex: 'subject', width: 100 },
              { title: '成绩', key: 'score', width: 120, render: (_value, record) => `${record.score}/${record.fullScore}` },
              { title: '得分率', dataIndex: 'percentage', width: 100, render: (value: number) => `${value}%` },
            ]}
          />
        ) : <Empty description="暂无成绩数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      </Card>

      {archive.attendance.recentRecords.length > 0 && (
        <div style={{ marginTop: 8, color: 'var(--color-ink-subtle)', fontSize: 12 }}>
          最近考勤：{formatLocaleDate(archive.attendance.recentRecords[0].date)} · {attendanceLabel(archive.attendance.recentRecords[0].status)}
        </div>
      )}
    </section>
  )
}
