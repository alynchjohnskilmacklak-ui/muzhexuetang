import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ exec: vi.fn(), files: vi.fn(), log: vi.fn() }))
vi.mock('child_process', () => ({ execFile: mocks.exec }))
vi.mock('fs', () => ({ default: {
  readdirSync: mocks.files, existsSync: () => true,
  statSync: () => ({ isDirectory: () => true, isFile: () => true }), realpathSync: (value: string) => value,
} }))
vi.mock('@/lib/danger-guard', () => ({ assertDangerAuth: async () => ({ userId: 'admin1' }) }))
vi.mock('@/lib/data-admin/entities-server', () => ({ createActivityLog: mocks.log }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (fn: unknown) => fn }))
import { POST } from './route'

describe('restore preflight and explicit partial results (no real database commands)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('DATABASE_URL_JUNIOR', 'postgresql://user:fixture@localhost/junior')
    vi.stubEnv('DATABASE_URL_SENIOR', 'postgresql://user:fixture@localhost/senior')
    mocks.files.mockReturnValue(['chuzhong.dump', 'gaozhong.dump'])
    mocks.log.mockResolvedValue(undefined)
    mocks.exec.mockImplementation((_command, _args, _options, callback) => callback(null, { stdout: '', stderr: '' }))
  })
  afterEach(() => vi.unstubAllEnvs())
  const request = () => new NextRequest('http://localhost/api/admin/data-admin/restore', { method: 'POST', body: JSON.stringify({ backupId: 'manual-20261012_100000', targetDivision: 'BOTH' }) })
  it('refuses missing second backup before overwriting either database', async () => {
    mocks.files.mockReturnValue(['chuzhong.dump'])
    const response = await POST(request())
    expect(response.status).toBe(400)
    expect(mocks.exec.mock.calls.every(call => call[1].includes('--list'))).toBe(true)
  })
  it('validates both dumps before starting atomic restore commands', async () => {
    const response = await POST(request())
    expect(await response.json()).toMatchObject({ success: true, completedDivisions: ['JUNIOR', 'SENIOR'] })
    expect(mocks.exec.mock.calls.map(call => call[1][0])).toEqual(['--list', '--list', '--single-transaction', '--single-transaction'])
  })
  it('rejects two division configurations pointing to the same target database', async () => {
    vi.stubEnv('DATABASE_URL_SENIOR', 'postgresql://user:fixture@localhost/junior')
    const response = await POST(request())
    expect(response.status).toBe(400)
    expect(mocks.exec.mock.calls.every(call => call[1].includes('--list'))).toBe(true)
  })
  it('reports already-completed divisions when the second database fails', async () => {
    mocks.exec.mockImplementation((_command, args, _options, callback) => callback(args.includes('--single-transaction') && args.at(-1).includes('gaozhong') ? new Error('fixture SQL failure') : null, { stdout: '', stderr: '' }))
    const response = await POST(request())
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ success: false, partial: true, completedDivisions: ['JUNIOR'], failedDivision: 'SENIOR' })
  })
  it('does not mistake a failed audit log for a failed committed restore', async () => {
    mocks.log.mockRejectedValue(new Error('fixture audit failure'))
    const response = await POST(request())
    expect(await response.json()).toMatchObject({ success: true, warning: expect.stringContaining('操作日志') })
  })
})
