import type { PrismaClient } from '@prisma/client'
import { getLocalDayRange, localDateKey } from '@/lib/date/local-day'

export type LoginRecordDivision = 'JUNIOR' | 'SENIOR'
export type LoginRecordDivisionFilter = 'ALL' | LoginRecordDivision
export const SESSION_ACCESS_REASON = 'session_resume'

export type SessionAccessMeta = {
  ip: string
  userAgent: string
  device: string
  os: string
  browser: string
}

export type DividedLoginRecord = {
  id: string
  createdAt: Date
  division: LoginRecordDivision
}

function compareLoginRecords(a: DividedLoginRecord, b: DividedLoginRecord): number {
  const timeDifference = b.createdAt.getTime() - a.createdAt.getTime()
  if (timeDifference !== 0) return timeDifference
  const divisionDifference = a.division.localeCompare(b.division)
  if (divisionDifference !== 0) return divisionDifference
  return a.id.localeCompare(b.id)
}

/** Merge two already sorted database streams, then apply one global page window. */
export function mergeLoginRecordPage<T extends DividedLoginRecord>(
  juniorRecords: T[],
  seniorRecords: T[],
  offset: number,
  limit: number,
): T[] {
  const merged: T[] = []
  let juniorIndex = 0
  let seniorIndex = 0
  const end = offset + limit

  while (merged.length < end && (juniorIndex < juniorRecords.length || seniorIndex < seniorRecords.length)) {
    const junior = juniorRecords[juniorIndex]
    const senior = seniorRecords[seniorIndex]
    if (!junior) {
      merged.push(senior)
      seniorIndex += 1
    } else if (!senior || compareLoginRecords(junior, senior) <= 0) {
      merged.push(junior)
      juniorIndex += 1
    } else {
      merged.push(senior)
      seniorIndex += 1
    }
  }

  return merged.slice(offset, end)
}

export function parseLoginRecordDivision(value: string | null): LoginRecordDivisionFilter | null {
  if (value == null || value === '') return 'ALL'
  const normalized = value.toUpperCase()
  return normalized === 'ALL' || normalized === 'JUNIOR' || normalized === 'SENIOR'
    ? normalized
    : null
}

/**
 * Record one successful visit per account and China-local calendar day.
 * A password login already written today suppresses the extra session-resume row.
 */
export async function recordDailySessionAccess(
  client: PrismaClient,
  user: { id: string; email: string },
  meta: SessionAccessMeta,
  now = new Date(),
): Promise<boolean> {
  const { start, end } = getLocalDayRange(localDateKey(now))
  const existingSuccess = await client.loginRecord.findFirst({
    where: {
      userId: user.id,
      success: true,
      createdAt: { gte: start, lt: end },
    },
    select: { id: true },
  })
  if (existingSuccess) return false

  await client.$transaction([
    client.loginRecord.create({
      data: {
        userId: user.id,
        email: user.email,
        success: true,
        failReason: SESSION_ACCESS_REASON,
        ip: meta.ip,
        userAgent: meta.userAgent,
        device: meta.device,
        os: meta.os,
        browser: meta.browser,
      },
    }),
    client.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: now,
        lastLoginIp: meta.ip,
        lastLoginDevice: meta.device,
      },
    }),
  ])
  return true
}
