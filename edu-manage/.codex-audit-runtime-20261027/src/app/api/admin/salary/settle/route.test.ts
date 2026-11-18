import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ admin: vi.fn(), teacher: vi.fn(), term: vi.fn() }))
vi.mock('@/lib/teacher-portal', () => ({ requireAdminUser: mocks.admin, requireCurrentTeacher: mocks.teacher }))
vi.mock('@/lib/admin-term-scope', () => ({ resolveAdminTermScope: mocks.term }))
vi.mock('@/lib/data-correction/trash', () => ({ TRASH_RETENTION_DAYS: 30 }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))
import { POST } from './route'
import { GET as adminSalary } from '../route'
import { GET as teacherSalary } from '@/app/api/teacher/salary/route'

type LedgerRow = { id: string; teacherId: string; termId: string; type: string; amount: number; createdAt: Date; settledAt: Date | null; settlementBatchId: string | null; deletedAt: null; description: string; teacher: { id: string; name: string; avatar: null } }
describe('admin settlement to both portal balances (isolated mock ledger)', () => {
  let rows: LedgerRow[]
  beforeEach(() => {
    vi.clearAllMocks()
    const people = [{ id: 't1', name: '测试教师一', avatar: null }, { id: 't2', name: '测试教师二', avatar: null }]
    const date = new Date()
    rows = [320, 11.5, -537.5].map((amount, index) => ({ id: `earn${index}`, teacherId: 't1', termId: 'term1', type: ['LESSON_PAY', 'FEEDBACK_BONUS', 'manual_adjust'][index], amount, createdAt: date, settledAt: null, settlementBatchId: null, deletedAt: null, description: 'isolated fixture', teacher: people[0] }))
    rows.push({ ...rows[0], id: 'other', teacherId: 't2', amount: 50, teacher: people[1] })
    const db = {
      teacher: { findFirst: async ({ where }: { where: { id: string } }) => people.find(person => person.id === where.id), findMany: async () => people },
      classGroup: { findMany: async () => [] }, classroomFeedback: { groupBy: async () => [] },
      academicTerm: { findFirst: async () => ({ id: 'term1', name: '测试批次', status: 'ACTIVE' }) },
      teacherSalaryTransaction: {
        findMany: async ({ where }: { where: { teacherId?: string; termId?: string; createdAt?: { gte?: Date; lte?: Date } } }) => rows.filter(row => (!where.teacherId || row.teacherId === where.teacherId) && (!where.termId || row.termId === where.termId) && (!where.createdAt?.gte || row.createdAt >= where.createdAt.gte) && (!where.createdAt?.lte || row.createdAt <= where.createdAt.lte)).map(row => ({ ...row })),
        updateMany: async ({ where, data }: { where: { id: { in: string[] } }; data: { settledAt: Date; settlementBatchId: string } }) => {
          const eligible = rows.filter(row => where.id.in.includes(row.id) && !row.settledAt && !row.settlementBatchId)
          eligible.forEach(row => Object.assign(row, data))
          return { count: eligible.length }
        },
        create: async ({ data }: { data: Omit<LedgerRow, 'id' | 'teacher'> }) => { rows.push({ ...data, id: `receipt${rows.length}`, teacher: people.find(person => person.id === data.teacherId)! }); return rows.at(-1) },
      },
      activityLog: { create: vi.fn().mockResolvedValue({}) },
      $transaction: async (run: (tx: unknown) => Promise<unknown>) => run(db),
    }
    mocks.admin.mockResolvedValue({ id: 'admin1', division: 'JUNIOR', prisma: db })
    mocks.teacher.mockResolvedValue({ teacher: { id: 't1', division: 'JUNIOR' }, prisma: db })
    mocks.term.mockResolvedValue({ id: 'term1', status: 'ACTIVE' })
  })
  const settleRequest = (teacherId: string, expectedTotal: number, termId = 'term1') => new NextRequest('http://localhost/api/admin/salary/settle', { method: 'POST', body: JSON.stringify({ teacherId, expectedTotal, termId, period: 'all' }) })
  it('clears only the selected teacher, preserves history, prevents repeats and ultimately clears the overall total', async () => {
    const before = await (await adminSalary(new NextRequest('http://localhost/api/admin/salary?period=all'))).json()
    expect(before.summary.find((row: { teacherId: string }) => row.teacherId === 't1').total).toBe(-206)
    expect((await POST(settleRequest('t1', -206))).status).toBe(201)
    const adminAfter = await (await adminSalary(new NextRequest('http://localhost/api/admin/salary?period=all'))).json()
    expect(adminAfter.summary.find((row: { teacherId: string }) => row.teacherId === 't1')).toMatchObject({ total: 0, lesson: 0, feedback: 0, adjustment: 0, smallClass: 0, intensive: 0, pendingCount: 0 })
    expect(adminAfter.summary.find((row: { teacherId: string }) => row.teacherId === 't2').total).toBe(50)
    const teacherAfter = await (await teacherSalary(new NextRequest('http://localhost/api/teacher/salary?period=all'))).json()
    expect(teacherAfter).toMatchObject({ total: 0, totalLesson: 0, totalFeedback: 0, totalAdjustment: 0, pendingCount: 0 })
    expect(teacherAfter.transactions).toHaveLength(4)
    expect((await POST(settleRequest('t1', -206))).status).toBe(409)
    expect(rows.filter(row => row.type === 'SALARY_SETTLEMENT')).toHaveLength(1)
    expect((await POST(settleRequest('t2', 50))).status).toBe(201)
    const allAfter = await (await adminSalary(new NextRequest('http://localhost/api/admin/salary?period=all'))).json()
    expect(allAfter.summary.reduce((sum: number, row: { total: number }) => sum + row.total, 0)).toBe(0)
    expect(rows).toHaveLength(6)
  })
  it('rejects confirmation against a changed operational term', async () => {
    expect((await POST(settleRequest('t1', -206, 'old-term'))).status).toBe(409)
    expect(rows).toHaveLength(4)
  })
})
