import type { PrismaClient } from '@prisma/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildParentDailyDigest, buildParentDailyFeedbackDigest } from './daily-digest'
import { getQywxGroupSendResult, sendQywxParentMass } from './qywx'

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

describe('parent-safe WeCom feedback digest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('uses published feedback, parent-visible text, and a child-scoped site link', async () => {
    vi.stubEnv('PUBLIC_APP_URL', 'https://staging.example/base')
    const studentFindMany = vi.fn().mockResolvedValue([{ id: 'student-1', name: '小明' }])
    const feedbackFindMany = vi.fn().mockResolvedValue([{
      id: 'feedback-1',
      studentIds: ['student-1', 'other-student'],
      lessonContent: '内部教案字段不应进入消息',
      overallComment: '课堂反馈：小明今天专注参与，完成了练习。',
      summary: '内部掌握评估不应进入消息',
      knowledgePoints: ['函数'],
      homework: null,
      tags: [],
      studentRatings: null,
      teacher: { name: '陈老师' },
      classLesson: null,
    }])
    const prisma = {
      student: { findMany: studentFindMany },
      classroomFeedback: { findMany: feedbackFindMany },
    } as unknown as PrismaClient

    const digest = await buildParentDailyFeedbackDigest(prisma, 'parent-1', '2026-10-28')

    expect(digest?.title).toContain('小明')
    expect(digest?.desc).toContain('小明今天专注参与')
    expect(digest?.desc).not.toContain('内部教案字段')
    expect(digest?.desc).not.toContain('内部掌握评估')
    expect(digest?.url).toBe('https://staging.example/parent/class-feedback/feedback-1?childId=student-1')
    expect(feedbackFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'PUBLISHED', deletedAt: null }),
    }))
  })

  it('carries recent attendance and the latest published feedback into the WeCom link card', async () => {
    const suffix = Math.random().toString(36).slice(2)
    vi.stubEnv('PUBLIC_APP_URL', 'https://staging.example')
    vi.stubEnv('QYWX_ENABLED', 'true')
    vi.stubEnv('QYWX_CORP_ID', `corp-${suffix}`)
    vi.stubEnv('QYWX_AGENT_ID', '100001')
    vi.stubEnv('QYWX_AGENT_SECRET', `agent-${suffix}`)
    vi.stubEnv('QYWX_CONTACT_SECRET', `contact-${suffix}`)

    const latestFeedback = {
      id: 'feedback-latest',
      studentIds: ['student-1'],
      lessonContent: '内部课堂记录不应进入家长消息',
      overallComment: '小明今天专注参与，完成了课堂练习。',
      summary: '内部评估不应进入家长消息',
      knowledgePoints: ['一次函数'],
      homework: null,
      tags: [],
      studentRatings: null,
      teacher: { name: '陈老师' },
      classLesson: { subject: '数学' },
    }
    const olderFeedback = {
      ...latestFeedback,
      id: 'feedback-older',
      overallComment: '这是同一天较早的反馈。',
    }
    const feedbackFindMany = vi.fn()
      .mockResolvedValueOnce([latestFeedback, olderFeedback])
      .mockResolvedValueOnce([{ id: 'feedback-latest' }, { id: 'feedback-older' }])
    const studentFindMany = vi.fn().mockResolvedValue([{ id: 'student-1', name: '小明' }])
    const attendanceFindMany = vi.fn().mockResolvedValue([{
      studentId: 'student-1',
      status: 'PRESENT',
      lesson: {
        subject: '数学',
        startTime: '16:00',
        endTime: '17:30',
        lessonDate: new Date('2026-10-29T08:00:00.000Z'),
      },
    }])
    const prisma = {
      student: { findMany: studentFindMany },
      attendance: { findMany: attendanceFindMany },
      classroomFeedback: { findMany: feedbackFindMany },
      notification: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ errcode: 0, access_token: `token-${suffix}`, expires_in: 7200 }))
      .mockResolvedValueOnce(jsonResponse({ errcode: 0, msgid: 'synthetic-msg-1', fail_list: [] }))
      .mockResolvedValueOnce(jsonResponse({
        errcode: 0,
        send_list: [{ external_userid: 'external-parent-1', status: 1, send_time: 1793270400 }],
        next_cursor: '',
      }))
    vi.stubGlobal('fetch', fetchMock)

    const digest = await buildParentDailyDigest(prisma, 'parent-1', '2026-10-29')
    expect(digest).not.toBeNull()
    expect(digest?.desc).toContain('【今日上课】小明 数学(16:00-17:30)·出勤')
    expect(digest?.desc).toContain('小明今天专注参与')
    expect(digest?.desc).not.toContain('内部课堂记录')
    expect(digest?.desc).not.toContain('内部评估')
    expect(digest?.url).toBe('https://staging.example/parent/class-feedback/feedback-latest?childId=student-1')

    const attendanceQuery = attendanceFindMany.mock.calls[0][0]
    expect(attendanceQuery.where).toMatchObject({
      studentId: { in: ['student-1'] },
      deletedAt: null,
      lesson: { is: { deletedAt: null, status: { notIn: ['CANCELLED', 'POSTPONED'] } } },
    })
    expect(attendanceQuery.where.lesson.is.lessonDate.gte.toISOString()).toBe('2026-10-28T16:00:00.000Z')
    expect(attendanceQuery.where.lesson.is.lessonDate.lt.toISOString()).toBe('2026-10-29T16:00:00.000Z')
    expect(feedbackFindMany.mock.calls[0][0].orderBy).toEqual({ createdAt: 'desc' })

    const sendResult = await sendQywxParentMass('teacher-1', ['external-parent-1'], digest!)
    expect(sendResult).toMatchObject({ success: true, msgid: 'synthetic-msg-1' })
    const payload = JSON.parse(String(fetchMock.mock.calls[1][1].body))
    expect(payload).toMatchObject({
      chat_type: 'single',
      external_userid: ['external-parent-1'],
      sender: 'teacher-1',
      attachments: [{ msgtype: 'link', link: { title: digest?.title, desc: digest?.desc, url: digest?.url } }],
    })

    const delivery = await getQywxGroupSendResult('synthetic-msg-1', 'teacher-1')
    expect(delivery).toEqual({
      sendList: [{ external_userid: 'external-parent-1', status: 1, send_time: 1793270400 }],
      complete: true,
    })
    expect(new URL(String(fetchMock.mock.calls[2][0])).pathname).toBe('/cgi-bin/externalcontact/get_groupmsg_send_result')
  })

  it('still sends an attendance-only digest with a child-scoped dashboard link', async () => {
    vi.stubEnv('PUBLIC_APP_URL', 'https://staging.example')
    const prisma = {
      student: { findMany: vi.fn().mockResolvedValue([{ id: 'student-1', name: '小明' }]) },
      attendance: {
        findMany: vi.fn().mockResolvedValue([{
          studentId: 'student-1',
          status: 'LEAVE',
          lesson: {
            subject: '英语',
            startTime: '18:00',
            endTime: '19:00',
            lessonDate: new Date('2026-10-29T10:00:00.000Z'),
          },
        }]),
      },
      classroomFeedback: { findMany: vi.fn().mockResolvedValue([]) },
      notification: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient

    const digest = await buildParentDailyDigest(prisma, 'parent-1', '2026-10-29')

    expect(digest?.desc).toContain('【今日上课】小明 英语(18:00-19:00)·请假')
    expect(digest?.url).toBe('https://staging.example/parent/dashboard?childId=student-1')
  })
})
