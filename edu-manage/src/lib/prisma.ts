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

export function getPrismaForDivision(division: DivisionKey): PrismaClient {
  if (!isDualDbEnabled()) return prisma
  return division === 'SENIOR' ? getSenior() : getJunior()
}

/**
 * Resolve the prisma client for the CURRENT request.
 * In single-DB mode returns the default prisma client.
 * In dual-DB mode reads division from session via lazy require to avoid webpack tracing.
 */
export async function getRequestPrisma(): Promise<PrismaClient> {
  if (!isDualDbEnabled()) return prisma
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { auth } = require('./auth') as typeof import('./auth')
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
