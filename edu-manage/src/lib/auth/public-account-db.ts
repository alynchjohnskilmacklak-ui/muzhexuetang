import type { PrismaClient } from '@prisma/client'
import { getPrismaForDivision, isDualDbEnabled, prisma } from '@/lib/prisma'

export type AuthDivision = 'JUNIOR' | 'SENIOR'

export type PublicAuthDatabase = {
  division: AuthDivision
  prisma: PrismaClient
}

export function parseAuthDivision(value: unknown): AuthDivision | undefined {
  return value === 'JUNIOR' || value === 'SENIOR' ? value : undefined
}

/**
 * Public authentication routes cannot use getRequestPrisma(): there is no
 * authenticated session from which to infer a division yet.
 */
export function getPublicAuthDatabases(requestedDivision?: AuthDivision): PublicAuthDatabase[] {
  if (!isDualDbEnabled()) {
    return [{ division: requestedDivision ?? 'JUNIOR', prisma }]
  }

  if (requestedDivision) {
    return [{ division: requestedDivision, prisma: getPrismaForDivision(requestedDivision) }]
  }

  return [
    { division: 'JUNIOR', prisma: getPrismaForDivision('JUNIOR') },
    { division: 'SENIOR', prisma: getPrismaForDivision('SENIOR') },
  ]
}
