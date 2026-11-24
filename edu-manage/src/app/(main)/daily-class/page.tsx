'use client'

import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { Card, Skeleton } from 'antd'
import {
  CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { CachedAvatarImage } from '@/components/Common/CachedAvatarImage'
import { useIsMobile } from '@/hooks/useIsMobile'
import { getTeacherAvatarUrl, DEFAULT_TEACHER_AVATAR } from '@/lib/teacher-avatars'
import styles from './today-class.module.css'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type TeacherItem = {
  teacherId: string
  name: string
  gender: string | null
  avatar: string | null
  todayLessons: number
  attendanceDone: number
  pendingAttendance: number
  feedbackDone: number
  pendingFeedback: number
}

type DashboardData = {
  teacherCompliance?: TeacherItem[]
  weekendNextLessons?: Array<{
    id: string
    groupId: string
    groupName: string
    subject: string
    teacher: string
    room: string
    studentCount: number
    date: string
    startTime: string
    endTime: string
  }>
}

export default function DailyClassPage() {
  const router = useRouter()
  const isMobile = useIsMobile() ?? false
  const { data, isLoading } = useSWR<DashboardData>('/api/dashboard', fetcher)

  const teachers = data?.teacherCompliance ?? []
  const upcoming = data?.weekendNextLessons ?? []
  const totalLessons = teachers.reduce((sum, teacher) => sum + teacher.todayLessons, 0)
  const pendingAttendance = teachers.reduce((sum, teacher) => sum + teacher.pendingAttendance, 0)
  const pendingFeedback = teachers.reduce((sum, teacher) => sum + teacher.pendingFeedback, 0)

  const metrics = [
    { label: '今日课次', value: totalLessons, icon: <CalendarOutlined />, tone: styles.metricNeutral },
    { label: '待考勤', value: pendingAttendance, icon: <ClockCircleOutlined />, tone: pendingAttendance ? styles.metricWarning : styles.metricDone },
    { label: '待反馈', value: pendingFeedback, icon: <FileTextOutlined />, tone: pendingFeedback ? styles.metricWarning : styles.metricDone },
    { label: '在岗教师', value: teachers.length, icon: <CheckCircleOutlined />, tone: styles.metricNeutral },
  ]

  return (
    <PageLayout title="今日课堂" subtitle="教师课程、考勤与课堂反馈进度">
      <main className={`${styles.overview} ${isMobile ? styles.overviewMobile : ''}`}>
        <section className={styles.metrics} aria-label="今日课堂统计">
          {metrics.map((metric) => (
            <div className={styles.metric} key={metric.label}>
              <div className={styles.metricLabel}>{metric.icon}<span>{metric.label}</span></div>
              <strong className={`${styles.metricValue} ${metric.tone}`}>
                {isLoading ? '—' : metric.value}
              </strong>
            </div>
          ))}
        </section>

        {upcoming.length > 0 && (
          <section className={styles.upcomingSection} aria-labelledby="weekend-next-lessons">
            <div className={styles.sectionHeading}>
              <h2 id="weekend-next-lessons">周末班下一次上课安排</h2>
              <span>{upcoming[0].date}</span>
            </div>
            <div className={styles.upcomingList}>
              {upcoming.map((lesson) => (
                <button
                  className={styles.upcomingRow}
                  key={lesson.id}
                  type="button"
                  onClick={() => router.push(`/courses/${encodeURIComponent(lesson.groupId)}`)}
                  aria-label={`查看${lesson.groupName}下一次课程安排`}
                >
                  <span className={styles.upcomingTime}>{lesson.startTime}–{lesson.endTime}</span>
                  <span className={styles.upcomingInfo}>
                    <strong>{lesson.groupName} · {lesson.subject}</strong>
                    <small>{lesson.teacher} · {lesson.room} · {lesson.studentCount} 名学员</small>
                  </span>
                  <RightOutlined aria-hidden="true" />
                </button>
              ))}
            </div>
            <span className={styles.upcomingNote}>这是未来课表预览，不计入今日课次、考勤或反馈统计。</span>
          </section>
        )}

        <section className={styles.teacherSection} aria-labelledby="today-class-teachers">
          <div className={styles.sectionHeading}>
            <h2 id="today-class-teachers">教师进度</h2>
            {!isLoading && <span>{teachers.length} 位教师</span>}
          </div>

          {isLoading ? (
            <Card className={styles.loadingCard} variant="borderless">
              <Skeleton active paragraph={{ rows: 4 }} />
            </Card>
          ) : teachers.length === 0 ? (
            <Card className={styles.emptyCard} variant="borderless">
              <CalendarOutlined className={styles.emptyIcon} />
              <strong>今日暂未排课</strong>
              <span>有课程安排后，教师考勤与课堂反馈会显示在这里。</span>
            </Card>
          ) : (
            <div className={styles.teacherList}>
              {teachers.map((teacher) => {
                const attendanceDone = teacher.pendingAttendance === 0
                const feedbackDone = teacher.pendingFeedback === 0
                return (
                  <button
                    className={styles.teacherRow}
                    key={teacher.teacherId}
                    type="button"
                    onClick={() => router.push(`/teacher-compliance?teacherId=${encodeURIComponent(teacher.teacherId)}`)}
                    aria-label={`查看${teacher.name}的今日课程、考勤和反馈明细`}
                  >
                    <span className={styles.teacherIdentity}>
                      <span className={styles.avatarFrame}>
                        <CachedAvatarImage
                          src={getTeacherAvatarUrl(teacher.avatar, teacher.gender, teacher.teacherId)}
                          fallbackSrc={getTeacherAvatarUrl(null, teacher.gender, teacher.teacherId) || DEFAULT_TEACHER_AVATAR}
                          alt={`${teacher.name}头像`}
                          className={styles.teacherAvatar}
                        />
                      </span>
                      <span className={styles.teacherNameBlock}>
                        <strong>{teacher.name}</strong>
                        <span>{teacher.todayLessons} 节课</span>
                      </span>
                    </span>

                    <span className={styles.teacherProgress}>
                      <span className={`${styles.progressItem} ${attendanceDone ? styles.progressComplete : styles.progressPending}`}>
                        <span className={styles.progressLabel}>考勤</span>
                        <strong>{attendanceDone ? '已齐' : `待录 ${teacher.pendingAttendance} 节`}</strong>
                      </span>
                      <span className={`${styles.progressItem} ${feedbackDone ? styles.progressComplete : styles.progressPending}`}>
                        <span className={styles.progressLabel}>反馈</span>
                        <strong>{feedbackDone ? '已齐' : `待发 ${teacher.pendingFeedback} 节`}</strong>
                      </span>
                    </span>

                    <RightOutlined className={styles.rowArrow} aria-hidden="true" />
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </PageLayout>
  )
}
