const { loadEnvConfig } = require('@next/env')

loadEnvConfig(process.cwd(), true)

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not configured in the local environment files.')
  process.exit(2)
}

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({ log: [] })

prisma.$queryRaw`SELECT 1`
  .then(() => console.log('Local database connection is healthy.'))
  .catch((error) => {
    const code = [error?.code, error?.errorCode, error?.meta?.code].find(
      (value) => typeof value === 'string' && /^[A-Z0-9_]+$/.test(value),
    )
    const message = String(error?.message || '').toLowerCase()
    let hint = 'Check the local Prisma client and database configuration.'
    if (/p1001|can't reach|could not connect|connection refused|timed out/.test(message)) {
      hint = 'The configured database host is not reachable.'
    } else if (/p1000|authentication failed|password authentication/.test(message)) {
      hint = 'The configured database rejected authentication.'
    } else if (/p1003|database .* does not exist/.test(message)) {
      hint = 'The configured database name does not exist.'
    } else if (/environment variable .* not found|p1012/.test(message)) {
      hint = 'A required database environment variable is missing or invalid.'
    }
    console.error(`Local database connection failed${code ? ` (${code})` : ''}. ${hint} Connection details were omitted.`)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
