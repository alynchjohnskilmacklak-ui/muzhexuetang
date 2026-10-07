'use client'

import { useMemo, useState } from 'react'
import { addDays, format, subDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Empty, Input, Spin } from 'antd'
import useSWR from 'swr'
import { useDivision } from '@/contexts/DivisionContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { buildClassSchedule, configuredSubjects, type ScheduleClass, type ScheduleLesson } from '@/lib/class-schedule'
import { normalizeSchedulePeriods, type SchedulePeriod } from '@/lib/schedule-periods'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('课表加载失败')
  return response.json()
}

const border = '1px solid var(--color-hairline)'

function LessonButton({ lesson, onClick }: { lesson: ScheduleLesson; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'block', width: '100%', minHeight: 54, padding: '8px 10px',
      textAlign: 'left', border, borderRadius: 10, cursor: 'pointer',
      background: 'var(--color-primary-bg)', color: 'var(--color-ink)',
      font: 'inherit',
    }}>
      <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{lesson.subject || '未设置学科'}</span>
      <span style={{ display: 'block', marginTop: 2, fontSize: 11, color: 'var(--color-ink-muted)' }}>
        {lesson.teacherName} · {lesson.roomName}
      </span>
      <span style={{ display: 'block', marginTop: 2, fontSize: 11, color: 'var(--color-ink-subtle)' }}>
        {lesson.startTime}–{lesson.endTime}{typeof lesson.headcount === 'number' ? ` · ${lesson.headcount}人` : ''}
      </span>
    </button>
  )
}

function GroupSubjects({ group, lessons }: { group: ScheduleClass; lessons: ScheduleLesson[] }) {
  const configured = configuredSubjects(group)
  const scheduled = new Set(lessons.map((lesson) => lesson.subject))
  const notToday = configured.filter((subject) => !scheduled.has(subject))
  return (
    <span style={{ display: 'block', marginTop: 4, fontSize: 11, lineHeight: 1.45, color: 'var(--color-ink-muted)' }}>
      {configured.length > 0 && <span style={{ display: 'block' }}>班级学科：{configured.join('、')}</span>}
      {notToday.length > 0 && <span style={{ display: 'block', color: 'var(--color-ink-subtle)' }}>今日未排：{notToday.join('、')}</span>}
    </span>
  )
}

export function ClassMatrixView({
  selectedDate,
  setSelectedDate,
  onLessonClick,
}: {
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  onLessonClick: (lesson: Record<string, unknown>) => void
}) {
  const { division } = useDivision()
  const isMobile = useIsMobile() ?? false
  const [keyword, setKeyword] = useState('')
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const { data: daily, isLoading: loadingLessons, error: lessonsError } = useSWR(
    `/api/schedules/daily?date=${dateStr}&division=${division}`,
    fetcher,
    { refreshInterval: 180_000, revalidateOnFocus: true },
  )
  const { data: groupsData, isLoading: loadingGroups, error: groupsError } = useSWR(
    `/api/class-groups?division=${division}`,
    fetcher,
    { refreshInterval: 180_000, revalidateOnFocus: true },
  )
  const periods = useMemo(() => normalizeSchedulePeriods(daily?.periods), [daily?.periods])
  const schedule = useMemo(() => buildClassSchedule(
    Array.isArray(groupsData) ? groupsData as ScheduleClass[] : [],
    Array.isArray(daily?.lessons) ? daily.lessons as ScheduleLesson[] : [],
    periods,
  ), [groupsData, daily, periods])
  const classes = useMemo(() => schedule.classes.filter((group) => {
    const term = keyword.trim().toLocaleLowerCase()
    return !term || `${group.name} ${group.course?.grade || ''}`.toLocaleLowerCase().includes(term)
  }), [schedule.classes, keyword])
  const lessonsByGroup = useMemo(() => Object.fromEntries(schedule.classes.map((group) => [group.id, [
    ...Object.values(schedule.byGroup[group.id] || {}).flat(),
    ...(schedule.otherByGroup[group.id] || []),
  ].sort((a, b) => a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime))])), [schedule]) as Record<string, ScheduleLesson[]>
  const lessonsFor = (groupId: string) => lessonsByGroup[groupId] || []

  return (
    <section aria-label="班级课表">
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button type="button" aria-label="前一天" onClick={() => setSelectedDate(subDays(selectedDate, 1))} style={{ minWidth: 44, minHeight: 40, border, borderRadius: 10, background: 'var(--color-surface-1)', cursor: 'pointer' }}>←</button>
        <strong style={{ minHeight: 40, display: 'flex', alignItems: 'center', paddingInline: 12, border, borderRadius: 10, background: 'var(--color-surface-1)', fontSize: 14 }}>
          {format(selectedDate, 'M月d日 EEEE', { locale: zhCN })}
        </strong>
        <button type="button" aria-label="后一天" onClick={() => setSelectedDate(addDays(selectedDate, 1))} style={{ minWidth: 44, minHeight: 40, border, borderRadius: 10, background: 'var(--color-surface-1)', cursor: 'pointer' }}>→</button>
        <button type="button" onClick={() => setSelectedDate(new Date())} style={{ minHeight: 40, paddingInline: 12, border, borderRadius: 10, background: 'var(--color-surface-1)', cursor: 'pointer' }}>今天</button>
        <Input.Search aria-label="搜索班级" placeholder="搜索班级或年级" allowClear value={keyword} onChange={(event) => setKeyword(event.target.value)} style={{ width: isMobile ? '100%' : 220, marginInlineStart: isMobile ? 0 : 'auto' }} />
      </div>

      {(loadingLessons || loadingGroups) && (!daily || !groupsData) ? (
        <div style={{ padding: 60, textAlign: 'center' }}><Spin /></div>
      ) : lessonsError || groupsError ? (
        <Empty description="班级课表加载失败，请刷新重试" />
      ) : classes.length === 0 ? (
        <Empty description={keyword ? '没有匹配的班级' : '当前运营期暂无班级'} />
      ) : isMobile ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {classes.map((group) => {
            const lessons = lessonsFor(group.id)
            return (
              <details key={group.id} style={{ border, borderRadius: 14, background: 'var(--color-surface-1)', overflow: 'hidden' }}>
                <summary style={{ padding: 12, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                  {group.name} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-ink-muted)' }}>· 今日 {lessons.length} 节</span>
                  <GroupSubjects group={group} lessons={lessons} />
                </summary>
                <div style={{ padding: '0 12px 12px', display: 'grid', gap: 8 }}>
                  {lessons.length ? lessons.map((lesson) => <LessonButton key={lesson.id} lesson={lesson} onClick={() => onLessonClick(lesson)} />) : <span style={{ color: 'var(--color-ink-subtle)', fontSize: 13 }}>今日暂无排课</span>}
                </div>
              </details>
            )
          })}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border, borderRadius: 14, background: 'var(--color-surface-1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `88px repeat(${classes.length}, minmax(220px, 1fr))`, minWidth: 88 + classes.length * 220 }}>
            <div style={{ padding: 10, borderBottom: border, background: 'var(--color-canvas)', fontSize: 12, color: 'var(--color-ink-muted)' }}>时段 / 班级</div>
            {classes.map((group) => (
              <div key={group.id} style={{ padding: 10, borderBottom: border, borderInlineStart: border, background: 'var(--color-canvas)' }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{group.name}</div>
                <GroupSubjects group={group} lessons={lessonsFor(group.id)} />
              </div>
            ))}
            {periods.map((period: SchedulePeriod) => (
              <div key={period.id} style={{ display: 'contents' }}>
                <div style={{ padding: '10px 8px', minHeight: period.type === 'CLASS' ? 82 : 30, borderBottom: border, background: 'var(--color-canvas)', fontSize: 11 }}>
                  <strong style={{ display: 'block', color: 'var(--color-ink-muted)' }}>{period.name}</strong>
                  <span style={{ color: 'var(--color-ink-subtle)' }}>{period.start}–{period.end}</span>
                </div>
                {classes.map((group) => (
                  <div key={group.id} style={{ minHeight: period.type === 'CLASS' ? 82 : 30, padding: period.type === 'CLASS' ? 6 : 0, borderBottom: border, borderInlineStart: border, background: period.type === 'CLASS' ? 'var(--color-surface-1)' : 'var(--color-surface-3)', display: 'grid', alignContent: 'start', gap: 4 }}>
                    {period.type === 'CLASS' && (schedule.byGroup[group.id]?.[period.id] || []).map((lesson) => <LessonButton key={lesson.id} lesson={lesson} onClick={() => onLessonClick(lesson)} />)}
                  </div>
                ))}
              </div>
            ))}
            {classes.some((group) => (schedule.otherByGroup[group.id] || []).length > 0) && (
              <>
                <div style={{ padding: 10, background: 'var(--color-canvas)', fontSize: 11, color: 'var(--color-ink-muted)' }}>其他时间</div>
                {classes.map((group) => (
                  <div key={group.id} style={{ padding: 6, borderInlineStart: border, display: 'grid', gap: 4 }}>
                    {(schedule.otherByGroup[group.id] || []).map((lesson) => <LessonButton key={lesson.id} lesson={lesson} onClick={() => onLessonClick(lesson)} />)}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
