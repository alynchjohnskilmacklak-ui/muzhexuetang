/**
 * backfill-enrollment-subjects.ts
 *
 * 历史选课数据补全：把 subjects 为空的 ACTIVE 选课（legacy "全部学科"兼容数据），
 * 按所属班级的学科全集补全：course.subject（顿号/逗号分隔）+ ClassGroupTeacher.subject + ClassLesson.subject 去重。
 * 补全后 enrollmentIncludesSubject 收紧为"空 = 不匹配任何学科"，实现考勤/反馈名单按报名学科严格隔离。
 *
 * 用法：
 *   npx tsx scripts/backfill-enrollment-subjects.ts            # dry-run，只打印统计
 *   npx tsx scripts/backfill-enrollment-subjects.ts --apply    # 实际写入
 */
import type { PrismaClient } from '@prisma/client'
import { getPrismaForDivision, isDualDbEnabled, prisma } from '../src/lib/prisma'

type Division = 'JUNIOR' | 'SENIOR'

const apply = process.argv.includes('--apply')

function splitSubjects(value: string | null | undefined): string[] {
  if (!value) return []
  return [...new Set(
    value
      .split(/[、,，;；\s/|]+/)
      .map((item) => item.trim())
      .filter(Boolean),
  )]
}

function subjectSetsAreEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const setB = new Set(b)
  return a.every((item) => setB.has(item))
}

async function backfillDivision(division: Division, db: PrismaClient) {
  const enrollments = await db.enrollment.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
    },
    include: {
      group: {
        include: {
          course: true,
          teacherAssignments: { select: { subject: true } },
          classLessons: { select: { subject: true } },
        },
      },
      student: { select: { id: true, name: true } },
    },
  })

  const empty = enrollments.filter(
    (row) => !row.subjects || row.subjects.length === 0,
  )
  const willUpdate: Array<{ id: string; studentName: string; groupName: string; subjects: string[] }> = []
  const skippedNoSubject: Array<{ id: string; studentName: string; groupName: string }> = []

  for (const row of empty) {
    const g = row.group
    if (!g) {
      skippedNoSubject.push({ id: row.id, studentName: row.student?.name || '?', groupName: '(班级缺失)' })
      continue
    }
    const subjectSet = new Set<string>(splitSubjects(g.course?.subject))
    for (const t of g.teacherAssignments) {
      if (t.subject) subjectSet.add(t.subject.trim())
    }
    for (const l of g.classLessons) {
      if (l.subject) subjectSet.add(l.subject.trim())
    }
    const subjects = [...subjectSet].sort()
    if (subjects.length === 0) {
      skippedNoSubject.push({ id: row.id, studentName: row.student?.name || '?', groupName: g.name || '?' })
      continue
    }
    willUpdate.push({
      id: row.id,
      studentName: row.student?.name || '?',
      groupName: g.name || '?',
      subjects,
    })
  }

  console.log(`\n===== ${division} (${db === prisma ? '单库模式' : '双库'}) =====`)
  console.log(`ACTIVE 选课总数: ${enrollments.length}`)
  console.log(`subjects 为空: ${empty.length}`)
  console.log(`可补全: ${willUpdate.length}`)
  console.log(`跳过（班级无学科信息）: ${skippedNoSubject.length}`)

  if (skippedNoSubject.length) {
    console.log('  跳过的记录:')
    for (const item of skippedNoSubject.slice(0, 10)) {
      console.log(`    - ${item.studentName} / ${item.groupName} (${item.id})`)
    }
    if (skippedNoSubject.length > 10) console.log(`    ... 共 ${skippedNoSubject.length} 条`)
  }

  if (willUpdate.length) {
    console.log('  补全示例（前 8 条）:')
    for (const item of willUpdate.slice(0, 8)) {
      console.log(`    - ${item.studentName} / ${item.groupName} → [${item.subjects.join(', ')}]`)
    }
    if (willUpdate.length > 8) console.log(`    ... 共 ${willUpdate.length} 条`)
  }

  if (!apply) {
    console.log('\n[DRY-RUN] 未写入。加 --apply 执行补全。')
    return
  }

  // 分批写入，每批 50 条
  let updated = 0
  for (let i = 0; i < willUpdate.length; i += 50) {
    const batch = willUpdate.slice(i, i + 50)
    await db.$transaction(
      batch.map((item) =>
        db.enrollment.update({
          where: { id: item.id },
          data: { subjects: item.subjects },
        }),
      ),
    )
    updated += batch.length
    console.log(`  已写入批次 ${Math.floor(i / 50) + 1}（${updated}/${willUpdate.length}）`)
  }

  // 复验：仍有空的 ACTIVE 选课数
  const remain = await db.enrollment.findMany({
    where: { status: 'ACTIVE', deletedAt: null },
    select: { id: true, subjects: true },
  })
  const remainEmpty = remain.filter((row) => !row.subjects || row.subjects.length === 0).length
  console.log(`\n补全完成：写入 ${updated} 条；补全后仍有空 subjects 的 ACTIVE 选课: ${remainEmpty} 条`)

  // 一致性抽查：随机 5 条已补全记录与班级学科集合一致
  const sample = await db.enrollment.findMany({
    where: { status: 'ACTIVE', deletedAt: null },
    include: {
      group: {
        include: {
          course: true,
          teacherAssignments: { select: { subject: true } },
          classLessons: { select: { subject: true } },
        },
      },
    },
    take: 5,
  })
  for (const row of sample) {
    const g = row.group
    const set = new Set<string>(splitSubjects(g.course?.subject))
    for (const t of g.teacherAssignments) if (t.subject) set.add(t.subject.trim())
    for (const l of g.classLessons) if (l.subject) set.add(l.subject.trim())
    const expect = [...set].sort()
    const actual = [...(row.subjects || [])].sort()
    console.log(`  抽查 ${row.studentId.slice(0, 6)}: 一致=${subjectSetsAreEqual(actual, expect)} [${actual.join(', ')}]`)
  }
}

async function main() {
  if (isDualDbEnabled()) {
    await backfillDivision('JUNIOR', await getPrismaForDivision('JUNIOR'))
    await backfillDivision('SENIOR', await getPrismaForDivision('SENIOR'))
  } else {
    await backfillDivision('JUNIOR', prisma)
  }
}

main()
  .then(() => {
    console.log('\ndone')
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
