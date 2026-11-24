import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import * as XLSX from 'xlsx'

const mocks = vi.hoisted(() => ({
  requireAdminUser: vi.fn(),
  getRequestPrisma: vi.fn(),
  getRequestDivision: vi.fn(),
  resolveAdminTermScope: vi.fn(),
  createActivityLog: vi.fn(),
  brandXlsxBufferOnServer: vi.fn(async (value: Uint8Array) => value),
  copyXlsxAsArrayBuffer: vi.fn((value: Uint8Array) => value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)),
}))

vi.mock('@/lib/auth/guards', () => ({ requireAdminUser: mocks.requireAdminUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/division', () => ({ getRequestDivision: mocks.getRequestDivision }))
vi.mock('@/lib/admin-term-scope', () => ({ resolveAdminTermScope: mocks.resolveAdminTermScope }))
vi.mock('@/lib/data-admin/entities-server', () => ({ createActivityLog: mocks.createActivityLog }))
vi.mock('@/lib/export-xlsx-brand-server', () => ({ brandXlsxBufferOnServer: mocks.brandXlsxBufferOnServer }))
vi.mock('@/lib/export-xlsx-brand', () => ({ copyXlsxAsArrayBuffer: mocks.copyXlsxAsArrayBuffer }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET } from './route'

const term = { id: 'term-current', name: '2026暑假班', status: 'ACTIVE' as const }

function student(overrides: Record<string, unknown> = {}) {
  return {
    id: 'student-a',
    name: '学员甲',
    gender: '女',
    grade: '初一',
    school: '一中',
    remainHours: 999,
    totalHours: 999,
    status: 'ACTIVE',
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    termMemberships: [{ grade: '初一', term: { name: '2026暑假班' } }],
    enrollments: [{
      status: 'ACTIVE',
      remainHours: 3,
      totalHours: 10,
      group: { status: 'ACTIVE', course: { name: '数学', isActive: true }, term: { name: '2026暑假班' } },
    }],
    fees: [{ amount: 200 }],
    ...overrides,
  }
}

function request(url = 'http://localhost/api/settings/export/students') {
  return new NextRequest(url)
}

async function sheetRows(response: Response) {
  const workbook = XLSX.read(Buffer.from(await response.arrayBuffer()), { type: 'buffer' })
  return XLSX.utils.sheet_to_json(workbook.Sheets['学员数据'], { header: 1 }) as unknown[][]
}

function database(students: unknown[] = [student()]) {
  const db = { student: { findMany: vi.fn().mockResolvedValue(students) } }
  mocks.getRequestPrisma.mockResolvedValue(db)
  return db
}

describe('GET /api/settings/export/students', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdminUser.mockResolvedValue({ id: 'admin-a' })
    mocks.getRequestDivision.mockReturnValue('JUNIOR')
    mocks.resolveAdminTermScope.mockResolvedValue(term)
    mocks.createActivityLog.mockResolvedValue(undefined)
  })

  it('exports the selected batch and uses enrollment balances instead of student snapshots', async () => {
    const db = database()
    const response = await GET(request())

    expect(response.status).toBe(200)
    expect(db.student.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        division: 'JUNIOR',
        deletedAt: null,
        termMemberships: { some: { termId: 'term-current', status: { not: 'WITHDRAWN' } } },
        status: { not: 'INACTIVE' },
      },
      include: expect.objectContaining({
        termMemberships: { where: { termId: 'term-current', status: { not: 'WITHDRAWN' } }, select: { grade: true, term: { select: { name: true } } } },
        enrollments: expect.objectContaining({ where: { group: { termId: 'term-current' } } }),
        fees: expect.objectContaining({ where: { status: 'paid', deletedAt: null, termId: 'term-current' } }),
      }),
    }))
    const rows = await sheetRows(response)
    expect(rows[1].slice(0, 10)).toEqual(['学员甲', '女', '初一', '一中', '2026暑假班', 3, 10, 'ACTIVE', '数学', 200])
    expect(mocks.createActivityLog).toHaveBeenCalledWith('admin-a', 'EXPORT_STUDENTS', 'StudentReport', 'JUNIOR', expect.objectContaining({
      termId: 'term-current',
      termName: '2026暑假班',
      allTerms: false,
    }))
  })

  it('exports all term history only when the admin explicitly selects all batches', async () => {
    const db = database([student({
      enrollments: [
        { status: 'COMPLETED', remainHours: 0, totalHours: 10, group: { status: 'ARCHIVED', course: { name: '语文', isActive: false }, term: { name: '2025寒假班' } } },
        { status: 'ACTIVE', remainHours: 2, totalHours: 12, group: { status: 'ACTIVE', course: { name: '数学', isActive: true }, term: { name: '2026暑假班' } } },
      ],
      fees: [{ amount: 100 }, { amount: 200 }],
    })])
    mocks.resolveAdminTermScope.mockClear()

    const response = await GET(request('http://localhost/api/settings/export/students?termId=all'))

    expect(response.status).toBe(200)
    expect(mocks.resolveAdminTermScope).not.toHaveBeenCalled()
    expect(db.student.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { division: 'JUNIOR', deletedAt: null },
      include: expect.objectContaining({
        termMemberships: { where: {}, select: { grade: true, term: { select: { name: true } } } },
        enrollments: { where: {}, include: expect.any(Object) },
        fees: { where: { status: 'paid', deletedAt: null }, select: { amount: true } },
      }),
    }))
    expect((await sheetRows(response))[1].slice(0, 10)).toEqual(['学员甲', '女', '初一', '一中', '2025寒假班、2026暑假班', 2, 12, 'ACTIVE', '数学、语文', 300])
  })
})
