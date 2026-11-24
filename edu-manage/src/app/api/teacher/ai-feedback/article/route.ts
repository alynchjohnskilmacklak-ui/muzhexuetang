import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireCurrentTeacher } from '@/lib/teacher-portal'
import { resolveTeacherFeedbackCreationScope } from '@/lib/classroom-feedback/access'
import { parseAiArticleResponse } from '@/lib/classroom-feedback/ai-article'
import { AIProviderError, callDeepSeek, callDoubao, callKimi } from '@/lib/ai/client'
import { aiProviderLabel, resolveAIProvider } from '@/lib/classroom-feedback/ai-chat'
import { findVerifiedKnowledgeCard } from '@/lib/classroom-feedback/knowledge-point-cards'
import { normalizeTextbookGrade, textbookEdition } from '@/lib/classroom-feedback/textbook-editions'
import { checkTeacherAiRateLimit } from '@/lib/teacher-ai-rate-limit'
import { getTeacherFeedbackSubjects } from '@/lib/classroom-feedback/teacher-subjects'
import { MANUAL_SINGLE_SESSION_STUDENT_ID, resolveStandaloneFeedbackStudents, resolveStandaloneFeedbackTeacher } from '@/lib/classroom-feedback/single-session-scope'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest) => {
  const { teacher, prisma } = await requireCurrentTeacher()
  const body = await req.json() as Record<string, unknown>
  const ids = Array.isArray(body.studentIds) ? body.studentIds.filter((value): value is string => typeof value === 'string') : []
  const note = typeof body.lessonNote === 'string' ? body.lessonNote.trim().slice(0, 1500) : ''
  const isSingleSession = body.isSingleSession === true
  const isManualSingleSession = isSingleSession && body.singleSessionManual === true
  const singleSessionTeacherId = typeof body.singleSessionTeacherId === 'string' && body.singleSessionTeacherId.trim()
    ? body.singleSessionTeacherId.trim()
    : teacher.id
  const manualStudentName = typeof body.singleSessionStudentName === 'string' ? body.singleSessionStudentName.trim().slice(0, 60) : ''
  const manualStudentGrade = typeof body.singleSessionGrade === 'string' ? body.singleSessionGrade.trim() : ''
  const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 30) : ''
  if (ids.length < 1 || ids.length > 3 || new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: '请勾选 1 至 3 名学生后生成' }, { status: 400 })
  }
  if (note.replace(/\s/g, '').length < 4) {
    return NextResponse.json({ error: '请先写至少 4 个字的真实知识点或课堂要点' }, { status: 400 })
  }
  let scopeStudents: Array<{ id: string; name: string; parentId: string | null; parentUserId: string | null; grade?: string | null }>
  if (isSingleSession) {
    const hasClassLink = (typeof body.classLessonId === 'string' && Boolean(body.classLessonId.trim()))
      || (typeof body.groupId === 'string' && Boolean(body.groupId.trim()))
    if (hasClassLink) return NextResponse.json({ error: '单次课程反馈不能关联班级或课堂课次' }, { status: 400 })
    const feedbackTeacher = await resolveStandaloneFeedbackTeacher(prisma, teacher, singleSessionTeacherId)
    if (!feedbackTeacher) return NextResponse.json({ error: '所选授课老师不存在或不属于当前学部' }, { status: 403 })
    const subjectAllowed = subject && (await getTeacherFeedbackSubjects(prisma, feedbackTeacher)).includes(subject)
    if (!subjectAllowed) return NextResponse.json({ error: '当前教师没有该学科的单次反馈权限，请重新选择学科' }, { status: 403 })

    if (isManualSingleSession) {
      if (ids.length !== 1 || ids[0] !== MANUAL_SINGLE_SESSION_STUDENT_ID || manualStudentName.length < 2
        || !['初一', '初二', '初三', '高一', '高二', '高三'].includes(manualStudentGrade)) {
        return NextResponse.json({ error: '请重新确认手动学员姓名、年级和单次课程信息' }, { status: 400 })
      }
      scopeStudents = [{ id: ids[0], name: manualStudentName, parentId: null, parentUserId: null, grade: manualStudentGrade }]
    } else {
      const standaloneStudents = await resolveStandaloneFeedbackStudents(prisma, teacher, ids)
      if (!standaloneStudents) return NextResponse.json({ error: '请选择本学部中已绑定家长账号的学员，或改用手动填写姓名' }, { status: 403 })
      scopeStudents = standaloneStudents
    }
  } else {
    const scope = await resolveTeacherFeedbackCreationScope(prisma, {
      teacherId: teacher.id,
      classLessonId: typeof body.classLessonId === 'string' ? body.classLessonId : null,
      feedbackGroupId: typeof body.groupId === 'string' ? body.groupId : null,
      requestedStudentIds: ids,
      isSingleSession: false,
      requireLesson: true,
      requireAttendanceSubmitted: true,
      requestedSubject: typeof body.subject === 'string' ? body.subject : null,
    })
    if (!scope.allowed || scope.students.length !== ids.length) {
      if (scope.reason === 'lesson-required') {
        return NextResponse.json({ error: '请先选择具体课次并完成考勤，再生成本节课反馈' }, { status: 409 })
      }
      if (scope.reason === 'attendance-required') {
        return NextResponse.json({ error: '本节课考勤尚未提交，完成考勤后才能生成反馈' }, { status: 409 })
      }
      if (scope.reason === 'blocked') {
        return NextResponse.json({ error: '该学员本节课已请假或未到校，不能生成课堂反馈' }, { status: 409 })
      }
      return NextResponse.json({ error: '所选学生不属于当前教师的这节课或该学科，请重新选择' }, { status: 403 })
    }
    scopeStudents = scope.students
  }
  // 优先使用豆包（火山方舟）；未配置时自动回退到已配置的 DeepSeek / Kimi
  const provider = resolveAIProvider()
  const providerLabel = aiProviderLabel(provider)
  const observations = body.observations && typeof body.observations === 'object'
    ? body.observations as Record<string, unknown>
    : {}
  const selected = ids.map((id) => ({
    id,
    name: scopeStudents.find((student) => student.id === id)?.name || '学生',
    observation: typeof observations[id] === 'string' ? observations[id].trim().slice(0, 350) : '',
  }))
  // Do not send children's real names or database IDs to an external model.
  const anonymize = (value: string) => selected.reduce(
    (current, student, index) => student.name.length >= 2 ? current.replaceAll(student.name, `S${index + 1}`) : current,
    value,
  )
  const gradeRows = isSingleSession
    ? scopeStudents
    : await prisma.student.findMany({ where: { id: { in: ids } }, select: { id: true, grade: true } })
  const grades = [...new Set(gradeRows.map((row) => normalizeTextbookGrade(row.grade || '')).filter(Boolean))]
  if (grades.length !== 1) {
    return NextResponse.json({ error: '请选择同一年级且已填写年级的学生，以便匹配教材版本' }, { status: 400 })
  }
  const grade = grades[0]
  const edition = textbookEdition(grade, subject)
  if (!edition) {
    return NextResponse.json({ error: '当前年级或学科尚未配置教材版本，请先核对班级学科与学生年级' }, { status: 400 })
  }
  const verifiedCard = findVerifiedKnowledgeCard(edition, grade, subject, note)

  const aiLimit = await checkTeacherAiRateLimit(teacher.id)
  if (!aiLimit.allowed) {
    return NextResponse.json(
      { error: '学堂数据库整理服务较频繁，请稍后再试；已输入内容仍会保留' },
      { status: 429, headers: aiLimit.retryAfter ? { 'Retry-After': String(aiLimit.retryAfter) } : {} },
    )
  }
  const performance = body.performance && typeof body.performance === 'object'
    ? body.performance as Record<string, unknown> : {}
  const input = {
    subject,
    grade,
    edition,
    lessonNote: anonymize(note),
    verifiedCard,
    students: selected.map((student, index) => ({
      key: `S${index + 1}`,
      level: ['GREAT', 'OKAY', 'NEEDS_IMPROVEMENT'].includes(String(performance[student.id])) ? performance[student.id] : '未评',
      observation: anonymize(student.observation) || '教师未提供个人课堂观察，不能推断个人表现或掌握程度',
    })),
  }
  try {
    const system = [
      '你是一位资深学科老师，正在给家长写真实、具体的课堂反馈。语气像当面聊学生，避免工作报告和模板腔。',
      '只可使用教师输入的课堂要点、每名学生自己对应的观察与表现档位；知识概念可客观解释。不得编造任何课堂事件、分数、名次、答题数量、进步、作业或掌握程度。档位只定语气，不证明具体事实。',
      '输入可能只是关键词。学生之间严格隔离，绝不能挪用另一名学生的观察。没有个人观察时，明确写本次未记录个人课堂表现，不推断个人掌握。',
      '每份 article 严格三段，标题各占一行且顺序固定：本节课学习内容：、课堂反馈：、孩子掌握情况：。学习内容解释知识点，课堂反馈只描述有证据的个人表现，掌握情况给与证据一致的谨慎结论。信息少时宁可短，不凑字数。',
      '匿名代号只用于 articles[].key 区分学生，article 正文必须用“孩子”称呼目标学生，任何位置都不得出现 S1/S2 等代号或真实姓名。禁用孩子同学、这位同学、该同学、宝贝、小朋友，以及最好、第一、保证提分等夸大词。',
      '输出纯 JSON：topic, intro（给家长的1-3句知识点概述）, card（topic, definition, formulas字符串数组, 可选example含question/steps/answer）, articles数组（key, article）。',
      verifiedCard
        ? '输入附有人工核实卡片。必须原样使用其定义、公式与例题，不改写卡片，不生成额外教材原文。'
        : `没有人工核实卡片。生成的是“AI生成讲解，供参考”，不得声称来自${edition}教材原文，不编页码、章号或来源。例题如果生成，应是明确的AI示例，不冒充教材例题；不确定的公式和例题可留空。`,
      '不声称实时联网查阅资料。只返回 JSON，不用 Markdown。',
    ].join('\n')
    let lastError: unknown
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const baseParams = {
        system,
        user: JSON.stringify({ ...input, ...(attempt ? { correction: '上次结果格式或事实校验未通过，请逐条核对三段标题、学生称呼和未记录时的诚实表述。' } : {}) }),
        maxTokens: 3200,
        temperature: 0.25,
      }
      const output = provider === 'doubao'
        ? await callDoubao({ ...baseParams, jsonMode: true })
        : provider === 'deepseek'
          ? await callDeepSeek({ ...baseParams, jsonMode: true })
          : await callKimi(baseParams)
      try {
        const result = parseAiArticleResponse(output, selected, { edition, grade, subject, verifiedCard })
        return NextResponse.json({ ...result, knowledgeSource: result.card.verified ? result.card.source : '讲解内容为参考，发布前请核对' })
      } catch (error) { lastError = error }
    }
    throw lastError || new Error(`${providerLabel}未生成可用内容，请补充课堂观察后重试`)
  } catch (error) {
    const providerStatus = error instanceof AIProviderError ? error.status : null
    const message = providerStatus === 429
      ? `${providerLabel}请求过于频繁，请稍等片刻再试`
      : providerStatus === 401 || providerStatus === 403
        ? `${providerLabel}密钥或模型权限不可用，请管理员检查服务端配置`
        : error instanceof AIProviderError
          ? `${providerLabel}服务暂时不可用，请稍后重试；已填写的课堂内容不会丢失`
          : error instanceof Error ? error.message : `${providerLabel}生成失败，请稍后重试`
    return NextResponse.json({ error: message }, { status: providerStatus && providerStatus >= 400 && providerStatus < 600 ? providerStatus : 502 })
  }
})
