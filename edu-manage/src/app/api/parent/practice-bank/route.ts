import { apiHandler } from '@/lib/api-handler'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { findParentChild, getParentChildren } from '@/lib/parent-children'
import { normalizeTextbookGrade } from '@/lib/classroom-feedback/textbook-editions'
import { PARENT_PRACTICE_SETS, type PracticeSet } from '@/data/parent-practice-bank'
import { PUBLISHED_PRACTICE_SETS } from '@/data/published-practice-bank'

export const dynamic = 'force-dynamic'

const publishedById = new Map(PUBLISHED_PRACTICE_SETS.map((set) => [set.id, set]))

/** Return only chapter metadata for the first screen; question bodies are fetched on demand. */
export const GET = apiHandler(async (request: Request) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get('studentId')?.trim()
  if (!studentId) return NextResponse.json({ error: '缺少studentId参数' }, { status: 400 })

  try {
    const prisma = await getRequestPrisma()
    const children = await getParentChildren(prisma, session.user.id)
    const child = findParentChild(children, studentId)
    if (!child) return NextResponse.json({ error: '学生不存在或无权访问' }, { status: 403 })

    const grade = normalizeTextbookGrade(child.grade)
    const setId = searchParams.get('setId')?.trim()
    if (setId) {
      const set = publishedById.get(setId)
      if (!set || set.needsReview || set.catalogOnly) {
        return NextResponse.json({ error: '该题组正在核验中，暂未开放练习', code: 'SET_UNAVAILABLE' }, { status: 404 })
      }
      if (normalizeTextbookGrade(set.grade) !== grade) {
        return NextResponse.json({ error: '该题组与当前学生年级不匹配，请重新选择年级目录' }, { status: 403 })
      }
      const safeSet = {
        ...set,
        questions: set.questions.filter((question) => !question.needsReview),
      }
      if (!safeSet.questions.length) {
        return NextResponse.json({ error: '该题组暂时没有完成核验的题目', code: 'SET_UNAVAILABLE' }, { status: 404 })
      }
      return NextResponse.json({ success: true, set: safeSet }, {
        headers: { 'Cache-Control': 'private, no-store' },
      })
    }

    const catalog = new Map<string, PracticeSet>()
    for (const set of PARENT_PRACTICE_SETS) {
      if (normalizeTextbookGrade(set.grade) !== grade || set.needsReview) continue
      const published = publishedById.get(set.id)
      // Catalog-only nodes are visible as confirmed curriculum locations, even
      // before their sourced question set has passed review.
      if (!set.catalogOnly && !published) continue
      catalog.set(set.id, set)
    }
    const entries = [...catalog.values()].map((set) => {
      const published = publishedById.get(set.id)
      const questions = published?.questions ?? []
      const questionCount = questions.length
      return {
        id: set.id,
        grade: set.grade,
        subject: set.subject,
        volume: set.volume,
        chapter: set.chapter,
        section: set.section,
        edition: set.edition,
        sourceNote: set.sourceNote,
        knowledgePoints: (published?.knowledgePoints ?? set.knowledgePoints).map(({ id, title, content }) => ({ id, title, content })),
        questionCount,
        difficultyCounts: {
          easy: questions.filter((question) => question.difficulty?.toUpperCase() === 'EASY').length,
          medium: questions.filter((question) => question.difficulty?.toUpperCase() === 'MEDIUM').length,
          challenge: questions.filter((question) => question.difficulty?.toUpperCase() === 'EXAM' || question.difficulty?.toUpperCase() === 'HARD').length,
        },
        available: questionCount > 0,
        catalogOnly: set.catalogOnly === true,
      }
    })

    return NextResponse.json({ success: true, grade, catalog: entries }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    console.error('[parent-practice-bank] catalog load failed', error instanceof Error ? error.name : 'unknown')
    return NextResponse.json({ error: '教材目录暂时无法读取，请稍后重试' }, { status: 503 })
  }
})
