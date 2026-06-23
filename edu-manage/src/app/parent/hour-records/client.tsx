'use client'

import { useMemo, useState } from 'react'
import { Card, Empty, Select, Space, Table, Tag, Typography } from 'antd'
import { ClockCircleOutlined, TeamOutlined } from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'
import { formatHourPair, formatHours } from '@/lib/format'
import { fmtDate } from '@/lib/format-date'

const { Title, Text } = Typography

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  PRESENT: { text: '出勤', color: 'green' },
  LEAVE: { text: '请假', color: 'gold' },
  ABSENT: { text: '旷课', color: 'red' },
  MAKEUP: { text: '补课', color: 'blue' },
  ADJUSTMENT: { text: '管理员调整', color: 'purple' },
}

function recordMeta(record: any) {
  if (record.status === 'ADJUSTMENT') {
    const group = record.enrollment?.group
    return {
      courseName: group?.course?.name || '课时调整',
      teacherName: '管理员调整',
      roomName: group?.room?.name || '-',
      date: record.createdAt,
      time: record.adjustmentReason || '',
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
  }
}

export function ParentHourRecordsClient({ students, records }: { students: any[]; records: any[] }) {
  const isMobile = useIsMobile() ?? false
  const [studentId, setStudentId] = useState(students[0]?.id || '')
  const selectedStudent = students.find((student) => student.id === studentId)
  const filteredRecords = useMemo(
    () => records.filter((record) => !studentId || record.student?.id === studentId),
    [records, studentId]
  )
  const summary = useMemo(() => {
    const enrollments = selectedStudent?.enrollments || []
    const total = enrollments.reduce((sum: number, enrollment: any) => sum + Number(enrollment.totalHours || 0), 0)
    const remain = enrollments.reduce((sum: number, enrollment: any) => sum + Number(enrollment.remainHours || 0), 0)
    const used = enrollments.reduce((sum: number, enrollment: any) => sum + Number(enrollment.usedHours || 0), 0)
    return { total, remain, used }
  }, [selectedStudent])

  return (
    <div className="parent-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-end', marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>课时明细</Title>
          <Text type="secondary">查看每次扣课记录，不包含缴费金额</Text>
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
        {[
          ['当前剩余课时', formatHours(summary.remain), '#1D9E75'],
          ['已用/总课时', formatHourPair(summary.used, summary.total), '#E8784A'],
          ['扣课记录', `${filteredRecords.length}条`, '#534AB7'],
        ].map(([label, value, color]) => (
          <Card key={label} bordered={false} className="parent-card" style={{ borderRadius: 12, border: '1px solid #F0DDD2' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
            <div style={{ color, fontSize: 24, fontWeight: 800, marginTop: 4, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{value}</div>
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
                  <span>扣课：{formatHours(record.hoursDeducted)}课时</span>
                </div>
              </Card>
            )
          })}
          {!filteredRecords.length && <Empty description="暂无扣课记录" />}
        </div>
      ) : (
        <Card bordered={false} className="parent-card" style={{ borderRadius: 12, border: '1px solid #F0DDD2' }}>
          <Table
            rowKey="id"
            dataSource={filteredRecords}
            pagination={{ pageSize: 12 }}
            scroll={{ x: 640 }}
            locale={{ emptyText: '暂无扣课记录' }}
            columns={[
              { title: '日期', key: 'date', render: (_: unknown, record: any) => fmtDate(recordMeta(record).date) },
              { title: '课程', key: 'course', render: (_: unknown, record: any) => recordMeta(record).courseName },
              { title: '老师', key: 'teacher', render: (_: unknown, record: any) => recordMeta(record).teacherName },
              { title: '状态', dataIndex: 'status', render: (value: string) => <Tag color={(STATUS_LABEL[value] || {}).color}>{STATUS_LABEL[value]?.text || value}</Tag> },
              { title: '扣除课时', dataIndex: 'hoursDeducted', render: (value: number) => <Text strong>{formatHours(value)}</Text> },
            ]}
          />
        </Card>
      )}

      <Card bordered={false} style={{ marginTop: 12, borderRadius: 12, background: '#FFFBF7', border: '1px solid #F0DDD2' }}>
        <Space direction="vertical" size={4}>
          <Text strong>说明</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>小班课请假、出勤和旷课会按系统规则扣课时；补课记录不重复扣原课时。</Text>
        </Space>
      </Card>
    </div>
  )
}
