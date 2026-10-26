import { NextRequest, NextResponse } from 'next/server'
import { salaryPeriodStart, settleSalaryLedger, SalarySettlementError } from '@/lib/salary-settlement'
import { requireAdminUser } from '@/lib/teacher-portal'
import { getRequestDivision } from '@/lib/division'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'

export const dynamic = 'force-dynamic'


export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireAdminUser()
    const division = getRequestDivision(adminUser, req.nextUrl.searchParams.get('division'))
    const selectedTerm = await resolveAdminTermScope(adminUser.prisma, division, req)
    if (!selectedTerm || selectedTerm.status !== 'ACTIVE') {
      return NextResponse.json({ error: '历史批次工资只允许查看，请切换到当前运营批次后再结算工资' }, { status: 409 })
    }
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: '请求内容格式无效' }, { status: 400 })
    if (body.termId && body.termId !== selectedTerm.id) return NextResponse.json({ error: '运营批次已切换，请刷新后再结算' }, { status: 409 })
    if (body.expectedTotal !== undefined && (typeof body.expectedTotal !== 'number' || !Number.isFinite(body.expectedTotal))) return NextResponse.json({ error: '确认金额无效' }, { status: 400 })
    const teacherId = typeof body.teacherId === 'string' ? body.teacherId.trim() : ''
    if (!teacherId) return NextResponse.json({ error: '请选择教师' }, { status: 400 })

    const teacher = await adminUser.prisma.teacher.findFirst({
      where: { id: teacherId, division, status: 'ACTIVE' },
      select: { id: true, name: true },
    })
    if (!teacher) return NextResponse.json({ error: '当前学部没有该教师' }, { status: 404 })

    const period = typeof body.period === 'string' && ['week', 'all', 'month'].includes(body.period) ? body.period : 'month'
    const since = salaryPeriodStart(period)

    const now = new Date()
    const periodLabel = period === 'week' ? '近7天' : period === 'all' ? '本期全部' : '本月'
    const result = await settleSalaryLedger(adminUser.prisma, { teacherId, teacherName: teacher.name, termId: selectedTerm.id, since, through: now, actorId: adminUser.id, periodLabel, expectedTotal: body.expectedTotal })
    return NextResponse.json({ success: true, ...result }, { status: 201 })
  } catch (error) {
    if (error instanceof SalarySettlementError) return NextResponse.json({ error: error.message }, { status: error.status })
    const code = error && typeof error === 'object' && 'code' in error ? error.code : null
    if (code === 'P2021' || code === 'P2022') return NextResponse.json({ error: '薪资结算所需的数据库结构尚未同步，请先按部署流程应用迁移，再刷新核对后结算' }, { status: 503 })
    if (code === 'P2024') return NextResponse.json({ error: '数据库连接繁忙，结算未完成。请稍后刷新核对后再试' }, { status: 503 })
    if (code === 'P2034') return NextResponse.json({ error: '结算发生并发冲突，未提交本次操作。请刷新余额核对后再试' }, { status: 409 })
    if (error instanceof Error && error.message === 'ADMIN_UNAUTHORIZED') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }
    console.error('[admin:salary:settle]', error)
    return NextResponse.json({ error: '服务器错误，请稍后重试' }, { status: 500 })
  }
}
