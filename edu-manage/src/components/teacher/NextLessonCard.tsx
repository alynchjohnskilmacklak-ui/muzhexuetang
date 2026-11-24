import Link from 'next/link'
import { CalendarOutlined, EnvironmentOutlined, RightOutlined } from '@ant-design/icons'
import { localDateKey } from '@/lib/date/local-day'
import styles from './next-lesson-card.module.css'

export type NextLessonCardData = {
  id: string
  lessonDate?: string | Date | null
  startTime?: string | null
  endTime?: string | null
  groupName?: string | null
  courseName?: string | null
  subject?: string | null
  room?: string | null
  studentCount?: number | null
}

function lessonDateLabel(value: NextLessonCardData['lessonDate']) {
  if (!value) return '日期待核对'
  try {
    const dateKey = localDateKey(value)
    const [, month, day] = dateKey.split('-').map(Number)
    const weekday = new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      weekday: 'short',
    }).format(new Date(`${dateKey}T12:00:00+08:00`))
    return `${month}月${day}日 ${weekday}`
  } catch {
    return '日期待核对'
  }
}

export function NextLessonCard({
  lesson,
  previewHref,
  actionLabel = '预览课堂名单',
  showScheduleLink = true,
}: {
  lesson: NextLessonCardData
  previewHref: string
  actionLabel?: string
  showScheduleLink?: boolean
}) {
  const groupName = lesson.groupName || lesson.courseName || '课程'
  const subject = lesson.subject || lesson.courseName || '课程'
  const time = lesson.startTime && lesson.endTime
    ? `${lesson.startTime}–${lesson.endTime}`
    : lesson.startTime || '时间待确认'

  return (
    <article className={styles.card} aria-label={`下次课程：${groupName}`}>
      <div className={styles.heading}>
        <span className={styles.eyebrow}>下次课程</span>
        <span className={styles.date}><CalendarOutlined /> {lessonDateLabel(lesson.lessonDate)}</span>
      </div>
      <h2 className={styles.group}>{groupName}</h2>
      <p className={styles.time}>{time}</p>
      <div className={styles.details}>
        <span>{subject}</span>
        {lesson.room && lesson.room !== '-' ? <span><EnvironmentOutlined /> {lesson.room}</span> : null}
        {Number(lesson.studentCount) > 0 ? <span>本班 {lesson.studentCount} 位学员</span> : null}
      </div>
      <div className={styles.actions}>
        <Link href={previewHref} className={styles.primaryAction}>
          {actionLabel}<RightOutlined />
        </Link>
        {showScheduleLink ? <Link href="/teacher/schedule" className={styles.secondaryAction}>查看完整课表</Link> : null}
      </div>
    </article>
  )
}
