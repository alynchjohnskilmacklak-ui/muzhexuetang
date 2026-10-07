import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireCurrentTeacher } from '@/lib/teacher-portal'
import { resolveTeacherFeedbackCreationScope } from '@/lib/classroom-feedback/access'
import { AIProviderError, callDeepSeek, callDoubao, callKimi } from '@/lib/ai/client'
import { findVerifiedKnowledgeCard } from '@/lib/classroom-feedback/knowledge-point-cards'
import { getKnowledgePointOptions } from '@/lib/classroom-feedback/subject-knowledge-points'
import { normalizeTextbookGrade, textbookEdition } from '@/lib/classroom-feedback/textbook-editions'
import {
  aiProviderLabel,
  anonymizeText,
  buildArticleSystemPrompt,
  buildCardSystemPrompt,
  CHAT_DRAFT_MAX,
  CHAT_HISTORY_MAX,
  CHAT_USER_INPUT_MAX,
  parseCardOnly,
  parseSingleArticle,
  resolveAIProvider,
  type ChatArticleItem,
  type ChatFailedItem,
  type ChatModelInput,
  type ChatStudent,
} from '@/lib/classroom-feedback/ai-chat'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest) => {
  const { teacher, prisma } = await requireCurrentTeacher()
  const body = await req.json() as Record<string, unknown>
  const ids = Array.isArray(body.studentIds) ? body.studentIds.filter((value): value is string => typeof value === 'string') : []
  const mode = body.mode === 'followup' ? 'followup' : 'generate'
  if (ids.length < 1 || ids.length > 5 || new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: '请勾选 1 至 5 名学生后使用 AI 助手' }, { status: 400 })
  }
  const userInput = typeof body.userInput === 'string' ? body.userInput.trim().slice(0, CHAT_USER_INPUT_MAX) : ''
  if (userInput.replace(/\s/g, '').length < 2) {
    return NextResponse.json({ error: '请输入课堂要点或修改要求' }, { status: 400 })
  }

  const scope = await resolveTeacherFeedbackCreationScope(prisma, {
    teacherId: teacher.id,
    classLessonId: typeof body.classLessonId === 'string' ? body.classLessonId : null,
    feedbackGroupId: typeof body.groupId === 'string' ? body.groupId : null,
    requestedStudentIds: ids,
    requestedSubject: typeof body.subject === 'string' ? body.subject : null,
  })
  if (!scope.allowed || scope.students.length !== ids.length) {
    return NextResponse.json({ error: '所选学生不属于当前教师的这节课或该学科，请重新选择' }, { status: 403 })
  }

  const provider = resolveAIProvider()
  const providerLabel = aiProviderLabel(provider)

  const observations = body.observations && typeof body.observations === 'object'
    ? body.observations as Record<string, unknown>
    : {}
  const performance = body.performance && typeof body.performance === 'object'
    ? body.performance as Record<string, unknown>
    : {}
  const selected: ChatStudent[] = ids.map((id) => ({
    id,
    name: scope.students.find((student) => student.id === id)?.name || '学生',
    observation: typeof observations[id] === 'string' ? observations[id].trim().slice(0, 350) : '',
  }))
  // 把课堂要点中每名学生被提到的句子摘录出来，挂到该生自己的个人观察上（与老师显式填写等价），
  // 同时从课堂要点中移除这些句子，避免 AI 从自由文本里把学生表现张冠李戴到其他学生的反馈里。
  let mentionStrippedNote = userInput
  if (userInput) {
    // 按句号、逗号、顿号、分号、换行等把课堂要点拆成片段，确保一段只描述一名学生（如"牛博研有点低烧…，马子墨主动举手…"要拆成两段）。
    const sentences = userInput.split(/[。！？!?\n，,、；;]/).map((t) => t.trim()).filter((t) => t.length > 0)
    const removed = new Set<string>()
    for (const student of scope.students) {
      if (!student.name || student.name.length < 2) continue
      const hits = sentences.filter((t) => t.includes(student.name)).slice(0, 3)
      if (hits.length) {
        const target = selected.find((s) => s.id === student.id)
        if (target) {
          const merged = [target.observation, ...hits].filter(Boolean).join('；')
          target.observation = merged.slice(0, 350)
        }
        hits.forEach((t) => removed.add(t))
      }
    }
    mentionStrippedNote = sentences.filter((t) => !removed.has(t)).join('。')
  }

  const subject = typeof body.subject === 'string' ? body.subject.slice(0, 30) : ''
  const gradeRows = await prisma.student.findMany({ where: { id: { in: ids } }, select: { id: true, grade: true } })
  const grades = [...new Set(gradeRows.map((row) => normalizeTextbookGrade(row.grade)).filter(Boolean))]
  if (grades.length !== 1) {
    return NextResponse.json({ error: '请选择同一年级且已填写年级的学生，以便匹配教材版本' }, { status: 400 })
  }
  const grade = grades[0]
  const edition = textbookEdition(grade, subject)
  if (!edition) {
    return NextResponse.json({ error: `暂不支持 ${grade}${subject} 的教材版本，请先在学科教材版本配置中补充` }, { status: 400 })
  }
  const verifiedCard = findVerifiedKnowledgeCard(edition, grade, subject, userInput)

  // 追问时目标学生：显式 targetStudentIds（前端已让老师确认），默认全部当前勾选学生。
  const rawTargetIds = Array.isArray(body.targetStudentIds)
    ? body.targetStudentIds.filter((value): value is string => typeof value === 'string')
    : []
  const targetIds = rawTargetIds.length ? rawTargetIds.filter((id) => ids.includes(id)) : ids
  if (mode === 'followup' && !targetIds.length) {
    return NextResponse.json({ error: '请先选择本次修改的学生' }, { status: 400 })
  }
  const targetSet = new Set(targetIds)

  const rawMastery = body.mastery && typeof body.mastery === 'object' ? body.mastery as Record<string, unknown> : {}
  const rawTags = body.tags && typeof body.tags === 'object' ? body.tags as Record<string, unknown> : {}
  // 学生映射为 S1/S2/S3 再发送给外部模型，不发送真实姓名和数据库 ID。
  const anonymize = (value: string) => anonymizeText(value, selected)
  const input = {
    subject,
    grade,
    edition,
    lessonNote: anonymize(mentionStrippedNote),
    verifiedCard,
    students: selected.map((student, index) => {
      const rawLevel = String(performance[student.id] || '')
      const rawMasteryValue = String(rawMastery[student.id] || '')
      const rawTagList = Array.isArray(rawTags[student.id])
        ? (rawTags[student.id] as unknown[]).filter((value): value is string => typeof value === 'string').slice(0, 12)
        : []
      return {
        key: `S${index + 1}`,
        level: ['GREAT', 'OKAY', 'NEEDS_IMPROVEMENT'].includes(rawLevel) ? rawLevel : '未评',
        observation: anonymize(student.observation) || '教师未提供个人课堂观察，不能推断个人表现或掌握程度',
        mastery: rawMasteryValue || undefined,
        tags: rawTagList,
      }
    }),
  }

  const history: Array<{ role: 'user' | 'assistant'; content: string }> = []
  if (mode === 'followup') {
    const rawHistory = Array.isArray(body.messages) ? body.messages.slice(-CHAT_HISTORY_MAX) : []
    for (const message of rawHistory) {
      if (!message || typeof message !== 'object') continue
      const record = message as { role?: unknown; content?: unknown }
      if (record.role === 'user' || record.role === 'assistant') {
        const content = typeof record.content === 'string' ? anonymize(record.content.trim().slice(0, 600)) : ''
        if (content) history.push({ role: record.role, content })
      }
    }
  }
  const drafts = mode === 'followup' && Array.isArray(body.drafts)
    ? selected
        .map((student, index) => {
          if (!targetSet.has(student.id)) return null
          const key = `S${index + 1}`
          const draft = body.drafts as unknown[]
          const row = draft.find((entry) => entry && typeof entry === 'object' && (entry as { studentId?: unknown }).studentId === student.id) as { draft?: unknown } | undefined
          return { key, draft: typeof row?.draft === 'string' ? anonymize(row.draft.trim().slice(0, CHAT_DRAFT_MAX)) : '' }
        })
        .filter((item): item is { key: string; draft: string } => Boolean(item && item.draft))
    : []

  try {
    const knowledgeCandidates = getKnowledgePointOptions(subject, grade).slice(0, 12)
    const chatInput: ChatModelInput = {
      mode,
      subject,
      grade,
      edition,
      lessonNote: input.lessonNote,
      verifiedCard,
      students: input.students,
      history,
      drafts,
      knowledgeCandidates,
      targetKeys: selected.map((_, index) => `S${index + 1}`).filter((_, index) => targetSet.has(ids[index])),
      correction: mode === 'followup' ? `修改要求：${input.lessonNote}` : undefined,
    }

    const call = (params: { system: string; user: string; maxTokens: number; temperature: number }) =>
      provider === 'doubao'
        ? callDoubao({ ...params, jsonMode: true })
        : provider === 'deepseek'
          ? callDeepSeek({ ...params, jsonMode: true })
          : callKimi(params)

    // 单请求失败重试（DeepSeek/豆包偶发连接抖动或单路 5xx；fetch failed 类瞬时错误重试基本必成）
    const callWithRetry = async (params: { system: string; user: string; maxTokens: number; temperature: number }, retries = 3) => {
      let lastError: unknown
      for (let attempt = 0; attempt < retries; attempt += 1) {
        try {
          return await call(params)
        } catch (error) {
          lastError = error
          console.warn(`[chat-retry] 第${attempt + 1}次失败，重试:`, error instanceof Error ? error.message : String(error))
          await new Promise((resolve) => setTimeout(resolve, 900 * (attempt + 1)))
        }
      }
      throw lastError
    }

    // 目标学生（生成=全部勾选；追问=targetIds）
    const targets = selected
      .map((student, index) => ({ key: `S${index + 1}`, student, index }))
      .filter((item) => targetSet.has(item.student.id))

    const userPayload = { mode, subject, grade, edition, lessonNote: input.lessonNote }

    // 并发：1 个知识卡请求 + 每学生 1 个文章请求（5 人时最多 6 个并发，各请求独立计时）
    // maxTokens 只做防截断余量：文章 2200（450字+JSON）、卡 2400（定义+公式+例题）；质量由 prompt 约束
    const cardPromise = callWithRetry({
      system: buildCardSystemPrompt(chatInput),
      user: JSON.stringify(userPayload),
      maxTokens: 2400,
      temperature: 0.3,
    }).catch((error: unknown) => {
      console.error('[chat-card] 失败降级:', error instanceof Error ? error.message : String(error))
      return ''
    })

    const articlePromises = targets.map((target) =>
      callWithRetry({
        system: buildArticleSystemPrompt(chatInput, {
          key: target.key,
          level: input.students[target.index].level,
          observation: input.students[target.index].observation,
          mastery: (() => { const value = rawMastery[target.student.id]; return typeof value === 'string' ? value : '' })(),
          tags: Array.isArray(rawTags[target.student.id]) ? (rawTags[target.student.id] as unknown[]).filter((value): value is string => typeof value === 'string').slice(0, 6) : [],
        }),
        user: JSON.stringify(userPayload),
        maxTokens: 2200,
        temperature: 0.3,
      }).catch((error: unknown) => {
        console.error(`[chat-article] ${target.key} 失败:`, error instanceof Error ? error.message : String(error))
        return ''
      }),
    )

    const [cardRaw, ...articleRaws] = await Promise.all([cardPromise, ...articlePromises])

    const cardResult = parseCardOnly(cardRaw, { edition, grade, subject, verifiedCard })
    const ok: ChatArticleItem[] = []
    const failed: ChatFailedItem[] = []
    targets.forEach((target, index) => {
      try {
        ok.push(parseSingleArticle(articleRaws[index] || '', target.student))
      } catch (error) {
        failed.push({ studentId: target.student.id, error: error instanceof Error ? error.message : 'AI 生成失败，请重试' })
      }
    })

    if (!ok.length && failed.length) {
      // 全员失败：给最前面一条可理解的错误
      throw new Error(failed[0].error)
    }
    if (cardResult.card) {
      console.log(`[chat-card] topic=${cardResult.card.topic} formulas=${cardResult.card.formulas.length} def=${(cardResult.card.definition || '').slice(0, 24)}`)
    } else {
      console.log('[chat-card] NULL')
    }
    return NextResponse.json({
      ok: true,
      mode,
      providerLabel,
      topic: cardResult.topic,
      knowledge: cardResult.knowledge,
      card: cardResult.card,
      knowledgeSource: cardResult.card?.verified ? cardResult.card.source : '讲解内容为参考，发布前请核对',
      results: ok,
      failed,
      similarityWarnings: [],
    })
  } catch (error) {
    const providerStatus = error instanceof AIProviderError ? error.status : null
    const message = providerStatus === 429
      ? `${providerLabel}请求过于频繁，请稍等片刻再试`
      : providerStatus === 401 || providerStatus === 403
        ? `${providerLabel}密钥或模型权限不可用，请管理员检查服务端配置`
        : error instanceof AIProviderError
          ? `${providerLabel}服务暂时不可用，请稍后重试；你输入的内容不会丢失`
          : error instanceof Error ? error.message : `${providerLabel}生成失败，请稍后重试`
    return NextResponse.json({ error: message }, { status: providerStatus && providerStatus >= 400 && providerStatus < 600 ? providerStatus : 502 })
  }
})
