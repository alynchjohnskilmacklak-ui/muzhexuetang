import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireCurrentTeacher: vi.fn(),
  getActiveAcademicTerm: vi.fn(),
  assertTeacherOwnsStudent: vi.fn(),
}))

vi.mock('@/lib/teacher-portal', () => ({
  requireCurrentTeacher: mocks.requireCurrentTeacher,
  assertTeacherOwnsStudent: mocks.assertTeacherOwnsStudent,
}))
vi.mock('@/lib/academic-term', () => ({ getActiveAcademicTerm: mocks.getActiveAcademicTerm }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET, POST } from './route'

function database() {
  const prisma = {
    masteryRecord: {
      findMany: vi.fn().mockResolvedValue([{ id: 'mastery-a', knowledgePoint: '分数乘法', level: 'MASTERED' }]),
      create: vi.fn().mockResolvedValue({ id: 'mastery-b', knowledgePoint: '分数乘法', level: 'NEEDS_REVIEW' }),
    },
  }
  mocks.requireCurrentTeacher.mockResolvedValue({ teacher: { id: 'teacher-a', division: 'JUNIOR' }, prisma })
  mocks.getActiveAcademicTerm.mockResolvedValue({ id: 'term-a' })
  mocks.assertTeacherOwnsStudent.mockResolvedValue({ id: 'student-a' })
  return prisma
}

describe('/api/teacher/mastery', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists only records for the teacher, student, and active term', async () => {
    const prisma = database()
    const response = await GET(new NextRequest('http://localhost/api/teacher/mastery?studentId=student-a'))

    expect(response.status).toBe(200)
    expect(prisma.masteryRecord.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId: 'student-a', teacherId: 'teacher-a', termId: 'term-a' },
    }))
    expect(mocks.assertTeacherOwnsStudent).toHaveBeenCalledWith('teacher-a', 'student-a', prisma, 'term-a')
  })

  it('saves a validated mastery record in the active term', async () => {
    const prisma = database()
    const response = await POST(new NextRequest('http://localhost/api/teacher/mastery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: 'student-a', knowledgePoint: ' 分数乘法 ', level: 'MASTERED', note: ' 计算准确 ' }),
    }))

    expect(response.status).toBe(201)
    expect(prisma.masteryRecord.create).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        studentId: 'student-a',
        teacherId: 'teacher-a',
        termId: 'term-a',
        knowledgePoint: '分数乘法',
        level: 'MASTERED',
        note: '计算准确',
      },
    }))
  })

  it('rejects invalid levels and does not write', async () => {
    const prisma = database()
    const response = await POST(new NextRequest('http://localhost/api/teacher/mastery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: 'student-a', knowledgePoint: '分数乘法', level: 'UNKNOWN' }),
    }))

    expect(response.status).toBe(400)
    expect(prisma.masteryRecord.create).not.toHaveBeenCalled()
  })
})
