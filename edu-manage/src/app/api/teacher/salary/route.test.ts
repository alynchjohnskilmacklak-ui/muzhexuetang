import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ requireCurrentTeacher: vi.fn() }))
vi.mock('@/lib/teacher-portal', () => ({ requireCurrentTeacher: mocks.requireCurrentTeacher }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET } from './route'

describe('GET /api/teacher/salary', () => {
  const salaryConfigFindUnique = vi.fn()
  const prisma = {
    academicTerm: { findFirst: vi.fn() },
    teacherSalaryTransaction: { findMany: vi.fn() },
    teacherSalaryConfig: { findUnique: salaryConfigFindUnique },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireCurrentTeacher.mockResolvedValue({
      teacher: { id: 'teacher-1', division: 'JUNIOR' },
      prisma,
    })
    prisma.academicTerm.findFirst.mockResolvedValue({ id: 'term-1', name: '秋季班' })
    prisma.teacherSalaryTransaction.findMany.mockResolvedValue([])
    salaryConfigFindUnique.mockResolvedValue({
      groupRateJunior: 28,
      groupRateSenior: 32,
      oneOnOneRates: { 初一: 31, 初二: 35, 初三: 39, 高一: 41, 高二: 46, 高三: 51 },
      feedbackRateGroup: 0.8,
      feedbackRateOneOne: 1.2,
    })
  })

  it('returns the current teacher salary rules with the salary summary', async () => {
    const response = await GET(new NextRequest('http://localhost/api/teacher/salary?period=month'))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      salaryConfig: {
        groupRateJunior: 28,
        groupRateSenior: 32,
        oneOnOneRates: { 初一: 31, 初二: 35, 初三: 39, 高一: 41, 高二: 46, 高三: 51 },
        feedbackRateGroup: 0.8,
        feedbackRateOneOne: 1.2,
      },
    })
    expect(salaryConfigFindUnique).toHaveBeenCalledWith({ where: { teacherId: 'teacher-1' } })
  })

  it('returns configured defaults when this teacher has no custom salary rules', async () => {
    salaryConfigFindUnique.mockResolvedValue(null)

    const response = await GET(new NextRequest('http://localhost/api/teacher/salary?period=month'))

    expect(await response.json()).toMatchObject({
      salaryConfig: {
        groupRateJunior: 22,
        groupRateSenior: 26,
        feedbackRateGroup: 0.5,
        feedbackRateOneOne: 1,
        oneOnOneRates: { 初一: 25, 初二: 30, 初三: 35, 高一: 40, 高二: 45, 高三: 50 },
      },
    })
  })
})
