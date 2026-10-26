'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Card, Empty, message, Modal, Skeleton } from 'antd'
import {
  ArrowLeftOutlined, CalendarOutlined, CheckCircleOutlined,
  ClockCircleOutlined, EditOutlined, FileTextOutlined, TeamOutlined,
} from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { CachedAvatarImage } from '@/components/Common/CachedAvatarImage'
import { useDivision } from '@/contexts/DivisionContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { getTeacherAvatarUrl } from '@/lib/teacher-avatars'
import { resolveTier, TIER_THEME } from '@/constants/teacher-tier'
import styles from '../daily-class/today-class.module.css'

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error('加载失败')
  return r.json()
})

type AttStatusRaw = 'PRESENT' | 'LEAVE' | 'ABSENT' | 'MAKEUP' | null

const STATUS_OPTIONS: Array<{
  value: NonNullable<AttStatusRaw>
  label: string
  tone: 'present' | 'leave' | 'absent' | 'makeup'
  desc: string
}> = [
  { value: 'PRESENT', label: '出勤', tone: 'present', desc: '正常到课，按规则扣课时' },
  { value: 'LEAVE', label: '请假', tone: 'leave', desc: '提前请假；一对一/突击班仍计课时' },
  { value: 'ABSENT', label: '缺勤', tone: 'absent', desc: '未到课；已扣课时将全额退还' },
  { value: 'MAKEUP', label: '补课', tone: 'makeup', desc: '随本节补课时到课' },
]

type LessonStudent = {
  id: string
  name: string
  membershipLevel: string
  attendanceId: string | null
  attendanceStatus: string | null
  attendanceStatusRaw: AttStatusRaw
  hoursDeducted: number
}

type TeacherComplianceData = {
  teacher?: {
    id: string
    name: string
    avatar: string | null
    gender: string | null
    tierLevel: string
    subjects: string
  }
  dateLabel?: string
  summary?: {
    totalLessons: number
    attendanceDone: number
    attendancePending: number
    feedbackDone: number
    feedbackPending: number
    missingFeedbackStudents: string[]
  }
  lessons?: Array<{
    id: string
    time: string
    subject: string
    groupName: string
    room: string | null
    attendanceSubmitted: boolean
    feedbackId: string | null
    feedbackSummary: string | null
    feedbackCreatedAt: string | null
    students: LessonStudent[]
    missingFeedbackStudents: string[]
  }>
}

function MembershipBadge({ level }: { level: string }) {
  const normalized = level === 'SVIP' ? 'svip' : level === 'VIP' ? 'vip' : 'regular'
  const label = level === 'SVIP' ? 'SVIP' : level === 'VIP' ? 'VIP' : '普通'
  return <span className={`${styles.memberBadge} ${styles[`member${normalized[0].toUpperCase()}${normalized.slice(1)}`]}`}>{label}</span>
}

function attendanceTone(status: AttStatusRaw, hasRecord: boolean) {
  if (!hasRecord || status === null) return 'unrecorded'
  if (status === 'PRESENT') return 'present'
  if (status === 'MAKEUP') return 'makeup'
  if (status === 'LEAVE') return 'leave'
  return 'absent'
}

export default function TeacherCompliancePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get('teacherId') || ''
  const { division } = useDivision()
  const isMobile = useIsMobile() ?? false
  const queryKey = teacherId ? `/api/dashboard/teacher-compliance?teacherId=${encodeURIComponent(teacherId)}&division=${division}` : null
  const { data, isLoading, mutate } = useSWR<TeacherComplianceData>(queryKey, fetcher)

  const [adjustTarget, setAdjustTarget] = useState<{
    lessonId: string
    studentId: string
    name: string
    current: AttStatusRaw
    hoursDeducted: number
  } | null>(null)
  const [adjusting, setAdjusting] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<{ lessonName: string; feedbackId: string } | null>(null)
  const [revoking, setRevoking] = useState(false)

  const handleAdjust = async (nextStatus: NonNullable<AttStatusRaw>) => {
    if (!adjustTarget) return
    setAdjusting(true)
    try {
      const res = await fetch('/api/admin/attendance/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId: adjustTarget.lessonId, studentId: adjustTarget.studentId, newStatus: nextStatus }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || '考勤更正失败')
      message.success(payload.message || '考勤已更正')
      setAdjustTarget(null)
      await mutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '考勤更正失败')
    } finally {
      setAdjusting(false)
    }
  }

  const handleRevoke = async () => {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      const res = await fetch('/api/admin/feedback/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackId: revokeTarget.feedbackId }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || '撤销失败')
      message.success(payload.message || '反馈已撤销')
      setRevokeTarget(null)
      await mutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '撤销失败')
    } finally {
      setRevoking(false)
    }
  }

  if (!teacherId) {
    return (
      <PageLayout title="今日课堂明细" subtitle="从教师进度列表查看课堂记录">
        <Card className={styles.detailEmpty} bordered={false}>
          <Empty description="缺少教师信息，请返回今日课堂后选择教师" />
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/daily-class')}>返回今日课堂</Button>
        </Card>
      </PageLayout>
    )
  }

  const tierKey = resolveTier(data?.teacher?.tierLevel ?? 'NEW')
  const tier = TIER_THEME[tierKey]
  const teacher = data?.teacher
  const summary = data?.summary
  const lessons = data?.lessons ?? []
  const teacherFallback = getTeacherAvatarUrl(null, teacher?.gender, teacher?.id)

  return (
    <PageLayout
      title={teacher ? `${teacher.name} · 今日课堂` : '教师课堂明细'}
      subtitle={data?.dateLabel ? `${data.dateLabel} · 课程、考勤与反馈` : '查看教师的课程、考勤与反馈'}
    >
      <main className={`${styles.detailPage} ${isMobile ? styles.detailPageMobile : ''}`}>
        <div className={styles.detailToolbar}>
          <Button className={styles.backButton} size="small" icon={<ArrowLeftOutlined />} onClick={() => router.push('/daily-class')}>
            返回今日课堂
          </Button>
        </div>

        {isLoading || !data ? (
          <Card className={styles.loadingCard} bordered={false}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
        ) : (
          <>
            <section className={styles.detailSummary} aria-label="教师今日概况">
              <div className={styles.detailTeacher}>
                <span className={styles.detailAvatarFrame}>
                  <CachedAvatarImage
                    src={getTeacherAvatarUrl(teacher?.avatar, teacher?.gender, teacher?.id)}
                    fallbackSrc={teacherFallback}
                    alt={`${teacher?.name || '教师'}头像`}
                    className={styles.detailAvatar}
                    loading="eager"
                  />
                </span>
                <div className={styles.detailTeacherInfo}>
                  <div className={styles.detailTeacherNameLine}>
                    <h2>{teacher?.name || '教师'}</h2>
                    <span className={styles.tierBadge} style={{ color: tier.accent, background: tier.bg, borderColor: tier.border }}>{tier.label}</span>
                  </div>
                  <div className={styles.detailTeacherMeta}>{teacher?.subjects || '未设置学科'}</div>
                  <div className={styles.detailTeacherMeta}>
                    <CalendarOutlined aria-hidden="true" />
                    <span>{data.dateLabel || '今日'} · {summary?.totalLessons ?? 0} 节课</span>
                  </div>
                </div>
              </div>

              <div className={styles.summaryStrip}>
                <div className={styles.summaryCell}>
                  <strong>{summary?.totalLessons ?? 0}</strong><span>今日课次</span>
                </div>
                <div className={styles.summaryCell}>
                  <strong className={summary?.attendancePending ? styles.summaryNeedsAction : ''}>{summary?.attendancePending ?? 0}</strong><span>待考勤</span>
                </div>
                <div className={styles.summaryCell}>
                  <strong className={summary?.feedbackPending ? styles.summaryNeedsAction : ''}>{summary?.feedbackPending ?? 0}</strong><span>待反馈</span>
                </div>
              </div>
            </section>

            <section className={styles.lessonsSection} aria-labelledby="teacher-lessons-heading">
              <div className={styles.sectionHeading}>
                <h2 id="teacher-lessons-heading">课程明细</h2>
                <span>{lessons.length} 节</span>
              </div>

              {lessons.length === 0 ? (
                <Card className={styles.detailEmpty} bordered={false}>
                  <Empty description="今日暂无课程" />
                </Card>
              ) : (
                <div className={styles.lessonList}>
                  {lessons.map((lesson) => {
                    const attendanceSubmitted = lesson.attendanceSubmitted
                    const feedbackPublished = Boolean(lesson.feedbackSummary)
                    return (
                      <article className={styles.lessonCard} key={lesson.id}>
                        <header className={styles.lessonHeader}>
                          <span className={styles.lessonTime}>{lesson.time}</span>
                          <div className={styles.lessonTitleBlock}>
                            <h3>{lesson.groupName}</h3>
                            <span>
                              {lesson.subject}
                              {lesson.room ? ` · ${lesson.room}` : ''}
                            </span>
                          </div>
                          <div className={styles.lessonStatuses}>
                            <span className={`${styles.statusBadge} ${attendanceSubmitted ? styles.statusComplete : styles.statusPending}`}>
                              {attendanceSubmitted ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
                              {attendanceSubmitted ? '考勤已完成' : '待考勤'}
                            </span>
                            <span className={`${styles.statusBadge} ${feedbackPublished ? styles.statusComplete : styles.statusPending}`}>
                              {feedbackPublished ? <CheckCircleOutlined /> : <FileTextOutlined />}
                              {feedbackPublished ? '反馈已发布' : '反馈未发布'}
                            </span>
                          </div>
                        </header>

                        {!feedbackPublished && lesson.missingFeedbackStudents.length > 0 && (
                          <div className={`${styles.feedbackCallout} ${styles.feedbackPendingCallout}`}>
                            <strong>待补充反馈</strong>
                            <span>{lesson.missingFeedbackStudents.join('、')}</span>
                          </div>
                        )}

                        {feedbackPublished && lesson.feedbackSummary && (
                          <div className={`${styles.feedbackCallout} ${styles.feedbackSummaryCallout}`}>
                            <div>
                              <strong>课堂反馈</strong>
                              <p>{lesson.feedbackSummary.length > 120 ? `${lesson.feedbackSummary.slice(0, 120)}…` : lesson.feedbackSummary}</p>
                            </div>
                            {lesson.feedbackId && (
                              <Button
                                className={styles.revokeButton}
                                danger
                                size="small"
                                onClick={() => setRevokeTarget({ lessonName: lesson.groupName, feedbackId: lesson.feedbackId! })}
                              >
                                撤销反馈
                              </Button>
                            )}
                          </div>
                        )}

                        <div className={styles.studentSection}>
                          <div className={styles.studentHeading}>
                            <span><TeamOutlined aria-hidden="true" /> 学员考勤</span>
                            <span>{lesson.students.length} 人</span>
                          </div>
                          {lesson.students.length === 0 ? (
                            <p className={styles.noStudents}>本节课暂无学员记录</p>
                          ) : (
                            <div className={styles.studentList}>
                              {lesson.students.map((student) => {
                                const tone = attendanceTone(student.attendanceStatusRaw, Boolean(student.attendanceId))
                                return (
                                  <div className={styles.studentRow} key={student.id}>
                                    <div className={styles.studentIdentity}>
                                      <strong>{student.name}</strong>
                                      <MembershipBadge level={student.membershipLevel} />
                                    </div>
                                    <div className={styles.studentActions}>
                                      {student.hoursDeducted > 0 && (
                                        <span className={styles.hoursDeducted}>扣 {student.hoursDeducted} 课时</span>
                                      )}
                                      <button
                                        className={styles.attendanceButton}
                                        data-status={tone}
                                        type="button"
                                        disabled={!student.attendanceId}
                                        onClick={() => student.attendanceId && setAdjustTarget({
                                          lessonId: lesson.id,
                                          studentId: student.id,
                                          name: student.name,
                                          current: student.attendanceStatusRaw,
                                          hoursDeducted: student.hoursDeducted,
                                        })}
                                        title={student.attendanceId ? '点击更正考勤' : '教师尚未提交考勤'}
                                      >
                                        {student.attendanceStatus === null ? '未录' : student.attendanceStatus}
                                        {student.attendanceId && <EditOutlined aria-hidden="true" />}
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}

        <Modal
          open={!!adjustTarget}
          centered
          footer={null}
          onCancel={() => setAdjustTarget(null)}
          width={isMobile ? 'calc(100vw - 24px)' : 420}
          styles={{ content: { borderRadius: 16, padding: '20px 20px 16px' } }}
        >
          {adjustTarget && (
            <div className={styles.adjustDialog}>
              <h2>更正 {adjustTarget.name} 的考勤</h2>
              <p>
                当前为「{STATUS_OPTIONS.find((option) => option.value === adjustTarget.current)?.label ?? '—'}」
                {adjustTarget.hoursDeducted > 0 && `，已扣 ${adjustTarget.hoursDeducted} 课时`}。默认以教师提交为准，仅管理可更正。
              </p>
              <div className={styles.statusOptions}>
                {STATUS_OPTIONS.map((option) => {
                  const active = adjustTarget.current === option.value
                  return (
                    <button
                      className={styles.statusOption}
                      data-tone={option.tone}
                      data-active={active}
                      key={option.value}
                      type="button"
                      disabled={adjusting || active}
                      onClick={() => handleAdjust(option.value)}
                    >
                      <strong>{option.label}{active ? ' · 当前' : ''}</strong>
                      <span>{option.desc}</span>
                    </button>
                  )
                })}
              </div>
              <p className={styles.attendanceWarning}>改为“缺勤”时，该生本节课已扣课时将全额退回其剩余课时。</p>
            </div>
          )}
        </Modal>

        <Modal
          open={!!revokeTarget}
          centered
          title={<span className={styles.revokeTitle}>撤销课堂反馈</span>}
          okText="确认撤销"
          cancelText="再想想"
          okButtonProps={{ danger: true, loading: revoking }}
          onOk={handleRevoke}
          onCancel={() => setRevokeTarget(null)}
          width={isMobile ? 'calc(100vw - 24px)' : 420}
          styles={{ content: { borderRadius: 16 } }}
        >
          <div className={styles.revokeDialogCopy}>
            <p>
              将撤销 <strong>{revokeTarget?.lessonName}</strong> 这节课已发布的反馈，家长端将不再可见。
              通常用于“学生实际未到课、但教师已发反馈”的纠错场景。
            </p>
            <span>对应的教师奖励记录也会同步失效。</span>
          </div>
        </Modal>
      </main>
    </PageLayout>
  )
}
