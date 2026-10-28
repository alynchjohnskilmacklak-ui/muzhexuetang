import { NextRequest, NextResponse } from 'next/server'
import { detectLoginRoleForIdentifier, type LoginIdentifierType } from '@/lib/login-accounts'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({ identifier: '', division: undefined }))
  const identifier = typeof body.identifier === 'string'
    ? body.identifier.trim()
    : typeof body.email === 'string'
      ? body.email.trim()
      : ''
  const division = typeof body.division === 'string' ? body.division : undefined
  const identifierType: LoginIdentifierType = body.identifierType === 'phone' ? 'phone' : 'email'
  if (!identifier || identifier.length > 254) {
    return NextResponse.json({ role: null, division: null }, { headers: { 'Cache-Control': 'no-store' } })
  }

  // This endpoint is used only to select the login entry. Password validation
  // remains authoritative in the credentials provider.
  const detected = await detectLoginRoleForIdentifier(identifier, identifierType, division)
  return NextResponse.json(detected, { headers: { 'Cache-Control': 'no-store' } })
})
