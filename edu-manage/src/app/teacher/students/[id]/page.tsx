import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireTeacherPage } from '@/lib/teacher-portal'
import { formatHours } from '@/lib/format'
import { fmtDate } from '@/lib/format-date'

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
    <div style={{ padding: '0 0 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1F2329', fontSize: 22 }}>{student.name}</h2>
          <div style={{ color: '#8d806f', marginTop: 4, fontSize: 13 }}>
            {student.grade || '未设年级'} / {student.gender === 'male' || student.gender === 'MALE' ? '男' : student.gender === 'female' || student.gender === 'FEMALE' ? '女' : '-'} / {student.school || '-'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Link href={`/teacher/classroom-feedback?studentId=${student.id}`} style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid #E8784A', color: '#E8784A', fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            课堂反馈
          </Link>
          <Link href={`/teacher/performance?studentId=${student.id}`} style={{ padding: '7px 14px', borderRadius: 8, background: '#E8784A', color: '#fff', fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            表现反馈
          </Link>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #EEE7E1', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 14 }}>
          <MetricCell label="剩余课时" value={formatHours(remainHours)} color={remainHours <= 2 ? '#D4537E' : remainHours <= 10 ? '#f5a623' : '#1F2329'} />
          <MetricCell label="总课时" value={formatHours(totalHours)} />
          <MetricCell
            label="状态"
            value={
              student.status === 'ACTIVE' ? '在读'
                : student.status === 'COMPLETED' ? '已结课'
                  : student.status === 'TRIAL' ? '试听'
                    : student.status
            }
            color={student.status === 'ACTIVE' ? '#1D9E75' : '#8d806f'}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          <MetricCell label="家长" value={student.parentName || '-'} small />
          <MetricCell label="联系电话" value={student.parentPhone || student.phone || '-'} small />
          <MetricCell label="在读课程" value={String(courseNames.length)} small />
        </div>
        {courseNames.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {courseNames.map((name, index) => (
              <span key={`${name}-${index}`} style={{ fontSize: 12, padding: '2px 10px', borderRadius: 9999, background: '#FFF3EC', color: '#E8784A', border: '1px solid #f5c9b3' }}>
                {name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #EEE7E1', borderRadius: 12, padding: 16 }}>
          <SectionHeader title="试卷记录" count={student.examPapers.length} />
          {!student.examPapers.length ? (
            <div style={{ color: '#98A2B3', fontSize: 13, padding: '8px 0' }}>暂无试卷</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {student.examPapers.map((paper) => (
                <div key={paper.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#FCFBF9', borderRadius: 8, gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1F2329' }}>{paper.title}</div>
                    <div style={{ fontSize: 12, color: '#8d806f', marginTop: 2 }}>
                      {paper.subject} · {paper.imageUrls.length}张图片
                    </div>
                  </div>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, background: paper.status === 'PUBLISHED' ? '#f0fdf4' : '#fff7ed', color: paper.status === 'PUBLISHED' ? '#1D9E75' : '#f5a623', border: `1px solid ${paper.status === 'PUBLISHED' ? '#d1fae5' : '#fed7aa'}`, whiteSpace: 'nowrap' }}>
                    {paper.status === 'PUBLISHED' ? '已发布' : '草稿'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: '#fff', border: '1px solid #EEE7E1', borderRadius: 12, padding: 16 }}>
          <SectionHeader title="表现动态" count={student.performancePosts.length} />
          {!student.performancePosts.length ? (
            <div style={{ color: '#98A2B3', fontSize: 13, padding: '8px 0' }}>暂无表现记录</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {student.performancePosts.map((post) => {
                const moodMap: Record<string, string> = { GREAT: '非常好', GOOD: '好', NORMAL: '一般', BAD: '较差' }
                return (
                  <div key={post.id} style={{ padding: '8px 10px', background: '#FCFBF9', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#E8784A' }}>
                        {moodMap[post.mood] || post.mood}
                      </span>
                      <span style={{ fontSize: 11, color: '#98A2B3' }}>
                        {fmtDate(post.createdAt)}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#1F2329', lineHeight: 1.5 }}>{post.content}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ background: '#fff', border: '1px solid #EEE7E1', borderRadius: 12, padding: 16 }}>
          <SectionHeader title="考勤历史" count={student.attendances.length} />
          {!student.attendances.length ? (
            <div style={{ color: '#98A2B3', fontSize: 13, padding: '8px 0' }}>暂无考勤记录</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
              {student.attendances.filter((attendance) => attendance.lesson).map((attendance) => {
                const statusMap: Record<string, { label: string; color: string; bg: string }> = {
                  PRESENT: { label: '出勤', color: '#1D9E75', bg: '#f0fdf4' },
                  LEAVE: { label: '请假', color: '#f5a623', bg: '#fff7ed' },
                  ABSENT: { label: '旷课', color: '#D4537E', bg: '#fdf2f8' },
                  MAKEUP: { label: '补课', color: '#8b5cf6', bg: '#f5f3ff' },
                }
                const status = statusMap[attendance.status] || { label: attendance.status, color: '#8d806f', bg: '#fafafa' }
                return (
                  <div key={attendance.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: '#FCFBF9', borderRadius: 8, gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: '#1F2329', fontWeight: 500 }}>
                        {attendance.lesson!.group.course.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#8d806f', marginTop: 2 }}>
                        {fmtDate(attendance.lesson!.lessonDate)} {attendance.lesson!.startTime}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 9999, background: status.bg, color: status.color, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {status.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCell({ label, value, color, small }: { label: string; value: string; color?: string; small?: boolean }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, color: '#98A2B3', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: small ? 14 : 20, fontWeight: small ? 500 : 700, color: color || '#1F2329', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </div>
    </div>
  )
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontWeight: 700, fontSize: 14, color: '#1F2329' }}>{title}</span>
      <span style={{ fontSize: 12, color: '#98A2B3', background: '#f5f2ee', padding: '1px 7px', borderRadius: 9999 }}>{count}</span>
    </div>
  )
}
