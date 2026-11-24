import { NextRequest, NextResponse } from 'next/server'
import { AIProviderError, callDeepSeek } from '@/lib/ai/client'
import { getCurrentUser } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'
import { findParentChild, getParentChildren } from '@/lib/parent-children'
import { getStudentProfile } from '@/lib/student-profile'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  buildPersonalizedLearningSummaryFallback,
  parsePersonalizedLearningSummary,
  type PersonalizedLearningSummary,
} from '@/lib/student-growth/personalized-summary'
import { buildPersonalizedLearningEvidence } from '@/lib/student-growth/personalized-evidence'
import { getCachedPersonalizedLearningSummary } from '@/lib/student-growth/personalized-summary-cache'

export const dynamic = 'force-dynamic'

const SUMMARY_SYSTEM_PROMPT = `你负责为牧哲学堂家长报告撰写清晰、温暖、专业的阶段学习概述。只根据用户提供的结构化学习证据总结，不得编造表现、评价、分数、出勤、教师原话或掌握结论。

知识点规则：试卷题目状态可用于描述对应知识点的批改结果；教师课堂掌握度可作为课堂观察；普通“本节知识点”只代表教学内容，不代表已经掌握。证据有限时不要提证据或数据不足，也不要声称孩子具备某种未被记录的能力，改为结合年级、学科和已记录课程内容提出前瞻性的学习安排。

不要输出学生姓名、教师姓名、联系方式、学生编号；不要写“AI”“人工智能”“大模型”“模型生成”等来源说明；不要出现数字、日期或百分比（页面会展示系统统计）；不要使用诊断、责备、制造焦虑的表达。用家长容易理解的中文。

只返回 JSON：{"overview":"两三句阶段概述","strengths":["有记录支持的优势，最多3条"],"focusAreas":["有记录支持的跟进重点，最多3条"],"nextSteps":["可执行建议，最多3条"]}。若没有足够观察支持优势或重点，可返回空数组，并将内容用于下一步建议。`

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: '请先登录后查看学情报告' }, { status: 401 })

    const { id } = await params
    const prisma = await getRequestPrisma()
    const children = await getParentChildren(prisma, user.id)
    const target = findParentChild(children, id)
    if (!target) return NextResponse.json({ error: '未找到该孩子的档案或无权访问' }, { status: 403 })

    const principalKey = `${user.division}:${user.id}`
    const limit = await checkRateLimit(principalKey, request.nextUrl.pathname, 'parent-learning-report', 3)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: '学情报告生成较频繁，请稍后再试' },
        { status: 429, headers: limit.retryAfter ? { 'Retry-After': String(limit.retryAfter) } : {} },
      )
    }

    const monthsParam = Number(request.nextUrl.searchParams.get('months'))
    const months = Number.isFinite(monthsParam) ? Math.min(24, Math.max(1, Math.round(monthsParam))) : 6
    const to = new Date()
    const from = new Date(to)
    from.setMonth(from.getMonth() - months)
    const profile = await getStudentProfile(prisma, target.id, { from, to }, target.recordIds, {
      includeReport: true,
    })
    if (!profile) return NextResponse.json({ error: '学员档案暂时无法读取，请刷新后重试' }, { status: 404 })

    const evidence = buildPersonalizedLearningEvidence(profile)
    const fallback = buildPersonalizedLearningSummaryFallback(evidence)
    const encoder = new TextEncoder()
    const period = { from, to }
    const cacheKey = `${principalKey}:${target.id}:${months}:${to.getFullYear()}-${to.getMonth() + 1}`
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const enqueue = (value: unknown) => controller.enqueue(encoder.encode(JSON.stringify(value) + '\n'))
        enqueue({ type: 'profile', profile, summary: fallback, period })
        void (async () => {
          let summary = fallback
          try {
            const generated = await getCachedPersonalizedLearningSummary(cacheKey, async (): Promise<PersonalizedLearningSummary | null> => {
              const content = await callDeepSeek({
                system: SUMMARY_SYSTEM_PROMPT,
                user: JSON.stringify(evidence),
                maxTokens: 1000,
                temperature: 0.25,
                jsonMode: true,
                timeoutMs: 25_000,
              })
              return parsePersonalizedLearningSummary(content)
            })
            summary = generated || fallback
          } catch (error) {
            const provider = error instanceof AIProviderError
              ? String(error.provider || 'provider') + ':' + String(error.status || 'error')
              : 'provider:error'
            console.warn('[parent-learning-report] using evidence-based fallback', provider)
          }
          try {
            enqueue({ type: 'summary', summary, period })
            controller.close()
          } catch {
            // The parent closed the report while the summary was being generated.
          }
        })()
      },
    })
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-store, no-transform',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('[parent-learning-report] request failed', error instanceof Error ? error.name : 'unknown')
    return NextResponse.json({ error: '学情报告暂时无法生成，请稍后重试' }, { status: 500 })
  }
}
