import { PrismaClient } from '@prisma/client'

type DivisionKey = 'JUNIOR' | 'SENIOR'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
  prismaJunior?: PrismaClient
  prismaSenior?: PrismaClient
}

function buildUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return undefined
  return `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}connection_limit=20&pool_timeout=30&connect_timeout=10`
}

function createClient(url: string | undefined): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasources: { db: { url: url ?? '' } },
  })
}

/**
 * Legacy single-database client. Kept exported for backward compatibility with
 * routes that have not been migrated to dual-DB yet. When DUAL_DB is enabled,
 * new code MUST use getRequestPrisma() or getPrismaForDivision() instead.
 */
export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createClient(buildUrl(process.env.DATABASE_URL))

function getJunior(): PrismaClient {
  if (!globalForPrisma.prismaJunior) {
    const url = buildUrl(process.env.DATABASE_URL_JUNIOR)
    if (!url) throw new Error('DATABASE_URL_JUNIOR is not configured')
    globalForPrisma.prismaJunior = createClient(url)
  }
  return globalForPrisma.prismaJunior
}

function getSenior(): PrismaClient {
  if (!globalForPrisma.prismaSenior) {
    const url = buildUrl(process.env.DATABASE_URL_SENIOR)
    if (!url) throw new Error('DATABASE_URL_SENIOR is not configured')
    globalForPrisma.prismaSenior = createClient(url)
  }
  return globalForPrisma.prismaSenior
}

export function isDualDbEnabled(): boolean {
  return process.env.DUAL_DB === 'true'
}

/** Pick the prisma client for a given division. */
export function getPrismaForDivision(division: DivisionKey): PrismaClient {
  if (!isDualDbEnabled()) return prisma
  return division === 'SENIOR' ? getSenior() : getJunior()
}

/**
 * Resolve the prisma client for the CURRENT request using session.user.division.
 * Throws if no session is present. Use this in API routes after authentication.
 */
export async function getRequestPrisma(): Promise<PrismaClient> {
  if (!isDualDbEnabled()) return prisma
  const { auth } = await import('./auth')
  const session = await auth()
  const division = (session?.user as { division?: string } | undefined)?.division
  if (division !== 'JUNIOR' && division !== 'SENIOR') {
    throw new Error('Cannot resolve division from session')
  }
  return getPrismaForDivision(division)
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}