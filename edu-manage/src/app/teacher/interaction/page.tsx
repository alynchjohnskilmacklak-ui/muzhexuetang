'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { message } from 'antd'
import { BrandModal } from '@/components/Common/BrandModal'
import {
  PICK_RESULTS,
  PICK_RESULT_LABELS,
  isPickResult,
  type PickResult,
} from '@/lib/classroom-interaction'
import {
  getPickRevealDuration,
  getPickRollInterval,
  getRollCandidateId,
  shouldRevealServerPick,
} from '@/lib/classroom-interaction-roll'
import { useInteractionLoad, type PickRow } from './_components/shell'
import styles from './interaction.module.css'

/**
 * 结构化随堂提问点评标签库：按作答表现（答对了 / 部分正确 / 需要订正 / 未作答）
 * 划分具有教育深度的专业评语体系，支持智能联动与跨分类勾选
 */
interface TagCategoryInfo {
  key: PickResult
  label: string
  shortLabel: string
  subLabel: string
  badgeText: string
  icon: string
  themeColor: string
  themeBg: string
  themeBorder: string
  tags: string[]
}

const RESULT_TAG_CATALOG: Record<PickResult, TagCategoryInfo> = {
  CORRECT: {
    key: 'CORRECT',
    label: '答对了 · 优秀表现',
    shortLabel: '优秀表现',
    subLabel: '思路清晰 · 规范完整',
    badgeText: '优秀表现',
    icon: '🎯',
    themeColor: '#2E7D5B',
    themeBg: '#EDF6F1',
    themeBorder: '#CFE7DB',
    tags: [
      '解题思路清晰敏捷，能快速切中题目的核心考点。',
      '解题步骤规范严谨，推导过程逻辑完整无缺漏。',
      '对核心知识点理解透彻，能够举一反三、灵活迁移运用。',
      '分析问题全面透彻，展现出优秀的独立思考能力。',
      '计算准确迅速，解法巧妙新颖，综合表现非常突出。',
      '回答自信大方，学科语言表达流畅清晰，状态极佳。',
      '对常见易错陷阱有敏锐的辨识能力，解题质量很高。',
      '书写规范工整，基础扎实牢固，值得全班同学学习。',
    ],
  },
  PARTIAL: {
    key: 'PARTIAL',
    label: '部分正确 · 启发点拨',
    shortLabel: '启发点拨',
    subLabel: '核心掌握 · 稍有缺漏',
    badgeText: '启发点拨',
    icon: '💡',
    themeColor: '#B7791F',
    themeBg: '#FDF7EC',
    themeBorder: '#E6D3AC',
    tags: [
      '解题大方向完全正确，但在关键步骤的推导上稍有缺漏。',
      '核心考点已基本掌握，在细节审题与信息提取上需更加细心。',
      '思路活跃且有想法，经老师稍加点拨后能迅速理清纠偏。',
      '解法逻辑基本成立，但结尾结论与单位验算不够完整。',
      '对公式原理有较好理解，运用时还需注意适用的边界条件。',
      '课堂思考很积极，但解题语言的专业规范度还需再加强。',
      '已准确找到解题突破口，后半段复杂运算需要加强稳健度。',
      '整体掌握情况良好，建议课后针对细节微瑕稍作巩固复盘。',
    ],
  },
  NEEDS_WORK: {
    key: 'NEEDS_WORK',
    label: '需要订正 · 诊断跟进',
    shortLabel: '诊断订正',
    subLabel: '概念模糊 · 易错纠偏',
    badgeText: '诊断订正',
    icon: '⚠️',
    themeColor: '#C0392B',
    themeBg: '#FDF3F0',
    themeBorder: '#E8C4BB',
    tags: [
      '对本节核心概念理解不够透彻，容易出现公式混淆与误用。',
      '审题不够细致耐心，遗漏了题干中的关键限制条件。',
      '计算过程粗心失误，符号运用不够严谨，解完题需加强验算。',
      '解题步骤存在跳步脱节，推导缺乏因果依据，需规范格式。',
      '落入了常见易错陷阱中，需深入复盘失误原因并及时完成订正。',
      '对该题型的解题路径缺乏清晰认识，需结合例题夯实基础。',
      '思维受限于单一模式，遇到题型变式时未能灵活调整策略。',
      '已针对错误点进行现场指导，要求在笔记本上认真完成订正。',
    ],
  },
  NO_ANSWER: {
    key: 'NO_ANSWER',
    label: '未作答 · 关怀鼓励',
    shortLabel: '关怀鼓励',
    subLabel: '稍有紧张 · 鼓励跟进',
    badgeText: '关怀鼓励',
    icon: '🌱',
    themeColor: '#475569',
    themeBg: '#F1F5F9',
    themeBorder: '#CBD5E1',
    tags: [
      '回答时稍微有些紧张害羞，老师鼓励你平时多大胆表达。',
      '思考时间稍显仓促，先放平心态，跟着老师思路一步一步来。',
      '本讲基础概念环节有所脱节，课后老师会单独为你答疑辅导。',
      '面对新题型缺少解题方向，不妨先从已知定理与条件梳理起。',
      '课堂专注度需进一步提升，紧跟老师的互动节奏积极思考。',
      '不用害怕犯错，课堂提问是发现问题、查漏补缺的最好契机。',
      '本题先认真做好随堂笔记与标记，下节课老师会优先邀请你作答。',
      '课后及时复习本节笔记与例题，遇到不理解的地方随时问老师。',
    ],
  },
}



const RESULT_CLASS: Record<PickResult, string> = {
  CORRECT: styles.resultOnCorrect,
  PARTIAL: styles.resultOnPartial,
  NEEDS_WORK: styles.resultOnNeedsWork,
  NO_ANSWER: styles.resultOnNoAnswer,
}

type RollStage = {
  phase: 'rolling' | 'waiting'
  studentId: string | null
  revealRequested: boolean
}

function tagsOf(comment: string | null) {
  return (comment ?? '').split('、').map((item) => item.trim()).filter(Boolean)
}

export default function PickPage() {
  const { data, canWrite } = useInteractionLoad()
  const [mode, setMode] = useState<'r' | 'l'>('r')
  const [picks, setPicks] = useState<PickRow[]>([])
  const [currentId, setCurrentId] = useState('')
  const [drawing, setDrawing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [rollStage, setRollStage] = useState<RollStage | null>(null)
  const [revealedPickId, setRevealedPickId] = useState('')
  const rollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const randomRunIdRef = useRef(0)
  const pendingRandomPickRef = useRef<PickRow | null>(null)
  const animationDoneRef = useRef(false)
  const revealRequestedRef = useRef(false)

  // 当前学员的评价草稿：点结果/标签只改本地，点「提交」才写库，防止误触直接落库
  const [draftResult, setDraftResult] = useState<PickResult | null>(null)
  const [draftTags, setDraftTags] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [activeTagTab, setActiveTagTab] = useState<PickResult>('CORRECT')
  const [customTagInput, setCustomTagInput] = useState('')
  const [summaryModalOpen, setSummaryModalOpen] = useState(false)

  useEffect(() => {
    // 接口按时间正序返回，列表要最新的在最上面
    setPicks([...(data?.picks ?? [])].reverse())
  }, [data?.picks])

  useEffect(() => () => {
    randomRunIdRef.current += 1
    if (rollTimerRef.current !== null) clearTimeout(rollTimerRef.current)
  }, [])

  const students = useMemo(() => data?.students ?? [], [data?.students])

  // 缺勤、请假不进候选池：既不能抽到，也不能手动点
  const leaveIds = useMemo(() => {
    const set = new Set<string>()
    for (const record of data?.records ?? []) {
      if (record.status === 'LEAVE' && !record.rollCallStatus) set.add(record.studentId)
    }
    return set
  }, [data?.records])

  const blockedIds = useMemo(() => {
    const blocked = new Set(leaveIds)
    for (const record of data?.records ?? []) {
      if (record.status === 'ABSENT' || record.status === 'LEAVE') blocked.add(record.studentId)
      if (record.rollCallStatus === 'ABSENT') blocked.add(record.studentId)
    }
    return blocked
  }, [data?.records, leaveIds])

  const availableIds = useMemo(
    () => students.filter((student) => !blockedIds.has(student.studentId)).map((student) => student.studentId),
    [blockedIds, students],
  )

  const clearRollTimer = () => {
    if (rollTimerRef.current !== null) clearTimeout(rollTimerRef.current)
    rollTimerRef.current = null
  }

  const finishRandomPick = (row: PickRow) => {
    clearRollTimer()
    randomRunIdRef.current += 1
    pendingRandomPickRef.current = null
    setPicks((prev) => [row, ...prev])
    setCurrentId(row.id)
    setRevealedPickId(row.id)
    setRollStage(null)
    setDrawing(false)
  }

  const requestImmediateReveal = () => {
    if (!drawing || !rollStage || rollStage.revealRequested) return
    revealRequestedRef.current = true
    animationDoneRef.current = true
    clearRollTimer()
    const pendingPick = pendingRandomPickRef.current
    if (shouldRevealServerPick({
      serverPickReady: pendingPick !== null,
      animationDone: animationDoneRef.current,
      revealRequested: revealRequestedRef.current,
    }) && pendingPick) {
      finishRandomPick(pendingPick)
      return
    }
    setRollStage({ phase: 'waiting', studentId: null, revealRequested: true })
  }

  // 只有已提交结果的记录才计入次数、×N 和“未提问”；待评（没提交）一律不算
  const submittedPicks = useMemo(() => picks.filter((row) => row.result), [picks])
  const pendingCount = picks.length - submittedPicks.length

  const askedMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of submittedPicks) map.set(row.studentId, (map.get(row.studentId) ?? 0) + 1)
    return map
  }, [submittedPicks])

  const current = picks.find((row) => row.id === currentId) ?? null

  // 切换到别的学员时，草稿以已保存的记录为准；未提交的选择不带走
  useEffect(() => {
    if (!current) {
      setDraftResult(null)
      setDraftTags([])
      setCustomTagInput('')
      return
    }
    const res = isPickResult(current.result) ? current.result : null
    setDraftResult(res)
    setDraftTags(tagsOf(current.comment))
    setCustomTagInput('')
    if (res) {
      setActiveTagTab(res)
    }
  }, [current?.id, current?.result, current?.comment]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectResult = (item: PickResult) => {
    setDraftResult((prev) => {
      const next = prev === item ? null : item
      if (next) {
        setActiveTagTab(next)
      }
      return next
    })
  }

  const toggleTag = (tag: string) => {
    setDraftTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  const handleAddCustomTag = () => {
    const val = customTagInput.trim()
    if (!val) return
    if (!draftTags.includes(val)) {
      setDraftTags((prev) => [...prev, val])
    }
    setCustomTagInput('')
  }

  const removeTag = (tag: string) => {
    setDraftTags((prev) => prev.filter((t) => t !== tag))
  }

  const clearAllTags = () => {
    setDraftTags([])
  }

  const radarSuggestions = useMemo(() => {
    const list: Array<{
      type: 'leave' | 'unasked' | 'needs_work' | 'all_done'
      studentId?: string
      studentName?: string
      title: string
      desc: string
      actionLabel?: string
    }> = []

    for (const record of data?.records ?? []) {
      if ((record.status === 'LEAVE' || record.rollCallStatus === 'LATE') && !blockedIds.has(record.studentId)) {
        const student = students.find((s) => s.studentId === record.studentId)
        if (student && !askedMap.has(student.studentId)) {
          list.push({
            type: 'leave',
            studentId: student.studentId,
            studentName: student.name,
            title: `💡 补漏关怀：${student.name}`,
            desc: record.status === 'LEAVE' ? '此前有请假记录，建议优先提问查漏补缺' : '本节迟到进班，建议提问帮助快速融入课堂',
            actionLabel: `叫${student.name}作答`,
          })
          if (list.length >= 2) break
        }
      }
    }

    for (const p of submittedPicks) {
      if (p.result === 'NEEDS_WORK') {
        const student = students.find((s) => s.studentId === p.studentId)
        if (student && !blockedIds.has(student.studentId)) {
          const latterPicks = submittedPicks.filter((sp) => sp.studentId === p.studentId && sp.createdAt > p.createdAt)
          const resolved = latterPicks.some((lp) => lp.result === 'CORRECT')
          if (!resolved) {
            list.push({
              type: 'needs_work',
              studentId: student.studentId,
              studentName: student.name,
              title: `🔄 巩固复盘：${student.name}`,
              desc: '此前作答出现疑难需订正，建议本节再次抽查巩固成果',
              actionLabel: `再叫${student.name}`,
            })
            break
          }
        }
      }
    }

    const unaskedStudents = students.filter(
      (s) => !blockedIds.has(s.studentId) && !askedMap.has(s.studentId)
    )
    if (unaskedStudents.length > 0) {
      list.push({
        type: 'unasked',
        title: `📢 提问覆盖提醒`,
        desc: `班级尚有 ${unaskedStudents.length} 位学员未被提问（如 ${unaskedStudents.slice(0, 3).map((s) => s.name).join('、')}${unaskedStudents.length > 3 ? '等' : ''}），建议优先提问`,
        studentId: unaskedStudents[0].studentId,
        studentName: unaskedStudents[0].name,
        actionLabel: `叫${unaskedStudents[0].name}作答`,
      })
    } else if (availableIds.length > 0 && submittedPicks.length >= availableIds.length) {
      list.push({
        type: 'all_done',
        title: `🎉 提问全覆盖达成`,
        desc: `太棒了！全班 ${availableIds.length} 位在场学员均已完成当堂提问互动。`,
      })
    }

    return list
  }, [data?.records, blockedIds, students, askedMap, submittedPicks, availableIds.length])

  if (!data) return null

  const nameOf = (studentId: string) => students.find((item) => item.studentId === studentId)?.name || '学员'
  const unasked = students.filter(
    (student) => !blockedIds.has(student.studentId) && !askedMap.has(student.studentId),
  ).length

  const savedResult = current && isPickResult(current.result) ? current.result : null
  const savedTags = current ? tagsOf(current.comment) : []
  const dirty = current !== null
    && (draftResult !== savedResult || draftTags.join('、') !== savedTags.join('、'))

  const create = async (source: 'RANDOM' | 'MANUAL', studentId?: string) => {
    if (!canWrite) {
      message.info('开课前 10 分钟开放抽人与提问功能')
      return
    }
    if (drawing || busy) return
    if (source === 'RANDOM') {
      const runId = randomRunIdRef.current + 1
      randomRunIdRef.current = runId
      clearRollTimer()
      pendingRandomPickRef.current = null
      animationDoneRef.current = false
      revealRequestedRef.current = false
      setRevealedPickId('')
      setDrawing(true)

      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
      const duration = getPickRevealDuration(availableIds.length, reducedMotion)
      const initialStudentId = getRollCandidateId(availableIds, 0)
      setRollStage({
        phase: duration > 0 ? 'rolling' : 'waiting',
        studentId: duration > 0 ? initialStudentId : null,
        revealRequested: false,
      })

      const revealOrWait = () => {
        if (randomRunIdRef.current !== runId) return
        animationDoneRef.current = true
        const pendingPick = pendingRandomPickRef.current
        if (shouldRevealServerPick({
          serverPickReady: pendingPick !== null,
          animationDone: animationDoneRef.current,
          revealRequested: revealRequestedRef.current,
        }) && pendingPick) {
          finishRandomPick(pendingPick)
          return
        }
        setRollStage((currentStage) => currentStage
          ? { ...currentStage, phase: 'waiting', studentId: null }
          : currentStage)
      }

      if (duration > 0) {
        const advance = (index: number, elapsedMs: number) => {
          if (randomRunIdRef.current !== runId) return
          if (elapsedMs >= duration) {
            revealOrWait()
            return
          }
          const visualStudentId = getRollCandidateId(availableIds, index)
          setRollStage((currentStage) => currentStage && !currentStage.revealRequested
            ? { ...currentStage, phase: 'rolling', studentId: visualStudentId }
            : currentStage)
          const delay = Math.min(getPickRollInterval(elapsedMs, duration), duration - elapsedMs)
          rollTimerRef.current = setTimeout(() => advance(index + 1, elapsedMs + delay), delay)
        }
        const firstDelay = getPickRollInterval(0, duration)
        rollTimerRef.current = setTimeout(() => advance(1, firstDelay), firstDelay)
      } else {
        animationDoneRef.current = true
      }

      try {
        // The existing API persists the pick and parent notification before responding;
        // this timer only controls when the teacher sees the server-selected student.
        const response = await fetch('/api/teacher/interaction/pick', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId: data.lesson.id }),
        })
        const payload = (await response.json().catch(() => ({}))) as { error?: string; pick?: PickRow }
        if (randomRunIdRef.current !== runId) return
        if (!response.ok || !payload.pick) {
          clearRollTimer()
          randomRunIdRef.current += 1
          pendingRandomPickRef.current = null
          setRollStage(null)
          setDrawing(false)
          message.warning(payload.error || '暂时无法提问')
          return
        }
        pendingRandomPickRef.current = payload.pick
        if (shouldRevealServerPick({
          serverPickReady: true,
          animationDone: animationDoneRef.current,
          revealRequested: revealRequestedRef.current,
        })) finishRandomPick(payload.pick)
      } catch {
        if (randomRunIdRef.current !== runId) return
        clearRollTimer()
        randomRunIdRef.current += 1
        pendingRandomPickRef.current = null
        setRollStage(null)
        setDrawing(false)
        message.error('网络异常，抽取失败，请重试')
      }
      return
    }

    if (source === 'MANUAL' && studentId && blockedIds.has(studentId)) {
      message.warning('该学员本节课缺勤或请假，已跳过')
      return
    }
    if (source === 'MANUAL') {
      // 该学员已有没提交的待评记录：直接回到那条继续评，不重复新建
      const pending = picks.find((row) => row.studentId === studentId && !row.result)
      if (pending) {
        setCurrentId(pending.id)
        return
      }
    }
    setRevealedPickId('')
    setBusy(true)
    try {
      const response = await fetch('/api/teacher/interaction/pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentId ? { lessonId: data.lesson.id, studentId } : { lessonId: data.lesson.id }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string; pick?: PickRow }
      if (!response.ok || !payload.pick) {
        message.warning(payload.error || '暂时无法提问')
        return
      }
      const row = payload.pick
      setPicks((prev) => [row, ...prev])
      setCurrentId(row.id)
    } catch {
      message.error('网络异常，请重试')
    } finally {
      setBusy(false)
    }
  }

  const submitDraft = async () => {
    if (!canWrite) {
      message.info('开课前 10 分钟开放评价提交')
      return
    }
    if (!current || submitting) return
    if (draftResult === null) {
      message.warning('请先选一个回答结果，再提交')
      return
    }
    setSubmitting(true)
    try {
      const comment = draftTags.join('、') || null
      const questionLabel = current.questionLabel ?? null
      const response = await fetch('/api/teacher/interaction/pick', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickId: current.id, result: draftResult, comment, questionLabel }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        pick?: { result?: string | null; comment?: string | null; questionLabel?: string | null }
      }
      if (!response.ok || !payload.pick) {
        message.error(payload.error || '提交失败，请重试')
        return
      }
      setPicks((prev) => prev.map((row) => (row.id === current.id
        ? {
            ...row,
            result: payload.pick?.result ?? null,
            comment: payload.pick?.comment ?? null,
            questionLabel: payload.pick?.questionLabel ?? questionLabel ?? null,
          }
        : row)))
      message.success('本次评价已提交')
    } catch {
      message.error('网络异常，评价未提交')
    } finally {
      setSubmitting(false)
    }
  }

  const resetDraft = () => {
    if (!current) return
    setDraftResult(savedResult)
    setDraftTags(savedTags)
    setCustomTagInput('')
    if (savedResult) {
      setActiveTagTab(savedResult)
    }
  }

  const summaryReportText = useMemo(() => {
    if (!data) return ''
    const lessonTitle = `${data.lesson.subject || '课堂'} · ${data.lesson.groupName}`
    const lessonTime = `${data.lesson.lessonDate || ''} ${data.lesson.startTime}-${data.lesson.endTime}`
    const totalPicks = submittedPicks.length
    const coveredStudents = askedMap.size
    const totalAvailable = availableIds.length || 1
    const coveragePercent = Math.round((coveredStudents / totalAvailable) * 100)

    const correctCount = submittedPicks.filter((p) => p.result === 'CORRECT').length
    const partialCount = submittedPicks.filter((p) => p.result === 'PARTIAL').length
    const needsWorkCount = submittedPicks.filter((p) => p.result === 'NEEDS_WORK').length
    const noAnswerCount = submittedPicks.filter((p) => p.result === 'NO_ANSWER').length
    const positiveRate = totalPicks > 0 ? Math.round(((correctCount + partialCount) / totalPicks) * 100) : 0

    const starStudentNames = Array.from(new Set(
      submittedPicks
        .filter((p) => p.result === 'CORRECT')
        .map((p) => nameOf(p.studentId))
    )).slice(0, 5)

    let diagnosticNote = ''
    if (correctCount >= totalPicks * 0.6) {
      diagnosticNote = `全班大部分学员解题思路清晰敏捷，核心考点掌握扎实，互动响应迅速。`
    } else if (needsWorkCount >= 2) {
      diagnosticNote = `部分学员在符号运算和关键步骤推导上存在跳步易错，老师已在随堂进行板书纠偏与规范指导。`
    } else {
      diagnosticNote = `学员整体表现良好，对于关键步骤与审题细节仍需课后多加推敲巩固。`
    }

    return `【牧哲学堂 · 随堂提问与学情速报】
📅 课程：${lessonTitle}
⏱️ 时间：${lessonTime}
👥 课堂互动：共提问 ${totalPicks} 人次，覆盖 ${coveredStudents}/${totalAvailable} 位在场学员（覆盖率 ${coveragePercent}%）
📊 作答情况：答对 ${correctCount} 人、启发点拨 ${partialCount} 人、需要订正 ${needsWorkCount} 人${noAnswerCount > 0 ? `、未作答 ${noAnswerCount} 人` : ''}（正答良好率 ${positiveRate}%）
${starStudentNames.length > 0 ? `🎯 表现亮眼学员：${starStudentNames.join('、')}\n` : ''}
📝 教学小结与家校共育建议：
${diagnosticNote}
请家长提醒孩子对照当堂笔记，认真完成订正并复盘易错考点，巩固所学！`
  }, [data, submittedPicks, askedMap.size, availableIds.length])

  const copySummaryText = () => {
    if (!summaryReportText) return
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(summaryReportText)
        .then(() => message.success('已成功复制学情速报文案，可直接发到班级微信群！'))
        .catch(() => fallbackCopy(summaryReportText))
    } else {
      fallbackCopy(summaryReportText)
    }
  }

  const fallbackCopy = (text: string) => {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      message.success('已成功复制学情速报文案，可直接发到班级微信群！')
    } catch {
      message.info('请长按下方文案手动复制')
    }
  }

  const remove = async (pick: PickRow) => {
    try {
      const response = await fetch(`/api/teacher/interaction/pick?pickId=${pick.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('delete failed')
      setPicks((prev) => prev.filter((row) => row.id !== pick.id))
      if (pick.id === currentId) setCurrentId('')
    } catch {
      message.error('删除失败，请重试')
    }
  }

  return (
    <>
      <div className={styles.seg}>
        <button
          type="button"
          className={mode === 'r' ? styles.segOn : undefined}
          onClick={() => setMode('r')}
          disabled={drawing || busy}
        >
          随机抽人
        </button>
        <button
          type="button"
          className={mode === 'l' ? styles.segOn : undefined}
          onClick={() => setMode('l')}
          disabled={drawing || busy}
        >
          点名单
        </button>
      </div>

      {radarSuggestions.length > 0 && (
        <section className={styles.radarBanner}>
          <div className={styles.radarHead}>
            <div className={styles.radarTitleBox}>
              <span className={styles.radarPulseDot} />
              <span className={styles.radarTitle}>课堂关怀雷达</span>
            </div>
            <span className={styles.radarSubtitle}>基于历史学情与考勤智能提示</span>
          </div>
          <div className={styles.radarCards}>
            {radarSuggestions.map((item, idx) => (
              <div key={idx} className={`${styles.radarCard} ${styles[`radarCard_${item.type}`] || ''}`}>
                <div className={styles.radarCardContent}>
                  <strong className={styles.radarCardTitle}>{item.title}</strong>
                  <p className={styles.radarCardDesc}>{item.desc}</p>
                </div>
                {item.actionLabel && item.studentId && (
                  <button
                    type="button"
                    className={styles.radarActionBtn}
                    onClick={() => void create('MANUAL', item.studentId)}
                    disabled={busy || drawing}
                  >
                    {item.actionLabel}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {mode === 'r' ? (
        <>
          {drawing ? (
            <section
              className={`${styles.rollPanel} ${current ? styles.rollPanelCompact : ''}`}
              aria-busy="true"
            >
              <div className={styles.rollHeader}>
                <div className={styles.rollStatusBadge}>
                  <span className={styles.rollPulseDot} />
                  <span className={styles.rollStatusText}>
                    {rollStage?.phase === 'waiting'
                      ? rollStage.revealRequested ? '正在确认服务端结果…' : '正在等待服务端抽取…'
                      : '⚡ 课堂随机抽人中…'}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.rollRevealBtn}
                  onClick={requestImmediateReveal}
                  disabled={rollStage?.revealRequested}
                >
                  {rollStage?.revealRequested ? '正在确认…' : '立即揭晓 ⚡'}
                </button>
              </div>

              <div className={styles.rollReelBox} aria-hidden="true">
                <div className={styles.rollReelMaskTop} />
                <span
                  key={rollStage?.studentId ?? 'waiting'}
                  className={styles.rollName}
                >
                  {rollStage?.studentId ? nameOf(rollStage.studentId) : '···'}
                </span>
                <div className={styles.rollReelMaskBottom} />
              </div>
            </section>
          ) : (
            <button
              type="button"
              className={current ? `${styles.drawButton} ${styles.drawButtonSmall}` : styles.drawButton}
              onClick={() => void create('RANDOM')}
              disabled={busy}
              title={!canWrite ? '开课前 10 分钟开放抽人功能' : undefined}
            >
              {current ? (
                <>
                  <span className={styles.drawIconSmall}>🎲</span>
                  <span className={styles.drawText}>再抽一位学员</span>
                </>
              ) : !canWrite ? (
                <>
                  <div className={styles.drawIcon}>🎲</div>
                  <span className={styles.drawText}>随机抽人提问（开课前10分钟开放）</span>
                  <span className={styles.drawHint}>每人概率均等 (1/N) · 公平随机抽选</span>
                </>
              ) : (
                <>
                  <div className={styles.drawIcon}>🎲</div>
                  <span className={styles.drawText}>随机抽人提问</span>
                  <span className={styles.drawHint}>每人概率均等 (1/N) · 公平随机抽选</span>
                </>
              )}
            </button>
          )}
          <p className={styles.drawHintCentered}>每人被抽概率严格均等 · 缺勤/请假自动跳过 · 可重复抽到</p>
        </>
      ) : (
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>点名单叫人</h2>
              <p className={styles.panelHint}>
                点谁就让谁答；没提问过的显示「未提问」，右上角是本节课已被问过的次数
              </p>
            </div>
            <span className={styles.panelHint}>可叫 {availableIds.length} 人</span>
          </div>
          <div className={styles.rosterGrid}>
            {students.map((student) => {
              const blocked = blockedIds.has(student.studentId)
              const times = askedMap.get(student.studentId) ?? 0
              const selected = current?.studentId === student.studentId
              return (
                <button
                  key={student.studentId}
                  type="button"
                  className={`${styles.rosterCell} ${blocked ? styles.cellLeave : ''} ${current && selected ? styles.cellSelected : ''}`}
                  onClick={() => void create('MANUAL', student.studentId)}
                  disabled={blocked || busy}
                >
                  {times > 0 ? <i className={styles.cellTimes}>×{times}</i> : null}
                  <span className={styles.cellName}>{student.name}</span>
                  <span className={styles.cellBadge}>
                    {leaveIds.has(student.studentId) ? '请假' : blocked ? '缺勤' : times > 0 ? '已提问' : '未提问'}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {current && !drawing ? (
        <section className={`${styles.pickedCard} ${current.id === revealedPickId ? styles.pickedCardGlow : ''}`}>
          <div className={styles.pickedHeroStage}>
            <div className={styles.pickedBadgeRow}>
              <span className={styles.pickedTypeBadge}>
                {current.source === 'MANUAL' ? '👆 名单点问' : '🎲 随机抽中'}
              </span>
              <span className={styles.pickedCountBadge}>
                {(askedMap.get(current.studentId) ?? 0) === 0 ? '✨ 本节首次提问' : `本节已提问 ${askedMap.get(current.studentId)} 次`}
              </span>
            </div>

            <div className={styles.pickedNameRow} aria-live="polite" aria-atomic="true">
              <span className={styles.pickedPrefix}>请</span>
              <span className={styles.pickedNameWrap}>
                <strong
                  key={current.id}
                  className={`${styles.pickedHeroName} ${current.id === revealedPickId ? styles.pickedNameReveal : ''}`}
                >
                  {nameOf(current.studentId)}
                </strong>
                {current.id === revealedPickId && <span className={styles.goldenHaloPulse} />}
              </span>
              <span className={styles.pickedSuffix}>回答</span>
            </div>

            <p className={styles.pickedSubtitle}>
              请选择学员的作答情况，并从下方深度评语库中勾选专业点评
            </p>
          </div>

          <div className={styles.resultGrid}>
            {PICK_RESULTS.map((item) => {
              const cat = RESULT_TAG_CATALOG[item]
              const on = draftResult === item
              return (
                <button
                  key={item}
                  type="button"
                  className={`${styles.resultCard} ${on ? styles[`resultCardActive_${item}`] : ''}`}
                  onClick={() => selectResult(item)}
                >
                  <div className={styles.resultCardHead}>
                    <span className={styles.resultCardTitle}>
                      <span>{cat.icon}</span>
                      <span>{cat.label.split(' · ')[0]}</span>
                    </span>
                    <span className={styles.resultCardCheck}>✓</span>
                  </div>
                  <span className={styles.resultCardSub}>{cat.subLabel}</span>
                </button>
              )
            })}
          </div>

          <div className={styles.tagSection}>
            <div className={styles.tagSectionHead}>
              <span className={styles.tagSectionTitle}>
                <span>🏷️</span>
                <span>教学深度评语（长句库）</span>
              </span>
              <span className={styles.tagSectionHint}>点击长句勾选，支持多选</span>
            </div>

            <div className={styles.tagCategoryTabs} role="tablist">
              {PICK_RESULTS.map((resKey) => {
                const cat = RESULT_TAG_CATALOG[resKey]
                const isActive = activeTagTab === resKey
                return (
                  <button
                    key={resKey}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`${styles.tagCategoryTab} ${isActive ? styles.tagCategoryTabActive : ''}`}
                    style={isActive ? { background: cat.themeColor, color: '#fff', borderColor: cat.themeColor } : undefined}
                    onClick={() => setActiveTagTab(resKey)}
                  >
                    <span className={styles.tagTabIcon}>{cat.icon}</span>
                    <span className={styles.tagTabLabel}>{cat.shortLabel}</span>
                    <span className={styles.tagCountPill}>({cat.tags.length})</span>
                  </button>
                )
              })}
            </div>

            <div className={styles.sentenceList}>
              {RESULT_TAG_CATALOG[activeTagTab].tags.map((sentence) => {
                const isSelected = draftTags.includes(sentence)
                const cat = RESULT_TAG_CATALOG[activeTagTab]
                return (
                  <button
                    key={sentence}
                    type="button"
                    className={`${styles.sentenceCard} ${isSelected ? styles.sentenceCardSelected : ''}`}
                    style={
                      isSelected
                        ? {
                            background: cat.themeBg,
                            borderColor: cat.themeColor,
                          }
                        : undefined
                    }
                    onClick={() => toggleTag(sentence)}
                  >
                    <span
                      className={`${styles.sentenceCheckbox} ${isSelected ? styles.sentenceCheckboxChecked : ''}`}
                      style={
                        isSelected
                          ? {
                              background: cat.themeColor,
                              borderColor: cat.themeColor,
                            }
                          : undefined
                      }
                    >
                      {isSelected ? '✓' : ''}
                    </span>
                    <span
                      className={styles.sentenceText}
                      style={isSelected ? { color: cat.themeColor } : undefined}
                    >
                      {sentence}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className={styles.customCommentRow}>
              <input
                type="text"
                className={styles.customCommentInput}
                placeholder="输入个性化补充评语长句（按回车或点添加）…"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddCustomTag()
                  }
                }}
              />
              <button
                type="button"
                className={styles.customCommentAddBtn}
                onClick={handleAddCustomTag}
                disabled={!customTagInput.trim()}
              >
                + 添加评语
              </button>
            </div>

            {draftTags.length > 0 && (
              <div className={styles.selectedTagsBar}>
                <div className={styles.selectedTagsHeader}>
                  <span className={styles.selectedTagsTitle}>
                    <span>📝</span>
                    <span>已选评语（{draftTags.length} 条）</span>
                  </span>
                  <button
                    type="button"
                    className={styles.selectedTagsClearBtn}
                    onClick={clearAllTags}
                  >
                    清空
                  </button>
                </div>
                <div className={styles.selectedSentenceList}>
                  {draftTags.map((t, idx) => (
                    <div key={t} className={styles.selectedSentenceItem}>
                      <span className={styles.selectedSentenceIndex}>{idx + 1}.</span>
                      <span className={styles.selectedSentenceText}>{t}</span>
                      <button
                        type="button"
                        className={styles.selectedSentenceRemoveBtn}
                        onClick={() => removeTag(t)}
                        aria-label={`移除评语：${t}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={styles.cardActions}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => void submitDraft()}
              disabled={submitting || draftResult === null}
            >
              {submitting ? '提交中…' : '提交本次评价'}
            </button>
            <button type="button" className={styles.ghostBtn} onClick={resetDraft} disabled={!dirty}>
              重置
            </button>
          </div>
          <p className={styles.pickedHint}>
            {dirty
              ? '有未提交的选择：点「提交本次评价」后才会写入；不提交就切换学员或离开，本次选择不会保存。'
              : '结果与专业长句评语提交后写入；家长端同步展示客观作答与深度教学建议。'}
          </p>
        </section>
      ) : null}

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h2 className={styles.panelTitle}>本节提问记录</h2>
            <span className={styles.panelHint}>
              共 {submittedPicks.length} 次
              {unasked > 0 ? ` · 还有 ${unasked} 人没被提问` : ''}
              {pendingCount > 0 ? ` · ${pendingCount} 条待提交` : ''}
            </span>
          </div>
          {submittedPicks.length > 0 && (
            <button
              type="button"
              className={styles.summaryOpenBtn}
              onClick={() => setSummaryModalOpen(true)}
            >
              📊 生成学情速报
            </button>
          )}
        </div>
        {picks.length === 0 ? (
          <p className={styles.emptyLine}>还没有提问记录</p>
        ) : (
          <ul className={styles.historyList}>
            {picks.map((row) => (
              <li
                key={row.id}
                className={`${styles.historyItem} ${row.id === currentId ? styles.historyItemActive : ''} ${row.result ? '' : styles.historyPending}`}
                onClick={() => setCurrentId(row.id)}
              >
                <span className={styles.historyName}>{nameOf(row.studentId)}</span>
                <span className={styles.historyTime}>
                  {new Date(row.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  {' '}
                  {row.source === 'MANUAL' ? '叫' : '抽'}
                </span>
                {row.result ? (
                  <span className={`${styles.tag} ${RESULT_CLASS[row.result as PickResult] || ''}`}>
                    {PICK_RESULT_LABELS[row.result as PickResult] || row.result}
                  </span>
                ) : (
                  <span className={styles.tag}>待评</span>
                )}
                {row.comment ? <span className={styles.historyComment}>{row.comment}</span> : null}
                <button
                  type="button"
                  className={styles.historyDelete}
                  onClick={(event) => {
                    event.stopPropagation()
                    void remove(row)
                  }}
                  aria-label="删除这条提问记录"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <BrandModal
        open={summaryModalOpen}
        onClose={() => setSummaryModalOpen(false)}
        title="📊 本节课堂提问与学情速报"
        width={560}
        footer={null}
      >
        <div className={styles.summaryModalContent}>
          <div className={styles.summaryStatGrid}>
            <div className={styles.summaryStatCard}>
              <span className={styles.summaryStatVal}>{submittedPicks.length}</span>
              <span className={styles.summaryStatLbl}>提问总人次</span>
            </div>
            <div className={styles.summaryStatCard}>
              <span className={styles.summaryStatVal}>
                {Math.round((askedMap.size / (availableIds.length || 1)) * 100)}%
              </span>
              <span className={styles.summaryStatLbl}>全班覆盖率</span>
            </div>
            <div className={styles.summaryStatCard}>
              <span className={styles.summaryStatVal}>
                {submittedPicks.length > 0
                  ? Math.round(
                      ((submittedPicks.filter((p) => p.result === 'CORRECT').length +
                        submittedPicks.filter((p) => p.result === 'PARTIAL').length) /
                        submittedPicks.length) *
                        100,
                    )
                  : 0}%
              </span>
              <span className={styles.summaryStatLbl}>正答良好率</span>
            </div>
          </div>

          <div className={styles.summaryTextBox}>
            <div className={styles.summaryTextHead}>
              <span className={styles.summaryTextTitle}>📋 家校微信群汇报文案（已自动排版）</span>
              <button
                type="button"
                className={styles.summaryCopyTopBtn}
                onClick={copySummaryText}
              >
                复制文本
              </button>
            </div>
            <pre className={styles.summaryPreText}>{summaryReportText}</pre>
          </div>

          <div className={styles.summaryModalActions}>
            <button
              type="button"
              className={styles.summaryCopyBigBtn}
              onClick={copySummaryText}
            >
              📋 一键复制速报文案发到家长群
            </button>
          </div>
        </div>
      </BrandModal>
    </>
  )
}
