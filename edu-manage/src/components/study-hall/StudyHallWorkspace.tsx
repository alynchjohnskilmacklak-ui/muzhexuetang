'use client'

import { useMemo, useState } from 'react'
import {
  Alert, App, Button, Card, Checkbox, Col, DatePicker, Drawer, Empty, Form, Image, Input, InputNumber, List,
  Progress, Radio, Row, Select, Space, Steps, Switch, Tabs, Tag, Typography, Upload, theme,
} from 'antd'
import {
  ArrowLeftOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, DeleteOutlined, EditOutlined,
  MinusCircleOutlined, PlusOutlined, SaveOutlined, TeamOutlined, UploadOutlined, UsergroupAddOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import useSWR from 'swr'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSignedUrls } from '@/hooks/useSignedUrls'
import { compressFeedbackImage, uploadFeedbackImage } from '@/lib/client-image-upload'
import { protectedUploadFallback } from '@/lib/upload-url'
import { SafeFormModal } from '@/components/Common/SafeFormModal'

const { Title, Text, Paragraph } = Typography

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || '加载失败')
  return payload
}

type Teacher = { id: string; name: string; email?: string; teacher?: { subjects?: string | null } | null }
type Student = { id: string; name: string; grade?: string | null; school?: string | null }
type Session = { id: string; weekday: number; slot: string; label: string; startTime: string; endTime: string; teacherId?: string | null; subject?: string | null; teacher?: Teacher | null; active: boolean }
type Entry = {
  id: string; studentId: string; sessionId?: string | null; attendanceKey: string
  homeworkStatus: string; homeworkItems: string[]; teacherComment?: string | null; imageUrls: string[]
  contentType?: 'HOMEWORK' | 'LESSON'; beforeImageUrls?: string[]; afterImageUrls?: string[]; lessonImageUrls?: string[]
  checkedIn: boolean; checkInAt?: string | null; checkOutAt?: string | null
  attendanceStatus?: 'PRESENT' | 'PERSONAL_LEAVE' | 'ABSENT' | 'UNRECORDED'
}
type Membership = { id: string; status: string; joinedAt: string; purchasedDays?: number | null; adjustedDays?: number; student: Student }
type Balance = { studentId: string; purchasedDays: number | null; adjustedDays: number; totalDays: number | null; usedDays: number; remainingDays: number | null; quotaState: 'UNSET' | 'ACTIVE' | 'LOW' | 'EXPIRED' }
type StudyClass = {
  id: string; name: string; scheduleType: 'WEEKDAY_LATE' | 'WEEKEND'; gradeScope?: string[]; weekdays: number[]; status: string
  timeWindowStart?: string | null; timeWindowEnd?: string | null
  term: { id: string; name: string; status: string }
  teachers: Array<{ id: string; active: boolean; teacher: Teacher }>
  students: Membership[]; sessions: Session[]; balances: Balance[]
  records: Array<{ id: string; studyDate: string; entries: Entry[]; recordedBy?: { name: string } }>
}
type StudyData = {
  terms: Array<{ id: string; name: string; status: string }>; selectedTermId?: string
  teachers: Teacher[]; students: Student[]; classes: StudyClass[]
  closures?: Array<{ id: string; classId?: string | null; startDate: string; endDate: string; reason: string }>
  contextState?: 'READY' | 'NO_ACTIVE_TERM'; contextMessage?: string
}

const HOMEWORK_OPTIONS = [
  { value: 'COMPLETED', label: '作业已完成', color: 'success' },
  { value: 'PARTIAL', label: '部分完成', color: 'warning' },
  { value: 'NEEDS_FOLLOW_UP', label: '需要跟进', color: 'error' },
  { value: 'NOT_RECORDED', label: '暂未登记', color: 'default' },
]
const CLASS_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: '进行中' }, { value: 'PAUSED', label: '已暂停' },
  { value: 'COMPLETED', label: '已结束' }, { value: 'ARCHIVED', label: '已归档' },
]
const WEEKDAY_OPTIONS = [
  { label: '周一', value: 1 }, { label: '周二', value: 2 }, { label: '周三', value: 3 },
  { label: '周四', value: 4 }, { label: '周五', value: 5 }, { label: '周六', value: 6 }, { label: '周日', value: 7 },
]
const GRADE_OPTIONS = ['小学一年级', '小学二年级', '小学三年级', '小学四年级', '小学五年级', '小学六年级', '初一', '初二', '初三', '高一', '高二', '高三'].map((value) => ({ value, label: value }))
const teacherSubjects = (teacher?: Teacher) => (teacher?.teacher?.subjects || '').split(/[,，、/\s]+/).map((item) => item.trim()).filter(Boolean)
const weekdayLabel = (value: number) => WEEKDAY_OPTIONS.find((item) => item.value === value)?.label || `周${value}`
const isoWeekday = (value: dayjs.Dayjs) => value.day() === 0 ? 7 : value.day()
const getMobilePopupContainer = (trigger: HTMLElement) => trigger.parentElement || document.body

export function StudyHallWorkspace({ admin, embedded = false, initialClassId, initialDate }: { admin: boolean; embedded?: boolean; initialClassId?: string; initialDate?: string }) {
  const isMobile = useIsMobile()
  const { token } = theme.useToken()
  const { modal } = App.useApp()
  const [activeTab, setActiveTab] = useState('overview')
  const [expandedAuditTeacherId, setExpandedAuditTeacherId] = useState<string>()
  const [wizardStep, setWizardStep] = useState(0)
  const [date, setDate] = useState(initialDate ? dayjs(initialDate) : dayjs())
  const [termId, setTermId] = useState<string>()
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(initialClassId)
  const query = new URLSearchParams({ date: date.format('YYYY-MM-DD'), ...(termId ? { termId } : {}) })
  const { data, error, isLoading, mutate } = useSWR<StudyData>(`/api/study-hall?${query}`, fetcher, {
    refreshInterval: 5000, revalidateOnFocus: true, revalidateOnReconnect: true,
  })
  const [classOpen, setClassOpen] = useState(false)
  const [closureOpen, setClosureOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<StudyClass | null>(null)
  const [recording, setRecording] = useState<{ studyClass: StudyClass; member: Membership; sessionId: string | null } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [beforeImages, setBeforeImages] = useState<string[]>([])
  const [afterImages, setAfterImages] = useState<string[]>([])
  const [lessonImages, setLessonImages] = useState<string[]>([])
  const [classInitialValues, setClassInitialValues] = useState('{}')
  const [closureInitialValues, setClosureInitialValues] = useState('{}')
  const [recordInitialValues, setRecordInitialValues] = useState('{}')
  const [recordInitialMedia, setRecordInitialMedia] = useState('[]')
  const [bulkPurchasedDays, setBulkPurchasedDays] = useState(10)
  const [classForm] = Form.useForm()
  const [closureForm] = Form.useForm()
  const [recordForm] = Form.useForm()
  const classFormValues = Form.useWatch([], classForm)
  const closureFormValues = Form.useWatch([], closureForm)
  const recordFormValues = Form.useWatch([], recordForm)
  const scheduleType = Form.useWatch('scheduleType', classForm)
  const grade = Form.useWatch('grade', classForm) as string | undefined
  const selectedMemberships = Form.useWatch('studentMemberships', classForm) as Array<{ studentId?: string; purchasedDays?: number }> | undefined
  const recordContentType = Form.useWatch('contentType', recordForm) || 'HOMEWORK'
  const recordImages = useMemo(() => [...beforeImages, ...afterImages, ...lessonImages], [beforeImages, afterImages, lessonImages])
  const { urlMap: signedRecordImages } = useSignedUrls(recordImages)
  const allVisibleImages = useMemo(() => data?.classes.flatMap((item) => item.records[0]?.entries.flatMap((entry) => entry.imageUrls) || []) || [], [data])
  const { urlMap: signedVisibleImages } = useSignedUrls(allVisibleImages)
  const activeTermId = termId || data?.selectedTermId || data?.terms.find((item) => item.status === 'ACTIVE')?.id
  const selectedClass = data?.classes.find((item) => item.id === selectedClassId) || data?.classes[0]
  const selectedWeekday = isoWeekday(date)
  const isScheduled = selectedClass?.weekdays.includes(selectedWeekday) ?? false
  const activeClosure = data?.closures?.find((item) => !item.classId || item.classId === selectedClass?.id)
  const activeSessions = selectedClass?.scheduleType === 'WEEKEND'
    ? selectedClass.sessions.filter((session) => session.active && session.weekday === selectedWeekday) : []
  const popupProps = isMobile ? { getPopupContainer: getMobilePopupContainer, listHeight: 240, virtual: false as const } : {}
  const recordPopupProps = isMobile ? { getPopupContainer: getMobilePopupContainer, listHeight: 240, virtual: false as const } : {}

  const submitJson = async (method: string, body: Record<string, unknown>) => {
    const response = await fetch('/api/study-hall', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || '操作失败')
    return payload
  }

  const openCreate = () => {
    setEditingClass(null)
    classForm.resetFields()
    classForm.setFieldsValue({
      termId: activeTermId, name: '', scheduleType: 'WEEKDAY_LATE', weekdays: [1, 2, 3, 4, 5],
      grade: undefined, teacherIds: [], studentMemberships: [], status: 'ACTIVE', sessions: [],
    })
    setWizardStep(0)
    setClassInitialValues(JSON.stringify(classForm.getFieldsValue(true)))
    setClassOpen(true)
  }

  const addStudentsByGrade = () => {
    if (!grade) return toast.warning('请先选择适用年级')
    const current = selectedMemberships || []
    const selectedIds = new Set(current.map((item) => item.studentId).filter(Boolean))
    const eligible = (data?.students || []).filter((student) => student.grade === grade && !selectedIds.has(student.id))
    if (!eligible.length) return toast.info('所选年级的在读学员已经全部加入')
    classForm.setFieldValue('studentMemberships', [
      ...current,
      ...eligible.map((student) => ({ studentId: student.id, purchasedDays: bulkPurchasedDays })),
    ])
    toast.success(`已加入${eligible.length}名${grade}学员`)
  }

  const openEdit = (studyClass: StudyClass) => {
    setEditingClass(studyClass)
    classForm.resetFields()
    classForm.setFieldsValue({
      termId: studyClass.term.id, name: studyClass.name, scheduleType: studyClass.scheduleType,
      grade: studyClass.gradeScope?.[0], weekdays: studyClass.weekdays, timeWindowStart: studyClass.timeWindowStart, timeWindowEnd: studyClass.timeWindowEnd,
      teacherIds: studyClass.teachers.filter((item) => item.active).map((item) => item.teacher.id),
      studentMemberships: studyClass.students.filter((item) => item.status === 'ACTIVE').map((item) => ({ studentId: item.student.id, purchasedDays: item.purchasedDays })),
      status: studyClass.status,
      sessions: studyClass.sessions.filter((item) => item.active).map(({ weekday, startTime, endTime, teacherId, subject }) => ({ weekday, startTime, endTime, teacherId, subject })),
    })
    setWizardStep(0)
    setClassInitialValues(JSON.stringify(classForm.getFieldsValue(true)))
    setClassOpen(true)
  }

  const saveClass = async () => {
    setSubmitting(true)
    try {
      const values = await classForm.validateFields()
      const { grade: selectedGrade, ...requestValues } = values
      await submitJson(editingClass ? 'PUT' : 'POST', { ...requestValues, gradeScope: selectedGrade ? [selectedGrade] : [], termId: values.termId || activeTermId, ...(editingClass ? { classId: editingClass.id } : {}) })
      toast.success(editingClass ? '作业班安排已更新，教师更换历史已保留' : '作业班已创建')
      setClassOpen(false)
      classForm.resetFields()
      await mutate()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '保存失败')
    } finally { setSubmitting(false) }
  }

  const entryFor = (studyClass: StudyClass, studentId: string, sessionId: string | null) => {
    const key = sessionId ? `SESSION:${sessionId}` : 'DAY'
    return studyClass.records[0]?.entries.find((entry) => entry.studentId === studentId && entry.attendanceKey === key)
  }

  const openRecord = (studyClass: StudyClass, member: Membership, sessionId: string | null) => {
    const entry = entryFor(studyClass, member.student.id, sessionId)
    setRecording({ studyClass, member, sessionId })
    recordForm.resetFields()
    recordForm.setFieldsValue({
      homeworkStatus: entry?.homeworkStatus || 'COMPLETED', homeworkItemsText: entry?.homeworkItems.join('\n') || '',
      teacherComment: entry?.teacherComment || '', contentType: entry?.contentType || 'HOMEWORK', checkedIn: entry ? Boolean(entry.checkedIn) : true, checkedOut: Boolean(entry?.checkOutAt),
      attendanceStatus: entry?.attendanceStatus || 'PRESENT',
    })
    setRecordInitialValues(JSON.stringify(recordForm.getFieldsValue(true)))
    const initialBeforeImages = entry?.beforeImageUrls || []
    const initialAfterImages = entry?.afterImageUrls?.length ? entry.afterImageUrls : entry?.imageUrls || []
    const initialLessonImages = entry?.lessonImageUrls || []
    setBeforeImages(initialBeforeImages)
    setAfterImages(initialAfterImages)
    setLessonImages(initialLessonImages)
    setRecordInitialMedia(JSON.stringify([initialBeforeImages, initialAfterImages, initialLessonImages]))
  }

  const saveRecord = async () => {
    if (!recording) return
    setSubmitting(true)
    try {
      const values = await recordForm.validateFields()
      const payload = await submitJson('PATCH', {
        classId: recording.studyClass.id, studentId: recording.member.student.id, sessionId: recording.sessionId,
        studyDate: date.format('YYYY-MM-DD'), homeworkStatus: values.homeworkStatus,
        homeworkItems: String(values.homeworkItemsText || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
        teacherComment: values.teacherComment, contentType: values.contentType,
        beforeImageUrls: beforeImages, afterImageUrls: afterImages, lessonImageUrls: lessonImages,
        imageUrls: values.contentType === 'LESSON' ? lessonImages : [...beforeImages, ...afterImages], checkedIn: values.checkedIn, checkedOut: values.checkedOut,
        attendanceStatus: values.attendanceStatus,
      })
      const reward = payload.reward as { amount?: number; alreadyAwarded?: boolean } | undefined
      toast.success(reward?.amount ? `作业与考勤已保存，本次登记奖励 ¥${reward.amount.toFixed(2)}` : '作业与考勤已保存，家长通知已同步')
      setRecording(null)
      recordForm.resetFields()
      await mutate()
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : '保存失败') }
    finally { setSubmitting(false) }
  }

  const openClosure = () => {
    closureForm.resetFields()
    closureForm.setFieldsValue({ scope: 'ALL', classIds: selectedClass?.id ? [selectedClass.id] : [], dates: [date, date], reason: '' })
    setClosureInitialValues(JSON.stringify(closureForm.getFieldsValue(true)))
    setClosureOpen(true)
  }

  const saveClosure = async () => {
    setSubmitting(true)
    try {
      const values = await closureForm.validateFields()
      const response = await fetch('/api/study-hall/closures', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ termId: activeTermId, scope: values.scope, classIds: values.classIds, startDate: values.dates[0].format('YYYY-MM-DD'), endDate: values.dates[1].format('YYYY-MM-DD'), reason: values.reason }) })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '设置放假失败')
      toast.success('放假已设置，期间不考勤、不反馈、不扣减天数')
      setClosureOpen(false)
      closureForm.resetFields()
      await mutate()
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : '设置放假失败') }
    finally { setSubmitting(false) }
  }

  const uploadImage = async (file: File, target: 'before' | 'after' | 'lesson') => {
    if (recordImages.length >= 9) return toast.warning('每次记录最多上传9张图片')
    if (file.size > 20 * 1024 * 1024) return toast.error('单张图片不能超过20MB')
    setImageUploading(true)
    try {
      const compressed = await compressFeedbackImage(file)
      const result = await uploadFeedbackImage(compressed.file, () => undefined)
      // Prefer the authenticated application URL returned by /api/upload.
      // A raw storageKey is not a browser URL and used to be discarded by
      // the study-hall API, even though the upload preview looked successful.
      const url = result.url || protectedUploadFallback(result.file?.storageKey)
      if (!url) throw new Error(result.error || '服务器未返回图片地址')
      const setter = target === 'before' ? setBeforeImages : target === 'after' ? setAfterImages : setLessonImages
      setter((current) => current.includes(url) ? current : [...current, url])
      toast.success('图片上传成功')
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : '图片上传失败') }
    finally { setImageUploading(false) }
  }

  const closeClassForm = () => {
    setClassOpen(false)
    setEditingClass(null)
    classForm.resetFields()
  }

  const requestCloseClassForm = () => {
    const dirty = classOpen && JSON.stringify(classFormValues || {}) !== classInitialValues
    if (!dirty) return closeClassForm()
    modal.confirm({
      title: '放弃未保存的修改？', content: '关闭后，本次填写的班级信息不会保存。',
      okText: '放弃修改', cancelText: '继续编辑', okButtonProps: { danger: true }, centered: true, onOk: closeClassForm,
    })
  }

  const goToNextWizardStep = async () => {
    const fields = wizardStep === 0
      ? ['termId', 'grade', 'name', 'scheduleType', ...(editingClass ? ['status'] : [])]
      : wizardStep === 1
        ? scheduleType === 'WEEKEND' ? ['weekdays', 'sessions'] : ['weekdays', 'timeWindowStart', 'timeWindowEnd', 'teacherIds']
        : ['studentMemberships']
    try {
      await classForm.validateFields(fields)
      setWizardStep((current) => Math.min(3, current + 1))
    } catch {
      toast.warning('请先补充当前步骤的必填信息')
    }
  }

  const closeClosureForm = () => {
    setClosureOpen(false)
    closureForm.resetFields()
  }

  const closeRecordForm = () => {
    setRecording(null)
    recordForm.resetFields()
    setBeforeImages([])
    setAfterImages([])
    setLessonImages([])
  }

  const renderImageGroup = (label: string, hint: string, images: string[], target: 'before' | 'after' | 'lesson') => {
    const setter = target === 'before' ? setBeforeImages : target === 'after' ? setAfterImages : setLessonImages
    return <Card size="small" title={label} styles={{ body: { padding: 12 } }}>
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>{hint}（可选）</Text>
        {images.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)', gap: 8 }}>{images.map((url) => <div key={url} style={{ position: 'relative' }}><Image src={signedRecordImages[url] || url} width="100%" height={84} style={{ objectFit: 'cover', borderRadius: token.borderRadius }} alt={label} /><Button danger size="small" shape="circle" icon={<DeleteOutlined />} onClick={() => setter((items) => items.filter((item) => item !== url))} style={{ position: 'absolute', top: 4, right: 4 }} /></div>)}</div>}
        <Upload accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple showUploadList={false} disabled={imageUploading || recordImages.length >= 9} customRequest={async ({ file, onSuccess, onError }) => { try { await uploadImage(file as File, target); onSuccess?.({}) } catch (cause) { onError?.(cause as Error) } }}><Button block={Boolean(isMobile)} icon={<UploadOutlined />} loading={imageUploading}>拍照或选择图片</Button></Upload>
      </Space>
    </Card>
  }

  const overviewGroups = [
    { key: 'WEEKDAY_LATE', title: '晚托按天', description: '平日晚间统一登记到勤与作业完成情况。' },
    { key: 'WEEKEND', title: '周末作业班', description: '按周末具体时段登记，每个时段独立记录。' },
  ] as const

  const classCards = (schedule: StudyClass['scheduleType']) => (data?.classes || []).filter((item) => item.scheduleType === schedule).map((studyClass) => {
    const activeStudents = studyClass.students.filter((item) => item.status === 'ACTIVE')
    const expired = studyClass.balances.filter((item) => item.quotaState === 'EXPIRED').length
    const low = studyClass.balances.filter((item) => item.quotaState === 'LOW').length
    const quotaText = expired ? `${expired}人已到期${low ? `，${low}人天数偏低` : ''}` : low ? `${low}人购买天数偏低` : '购买天数状态正常'
    return <Card key={studyClass.id} className="study-hall-class-card" styles={{ body: { padding: isMobile ? 14 : 20 } }}>
      <Space direction="vertical" size={14} style={{ width: '100%' }}>
        <div>
          <Space wrap size={8}><Title level={4} style={{ margin: 0 }}>{studyClass.name}</Title><Tag color={schedule === 'WEEKEND' ? 'processing' : 'orange'}>{schedule === 'WEEKEND' ? '周末作业班' : '晚托按天'}</Tag></Space>
          <Text type="secondary">{studyClass.gradeScope?.[0] || '未设置年级'} · {studyClass.term.name}</Text>
        </div>
        <div className="study-hall-class-meta">
          <span><TeamOutlined /> 教师：{studyClass.teachers.filter((item) => item.active).map((item) => item.teacher.name).join('、') || '未分配'}</span>
          <span><CalendarOutlined /> {schedule === 'WEEKEND' ? studyClass.sessions.filter((item) => item.active).map((item) => `${weekdayLabel(item.weekday)} ${item.startTime}`).join('、') || '暂无时段' : studyClass.weekdays.map(weekdayLabel).join('、')}</span>
        </div>
        <div className="study-hall-quota-summary">
          <span><strong>{activeStudents.length}</strong> 名在班学员</span>
          <span className={expired ? 'is-danger' : low ? 'is-warning' : 'is-ok'}>{quotaText}</span>
        </div>
        <Space wrap style={{ justifyContent: 'flex-end', width: '100%' }}>
          {admin && <Button icon={<EditOutlined />} onClick={() => openEdit(studyClass)}>管理班级</Button>}
          <Button type="primary" onClick={() => { setSelectedClassId(studyClass.id); setActiveTab('daily') }}>今日登记</Button>
        </Space>
      </Space>
    </Card>
  })

  const dailyRoster = !selectedClass ? <Card loading={isLoading}><Empty description="当前运营期还没有可登记的作业班" /></Card> : <Space direction="vertical" size={14} style={{ width: '100%' }}>
    <Card className="study-hall-selected-class" styles={{ body: { padding: isMobile ? 14 : 18 } }}>
      <Row justify="space-between" align="middle" gutter={[12, 12]}>
        <Col><Space wrap><TeamOutlined /><Text strong>{selectedClass.name}</Text><Tag color={selectedClass.scheduleType === 'WEEKEND' ? 'processing' : 'orange'}>{selectedClass.scheduleType === 'WEEKEND' ? '周末作业班' : '晚托按天'}</Tag></Space></Col>
        {admin && <Col><Button icon={<EditOutlined />} onClick={() => openEdit(selectedClass)}>管理班级</Button></Col>}
      </Row>
    </Card>
    {!isScheduled && <Alert type="info" showIcon message={`${date.format('M月D日')}不是该班的登记日`} description="系统已阻止在非上课日误扣到勤天数。" />}
    {activeClosure && <Alert type="success" showIcon message={`${date.format('M月D日')}已放假：${activeClosure.reason}`} description="当天不需要登记，不扣购买天数，也不会生成缺勤。" />}
    {selectedClass.scheduleType === 'WEEKEND' && isScheduled && activeSessions.length === 0 && <Alert type="warning" showIcon message="当天没有有效时段" description="请管理员在班级设置中补充当天的上课时间。" />}
    <Card loading={isLoading} title={`${date.format('M月D日')}学员名单`} styles={{ body: { padding: isMobile ? '0 14px' : '0 20px' } }}>
      <List dataSource={selectedClass.students.filter((item) => item.status === 'ACTIVE')} locale={{ emptyText: <Empty description="班级暂无在班学员" /> }} renderItem={(member) => {
        const targets = selectedClass.scheduleType === 'WEEKEND' ? activeSessions : [null]
        const balance = selectedClass.balances.find((item) => item.studentId === member.student.id)
        return <List.Item style={{ alignItems: 'flex-start', padding: isMobile ? '14px 0' : '18px 0' }}>
          <div style={{ width: '100%', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12, justifyContent: 'space-between' }}>
            <Space direction="vertical" size={8} style={{ minWidth: 0, flex: 1 }}>
              <Space wrap><Text strong>{member.student.name}</Text><Tag>{member.student.grade || '未填年级'}</Tag>{balance?.quotaState === 'UNSET' && <Tag>未设置购买天数</Tag>}{balance?.remainingDays != null && <Tag color={balance.quotaState === 'EXPIRED' ? 'error' : balance.quotaState === 'LOW' ? 'warning' : 'success'}>{balance.quotaState === 'EXPIRED' ? '已到期' : `剩余 ${balance.remainingDays}/${balance.totalDays} 天`}</Tag>}</Space>
              {targets.map((target) => {
                const entry = entryFor(selectedClass, member.student.id, target?.id || null)
                const meta = HOMEWORK_OPTIONS.find((item) => item.value === entry?.homeworkStatus) || HOMEWORK_OPTIONS[3]
                return <div key={target?.id || 'DAY'} className="study-hall-entry-summary">
                  <Space wrap>{target && <Text strong>{target.label} {target.startTime}—{target.endTime}</Text>}<Tag color={meta.color}>{meta.label}</Tag><Text type="secondary"><ClockCircleOutlined /> {entry?.attendanceStatus === 'PERSONAL_LEAVE' ? '个人请假（已扣1天）' : entry?.attendanceStatus === 'ABSENT' ? '无故缺勤（已扣1天）' : entry?.checkInAt ? `到校 ${dayjs(entry.checkInAt).format('HH:mm')}` : '暂未登记'}</Text></Space>
                  {entry?.homeworkItems.length ? <div><Text>{entry.homeworkItems.join('；')}</Text></div> : null}
                  {entry?.teacherComment && <div><Text type="secondary">{entry.teacherComment}</Text></div>}
                  {entry?.imageUrls.length ? <Image.PreviewGroup><Space wrap size={6} style={{ marginTop: 6 }}>{entry.imageUrls.map((url) => <Image key={url} src={signedVisibleImages[url] || url} width={52} height={52} style={{ objectFit: 'cover', borderRadius: token.borderRadius }} alt={`${member.student.name}作业照片`} />)}</Space></Image.PreviewGroup> : null}
                </div>
              })}
            </Space>
            <Space direction={isMobile ? 'horizontal' : 'vertical'} wrap>{targets.map((target) => <Button key={target?.id || 'DAY'} type="primary" disabled={!isScheduled || Boolean(activeClosure) || selectedClass.status !== 'ACTIVE'} icon={<SaveOutlined />} onClick={() => openRecord(selectedClass, member, target?.id || null)}>{target ? `登记${target.label}` : '登记作业'}</Button>)}</Space>
          </div>
        </List.Item>
      }} />
    </Card>
  </Space>

  const teacherFeedbackAudit = useMemo(() => {
    const rows = new Map<string, { id: string; name: string; classes: Set<string>; expected: number; completed: number; missing: string[] }>()
    for (const studyClass of data?.classes || []) {
      const scheduled = studyClass.weekdays.includes(selectedWeekday)
      const closed = Boolean(data?.closures?.some((item) => !item.classId || item.classId === studyClass.id))
      if (!scheduled || closed || studyClass.status !== 'ACTIVE') continue
      const members = studyClass.students.filter((item) => item.status === 'ACTIVE')
      const recordEntries = studyClass.records[0]?.entries || []
      const responsibilities = studyClass.scheduleType === 'WEEKEND'
        ? studyClass.sessions.filter((session) => session.active && session.weekday === selectedWeekday && session.teacherId)
            .map((session) => ({ teacherId: session.teacherId!, teacherName: session.teacher?.name || '未命名教师', targetId: session.id, targetLabel: session.label }))
        : studyClass.teachers.filter((item) => item.active)
            .map((item) => ({ teacherId: item.teacher.id, teacherName: item.teacher.name, targetId: null, targetLabel: '晚托登记' }))
      for (const responsibility of responsibilities) {
        const current = rows.get(responsibility.teacherId) || {
          id: responsibility.teacherId, name: responsibility.teacherName, classes: new Set<string>(), expected: 0, completed: 0, missing: [],
        }
        current.classes.add(studyClass.name)
        for (const member of members) {
          const key = responsibility.targetId ? `SESSION:${responsibility.targetId}` : 'DAY'
          const completed = recordEntries.some((entry) => entry.studentId === member.student.id && entry.attendanceKey === key)
          current.expected += 1
          if (completed) current.completed += 1
          else current.missing.push(`${studyClass.name} · ${responsibility.targetLabel} · ${member.student.name}`)
        }
        rows.set(responsibility.teacherId, current)
      }
    }
    return [...rows.values()].sort((a, b) => (a.expected - a.completed) - (b.expected - b.completed) || a.name.localeCompare(b.name, 'zh-CN'))
  }, [data?.classes, data?.closures, selectedWeekday])
  const auditCompleteTeachers = teacherFeedbackAudit.filter((item) => item.expected > 0 && item.completed === item.expected).length
  const auditIncompleteTeachers = teacherFeedbackAudit.length - auditCompleteTeachers

  const teacherFeedbackAuditPanel = (
    <Space direction="vertical" size={14} style={{ width: '100%' }}>
      <Card styles={{ body: { padding: isMobile ? 12 : 16 } }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={8}><DatePicker inputReadOnly={Boolean(isMobile)} value={date} onChange={(value) => value && setDate(value)} allowClear={false} style={{ width: '100%' }} /></Col>
          <Col xs={24} md={16}><Text type="secondary">按当天班级安排核对教师是否完成每位学员的作业/课堂登记。</Text></Col>
        </Row>
      </Card>
      <div className="study-hall-audit-summary">
        <div><span>带班教师</span><strong>{teacherFeedbackAudit.length}</strong></div>
        <div><span>已全部完成</span><strong>{auditCompleteTeachers}</strong></div>
        <div><span>未完成/未登记</span><strong>{auditIncompleteTeachers}</strong></div>
      </div>
      <Card title={`${date.format('M月D日')} 教师反馈完成情况`} styles={{ body: { padding: 0 } }}>
        {teacherFeedbackAudit.length ? teacherFeedbackAudit.map((item) => {
          const percent = item.expected ? Math.round(item.completed / item.expected * 100) : 0
          const expanded = expandedAuditTeacherId === item.id
          return <div className="study-hall-audit-row" key={item.id}>
            <button type="button" onClick={() => setExpandedAuditTeacherId(expanded ? undefined : item.id)} aria-expanded={expanded}>
              <div>
                <strong>{item.name}</strong>
                <span>{[...item.classes].join('、')}</span>
              </div>
              <div className="study-hall-audit-row__progress">
                <Tag color={percent === 100 ? 'success' : percent > 0 ? 'warning' : 'error'}>
                  {item.completed}/{item.expected} {percent === 100 ? '已完成' : percent > 0 ? '部分完成' : '未登记'}
                </Tag>
              </div>
            </button>
            <Progress
              percent={percent}
              showInfo={false}
              strokeColor={percent === 100 ? 'var(--color-success)' : percent > 0 ? 'var(--color-warning)' : 'var(--color-error)'}
              trailColor="var(--color-surface-3)"
              size="small"
            />
            {expanded && <div className="study-hall-audit-missing">
              {item.missing.length ? item.missing.map((label) => <span key={label}>{label}</span>) : <Text type="secondary">本日应登记内容已全部完成。</Text>}
            </div>}
          </div>
        }) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当天没有需要审查的教师反馈" style={{ padding: 36 }} />}
      </Card>
    </Space>
  )

  const teacherMembers = selectedClass?.students.filter((item) => item.status === 'ACTIVE') || []
  const teacherTargets = selectedClass?.scheduleType === 'WEEKEND' ? activeSessions : [null]
  const teacherTargetCount = teacherMembers.length * teacherTargets.length
  const teacherRecordedCount = selectedClass ? teacherMembers.reduce((count, member) => (
    count + teacherTargets.filter((target) => Boolean(entryFor(selectedClass, member.student.id, target?.id || null))).length
  ), 0) : 0
  const teacherDailyRoster = !selectedClass ? (
    <Card loading={isLoading} className="study-hall-teacher-empty">
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前还没有分配给你的作业班" />
      <Text type="secondary">管理员分配班级和学员后，就可以在这里完成每日登记。</Text>
    </Card>
  ) : (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card className="study-hall-teacher-progress" styles={{ body: { padding: isMobile ? 14 : 18 } }}>
        <div className="study-hall-teacher-progress__top">
          <div>
            <Text strong>{selectedClass.name}</Text>
            <div><Text type="secondary">{date.format('M月D日 dddd')} · {selectedClass.gradeScope?.[0] || '未设置年级'}</Text></div>
          </div>
          <div className="study-hall-teacher-progress__number"><strong>{teacherRecordedCount}</strong><span> / {teacherTargetCount} 已登记</span></div>
        </div>
        <div className="study-hall-teacher-progress__bar"><span style={{ width: `${teacherTargetCount ? Math.round(teacherRecordedCount / teacherTargetCount * 100) : 0}%` }} /></div>
      </Card>
      {!isScheduled && <Alert type="info" showIcon message={`${date.format('M月D日')}不是该班的登记日`} description="非上课日不需要登记，系统也不会扣除购买天数。" />}
      {activeClosure && <Alert type="success" showIcon message={`今日放假：${activeClosure.reason}`} description="当天不考勤、不反馈、不扣购买天数。" />}
      {selectedClass.scheduleType === 'WEEKEND' && isScheduled && activeSessions.length === 0 && <Alert type="warning" showIcon message="今天没有有效授课时段" description="请联系管理员补充当天的上课时间。" />}
      <Card className="study-hall-teacher-roster" loading={isLoading} styles={{ body: { padding: 0 } }}>
        {teacherMembers.length ? teacherMembers.map((member) => {
          const balance = selectedClass.balances.find((item) => item.studentId === member.student.id)
          return <div className="study-hall-teacher-student" key={member.id}>
            <div className="study-hall-teacher-student__identity">
              <span className="study-hall-teacher-avatar">{member.student.name.slice(0, 1)}</span>
              <div>
                <Text strong>{member.student.name}</Text>
                <div className={balance?.quotaState === 'EXPIRED' || balance?.quotaState === 'LOW' ? 'is-low' : ''}>
                  {balance?.remainingDays == null ? '购买天数未设置' : balance.quotaState === 'EXPIRED' ? '购买天数已用完' : `剩余 ${balance.remainingDays} 天`}
                </div>
              </div>
            </div>
            <div className="study-hall-teacher-student__targets">
              {teacherTargets.length ? teacherTargets.map((target) => {
                const entry = entryFor(selectedClass, member.student.id, target?.id || null)
                const homework = HOMEWORK_OPTIONS.find((item) => item.value === entry?.homeworkStatus) || HOMEWORK_OPTIONS[3]
                const disabled = !isScheduled || Boolean(activeClosure) || selectedClass.status !== 'ACTIVE'
                return <div className={`study-hall-teacher-target${!entry && !disabled ? ' is-actionable' : ''}`} key={target?.id || 'DAY'} onClick={() => { if (!entry && !disabled) openRecord(selectedClass, member, target?.id || null) }}>
                  <div className="study-hall-teacher-target__status">
                    {target && <Text strong>{target.label} {target.startTime}—{target.endTime}</Text>}
                    <Text type="secondary">{entry?.attendanceStatus === 'PERSONAL_LEAVE' ? '个人请假' : entry?.attendanceStatus === 'ABSENT' ? '无故缺勤' : entry?.checkInAt ? `${dayjs(entry.checkInAt).format('HH:mm')} 到校` : '尚未登记'}</Text>
                    {entry && <Tag color={homework.color}>{homework.label}</Tag>}
                  </div>
                  <Button type={entry ? 'default' : 'primary'} disabled={disabled} onClick={(event) => { event.stopPropagation(); openRecord(selectedClass, member, target?.id || null) }}>{entry ? '已登记' : '去登记'}</Button>
                </div>
              }) : <Text type="secondary">今天没有需要登记的时段</Text>}
            </div>
          </div>
        }) : <div className="study-hall-teacher-empty"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="这个班级还没有学员" /></div>}
      </Card>
    </Space>
  )

  return (
    <div className="study-hall-workspace" style={{ padding: embedded ? 0 : isMobile ? 12 : 24, maxWidth: 1380, margin: '0 auto', width: '100%', maxInlineSize: '100%' }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {!embedded && <div className="study-hall-heading"><Text className="study-hall-eyebrow">牧哲学堂 · 课业支持</Text><Title level={isMobile ? 3 : 2} style={{ margin: '4px 0 0' }}>{admin ? '作业班管理' : '作业班工作台'}</Title><Paragraph type="secondary" style={{ margin: '6px 0 0' }}>晚托作业与课堂反馈分开管理，班级、登记和放假各有清晰入口。</Paragraph></div>}
        {data?.contextState === 'NO_ACTIVE_TERM' && <Alert type="warning" showIcon message="尚未启用当前运营期" description={data.contextMessage} />}
        {error && <Alert type="error" showIcon message={error.message || '作业班数据加载失败'} />}
        {admin ? <Tabs activeKey={activeTab} onChange={setActiveTab} className="study-hall-tabs" items={[
          { key: 'overview', label: '班级总览', children: <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Row justify="space-between" align="middle" gutter={[12, 12]}><Col xs={24} md={16}><Title level={4} style={{ margin: 0 }}>班级总览</Title><Text type="secondary">按安排类型查看班级，快速进入管理或今日登记。</Text></Col>{admin && <Col xs={24} md="auto"><Button block={Boolean(isMobile)} type="primary" size="large" icon={<PlusOutlined />} onClick={openCreate}>新建作业班</Button></Col>}</Row>
            <Card styles={{ body: { padding: isMobile ? 12 : 16 } }}><Select allowClear value={termId} onChange={setTermId} placeholder="当前运营期" size="large" style={{ width: isMobile ? '100%' : 320 }} options={(data?.terms || []).map((item) => ({ value: item.id, label: item.name }))} {...popupProps} /></Card>
            {overviewGroups.map((group) => { const cards = classCards(group.key); return <section key={group.key} className="study-hall-class-group"><div className="study-hall-section-title"><div><Title level={4} style={{ margin: 0 }}>{group.title}</Title><Text type="secondary">{group.description}</Text></div><Tag>{cards.length} 个班级</Tag></div>{cards.length ? <div className="study-hall-class-grid">{cards}</div> : <Card><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`暂无${group.title}班级`} /></Card>}</section> })}
          </Space> },
          { key: 'daily', label: '今日登记', children: <Space direction="vertical" size={14} style={{ width: '100%' }}><Card styles={{ body: { padding: isMobile ? 12 : 16 } }}><Row gutter={[12, 12]}><Col xs={24} md={8}><DatePicker inputReadOnly={Boolean(isMobile)} value={date} onChange={(value) => value && setDate(value)} style={{ width: '100%' }} size="large" /></Col><Col xs={24} md={8}><Select allowClear value={termId} onChange={setTermId} placeholder="当前运营期" size="large" style={{ width: '100%' }} options={(data?.terms || []).map((item) => ({ value: item.id, label: item.name }))} {...popupProps} /></Col><Col xs={24} md={8}><Select value={selectedClass?.id} onChange={setSelectedClassId} placeholder="选择作业班" size="large" style={{ width: '100%' }} options={(data?.classes || []).map((item) => ({ value: item.id, label: `${item.name} · ${item.gradeScope?.[0] || '未设年级'}` }))} {...popupProps} /></Col></Row></Card>{dailyRoster}</Space> },
          { key: 'teacher-feedback', label: '教师反馈', children: teacherFeedbackAuditPanel },
          { key: 'closures', label: '放假与停课', children: <Space direction="vertical" size={16} style={{ width: '100%' }}><Row justify="space-between" align="middle" gutter={[12, 12]}><Col xs={24} md={16}><Title level={4} style={{ margin: 0 }}>放假与停课</Title><Text type="secondary">放假期间不考勤、不反馈、不扣购买天数。</Text></Col>{admin && <Col xs={24} md="auto"><Button block={Boolean(isMobile)} type="primary" icon={<CalendarOutlined />} onClick={openClosure}>设置放假</Button></Col>}</Row><Card title="当前放假记录" styles={{ body: { padding: isMobile ? '0 14px' : '0 20px' } }}><List dataSource={data?.closures || []} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无放假记录" /> }} renderItem={(item) => { const target = item.classId ? data?.classes.find((studyClass) => studyClass.id === item.classId)?.name || '指定班级' : '全部作业班'; return <List.Item><List.Item.Meta avatar={<CheckCircleOutlined style={{ color: 'var(--color-success)', fontSize: 20 }} />} title={item.reason} description={`${item.startDate} 至 ${item.endDate} · ${target}`} /></List.Item> }} /></Card></Space> },
        ]} /> : <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Card className="study-hall-teacher-filter" styles={{ body: { padding: isMobile ? 10 : 14 } }}>
            <div className="study-hall-teacher-filter__row">
              <DatePicker inputReadOnly={Boolean(isMobile)} value={date} onChange={(value) => value && setDate(value)} allowClear={false} />
              <Select allowClear value={termId} onChange={setTermId} placeholder="当前运营期" options={(data?.terms || []).map((item) => ({ value: item.id, label: item.name }))} {...popupProps} />
            </div>
          </Card>
          {(data?.classes || []).length > 1 && <div className="study-hall-teacher-class-tabs" role="tablist" aria-label="选择作业班">
            {(data?.classes || []).map((item) => <button key={item.id} type="button" role="tab" aria-selected={selectedClass?.id === item.id} className={selectedClass?.id === item.id ? 'is-active' : ''} onClick={() => setSelectedClassId(item.id)}>{item.name}</button>)}
          </div>}
          {teacherDailyRoster}
        </Space>}
      </Space>

      <Drawer title={editingClass ? `管理 ${editingClass.name}` : '新建作业班'} open={classOpen} onClose={requestCloseClassForm} width={isMobile ? '100%' : 900} placement="right" maskClosable={!submitting} keyboard={!submitting} closable={!submitting} styles={{ body: { padding: isMobile ? 12 : 24, background: 'var(--color-canvas)' }, footer: { padding: isMobile ? 12 : '14px 24px' } }} footer={<div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><Button icon={<ArrowLeftOutlined />} disabled={wizardStep === 0 || submitting} onClick={() => setWizardStep((current) => Math.max(0, current - 1))}>上一步</Button>{wizardStep < 3 ? <Button type="primary" onClick={goToNextWizardStep}>下一步</Button> : <Button type="primary" loading={submitting} onClick={saveClass}>{editingClass ? '保存修改' : '确认创建'}</Button>}</div>}>
        <div className="study-hall-wizard-brand"><Text strong>牧哲学堂</Text><Text type="secondary">作业班设置向导</Text></div>
        <Steps current={wizardStep} responsive={!isMobile} size="small" className="study-hall-wizard-steps" items={[{ title: '基础信息' }, { title: '排课与教师' }, { title: '学员与天数' }, { title: '确认' }]} />
        <Form form={classForm} layout="vertical" requiredMark="optional" className="study-hall-wizard-form">
          <div style={{ display: wizardStep === 0 ? 'block' : 'none' }}>
            <Card title="基础信息"><Row gutter={12}><Col xs={24} md={12}><Form.Item name="termId" label="运营期" rules={[{ required: true, message: '请选择运营期' }]}><Select disabled={Boolean(editingClass)} options={(data?.terms || []).map((item) => ({ value: item.id, label: item.name }))} {...popupProps} /></Form.Item></Col><Col xs={24} md={12}><Form.Item name="grade" label="适用年级" rules={[{ required: true, message: '请选择一个适用年级' }]}><Select allowClear options={GRADE_OPTIONS} placeholder="请选择一个年级" onChange={(value: string) => { const currentName = classForm.getFieldValue('name'); if (!editingClass && (!currentName || currentName === '晚托作业班')) classForm.setFieldValue('name', value ? `${value}作业班` : '') }} {...popupProps} /></Form.Item></Col></Row><Form.Item name="name" label="班级名称" rules={[{ required: true, message: '请填写班级名称' }]}><Input maxLength={80} placeholder="例如：初一晚托作业班" /></Form.Item>{editingClass && <Form.Item name="status" label="班级状态"><Select options={CLASS_STATUS_OPTIONS} {...popupProps} /></Form.Item>}<Form.Item name="scheduleType" label="安排类型" rules={[{ required: true }]}><Radio.Group className="study-hall-schedule-options" onChange={(event) => classForm.setFieldValue('weekdays', event.target.value === 'WEEKEND' ? [6, 7] : [1, 2, 3, 4, 5])}><Radio value="WEEKDAY_LATE"><strong>平日晚托作业班</strong><span>按到勤天数登记，适合周一至周五晚间辅导。</span></Radio><Radio value="WEEKEND"><strong>周末作业班</strong><span>按具体课程时段登记，教师和学科可逐节设置。</span></Radio></Radio.Group></Form.Item></Card>
          </div>
          <div style={{ display: wizardStep === 1 ? 'block' : 'none' }}><Card title="排课与教师"><Form.Item name="weekdays" label="上课日" rules={[{ required: true, message: '请选择上课日' }]}><Checkbox.Group className="study-hall-weekdays" options={WEEKDAY_OPTIONS.filter((item) => scheduleType === 'WEEKEND' ? item.value >= 6 : item.value <= 5)} /></Form.Item>{scheduleType === 'WEEKDAY_LATE' && <><Row gutter={12}><Col xs={12}><Form.Item name="timeWindowStart" label="参考开始时间"><Input type="time" /></Form.Item></Col><Col xs={12}><Form.Item name="timeWindowEnd" label="参考结束时间"><Input type="time" /></Form.Item></Col></Row><Form.Item name="teacherIds" label="负责教师（可多选）" rules={[{ required: true, message: '请至少选择一名教师' }]}><Select mode="multiple" showSearch optionFilterProp="label" options={(data?.teachers || []).map((item) => ({ value: item.id, label: item.name || item.email }))} {...popupProps} /></Form.Item></>}
          {scheduleType === 'WEEKEND' && <Form.List name="sessions">{(fields, { add, remove }) => <Space direction="vertical" size={12} style={{ width: '100%' }}>{fields.map((field, index) => <Card size="small" title={`时段 ${index + 1}`} key={field.key} extra={<Button danger type="text" icon={<MinusCircleOutlined />} onClick={() => remove(field.name)}>删除</Button>}><Row gutter={8}><Col xs={12} md={6}><Form.Item {...field} name={[field.name, 'weekday']} label="星期" rules={[{ required: true }]}><Select options={WEEKDAY_OPTIONS.filter((item) => item.value >= 6)} {...popupProps} /></Form.Item></Col><Col xs={12} md={8}><Form.Item {...field} name={[field.name, 'teacherId']} label="授课老师" rules={[{ required: true, message: '请选择老师' }]}><Select showSearch optionFilterProp="label" options={(data?.teachers || []).map((item) => ({ value: item.id, label: item.name || item.email }))} {...popupProps} /></Form.Item></Col><Col xs={24} md={10}><Form.Item noStyle shouldUpdate>{({ getFieldValue }) => { const teacherId = getFieldValue(['sessions', field.name, 'teacherId']); const subjects = teacherSubjects(data?.teachers.find((item) => item.id === teacherId)); return <Form.Item {...field} name={[field.name, 'subject']} label="学科" rules={[{ required: true, message: '请选择学科' }]}><Select options={subjects.map((value) => ({ value, label: value }))} disabled={!teacherId || !subjects.length} placeholder={teacherId ? '请选择学科' : '先选择教师'} {...popupProps} /></Form.Item> }}</Form.Item></Col><Col xs={12}><Form.Item {...field} name={[field.name, 'startTime']} label="开始时间" rules={[{ required: true }]}><Input type="time" /></Form.Item></Col><Col xs={12}><Form.Item {...field} name={[field.name, 'endTime']} label="结束时间" rules={[{ required: true }]}><Input type="time" /></Form.Item></Col></Row></Card>)}<Button icon={<PlusOutlined />} onClick={() => add({ weekday: 6, startTime: fields.length % 2 ? '14:00' : '08:30', endTime: fields.length % 2 ? '17:00' : '11:30' })}>添加一节课程</Button></Space>}</Form.List>}</Card></div>
          <div style={{ display: wizardStep === 2 ? 'block' : 'none' }}><Card title="学员与购买天数"><Form.List name="studentMemberships">{(fields, { add, remove }) => <Space direction="vertical" size={12} style={{ width: '100%' }}><Card size="small" className="study-hall-bulk-card"><Row gutter={[8, 8]} align="middle"><Col flex="auto"><Text strong>批量加入 {grade || '适用年级'}</Text><br /><Text type="secondary">只加入当前运营期的在读学员，已在名单中的不会重复。</Text></Col><Col xs={9} sm={6}><InputNumber min={1} max={366} precision={0} value={bulkPurchasedDays} onChange={(value) => setBulkPurchasedDays(Number(value || 10))} addonAfter="天" style={{ width: '100%' }} /></Col><Col xs={15} sm="auto"><Button block={Boolean(isMobile)} type="primary" icon={<UsergroupAddOutlined />} onClick={addStudentsByGrade}>一键加入</Button></Col></Row></Card>{fields.map((field) => <Row key={field.key} gutter={8} align="middle" className="study-hall-student-row"><Col xs={14} md={15}><Form.Item {...field} name={[field.name, 'studentId']} rules={[{ required: true, message: '请选择学员' }]}><Select showSearch optionFilterProp="label" placeholder="选择学员" options={(data?.students || []).map((item) => ({ value: item.id, label: `${item.name} · ${item.grade || '未填年级'}`, disabled: selectedMemberships?.some((member, index) => index !== field.name && member.studentId === item.id) }))} {...popupProps} /></Form.Item></Col><Col xs={8} md={7}><Form.Item {...field} name={[field.name, 'purchasedDays']} rules={[{ required: true, message: '填写天数' }]}><InputNumber min={1} max={366} precision={0} addonAfter="天" style={{ width: '100%' }} /></Form.Item></Col><Col xs={2}><Button danger type="text" icon={<MinusCircleOutlined />} onClick={() => remove(field.name)} aria-label="移除学员" /></Col></Row>)}<Space wrap><Button icon={<PlusOutlined />} onClick={() => add({ purchasedDays: bulkPurchasedDays })}>逐个添加学员</Button><Text type="secondary">当前名单 {fields.length} 人</Text></Space></Space>}</Form.List></Card></div>
          <div style={{ display: wizardStep === 3 ? 'block' : 'none' }}><Card title="确认班级信息"><div className="study-hall-review"><div><Text type="secondary">班级名称</Text><Text strong>{classFormValues?.name || '未填写'}</Text></div><div><Text type="secondary">运营期与年级</Text><Text strong>{data?.terms.find((item) => item.id === classFormValues?.termId)?.name || '未选择'} · {classFormValues?.grade || '未选择'}</Text></div><div><Text type="secondary">安排类型</Text><Text strong>{classFormValues?.scheduleType === 'WEEKEND' ? '周末作业班（按时段）' : '平日晚托作业班（按天）'}</Text></div><div><Text type="secondary">上课日</Text><Text strong>{(classFormValues?.weekdays || []).map(weekdayLabel).join('、') || '未选择'}</Text></div><div><Text type="secondary">教师</Text><Text strong>{classFormValues?.scheduleType === 'WEEKEND' ? `${classFormValues?.sessions?.length || 0} 个授课时段` : (classFormValues?.teacherIds || []).map((id: string) => data?.teachers.find((teacher) => teacher.id === id)?.name).filter(Boolean).join('、') || '未选择'}</Text></div><div><Text type="secondary">学员与购买天数</Text><Text strong>{classFormValues?.studentMemberships?.length || 0} 名学员</Text></div></div><Alert type="info" showIcon message="确认后即可创建班级" description="班级创建后仍可进入“管理班级”调整教师、排课和学员名单。" /></Card></div>
        </Form>
      </Drawer>

      <SafeFormModal title="设置作业班放假" open={closureOpen} onClose={closeClosureForm} onOk={saveClosure} dirty={closureOpen && JSON.stringify(closureFormValues || {}) !== closureInitialValues} okText="确认放假" confirmLoading={submitting} width={560} mobileHeight="78dvh">
        <Alert type="info" showIcon message="放假期间不考勤、不反馈、不扣购买天数" description="可选择一个、多个或全部平日晚托与周末作业班；小班课、周末课程请在课程管理中停课，课堂反馈不会与晚托作业混在一起。" style={{ marginBottom: 16 }} />
        <Form form={closureForm} layout="vertical"><Form.Item name="dates" label="放假日期" rules={[{ required: true, message: '请选择日期范围' }]}><DatePicker.RangePicker inputReadOnly={Boolean(isMobile)} style={{ width: '100%' }} /></Form.Item><Form.Item name="scope" label="适用范围" rules={[{ required: true }]}><Select options={[{ value: 'ALL', label: '当前运营期全部作业班' }, { value: 'CLASSES', label: '指定一个或多个班级' }]} {...popupProps} /></Form.Item><Form.Item noStyle shouldUpdate={(previous, currentValues) => previous.scope !== currentValues.scope}>{({ getFieldValue }) => getFieldValue('scope') === 'CLASSES' && <Form.Item name="classIds" label="选择班级" rules={[{ required: true, message: '请至少选择一个班级' }]}><Select mode="multiple" options={(data?.classes || []).map((item) => ({ value: item.id, label: `${item.name} · ${item.gradeScope?.[0] || '未设年级'}` }))} {...popupProps} /></Form.Item>}</Form.Item><Form.Item name="reason" label="放假原因" rules={[{ required: true, message: '请填写原因' }]}><Input maxLength={100} placeholder="例如：国庆节放假" /></Form.Item></Form>
      </SafeFormModal>

      <SafeFormModal rootClassName="study-hall-record-modal" title={`登记 ${recording?.member.student.name || ''} · ${date.format('M月D日')}`} open={Boolean(recording)} onClose={closeRecordForm} onOk={saveRecord} dirty={Boolean(recording) && (JSON.stringify(recordFormValues || {}) !== recordInitialValues || JSON.stringify([beforeImages, afterImages, lessonImages]) !== recordInitialMedia)} okText="保存并通知家长" confirmLoading={submitting || imageUploading} width={620} mobileFullHeight bodyStyle={{ padding: isMobile ? '14px 14px 4px' : undefined, maxHeight: isMobile ? undefined : '72dvh', overflowY: 'auto' }}>
        <Alert type="info" showIcon message="保存后自动通知家长，重复保存不会重复推送。" style={{ marginBottom: 16 }} />
        <Form form={recordForm} layout="vertical">
          <Form.Item name="contentType" label="今天记录什么" rules={[{ required: true }]}>
            <Select showSearch={false} options={[{ value: 'HOMEWORK', label: '学校作业 · 记录开始前和完成后' }, { value: 'LESSON', label: '无学校作业 · 记录今天讲解内容' }]} {...recordPopupProps} />
          </Form.Item>
          <Form.Item name="homeworkStatus" label="作业完成情况" rules={[{ required: true }]}><Radio.Group optionType="button" buttonStyle="solid" className="study-hall-record-segments" options={HOMEWORK_OPTIONS.map(({ value, label }) => ({ value, label }))} /></Form.Item>
          <Form.Item name="homeworkItemsText" label={recordContentType === 'LESSON' ? '今日讲解内容（每行一项）' : '今日作业（每行一项）'}><Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} placeholder={recordContentType === 'LESSON' ? '例如：复习一元二次方程\n讲解错题两道' : '例如：数学练习册第12页\n英语单词默写'} /></Form.Item>
          <Form.Item name="teacherComment" label="给家长的说明"><Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} maxLength={500} showCount placeholder="可填写完成质量、需要家长关注的事项" /></Form.Item>
          <Form.Item name="attendanceStatus" label="出勤状态" rules={[{ required: true }]}><Radio.Group optionType="button" buttonStyle="solid" className="study-hall-record-segments" options={[{ value: 'PRESENT', label: '正常到勤' }, { value: 'PERSONAL_LEAVE', label: '个人请假' }, { value: 'ABSENT', label: '无故缺勤' }, { value: 'UNRECORDED', label: '暂不登记' }]} /></Form.Item>
          <Form.Item name="checkedOut" label="离校状态" valuePropName="checked"><Switch checkedChildren="已离校" unCheckedChildren="未记录" /></Form.Item>
          <Form.Item label={`过程照片（合计最多9张，当前${recordImages.length}张）`}>
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              {recordContentType === 'LESSON'
                ? renderImageGroup('课堂内容', '拍板书、讲义或学生练习过程', lessonImages, 'lesson')
                : <>
                  {renderImageGroup('作业开始前', '拍当天待完成的作业或任务清单', beforeImages, 'before')}
                  {renderImageGroup('作业完成后', '拍完成结果，便于家长前后对照', afterImages, 'after')}
                </>}
            </Space>
          </Form.Item>
        </Form>
      </SafeFormModal>
    </div>
  )
}
