import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

export function getJuniorDatabaseUrl(): string {
  if (process.env.DATABASE_URL_JUNIOR) return process.env.DATABASE_URL_JUNIOR

  try {
    const env = readFileSync(resolve(process.cwd(), '.env'), 'utf8')
    const line = env.split(/\r?\n/).find(value => value.startsWith('DATABASE_URL_JUNIOR='))
    const value = line?.slice('DATABASE_URL_JUNIOR='.length).trim().replace(/^(["'])(.*)\1$/, '$2')
    if (value) return value
  } catch {
    // The explicit error below is more useful than the file-system error.
  }

  throw new Error('DATABASE_URL_JUNIOR 未配置：为防止误操作其它库，脚本已停止')
}

export function createJuniorPrisma(): PrismaClient {
  return new PrismaClient({ datasources: { db: { url: getJuniorDatabaseUrl() } } })
}

export function isMissingString(value: string | null | undefined): boolean {
  return value == null || value.trim() === ''
}

export function writeJsonReport(path: string, report: unknown): void {
  const { mkdirSync, writeFileSync } = require('node:fs') as typeof import('node:fs')
  const { dirname } = require('node:path') as typeof import('node:path')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
}
