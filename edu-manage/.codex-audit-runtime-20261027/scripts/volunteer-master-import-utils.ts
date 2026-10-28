import 'dotenv/config'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { getPrismaForDivision } from '../src/lib/prisma'

export function readVolunteerJson<T>(defaultPath: string) {
  const filePath = path.resolve(process.argv.find((arg) => arg.endsWith('.json')) || defaultPath)
  const payload = JSON.parse(readFileSync(filePath, 'utf8')) as { year: number; data: T[] }
  if (!Number.isInteger(payload.year) || !Array.isArray(payload.data)) throw new Error(`${filePath} 缺少有效 year/data`)
  return { filePath, year: payload.year, rows: payload.data }
}

export function juniorDb() {
  return getPrismaForDivision('JUNIOR')
}

export function requiredText(value: unknown, field: string) {
  const text = String(value || '').trim()
  if (!text) throw new Error(`${field} 不能为空`)
  return text
}

export function requiredInt(value: unknown, field: string) {
  if (!Number.isInteger(value)) throw new Error(`${field} 必须为整数`)
  return value as number
}
