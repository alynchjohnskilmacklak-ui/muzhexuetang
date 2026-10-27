'use client'
import { AdaptiveSelect } from '@/components/AdaptiveSelect';

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import useSWR from 'swr'
import { useParams, useRouter } from 'next/navigation'
import { Alert, Button, Card, Checkbox, Col, Empty, Input, InputNumber, message, Popconfirm, Progress, Row, Select, Space, Table, Tag } from 'antd'
import { BrandModal } from '@/components/Common/BrandModal'
import { ArrowLeftOutlined, BookOutlined, CalendarOutlined, CheckOutlined, ClockCircleOutlined, DeleteOutlined, EnvironmentOutlined, PlusOutlined, ReloadOutlined, TeamOutlined, UserSwitchOutlined } from '@ant-design/icons'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { PageLayout } from '@/components/Layout/PageLayout'
import { useIsMobile } from '@/hooks/useIsMobile'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { formatRemaining } from '@/lib/lesson-units'
import { SubjectChangeModal } from '@/components/Enrollment/SubjectChangeModal'
import { ManualLessonModal } from '@/app/(main)/schedule/_components/ManualLessonModal'
import { chinaClock } from '@/lib/enrollment-subject-change'
import { localDateKey } from '@/lib/date/local-day'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('加载失败')
  return res.json()
}

const LESSON_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: '已排课',
  IN_PROGRESS: '上课中',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
}

export default function CourseGroupDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const isMobile = useIsMobile() ?? false
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [newEnrollmentSubjects, setNewEnrollmentSubjects] = useState<string[]>([])
  const [studentGrade, setStudentGrade] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [totalHours, setTotalHours] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [starting, setStarting] = useState(false)
  const [syncingHours, setSyncingHours] = useState(false)
  const [replaceOpen, setReplaceOpen] = useState(false)
  const [replaceKey, setReplaceKey] = useState<string>('')
  const [replaceOldTeacherId, setReplaceOldTeacherId] = useState<string>('')
  const [replaceOldSubject, setReplaceOldSubject] = useState<string>('')
  const [replaceOldTeacherName, setReplaceOldTeacherName] = useState<string>('')
  const [replaceNewTeacherId, setReplaceNewTeacherId] = useState<string>()
  const [replacing, setReplacing] = useState(false)

  const [addTeacherOpen, setAddTeacherOpen] = useState(false)
  const [addTeacherId, setAddTeacherId] = useState<string>()
  const [addTeacherSubject, setAddTeacherSubject] = useState('')
  const [addingTeacher, setAddingTeacher] = useState(false)
  const [reviewOpenId, setReviewOpenId] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const [reviewing, setReviewing] = useState(false)

  const [subjectTarget, setSubjectTarget] = useState<{ studentId: string; name: string; subjects: string[] } | null>(null)
  const [manualLessonOpen, setManualLessonOpen] = useState(false)
  const [cancelLessonId, setCancelLessonId] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [cancellingLesson, setCancellingLesson] = useState(false)

  const { data: group, mutate, isLoading } = useSWR(params.id ? `/api/class-groups/${params.id}` : null, fetcher)
  const { data: reviewData, mutate: mutateReviews } = useSWR(
    group?.intensiveMode === 'INTENSIVE'
      ? `/api/admin/intensive-reviews?division=${group.division}&status=PENDING`
      : null,
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true },
  )
  const { data: studentsData } = useSWR(enrollOpen ? `/api/students?limit=200&q=${encodeURIComponent(studentSearch)}` : null, fetcher)
  const { data: teachers } = useSWR('/api/teachers?status=ACTIVE', fetcher)

  const lessons = useMemo(() => Array.isArray(group?.classLessons) ? group.classLessons : [], [group])
  const enrollments = useMemo(() => Array.isArray(group?.enrollments) ? group.enrollments : [], [group])
  const students = Array.isArray(studentsData?.students) ? studentsData.students : []
  const enrolledStudentIds = useMemo(() => new Set(enrollments.map((item: Record<string, unknown>) => (item.student as Record<string, unknown>)?.id)), [enrollments])
  const availableStudents = students.filter((student: Record<string, unknown>) => !enrolledStudentIds.has(student.id))
  const filteredAvailableStudents = availableStudents.filter((student: Record<string, unknown>) => {
    const matchGrade = !studentGrade || student.grade === studentGrade
    const matchSearch = !studentSearch.trim() || String(student.name || '').includes(studentSearch.trim())
    return matchGrade && matchSearch
  })
  const completed = Number(group?.completedLessons || lessons.filter((lesson: Record<string, unknown>) => lesson.status === 'COMPLETED').length)
  const total = Number(group?.totalLessons || lessons.length)
  const isIntensive = group?.intensiveMode === 'INTENSIVE'
  const intensiveScheduled = lessons.filter((lesson: Record<string, unknown>) => (
    lesson.status === 'SCHEDULED' || lesson.status === 'IN_PROGRESS'
  )).length
  const intensiveApproved = lessons.filter((lesson: Record<string, unknown>) => (
    lesson.intensiveReviewStatus === 'APPROVED'
  )).length
  const intensivePendingReview = lessons.filter((lesson: Record<string, unknown>) => (
    lesson.intensiveReviewStatus === 'PENDING'
  )).length
  const pendingReviews = Array.isArray(reviewData?.reviews)
    ? reviewData.reviews.filter((review: Record<string, unknown>) => (
      lessons.some((lesson: Record<string, unknown>) => lesson.id === review.lessonId)
    ))
    : []
  const selectedReview = pendingReviews.find((review: Record<string, unknown>) => review.id === reviewOpenId)
  const currentClock = chinaClock(new Date())
  const todayStr = currentClock.day
  const visibleLessons = isIntensive
    ? [...lessons].sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const pendingOrder = Number(b.intensiveReviewStatus === 'PENDING') - Number(a.intensiveReviewStatus === 'PENDING')
      if (pendingOrder !== 0) return pendingOrder
      return new Date(String(b.lessonDate)).getTime() - new Date(String(a.lessonDate)).getTime()
    })
    : [...lessons].sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const aFuture = a.status === 'SCHEDULED' && localDateKey(String(a.lessonDate)) >= todayStr
      const bFuture = b.status === 'SCHEDULED' && localDateKey(String(b.lessonDate)) >= todayStr
      if (aFuture !== bFuture) return aFuture ? -1 : 1
      return aFuture
        ? new Date(String(a.lessonDate)).getTime() - new Date(String(b.lessonDate)).getTime()
        : new Date(String(b.lessonDate)).getTime() - new Date(String(a.lessonDate)).getTime()
    })
  const teacherList = Array.isArray(teachers?.teachers) ? teachers.teachers : Array.isArray(teachers) ? teachers : []
  const teacherAssignments = useMemo(() => Array.isArray(group?.teacherAssignments) ? group.teacherAssignments : [], [group])
  const availableGroupSubjects = useMemo(() => [...new Set([
    group?.course?.subject,
    ...teacherAssignments.map((assignment: { subject?: string | null }) => assignment.subject),
    ...lessons.map((lesson: { subject?: string | null }) => lesson.subject),
  ].filter((subject): subject is string => Boolean(subject)))].sort(), [group?.course?.subject, teacherAssignments, lessons])

  // 合并 teacherAssignments + classLessons 去重作为数据源
  const mergedTeacherRecords = useMemo(() => {
    const map = new Map<string, { teacherId: string; subject: string; teacherName: string }>()
    for (const item of teacherAssignments) {
      const tId = item.teacherId as string
      const sub = (item.subject as string) || ''
      const tName = (item.teacher as Record<string, unknown> | undefined)?.name as string || tId
      const key = `${tId}::${sub}`
      if (!map.has(key)) map.set(key, { teacherId: tId, subject: sub, teacherName: tName })
    }
    for (const lesson of lessons) {
      const tId = lesson.teacherId as string
      const sub = (lesson.subject as string) || ''
      const tName = (lesson.teacher as Record<string, unknown> | undefined)?.name as string || tId
      if (!tId) continue
      const key = `${tId}::${sub}`
      if (!map.has(key)) map.set(key, { teacherId: tId, subject: sub, teacherName: tName })
    }
    return Array.from(map.values())
  }, [teacherAssignments, lessons])

  const replaceAffectedLessons = replaceOldTeacherId
    ? lessons.filter((lesson: Record<string, unknown>) => (
      lesson.status !== 'COMPLETED'
      && lesson.status !== 'CANCELLED'
      && lesson.teacherId === replaceOldTeacherId
      && (replaceOldSubject ? lesson.subject === replaceOldSubject : true)
    )).length
    : 0

  const replaceTeacherOptions = teacherList
    .filter((teacher: Record<string, unknown>) => teacher.id && teacher.id !== replaceOldTeacherId)
    .map((teacher: Record<string, unknown>) => ({ label: String(teacher.name || '未命名老师'), value: teacher.id as string }))
  const replaceNewTeacherName = teacherList.find((teacher: Record<string, unknown>) => teacher.id === replaceNewTeacherId)?.name || '新老师'
  const teacherTeam = Array.isArray(group?.teacherAssignments) && group.teacherAssignments.length
    ? group.teacherAssignments.map((item: Record<string, unknown>) => {
        const tName = (item.teacher as Record<string, unknown> | undefined)?.name as string
        const subject = item.subject as string | undefined
        return tName ? `${tName}${subject ? `(${subject})` : ''}` : ''
      }).filter(Boolean).join('、')
    : (group?.teacher as Record<string, unknown> | undefined)?.name
  const courseColor = String((group?.course as Record<string, unknown> | undefined)?.color || '') || '#e8784a'
  const isHistoricalTerm = Boolean(group?.term && group.term.status !== 'ACTIVE')

  const handleStartGroup = async () => {
    setStarting(true)
    try {
      const res = await fetch(`/api/class-groups/${params.id}/start`, { method: 'POST' })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || '开班失败')
      message.success(payload.alreadyActive ? '班级已经是进行中' : `开班成功，已通知 ${payload.notifiedParents || 0} 位家长`)
      mutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '开班失败')
    } finally {
      setStarting(false)
    }
  }

  const handleAddStudents = async () => {
    if (!selectedStudentIds.length) {
      message.error('请选择要加入班级的学员')
      return
    }
    if (!newEnrollmentSubjects.length) {
      message.error('请先选择学员实际报读的学科')
      return
    }
    setSubmitting(true)
    try {
      for (const studentId of selectedStudentIds) {
        const res = await fetch(`/api/class-groups/${params.id}/enrollments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, totalHours, subjects: newEnrollmentSubjects }),
        })
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(payload.error || '添加学员失败')
      }
      message.success(`已添加 ${selectedStudentIds.length} 位学员`)
      handleCloseEnrollModal()
      setTotalHours(null)
      mutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '添加学员失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCloseEnrollModal = () => {
    setEnrollOpen(false)
    setStudentSearch('')
    setStudentGrade('')
    setSelectedStudentIds([])
    setNewEnrollmentSubjects([])
  }

  const handleSelectGradeStudents = () => {
    if (!studentGrade) {
      message.warning('请先选择年级')
      return
    }
    setSelectedStudentIds(filteredAvailableStudents.map((student: Record<string, unknown>) => student.id as string))
  }

  const handleRemoveStudent = async (enrollmentId: string) => {
    const res = await fetch(`/api/class-groups/${params.id}/enrollments?enrollmentId=${enrollmentId}`, { method: 'DELETE' })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      message.error(payload.error || '移出失败')
      return
    }
    message.success('已移出班级')
    mutate()
  }

  const handleDeleteGroup = async () => {
    const res = await fetch(`/api/class-groups/${params.id}`, { method: 'DELETE' })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      message.error(payload.error || '删除失败')
      return
    }
    message.success('班级已删除')
    router.push('/courses')
  }

  const handleRegenerateLessons = async () => {
    try {
      const res = await fetch(`/api/class-groups/${params.id}/generate-lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || '重新生成失败')
      message.success(`课表已重新生成，共 ${payload.count || 0} 节课`)
      mutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '重新生成失败')
    }
  }

  const handleCancelLesson = async () => {
    if (!cancelLessonId || cancelReason.trim().length < 2) {
      message.warning('请填写停课原因')
      return
    }
    setCancellingLesson(true)
    try {
      const response = await fetch(`/api/class-lessons/${cancelLessonId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED', cancelReason: cancelReason.trim() }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '取消课次失败')
      message.success('本次课已取消')
      setCancelLessonId('')
      setCancelReason('')
      mutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '取消课次失败')
    } finally {
      setCancellingLesson(false)
    }
  }

  const syncInsertedStudentHours = async () => {
    setSyncingHours(true)
    try {
      const res = await fetch(`/api/class-groups/${params.id}/sync-hours`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { message.error(data.error || '同步失败'); return }
      message.success(data.message || `已同步 ${data.updated} 位学员课时`)
      mutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '校准插班生课时失败')
    } finally {
      setSyncingHours(false)
    }
  }

  const openReplaceTeacher = () => {
    setReplaceKey('')
    setReplaceOldTeacherId('')
    setReplaceOldSubject('')
    setReplaceOldTeacherName('')
    setReplaceNewTeacherId(undefined)
    setReplaceOpen(true)
  }

  const handleSelectReplaceEntry = (entry: { teacherId: string; subject: string; teacherName: string }) => {
    const key = `${entry.teacherId}::${entry.subject}`
    setReplaceKey(key)
    setReplaceOldTeacherId(entry.teacherId)
    setReplaceOldSubject(entry.subject)
    setReplaceOldTeacherName(entry.teacherName)
    setReplaceNewTeacherId(undefined)
  }

  const handleReplaceTeacher = async () => {
    if (!replaceOldTeacherId || !replaceNewTeacherId) {
      message.warning('请选择新的任课老师')
      return
    }
    setReplacing(true)
    try {
      const res = await fetch(`/api/class-groups/${params.id}/replace-teacher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldTeacherId: replaceOldTeacherId,
          newTeacherId: replaceNewTeacherId,
          subject: replaceOldSubject || null,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || '更换老师失败')
      message.success(`已更换，影响 ${payload.affectedLessons || 0} 节课次`)
      setReplaceOpen(false)
      setReplaceKey('')
      setReplaceOldTeacherId('')
      setReplaceOldSubject('')
      setReplaceOldTeacherName('')
      setReplaceNewTeacherId(undefined)
      mutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '更换老师失败')
    } finally {
      setReplacing(false)
    }
  }

  const handleAddTeacher = async () => {
    if (!addTeacherId || !addTeacherSubject.trim()) {
      message.warning('请选择老师和科目')
      return
    }
    setAddingTeacher(true)
    try {
      const res = await fetch(`/api/class-groups/${params.id}/add-teacher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: addTeacherId, subject: addTeacherSubject.trim() }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || '添加任课老师失败')
      message.success(`已添加 ${addTeacherSubject} 任课老师`)
      setAddTeacherOpen(false)
      setAddTeacherId(undefined)
      setAddTeacherSubject('')
      mutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '添加任课老师失败')
    } finally {
      setAddingTeacher(false)
    }
  }

  const openLessonReview = (lessonId?: string) => {
    const review = pendingReviews.find((item: Record<string, unknown>) => (
      lessonId ? item.lessonId === lessonId : true
    ))
    if (!review) {
      message.info('审核记录正在刷新，请稍后再试')
      void mutateReviews()
      return
    }
    setReviewNote('')
    setReviewOpenId(String(review.id))
  }

  const handleIntensiveReview = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedReview) return
    if (action === 'REJECT' && reviewNote.trim().length < 2) {
      message.warning('驳回时请填写原因，方便教师修改')
      return
    }
    setReviewing(true)
    try {
      const response = await fetch(
        `/api/admin/intensive-reviews/${selectedReview.id}?division=${group.division}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, reviewNote: reviewNote.trim() }),
        },
      )
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '审核失败')
      if (action === 'APPROVE') {
        message.success(
          `审核通过：计入${(Number(selectedReview.actualMinutes || 0) / 60).toFixed(2)}小时，工资￥${Number(payload.salaryAmount || 0).toFixed(2)}`,
        )
      } else {
        message.success('已驳回，教师可修改后重新提交')
      }
      setReviewOpenId('')
      setReviewNote('')
      await Promise.all([mutate(), mutateReviews()])
    } catch (error) {
      message.error(error instanceof Error ? error.message : '审核失败')
    } finally {
      setReviewing(false)
    }
  }

  if (isLoading) {
    return <PageLayout title="班级管理"><CardSkeleton rows={3} /></PageLayout>
  }

  if (!group) {
    return <PageLayout title="班级管理"><Empty description="班级不存在" /></PageLayout>
  }

  return (
    <PageLayout
      title={group.name}
      subtitle={`${group.course?.name || ''} · ${isIntensive ? '个性化课程' : '精品班课'}`}
      actions={isMobile ? undefined : (
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} disabled={isHistoricalTerm} onClick={() => setEnrollOpen(true)} style={{ background: 'var(--color-primary)' }}>添加学员</Button>
          {group.status === 'WAITING' && <Button type="primary" disabled={isHistoricalTerm} loading={starting} onClick={handleStartGroup} style={{ background: '#27a644' }}>开班并通知家长</Button>}
          <Button icon={<UserSwitchOutlined />} disabled={isHistoricalTerm} onClick={openReplaceTeacher}>更换老师</Button>
          {!isIntensive && <Button icon={<CalendarOutlined />} disabled={isHistoricalTerm} onClick={() => setManualLessonOpen(true)}>临时加课</Button>}
          {group.status === 'WAITING' && <Button icon={<ReloadOutlined />} disabled={isHistoricalTerm} onClick={handleRegenerateLessons}>重新生成课表</Button>}
          <Popconfirm title="确定删除这个班级？" description="删除后班级会归档，不再出现在课程和排课列表。" onConfirm={handleDeleteGroup}>
            <Button danger disabled={isHistoricalTerm} icon={<DeleteOutlined />}>删除班级</Button>
          </Popconfirm>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/courses')}>返回课程管理</Button>
        </Space>
      )}
    >
      {isHistoricalTerm && (
        <Alert
          showIcon
          type="info"
          message={`正在查看历史批次：${group.term?.name || '历史批次'}`}
          description="历史班级、课次、考勤、反馈和工资仅供核对；如需新增或修改，请先在数据总览切换到当前运营批次。"
          style={{ marginBottom: 16, borderRadius: 12 }}
        />
      )}

      {/* 班级 HERO 卡 */}
      <div style={{
        borderRadius: 18, overflow: 'hidden', marginBottom: 16,
        border: '1px solid rgba(201,164,92,.5)',
        background: 'linear-gradient(150deg,#17352F 0%,#0E5E4E 55%,#0B4B40 100%)',
        boxShadow: '0 10px 26px rgba(18,60,53,.2)',
        color: '#F5F1E8', position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: -46, right: -30, width: 170, height: 170, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,164,92,.22), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ padding: '16px 16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 }}>
            <div style={{
              width: 54, height: 54, borderRadius: 16, flexShrink: 0,
              background: `linear-gradient(145deg, ${courseColor}33, ${courseColor}14)`,
              border: `1px solid ${courseColor}55`,
              color: '#F2E3B6', display: 'grid', placeItems: 'center',
              fontSize: 23, fontWeight: 800,
            }}>{String(group.course?.subject || '?')[0]}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#F5F1E8' }}>{group.name as string}</span>
                <StatusTag status={String(group.status || '-')} />
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: 'rgba(245,241,232,.75)' }}>
                {group.course?.name as string}{group.course?.grade ? ` · ${group.course.grade}` : ''}
              </div>
            </div>
          </div>

          {/* 授课团队 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
            <span style={{ fontSize: 11, color: 'rgba(242,227,182,.7)', flexShrink: 0 }}>授课团队</span>
            {teacherAssignments.length ? teacherAssignments.map((item: Record<string, unknown>, i: number) => {
              const tName = (item.teacher as Record<string, unknown> | undefined)?.name as string
              const subject = item.subject as string | undefined
              return (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap',
                  background: 'rgba(255,255,255,.09)', border: '1px solid rgba(242,227,182,.28)',
                  fontSize: 11.5, color: '#F5F1E8', fontWeight: 600,
                }}>
                  {tName || '未分配'}
                  {subject && <span style={{ color: '#F2E3B6', fontWeight: 700 }}>{subject}</span>}
                </span>
              )
            }) : <span style={{ fontSize: 11.5, color: 'rgba(245,241,232,.6)' }}>未分配</span>}
          </div>

          {/* 信息格 */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))', gap: 6, marginTop: 12 }}>
            <DetailChip icon={<BookOutlined />} text={isIntensive ? (group.teachingType === 'ONE_ON_TWO' ? '一对二' : group.teachingType === 'ONE_ON_THREE' ? '一对三' : '一对一') : (group.course?.type === 'ONE_ON_ONE' ? '1对1' : group.course?.type === 'SMALL_GROUP' ? '小组课' : '班课')} />
            <DetailChip icon={<ClockCircleOutlined />} text={group.lessonStartTime as string || '—'} />
            <DetailChip icon={<EnvironmentOutlined />} text={isIntensive ? '地点灵活' : group.room?.name as string || '未分配'} />
            <DetailChip icon={<TeamOutlined />} text={`在读 ${enrollments.length} 人`} />
          </div>
          {isIntensive && (
            <div style={{
              marginTop: 10, padding: '8px 11px', borderRadius: 10,
              background: 'rgba(255,255,255,.07)', border: '1px solid rgba(242,227,182,.2)',
              fontSize: 11.5, color: 'rgba(245,241,232,.8)', lineHeight: 1.6,
            }}>
              个性化课程按实际授课累计：教师约课并完成考勤后，由管理员审核实际授课时间，再计入学生课时和教师工资。
            </div>
          )}
        </div>
        <div style={{ padding: '0 16px 14px' }}>
          <Progress
            percent={total ? Math.round((completed / total) * 100) : 0}
            strokeColor="#F2E3B6"
            trailColor="rgba(255,255,255,.12)"
            size="small"
            format={() => (
              <span style={{ color: 'rgba(245,241,232,.8)', fontSize: 12, whiteSpace: 'nowrap' }}>
                已上 {completed}/{total} 节 · {total ? Math.round((completed / total) * 100) : 0}%
              </span>
            )}
          />
        </div>
      </div>

      {isMobile && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <Button size="small" icon={<UserSwitchOutlined />} disabled={isHistoricalTerm} onClick={openReplaceTeacher}>更换老师</Button>
            {group.status === 'WAITING' && (
              <Button size="small" icon={<ReloadOutlined />} disabled={isHistoricalTerm} onClick={handleRegenerateLessons}>重新生成课表</Button>
            )}
            <Button size="small" icon={<ArrowLeftOutlined />} onClick={() => router.push('/courses')}>返回课程管理</Button>
            <Popconfirm title="确定删除这个班级？" description="删除后班级会归档，不再出现在课程和排课列表。" onConfirm={handleDeleteGroup}>
              <Button size="small" danger disabled={isHistoricalTerm} icon={<DeleteOutlined />}>删除班级</Button>
            </Popconfirm>
          </div>
          <Space.Compact block style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} disabled={isHistoricalTerm} onClick={() => setEnrollOpen(true)} style={{ background: 'var(--color-primary)', flex: 1 }}>添加学员</Button>
            {!isIntensive && <Button icon={<CalendarOutlined />} disabled={isHistoricalTerm} onClick={() => setManualLessonOpen(true)} style={{ flex: 1 }}>临时加课</Button>}
            {group.status === 'WAITING' && <Button type="primary" disabled={isHistoricalTerm} loading={starting} onClick={handleStartGroup} style={{ background: '#27a644', flex: 1 }}>开班通知</Button>}
          </Space.Compact>
        </>
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}><Metric title="在读人数" value={enrollments.length} icon={<TeamOutlined />} grad="linear-gradient(145deg,#27a644,#15804F)" /></Col>
        {isIntensive ? (
          <>
            <Col xs={12} lg={6}><Metric title="已安排课次" value={intensiveScheduled} icon={<CalendarOutlined />} grad="linear-gradient(145deg,#FFB84D,#E8784A)" /></Col>
            <Col xs={12} lg={6}><Metric title="已审核课次" value={intensiveApproved} icon={<CheckOutlined />} grad="linear-gradient(145deg,#4C8DFF,#2f6fdb)" /></Col>
            <Col xs={12} lg={6}>
              <Metric
                title="待审核课次"
                value={intensivePendingReview}
                icon={<ClockCircleOutlined />}
                grad="linear-gradient(145deg,#F6654F,#e03e2d)"
                actionLabel={!isHistoricalTerm && intensivePendingReview > 0 ? '立即审核' : undefined}
                onAction={isHistoricalTerm ? undefined : () => openLessonReview()}
              />
            </Col>
          </>
        ) : (
          <>
            <Col xs={12} lg={6}><Metric title="总课次" value={total} icon={<BookOutlined />} grad="linear-gradient(145deg,#4C8DFF,#2f6fdb)" /></Col>
            <Col xs={12} lg={6}><Metric title="已上课次" value={completed} icon={<CheckOutlined />} grad="linear-gradient(145deg,#27a644,#15804F)" /></Col>
            <Col xs={12} lg={6}><Metric title="剩余课次" value={Math.max(0, total - completed)} icon={<ReloadOutlined />} grad="linear-gradient(145deg,#FFB84D,#E8784A)" /></Col>
          </>
        )}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card
            title={<span style={{ color: '#1F2329' }}><TeamOutlined /> 学员名单</span>}
            extra={(
              <Space size={8}>
                <Popconfirm
                  title="按剩余有效课次校准插班生？"
                  description="仅处理开班后加入的学生，并保留已经消耗的课时记录。"
                  onConfirm={syncInsertedStudentHours}
                  okText="确认校准"
                  cancelText="取消"
                >
                  <Button size="small" disabled={isHistoricalTerm} loading={syncingHours}>校准插班生课时</Button>
                </Popconfirm>
                <Button size="small" icon={<PlusOutlined />} disabled={isHistoricalTerm} onClick={() => setEnrollOpen(true)}>添加</Button>
              </Space>
            )}
            bordered={false}
            style={{ borderRadius: 16, background: '#ffffff', border: '1px solid #F0E9DF', boxShadow: '0 4px 14px rgba(58,50,39,.04)' }}
          >
            {!enrollments.length ? <Empty description="暂无学员，先添加学员后再开班通知" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {enrollments.map((enrollment: Record<string, unknown>) => {
                  const student = enrollment.student as Record<string, unknown> | undefined
                  const studentSubjects = Array.isArray(enrollment.subjects) ? (enrollment.subjects as string[]) : []
                  const remainingText = formatRemaining(Number(enrollment.remainHours ?? 0), group.course?.type || null, Number(group.lessonMinutes || 40)).text
                  return (
                    <div key={enrollment.id as string} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '11px 12px', borderRadius: 14,
                      background: '#FCFAF7', border: '1px solid #F0E9DF',
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: `linear-gradient(145deg, ${courseColor}26, ${courseColor}0D)`,
                        border: `1px solid ${courseColor}40`,
                        color: courseColor, display: 'grid', placeItems: 'center',
                        fontSize: 16, fontWeight: 800,
                      }}>
                        {String(student?.name || '?')[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ color: '#1F2329', fontWeight: 700, fontSize: 13.5 }}>{student?.name as string}</span>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 999, whiteSpace: 'nowrap',
                            color: '#123C35', background: 'linear-gradient(135deg,#F2E3B6,#D8BC7C)',
                          }}>剩余 {remainingText}</span>
                        </div>
                        <div style={{ color: '#98A2B3', fontSize: 11.5, marginTop: 3 }}>
                          {student?.grade as string || '-'} · 在读
                        </div>
                        {studentSubjects.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                            {studentSubjects.map((s) => (
                              <span key={s} style={{
                                fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 999,
                                color: courseColor, background: `${courseColor}14`, border: `1px solid ${courseColor}30`,
                              }}>{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                        <Button size="small" type="text" onClick={() => {
                          setSubjectTarget({ studentId: enrollment.studentId as string, name: student?.name as string || '', subjects: studentSubjects })
                        }} disabled={isHistoricalTerm} style={{ fontSize: 11.5 }}>调整学科</Button>
                        <Popconfirm title="确定把该学员移出班级？" onConfirm={() => handleRemoveStudent(enrollment.id as string)}>
                          <Button size="small" danger type="text" disabled={isHistoricalTerm} style={{ fontSize: 11.5 }}>移出</Button>
                        </Popconfirm>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card
            title={(
              <span style={{ color: '#1F2329' }}>
                <CalendarOutlined /> {isIntensive ? '个性化课次' : '本班课次管理'}
              </span>
            )}
            extra={isIntensive
              ? <Tag color={intensivePendingReview > 0 ? 'orange' : 'green'}>{intensivePendingReview} 节待审核</Tag>
              : <Tag color="orange">{lessons.length} 节</Tag>}
            bordered={false}
            style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}
          >
            <Table
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
              scroll={{ x: isIntensive ? 720 : 620 }}
              dataSource={visibleLessons}
              columns={[
                { title: '日期', dataIndex: 'lessonDate', render: (value: string) => format(new Date(value), 'yyyy-MM-dd EEEE', { locale: zhCN }) },
                { title: '时间', render: (_, row: Record<string, unknown>) => `${row.startTime}-${row.endTime}` },
                { title: '科目/老师', render: (_, row: Record<string, unknown>) => `${row.subject || group.course?.subject || '-'} / ${(row.teacher as Record<string, unknown> | undefined)?.name || teacherTeam || '-'}` },
                {
                  title: '状态',
                  dataIndex: 'status',
                  render: (value: string, row: Record<string, unknown>) => (
                    <Space size={4}>
                      <Tag>{LESSON_STATUS_LABEL[value] || value}</Tag>
                      {row.isManual === true && <Tag color="orange">临时</Tag>}
                      {isIntensive && row.intensiveReviewStatus === 'PENDING' && <Tag color="orange">待审核</Tag>}
                      {isIntensive && row.intensiveReviewStatus === 'APPROVED' && <Tag color="green">已审核</Tag>}
                      {isIntensive && row.intensiveReviewStatus === 'REJECTED' && <Tag color="red">已驳回</Tag>}
                    </Space>
                  ),
                },
                ...(isIntensive ? [{
                  title: '操作',
                  width: 90,
                  render: (_: unknown, row: Record<string, unknown>) => (
                    !isHistoricalTerm && row.intensiveReviewStatus === 'PENDING' ? (
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => openLessonReview(String(row.id))}
                      >
                        审核
                      </Button>
                    ) : (
                      <span style={{ color: '#98A2B3', fontSize: 12 }}>无需处理</span>
                    )
                  ),
                }] : []),
                ...(!isIntensive ? [{
                  title: '管理',
                  width: 86,
                  render: (_: unknown, row: Record<string, unknown>) => row.status === 'SCHEDULED' && !isHistoricalTerm
                    && (localDateKey(String(row.lessonDate)) > currentClock.day
                      || (localDateKey(String(row.lessonDate)) === currentClock.day && String(row.startTime) > currentClock.time)) ? (
                    <Button size="small" danger type="link" onClick={() => { setCancelLessonId(String(row.id)); setCancelReason('') }}>取消本次</Button>
                  ) : <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>—</span>,
                }] : []),
              ]}
            />
          </Card>
        </Col>
      </Row>

      {manualLessonOpen && (
        <ManualLessonModal initialGroupId={params.id} onClose={() => setManualLessonOpen(false)} onSuccess={() => mutate()} />
      )}
      <BrandModal
        title="取消本次课"
        open={Boolean(cancelLessonId)}
        onCancel={() => setCancelLessonId('')}
        onOk={handleCancelLesson}
        confirmLoading={cancellingLesson}
        okText="确认取消"
        okButtonProps={{ danger: true }}
      >
        <p>只能取消尚未开始且没有考勤、反馈或结算记录的课次。系统保留取消记录并通知相关家长。</p>
        <Input.TextArea aria-label="停课原因" placeholder="例如：国庆假期调整" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} maxLength={200} showCount rows={3} />
      </BrandModal>

      <BrandModal
        title="审核个性化课程"
        open={Boolean(selectedReview)}
        onCancel={() => {
          if (reviewing) return
          setReviewOpenId('')
          setReviewNote('')
        }}
        footer={null}
        width={isMobile ? 'calc(100vw - 24px)' : 620}
        destroyOnHidden
      >
        {selectedReview && (
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message={`${selectedReview.groupName} · ${selectedReview.subject}`}
              description={`${selectedReview.teacherName}申报 ${selectedReview.actualMinutes} 分钟（${(Number(selectedReview.actualMinutes) / 60).toFixed(2)}小时）`}
            />
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: 10,
              padding: 12,
              borderRadius: 10,
              background: 'var(--color-surface-3)',
            }}>
              <div>
                <div style={{ color: 'var(--color-ink-subtle)', fontSize: 12 }}>上课日期</div>
                <div style={{ marginTop: 3, fontWeight: 600 }}>
                  {format(new Date(String(selectedReview.lessonDate)), 'yyyy-MM-dd EEEE', { locale: zhCN })}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--color-ink-subtle)', fontSize: 12 }}>上课时间</div>
                <div style={{ marginTop: 3, fontWeight: 600 }}>{selectedReview.startTime}-{selectedReview.endTime}</div>
              </div>
            </div>
            <div>
              <div style={{ marginBottom: 7, fontWeight: 600 }}>学生考勤</div>
              <Space wrap size={[6, 6]}>
                {(Array.isArray(selectedReview.students) ? selectedReview.students : []).map((student: Record<string, unknown>) => (
                  <Tag key={String(student.id)} color={student.status === 'PRESENT' ? 'green' : student.status === 'LEAVE' ? 'gold' : 'red'}>
                    {String(student.name)} · {student.status === 'PRESENT' ? '出勤' : student.status === 'LEAVE' ? '请假' : student.status === 'MAKEUP' ? '补课' : '缺勤'}
                  </Tag>
                ))}
              </Space>
            </div>
            {selectedReview.teacherNote && (
              <Alert message={`教师说明：${selectedReview.teacherNote}`} type="warning" />
            )}
            <Input.TextArea
              rows={3}
              maxLength={500}
              showCount
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              placeholder="审核备注（驳回时必填）"
            />
            <Row gutter={10}>
              <Col span={12}>
                <Button
                  block
                  danger
                  disabled={reviewing}
                  onClick={() => handleIntensiveReview('REJECT')}
                  style={{ minHeight: 42 }}
                >
                  驳回修改
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  block
                  type="primary"
                  loading={reviewing}
                  onClick={() => handleIntensiveReview('APPROVE')}
                  style={{ minHeight: 42 }}
                >
                  核对无误并通过
                </Button>
              </Col>
            </Row>
          </Space>
        )}
      </BrandModal>

      <BrandModal
        title="添加学员到班级"
        open={enrollOpen}
        onCancel={handleCloseEnrollModal}
        onOk={handleAddStudents}
        confirmLoading={submitting}
        okText="确认添加"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }} size={14}>
          <AdaptiveSelect
            allowClear
            placeholder="按年级筛选"
            value={studentGrade || undefined}
            onChange={(value) => {
              setStudentGrade(value || '')
              setSelectedStudentIds([])
            }}
            style={{ width: '100%' }}
            options={['初一', '初二', '初三', '高一', '高二', '高三'].map((grade) => ({ label: grade, value: grade }))}
          />
          <Button onClick={handleSelectGradeStudents} disabled={!studentGrade || filteredAvailableStudents.length === 0}>
            一键选择该年级 {filteredAvailableStudents.length} 人
          </Button>
          <Input.Search
            placeholder="输入姓名搜索学员"
            allowClear
            value={studentSearch}
            onChange={(event) => {
              setStudentSearch(event.target.value)
              setSelectedStudentIds([])
            }}
            style={{ marginBottom: 8 }}
          />
          {students.length > 0 && availableStudents.length === 0 && (
            <Alert type="info" showIcon message="该班所有已找到的学员均已报名" />
          )}
          <AdaptiveSelect
            mode="multiple"
            showSearch
            optionFilterProp="label"
            placeholder="选择学员，可一次添加多人"
            value={selectedStudentIds}
            onChange={setSelectedStudentIds}
            style={{ width: '100%' }}
            filterOption={(input, option) => String(option?.label || '').includes(input)}
            options={filteredAvailableStudents.map((student: Record<string, unknown>) => ({
              label: `${student.name}${student.grade ? ` / ${student.grade}` : ''}${student.parentPhone ? ` / ${student.parentPhone}` : ''}`,
              value: student.id as string,
            }))}
          />
          <div style={{ fontSize: 13, fontWeight: 600 }}>报读学科</div>
          <Checkbox.Group
            value={newEnrollmentSubjects}
            onChange={(values) => setNewEnrollmentSubjects(values as string[])}
            options={availableGroupSubjects}
            style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}
          />
          <div style={{ fontSize: 12, color: 'var(--ink-muted, #5a4e3a)' }}>
            只选实际报读的学科。一次添加多人时，所选学科会应用于全部；报读不同学科的学员请分批添加。
          </div>
          <div style={{ fontSize: 12, color: '#98A2B3', marginBottom: 8, padding: '6px 10px', background: '#F5F2EE', borderRadius: 6 }}>
            插班生将按当前尚未完成的有效课次自动计算剩余课时，不追溯加入前已完成的课程；如购买课时不同，可在下方自定义。
          </div>
          <InputNumber
            min={0}
            precision={1}
            placeholder="购买课时，留空则按剩余有效课次自动计算"
            value={totalHours}
            onChange={(value) => setTotalHours(value)}
            style={{ width: '100%' }}
          />
        </Space>
      </BrandModal>
      <BrandModal
        title="更换任课老师"
        open={replaceOpen}
        onCancel={() => setReplaceOpen(false)}
        footer={null}
        width={480}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={14}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1201', marginBottom: 8 }}>选择要替换的任课记录</div>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              {mergedTeacherRecords.map((entry) => {
                const key = `${entry.teacherId}::${entry.subject}`
                const selected = replaceKey === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectReplaceEntry(entry)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: selected ? '1px solid #E8784A' : '1px solid #EEE7E1',
                      background: selected ? '#FFF3EC' : '#fff',
                      borderRadius: 10,
                      padding: '10px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ color: '#1a1201', fontWeight: 700 }}>{entry.subject || '主讲'}</span>
                      <span style={{ color: selected ? '#E8784A' : '#5a4e3a' }}>{entry.teacherName || '未分配老师'}</span>
                    </div>
                  </button>
                )
              })}
              {!mergedTeacherRecords.length && <Alert type="warning" showIcon message="该班级暂无任课老师记录，请先添加授课团队。" />}
            </Space>
          </div>
          {replaceOldTeacherId && (
            <>
              <AdaptiveSelect
                placeholder="更换为"
                value={replaceNewTeacherId}
                onChange={setReplaceNewTeacherId}
                options={replaceTeacherOptions}
                style={{ width: '100%' }}
                optionFilterProp="label"
                showSearch
                listHeight={240}
                virtual={false}
                getPopupContainer={(trigger) => trigger.parentElement || document.body}
              />
              <div style={{ fontSize: 12, color: '#8d806f', padding: '10px 12px', borderRadius: 8, background: '#FFF8F4', border: '1px solid #F0EBE5', lineHeight: 1.7 }}>
                将把【{replaceOldSubject || '主讲'}】的【{replaceOldTeacherName || replaceOldTeacherId}】更换为【{replaceNewTeacherName}】，
                影响 {replaceAffectedLessons} 节尚未完成的课次，已完成课次不受影响。
              </div>
              <Button
                type="primary"
                block
                loading={replacing}
                disabled={!replaceNewTeacherId}
                onClick={handleReplaceTeacher}
                style={{ background: '#e8784a', borderColor: '#e8784a' }}
              >
                确认更换
              </Button>
            </>
          )}
          <div style={{ borderTop: '1px solid #EEE7E1', paddingTop: 12 }}>
            <Button
              type="dashed"
              block
              icon={<PlusOutlined />}
              onClick={() => {
                setAddTeacherId(undefined)
                setAddTeacherSubject('')
                setAddTeacherOpen(true)
              }}
            >
              添加任课老师
            </Button>
          </div>
        </Space>
      </BrandModal>

      <BrandModal
        title="添加任课老师"
        open={addTeacherOpen}
        onCancel={() => setAddTeacherOpen(false)}
        onOk={handleAddTeacher}
        confirmLoading={addingTeacher}
        okText="确认添加"
        cancelText="取消"
        okButtonProps={{ style: { background: '#e8784a', borderColor: '#e8784a' } }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={14}>
          <AdaptiveSelect
            placeholder="选择老师"
            value={addTeacherId}
            onChange={setAddTeacherId}
            options={teacherList.map((t: Record<string, unknown>) => ({ label: String(t.name || ''), value: t.id as string }))}
            style={{ width: '100%' }}
            optionFilterProp="label"
            showSearch
            listHeight={240}
            virtual={false}
            getPopupContainer={(trigger) => trigger.parentElement || document.body}
          />
          <AdaptiveSelect
            placeholder="选择科目"
            value={addTeacherSubject || undefined}
            onChange={setAddTeacherSubject}
            style={{ width: '100%' }}
            options={['语文', '数学', '英语', '物理', '化学', '生物', '地理', '历史', '政治'].map((s) => ({ label: s, value: s }))}
          />
          <div style={{ fontSize: 12, color: '#8d806f', padding: '10px 12px', borderRadius: 8, background: '#FFF8F4', border: '1px solid #F0EBE5', lineHeight: 1.7 }}>
            仅补入对应表，不自动排课。排课请用&ldquo;新增上课日&rdquo;或重新生成课表。
          </div>
        </Space>
      </BrandModal>
      {subjectTarget && (
        <SubjectChangeModal
          key={subjectTarget.studentId}
          groupId={params.id}
          groupName={String(group?.name || '')}
          studentId={subjectTarget.studentId}
          studentName={subjectTarget.name}
          initialSubjects={subjectTarget.subjects}
          availableSubjects={availableGroupSubjects}
          onClose={() => setSubjectTarget(null)}
          onSaved={() => mutate()}
        />
      )}
    </PageLayout>
  )
}

function Metric({
  title,
  value,
  actionLabel,
  onAction,
  icon,
  grad,
}: {
  title: string
  value: number
  actionLabel?: string
  onAction?: () => void
  icon?: ReactNode
  grad?: string
}) {
  return (
    <Card
      bordered={false}
      style={{ borderRadius: 16, background: '#ffffff', border: '1px solid #F0E9DF', boxShadow: '0 4px 14px rgba(58,50,39,.05)' }}
      extra={actionLabel ? <Button type="link" size="small" onClick={onAction} style={{ color: '#e03e2d' }}>{actionLabel}</Button> : null}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        {icon && (
          <div style={{
            width: 40, height: 40, borderRadius: 13, flexShrink: 0,
            background: grad || 'linear-gradient(145deg,#4C8DFF,#2f6fdb)',
            color: '#fff', display: 'grid', placeItems: 'center', fontSize: 16,
            boxShadow: '0 4px 10px rgba(58,50,39,.12)',
          }}>{icon}</div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#1F2329', fontSize: 23, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{value}</div>
          <div style={{ color: '#98A2B3', fontSize: 12, marginTop: 1 }}>{title}</div>
        </div>
      </div>
    </Card>
  )
}

function StatusTag({ status }: { status: string }) {
  const map: Record<string, { text: string; fg: string; bg: string; border: string }> = {
    ACTIVE: { text: '进行中', fg: '#1D9E75', bg: 'rgba(29,158,117,.12)', border: 'rgba(29,158,117,.35)' },
    WAITING: { text: '待开班', fg: '#E8590C', bg: 'rgba(232,89,12,.12)', border: 'rgba(232,89,12,.35)' },
    COMPLETED: { text: '已结束', fg: '#2f6fdb', bg: 'rgba(47,111,219,.12)', border: 'rgba(47,111,219,.35)' },
  }
  const s = map[status] || { text: status, fg: '#98A2B3', bg: 'rgba(152,162,179,.12)', border: 'rgba(152,162,179,.35)' }
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999, whiteSpace: 'nowrap',
      color: s.fg, background: s.bg, border: `1px solid ${s.border}`,
    }}>{s.text}</span>
  )
}

function DetailChip({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5, minWidth: 0,
      padding: '6px 9px', borderRadius: 10,
      background: 'rgba(255,255,255,.08)', border: '1px solid rgba(242,227,182,.2)',
    }}>
      <span style={{ color: '#F2E3B6', fontSize: 11, flexShrink: 0 }}>{icon}</span>
      <span style={{
        fontSize: 11.5, fontWeight: 600, color: '#F5F1E8',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{text}</span>
    </div>
  )
}
