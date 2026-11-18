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
      display: 'flex', width: '100%', alignItems: 'stretch', textAlign: 'left', border, borderRadius: 12, cursor: 'pointer',
      background: '#FAF8F4', color: 'var(--color-ink)', font: 'inherit', overflow: 'hidden', padding: 0,
    }}>
      <span style={{
        flexShrink: 0, width: 4, background: 'linear-gradient(180deg,#0E5E4E,#C9A45C)',
      }} />
      <span style={{ flex: 1, minWidth: 0, padding: '9px 10px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#17352F' }}>{lesson.subject || '未设置学科'}</span>
          {typeof lesson.headcount === 'number' && (
            <span style={{ marginLeft: 'auto', fontSize: 10.5, padding: '1px 7px', borderRadius: 999, background: 'rgba(14,94,78,.08)', color: '#0E5E4E', fontWeight: 700, whiteSpace: 'nowrap' }}>{lesson.headcount}人</span>
          )}
        </span>
        <span style={{ display: 'block', marginTop: 3, fontSize: 11.5, color: '#667085' }}>
          {lesson.startTime}–{lesson.endTime} · {lesson.teacherName} · {lesson.roomName}
        </span>
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
            const configured = configuredSubjects(group)
            const notToday = configured.filter((subject) => !new Set(lessons.map((l) => l.subject)).has(subject))
            return (
              <details key={group.id} style={{ border: '1px solid #EDE9E1', borderRadius: 14, background: '#fff', overflow: 'hidden', boxShadow: '0 2px 8px rgba(23,47,41,.05)' }}>
                <summary style={{ padding: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    flexShrink: 0, minWidth: 30, textAlign: 'center', padding: '5px 8px', borderRadius: 9,
                    background: 'rgba(14,94,78,.08)', color: '#0E5E4E', fontSize: 13, fontWeight: 800,
                  }}>
                    {lessons.length}
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#17352F' }}>{group.name}</span>
                    <span style={{ display: 'block', marginTop: 2, fontSize: 11, color: '#98A2B3' }}>今日课次 · {group.course?.grade || '未设年级'}</span>
                  </span>
                  <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end', maxWidth: '45%' }}>
                    {configured.slice(0, 3).map((subject) => {
                      const has = lessons.some((l) => l.subject === subject)
                      return <span key={subject} style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10.5, background: has ? 'rgba(29,158,117,.1)' : 'rgba(152,162,179,.12)', color: has ? '#1D9E75' : '#98A2B3' }}>{subject}</span>
                    })}
                    {configured.length > 3 && <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10.5, background: 'rgba(152,162,179,.12)', color: '#98A2B3' }}>+{configured.length - 3}</span>}
                  </span>
                </summary>
                <div style={{ padding: '2px 12px 12px', display: 'grid', gap: 8 }}>
                  {lessons.length ? lessons.map((lesson) => <LessonButton key={lesson.id} lesson={lesson} onClick={() => onLessonClick(lesson)} />) : (
                    <div style={{ padding: '10px 0', color: '#98A2B3', fontSize: 12.5 }}>
                      {notToday.length ? `今日未排：${notToday.join('、')}` : '今日暂无排课'}
                    </div>
                  )}
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
