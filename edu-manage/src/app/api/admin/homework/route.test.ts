import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    academicTerm: { findMany: vi.fn() },
    classGroup: { findMany: vi.fn() },
    teacher: { findMany: vi.fn() },
    homeworkAssignment: { findMany: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    activityLog: { create: vi.fn() },
  },
}))

vi.mock('@/lib/teacher-portal', () => ({
  requireAdminUser: vi.fn().mockResolvedValue({
    user: { id: 'admin-1', role: 'admin', division: 'JUNIOR' },
    prisma: mockPrisma,
  }),
}))

import { GET } from './route'
import { DELETE } from './[id]/route'

describe('Admin Homework API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calculates KPI stats and formats assignment submissions', async () => {
    mockPrisma.academicTerm.findMany.mockResolvedValue([
      { id: 'term-1', name: '2026秋季学期', status: 'ACTIVE' },
    ])
    mockPrisma.classGroup.findMany.mockResolvedValue([
      { id: 'group-1', name: '初一数学培优班', course: { name: '初一数学', subject: '数学' } },
    ])
    mockPrisma.teacher.findMany.mockResolvedValue([
      { id: 'teacher-1', name: '任文涛' },
    ])

    const sampleAssignments = [
      {
        id: 'hw-1',
        title: '第一单元复习作业',
        instructions: '完成习题册第10-12页',
        teacherAttachmentUrls: [],
        studentIds: ['s1', 's2', 's3'],
        dueAt: new Date(Date.now() + 86400000),
        status: 'PUBLISHED',
        createdAt: new Date(),
        group: {
          id: 'group-1',
          name: '初一数学培优班',
          division: 'JUNIOR',
          course: { name: '初一数学', subject: '数学' },
          enrollments: [
            { student: { id: 's1', name: '张小凡', grade: '初一' } },
            { student: { id: 's2', name: '林惊羽', grade: '初一' } },
            { student: { id: 's3', name: '陆雪琪', grade: '初一' } },
          ],
        },
        teacher: {
          id: 'teacher-1',
          name: '任文涛',
          user: { avatarUrl: null },
        },
        term: { id: 'term-1', name: '2026秋季学期', status: 'ACTIVE' },
        submissions: [
          {
            id: 'sub-1',
            studentId: 's1',
            student: { id: 's1', name: '张小凡', grade: '初一' },
            parent: { id: 'p1', name: '张大凡', phone: '13800000001' },
            content: '已完成所有题目',
            attachmentUrls: ['https://example.com/homework1.jpg'],
            status: 'REVIEWED',
            score: 95,
            teacherComment: '书写规范，解题思路非常清晰！',
            submittedAt: new Date(),
            reviewedAt: new Date(),
          },
          {
            id: 'sub-2',
            studentId: 's2',
            student: { id: 's2', name: '林惊羽', grade: '初一' },
            parent: { id: 'p2', name: '林家长', phone: '13800000002' },
            content: '第3题有点难',
            attachmentUrls: [],
            status: 'SUBMITTED',
            score: null,
            teacherComment: null,
            submittedAt: new Date(),
            reviewedAt: null,
          },
        ],
      },
    ]

    mockPrisma.homeworkAssignment.findMany.mockResolvedValue(sampleAssignments)

    const req = new NextRequest('http://localhost:3000/api/admin/homework?division=JUNIOR')
    const res = await GET(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.kpi.totalAssignments).toBe(1)
    expect(data.kpi.totalSubmissionsCount).toBe(2)
    expect(data.kpi.pendingReviewsCount).toBe(1)
    expect(data.kpi.reviewedSubmissionsCount).toBe(1)
    expect(data.kpi.averageScore).toBe(95)

    expect(data.assignments.length).toBe(1)
    const hw = data.assignments[0]
    expect(hw.title).toBe('第一单元复习作业')
    expect(hw.stats.submittedCount).toBe(2)
    expect(hw.stats.totalStudents).toBe(3)
    expect(hw.stats.pendingReviewCount).toBe(1)
    expect(hw.missingStudents.length).toBe(1)
    expect(hw.missingStudents[0].name).toBe('陆雪琪')
  })

  it('deletes assignment and logs activity', async () => {
    mockPrisma.homeworkAssignment.findUnique.mockResolvedValue({
      id: 'hw-1',
      title: '需删除的作业',
      group: { name: '初一数学培优班' },
    })
    mockPrisma.homeworkAssignment.delete.mockResolvedValue({ id: 'hw-1' })
    mockPrisma.activityLog.create.mockResolvedValue({ id: 'log-1' })

    const req = new NextRequest('http://localhost:3000/api/admin/homework/hw-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'hw-1' }) })
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
    expect(mockPrisma.homeworkAssignment.delete).toHaveBeenCalledWith({ where: { id: 'hw-1' } })
    expect(mockPrisma.activityLog.create).toHaveBeenCalled()
  })
})
