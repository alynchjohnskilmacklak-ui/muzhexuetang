import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { chineseToPinyin } from '@/lib/pinyin'

export const dynamic = 'force-dynamic'

function unauthorizedSetup() {
  return NextResponse.json({ error: 'Invalid setup token' }, { status: 403 })
}

function setupTokenFromRequest(request: NextRequest) {
  return request.nextUrl.searchParams.get('token') || request.headers.get('x-setup-token') || ''
}

function teacherInitialPassword(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 6) throw new Error(`Teacher phone is invalid: ${phone}`)
  return digits.slice(-6)
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Setup is disabled in production' }, { status: 404 })
  }

  const setupToken = process.env.SETUP_TOKEN
  if (!setupToken) {
    return NextResponse.json({ error: 'Setup token is not configured' }, { status: 404 })
  }

  if (setupTokenFromRequest(request) !== setupToken) {
    return unauthorizedSetup()
  }

  try {
    const parentHash = await bcrypt.hash('123456', 10)

    await prisma.user.upsert({ where: { email: 'parent1@test.com' }, update: {}, create: { email: 'parent1@test.com', password: parentHash, name: '家长1', role: 'parent' } })
    await prisma.user.upsert({ where: { email: 'parent2@test.com' }, update: {}, create: { email: 'parent2@test.com', password: parentHash, name: '家长2', role: 'parent' } })

    const teachers = await Promise.all([
      prisma.teacher.upsert({ where: { id: 't1' }, update: {}, create: { id: 't1', name: '王老师', phone: '13800001001', subjects: '音乐' } }),
      prisma.teacher.upsert({ where: { id: 't2' }, update: {}, create: { id: 't2', name: '李老师', phone: '13800001002', subjects: '数学' } }),
      prisma.teacher.upsert({ where: { id: 't3' }, update: {}, create: { id: 't3', name: '张老师', phone: '13800001003', subjects: '英语' } }),
      prisma.teacher.upsert({ where: { id: 't4' }, update: {}, create: { id: 't4', name: '赵老师', phone: '13800001004', subjects: '编程' } }),
      prisma.teacher.upsert({ where: { id: 't5' }, update: {}, create: { id: 't5', name: '陈老师', phone: '13800001005', subjects: '美术' } }),
    ])

    for (const teacher of teachers) {
      const email = `${chineseToPinyin(teacher.name)}@tea.com`
      const hash = await bcrypt.hash(teacherInitialPassword(teacher.phone), 10)
      await prisma.user.upsert({
        where: { email },
        update: { name: teacher.name, role: 'teacher' },
        create: { email, password: hash, name: teacher.name, role: 'teacher' },
      })
    }

    const [t1, t2, t3, t4, t5] = teachers

    await prisma.course.upsert({ where: { id: 'c1' }, update: {}, create: { id: 'c1', name: '钢琴基础班', subject: '音乐', pricePerLesson: 3800, lessonMinutes: 90, teacherId: t1.id } })
    await prisma.course.upsert({ where: { id: 'c2' }, update: {}, create: { id: 'c2', name: '数学提高班', subject: '数学', pricePerLesson: 2800, lessonMinutes: 90, teacherId: t2.id } })
    await prisma.course.upsert({ where: { id: 'c3' }, update: {}, create: { id: 'c3', name: '英语口语班', subject: '英语', pricePerLesson: 3200, lessonMinutes: 90, teacherId: t3.id } })
    await prisma.course.upsert({ where: { id: 'c4' }, update: {}, create: { id: 'c4', name: '编程Scratch', subject: '编程', pricePerLesson: 4200, lessonMinutes: 60, teacherId: t4.id } })
    await prisma.course.upsert({ where: { id: 'c5' }, update: {}, create: { id: 'c5', name: '美术素描', subject: '美术', pricePerLesson: 2800, lessonMinutes: 120, teacherId: t5.id } })

    const p1 = await prisma.user.findUnique({ where: { email: 'parent1@test.com' } })
    const p2 = await prisma.user.findUnique({ where: { email: 'parent2@test.com' } })

    await prisma.student.upsert({ where: { id: 's1' }, update: {}, create: { id: 's1', name: '张三', status: 'active', parentId: p1!.id } })
    await prisma.student.upsert({ where: { id: 's2' }, update: {}, create: { id: 's2', name: '李四', status: 'active', parentId: p2!.id } })
    await prisma.student.upsert({ where: { id: 's3' }, update: {}, create: { id: 's3', name: '王五', status: 'active', parentId: p1!.id } })
    await prisma.student.upsert({ where: { id: 's4' }, update: {}, create: { id: 's4', name: '赵六', status: 'active', parentId: p2!.id } })
    await prisma.student.upsert({ where: { id: 's5' }, update: {}, create: { id: 's5', name: '孙七', status: 'active', parentId: p1!.id } })

    return NextResponse.json({
      success: true,
      message: 'Setup completed',
      usersCreated: {
        parents: 2,
        teachers: teachers.length,
      },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
