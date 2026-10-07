'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useParams, useRouter } from 'next/navigation'
import { Avatar, Button, Card, Checkbox, Col, DatePicker, Descriptions, Empty, Form, Input, Modal, Progress, Radio, Row, Select, Space, Spin, Statistic, Table, Tag, message } from 'antd'
import { ArrowLeftOutlined, BookOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, DisconnectOutlined, DownloadOutlined, HeartOutlined, HistoryOutlined, LinkOutlined, MessageOutlined, PlusOutlined, TeamOutlined, UserAddOutlined } from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
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
  const { data: student, isLoading, mutate } = useSWR(params.id ? `/api/students/${params.id}` : null, fetcher)
  const { data: growthArchive, isLoading: growthLoading, error: growthError } = useSWR<StudentGrowthArchive>(
    params.id ? `/api/admin/students/${params.id}/growth-archive` : null,
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
  const [reportMonths, setReportMonths] = useState(6)
  const [exportingFullReport, setExportingFullReport] = useState(false)
  const [reportProgress, setReportProgress] = useState('')
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


  if (isLoading) return <PageLayout title="学员详情"><div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div></PageLayout>
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
      const response = await fetch(`/api/admin/student-profile?studentId=${encodeURIComponent(student.id)}&months=${reportMonths}`)
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
      const filter = new URLSearchParams({
        startDate: dayjs(payload.range.from).format('YYYY-MM-DD'),
        endDate: dayjs(payload.range.to).format('YYYY-MM-DD'),
      })
      setReportProgress('正在整理课堂反馈与照片…')
      const archive = await loadFeedbackArchive(filter)
      const [{ buildAdminLearningReport }, { renderParentFeedbackPdf }] = await Promise.all([
        import('@/lib/student-growth/admin-report'),
        import('@/lib/classroom-feedback/parent-pdf'),
      ])
      const learningReport = buildAdminLearningReport(
        payload.student, payload.profile, payload.range, archive.summary, payload.summaries,
      )
      const { blob, embeddedImages, skippedImages } = await renderParentFeedbackPdf(archive, {
        learningReport,
        onPageRendered: (_dataUrl, pageNumber) => setReportProgress(`正在生成 PDF 第 ${pageNumber} 页…`),
      })
      if (skippedImages) {
        throw new Error(`有 ${skippedImages} 张课堂照片无法读取，完整报告未导出。请在课堂反馈档案中核对照片后重试。`)
      }
      saveReportBlob(blob, `${student.name}_完整学情报告_近${reportMonths}个月.pdf`)
      setReportModalOpen(false)
      message.success(`完整学情报告已导出，包含 ${archive.summary.totalCount} 条课堂反馈和 ${embeddedImages} 张课堂照片`)
    } catch (error) {
      message.error({ content: error instanceof Error ? error.message : '完整学情报告生成失败，请重试', duration: 8 })
    } finally {
      setExportingFullReport(false)
      setReportProgress('')
    }
  }

  return (
    <PageLayout
      title={student.name}
      subtitle={`${student.grade || '未设年级'} · ${student.school || '未填写学校'} · ${student.status || '-'}`}
      actions={<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button type="primary" icon={<DownloadOutlined />} onClick={() => setReportModalOpen(true)}>导出学情报告</Button>
        <Button icon={<HistoryOutlined />} onClick={() => router.push(`/students/${student.id}/feedback-archive`)}>课堂反馈档案</Button>
        <Button icon={<HeartOutlined />} style={{ background: '#1D9E75', borderColor: '#1D9E75', color: '#ffffff' }} onClick={() => setQuickPraiseOpen(true)}>快速表扬</Button>
        <Button icon={<MessageOutlined />} style={{ background: '#534AB7', borderColor: '#534AB7', color: '#ffffff' }} onClick={() => setGrowthFeedbackOpen(true)}>成长反馈</Button>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/students')}>返回学员管理</Button>
      </div>}
    >
      <section id="learning" style={{ scrollMarginTop: 90 }}>
        <StudentGrowthArchivePanel
          archive={growthArchive}
          loading={growthLoading}
          error={growthError as Error | undefined}
          isMobile={isMobile}
          onViewAllFeedback={() => router.push(`/students/${student.id}/feedback-archive`)}
        />
        <StudentLearningRecord studentId={student.id} />
      </section>

      <Card bordered={false} style={{ borderRadius: 8, marginBottom: 16, background: '#ffffff', border: '1px solid #EEE7E1' }}>
        <Descriptions column={2} size="small" labelStyle={{ color: '#98A2B3' }} contentStyle={{ color: '#1F2329' }}>
          <Descriptions.Item label="姓名">{student.name}</Descriptions.Item>
          <Descriptions.Item label="状态"><Tag>{student.status}</Tag></Descriptions.Item>
          <Descriptions.Item label="电话">{student.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="家长账号" span={2}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {student.parent ? (
                <>
                  <Tag color="green" icon={<LinkOutlined />}>
                    {student.parent.name || '家长'}（{student.parent.email}）
                  </Tag>
                  <Button size="small" danger icon={<DisconnectOutlined />} onClick={unlinkParent}>解绑</Button>
                </>
              ) : (
                <Tag color="orange">未绑定家长账号</Tag>
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
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="家长电话">{student.parentPhone || '-'}</Descriptions.Item>
          <Descriptions.Item label="主教老师">{student.mainTeacher?.name || '-'}</Descriptions.Item>
        </Descriptions>
        <div style={{ marginTop: 18 }}>
          <div style={{ color: '#98A2B3', marginBottom: 6 }}>课时进度</div>
          <Progress percent={totalHours ? Math.round((prepaidUsedHours / totalHours) * 100) : 0} strokeColor="#E8784A" />
        </div>
      </Card>

      {/* 同父母孩子 · 家庭账号关联模块 */}
      <Card
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TeamOutlined /> 同父母孩子
            <span style={{ color: '#98A2B3', fontSize: 12, fontWeight: 400 }}>同一家长账号下的孩子，家长登录后可切换查看各孩子的档案</span>
          </span>
        }
        extra={
          student.parent ? (
            <Space>
              <Tag color="green" icon={<LinkOutlined />}>{student.parent.name || '家长'}（{student.parent.email}）</Tag>
              <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openFamilyModal} style={{ background: '#E87545', borderColor: '#E8784A' }}>
                关联其他孩子
              </Button>
            </Space>
          ) : undefined
        }
        bordered={false}
        style={{ borderRadius: 8, marginBottom: 16, background: '#ffffff', border: '1px solid #EEE7E1' }}
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
            dataSource={familyChildren}
            columns={[
              {
                title: '学员',
                render: (_: unknown, record: FamilyChild) => (
                  <Space>
                    <span style={{ fontWeight: 600 }}>{record.name}</span>
                    {record.isCurrent && <Tag color="orange">当前学员</Tag>}
                  </Space>
                ),
              },
              { title: '年级', render: (_: unknown, record: FamilyChild) => record.grade || '-' },
              {
                title: '班级',
                render: (_: unknown, record: FamilyChild) => record.enrollments?.[0]?.group?.name || '-',
              },
              { title: '累计课时', render: (_: unknown, record: FamilyChild) => `${Number(record.totalHours || 0).toFixed(1)}h` },
              { title: '剩余课时', render: (_: unknown, record: FamilyChild) => `${Number(record.remainHours || 0).toFixed(1)}h` },
              {
                title: '状态',
                render: (_: unknown, record: FamilyChild) => <Tag color={record.status === 'ACTIVE' ? 'green' : 'default'}>{record.status}</Tag>,
              },
              {
                title: '操作',
                render: (_: unknown, record: FamilyChild) => (
                  <Space>
                    <Button size="small" type="link" onClick={() => router.push(`/students/${record.id}`)}>查看档案</Button>
                    {!record.isCurrent && (
                      <Button size="small" type="link" danger onClick={() => setUnlinkTarget({ id: record.id, name: record.name })}>解除关联</Button>
                    )}
                  </Space>
                ),
              },
            ]}
          />
        ) : (
          <Empty
            description="该家长账号下暂无其他孩子，可点击右上角「关联其他孩子」把同父母的兄弟姐妹关联进来"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openFamilyModal} style={{ background: '#E87545', borderColor: '#E8784A' }}>
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
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openEnrollModal} style={{ background: '#E87545', borderColor: '#E8784A' }}>
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
            <Button type="primary" onClick={openEnrollModal} style={{ background: '#E87545', borderColor: '#E8784A' }}>
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
          style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}
        >
            <Table
              rowKey="id"
              size="small"
              pagination={{ pageSize: 8 }}
              dataSource={student.attendances || []}
              columns={[
                { title: '状态', dataIndex: 'status', render: (value: string) => <Tag>{value}</Tag> },
                { title: '扣课时', key: 'hoursDeducted', render: (_: unknown, record: AttendanceDeductionRecord) => attendanceDeductedText(record) },
                { title: '日期', dataIndex: 'createdAt', render: (value: string) => new Date(value).toLocaleDateString('zh-CN') },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="缴费记录" bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
            <Table
              rowKey="id"
              size="small"
              pagination={{ pageSize: 8 }}
              dataSource={student.fees || []}
              columns={[
                { title: '类型', dataIndex: 'type' },
                { title: '金额', dataIndex: 'amount' },
                { title: '状态', dataIndex: 'status', render: (value: string) => <Tag>{value}</Tag> },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Modal
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
      </Modal>

      <Modal
        title={`导出给家长的报告 · ${student.name}`}
        open={reportModalOpen}
        onCancel={() => { if (!exportingFullReport && !exportingFeedback) setReportModalOpen(false) }}
        width={isMobile ? 'calc(100vw - 24px)' : 520}
        footer={<Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={() => setReportModalOpen(false)} disabled={exportingFullReport || exportingFeedback}>取消</Button>
          <Button loading={exportingFeedback} disabled={exportingFullReport} onClick={exportFeedbackArchive}>仅课堂反馈 PDF</Button>
          <Button type="primary" icon={<DownloadOutlined />} loading={exportingFullReport} disabled={exportingFeedback} onClick={exportFullReport}>下载完整学情报告</Button>
        </Space>}
      >
        <p style={{ color: 'var(--color-ink-muted)', lineHeight: 1.7 }}>
          完整报告包含学生信息、在读课程、成绩与知识点、考勤概况、学习目标、阶段小结，以及所选期间全部已发布的课堂反馈和可读取的课堂照片。
        </p>
        <div style={{ marginBottom: 8, color: 'var(--color-ink)', fontWeight: 600 }}>报告时间范围</div>
        <Select
          value={reportMonths}
          onChange={setReportMonths}
          style={{ width: '100%' }}
          options={[1, 3, 6, 12, 24].map((months) => ({ value: months, label: `近 ${months} 个月` }))}
          getPopupContainer={(trigger) => trigger.parentElement || document.body}
          virtual={false}
        />
        <p style={{ marginTop: 10, color: 'var(--color-ink-subtle)', fontSize: 12, lineHeight: 1.6 }}>
          导出前请核对学员和时间范围。完整报告只在所选期间的课堂照片全部读取成功时下载；若有照片失效，请先到课堂反馈档案核对。仅课堂反馈 PDF 为全部历史记录。
        </p>
        {reportProgress && <p role="status" aria-live="polite" style={{ color: 'var(--color-primary)', fontSize: 13 }}>{reportProgress}</p>}
      </Modal>

      <Modal
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
              <strong style={{ color: '#C2541F', fontSize: 24, fontVariantNumeric: 'tabular-nums' }}>{hoursQueryTotal.toFixed(1)} 小时</strong>
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
                { title: '上课时长', key: 'hours', render: (_: unknown, record: AttendanceDeductionRecord) => `${Math.abs(Number(record.hoursDeducted || 0)).toFixed(1)} 小时` },
              ]}
            />
          </>
        ) : (
          <div style={{ color: '#98A2B3', padding: '28px 0', textAlign: 'center', fontSize: 13 }}>
            选择日期范围后，可查询该时间段内孩子实际上课的小时数
          </div>
        )}
      </Modal>

      <Modal
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
          <div><div style={{ marginBottom: 6 }}>表现标签</div><Select mode="tags" value={feedbackTags} onChange={setFeedbackTags} maxCount={20} maxTagCount="responsive" tokenSeparators={[',', '，', '、']} placeholder="输入标签后回车，如：主动提问" style={{ width: '100%' }} /></div>
          <div><div style={{ marginBottom: 6 }}>课堂图片（可选）</div><ImageUploader value={feedbackImages} onChange={setFeedbackImages} /></div>
        </div>
      </Modal>

      <Modal
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
              <Select
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
                <Input placeholder="默认：邮箱前缀" />
              </Form.Item>
            </>
          )}
        </Form>
        {parentMode === 'existing' && (
          <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 8, background: '#f5f2ee', padding: '8px 12px', borderRadius: 6 }}>
            选择已有家长账号后，这个孩子会直接出现在该家长端的孩子列表中。
          </div>
        )}
      </Modal>

      {/* 关联其他孩子弹窗 */}
      <Modal
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
                    剩余 {Number(candidate.remainHours || 0).toFixed(1)}h
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
            <Button type="primary" loading={linkingFamily} onClick={linkFamilyChildren} style={{ background: '#E87545', borderColor: '#E8784A' }}>
              确认关联{selectedFamilyIds.length ? `（${selectedFamilyIds.length} 人）` : ''}
            </Button>
          </Space>
        </div>
      </Modal>

      {/* 解除关联确认弹窗（受控，避免静态 Modal.confirm 在部分环境不弹） */}
      <Modal
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
      </Modal>

      <Modal
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
      </Modal>
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

  const overviewItems = [
    { label: '累计反馈', value: `${archive.overview.feedbackCount} 次`, icon: <MessageOutlined /> },
    { label: '累计上课', value: `${Number(archive.overview.usedHours || 0) + Number(archive.overview.approvedIntensiveHours || 0)} 小时`, icon: <BookOutlined /> },
    { label: '剩余课时', value: `${archive.overview.remainingHours} 小时`, icon: <CheckCircleOutlined /> },
    { label: '最近反馈', value: formatLocaleDate(archive.overview.latestFeedbackDate), icon: <CalendarOutlined /> },
  ]

  return (
    <section style={{ marginBottom: 24, maxWidth: '100%', overflow: 'hidden' }}>
      <Card bordered={false} style={{ marginBottom: 12, border: '1px solid var(--color-hairline)', borderRadius: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Avatar size={isMobile ? 52 : 64} style={{ background: 'var(--color-primary)', color: 'var(--color-surface-1)', fontWeight: 700 }}>
            {archive.student.name.slice(0, 1)}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: 'var(--color-ink)', fontSize: isMobile ? 18 : 22, fontWeight: 700 }}>{archive.student.name}</div>
            <div style={{ color: 'var(--color-ink-muted)', marginTop: 4 }}>{archive.student.grade || '未设置年级'} · {archive.student.className || '未加入班级'}</div>
          </div>
          <Tag icon={<TeamOutlined />} style={{ marginLeft: isMobile ? 0 : 'auto', borderRadius: 9999 }}>{archive.attendance.summary.total} 条考勤记录</Tag>
        </div>
      </Card>

      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        {overviewItems.map((item) => (
          <Col xs={12} lg={6} key={item.label}>
            <Card bordered={false} style={{ height: '100%', border: '1px solid var(--color-hairline)', borderRadius: 14 }} styles={{ body: { padding: isMobile ? 12 : 16 } }}>
              <div style={{ color: 'var(--color-primary)', fontSize: 18 }}>{item.icon}</div>
              <div style={{ color: 'var(--color-ink-subtle)', fontSize: 12, marginTop: 8 }}>{item.label}</div>
              <div style={{ color: 'var(--color-ink)', fontSize: isMobile ? 16 : 20, fontWeight: 700, marginTop: 2 }}>{item.value}</div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        title="课堂反馈"
        extra={<Button type="link" onClick={onViewAllFeedback}>查看全部反馈</Button>}
        bordered={false}
        style={{ marginBottom: 12, border: '1px solid var(--color-hairline)', borderRadius: 14 }}
      >
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: 'max-content' }}
          dataSource={archive.feedback.items}
          columns={[
            { title: '日期', dataIndex: 'date', width: 120, render: (value: string | null) => formatLocaleDate(value) },
            { title: '学科', dataIndex: 'subject', width: 100, render: (value: string) => <Tag color="orange">{value}</Tag> },
            { title: '教师', dataIndex: ['teacher', 'name'], width: 100 },
            { title: '课堂标签', dataIndex: 'tags', width: 180, render: (tags: string[]) => tags.length ? tags.map((tag) => <Tag key={tag}>{tag}</Tag>) : '-' },
            { title: '简评', key: 'summary', width: 280, ellipsis: true, render: (_value, record) => record.summary || record.overallComment || '-' },
          ]}
          locale={{ emptyText: <Empty description="暂无课堂反馈" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>

      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={24} lg={10}>
          <Card title="考勤情况" bordered={false} style={{ height: '100%', border: '1px solid var(--color-hairline)', borderRadius: 14 }}>
            <Row gutter={[8, 12]}>
              <Col span={12}><Statistic title="总课次" value={archive.attendance.summary.total} /></Col>
              <Col span={12}><Statistic title="出勤率" value={archive.attendance.summary.rate ?? 0} suffix="%" /></Col>
              <Col span={12}><Statistic title="请假次数" value={archive.attendance.summary.leave} /></Col>
              <Col span={12}><Statistic title="缺勤次数" value={archive.attendance.summary.absent} /></Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="课时情况" bordered={false} style={{ height: '100%', border: '1px solid var(--color-hairline)', borderRadius: 14 }}>
            <Row gutter={[8, 12]} style={{ marginBottom: 12 }}>
              <Col span={8}><Statistic title="购买课时" value={archive.hours.totalHours} /></Col>
              <Col span={8}><Statistic title="已消耗" value={archive.hours.usedHours} /></Col>
              <Col span={8}><Statistic title="剩余" value={archive.hours.remainingHours} /></Col>
            </Row>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ x: 'max-content' }}
              dataSource={archive.hours.transactions}
              columns={[
                { title: '日期', dataIndex: 'createdAt', width: 110, render: (value: string | null) => formatLocaleDate(value) },
                { title: '类型', dataIndex: 'type', width: 130 },
                { title: '变动', dataIndex: 'amount', width: 90 },
                { title: '原因', dataIndex: 'reason', width: 200, render: (value: string | null) => value || '-' },
              ]}
              locale={{ emptyText: <Empty description="暂无课时流水" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="成绩变化" bordered={false} style={{ border: '1px solid var(--color-hairline)', borderRadius: 14 }}>
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
