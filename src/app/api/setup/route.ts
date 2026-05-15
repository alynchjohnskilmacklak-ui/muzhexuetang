import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  const prisma = new PrismaClient()

  try {
    await prisma.user.upsert({ where: { email: 'admin@test.com' }, update: {}, create: { email: 'admin@test.com', password: '123456', name: '管理员', role: 'admin' } })
    await prisma.user.upsert({ where: { email: 'parent1@test.com' }, update: {}, create: { email: 'parent1@test.com', password: '123456', name: '张爸爸', role: 'parent' } })
    await prisma.user.upsert({ where: { email: 'parent2@test.com' }, update: {}, create: { email: 'parent2@test.com', password: '123456', name: '李妈妈', role: 'parent' } })

    const t1 = await prisma.teacher.upsert({ where: { id: 't1' }, update: {}, create: { id: 't1', name: '王老师', subjects: '音乐' } })
    const t2 = await prisma.teacher.upsert({ where: { id: 't2' }, update: {}, create: { id: 't2', name: '李老师', subjects: '数学' } })
    const t3 = await prisma.teacher.upsert({ where: { id: 't3' }, update: {}, create: { id: 't3', name: '张老师', subjects: '英语' } })
    const t4 = await prisma.teacher.upsert({ where: { id: 't4' }, update: {}, create: { id: 't4', name: '赵老师', subjects: '编程' } })
    const t5 = await prisma.teacher.upsert({ where: { id: 't5' }, update: {}, create: { id: 't5', name: '陈老师', subjects: '美术' } })

    const c1 = await prisma.course.upsert({ where: { id: 'c1' }, update: {}, create: { id: 'c1', name: '钢琴基础班', subject: '音乐', price: 3800, duration: 90, teacherId: t1.id } })
    const c2 = await prisma.course.upsert({ where: { id: 'c2' }, update: {}, create: { id: 'c2', name: '数学提高班', subject: '数学', price: 2800, duration: 90, teacherId: t2.id } })
    const c3 = await prisma.course.upsert({ where: { id: 'c3' }, update: {}, create: { id: 'c3', name: '英语口语班', subject: '英语', price: 3200, duration: 90, teacherId: t3.id } })
    const c4 = await prisma.course.upsert({ where: { id: 'c4' }, update: {}, create: { id: 'c4', name: '编程Scratch', subject: '编程', price: 4200, duration: 60, teacherId: t4.id } })
    const c5 = await prisma.course.upsert({ where: { id: 'c5' }, update: {}, create: { id: 'c5', name: '美术素描', subject: '美术', price: 2800, duration: 120, teacherId: t5.id } })

    const p1 = await prisma.user.findUnique({ where: { email: 'parent1@test.com' } })
    const p2 = await prisma.user.findUnique({ where: { email: 'parent2@test.com' } })

    await prisma.student.upsert({ where: { id: 's1' }, update: {}, create: { id: 's1', name: '张三', status: 'active', parentId: p1!.id } })
    await prisma.student.upsert({ where: { id: 's2' }, update: {}, create: { id: 's2', name: '李四', status: 'active', parentId: p2!.id } })
    await prisma.student.upsert({ where: { id: 's3' }, update: {}, create: { id: 's3', name: '王五', status: 'active', parentId: p1!.id } })
    await prisma.student.upsert({ where: { id: 's4' }, update: {}, create: { id: 's4', name: '赵六', status: 'active', parentId: p2!.id } })
    await prisma.student.upsert({ where: { id: 's5' }, update: {}, create: { id: 's5', name: '孙七', status: 'active', parentId: p1!.id } })

    return NextResponse.json({
      success: true,
      message: '数据库已初始化',
      accounts: [
        { role: '管理员', email: 'admin@test.com', password: '123456' },
        { role: '家长1', email: 'parent1@test.com', password: '123456', children: '张三, 王五, 孙七' },
        { role: '家长2', email: 'parent2@test.com', password: '123456', children: '李四, 赵六' },
      ]
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
