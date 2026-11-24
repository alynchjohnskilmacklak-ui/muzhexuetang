import { PrismaClient } from '@prisma/client'

/**
 * 教师任教学科一致性巡检与安全修复脚本
 * 
 * 用法:
 *  - 仅检测不修改: npx tsx scripts/audit-and-fix-teacher-subjects.ts
 *  - 执行安全自动纠偏: npx tsx scripts/audit-and-fix-teacher-subjects.ts --fix
 */
async function main() {
  const prisma = new PrismaClient()
  const isFix = process.argv.includes('--fix')

  console.log(`\n======================================================`)
  console.log(`🔍 牧哲学堂 · 教师与学科映射数据健康巡检与修复工具`)
  console.log(`运行模式: ${isFix ? '【安全修复模式 (--fix)】' : '【仅巡检模式 (Dry-Run)】'}`)
  console.log(`======================================================\n`)

  try {
    // 1. 获取所有在职教师及其任教学科
    const teachers = await prisma.teacher.findMany({
      select: { id: true, name: true, subjects: true, status: true },
    })

    const teacherMap = new Map<string, { id: string; name: string; subjects: string[] }>()
    for (const t of teachers) {
      const subs = (t.subjects || '')
        .split(/[,，、]/)
        .map((s) => s.trim())
        .filter(Boolean)
      teacherMap.set(t.id, { id: t.id, name: t.name, subjects: subs })
    }

    console.log(`已加载 ${teachers.length} 名教师档案。`)

    // 2. 巡检 ClassGroupTeacher 班级教师分配
    const assignments = await prisma.classGroupTeacher.findMany({
      include: {
        teacher: { select: { id: true, name: true, subjects: true } },
        group: { select: { id: true, name: true } },
      },
    })

    const invalidAssignments: typeof assignments = []
    for (const a of assignments) {
      if (!a.subject) continue
      const t = teacherMap.get(a.teacherId)
      if (!t || t.subjects.length === 0) continue
      if (!t.subjects.includes(a.subject)) {
        invalidAssignments.push(a)
      }
    }

    console.log(`\n📋 班级授课团队 (ClassGroupTeacher) 巡检结果:`)
    console.log(`- 检查总记录数: ${assignments.length}`)
    console.log(`- 发现学科不匹配记录: ${invalidAssignments.length} 处`)
    for (const a of invalidAssignments) {
      const t = teacherMap.get(a.teacherId)!
      console.log(`  ⚠ [班级: ${a.group.name}] ${t.name} (登记学科: ${t.subjects.join('/')}) 被分配为 -> 【${a.subject}】`)
    }

    // 3. 巡检 ClassLesson 排课明细
    const lessons = await prisma.classLesson.findMany({
      where: {
        deletedAt: null,
        teacherId: { not: null },
        subject: { not: null },
      },
      select: {
        id: true,
        groupId: true,
        teacherId: true,
        subject: true,
        lessonDate: true,
        startTime: true,
        endTime: true,
        status: true,
        group: { select: { name: true } },
      },
    })

    const invalidLessons: typeof lessons = []
    for (const l of lessons) {
      if (!l.teacherId || !l.subject) continue
      const t = teacherMap.get(l.teacherId)
      if (!t || t.subjects.length === 0) continue
      if (!t.subjects.includes(l.subject)) {
        invalidLessons.push(l)
      }
    }

    console.log(`\n📋 课次排课 (ClassLesson) 巡检结果:`)
    console.log(`- 检查总排课数: ${lessons.length}`)
    console.log(`- 发现学科不匹配排课: ${invalidLessons.length} 节`)
    const lessonSummary = new Map<string, number>()
    for (const l of invalidLessons) {
      const t = teacherMap.get(l.teacherId!)!
      const k = `${t.name} (登记: ${t.subjects.join('/')}) -> 排课学科: ${l.subject}`
      lessonSummary.set(k, (lessonSummary.get(k) || 0) + 1)
    }
    for (const [k, count] of lessonSummary.entries()) {
      console.log(`  ⚠ ${k} (共计 ${count} 节课)`)
    }

    // 4. 执行安全自动修复（若开启 --fix 且教师档案仅有单一明确学科）
    if (isFix) {
      console.log(`\n🛠 正在执行安全自动修复...`)
      let fixedAssignments = 0
      for (const a of invalidAssignments) {
        const t = teacherMap.get(a.teacherId)!
        if (t.subjects.length === 1) {
          const correctSubject = t.subjects[0]
          await prisma.classGroupTeacher.update({
            where: { id: a.id },
            data: { subject: correctSubject },
          })
          fixedAssignments++
        }
      }

      let fixedLessons = 0
      for (const l of invalidLessons) {
        const t = teacherMap.get(l.teacherId!)!
        if (t.subjects.length === 1) {
          const correctSubject = t.subjects[0]
          await prisma.classLesson.update({
            where: { id: l.id },
            data: { subject: correctSubject },
          })
          fixedLessons++
        }
      }

      console.log(`✅ 修复完成:`)
      console.log(`- 已将 ${fixedAssignments} 条班级授课团队记录纠正为教师唯一法定学科`)
      console.log(`- 已将 ${fixedLessons} 节排课记录纠正为教师唯一法定学科`)
    } else if (invalidAssignments.length > 0 || invalidLessons.length > 0) {
      console.log(`\n💡 提示: 若需将单学科专职教师的错误排课一键安全纠正，请运行:`)
      console.log(`  npx tsx scripts/audit-and-fix-teacher-subjects.ts --fix`)
    } else {
      console.log(`\n🎉 巡检通过！数据库中未发现任何教师与学科冲突。`)
    }
  } catch (error) {
    console.error('巡检脚本执行出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}

export { main }
