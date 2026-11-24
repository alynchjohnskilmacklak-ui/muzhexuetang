import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), getPrismaForDivision: vi.fn(), isDualDbEnabled: vi.fn() }))
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({
  getPrismaForDivision: mocks.getPrismaForDivision,
  isDualDbEnabled: mocks.isDualDbEnabled,
}))

import { assertCanAccessClassLesson, assertCanAccessStudent, getParentStudentIds } from './guards'

const parentStudentWhere = {
  OR: [{ parentId: 'parent-1' }, { parentUserId: 'parent-1' }],
  status: { not: 'INACTIVE' },
  deletedAt: null,
}

function parentContext(prisma: PrismaClient) {
  return {
    id: 'parent-1', email: 'parent@example.test', name: '家长', role: 'parent',
    division: 'JUNIOR', prisma,
  }
}

describe('parent access guards', () => {
  it('lists students linked through either supported parent field and excludes deleted records', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 'student-1' }])
    const prisma = { student: { findMany } } as unknown as PrismaClient

    await expect(getParentStudentIds(parentContext(prisma), prisma)).resolves.toEqual(['student-1'])
    expect(findMany).toHaveBeenCalledWith({ where: parentStudentWhere, select: { id: true } })
  })

  it('authorizes direct student access using the same linked-student rule', async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: 'student-1' })
    const prisma = { student: { findFirst } } as unknown as PrismaClient

    await expect(assertCanAccessStudent(parentContext(prisma), 'student-1')).resolves.toBeUndefined()
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'student-1', ...parentStudentWhere },
      select: { id: true },
    })
  })

  it('allows a parent to access a future lesson only when the linked child is rostered and enrolled in its subject', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 'child-1' }])
    const findFirst = vi.fn().mockResolvedValue({
      id: 'lesson-1', subject: '数学', lessonDate: new Date(Date.now() + 86_400_000),
      lessonStudents: [{ studentId: 'child-1' }],
      group: {
        teacherId: 'teacher-1', teacherAssignments: [], course: { subject: '数学' },
        enrollments: [{ studentId: 'child-1', subjects: ['数学'] }],
      },
    })
    const prisma = { student: { findMany }, classLesson: { findFirst } } as unknown as PrismaClient

    await expect(assertCanAccessClassLesson(parentContext(prisma), 'lesson-1')).resolves.toBeUndefined()
    expect(findMany).toHaveBeenCalledWith({ where: parentStudentWhere, select: { id: true } })
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'lesson-1', deletedAt: null }),
      include: expect.objectContaining({
        group: expect.objectContaining({
          include: expect.objectContaining({
            enrollments: {
              where: { studentId: { in: ['child-1'] }, status: 'ACTIVE', deletedAt: null },
              select: { studentId: true, subjects: true },
            },
          }),
        }),
      }),
    }))
  })

  it('denies parent access when the linked child is not enrolled in the lesson subject', async () => {
    const prisma = {
      student: { findMany: vi.fn().mockResolvedValue([{ id: 'child-1' }]) },
      classLesson: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'lesson-1', subject: '英语', lessonDate: new Date(Date.now() + 86_400_000),
          lessonStudents: [{ studentId: 'child-1' }],
          group: {
            teacherId: 'teacher-1', teacherAssignments: [], course: { subject: '英语' },
            enrollments: [{ studentId: 'child-1', subjects: ['数学'] }],
          },
        }),
      },
    } as unknown as PrismaClient

    await expect(assertCanAccessClassLesson(parentContext(prisma), 'lesson-1')).rejects.toThrow('无权访问该课次数据')
  })
})
