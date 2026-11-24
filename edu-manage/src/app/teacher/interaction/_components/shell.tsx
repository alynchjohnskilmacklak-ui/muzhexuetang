'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Spin, message } from 'antd'
import { localDateKey } from '@/lib/date/local-day'
import { type RollCallStatus } from '@/lib/classroom-interaction'
import {
  canWriteTeacherInteraction,
  getDefaultTeacherInteractionLesson,
  getNextTeacherLessons,
  getTeacherLessonDetailHref,
  type TeacherLessonNavigationItem,
} from '@/lib/teacher-lesson-navigation'
import { getRubberBandOffset } from '@/lib/ui-motion'
import { NextLessonCard } from '@/components/teacher/NextLessonCard'
import styles from '../interaction.module.css'

export type InteractionStudent = {
  studentId: string
  name: string
  grade: string | null
  parentUserId: string | null
}

export type LessonOption = TeacherLessonNavigationItem & {
  id: string
  lessonDate: string
  startTime: string
  endTime: string
  subject: string | null
  groupName: string
  courseName: string
  attendanceSubmitted: boolean
  studentCount: number
  room?: string | null
}

export type AttendanceRecord = {
  studentId: string
  status: string
  rollCallStatus: string | null
  markedAt: string | null
}

export type RollCallSubmissionRecord = {
  studentId: string
  status: 'PRESENT' | 'LEAVE' | 'ABSENT' | 'MAKEUP'
  rollCallStatus?: RollCallStatus | null
}

export type PickRow = {
  id: string
  studentId: string
  studentName?: string
  round: number
  source: string
  questionLabel: string | null
  result: string | null
  comment: string | null
  createdAt: string
}

export type InteractionData = {
  lesson: TeacherLessonNavigationItem & {
    id: string
    lessonDate: string
    startTime: string
    endTime: string
    subject: string | null
    groupName: string
    courseName: string
  }
  students: InteractionStudent[]
  isSystemFirstPeriod: boolean
  mealStudentIds: string[]
  attendanceSubmitted: boolean
  attendanceSubmittedAt: string | null
  rollCallSubmitted: boolean
  rollCallSubmittedAt: string | null
  records: AttendanceRecord[]
  picks: PickRow[]
  questionCount: number
  pickedCount: number
}

type LoadState = {
  lessons: LessonOption[]
  nextLessons: LessonOption[]
  data: InteractionData | null
  loading: boolean
  now: Date
  canWrite: boolean
  reload: () => Promise<void>
  saveRollCall: (records: RollCallSubmissionRecord[], mealStudentIds: string[]) => Promise<boolean>
  resetRollCall: () => Promise<boolean>
  saving: boolean
}

type TimerState = {
  durationSec: number
  remaining: number
  running: boolean
  soundOn: boolean
  setDuration: (seconds: number) => void
  start: () => void
  pause: () => void
  reset: () => void
  addTime: (seconds: number) => void
  setSoundOn: (value: boolean) => void
  testAlert: () => void
}

const LoadContext = createContext<LoadState | null>(null)
const TimerContext = createContext<TimerState | null>(null)

export function useInteractionLoad(): LoadState {
  const value = useContext(LoadContext)
  if (!value) throw new Error('InteractionProvider 缺失')
  return value
}

export function useInteractionTimer(): TimerState {
  const value = useContext(TimerContext)
  if (!value) throw new Error('InteractionProvider 缺失')
  return value
}

const TIMER_DEFAULT = 3 * 60

function vibrate(pattern: number | number[]) {
  if (typeof navigator === 'undefined') return
  const vibrateFn = (navigator as unknown as { vibrate?: (pattern: number | number[]) => boolean }).vibrate
  if (typeof vibrateFn === 'function') vibrateFn.call(navigator, pattern)
}

export function InteractionProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialLessonId = searchParams.get('lessonId') || ''

  const [lessons, setLessons] = useState<LessonOption[]>([])
  const [nextLessons, setNextLessons] = useState<LessonOption[]>([])
  const [data, setData] = useState<InteractionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [now, setNow] = useState(() => new Date())

  const currentLessonId = data?.lesson.id ?? ''
  const attendanceSubmitted = Boolean(data?.attendanceSubmitted)
  const rollCallSubmitted = Boolean(data?.rollCallSubmitted)

  const loadLessons = useCallback(async () => {
    const response = await fetch(`/api/teacher/interaction?date=${localDateKey(new Date())}`, { cache: 'no-store' })
    if (!response.ok) return []
    const payload = (await response.json()) as { lessons?: LessonOption[] }
    return payload.lessons ?? []
  }, [])

  const loadNextLessons = useCallback(async () => {
    const response = await fetch('/api/teacher/attendance?scope=term', { cache: 'no-store' }).catch(() => null)
    if (!response?.ok) return []
    const payload = await response.json().catch(() => null) as unknown
    if (!Array.isArray(payload)) return []
    return getNextTeacherLessons(payload as LessonOption[], new Date())
  }, [])

  const loadDetail = useCallback(async (lessonId: string) => {
    const response = await fetch(`/api/teacher/interaction?lessonId=${encodeURIComponent(lessonId)}`, { cache: 'no-store' })
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      throw new Error(payload.error || '加载课次失败')
    }
    return (await response.json()) as InteractionData
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [list, upcoming] = await Promise.all([loadLessons(), loadNextLessons()])
      setLessons(list)
      setNextLessons(upcoming)
      const target = currentLessonId
        || initialLessonId
        || getDefaultTeacherInteractionLesson(list.filter((lesson) => lesson.studentCount > 0), new Date())?.id
        || ''
      const targetHasNoStudents = list.some((lesson) => lesson.id === target && lesson.studentCount === 0)
      if (target && !targetHasNoStudents) {
        setData(await loadDetail(target))
      } else {
        setData(null)
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [currentLessonId, initialLessonId, loadDetail, loadLessons, loadNextLessons])

  useEffect(() => {
    // 5 秒检测一次，确保到达开课前 10 分钟边界时自动解锁并让提示栏平滑消失
    const timerId = window.setInterval(() => setNow(new Date()), 5_000)
    return () => window.clearInterval(timerId)
  }, [])

  useEffect(() => {
    void reload()
    // 首屏只加载一次；之后由切换课次触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveRollCall = useCallback(
    async (records: RollCallSubmissionRecord[], mealStudentIds: string[]) => {
      const lessonId = currentLessonId
      if (!lessonId) return false
      if (attendanceSubmitted) {
        message.warning('本节课考勤已提交，点名已锁定')
        return false
      }
      if (rollCallSubmitted) {
        message.warning('本节课点名已提交，如需改动请先撤销提交')
        return false
      }
      if (records.length === 0) {
        message.warning('还没有可提交的点名记录')
        return false
      }
      setSaving(true)
      try {
        const response = await fetch('/api/teacher/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessonId,
            records,
            rollCallSubmission: true,
            ...(data?.isSystemFirstPeriod ? { mealStudentIds } : {}),
          }),
        })
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string
          message?: string
          pendingReview?: boolean
        }
        if (!response.ok) {
          if (response.status === 409) {
            const latest = await loadDetail(lessonId).catch(() => null)
            if (latest?.attendanceSubmitted) {
              setData(latest)
              message.info('本节课考勤已完成，工资按课次只结算一次')
              return true
            }
          }
          message.error(payload.error || '提交失败')
          return false
        }
        message.success(payload.pendingReview
          ? '授课与考勤记录已提交，等待管理员审核'
          : payload.message || '考勤已提交，本节课工资只结算一次')
        try {
          setData(await loadDetail(lessonId))
        } catch {
          message.warning('考勤已提交，刷新页面可查看最新状态')
        }
        return true
      } catch {
        const latest = await loadDetail(lessonId).catch(() => null)
        if (latest?.attendanceSubmitted) {
          setData(latest)
          message.info('本节课考勤已完成，工资按课次只结算一次')
          return true
        }
        message.error('网络异常，未能确认考勤提交结果，请刷新课次状态后再查看')
        return false
      } finally {
        setSaving(false)
      }
    },
    [attendanceSubmitted, currentLessonId, data, loadDetail, rollCallSubmitted],
  )

  const resetRollCall = useCallback(async () => {
    const lessonId = currentLessonId
    if (!lessonId) return false
    if (attendanceSubmitted) {
      message.warning('本节课考勤已提交，点名不能再改动')
      return false
    }
    setSaving(true)
    try {
      const response = await fetch('/api/teacher/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, action: 'reset' }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        message.error(payload.error || '撤销失败')
        return false
      }
      setData((prev) => (prev ? { ...prev, rollCallSubmitted: false, rollCallSubmittedAt: null } : prev))
      message.success('已撤销提交，可以重新点名')
      return true
    } catch {
      message.error('网络异常，撤销失败')
      return false
    } finally {
      setSaving(false)
    }
  }, [attendanceSubmitted, currentLessonId])

  const switchLesson = useCallback(
    async (lessonId: string) => {
      if (lessons.some((lesson) => lesson.id === lessonId && lesson.studentCount === 0)) {
        message.info('该课次暂未同步应到学员，暂时无法进入课堂互动')
        return
      }
      setLoading(true)
      try {
        setData(await loadDetail(lessonId))
        router.replace(`?lessonId=${lessonId}`)
      } catch (error) {
        message.error(error instanceof Error ? error.message : '加载失败')
      } finally {
        setLoading(false)
      }
    },
    [lessons, loadDetail, router],
  )

const TIMER_STORAGE_KEY = 'mz_teacher_interaction_timer'

type StoredTimer = {
  durationSec: number
  remaining: number
  endsAt: number | null
  running: boolean
  soundOn: boolean
}

function readStoredTimer(): StoredTimer {
  if (typeof window === 'undefined') {
    return { durationSec: TIMER_DEFAULT, remaining: TIMER_DEFAULT, endsAt: null, running: false, soundOn: true }
  }
  try {
    const raw = window.localStorage.getItem(TIMER_STORAGE_KEY)
    if (!raw) return { durationSec: TIMER_DEFAULT, remaining: TIMER_DEFAULT, endsAt: null, running: false, soundOn: true }
    const parsed = JSON.parse(raw) as StoredTimer
    const now = Date.now()
    if (parsed.running && parsed.endsAt) {
      const left = Math.round((parsed.endsAt - now) / 1000)
      if (left > 0) {
        return {
          durationSec: parsed.durationSec || TIMER_DEFAULT,
          remaining: left,
          endsAt: parsed.endsAt,
          running: true,
          soundOn: parsed.soundOn ?? true,
        }
      }
      return {
        durationSec: parsed.durationSec || TIMER_DEFAULT,
        remaining: 0,
        endsAt: null,
        running: false,
        soundOn: parsed.soundOn ?? true,
      }
    }
    return {
      durationSec: parsed.durationSec || TIMER_DEFAULT,
      remaining: typeof parsed.remaining === 'number' ? parsed.remaining : (parsed.durationSec || TIMER_DEFAULT),
      endsAt: null,
      running: false,
      soundOn: parsed.soundOn ?? true,
    }
  } catch {
    return { durationSec: TIMER_DEFAULT, remaining: TIMER_DEFAULT, endsAt: null, running: false, soundOn: true }
  }
}

function writeStoredTimer(state: StoredTimer) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // 忽略写入失败
  }
}

  // ——— 计时器：状态带 localStorage 持久化，切到其他页面或刷新绝不丢
  const audioRef = useRef<AudioContext | null>(null)
  const bellAudioRef = useRef<HTMLAudioElement | null>(null)
  const [durationSec, setDurationState] = useState(TIMER_DEFAULT)
  const [remaining, setRemaining] = useState(TIMER_DEFAULT)
  const [running, setRunning] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const endsAtRef = useRef<number | null>(null)
  const firedRef = useRef(false)

  // 挂载时从 localStorage 恢复状态，切到其他页面再回来毫秒不差
  useEffect(() => {
    const stored = readStoredTimer()
    setDurationState(stored.durationSec)
    setRemaining(stored.remaining)
    setSoundOn(stored.soundOn)
    if (stored.running && stored.endsAt && stored.remaining > 0) {
      endsAtRef.current = stored.endsAt
      setRunning(true)
    }
  }, [])

  const unlockAudio = useCallback(() => {
    if (typeof window === 'undefined') return
    // 预热并解锁真实高保真音频对象
    if (!bellAudioRef.current) {
      const audio = new Audio('/audio/classroom-bell.wav')
      audio.preload = 'auto'
      bellAudioRef.current = audio
    }
    if (!audioRef.current) {
      const Ctor = window.AudioContext
        || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctor) audioRef.current = new Ctor()
    }
    if (audioRef.current && audioRef.current.state === 'suspended') {
      void audioRef.current.resume()
    }
  }, [])

  const playSynthesizedBell = useCallback(() => {
    const ctx = audioRef.current
    if (!ctx) return
    const startAt = ctx.currentTime + 0.05
    // 响亮清脆的 4 音上行钟琴和弦 (880Hz -> 1108Hz -> 1318Hz -> 1760Hz)，带高阶金属泛音
    const notes = [
      { delay: 0.0, freq: 880 },
      { delay: 0.35, freq: 1108 },
      { delay: 0.70, freq: 1318 },
      { delay: 1.05, freq: 1760 },
    ]
    for (const note of notes) {
      const begin = startAt + note.delay
      // 基频振荡器
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'triangle'
      osc1.frequency.setValueAtTime(note.freq, begin)
      gain1.gain.setValueAtTime(0.001, begin)
      gain1.gain.exponentialRampToValueAtTime(0.85, begin + 0.015)
      gain1.gain.exponentialRampToValueAtTime(0.001, begin + 0.8)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(begin)
      osc1.stop(begin + 0.85)

      // 泛音清脆金属共鸣
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(note.freq * 2.76, begin)
      gain2.gain.setValueAtTime(0.001, begin)
      gain2.gain.exponentialRampToValueAtTime(0.35, begin + 0.01)
      gain2.gain.exponentialRampToValueAtTime(0.001, begin + 0.45)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(begin)
      osc2.stop(begin + 0.5)
    }
  }, [])

  const ring = useCallback(() => {
    vibrate([300, 150, 300])
    if (!soundOn) return

    // 优先播放高保真音频文件 /audio/classroom-bell.wav
    if (typeof window !== 'undefined') {
      try {
        if (!bellAudioRef.current) {
          bellAudioRef.current = new Audio('/audio/classroom-bell.wav')
        }
        bellAudioRef.current.currentTime = 0
        bellAudioRef.current.volume = 1.0
        const playPromise = bellAudioRef.current.play()
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // 如遇浏览器限制策略未放行，降级到 Web Audio 合成器高音量播放
            playSynthesizedBell()
          })
          return
        }
      } catch {
        playSynthesizedBell()
        return
      }
    }
    playSynthesizedBell()
  }, [playSynthesizedBell, soundOn])

  useEffect(() => {
    if (!running) return
    const tick = () => {
      const endsAt = endsAtRef.current
      if (!endsAt) return
      const left = Math.round((endsAt - Date.now()) / 1000)
      if (left <= 0) {
        setRemaining(0)
        setRunning(false)
        endsAtRef.current = null
        writeStoredTimer({ durationSec, remaining: 0, endsAt: null, running: false, soundOn })
        if (!firedRef.current) {
          firedRef.current = true
          ring()
        }
        return
      }
      setRemaining(left)
      writeStoredTimer({ durationSec, remaining: left, endsAt, running: true, soundOn })
    }
    tick()
    const timer = window.setInterval(tick, 500)
    return () => window.clearInterval(timer)
  }, [durationSec, ring, running, soundOn])

  const setDuration = useCallback((seconds: number) => {
    setDurationState(seconds)
    setRemaining(seconds)
    setRunning(false)
    endsAtRef.current = null
    firedRef.current = false
    writeStoredTimer({ durationSec: seconds, remaining: seconds, endsAt: null, running: false, soundOn })
  }, [soundOn])

  const start = useCallback(() => {
    unlockAudio()
    const targetRem = remaining > 0 ? remaining : durationSec
    if (remaining <= 0) setRemaining(durationSec)
    firedRef.current = false
    const endsAt = Date.now() + targetRem * 1000
    endsAtRef.current = endsAt
    setRunning(true)
    writeStoredTimer({ durationSec, remaining: targetRem, endsAt, running: true, soundOn })
  }, [durationSec, remaining, soundOn, unlockAudio])

  const pause = useCallback(() => {
    let left = remaining
    if (endsAtRef.current) {
      left = Math.max(0, Math.round((endsAtRef.current - Date.now()) / 1000))
      setRemaining(left)
      endsAtRef.current = null
    }
    setRunning(false)
    writeStoredTimer({ durationSec, remaining: left, endsAt: null, running: false, soundOn })
  }, [durationSec, remaining, soundOn])

  const reset = useCallback(() => {
    setRunning(false)
    endsAtRef.current = null
    firedRef.current = false
    setRemaining(durationSec)
    writeStoredTimer({ durationSec, remaining: durationSec, endsAt: null, running: false, soundOn })
  }, [durationSec, soundOn])

  /** 增减时长：计时中直接延长结束时刻，不打断本次计时 */
  const addTime = useCallback((seconds: number) => {
    setDurationState((prev) => prev + seconds)
    setRemaining((prev) => {
      const nextRem = prev + seconds
      if (endsAtRef.current) {
        endsAtRef.current += seconds * 1000
        writeStoredTimer({ durationSec: durationSec + seconds, remaining: nextRem, endsAt: endsAtRef.current, running, soundOn })
      } else {
        writeStoredTimer({ durationSec: durationSec + seconds, remaining: nextRem, endsAt: null, running: false, soundOn })
      }
      return nextRem
    })
    firedRef.current = false
  }, [durationSec, running, soundOn])

  const handleSetSoundOn = useCallback((val: boolean) => {
    setSoundOn(val)
    writeStoredTimer({ durationSec, remaining, endsAt: endsAtRef.current, running, soundOn: val })
  }, [durationSec, remaining, running])

  const testAlert = useCallback(() => {
    unlockAudio()
    ring()
  }, [ring, unlockAudio])

  const timer = useMemo<TimerState>(() => ({
    durationSec,
    remaining,
    running,
    soundOn,
    setDuration,
    start,
    pause,
    reset,
    addTime,
    setSoundOn: handleSetSoundOn,
    testAlert,
  }), [addTime, durationSec, handleSetSoundOn, pause, remaining, reset, running, soundOn, setDuration, start, testAlert])

  const canWrite = useMemo(() => {
    if (!data?.lesson) return false
    return canWriteTeacherInteraction(data.lesson, now)
  }, [data, now])

  const loadValue = useMemo<LoadState>(() => ({
    lessons,
    nextLessons,
    data,
    loading,
    now,
    canWrite,
    reload,
    saveRollCall,
    resetRollCall,
    saving,
  }), [canWrite, data, lessons, loading, nextLessons, now, reload, resetRollCall, saveRollCall, saving])

  return (
    <LoadContext.Provider value={loadValue}>
      <TimerContext.Provider value={timer}>
        <InteractionFrame onSwitchLesson={switchLesson}>{children}</InteractionFrame>
      </TimerContext.Provider>
    </LoadContext.Provider>
  )
}

const TABS = [
  { key: 'pick', href: '/teacher/interaction', label: '提问' },
  { key: 'roll-call', href: '/teacher/interaction/roll-call', label: '点名' },
  { key: 'timer', href: '/teacher/interaction/timer', label: '计时' },
] as const

export type InteractionTabKey = (typeof TABS)[number]['key']

function formatClock(seconds: number) {
  const safe = Math.max(0, seconds)
  const mm = String(Math.floor(safe / 60)).padStart(2, '0')
  const ss = String(safe % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export function InteractionFrame({
  children,
  onSwitchLesson,
}: {
  children: ReactNode
  onSwitchLesson: (lessonId: string) => void
}) {
  const { data, lessons, loading, nextLessons, now } = useInteractionLoad()
  const [pathname, setPathname] = useState('')
  const [bannerDismissed, setBannerDismissed] = useState(false)
  // 计时器状态放在 Provider，必须无条件调用，不能放在下面的提前 return 之后
  const timer = useInteractionTimer()

  useEffect(() => {
    // 切换课次时恢复提示栏显示
    setBannerDismissed(false)
  }, [data?.lesson?.id])

  useEffect(() => {
    setPathname(window.location.pathname)
  }, [])

  if (loading && !data) {
    return <div className={styles.loading}><Spin /></div>
  }

  if (!data) {
    return (
      <div className={styles.page}>
        <LessonOverview
          lessons={lessons}
          nextLessons={nextLessons}
          selectedLessonId=""
          now={now}
          onSwitchLesson={onSwitchLesson}
        />
        {lessons.some((lesson) => lesson.studentCount > 0) ? (
          <p className={styles.lessonOverviewHint}>选择一节课程即可进入提问、点名和课堂计时。</p>
        ) : null}
      </div>
  )
}

  const canWriteCurrentLesson = canWriteTeacherInteraction(data.lesson, now)

  const currentKey = pathname.endsWith('/roll-call')
    ? 'roll-call'
    : pathname.endsWith('/timer')
      ? 'timer'
      : 'pick'

  // 请假是家长提交的事实，不参与"点到"分母，也不参与抽人
  const leaveIds = new Set(
    data.records
      .filter((item) => item.status === 'LEAVE' && !item.rollCallStatus)
      .map((item) => item.studentId),
  )
  const recordMap = new Map(data.records.map((item) => [item.studentId, item]))
  const askedMap = new Map<string, number>()
  // 未提交结果的待评记录不计入“未提问”统计
  for (const pick of data.picks) {
    if (pick.result) askedMap.set(pick.studentId, (askedMap.get(pick.studentId) ?? 0) + 1)
  }

  let attended = 0
  let lateCount = 0
  let unasked = 0
  for (const student of data.students) {
    const record = recordMap.get(student.studentId)
    const isLate = record?.rollCallStatus === 'LATE'
    const isPresent = record?.rollCallStatus === 'PRESENT'
      || (!record?.rollCallStatus && (record?.status === 'PRESENT' || record?.status === 'MAKEUP'))
    const isAbsent = record?.rollCallStatus === 'ABSENT' || record?.status === 'ABSENT'
    if (isLate) {
      lateCount += 1
      attended += 1
    } else if (isPresent) {
      attended += 1
    }
    if (!isAbsent && !leaveIds.has(student.studentId) && !askedMap.has(student.studentId)) {
      unasked += 1
    }
  }
  const eligible = data.students.length - leaveIds.size
  const timerActive = timer.running || timer.remaining < timer.durationSec

  return (
    <div className={styles.page}>
      {/* 仅在今天有2节或以上多门排课需要切换时，才在顶部展示紧凑课次切换卡片；单节课或课前预览模式不重复显示今日无课/下次课程 */}
      {lessons.length > 1 && (
        <LessonOverview
          lessons={lessons}
          nextLessons={nextLessons}
          selectedLessonId={data.lesson.id}
          now={now}
          onSwitchLesson={onSwitchLesson}
        />
      )}

      {!canWriteCurrentLesson && !bannerDismissed && (
        <div className={styles.previewNoticeBanner} role="status">
          <div className={styles.previewNoticeIcon} aria-hidden="true">⏳</div>
          <div className={styles.previewNoticeContent}>
            <span className={styles.previewNoticeTitle}>课前预览模式</span>
            <span className={styles.previewNoticeDesc}>开课前 10 分钟自动解锁全部功能（名单已同步，计时器可用）</span>
          </div>
          <button
            type="button"
            className={styles.previewNoticeClose}
            onClick={() => setBannerDismissed(true)}
            aria-label="关闭提示"
            title="关闭提示"
          >
            ✕
          </button>
        </div>
      )}

      <header className={styles.headBar}>
        <div className={styles.headText}>
          <h1 className={styles.headTitle}>{data.lesson.groupName}</h1>
          <p className={styles.headSub}>
            {data.lesson.startTime}–{data.lesson.endTime} · {data.lesson.subject || data.lesson.courseName}
          </p>
        </div>
        <div className={styles.headStats}>
          <span>已点到 {attended}/{eligible}</span>
          {lateCount > 0 ? <span className={styles.statWarn}>迟到 {lateCount}</span> : null}
          <span>未提问 {unasked} 人</span>
          {timerActive ? (
            <Link
              href={`/teacher/interaction/timer?lessonId=${data.lesson.id}`}
              className={styles.timerChip}
            >
              ⏱ {formatClock(timer.remaining)}
            </Link>
          ) : null}
        </div>
      </header>

      {data.attendanceSubmitted && (
        <div className={styles.syncBar}>
          ✅ 本节课考勤已通过点名同步完成（已扣减课时并计入出勤，无需前往考勤录入页）
        </div>
      )}

      {children}

      <nav className={`${styles.tabs} ${styles.tabsSticky}`} aria-label="课堂互动功能">
        {TABS.map((tab) => {
          const active = tab.key === currentKey
          return (
            <Link
              key={tab.key}
              href={`${tab.href}?lessonId=${data.lesson.id}`}
              className={`${styles.tab} ${active ? styles.tabActive : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

function LessonOverview({
  lessons,
  nextLessons,
  selectedLessonId,
  now,
  onSwitchLesson,
}: {
  lessons: LessonOption[]
  nextLessons: LessonOption[]
  selectedLessonId: string
  now: Date
  onSwitchLesson: (lessonId: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const pullGestureRef = useRef<{ pointerId: number; startY: number; moved: boolean } | null>(null)
  const pullExpandThreshold = 56
  const pullTrackLimit = 76

  const startPull = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isExpanded || !event.isPrimary || event.button !== 0) return
    pullGestureRef.current = { pointerId: event.pointerId, startY: event.clientY, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const movePull = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = pullGestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return

    const distance = Math.max(0, event.clientY - gesture.startY)
    if (!gesture.moved && distance < 5) return
    gesture.moved = true
    setIsDragging(true)
    setPullDistance(
      distance <= pullTrackLimit
        ? distance
        : pullTrackLimit + getRubberBandOffset(distance - pullTrackLimit, 28),
    )
  }

  const settlePull = (event: ReactPointerEvent<HTMLDivElement>, cancelled = false) => {
    const gesture = pullGestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return

    const pulledDistance = event.clientY - gesture.startY
    pullGestureRef.current = null
    setPullDistance(0)
    setIsDragging(false)
    if (!cancelled && gesture.moved && pulledDistance >= pullExpandThreshold) {
      setIsExpanded(true)
    }
  }

  // 如果已经进入了具体课次交互页面（selectedLessonId 存在），且今日没有其他排课列表，直接不渲染冗余卡片
  if (selectedLessonId && lessons.length === 0) {
    return null
  }

  if (lessons.length === 0) {
    const nextLesson = nextLessons[0]
    return (
      <section className={styles.lessonOverview} aria-labelledby="interaction-lessons-title">
        <div className={styles.lessonOverviewHead}>
          <h2 id="interaction-lessons-title" className={styles.lessonOverviewTitle}>今天的课程</h2>
        </div>
        <div className={styles.lessonDayEmpty}>
          <strong>今天没有排课</strong>
          <span>{nextLesson ? '这是最近的一节后续课程。' : '目前没有后续课程安排。'}</span>
        </div>
        {nextLesson ? (
          <NextLessonCard
            lesson={nextLesson}
            previewHref={getTeacherLessonDetailHref(nextLesson.id)}
            actionLabel="预览课堂名单"
          />
        ) : (
          <Link href="/teacher/schedule" className={styles.scheduleLink}>查看完整课表</Link>
        )}
      </section>
    )
  }

  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId)
  const selectedLessonUnavailable = selectedLesson?.studentCount === 0
  const selectedLessonStatus = selectedLessonUnavailable
    ? '暂无应到学员'
    : selectedLesson?.attendanceSubmitted
      ? '考勤已提交'
      : selectedLesson && canWriteTeacherInteraction(selectedLesson, now)
        ? '互动已开放'
        : selectedLesson
          ? '等待开课'
          : ''
  const selectedLessonStatusClass = selectedLessonUnavailable
    ? styles.lessonStatusUnavailable
    : selectedLesson?.attendanceSubmitted
      ? styles.lessonStatusDone
      : selectedLesson && canWriteTeacherInteraction(selectedLesson, now)
        ? styles.lessonStatusOpen
        : styles.lessonStatusWaiting
  const selectableLessonCount = lessons.filter((lesson) => lesson.studentCount > 0).length
  const stackPreviewLessons = lessons
    .filter((lesson) => lesson.id !== selectedLessonId)
    .slice(0, 2)

  return (
    <section className={styles.lessonOverview} aria-labelledby="interaction-lessons-title">
      <div className={styles.lessonOverviewHead}>
        <h2 id="interaction-lessons-title" className={styles.lessonOverviewTitle}>今天的课程</h2>
        <span className={styles.lessonOverviewCount}>共 {lessons.length} 节</span>
      </div>
      <div className={`${styles.lessonStack} ${isExpanded ? styles.lessonStackExpanded : ''} ${isDragging ? styles.lessonStackDragging : ''}`}>
        {stackPreviewLessons.map((lesson, index) => {
          const depth = index + 1
          const weightedSink = pullDistance * (depth === 1 ? 0.24 : 0.42)
          const baseOffset = depth * 7
          const scale = 1 - depth * 0.018
          return (
            <div
              key={lesson.id}
              className={styles.lessonStackBack}
              aria-hidden="true"
              style={{
                zIndex: 3 - depth,
                transform: `translate3d(0, ${baseOffset + weightedSink}px, 0) scale(${scale})`,
              }}
            />
          )
        })}
        <button
          type="button"
          className={`${styles.lessonSelectorSummary} ${selectedLesson ? styles.lessonSelectorSummarySelected : ''}`}
          style={{ transform: `translate3d(0, ${pullDistance}px, 0)` }}
          onClick={() => setIsExpanded((expanded) => !expanded)}
          aria-expanded={isExpanded}
          aria-controls="interaction-lesson-options"
          aria-label={`${isExpanded ? '收起' : '展开'}当天课程列表${selectedLesson ? `，当前课次 ${selectedLesson.groupName} ${selectedLesson.startTime}` : ''}`}
        >
          <span className={styles.lessonSelectorText}>
            <strong className={styles.lessonSelectorTitle}>
              {selectedLesson?.groupName || (selectableLessonCount > 0 ? '选择一节课程' : '暂无可选择课次')}
            </strong>
            <span className={styles.lessonSelectorMeta}>
              {selectedLesson
                ? `${selectedLesson.startTime}${selectedLesson.endTime ? `–${selectedLesson.endTime}` : ''} · ${selectedLesson.subject || selectedLesson.courseName} · ${selectedLesson.studentCount} 位学员`
                : selectableLessonCount > 0
                  ? `展开查看当天 ${lessons.length} 节课程并切换`
                  : `当天 ${lessons.length} 节课程均暂无应到学员名单`}
            </span>
          </span>
          <span className={styles.lessonSelectorAction}>
            {selectedLessonStatus ? (
              <span className={`${styles.lessonStatus} ${selectedLessonStatusClass}`}>
                {selectedLessonStatus}
              </span>
            ) : null}
            <span
              className={`${styles.lessonSelectorChevron} ${isExpanded ? styles.lessonSelectorChevronExpanded : ''}`}
              aria-hidden="true"
            />
          </span>
        </button>
        {!isExpanded ? (
          <div
            className={styles.lessonPullHandle}
            aria-hidden="true"
            onPointerDown={startPull}
            onPointerMove={movePull}
            onPointerUp={(event) => settlePull(event)}
            onPointerCancel={(event) => settlePull(event, true)}
          >
            <span className={styles.lessonPullGrip} />
          </div>
        ) : null}
      </div>
      <div
        id="interaction-lesson-options"
        className={`${styles.lessonOptions} ${isExpanded ? styles.lessonOptionsExpanded : ''}`}
        hidden={!isExpanded}
      >
        {lessons.filter((lesson) => lesson.id !== selectedLessonId).map((lesson, index) => {
          const selected = lesson.id === selectedLessonId
          const unavailable = lesson.studentCount === 0
          const interactionOpen = canWriteTeacherInteraction(lesson, now)
          const statusClass = unavailable
            ? styles.lessonStatusUnavailable
            : lesson.attendanceSubmitted
              ? styles.lessonStatusDone
              : interactionOpen
                ? styles.lessonStatusOpen
                : styles.lessonStatusWaiting
          const statusLabel = unavailable
            ? '暂无应到学员'
            : lesson.attendanceSubmitted
              ? '考勤已提交'
              : interactionOpen
                ? '互动已开放'
                : '等待开课'

          return (
            <button
              key={lesson.id}
              type="button"
              className={`${styles.lessonOption} ${selected ? styles.lessonOptionCurrent : ''} stagger-item`}
              style={{ animationDelay: `${Math.min(index, 7) * 36}ms` }}
              onClick={() => {
                setIsExpanded(false)
                onSwitchLesson(lesson.id)
              }}
              disabled={selected || unavailable}
              aria-label={`${lesson.startTime}，${lesson.groupName}，${lesson.courseName}，${lesson.studentCount}位学员，${statusLabel}${selected ? '，当前课次' : ''}`}
              aria-pressed={selected}
            >
              <span className={styles.lessonOptionTime}>
                <strong>{lesson.startTime}</strong>
                {lesson.endTime ? <small>{lesson.endTime}</small> : null}
              </span>
              <span className={styles.lessonOptionBody}>
                <strong>{lesson.groupName}</strong>
                <span>{lesson.subject || lesson.courseName} · {lesson.studentCount} 位学员</span>
              </span>
              <span className={`${styles.lessonStatus} ${statusClass}`}>
                {selected ? '当前课次' : statusLabel}
              </span>
            </button>
          )
        })}
      </div>
      {isExpanded && lessons.every((lesson) => lesson.studentCount === 0) ? (
        <p className={styles.lessonOverviewHint}>课程已列出，但当前没有可参与互动的应到学员名单，请联系管理员核对排课名单。</p>
      ) : null}
    </section>
  )
}

export { formatClock, vibrate }
