import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireTeacherPage } from '@/lib/teacher-portal'
import { formatHours } from '@/lib/format'

const cardStyle = {
  background: '#fff',
  border: '1px solid #EEE7E1',
  borderRadius: 10,
  padding: 16,
} as const

export default async function TeacherStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const teacher = await requireTeacherPage()
  const { id } = await params
  const student = await prisma.student.findFirst({
    where: {
      id,
      status: { not: 'INACTIVE' },
      enrollments: {
        some: {
          status: 'ACTIVE',
          group: {
            status: { not: 'ARCHIVED' },
            course: { isActive: true },
            OR: [
              { teacherId: teacher.id },
              { teacherAssignments: { some: { teacherId: teacher.id } } },
            ],
          },
        },
      },
    },
    include: {
      enrollments: {
        where: {
          status: 'ACTIVE',
          group: {
            status: { not: 'ARCHIVED' },
            course: { isActive: true },
            OR: [
              { teacherId: teacher.id },
              { teacherAssignments: { some: { teacherId: teacher.id } } },
            ],
          },
        },
        include: { group: { include: { course: true, teacherAssignments: true } } },
      },
      examPapers: { where: { teacherId: teacher.id, status: { not: 'DELETED' } }, orderBy: { createdAt: 'desc' }, take: 20 },
      performancePosts: { where: { teacherId: teacher.id, deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 20 },
      attendances: {
        where: {
          lesson: {
            group: {
              status: { not: 'ARCHIVED' },
              course: { isActive: true },
              OR: [
                { teacherId: teacher.id },
                { teacherAssignments: { some: { teacherId: teacher.id } } },
              ],
            },
          },
        },
        include: { lesson: { include: { group: { include: { course: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 30,
      },
    },
  })
  if (!student) notFound()

  const remainHours = student.enrollments.reduce((sum, enrollment) => sum + Number(enrollment.remainHours || 0), 0)
  const totalHours = student.enrollments.reduce((sum, enrollment) => sum + Number(enrollment.totalHours || 0), 0)
  const courseNames = [...new Set(student.enrollments.map((enrollment) => enrollment.group.course.name))]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, color: '#1F2329' }}>{student.name}</h2>
          <div style={{ color: '#8d806f', marginTop: 4 }}>{student.grade || '-'} / {student.school || '-'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={`/teacher/classroom-feedback?studentId=${student.id}`} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E8784A', color: '#E8784A' }}>课堂反馈</Link>
          <Link href={`/teacher/performance?studentId=${student.id}`} style={{ padding: '8px 12px', borderRadius: 8, background: '#E8784A', color: '#fff' }}>表现反馈</Link>
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Info label="剩余课时" value={formatHours(remainHours)} />
        <Info label="总课时" value={formatHours(totalHours)} />
        <Info label="状态" value={student.status} />
        <Info label="家长" value={student.parentName || '-'} />
        <Info label="电话" value={student.parentPhone || student.phone || '-'} />
        <Info label="课程" value={courseNames.join('、') || '-'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'start' }}>
        <Section title="试卷记录" empty={!student.examPapers.length}>
          {student.examPapers.map((paper) => (
            <Item key={paper.id} title={paper.title} meta={`${paper.subject} · ${paper.status} · ${paper.imageUrls.length}张`} />
          ))}
        </Section>
        <Section title="表现动态" empty={!student.performancePosts.length}>
          {student.performancePosts.map((post) => (
            <Item key={post.id} title={post.content} meta={`${post.mood} · ${post.createdAt.toLocaleString('zh-CN')}`} />
          ))}
        </Section>
        <Section title="考勤历史" empty={!student.attendances.length}>
          {student.attendances.filter(a => a.lesson).map((attendance) => (
            <Item key={attendance.id} title={`${attendance.status} · ${attendance.lesson!.group.course.name}`} meta={`${attendance.lesson!.lessonDate.toLocaleDateString('zh-CN')} ${attendance.lesson!.startTime}`} />
          ))}
        </Section>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div style={{ color: '#8d806f', fontSize: 12 }}>{label}</div><div style={{ color: '#1F2329', fontWeight: 700, marginTop: 4 }}>{value}</div></div>
}

function Section({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  return <div style={cardStyle}><h3 style={{ marginTop: 0 }}>{title}</h3>{empty ? <div style={{ color: '#8d806f' }}>暂无记录</div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>}</div>
}

function Item({ title, meta }: { title: string; meta: string }) {
  return <div style={{ borderBottom: '1px solid #f0e7de', paddingBottom: 8 }}><div style={{ color: '#1F2329', fontWeight: 600 }}>{title}</div><div style={{ color: '#8d806f', fontSize: 12, marginTop: 4 }}>{meta}</div></div>
}
