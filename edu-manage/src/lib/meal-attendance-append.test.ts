import { describe, expect, it } from 'vitest'
import { appendTeacherMealAttendance, type TeacherMealAppendInput } from './meal-attendance-append'

type MealRow = {
  id: string
  studentId: string
  mealDate: Date
  division: string
  recordedBy: string
  eating: boolean
  source: string
  groupId?: string | null
  groupName?: string | null
  lessonId?: string | null
  teacherId?: string | null
  teacherName?: string | null
  notes?: string | null
}

function makeTransaction(seed: MealRow[] = []) {
  const rows = [...seed]
  let nextId = rows.length + 1
  const model = {
    findMany: async ({ where }: { where: { studentId: { in: string[] }; mealDate: Date } }) => (
      rows.filter((row) => where.studentId.in.includes(row.studentId)
        && row.mealDate.getTime() === where.mealDate.getTime())
        .map(({ id, studentId, eating, source }) => ({ id, studentId, eating, source }))
    ),
    createMany: async ({ data, skipDuplicates }: { data: MealRow[]; skipDuplicates: boolean }) => {
      let count = 0
      for (const item of data) {
        const exists = rows.some((row) => row.studentId === item.studentId
          && row.mealDate.getTime() === item.mealDate.getTime())
        if (exists && skipDuplicates) continue
        rows.push({ ...item, id: item.id || `meal-${nextId++}` })
        count += 1
      }
      return { count }
    },
    updateMany: async ({ where, data }: { where: { studentId: { in: string[] }; mealDate: Date; source: string; eating: boolean }; data: Partial<MealRow> }) => {
      let count = 0
      for (const row of rows) {
        if (where.studentId.in.includes(row.studentId)
          && row.mealDate.getTime() === where.mealDate.getTime()
          && row.source === where.source
          && row.eating === where.eating) {
          Object.assign(row, data)
          count += 1
        }
      }
      return { count }
    },
  }
  return { rows, transaction: { studentMealAttendance: model } }
}

const baseInput: TeacherMealAppendInput = {
  studentIds: ['student-a', 'student-b'],
  mealDate: new Date('2026-11-09T00:00:00.000Z'),
  division: 'JUNIOR',
  recordedBy: 'user-teacher',
  groupId: 'group-late-class',
  groupName: '初一冲刺班',
  lessonId: 'lesson-second',
  teacherId: 'teacher-1',
  teacherName: '王老师',
}

describe('appendTeacherMealAttendance', () => {
  it('updates an automatic no-meal record and creates missing late-arrival records', async () => {
    const { rows, transaction } = makeTransaction([{
      id: 'meal-a',
      studentId: 'student-a',
      mealDate: baseInput.mealDate,
      division: 'JUNIOR',
      recordedBy: 'user-teacher',
      eating: false,
      source: 'AUTO',
      lessonId: 'lesson-first',
    }])

    const result = await appendTeacherMealAttendance(transaction as never, baseInput)

    expect(result.addedStudentIds).toEqual(['student-a', 'student-b'])
    expect(result.skippedManualStudentIds).toEqual([])
    expect(rows).toHaveLength(2)
    expect(rows.every((row) => row.eating)).toBe(true)
    expect(rows.find((row) => row.studentId === 'student-a')).toMatchObject({
      lessonId: 'lesson-second',
      groupName: '初一冲刺班',
      notes: expect.stringContaining('后续课次追加就餐'),
    })
  })

  it('keeps administrator manual decisions and reports students already marked as eating', async () => {
    const { rows, transaction } = makeTransaction([
      {
        id: 'manual-no',
        studentId: 'student-a',
        mealDate: baseInput.mealDate,
        division: 'JUNIOR',
        recordedBy: 'admin-user',
        eating: false,
        source: 'MANUAL',
      },
      {
        id: 'already-yes',
        studentId: 'student-b',
        mealDate: baseInput.mealDate,
        division: 'JUNIOR',
        recordedBy: 'teacher-user',
        eating: true,
        source: 'AUTO',
      },
    ])

    const result = await appendTeacherMealAttendance(transaction as never, baseInput)

    expect(result.addedStudentIds).toEqual([])
    expect(result.alreadyEatingStudentIds).toEqual(['student-b'])
    expect(result.skippedManualStudentIds).toEqual(['student-a'])
    expect(rows.find((row) => row.studentId === 'student-a')).toMatchObject({ source: 'MANUAL', eating: false })
  })

  it('is idempotent when the same late-arrival students are appended twice', async () => {
    const { rows, transaction } = makeTransaction()
    const first = await appendTeacherMealAttendance(transaction as never, baseInput)
    const second = await appendTeacherMealAttendance(transaction as never, baseInput)

    expect(first.addedStudentIds).toHaveLength(2)
    expect(second.addedStudentIds).toEqual([])
    expect(second.alreadyEatingStudentIds).toEqual(['student-a', 'student-b'])
    expect(rows).toHaveLength(2)
  })
})
