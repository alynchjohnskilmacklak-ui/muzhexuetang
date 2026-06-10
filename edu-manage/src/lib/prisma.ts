import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const connectionUrl = process.env.DATABASE_URL
  ? `${process.env.DATABASE_URL}${process.env.DATABASE_URL.includes('?') ? '&' : '?'}connection_limit=20&pool_timeout=30&connect_timeout=10`
  : undefined

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['warn', 'error']
    : ['error'],
  datasources: {
    db: {
      url: connectionUrl || process.env.DATABASE_URL,
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
