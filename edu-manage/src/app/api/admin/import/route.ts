import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'
import { auth } from '@/lib/auth'
import { getRequestDivision } from '@/lib/division'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

interface ImportRow {
  name: string
  role?: string
  phone?: string
  grade?: string
  school?: string
  gender?: string
  parentName?: string
  parentPhone?: string
  subjects?: string
  employmentType?: string
}

function parseCsvToRows(csv: string): ImportRow[] {
  // Split by line, handle CRLF/LF
  const lines = csv
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  if (lines.length < 2) throw new Error('CSV 至少需要表头和数据行')
  const [headerLine, ...dataLines] = lines

  const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''))
  return dataLines.map((line, idx) => {
    const values = line.split(',').map(v => v.trim().replace(/^"(.*)"$/s, '$1'))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] || '' })
    const importRow: ImportRow = {
      name: row['姓名'] || row['name'] || '',
      role: row['角色'] || row['role'] || 'student',
      phone: row['手机号'] || row['phone'] || '',
      grade: row['年级'] || row['grade'] || '',
      school: row['学校'] || row['school'] || '',
      gender: row['性别'] || row['gender'] || '',
      parentName: row['家长姓名'] || row['parentName'] || '',
      parentPhone: row['家长手机'] || row['parentPhone'] || '',
      subjects: row['科目'] || row['subjects'] || '',
      employmentType: row['聘用类型'] || row['employmentType'] || 'FULL_TIME',
    }
    if (!importRow.name) throw new Error(`第${idx + 2}行缺少姓名`)
    return importRow
  })
}

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
  }

  const division = getRequestDivision(session.user as Record<string, unknown> | undefined)
  const prisma = await getRequestPrisma()

  const body = await req.json()
  const { type, csv } = body as { type: string; csv: string }

  if (!type || !csv) {
    return NextResponse.json({ error: '缺少 type 或 csv 参数' }, { status: 400 })
  }
  if (!['student', 'teacher'].includes(type)) {
    return NextResponse.json({ error: 'type 必须是 student 或 teacher' }, { status: 400 })
  }

  const rows = parseCsvToRows(csv)

  if (type === 'student') {
    const results: Array<{ name: string; status: string; error?: string }> = []
    const defaultPassword = await bcrypt.hash('123456', 12)

    for (const row of rows) {
      try {
        // Check if parent user exists
        let parentUserId: string | null = null
        if (row.parentPhone) {
          const parentEmail = `parent_${row.parentPhone}@parent.com`
          let parentUser = await prisma.user.findUnique({ where: { email: parentEmail } })
          if (!parentUser) {
            parentUser = await prisma.user.create({
              data: {
                email: parentEmail,
                password: defaultPassword,
                name: row.parentName || row.name + '家长',
                role: 'parent',
                division,
              },
            })
          }
          parentUserId = parentUser.id
        }

        await prisma.student.create({
          data: {
            name: row.name,
            grade: row.grade || null,
            school: row.school || null,
            gender: row.gender || null,
            phone: row.phone || null,
            parentName: row.parentName || null,
            parentPhone: row.parentPhone || null,
            parentUserId,
            division,
          },
        })
        results.push({ name: row.name, status: 'created' })
      } catch (e) {
        results.push({ name: row.name, status: 'failed', error: e instanceof Error ? e.message : '未知错误' })
      }
    }
    return NextResponse.json({ imported: results.length, results })
  }

  // type === 'teacher'
  const results: Array<{ name: string; status: string; error?: string }> = []
  const defaultPassword = await bcrypt.hash('123456', 12)

  for (const row of rows) {
    try {
      const phone = row.phone || ''
      const email = `${phone}@tea.com`

      const existingTeacher = phone ? await prisma.teacher.findUnique({ where: { phone } }) : null
      if (existingTeacher) {
        results.push({ name: row.name, status: 'skipped', error: '手机号已存在' })
        continue
      }

      const teacher = await prisma.teacher.create({
        data: {
          name: row.name,
          phone,
          gender: row.gender || null,
          subjects: row.subjects || '[]',
          employmentType: row.employmentType || 'FULL_TIME',
          division,
        },
      })

      // Create user account
      await prisma.user.create({
        data: {
          email,
          password: defaultPassword,
          name: row.name,
          role: 'teacher',
          teacherId: teacher.id,
          division,
        },
      })

      results.push({ name: row.name, status: 'created' })
    } catch (e) {
      results.push({ name: row.name, status: 'failed', error: e instanceof Error ? e.message : '未知错误' })
    }
  }

  return NextResponse.json({ imported: results.length, results })
})
