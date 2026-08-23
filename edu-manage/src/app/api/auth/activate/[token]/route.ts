import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getPrismaForDivision } from '@/lib/prisma'
import { activateParentAccount, inspectParentActivationToken } from '@/lib/parent-activation'

export const dynamic = 'force-dynamic'

async function findToken(token: string) {
  const junior = getPrismaForDivision('JUNIOR')
  const juniorRecord = await inspectParentActivationToken(junior, token)
  if (juniorRecord) return { db: junior, record: juniorRecord }
  const senior = getPrismaForDivision('SENIOR')
  if (senior === junior) return null
  const seniorRecord = await inspectParentActivationToken(senior, token)
  return seniorRecord ? { db: senior, record: seniorRecord } : null
}

export const GET = apiHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) => {
  const { token } = await params
  const found = await findToken(token)
  if (!found) return NextResponse.json({ error: '激活链接无效或已过期' }, { status: 404 })
  return NextResponse.json({
    parent: { name: found.record.parentUser.name, email: found.record.parentUser.email },
    students: found.record.parentUser.students,
    expiresAt: found.record.expiresAt,
  })
})

export const POST = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) => {
  const { token } = await params
  const found = await findToken(token)
  if (!found) return NextResponse.json({ error: '激活链接无效或已过期' }, { status: 404 })
  const body = await request.json()
  try {
    const result = await activateParentAccount(found.db, {
      token,
      password: typeof body.password === 'string' ? body.password : '',
    })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '激活失败' }, { status: 400 })
  }
})
