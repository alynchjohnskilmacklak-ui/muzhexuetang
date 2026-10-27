'use client'
import { AdaptiveSelect } from '@/components/AdaptiveSelect';

import React, { useCallback, useEffect, useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Drawer,
  Empty,
  Input,
  InputNumber,
  message,
  Modal,
  Pagination,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import {
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloudUploadOutlined,
  CoffeeOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  ExportOutlined,
  EyeOutlined,
  FileTextOutlined,
  MessageOutlined,
  ReadOutlined,
  ReloadOutlined,
  RestOutlined,
  SafetyOutlined,
  SearchOutlined,
  SettingOutlined,
  StarOutlined,
  TeamOutlined,
  UndoOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { BrandModal } from '@/components/Common/BrandModal'
import { useSession } from 'next-auth/react'
import { DATA_ADMIN_ENTITIES, DATA_ADMIN_TRASH_ENTITIES, DATA_ADMIN_BUSINESS_LINKS, type EntityKey } from '@/lib/data-admin/entities'
import { useRouter, useSearchParams } from 'next/navigation'
import { useIsMobile } from '@/hooks/useIsMobile'
import BackupRestorePanel from '@/components/DataAdmin/BackupRestorePanel'
import { fetchJson } from '@/lib/fetch-json'

const { Text } = Typography

const BRAND = {
  dark: '#123C35',
  deep: '#0E5E4E',
  ink: '#17352F',
  green: '#0B4B40',
  gold: '#C9A45C',
  goldLight: '#F2E3B6',
}

const FIELD_LABEL_MAP: Record<string, string> = {
  id: '记录ID',
  name: '姓名',
  gender: '性别',
  birthYear: '出生年',
  grade: '年级',
  school: '学校',
  phone: '电话',
  email: '邮箱',
  avatar: '头像',
  parentName: '家长姓名',
  parentPhone: '家长电话',
  status: '状态',
  source: '来源',
  notes: '备注',
  mainTeacherId: '主带教师',
  subjects: '任教科目',
  employmentType: '用工类型',
  education: '学历',
  university: '毕业院校',
  major: '专业',
  graduationYear: '毕业年份',
  currentUnit: '现任单位',
  bio: '简介',
  monthlyHours: '月课时',
  roomId: '教室',
  maxStudents: '班容',
  totalLessons: '总课次',
  startDate: '开始日期',
  endDate: '结束日期',
  lessonStartTime: '上课时间',
  lessonMinutes: '每节时长',
  note: '备注',
  subject: '科目',
  lessonDate: '上课日期',
  startTime: '开始时间',
  endTime: '结束时间',
  teacherId: '教师ID',
  cancelReason: '取消原因',
  enrolledAt: '报名时间',
  totalHours: '总课时',
  remainHours: '剩余课时',
  usedHours: '已用课时',
  actualMinutes: '实际分钟',
  hoursDeducted: '扣减课时',
  title: '标题',
  paperDate: '考试日期',
  overallComment: '总体评价',
  tags: '标签',
  summary: '内容摘要',
  homework: '作业',
  knowledgePoints: '知识点',
  targetType: '对象类型',
  content: '内容',
  type: '类型',
  mood: '心情',
  visibility: '可见性',
  isPinned: '置顶',
  weekStart: '周起始',
  mainDish: '主菜',
  sideDish: '配菜',
  mealType: '餐次',
  dayOfWeek: '星期',
  allowDouble: '允许加饭',
  description: '说明',
  audience: '受众',
  createdAt: '创建时间',
  updatedAt: '更新时间',
  deletedAt: '删除时间',
  settlementBatchId: '结算批次',
  settledAt: '结算时间',
  amount: '金额',
  studentId: '学员ID',
  groupId: '班级ID',
  courseId: '课程ID',
  lessonId: '课次ID',
  feedbackId: '反馈ID',
  identityId: '身份ID',
  subjectLabel: '科目',
  division: '学部',
  membershipLevel: '会员等级',
  quotaState: '天数状态',
  remainingDays: '剩余天数',
  totalDays: '总天数',
}

const MEMBERSHIP_LABEL: Record<string, string> = {
  SVIP: 'SVIP', VIP: 'VIP', NORMAL: '普通', PREMIUM: '会员',
}

const STATUS_LABEL_MAP: Record<string, string> = {
  ACTIVE: '进行中', TRIAL: '试听', INACTIVE: '已停用', GRADUATED: '已结业',
  RESIGNED: '已离职', WAITING: '待开班', COMPLETED: '已完成', ARCHIVED: '已归档',
  SCHEDULED: '已安排', IN_PROGRESS: '上课中', CANCELLED: '已取消', POSTPONED: '已顺延',
  WITHDRAWN: '已退费', PRESENT: '出席', LEAVE: '请假', ABSENT: '缺席', MAKEUP: '补课',
  DRAFT: '草稿', PUBLISHED: '已发布', DELETED: '已删除',
  DAILY: '日常', HIGHLIGHT: '亮点', WEEKLY_SUMMARY: '周报', ACHIEVEMENT: '成果',
  PARENT_ONLY: '仅家长', CLASS_PUBLIC: '班级公开',
  STUDYING: '学习中', SUSPENDED: '已休学', TRANSFERRED: '已转出',
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: '#1D9E75', TRIAL: '#4E7FC7', INACTIVE: '#B98A2F', GRADUATED: '#7A6F5F',
    RESIGNED: '#C0392B', WAITING: '#C9A45C', COMPLETED: '#1D9E75', ARCHIVED: '#98A2B3',
    SCHEDULED: '#4E7FC7', IN_PROGRESS: '#0E5E4E', CANCELLED: '#98A2B3',
    POSTPONED: '#E8784A', WITHDRAWN: '#C0392B', PRESENT: '#1D9E75', LEAVE: '#E8784A',
    ABSENT: '#C0392B', MAKEUP: '#4E7FC7', DRAFT: '#98A2B3', PUBLISHED: '#1D9E75',
    DELETED: '#C0392B', DAILY: '#4E7FC7', HIGHLIGHT: '#E8784A', WEEKLY_SUMMARY: '#7A6F5F',
    ACHIEVEMENT: '#1D9E75', PARENT_ONLY: '#98A2B3', CLASS_PUBLIC: '#4E7FC7',
  }
  return map[status] || '#98A2B3'
}

function statusTag(status: string) {
  const color = getStatusColor(status)
  return (
    <span style={{
      display: 'inline-block', fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 999,
      color, background: `${color}1F`, border: `1px solid ${color}40`, whiteSpace: 'nowrap',
    }}>
      {STATUS_LABEL_MAP[status] || status}
    </span>
  )
}

type StudentIdentityRecord = {
  id: string
  identityId: string
  name: string
  parentId: string | null
  birthYear?: number | null
  gender?: string | null
  grade?: string | null
  status?: string
  termMemberships?: Array<{ grade: string | null; status: string; term: { name: string; status: string } }>
}

type AdminApiResponse = {
  data?: Array<Record<string, unknown>>
  meta?: { total?: number }
  events?: Array<Record<string, unknown>>
}
const fetchAdminJson = async (url: string) => await fetchJson(url) as AdminApiResponse

const ENTITY_TABS: { key: EntityKey | 'health' | 'backup-restore'; label: string; icon: React.ReactNode }[] = [
  { key: 'students', label: '学员', icon: <UserOutlined /> },
  { key: 'teachers', label: '教师', icon: <TeamOutlined /> },
  { key: 'class-groups', label: '班级', icon: <BookOutlined /> },
  { key: 'class-lessons', label: '课次', icon: <CalendarOutlined /> },
  { key: 'enrollments', label: '课时', icon: <ClockCircleOutlined /> },
  { key: 'attendances', label: '考勤', icon: <CheckOutlined /> },
  { key: 'exam-papers', label: '试卷', icon: <FileTextOutlined /> },
  { key: 'classroom-feedbacks', label: '课堂反馈', icon: <MessageOutlined /> },
  { key: 'performance-posts', label: '表现动态', icon: <StarOutlined /> },
  { key: 'notifications', label: '通知', icon: <BellOutlined /> },
  { key: 'materials', label: '学习资料', icon: <ReadOutlined /> },
  { key: 'meals', label: '就餐', icon: <CoffeeOutlined /> },
  { key: 'health', label: '数据健康', icon: <SafetyOutlined /> },
  { key: 'backup-restore', label: '备份与恢复', icon: <CloudUploadOutlined /> },
]

const STATUS_FILTER_MAP: Record<EntityKey, { label: string; value: string }[]> = {
  students: [
    { label: '全部状态', value: '' },
    { label: '试听', value: 'TRIAL' },
    { label: '在读', value: 'ACTIVE' },
    { label: '休学', value: 'INACTIVE' },
    { label: '结业', value: 'GRADUATED' },
  ],
  teachers: [
    { label: '全部状态', value: '' },
    { label: '在职', value: 'ACTIVE' },
    { label: '离职', value: 'RESIGNED' },
  ],
  'class-groups': [
    { label: '全部状态', value: '' },
    { label: '待开班', value: 'WAITING' },
    { label: '进行中', value: 'ACTIVE' },
    { label: '已完成', value: 'COMPLETED' },
    { label: '已归档', value: 'ARCHIVED' },
  ],
  'class-lessons': [
    { label: '全部状态', value: '' },
    { label: '已安排', value: 'SCHEDULED' },
    { label: '进行中', value: 'IN_PROGRESS' },
    { label: '已完成', value: 'COMPLETED' },
    { label: '已取消', value: 'CANCELLED' },
  ],
  enrollments: [
    { label: '全部状态', value: '' },
    { label: '有效', value: 'ACTIVE' },
    { label: '已完成', value: 'COMPLETED' },
    { label: '已退费', value: 'WITHDRAWN' },
  ],
  attendances: [
    { label: '全部状态', value: '' },
    { label: '出席', value: 'PRESENT' },
    { label: '请假', value: 'LEAVE' },
    { label: '缺席', value: 'ABSENT' },
    { label: '补课', value: 'MAKEUP' },
  ],
  'exam-papers': [
    { label: '全部状态', value: '' },
    { label: '草稿', value: 'DRAFT' },
    { label: '已发布', value: 'PUBLISHED' },
    { label: '已删除', value: 'DELETED' },
  ],
  'classroom-feedbacks': [
    { label: '全部状态', value: '' },
    { label: '草稿', value: 'DRAFT' },
    { label: '已发布', value: 'PUBLISHED' },
    { label: '已删除', value: 'DELETED' },
  ],
  'performance-posts': [
    { label: '全部', value: '' },
    { label: '日常', value: 'DAILY' },
    { label: '亮点', value: 'HIGHLIGHT' },
    { label: '周报', value: 'WEEKLY_SUMMARY' },
  ],
  notifications: [
    { label: '全部状态', value: '' },
    { label: '有效', value: 'ACTIVE' },
    { label: '已删除', value: 'DELETED' },
  ],
  materials: [
    { label: '全部状态', value: '' },
    { label: '草稿', value: 'DRAFT' },
    { label: '已发布', value: 'PUBLISHED' },
    { label: '已删除', value: 'DELETED' },
  ],
  meals: [{ label: '全部', value: '' }],
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (value instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value))) {
    return new Date(value as string).toLocaleString('zh-CN')
  }
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 80)
  return String(value)
}

function formatDateShort(value: unknown): string {
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function DetailDrawer({
  open,
  onClose,
  entityKey,
  record,
}: {
  open: boolean
  onClose: () => void
  entityKey: EntityKey
  record: Record<string, unknown> | null
}) {
  if (!record) return null
  const def = DATA_ADMIN_ENTITIES[entityKey]
  const keys = Object.keys(record).filter((k) => !def.sensitiveFields.includes(k) && !def.hiddenFields.includes(k))

  return (
    <Drawer title="查看详情" open={open} onClose={onClose} width={560}>
      <Descriptions column={1} size="small" bordered>
        {keys.map((k) => (
          <Descriptions.Item key={k} label={FIELD_LABEL_MAP[k] || k}>
            {k === 'status' && typeof record[k] === 'string' ? (
              statusTag(record[k] as string)
            ) : (
              <Text style={{ wordBreak: 'break-all' }}>{formatValue(record[k])}</Text>
            )}
          </Descriptions.Item>
        ))}
      </Descriptions>
    </Drawer>
  )
}

function HourAdjustmentModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [studentId, setStudentId] = useState('')
  const [enrollmentId, setEnrollmentId] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: studentsData } = useSWR('/api/admin/data-admin/students?limit=200', (url: string) =>
    fetch(url).then((r) => r.json()),
  )

  const students = studentsData?.data || []
  const { data: studentDetail, isLoading: enrollmentsLoading } = useSWR(
    studentId ? `/api/students/${studentId}` : null,
    (url: string) => fetch(url).then((res) => res.json()),
  )
  const enrollments = Array.isArray(studentDetail?.enrollments) ? studentDetail.enrollments as Array<{
    id: string
    remainHours?: number | null
    group?: { name?: string | null }
  }> : []

  const handleSubmit = async () => {
    if (!studentId || !enrollmentId || amount === 0) {
      message.warning('请选择学员、对应报名课程并输入课时数')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/data-admin/enrollments/any-id`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'hour-adjustment', studentId, enrollmentId: enrollmentId || null, amount, reason }),
      })
      const data = await res.json()
      if (data.success) {
        message.success(data.message)
        void globalMutate((key) => typeof key === 'string' && key.startsWith('/api/admin/data-admin/'))
        void globalMutate(`/api/students/${studentId}`)
        onClose()
      } else {
        message.error(data.error || '调整失败')
      }
    } catch {
      message.error('网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <BrandModal title="课时调整" open={open} onOk={handleSubmit} onCancel={onClose} confirmLoading={loading} okText="确认调整" cancelText="取消">
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <Alert type="warning" showIcon message="不要直接在数据库改课时数据，必须通过此入口调整以保证账目一致。" />
        <div>
          <Text type="secondary">选择学员</Text>
          <AdaptiveSelect
            showSearch
            placeholder="搜索学员姓名"
            value={studentId || undefined}
            onChange={(value) => { setStudentId(value); setEnrollmentId('') }}
            style={{ width: '100%', marginTop: 4 }}
            filterOption={(input, option) => (option?.label as string || '').includes(input)}
            options={students.map((s: { name?: string; grade?: string; id?: string }) => ({ label: `${s.name ?? '-'} (${s.grade ?? '-'})`, value: s.id ?? '' }))}
          />
        </div>
        <div>
          <Text type="secondary">选择报名课程</Text>
          <AdaptiveSelect
            showSearch
            disabled={!studentId || enrollmentsLoading}
            loading={enrollmentsLoading}
            placeholder={studentId ? '选择需要调整课时的报名记录' : '请先选择学员'}
            value={enrollmentId || undefined}
            onChange={setEnrollmentId}
            style={{ width: '100%', marginTop: 4 }}
            filterOption={(input, option) => (option?.label as string || '').includes(input)}
            options={enrollments.map((enrollment) => ({
              label: `${enrollment.group?.name || '未命名课程'}（剩余 ${Number(enrollment.remainHours || 0)} 小时）`,
              value: enrollment.id,
            }))}
          />
          {studentId && !enrollmentsLoading && enrollments.length === 0 && (
            <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>该学员没有有效报名记录，请先办理报名。</Text>
          )}
        </div>
        <div>
          <Text type="secondary">调整类型</Text>
          <AdaptiveSelect
            value={amount > 0 ? 'add' : amount < 0 ? 'deduct' : undefined}
            onChange={(val) => {
              if (val === 'add') setAmount(Math.abs(amount) || 2)
              else if (val === 'deduct') setAmount(-Math.abs(amount) || -2)
            }}
            style={{ width: '100%', marginTop: 4 }}
            options={[
              { label: '增加课时', value: 'add' },
              { label: '减少课时', value: 'deduct' },
              { label: '修正课时', value: 'adjust' },
            ]}
          />
        </div>
        <div>
          <Text type="secondary">课时数</Text>
          <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} style={{ marginTop: 4 }} />
        </div>
        <div>
          <Text type="secondary">调整原因</Text>
          <Input.TextArea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="请填写调整原因" rows={3} style={{ marginTop: 4 }} />
        </div>
      </Space>
    </BrandModal>
  )
}

export function DataAdminClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile() ?? false
  const [activeTab, setActiveTab] = useState<EntityKey | 'health' | 'backup-restore'>(() => {
    const tab = searchParams.get('tab')
    return ENTITY_TABS.some((item) => item.key === tab) ? tab as EntityKey | 'health' | 'backup-restore' : 'health'
  })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<Record<string, unknown> | null>(null)
  const [editData, setEditData] = useState<Record<string, unknown>>({})
  const [editLoading, setEditLoading] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingRecord, setDeletingRecord] = useState<Record<string, unknown> | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteImpact, setDeleteImpact] = useState<{ summary?: string } | null>(null)
  const [deletePreviewLoading, setDeletePreviewLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRecord, setDetailRecord] = useState<Record<string, unknown> | null>(null)
  const [hourAdjustOpen, setHourAdjustOpen] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [batchLoading, setBatchLoading] = useState(false)
  const [identityReviewOpen, setIdentityReviewOpen] = useState(false)
  const [identityReviewLoading, setIdentityReviewLoading] = useState(false)
  const [identityMergeLoading, setIdentityMergeLoading] = useState(false)
  const [identityRecords, setIdentityRecords] = useState<StudentIdentityRecord[]>([])
  const [identityCanonicalId, setIdentityCanonicalId] = useState('')
  const [identitySelectedIds, setIdentitySelectedIds] = useState<string[]>([])
  const [identityMergeConfirmed, setIdentityMergeConfirmed] = useState(false)

  // 备份与恢复页签仅超级管理员可见：与 AdminsTab 同款，请求 /api/settings/accounts 后按 currentUserId 匹配 isSuperAdmin。
  // 数据未返回前按非超级管理员处理（fail-closed），普通管理员永远拿不到入口；接口层 requireSuperAdmin 保持不变。
  const { data: session, status: sessionStatus } = useSession()
  const { data: accountsData } = useSWR<{ admins: Array<{ id: string; isSuperAdmin?: boolean }> }>(
    sessionStatus === 'authenticated' ? '/api/settings/accounts' : null,
    (url: string) => fetch(url).then((r) => r.json()),
  )
  const currentUserId = session?.user?.id
  const currentIsSuperAdmin = (accountsData?.admins || []).find((admin) => admin.id === currentUserId)?.isSuperAdmin === true
  const visibleTabs = ENTITY_TABS.filter((tab) => tab.key !== 'backup-restore' || currentIsSuperAdmin)
  const gatedActiveTab: EntityKey | 'health' | 'backup-restore' = activeTab === 'backup-restore' && !currentIsSuperAdmin ? 'health' : activeTab

  const isHealthTab = gatedActiveTab === 'health'
  const entityKey = gatedActiveTab as EntityKey
  const def = isHealthTab ? null : DATA_ADMIN_ENTITIES[entityKey]

  const buildUrl = useCallback(() => {
    if (isHealthTab || gatedActiveTab === 'backup-restore') return null
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    params.set('page', String(page))
    params.set('limit', String(limit))
    if (includeDeleted) params.set('includeDeleted', 'true')
    return `/api/admin/data-admin/${entityKey}?${params.toString()}`
  }, [entityKey, search, statusFilter, page, limit, includeDeleted, isHealthTab, gatedActiveTab])

  const { data, error: dataError, mutate, isLoading } = useSWR(buildUrl, async (url: string) => {
    const res = await fetch(url)
    const result = await res.json().catch(() => ({}))
    if (res.status === 403) {
      message.error('无权限访问')
      throw new Error('无权限访问')
    }
    if (!res.ok) throw new Error(typeof result.error === 'string' ? result.error : `数据加载失败（HTTP ${res.status}）`)
    return result as AdminApiResponse
  })

  const { data: healthData, error: healthError, mutate: healthMutate } = useSWR(
    isHealthTab ? '/api/admin/data-health' : null,
    fetchAdminJson,
  )
  const { data: overviewData } = useSWR('/api/admin/data-admin/overview', fetchAdminJson)
  const overviewCounts = (overviewData as { success?: boolean; data?: Record<string, number> } | undefined)?.data
  const overviewItems: { key: EntityKey; label: string; value: number; icon: React.ReactNode; sub: string }[] = [
    { key: 'students', label: '在读学员', value: overviewCounts?.students ?? 0, icon: <UserOutlined />, sub: '不含停用' },
    { key: 'teachers', label: '在职教师', value: overviewCounts?.teachers ?? 0, icon: <TeamOutlined />, sub: '正常在岗' },
    { key: 'class-groups', label: '运行班级', value: overviewCounts?.classGroups ?? 0, icon: <BookOutlined />, sub: '未归档' },
    { key: 'class-lessons', label: '本月课次', value: overviewCounts?.monthLessons ?? 0, icon: <CalendarOutlined />, sub: '未取消' },
    { key: 'enrollments', label: '在读课时', value: overviewCounts?.activeEnrollments ?? 0, icon: <ClockCircleOutlined />, sub: '有效报名' },
    { key: 'attendances', label: '今日考勤', value: overviewCounts?.todayAttendances ?? 0, icon: <CheckOutlined />, sub: '已记录' },
    { key: 'classroom-feedbacks', label: '今日反馈', value: overviewCounts?.todayFeedbacks ?? 0, icon: <MessageOutlined />, sub: '已发布' },
  ]
  const { data: courseChangeData, error: courseChangeError, mutate: courseChangeMutate, isLoading: courseChangesLoading } = useSWR(
    isHealthTab ? '/api/admin/course-change-events?limit=20' : null,
    fetchAdminJson,
  )

  useEffect(() => {
    setPage(1)
    setSelectedRowKeys([])
  }, [entityKey, search, statusFilter, includeDeleted])

  const records = data?.data || []
  const total = data?.meta?.total || 0
  const batchSupportedEntities = DATA_ADMIN_TRASH_ENTITIES
  const supportsBatch = batchSupportedEntities.includes(entityKey)

  const openIdentityReview = async (studentId: string) => {
    setIdentityReviewLoading(true)
    setIdentityMergeConfirmed(false)
    try {
      const result = await fetchJson(`/api/admin/student-identities/merge?studentId=${encodeURIComponent(studentId)}`) as {
        current: StudentIdentityRecord
        candidates: StudentIdentityRecord[]
      }
      const options = [result.current, ...result.candidates]
      setIdentityRecords(options)
      setIdentityCanonicalId(result.current.id)
      setIdentitySelectedIds([result.current.id])
      setIdentityReviewOpen(true)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '学员档案读取失败')
    } finally {
      setIdentityReviewLoading(false)
    }
  }

  const confirmIdentityMerge = async () => {
    if (!identityCanonicalId || identitySelectedIds.length < 2 || !identityMergeConfirmed) return
    setIdentityMergeLoading(true)
    try {
      await fetchJson('/api/admin/student-identities/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canonicalStudentId: identityCanonicalId, studentIds: identitySelectedIds, confirmSameChild: true }),
      })
      message.success('身份关联已保存；历史课程、考勤和反馈数据会按同一名学员汇总展示')
      setIdentityReviewOpen(false)
      void healthMutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '身份关联失败，请核对学员后重试')
    } finally {
      setIdentityMergeLoading(false)
    }
  }

  const handleEdit = (record: Record<string, unknown>) => {
    if (!def) return
    const initial: Record<string, unknown> = {}
    for (const f of def.editableFields) {
      initial[f] = record[f]
    }
    setEditingRecord(record)
    setEditData(initial)
    setEditModalOpen(true)
  }

  const handleEditSave = async () => {
    if (!def || !editingRecord) return
    setEditLoading(true)
    try {
      const res = await fetch(`/api/admin/data-admin/${entityKey}/${editingRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })
      const result = await res.json()
      if (res.ok && result.success) {
        message.success('更新成功')
        setEditModalOpen(false)
        void mutate()
        void healthMutate()
        void globalMutate('/api/admin/data-admin/overview')
      } else {
        message.error(result.error || '更新失败')
      }
    } catch {
      message.error('网络错误')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteClick = async (record: Record<string, unknown>) => {
    setDeletingRecord(record)
    setDeleteReason('')
    setDeleteModalOpen(true)
    setDeleteImpact(null)
    const typeByEntity: Partial<Record<EntityKey, string>> = { students: 'Student', 'class-groups': 'ClassGroup', 'class-lessons': 'ClassLesson', 'exam-papers': 'ExamPaper', materials: 'StudyMaterial' }
    const trashType = typeByEntity[entityKey]
    if (!trashType) { setDeleteImpact({ summary: '该记录将按现有业务状态进入删除视图' }); return }
    setDeletePreviewLoading(true)
    try {
      const response = await fetch(`/api/admin/trash/preview?type=${trashType}&id=${encodeURIComponent(String(record.id))}`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || '无法加载影响范围')
      setDeleteImpact(payload.data.impact)
    } catch (error) { message.error(error instanceof Error ? error.message : '无法加载影响范围') } finally { setDeletePreviewLoading(false) }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/admin/data-admin/${entityKey}/${deletingRecord.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deleteReason || '管理员手动删除' }),
      })
      const result = await res.json()
      if (res.ok && result.success) {
        message.success('已删除')
        setDeleteModalOpen(false)
        void mutate()
        void healthMutate()
        void globalMutate('/api/admin/data-admin/overview')
      } else {
        message.error(result.error || '删除失败')
      }
    } catch {
      message.error('网络错误')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleRestore = async (id: string) => {
    setRestoringId(id)
    try {
      const res = await fetch(`/api/admin/data-admin/${entityKey}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      })
      const result = await res.json()
      if (res.ok && result.success) {
        message.success('已恢复')
        void mutate()
        void healthMutate()
        void globalMutate('/api/admin/data-admin/overview')
      } else {
        message.error(result.error || '恢复失败')
      }
    } catch {
      message.error('网络错误')
    } finally {
      setRestoringId(null)
    }
  }

  const handleBatchAction = async (action: 'softDelete' | 'restore' | 'markRead') => {
    if (!selectedRowKeys.length) return
    if (!supportsBatch && action !== 'markRead') {
      message.warning('该类型暂不支持批量操作')
      return
    }
    if (action === 'markRead' && entityKey !== 'notifications') {
      message.warning('仅通知支持批量标记已读')
      return
    }

    setBatchLoading(true)
    try {
      const res = await fetch(`/api/admin/data-admin/${entityKey}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ids: selectedRowKeys.map(String),
          reason: action === 'markRead' ? '批量标记通知已读' : '数据管理中心批量操作',
        }),
      })
      const result = await res.json()
      if (result.success) {
        message.success(result.message || '批量操作成功')
        setSelectedRowKeys([])
        void mutate()
        void healthMutate()
        void globalMutate('/api/admin/data-admin/overview')
      } else {
        if (Array.isArray(result.failures)) {
          setSelectedRowKeys(result.failures.map((item: { id: string }) => item.id))
          message.warning(result.message || '部分记录操作失败，已保留失败项')
          void mutate()
          void healthMutate()
          void globalMutate('/api/admin/data-admin/overview')
          return
        }
        message.error(result.error || '批量操作失败')
      }
    } catch {
      message.error('网络错误')
    } finally {
      setBatchLoading(false)
    }
  }

  const handleViewDetail = async (record: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/admin/data-admin/${entityKey}/${record.id}`)
      const result = await res.json()
      if (result.success) {
        setDetailRecord(result.data)
        setDetailOpen(true)
      }
    } catch {
      message.error('加载失败')
    }
  }

  const getRecordName = (record: Record<string, unknown>): string => {
    return (record.name as string) || (record.title as string) || (record.id as string)?.slice(0, 8) || '-'
  }

  const isDeletedRecord = (record: Record<string, unknown>): boolean => {
    if (record.deletedAt) return true
    const status = record.status as string
    if (entityKey === 'performance-posts') return !!record.deletedAt
    const deletedValues = ['INACTIVE', 'RESIGNED', 'ARCHIVED', 'CANCELLED', 'DELETED']
    return deletedValues.includes(status)
  }

  const COLUMN_PRIORITY: Record<string, string[]> = {
    students: ['name', 'grade', 'status', 'membershipLevel', 'phone', 'remainHours', 'totalHours', 'mainTeacherId', 'source', 'createdAt'],
    teachers: ['name', 'status', 'subjects', 'phone', 'employmentType', 'createdAt'],
    'class-groups': ['name', 'courseId', 'teacherId', 'status', 'maxStudents', 'totalLessons', 'lessonStartTime'],
    'class-lessons': ['subject', 'lessonDate', 'startTime', 'endTime', 'teacherId', 'status', 'groupId'],
    enrollments: ['studentId', 'groupId', 'status', 'remainHours', 'totalHours', 'usedHours', 'enrolledAt'],
    attendances: ['studentId', 'lessonId', 'status', 'actualMinutes', 'hoursDeducted', 'createdAt'],
    'exam-papers': ['title', 'subject', 'paperDate', 'status', 'tags', 'createdAt'],
    'classroom-feedbacks': ['summary', 'subject', 'teacherId', 'status', 'knowledgePoints', 'createdAt'],
    'performance-posts': ['content', 'type', 'mood', 'visibility', 'isPinned', 'createdAt'],
    notifications: ['title', 'type', 'status', 'createdAt'],
    materials: ['title', 'subject', 'grade', 'status', 'audience', 'createdAt'],
    meals: ['mainDish', 'sideDish', 'mealType', 'dayOfWeek', 'weekStart'],
  }

  const columnKeys = (() => {
    if (!records.length || !def) return []
    const first = records[0]
    const priority = COLUMN_PRIORITY[entityKey] || []
    const allKeys = Object.keys(first).filter(
      (k) =>
        !def.hiddenFields.includes(k) &&
        !def.sensitiveFields.includes(k) &&
        !['password', 'sessionToken'].some((s) => k.toLowerCase().includes(s.toLowerCase())),
    )
    const ordered = [...priority.filter((k) => allKeys.includes(k)), ...allKeys.filter((k) => !priority.includes(k))]
    return ordered.slice(0, 8)
  })()

  const tableColumns = (() => {
    const displayColumnKeys = isMobile ? columnKeys.slice(0, 3) : columnKeys
    const cols: Record<string, unknown>[] = displayColumnKeys.map((k) => ({
      title: FIELD_LABEL_MAP[k] || k,
      dataIndex: k,
      key: k,
      ellipsis: true,
      width: k === 'status' ? 96 : k === 'id' ? 110 : k === 'createdAt' || k === 'updatedAt' || k === 'lessonDate' ? 150 : 150,
      render: (val: unknown) => {
        if (k === 'status' && typeof val === 'string') {
          return statusTag(val)
        }
        if (k === 'membershipLevel' && typeof val === 'string') {
          return <span style={{ fontSize: 12, fontWeight: 700, color: val === 'SVIP' ? '#B98A2F' : val === 'VIP' ? '#4E7FC7' : '#98A2B3' }}>{MEMBERSHIP_LABEL[val] || val}</span>
        }
        if (k === 'id' && typeof val === 'string') {
          return <span style={{ fontSize: 12, color: '#98A2B3', fontFamily: 'ui-monospace, monospace' }}>{val.slice(0, 8)}…</span>
        }
        if (k === 'createdAt' || k === 'updatedAt' || k === 'enrolledAt' || k === 'settledAt' || k === 'deletedAt') {
          if (typeof val === 'string' || val instanceof Date) {
            return <span style={{ fontSize: 12, color: '#5A6472', fontVariantNumeric: 'tabular-nums' }}>{formatDateShort(val)}</span>
          }
        }
        if (k === 'lessonDate' && typeof val === 'string') {
          return <span style={{ fontSize: 12.5 }}>{val.slice(0, 10)}</span>
        }
        if (k === 'name' || k === 'title') {
          return <span style={{ fontWeight: 650, color: '#17352F' }}>{String(val)}</span>
        }
        return <span style={{ fontSize: 12.5 }}>{formatValue(val)}</span>
      },
    }))

    cols.push({
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right' as const,
      render: (_: unknown, record: Record<string, unknown>) => {
        const deleted = DATA_ADMIN_TRASH_ENTITIES.includes(entityKey) ? Boolean(record.deletedAt) : isDeletedRecord(record)
        return (
          <Space size="small">
            <Tooltip title="查看详情">
              <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)} />
            </Tooltip>
            {!deleted && def !== null && def.editableFields.length > 0 && (
              <Tooltip title="编辑">
                <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
              </Tooltip>
            )}
            {DATA_ADMIN_TRASH_ENTITIES.includes(entityKey) && (!deleted ? (
              <Tooltip title="软删除">
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteClick(record)} />
              </Tooltip>
            ) : (
              <Tooltip title="恢复">
                <Button
                  size="small"
                  icon={<UndoOutlined />}
                  loading={restoringId === record.id}
                  onClick={() => handleRestore(record.id as string)}
                />
              </Tooltip>
            ))}
            {entityKey === 'enrollments' && !deleted && (
              <Tooltip title="课时调整">
                <Button size="small" icon={<SettingOutlined />} onClick={() => setHourAdjustOpen(true)} />
              </Tooltip>
            )}
          </Space>
        )
      },
    })

    return cols
  })()

  const handleExport = async () => {
    if (!def) return
    try {
      message.info('正在导出全部数据，请稍候...')
      const all: Record<string, unknown>[] = []
      let page = 1
      const pageSize = 100
      for (;;) {
        const params = new URLSearchParams({ page: String(page), limit: String(pageSize) })
        if (includeDeleted) params.set('includeDeleted', 'true')
        if (statusFilter) params.set('status', statusFilter)
        if (search) params.set('search', search)
        const res = await fetch(`/api/admin/data-admin/${entityKey}?${params.toString()}`)
        const result = await res.json()
        if (!res.ok || !result.success) throw new Error(result.error || '导出失败')
        all.push(...(result.data || []))
        if (!result.meta || page >= (result.meta.totalPages ?? 1)) break
        page += 1
      }
      if (!all.length) {
        message.warning('没有可导出的数据')
        return
      }
      const headers = Object.keys(all[0]).filter(
        (k) => !def.sensitiveFields.includes(k) && !def.hiddenFields.includes(k) && !['password', 'sessionToken'].some((s) => k.toLowerCase().includes(s.toLowerCase())),
      )
      const csvEscape = (value: unknown): string => {
        if (value === null || value === undefined) return ''
        let text = ''
        if (value instanceof Date) text = value.toISOString()
        else if (typeof value === 'object') text = JSON.stringify(value)
        else text = String(value)
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
      }
      const lines = [
        headers.map((k) => FIELD_LABEL_MAP[k] || k).join(','),
        ...all.map((record) => headers.map((k) => csvEscape(record[k])).join(',')),
      ]
      const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `牧哲学堂_${def.label}-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      message.success(`导出成功，共 ${all.length} 条`)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导出失败')
    }
  }

  const handleExportHealth = () => {
    if (!healthData?.data) return
    const blob = new Blob([JSON.stringify(healthData.data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `data-health-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <PageLayout
      title="数据管理中心"
      subtitle="用于查看、筛选、维护系统核心业务数据。请谨慎修改，重要操作会记录日志。"
      actions={
        <Space wrap style={{ rowGap: 8 }}>
          {isHealthTab ? (
            <>
              <Button shape="round" icon={<ReloadOutlined />} onClick={() => healthMutate()}>刷新检查</Button>
              <Button shape="round" icon={<DownloadOutlined />} onClick={handleExportHealth}>导出问题</Button>
            </>
          ) : gatedActiveTab === 'backup-restore' ? (
            <Button shape="round" icon={<RestOutlined />} onClick={() => router.push('/trash')}>查看回收站</Button>
          ) : (
            <>
              <Button shape="round" icon={<ReloadOutlined />} onClick={() => mutate()}>刷新</Button>
              <Button
                shape="round"
                type="primary"
                icon={<ExportOutlined />}
                onClick={handleExport}
                style={{ background: BRAND.deep, borderColor: BRAND.deep, boxShadow: '0 3px 10px rgba(14,94,78,.25)' }}
              >
                导出
              </Button>
              {entityKey === 'enrollments' && (
                <Button shape="round" type="primary" icon={<SettingOutlined />} onClick={() => setHourAdjustOpen(true)}>课时调整</Button>
              )}
              <Button shape="round" onClick={() => router.push(DATA_ADMIN_BUSINESS_LINKS[entityKey])}>前往业务管理</Button>
            </>
          )}
        </Space>
      }
    >
      {/* 业务概览卡 */}
      <div style={{
        display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, minmax(0,1fr))' : 'repeat(7, minmax(0,1fr))',
        gap: 10, marginBottom: 16,
      }}>
        {overviewItems.map((item) => {
          const active = gatedActiveTab === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key)}
              style={{
                cursor: 'pointer', border: `1px solid ${active ? '#C9A45C' : '#EDE9E1'}`,
                borderRadius: 14, background: active ? '#FFFDF7' : '#fff', padding: '12px 10px',
                textAlign: 'left', boxShadow: active ? '0 2px 10px rgba(201,164,92,.18)' : 'none',
                fontFamily: 'inherit',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? 'linear-gradient(135deg,#C9A45C,#B98A2F)' : 'rgba(14,94,78,.1)',
                  color: active ? '#fff' : BRAND.deep, fontSize: 15,
                }}>{item.icon}</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: BRAND.ink, fontVariantNumeric: 'tabular-nums' }}>{item.value}</span>
              </div>
              <div style={{ marginTop: 7, fontSize: 12, fontWeight: 700, color: '#1F2329' }}>{item.label}</div>
              <div style={{ fontSize: 10.5, color: '#98A2B3', marginTop: 1 }}>{item.sub}</div>
            </button>
          )
        })}
      </div>

      <div style={{
        display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 14, padding: '11px 14px',
        borderRadius: 12, background: 'linear-gradient(135deg, rgba(201,164,92,.12), rgba(242,227,182,.18))',
        border: '1px solid rgba(201,164,92,.35)', fontSize: 12.5, color: '#6B5424', lineHeight: 1.7,
      }}>
        <WarningOutlined style={{ marginTop: 2, color: '#B98A2F' }} />
        <span>重要数据请优先通过对应业务模块修改；删除操作会记录日志并支持恢复；课时数据请通过「课时调整」入口处理，不要直接编辑。</span>
      </div>
      {!isHealthTab && dataError && (
        <Alert
          type="error"
          showIcon
          message={dataError instanceof Error ? dataError.message : '数据加载失败'}
          action={<Button size="small" onClick={() => void mutate()}>重试</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <AdaptiveSelect
          aria-label="选择数据诊断模块"
          value={gatedActiveTab}
          onChange={value => setActiveTab(value as EntityKey | 'health' | 'backup-restore')}
          style={{ width: isMobile ? '100%' : 360, minHeight: 44, maxWidth: '100%' }}
          options={[
            { label: '诊断与维护', keys: ['health', 'backup-restore'] },
            { label: '人员与报名', keys: ['students', 'teachers', 'enrollments'] },
            { label: '课程与教学', keys: ['class-groups', 'class-lessons', 'attendances', 'exam-papers', 'classroom-feedbacks', 'performance-posts', 'materials'] },
            { label: '通知与服务', keys: ['notifications', 'meals'] },
          ].map(group => ({ label: group.label, options: visibleTabs.filter(tab => group.keys.includes(tab.key)).map(tab => ({ value: tab.key, label: tab.label })) }))}
        />
        <Button shape="round" icon={<RestOutlined />} onClick={() => router.push('/trash')}>回收站</Button>
        <Button shape="round" icon={<SettingOutlined />} onClick={() => router.push('/settings')}>系统设置</Button>
      </div>

      {gatedActiveTab === 'backup-restore' ? (
        <BackupRestorePanel isSuperAdmin={currentIsSuperAdmin} />
      ) : isHealthTab ? (
        <div>
          {healthData?.data ? (
            healthData.data.length === 0 ? (
              <Empty description="未发现数据问题，数据状态良好" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Table
                dataSource={(healthData.data as unknown as Array<{ label: string; count: number; severity: string; description: string; sampleIds?: string[] }>).map((issue, i) => ({ ...issue, key: i }))}
                columns={[
                  { title: '问题', dataIndex: 'label', key: 'label', width: 200 },
                  { title: '数量', dataIndex: 'count', key: 'count', width: 80 },
                  {
                    title: '严重程度',
                    dataIndex: 'severity',
                    key: 'severity',
                    width: 100,
                    render: (s: string) => {
                      const color = s === 'high' ? 'red' : s === 'medium' ? 'orange' : 'blue'
                      const labels = { high: '高', medium: '中', low: '低' }
                      return <Tag color={color}>{labels[s as keyof typeof labels]}</Tag>
                    },
                  },
                  { title: '说明', dataIndex: 'description', key: 'description' },
                  {
                    title: '样例ID',
                    dataIndex: 'sampleIds',
                    key: 'sampleIds',
                    width: 200,
                    render: (ids: string[], issue: { label?: string }) => issue.label?.includes('待人工核对')
                      ? <Space wrap>{ids?.slice(0, 5).map((id) => <Button key={id} type="link" size="small" loading={identityReviewLoading} onClick={() => void openIdentityReview(id)}>{id}</Button>)}</Space>
                      : ids?.slice(0, 5).join(', ') || '-',
                  },
                ]}
                size="small"
                pagination={false}
              />
            )
          ) : healthError ? (
            <Alert
              type="error"
              showIcon
              message={healthError instanceof Error ? healthError.message : '数据健康检查失败'}
              action={<Button size="small" onClick={() => void healthMutate()}>重试检查</Button>}
            />
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin /></div>
          )}
          <Card
            size="small"
            title="最近课程变更与家长通知"
            extra={<Button size="small" icon={<ReloadOutlined />} onClick={() => void courseChangeMutate()}>刷新</Button>}
            style={{ marginTop: 16 }}
          >
            {courseChangeError ? (
              <Alert type="error" showIcon message={courseChangeError instanceof Error ? courseChangeError.message : '课程变更记录加载失败'} action={<Button size="small" onClick={() => void courseChangeMutate()}>重试</Button>} />
            ) : courseChangesLoading ? <Spin /> : Array.isArray((courseChangeData as { events?: unknown[] } | undefined)?.events) && (courseChangeData as { events: Array<Record<string, unknown>> }).events.length > 0 ? (
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ x: 760 }}
                dataSource={(courseChangeData as { events: Array<Record<string, unknown>> }).events}
                columns={[
                  { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 150, render: (value: string) => new Date(value).toLocaleString('zh-CN') },
                  { title: '变更', dataIndex: 'title', key: 'title', width: 170 },
                  { title: '说明', dataIndex: 'summary', key: 'summary', ellipsis: true },
                  { title: '站内通知', key: 'notices', width: 130, render: (_: unknown, row: Record<string, unknown>) => {
                    const delivery = row.delivery as { expectedInApp?: number; createdInApp?: number; readCount?: number; failed?: unknown[] } | undefined
                    return `${delivery?.createdInApp ?? 0}/${delivery?.expectedInApp ?? 0} 已建，${delivery?.readCount ?? 0} 已读`
                  } },
                  { title: '推送异常', key: 'push', width: 100, render: (_: unknown, row: Record<string, unknown>) => {
                    const delivery = row.delivery as { failed?: unknown[] } | undefined
                    return delivery?.failed?.length ? <Tag color="red">{delivery.failed.length} 条</Tag> : <Tag color="green">无</Tag>
                  } },
                ]}
              />
            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无课程变更记录" />}
          </Card>
        </div>
      ) : (
        <div>
          {/* Search & Filter bar */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: isMobile ? 'stretch' : 'center' }}>
            <Input
              placeholder={`搜索${def?.label || ''}...`}
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: isMobile ? '100%' : 250, borderRadius: 10 }}
              allowClear
            />
            {STATUS_FILTER_MAP[entityKey] && (
              <AdaptiveSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={STATUS_FILTER_MAP[entityKey]}
                style={{ width: isMobile ? '100%' : 150 }}
              />
            )}
            <Button
              type={includeDeleted ? 'primary' : 'default'}
              danger={includeDeleted}
              icon={includeDeleted ? <DeleteOutlined /> : <RestOutlined />}
              onClick={() => setIncludeDeleted(!includeDeleted)}
              style={includeDeleted ? undefined : { borderRadius: 10 }}
            >
              {includeDeleted ? '显示已删除' : '显示已删除/归档'}
            </Button>
            {entityKey === 'enrollments' && (
              <Button type="primary" icon={<SettingOutlined />} onClick={() => setHourAdjustOpen(true)}>
                课时调整
              </Button>
            )}
            {total > 0 && (
              <span style={{ marginLeft: 'auto', fontSize: 12.5, color: '#98A2B3', alignSelf: 'center' }}>
                共 <strong style={{ color: BRAND.deep }}>{total}</strong> 条{includeDeleted ? '（含已删除/归档）' : ''}
              </span>
            )}
          </div>

          {selectedRowKeys.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
                marginBottom: 12,
                padding: '10px 14px',
                borderRadius: 12,
                background: 'rgba(242,227,182,.35)',
                border: '1px solid rgba(201,164,92,.4)',
              }}
            >
              <Text strong style={{ color: '#8A6B2F' }}>已选择 {selectedRowKeys.length} 条</Text>
              {includeDeleted ? (
                <Button
                  icon={<UndoOutlined />}
                  loading={batchLoading}
                  disabled={!supportsBatch}
                  onClick={() => handleBatchAction('restore')}
                >
                  批量恢复
                </Button>
              ) : (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  loading={batchLoading}
                  disabled={!supportsBatch}
                  onClick={() => Modal.confirm({ title: `将所选 ${selectedRowKeys.length} 条记录移入回收站？`, content: '关联的课次、报名或材料可能一并受影响。请确认选择范围；逐条结果将在操作完成后显示。', okText: '确认移入回收站', cancelText: '取消', okButtonProps: { danger: true }, onOk: () => handleBatchAction('softDelete') })}
                >
                  批量软删除
                </Button>
              )}
              {entityKey === 'notifications' && (
                <Button loading={batchLoading} onClick={() => handleBatchAction('markRead')}>
                  批量标记已读
                </Button>
              )}
              {!supportsBatch && entityKey !== 'notifications' && <Text type="secondary">该类型暂不支持批量操作</Text>}
              <Button onClick={() => setSelectedRowKeys([])}>取消选择</Button>
            </div>
          )}

          {/* Table */}
          <Table
            rowKey="id"
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            dataSource={records.map((r: Record<string, unknown> & { key?: string }) => ({ ...r, key: r.key ?? (r.id as string) }))}
            columns={tableColumns}
            loading={isLoading}
            size="small"
            scroll={{ x: isMobile ? 400 : 'max-content' }}
            pagination={false}
            locale={{ emptyText: <Empty description="暂无数据" /> }}
          />

          {/* Pagination */}
          {total > limit && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
              <Pagination
                current={page}
                total={total}
                pageSize={limit}
                onChange={setPage}
                showSizeChanger={false}
                showTotal={(t) => `共 ${t} 条`}
              />
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {def && (
        <BrandModal
          title={`编辑${def.label}`}
          open={editModalOpen}
          onOk={handleEditSave}
          onCancel={() => setEditModalOpen(false)}
          confirmLoading={editLoading}
          okText="保存"
          cancelText="取消"
          width={520}
        >
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            {def.editableFields.map((f) => (
              <div key={f}>
                <Text type="secondary" style={{ fontSize: 12 }}>{FIELD_LABEL_MAP[f] || f}</Text>
                {f === 'birthYear' || f === 'graduationYear' ? <InputNumber min={1900} max={new Date().getFullYear() + 10} precision={0} value={typeof editData[f] === 'number' ? editData[f] : null} onChange={(value) => setEditData({ ...editData, [f]: value })} style={{ marginTop: 2, width: '100%' }} /> : <Input.TextArea
                  value={editData[f] === null || editData[f] === undefined ? '' : String(editData[f])}
                  onChange={(e) => setEditData({ ...editData, [f]: e.target.value })}
                  style={{ marginTop: 2 }}
                  autoSize={{ minRows: 2, maxRows: 8 }} maxLength={10000}
                />}
              </div>
            ))}
          </Space>
        </BrandModal>
      )}

      {/* Delete Confirmation Modal */}
      <BrandModal
        title="确认删除"
        open={deleteModalOpen}
        onOk={handleDeleteConfirm}
        onCancel={() => setDeleteModalOpen(false)}
        confirmLoading={deleteLoading}
        okText="确认删除"
        cancelText="取消"
        okButtonProps={{ danger: true, disabled: deletePreviewLoading || !deleteImpact || !deleteReason.trim() }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <div>确认删除 <Text strong>{deletingRecord ? getRecordName(deletingRecord) : ''}</Text>？</div>
          <Card size="small" loading={deletePreviewLoading} className="impact-list" styles={{ body: { background: 'var(--color-surface-3)' } }}><Text>{deleteImpact?.summary || '正在计算关联影响…'}</Text></Card>
          <Alert className="modal-note" type="info" showIcon message="核心业务数据会进入回收站，保留期内可恢复；关联的排课占用会立即释放。" />
          <div>
            <Text type="secondary">删除原因（必填）</Text>
            <Input.TextArea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="请填写删除原因"
              rows={3}
              style={{ marginTop: 4 }}
            />
          </div>
        </Space>
      </BrandModal>

      <BrandModal
        title="核对并关联学员身份"
        open={identityReviewOpen}
        onCancel={() => setIdentityReviewOpen(false)}
        onOk={() => void confirmIdentityMerge()}
        confirmLoading={identityMergeLoading}
        okText="确认关联"
        cancelText="取消"
        okButtonProps={{ disabled: identitySelectedIds.length < 2 || !identityMergeConfirmed }}
        destroyOnHidden
      >
        <Alert
          type="warning"
          showIcon
          message="请先确认是同一个孩子"
          description="系统不会依据姓名自动合并。关联后，家长端会把所选档案的历史记录汇总为同一名学员；不同孩子不要一起选择。"
          style={{ marginBottom: 16 }}
        />
        <Space direction="vertical" style={{ width: '100%' }}>
          <label>
            主档案
            <AdaptiveSelect
              value={identityCanonicalId || undefined}
              onChange={setIdentityCanonicalId}
              style={{ width: '100%', marginTop: 6 }}
              options={identityRecords.map((record) => ({ value: record.id, label: `${record.name} · ${record.grade || '年级未填'} · ${record.id}` }))}
            />
          </label>
          <label>
            选择属于同一孩子的档案
            <AdaptiveSelect
              mode="multiple"
              value={identitySelectedIds}
              onChange={setIdentitySelectedIds}
              style={{ width: '100%', marginTop: 6 }}
              options={identityRecords.map((record) => ({
                value: record.id,
                label: `${record.name} · ${record.grade || '年级未填'} · ${record.birthYear || '出生年未填'} · ${record.id}`,
              }))}
            />
          </label>
          <Checkbox checked={identityMergeConfirmed} onChange={(event) => setIdentityMergeConfirmed(event.target.checked)}>
            我已核实所选档案属于同一名学员
          </Checkbox>
        </Space>
      </BrandModal>

      {/* Detail Drawer */}
      <DetailDrawer open={detailOpen} onClose={() => setDetailOpen(false)} entityKey={entityKey} record={detailRecord} />

      {/* Hour Adjustment Modal */}
      <HourAdjustmentModal open={hourAdjustOpen} onClose={() => setHourAdjustOpen(false)} />
    </PageLayout>
  )
}
