import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export async function GET() {
  const prisma = new PrismaClient()
  
  try {
    // Push schema
    const { execSync } = await import('child_process')
    execSync('npx prisma db push --skip-generate --accept-data-loss', { 
      cwd: process.cwd(),
      env: { ...process.env },
      timeout: 60000 
    })
    
    // Seed
    const admin = await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {},
      create: { email: 'admin@test.com', password: '123456', name: '管理员', role: 'admin' },
    })

    await prisma.user.upsert({
      where: { email: 'parent1@test.com' },
      update: {},
      create: { email: 'parent1@test.com', password: '123456', name: '张爸爸', role: 'parent' },
    })

    const t1 = await prisma.teacher.create({ data: { id: 't1', name: '王老师', subjects: '音乐' } })
    const t2 = await prisma.teacher.create({ data: { id: 't2', name: '李老师', subjects: '数学' } })

    const c1 = await prisma.course.create({ data: { id: 'c1', name: '钢琴基础班', subject: '音乐', price: 3800, duration: 90, teacherId: t1.id } })

    const p1 = await prisma.user.findUnique({ where: { email: 'parent1@test.com' } })

    const s1 = await prisma.student.create({ data: { id: 's1', name: '张三', status: 'active', parentId: p1?.id } })

    await prisma.grade.create({ data: { studentId: s1.id, courseId: c1.id, score: 92, type: '期中' } })
    await prisma.fee.create({ data: { studentId: s1.id, courseId: c1.id, amount: 3800, type: '课时费', status: 'paid', paidAt: new Date() } })

    return NextResponse.json({ success: true, message: '数据库已初始化', accounts: [
      { role: '管理员', email: 'admin@test.com', password: '123456' },
      { role: '家长', email: 'parent1@test.com', password: '123456' },
    ]})
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
