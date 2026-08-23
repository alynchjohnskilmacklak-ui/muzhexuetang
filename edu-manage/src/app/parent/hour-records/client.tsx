'use client'

import { useMemo, useState } from 'react'
import { Card, Select, Space, Table, Tag, Typography } from 'antd'
import { ClockCircleOutlined, TeamOutlined } from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'
import { fmtDate } from '@/lib/format-date'
import { formatDeducted, formatRemaining } from '@/lib/lesson-units'
import { GuidedEmpty } from '@/components/Common/GuidedEmpty'
import { useRouter } from 'next/navigation'

const { Title, Text } = Typography

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  PRESENT: { text: '出勤', color: 'green' },
  LEAVE: { text: '请假', color: 'gold' },
  ABSENT: { text: '旷课', color: 'red' },
  MAKEUP: { text: '补课', color: 'blue' },
  ADJUSTMENT: { text: '管理员调整', color: 'purple' },
}
type CourseRef = { name?: string | null; type?: string | null }
type GroupRef = { name?: string | null; intensiveMode?: string | null; lessonMinutes?: number | null; course?: CourseRef | null; teacher?: { name?: string | null } | null; room?: { name?: string | null } | null }
type Enrollment = { remainHours?: number | null; totalHours?: number | null; group?: GroupRef | null }
type HourRecord = {
  id: string
  status: string
  createdAt: string
  hoursDeducted?: number | null
  adjustmentReason?: string | null
  isIntensiveApproved?: boolean
  approvedTeachingHours?: number | null
  student?: { id: string; name: string } | null
  enrollment?: Enrollment | null
  lesson?: { lessonDate?: string | null; startTime?: string | null; endTime?: string | null; group?: GroupRef | null; teacher?: { name?: string | null } | null } | null
  schedule?: { startTime: string; endTime: string; duration?: number | null; course?: CourseRef | null; teacher?: { name?: string | null } | null; room?: { name?: string | null } | null } | null
}
type StudentWithEnrollments = { id: string; name: string; enrollments?: Enrollment[] }

function recordMeta(record: HourRecord) {
  if (record.status === 'ADJUSTMENT') {
    const group = record.enrollment?.group
    return {
      courseName: group?.course?.name || '课时调整',
      teacherName: '管理员调整',
      roomName: group?.room?.name || '-',
      date: record.createdAt,
      time: record.adjustmentReason || '',
      courseType: group?.course?.type || null,
      lessonMinutes: Number(group?.lessonMinutes || 40),
    }
  }
  const lesson = record.lesson
  const schedule = record.schedule
  return {
    courseName: lesson?.group?.course?.name || schedule?.course?.name || '课程',
    teacherName: lesson?.teacher?.name || lesson?.group?.teacher?.name || schedule?.teacher?.name || '-',
    roomName: lesson?.group?.room?.name || schedule?.room?.name || '-',
    date: lesson?.lessonDate || schedule?.startTime || record.createdAt,
    time: lesson ? `${lesson.startTime}-${lesson.endTime}` : schedule ? `${new Date(schedule.startTime).toTimeString().slice(0, 5)}-${new Date(schedule.endTime).toTimeString().slice(0, 5)}` : '',
    courseType: lesson?.group?.course?.type || schedule?.course?.type || null,
    lessonMinutes: Number(lesson?.group?.lessonMinutes || schedule?.duration || 40),
  }
}

function enrollmentLine(enrollment: Enrollment) {
  const group = enrollment.group
  if (group?.intensiveMode === 'INTENSIVE') return null
  const name = group?.course?.name || group?.name || '课程'
  const remain = formatRemaining(Number(enrollment.remainHours || 0), group?.course?.type || null, Number(group?.lessonMinutes || 40)).text
  const total = formatRemaining(Number(enrollment.totalHours || 0), group?.course?.type || null, Number(group?.lessonMinutes || 40)).text
  return `${name}：${remain} / ${total}`
}

export function ParentHourRecordsClient({ students, records }: { students: StudentWithEnrollments[]; records: HourRecord[] }) {
  const router = useRouter()
  const isMobile = useIsMobile() ?? false
  const [studentId, setStudentId] = useState(students[0]?.id || '')
  const selectedStudent = students.find((student) => student.id === studentId)
  const filteredRecords = useMemo(
    () => records.filter((record) => !studentId || record.student?.id === studentId),
    [records, studentId]
  )
  const summary = useMemo(() => {
    const enrollments = selectedStudent?.enrollments || []
    const prepaidLines = enrollments.map(enrollmentLine).filter(Boolean) as string[]
    const intensive = new Map<string, number>()
    filteredRecords.filter((record) => record.isIntensiveApproved).forEach((record) => {
      const meta = recordMeta(record)
      const key = `${meta.courseName} · ${meta.teacherName}`
      intensive.set(key, (intensive.get(key) || 0) + Number(record.approvedTeachingHours || 0))
    })
    const intensiveLines = [...intensive.entries()].map(([label, hours]) => `${label}：已审核 ${hours.toFixed(2)} 小时`)
    return { lines: [...prepaidLines, ...intensiveLines] }
  }, [filteredRecords, selectedStudent])

  return (
    <div className="parent-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-end', marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>课时明细</Title>
          <Text type="secondary">小班课显示扣课流水，个性化课程显示管理员审核通过的实际授课</Text>
        </div>
        <Select
          value={studentId || undefined}
          style={{ width: isMobile ? '100%' : 180 }}
          getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
          onChange={(value) => setStudentId(value)}
          options={students.map((student) => ({ label: student.name, value: student.id }))}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {([
          { label: '当前课时', value: summary.lines.length ? summary.lines : ['暂无课程'], color: '#1D9E75' },
          { label: '课程数', value: `${summary.lines.length}门`, color: '#E8784A' },
          { label: '课时记录', value: `${filteredRecords.length}条`, color: '#534AB7' },
        ] as Array<{ label: string; value: string | string[]; color: string }>).map(({ label, value, color }) => (
          <Card key={label} bordered={false} className="parent-card" style={{ borderRadius: 12, border: '1px solid #F0DDD2' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
            {Array.isArray(value) ? (
              <div style={{ color, fontSize: 13, fontWeight: 700, marginTop: 4, display: 'grid', gap: 3 }}>
                {value.map((line) => <span key={line}>{line}</span>)}
              </div>
            ) : (
              <div style={{ color, fontSize: 24, fontWeight: 800, marginTop: 4, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{value}</div>
            )}
          </Card>
        ))}
      </div>

      {isMobile ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {filteredRecords.map((record) => {
            const meta = recordMeta(record)
            const status = STATUS_LABEL[record.status] || { text: record.status, color: 'default' }
            return (
              <Card key={record.id} bordered={false} className="parent-card" style={{ borderRadius: 12, border: '1px solid #F0DDD2' }} styles={{ body: { padding: 14 } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <Text strong>{fmtDate(meta.date)} {meta.courseName}</Text>
                  <Tag color={status.color}>{status.text}</Tag>
                </div>
                <div style={{ display: 'grid', gap: 5, color: '#5a4e3a', fontSize: 13 }}>
                  <span><ClockCircleOutlined /> {meta.time || '时间待确认'}</span>
                  <span><TeamOutlined /> 老师：{meta.teacherName}</span>
                  <span>教室：{meta.roomName}</span>
                  <span>{record.isIntensiveApproved
                    ? `计入授课：${Number(record.approvedTeachingHours || 0).toFixed(2)} 小时`
                    : `扣课：${formatDeducted(Number(record.hoursDeducted || 0), meta.courseType, meta.lessonMinutes)}`}</span>
                </div>
              </Card>
            )
          })}
          {!filteredRecords.length && <GuidedEmpty title="还没有课时记录" description="已经确认的上课与课时变动会显示在这里，方便你核对孩子的课程消耗。" actionLabel="看看课程表" onAction={() => router.push('/parent/schedule')} compact />}
        </div>
      ) : (
        <Card bordered={false} className="parent-card" style={{ borderRadius: 12, border: '1px solid #F0DDD2' }}>
          <Table
            rowKey="id"
            dataSource={filteredRecords}
            pagination={{ pageSize: 12 }}
            scroll={{ x: 640 }}
            locale={{ emptyText: <GuidedEmpty title="还没有课时记录" description="已经确认的上课与课时变动会显示在这里，方便你核对孩子的课程消耗。" actionLabel="看看课程表" onAction={() => router.push('/parent/schedule')} compact /> }}
            columns={[
              { title: '日期', key: 'date', render: (_: unknown, record) => fmtDate(recordMeta(record).date) },
              { title: '课程', key: 'course', render: (_: unknown, record) => recordMeta(record).courseName },
              { title: '老师', key: 'teacher', render: (_: unknown, record) => recordMeta(record).teacherName },
              { title: '状态', dataIndex: 'status', render: (value: string) => <Tag color={(STATUS_LABEL[value] || {}).color}>{STATUS_LABEL[value]?.text || value}</Tag> },
              { title: '计入课时', key: 'hoursDeducted', render: (_: unknown, record) => {
                const meta = recordMeta(record)
                return <Text strong>{record.isIntensiveApproved
                  ? `${Number(record.approvedTeachingHours || 0).toFixed(2)} 小时`
                  : formatDeducted(Number(record.hoursDeducted || 0), meta.courseType, meta.lessonMinutes)}</Text>
              } },
            ]}
          />
        </Card>
      )}

      <Card bordered={false} style={{ marginTop: 12, borderRadius: 12, background: '#FFFBF7', border: '1px solid #F0DDD2' }}>
        <Space direction="vertical" size={4}>
          <Text strong>说明</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>小班课按余额扣课；一对一/二/三按管理员审核通过的实际授课分钟累计，不再显示无意义的 0/0 余额。</Text>
        </Space>
      </Card>
    </div>
  )
}
