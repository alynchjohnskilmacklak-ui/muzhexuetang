import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'

type SalaryAdjustmentClient = Pick<PrismaClient, '$queryRaw' | '$executeRaw'>

export type ManualSalaryAdjustmentInput = {
  requestKey: string
  teacherId: string
  termId: string
  amount: number
  description: string
}

type ExistingManualAdjustment = {
  id: string
  teacherId: string
  termId: string | null
  type: string
  amount: number
  description: string | null
  deletedAt: Date | null
}

export type ManualSalaryAdjustmentResult =
  | { status: 'created' | 'replayed'; transaction: ExistingManualAdjustment }
  | { status: 'conflict'; transaction: ExistingManualAdjustment }

async function findByRequestKey(client: SalaryAdjustmentClient, requestKey: string) {
  const rows = await client.$queryRaw<ExistingManualAdjustment[]>`
    SELECT "id", "teacherId", "termId", "type", "amount", "description", "deletedAt"
    FROM "TeacherSalaryTransaction"
    WHERE "manualAdjustmentRequestKey" = ${requestKey}
    LIMIT 1
  `
  return rows[0] ?? null
}

function matches(input: ManualSalaryAdjustmentInput, row: ExistingManualAdjustment) {
  return row.deletedAt === null
    && row.teacherId === input.teacherId
    && row.termId === input.termId
    && row.type === 'manual_adjust'
    && Number(row.amount) === input.amount
    && row.description === input.description
}

/** Create the adjustment once; identical network retries return the first row. */
export async function createManualSalaryAdjustmentIdempotently(
  client: SalaryAdjustmentClient,
  input: ManualSalaryAdjustmentInput,
): Promise<ManualSalaryAdjustmentResult> {
  const existing = await findByRequestKey(client, input.requestKey)
  if (existing) return matches(input, existing)
    ? { status: 'replayed', transaction: existing }
    : { status: 'conflict', transaction: existing }

  try {
    await client.$executeRaw`
      INSERT INTO "TeacherSalaryTransaction"
        ("id", "teacherId", "termId", "type", "amount", "description", "manualAdjustmentRequestKey")
      VALUES
        (${randomUUID()}, ${input.teacherId}, ${input.termId}, 'manual_adjust', ${input.amount}, ${input.description}, ${input.requestKey})
    `
  } catch (error) {
    // A concurrent retry may win the unique index between the lookup and insert.
    const raced = await findByRequestKey(client, input.requestKey).catch(() => null)
    if (raced) return matches(input, raced)
      ? { status: 'replayed', transaction: raced }
      : { status: 'conflict', transaction: raced }
    throw error
  }

  const created = await findByRequestKey(client, input.requestKey)
  if (!created) throw new Error('MANUAL_ADJUSTMENT_INSERT_NOT_VISIBLE')
  return { status: 'created', transaction: created }
}
