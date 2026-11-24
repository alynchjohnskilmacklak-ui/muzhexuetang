import { localDateKey, todayLocal } from '@/lib/date/local-day'

export type FeedbackLessonBlockReason = 'LEAVE' | 'ABSENT'

export interface RawFeedbackLesson {
  id: string
  groupId: string
  scopeId?: string
  subject?: string | null
  studentIds?: string[]
  blockedStudentReasons?: Record<string, FeedbackLessonBlockReason>
  lessonDate?: string
  startTime?: string
  endTime?: string
  isToday?: boolean
  isYesterday?: boolean
  attendanceSubmitted?: boolean
}

export interface GroupedFeedbackSession {
  id: string // Primary lesson ID (first small lesson)
  allLessonIds: string[] // All small lessons included in this session
  scopeId?: string
  groupId: string
  lessonDate?: string
  dateKey: string
  startTime: string
  endTime: string
  smallLessonCount: number
  isToday: boolean
  isYesterday: boolean
  attendanceSubmitted: boolean
  hasAnyAttendanceSubmitted: boolean
  studentIds: string[]
  blockedStudentReasons: Record<string, FeedbackLessonBlockReason>
  rawLessons: RawFeedbackLesson[]
}

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function parseTimeToMinutes(time?: string): number {
  if (!time || !/^\d{1,2}:\d{2}$/.test(time)) return -1
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function formatSessionDateLabel(dateKey: string, isToday: boolean, isYesterday: boolean): string {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return '日期待确认'
  const [year, month, day] = dateKey.split('-').map(Number)
  const dateObj = new Date(Date.UTC(year, month - 1, day))
  const weekday = WEEKDAY_NAMES[dateObj.getUTCDay()] || ''
  const mmdd = `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`

  if (isToday) {
    return `今天 (${mmdd} ${weekday})`
  }
  if (isYesterday) {
    return `昨天 (${mmdd} ${weekday})`
  }
  return `${mmdd} ${weekday}`
}

export function formatSessionOptionLabel(session: GroupedFeedbackSession): string {
  const dateLabel = formatSessionDateLabel(session.dateKey, session.isToday, session.isYesterday)
  const timeSpan = `${session.startTime || '--:--'}-${session.endTime || '--:--'}`
  const lessonCountBadge = session.smallLessonCount > 1
    ? `(${session.smallLessonCount}节连堂)`
    : '(1课时)'
  
  let attendanceStatus = '待考勤'
  if (session.attendanceSubmitted) {
    attendanceStatus = '已完成考勤'
  } else if (session.hasAnyAttendanceSubmitted) {
    attendanceStatus = '部分待考勤'
  }

  return `${dateLabel} · ${timeSpan} ${lessonCountBadge} · ${attendanceStatus}`
}

/**
 * Filter and group classroom lessons for the teacher feedback picker:
 * 1. Filter: Only retain lessons from Today and Yesterday (plus any explicitly requested lesson).
 * 2. Group: Merge consecutive small lessons (e.g. 10:10-10:50 and 11:00-11:40) on the same date
 *    into a single cohesive class session so teachers only need to fill out feedback once.
 */
export function groupFeedbackLessonsIntoSessions(
  lessons: RawFeedbackLesson[],
  selectedScopeId?: string,
  requestedLessonId?: string | null,
  referenceDateKey: string = todayLocal(),
): GroupedFeedbackSession[] {
  if (!lessons.length) return []

  const todayKey = referenceDateKey
  const [ty, tm, td] = todayKey.split('-').map(Number)
  const yesterdayUtc = new Date(Date.UTC(ty, tm - 1, td - 1))
  const yesterdayKey = yesterdayUtc.toISOString().slice(0, 10)

  // Step 1: Filter lessons for the selected scope that are either today, yesterday, or explicitly requested
  const filteredLessons = lessons.filter((lesson) => {
    if (selectedScopeId && lesson.scopeId && lesson.scopeId !== selectedScopeId) return false
    if (selectedScopeId && !lesson.scopeId && lesson.groupId !== selectedScopeId) return false

    const dateKey = lesson.lessonDate ? localDateKey(lesson.lessonDate) : ''
    const isToday = lesson.isToday || dateKey === todayKey
    const isYesterday = lesson.isYesterday || dateKey === yesterdayKey
    const isRequested = Boolean(requestedLessonId && lesson.id === requestedLessonId)

    return isToday || isYesterday || isRequested
  })

  if (!filteredLessons.length) return []

  // Step 2: Sort filtered lessons by date descending, then startTime ascending
  const sortedLessons = [...filteredLessons].sort((a, b) => {
    const aDateKey = a.lessonDate ? localDateKey(a.lessonDate) : ''
    const bDateKey = b.lessonDate ? localDateKey(b.lessonDate) : ''
    const dateCmp = bDateKey.localeCompare(aDateKey)
    if (dateCmp !== 0) return dateCmp
    return String(a.startTime || '').localeCompare(String(b.startTime || ''))
  })

  // Step 3: Group lessons by date and cluster consecutive small lessons (break <= 45 minutes)
  const sessions: GroupedFeedbackSession[] = []
  let currentGroup: RawFeedbackLesson[] = []

  const finalizeGroup = (group: RawFeedbackLesson[]) => {
    if (!group.length) return
    const first = group[0]
    const last = group[group.length - 1]
    const dateKey = first.lessonDate ? localDateKey(first.lessonDate) : ''
    const isToday = group.some((l) => l.isToday || (l.lessonDate && localDateKey(l.lessonDate) === todayKey))
    const isYesterday = group.some((l) => l.isYesterday || (l.lessonDate && localDateKey(l.lessonDate) === yesterdayKey))
    const allSubmitted = group.every((l) => l.attendanceSubmitted)
    const anySubmitted = group.some((l) => l.attendanceSubmitted)

    // Merge studentIds preserving order
    const studentIdSet = new Set<string>()
    for (const l of group) {
      for (const sid of l.studentIds || []) {
        studentIdSet.add(sid)
      }
    }

    // Merge blockedStudentReasons (if any small lesson blocked the student, keep it)
    const mergedBlocked: Record<string, FeedbackLessonBlockReason> = {}
    for (const l of group) {
      if (l.blockedStudentReasons) {
        Object.assign(mergedBlocked, l.blockedStudentReasons)
      }
    }

    sessions.push({
      id: first.id,
      allLessonIds: group.map((l) => l.id),
      scopeId: first.scopeId,
      groupId: first.groupId,
      lessonDate: first.lessonDate,
      dateKey,
      startTime: first.startTime || '--:--',
      endTime: last.endTime || '--:--',
      smallLessonCount: group.length,
      isToday,
      isYesterday,
      attendanceSubmitted: allSubmitted,
      hasAnyAttendanceSubmitted: anySubmitted,
      studentIds: Array.from(studentIdSet),
      blockedStudentReasons: mergedBlocked,
      rawLessons: group,
    })
  }

  for (const lesson of sortedLessons) {
    if (!currentGroup.length) {
      currentGroup.push(lesson)
      continue
    }

    const prev = currentGroup[currentGroup.length - 1]
    const prevDateKey = prev.lessonDate ? localDateKey(prev.lessonDate) : ''
    const curDateKey = lesson.lessonDate ? localDateKey(lesson.lessonDate) : ''

    const sameDay = prevDateKey === curDateKey
    const prevEndMin = parseTimeToMinutes(prev.endTime)
    const curStartMin = parseTimeToMinutes(lesson.startTime)
    const prevSub = (prev.subject || '').trim()
    const curSub = (lesson.subject || '').trim()
    const sameSubject = !prevSub || !curSub || prevSub === curSub
    const withinMaxTwoLessons = currentGroup.length < 2 // 连堂大课最多2节小课封顶

    // Merge if on the same day, same subject, max 2 lessons, and interval <= 45 minutes
    const isConsecutiveSmallLesson = sameDay
      && sameSubject
      && withinMaxTwoLessons
      && prevEndMin >= 0
      && curStartMin >= 0
      && curStartMin >= prevEndMin
      && (curStartMin - prevEndMin) <= 45

    if (isConsecutiveSmallLesson) {
      currentGroup.push(lesson)
    } else {
      finalizeGroup(currentGroup)
      currentGroup = [lesson]
    }
  }

  if (currentGroup.length) {
    finalizeGroup(currentGroup)
  }

  return sessions
}

export interface ConsecutiveLessonMeta {
  isConsecutive: boolean
  sessionSpan: string
  consecutiveIndex: number
  totalInSession: number
  partnerLessonIds: string[]
}

/**
 * Identify and annotate consecutive small lessons on the same date for the same class group,
 * strictly matching teacher and subject, and strictly capped at 2 small lessons (双课连堂).
 * Useful across admin timetable, attendance lists, supervisor views, and parent portals.
 */
export function annotateConsecutiveLessons<T extends {
  id: string
  groupId?: string | null
  lessonDate?: string | Date | null
  startTime?: string | null
  endTime?: string | null
  teacherId?: string | null
  subject?: string | null
}>(lessons: T[]): Map<string, ConsecutiveLessonMeta> {
  const result = new Map<string, ConsecutiveLessonMeta>()
  if (!lessons || !lessons.length) return result

  // 严格按 班级 + 日期 + 老师 + 学科 分桶，杜绝跨学科、跨老师或跨班级串课
  const byGroupDate = new Map<string, T[]>()
  for (const l of lessons) {
    const d = l.lessonDate ? localDateKey(l.lessonDate) : ''
    const g = l.groupId || 'unknown'
    const t = (l.teacherId || '').trim() || 'all'
    const s = (l.subject || '').trim() || 'all'
    const key = `${g}__${d}__${t}__${s}`
    const list = byGroupDate.get(key) || []
    list.push(l)
    byGroupDate.set(key, list)
  }

  for (const list of byGroupDate.values()) {
    if (list.length < 2) continue
    const sorted = [...list].sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')))

    // 教学规范：最多每个学科连上2节小课（双课），严格以2节小课为配对上限
    let currentPair: T[] = []
    const commitPair = (pair: T[]) => {
      if (pair.length !== 2) return
      const span = `${pair[0].startTime || '--:--'}-${pair[1].endTime || '--:--'}`
      pair.forEach((item, idx) => {
        result.set(item.id, {
          isConsecutive: true,
          sessionSpan: span,
          consecutiveIndex: idx + 1,
          totalInSession: 2, // 严格固定为2节大课
          partnerLessonIds: [pair[1 - idx].id],
        })
      })
    }

    for (const item of sorted) {
      if (currentPair.length === 0) {
        currentPair.push(item)
        continue
      }

      const prev = currentPair[0]
      const prevEnd = parseTimeToMinutes(prev.endTime || '')
      const curStart = parseTimeToMinutes(item.startTime || '')
      // 相邻课节间隔必须 <= 45 分钟，且结束时间在开始时间之前或相等
      const isConsecutive = prevEnd >= 0 && curStart >= 0 && curStart >= prevEnd && (curStart - prevEnd) <= 45

      if (isConsecutive) {
        currentPair.push(item)
        commitPair(currentPair)
        currentPair = [] // 配对完成，当前双课闭环，清空以防与后续课程继续堆叠
      } else {
        // 前一节无法连堂，当前节作为新一轮候选起点
        currentPair = [item]
      }
    }
  }

  return result
}

