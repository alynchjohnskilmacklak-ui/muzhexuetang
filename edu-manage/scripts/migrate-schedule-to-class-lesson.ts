/**
 * 将旧 Schedule 数据迁移到 ClassGroup/ClassLesson/Enrollment 模型。
 * 只读旧 Schedule，不修改或删除源数据。
 * 已迁移的记录通过 classLesson 的 note 字段标记 "migrated:schedule:<scheduleId>" 避免重复。
 *
 * 用法: npx tsx scripts/migrate-schedule-to-class-lesson.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const MIGRATION_MARKER = 'migrated:schedule:'

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const schedules = await prisma.schedule.findMany({
    where: {
      status: { not: 'cancelled' },
    },
    include: {
      course: true,
      teacher: true,
      students: { include: { student: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`Found ${schedules.length} old Schedule records`)

  let migrated = 0
  let skipped = 0
  const errors: string[] = []

  for (const s of schedules) {
    try {
      // Check if already migrated
      const existing = await prisma.classLesson.findFirst({
        where: { note: { contains: `${MIGRATION_MARKER}${s.id}` } },
      })
      if (existing) {
        console.log(`  [skip] Schedule ${s.id} already migrated → ClassLesson ${existing.id}`)
        skipped++
        continue
      }

      if (dryRun) {
        console.log(`  [dry-run] Would migrate Schedule ${s.id}: ${s.title}`)
        migrated++
        continue
      }

      // Create ClassGroup
      const startDate = s.startTime.toISOString().slice(0, 10)
      const startTime = s.startTime.toTimeString().slice(0, 5)
      const endTime = s.endTime.toTimeString().slice(0, 5)

      const group = await prisma.classGroup.create({
        data: {
          name: s.title,
          courseId: s.courseId,
          teacherId: s.teacherId,
          roomId: s.roomId,
          startDate: new Date(startDate),
          totalLessons: 1,
          recurringDays: [],
          lessonStartTime: startTime,
          lessonMinutes: Math.max(30, (s.endTime.getTime() - s.startTime.getTime()) / 60000),
          status: 'ACTIVE',
          division: 'JUNIOR',
        },
      })

      // Create ClassLesson
      const lesson = await prisma.classLesson.create({
        data: {
          groupId: group.id,
          teacherId: s.teacherId,
          lessonDate: new Date(startDate),
          startTime,
          endTime,
          status: 'SCHEDULED',
          note: `${MIGRATION_MARKER}${s.id}`,
          division: 'JUNIOR',
        },
      })

      // Create Enrollments for each student
      for (const ss of s.students) {
        await prisma.enrollment.create({
          data: {
            groupId: group.id,
            studentId: ss.studentId,
            totalHours: 0,
            remainHours: 0,
            status: 'ACTIVE',
          },
        })
      }

      console.log(`  [ok] Schedule ${s.id} → ClassGroup ${group.id} / ClassLesson ${lesson.id}`)
      migrated++
    } catch (err) {
      const msg = `Schedule ${s.id}: ${err instanceof Error ? err.message : 'unknown'}`
      errors.push(msg)
      console.error(`  [err] ${msg}`)
    }
  }

  console.log(`\nDone. Migrated: ${migrated}, Skipped: ${skipped}, Errors: ${errors.length}`)
  if (dryRun) console.log('  (dry-run mode — no changes made)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
