import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
  getParentChildren: vi.fn(),
  findParentChild: vi.fn(),
  getStudentProfile: vi.fn(),
  callDeepSeek: vi.fn(),
  checkRateLimit: vi.fn(),
}))

vi.mock('@/lib/ai/client', () => ({ AIProviderError: class AIProviderError extends Error {}, callDeepSeek: mocks.callDeepSeek }))
vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/parent-children', () => ({ getParentChildren: mocks.getParentChildren, findParentChild: mocks.findParentChild }))
vi.mock('@/lib/student-profile', () => ({ getStudentProfile: mocks.getStudentProfile }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.checkRateLimit }))

import { POST } from './route'
import { clearPersonalizedLearningSummaryCache } from '@/lib/student-growth/personalized-summary-cache'

const profile = {
  identity: { id: 'student-1', name: '马子墨', grade: '初一' },
  overview: { paperCount: 1, attendanceRate: 95 },
  study: {
    mastery: {
      total: 1, masteredCount: 1, needsReviewCount: 0, needsPracticeCount: 0,
      topics: [{ subject: '数学', topic: '一元一次方程', total: 1, mastered: 1, needsReview: 0, needsPractice: 0 }],
    },
  },
  record: {
    reportFeedbacks: [{
      type: 'feedback', teacherSubject: '数学',
      detail: {
        lessonContent: '马子墨完成了一元一次方程练习',
        comment: '专注完成课堂练习，联系 13800138000',
        knowledgePoints: ['一元一次方程'],
        studentMastery: '基本掌握',
        homework: ['订正练习'],
      },
    }],
  },
}

const request = (months = 6) => new NextRequest(
  `http://localhost/api/parent/students/student-1/learning-report?months=${months}`,
  { method: 'POST' },
)

async function readEvents(response: Response) {
  const body = await response.text()
  return body.trim().split('\n').filter(Boolean).map((line) => JSON.parse(line))
}

describe('POST /api/parent/students/[id]/learning-report', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearPersonalizedLearningSummaryCache()
    mocks.checkRateLimit.mockResolvedValue({ allowed: true })
    mocks.getCurrentUser.mockResolvedValue({ id: 'parent-1', role: 'parent', division: 'JUNIOR' })
    mocks.getRequestPrisma.mockResolvedValue({})
    mocks.getParentChildren.mockResolvedValue([{ id: 'student-1', recordIds: ['student-1', 'student-old'] }])
    mocks.findParentChild.mockReturnValue({ id: 'student-1', recordIds: ['student-1', 'student-old'] })
    mocks.getStudentProfile.mockResolvedValue(profile)
    mocks.callDeepSeek.mockResolvedValue(JSON.stringify({
      overview: '本阶段围绕方程学习展开，课堂练习后及时订正有助于巩固方法。',
      strengths: ['课堂中能持续投入练习。'],
      focusAreas: ['把题目条件转化为等量关系。'],
      nextSteps: ['练习后复述列式依据并整理错因。'],
    }))
  })

  it('only generates a report for a child linked to the authenticated parent', async () => {
    mocks.findParentChild.mockReturnValue(null)

    const response = await POST(request(), { params: Promise.resolve({ id: 'someone-elses-student' }) })

    expect(response.status).toBe(403)
    expect(mocks.getStudentProfile).not.toHaveBeenCalled()
    expect(mocks.callDeepSeek).not.toHaveBeenCalled()
  })

  it('limits report generation by authenticated parent before loading the profile', async () => {
    mocks.checkRateLimit.mockResolvedValue({ allowed: false, retryAfter: 37 })

    const response = await POST(request(), { params: Promise.resolve({ id: 'student-1' }) })

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('37')
    expect(mocks.checkRateLimit).toHaveBeenCalledWith(
      'JUNIOR:parent-1', '/api/parent/students/student-1/learning-report', 'parent-learning-report', 3,
    )
    expect(mocks.getStudentProfile).not.toHaveBeenCalled()
    expect(mocks.callDeepSeek).not.toHaveBeenCalled()
  })

  it('aggregates linked term records and sends a sanitized evidence payload', async () => {
    const response = await POST(request(12), { params: Promise.resolve({ id: 'student-1' }) })
    const events = await readEvents(response)
    const profileEvent = events.find((event) => event.type === 'profile')
    const summaryEvent = events.find((event) => event.type === 'summary')
    const aiInput = JSON.parse(mocks.callDeepSeek.mock.calls[0][0].user as string)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('application/x-ndjson')
    expect(mocks.getStudentProfile).toHaveBeenCalledWith(
      {}, 'student-1', expect.objectContaining({ from: expect.any(Date), to: expect.any(Date) }),
      ['student-1', 'student-old'], { includeReport: true },
    )
    expect(profileEvent.profile).toEqual(profile)
    expect(profileEvent.summary.overview).toContain('本阶段')
    expect(summaryEvent.summary.overview).toContain('本阶段')
    expect(JSON.stringify(aiInput)).not.toContain('马子墨')
    expect(JSON.stringify(aiInput)).not.toContain('13800138000')
    expect(JSON.stringify(summaryEvent.summary)).not.toMatch(/AI|人工智能|数据不足|证据不足/i)
  })

  it('streams the complete profile before waiting for the generated summary', async () => {
    let resolveSummary: ((value: string) => void) | undefined
    mocks.callDeepSeek.mockImplementation(() => new Promise<string>((resolve) => { resolveSummary = resolve }))

    const response = await POST(request(), { params: Promise.resolve({ id: 'student-1' }) })
    const reader = response.body?.getReader()
    expect(reader).toBeDefined()
    const first = await reader!.read()
    const firstEvent = JSON.parse(new TextDecoder().decode(first.value).trim())

    expect(firstEvent.type).toBe('profile')
    expect(firstEvent.profile).toEqual(profile)
    expect(resolveSummary).toBeTypeOf('function')

    resolveSummary?.(JSON.stringify({
      overview: '本阶段围绕方程学习展开，及时订正有助于巩固方法。',
      strengths: [],
      focusAreas: [],
      nextSteps: ['继续整理错题。'],
    }))
    const second = await reader!.read()
    expect(JSON.parse(new TextDecoder().decode(second.value).trim()).type).toBe('summary')
    expect((await reader!.read()).done).toBe(true)
  })

  it('reuses the generated summary for the same student and period', async () => {
    const firstResponse = await POST(request(), { params: Promise.resolve({ id: 'student-1' }) })
    await readEvents(firstResponse)
    const secondResponse = await POST(request(), { params: Promise.resolve({ id: 'student-1' }) })
    const secondEvents = await readEvents(secondResponse)

    expect(secondEvents.find((event) => event.type === 'summary')?.summary.overview).toContain('本阶段')
    expect(mocks.callDeepSeek).toHaveBeenCalledTimes(1)
  })

  it('returns a useful fallback when the summary provider is unavailable', async () => {
    mocks.callDeepSeek.mockRejectedValue(new Error('offline'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const response = await POST(request(), { params: Promise.resolve({ id: 'student-1' }) })
    const events = await readEvents(response)
    const summaryEvent = events.find((event) => event.type === 'summary')

    expect(response.status).toBe(200)
    expect(summaryEvent.summary.overview).toContain('初一')
    expect(JSON.stringify(summaryEvent.summary)).not.toMatch(/AI|人工智能|证据不足|数据不足/i)
    warn.mockRestore()
  })
})
