'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Alert,
  Button,
  Card,
  Input,
  Progress,
  Radio,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

const { Text } = Typography

export interface StudentEnrollmentRow {
  key: string
  studentId: string
  studentName: string
  gender?: string | null
  grade?: string | null
  school?: string | null
  courseName: string
  courseType?: string | null
  totalHours: number
  usedHours: number
  remainHours: number
  mainTeacherName?: string
  status: string
}

interface StudentHoursTabProps {
  students: any[]
  searchQuery: string
  isMobile: boolean
}

type HourFilterLevel = 'all' | 'urgent' | 'warning' | 'plentiful'

export function StudentHoursTab({
  students,
  searchQuery,
  isMobile,
}: StudentHoursTabProps) {
  const [filterLevel, setFilterLevel] = useState<HourFilterLevel>('all')
  const [localSearch, setLocalSearch] = useState('')

  // 将学生及其 enrollment 扁平化为课时账本行
  const rows: StudentEnrollmentRow[] = useMemo(() => {
    const list: StudentEnrollmentRow[] = []
    for (const student of students) {
      if (student.enrollments && student.enrollments.length > 0) {
        student.enrollments.forEach((enr: any, idx: number) => {
          const total = enr.totalHours ?? student.totalHours ?? 0
          const remain = enr.remainHours ?? student.remainHours ?? 0
          const used = enr.usedHours ?? (total >= remain ? total - remain : 0)
          list.push({
            key: `${student.id}-${enr.id || idx}`,
            studentId: student.id,
            studentName: student.name,
            gender: student.gender,
            grade: student.grade,
            school: student.school,
            courseName: enr.group?.course?.name || enr.group?.name || '综合学科辅导',
            courseType: enr.group?.course?.type || student.courseType,
            totalHours: total,
            usedHours: used,
            remainHours: remain,
            mainTeacherName: student.mainTeacher?.name || '待指定',
            status: student.status,
          })
        })
      } else {
        // 无单独 enrollment 则按 student 主记录
        const total = student.totalHours || 0
        const remain = student.remainHours || 0
        const used = student.taughtHours || (total >= remain ? total - remain : 0)
        list.push({
          key: student.id,
          studentId: student.id,
          studentName: student.name,
          gender: student.gender,
          grade: student.grade,
          school: student.school,
          courseName: '在读综合课时',
          courseType: student.courseType,
          totalHours: total,
          usedHours: used,
          remainHours: remain,
          mainTeacherName: student.mainTeacher?.name || '待指定',
          status: student.status,
        })
      }
    }
    return list
  }, [students])

  // 综合搜索与过滤
  const filteredRows = useMemo(() => {
    const q = (localSearch || searchQuery).trim().toLowerCase()
    return rows.filter((row) => {
      if (q) {
        const matchName = row.studentName.toLowerCase().includes(q)
        const matchCourse = row.courseName.toLowerCase().includes(q)
        const matchTeacher = (row.mainTeacherName || '').toLowerCase().includes(q)
        if (!matchName && !matchCourse && !matchTeacher) return false
      }
      if (filterLevel === 'urgent') return row.remainHours <= 3
      if (filterLevel === 'warning') return row.remainHours > 3 && row.remainHours <= 8
      if (filterLevel === 'plentiful') return row.remainHours > 8
      return true
    })
  }, [rows, searchQuery, localSearch, filterLevel])

  // 统计指标
  const summary = useMemo(() => {
    let totalSigned = 0
    let totalUsed = 0
    let totalRemain = 0
    let urgentCount = 0
    let warningCount = 0

    rows.forEach((r) => {
      totalSigned += r.totalHours
      totalUsed += r.usedHours
      totalRemain += r.remainHours
      if (r.remainHours <= 3) urgentCount++
      else if (r.remainHours <= 8) warningCount++
    })

    return {
      totalCourses: rows.length,
      totalSigned: Number(totalSigned.toFixed(1)),
      totalUsed: Number(totalUsed.toFixed(1)),
      totalRemain: Number(totalRemain.toFixed(1)),
      urgentCount,
      warningCount,
    }
  }, [rows])

  const columns: ColumnsType<StudentEnrollmentRow> = [
    {
      title: '学员姓名',
      dataIndex: 'studentName',
      key: 'studentName',
      width: 140,
      render: (text, record) => (
        <div>
          <Link
            href={`/students/${record.studentId}`}
            style={{ fontWeight: 700, color: '#14574D', fontSize: 14 }}
          >
            {text}
          </Link>
          <div style={{ fontSize: 11, color: '#756A58', marginTop: 2 }}>
            {record.grade || '未分年级'} · {record.school || '校区学员'}
          </div>
        </div>
      ),
    },
    {
      title: '报读课程与班型',
      dataIndex: 'courseName',
      key: 'courseName',
      width: 180,
      render: (text, record) => (
        <div>
          <span style={{ fontWeight: 600, color: '#2B2110', fontSize: 13.5 }}>{text}</span>
          <div style={{ marginTop: 2 }}>
            <Tag color="#14574D" style={{ fontSize: 10.5, margin: 0, padding: '0 5px' }}>
              主教: {record.mainTeacherName}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: '消课进度与储备',
      key: 'progress',
      width: 220,
      render: (_, record) => {
        const percent = record.totalHours > 0
          ? Math.min(100, Math.round((record.usedHours / record.totalHours) * 100))
          : 0
        const isUrgent = record.remainHours <= 3
        const isWarning = record.remainHours > 3 && record.remainHours <= 8
        const strokeColor = isUrgent ? '#E03E2D' : isWarning ? '#D97706' : '#1D9E75'

        return (
          <div style={{ minWidth: 160 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
              <span style={{ color: '#756A58' }}>已消 {record.usedHours} / 总 {record.totalHours} 节</span>
              <span style={{ fontWeight: 700, color: strokeColor }}>
                余 {record.remainHours} 节
              </span>
            </div>
            <Progress
              percent={percent}
              size="small"
              strokeColor={strokeColor}
              trailColor="rgba(20, 87, 77, 0.08)"
              showInfo={false}
            />
          </div>
        )
      },
    },
    {
      title: '课时预警状态',
      key: 'statusTag',
      width: 120,
      render: (_, record) => {
        if (record.remainHours <= 3) {
          return (
            <Tag
              icon={<WarningOutlined />}
              color="error"
              style={{ fontWeight: 700, borderRadius: 6 }}
            >
              告急预警 (≤3节)
            </Tag>
          )
        }
        if (record.remainHours <= 8) {
          return (
            <Tag
              icon={<ClockCircleOutlined />}
              color="warning"
              style={{ fontWeight: 600, borderRadius: 6 }}
            >
              偏低 (≤8节)
            </Tag>
          )
        }
        return (
          <Tag
            icon={<CheckCircleOutlined />}
            color="success"
            style={{ borderRadius: 6 }}
          >
            充裕充足
          </Tag>
        )
      },
    },
    {
      title: '快捷调度',
      key: 'actions',
      width: 130,
      render: (_, record) => (
        <Space size={6}>
          <Link href={`/schedule?studentId=${record.studentId}`}>
            <Button size="small" type="link" style={{ padding: 0, color: '#14574D', fontWeight: 600 }}>
              排课
            </Button>
          </Link>
          <span style={{ color: '#D6B45B' }}>|</span>
          <Link href={`/students/${record.studentId}`}>
            <Button size="small" type="link" style={{ padding: 0, color: '#756A58' }}>
              档案
            </Button>
          </Link>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 顶部统计小盘 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: 10,
        }}
      >
        <div
          style={{
            background: '#FFFDF7',
            border: '1px solid rgba(214, 180, 91, 0.28)',
            padding: '12px 14px',
            borderRadius: 12,
          }}
        >
          <div style={{ color: '#756A58', fontSize: 12 }}>报读科次总计</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#14574D', marginTop: 4 }}>
            {summary.totalCourses} <span style={{ fontSize: 12, fontWeight: 500 }}>门</span>
          </div>
        </div>

        <div
          style={{
            background: '#FFFDF7',
            border: '1px solid rgba(214, 180, 91, 0.28)',
            padding: '12px 14px',
            borderRadius: 12,
          }}
        >
          <div style={{ color: '#756A58', fontSize: 12 }}>剩余总课时储备</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#14574D', marginTop: 4 }}>
            {summary.totalRemain} <span style={{ fontSize: 12, fontWeight: 500 }}>节</span>
          </div>
        </div>

        <div
          style={{
            background: summary.urgentCount > 0 ? '#FFF1F0' : '#FFFDF7',
            border: summary.urgentCount > 0 ? '1px solid rgba(224, 62, 45, 0.3)' : '1px solid rgba(214, 180, 91, 0.28)',
            padding: '12px 14px',
            borderRadius: 12,
            cursor: 'pointer',
          }}
          onClick={() => setFilterLevel(filterLevel === 'urgent' ? 'all' : 'urgent')}
          title="点击仅看课时告急"
        >
          <div style={{ color: summary.urgentCount > 0 ? '#E03E2D' : '#756A58', fontSize: 12, fontWeight: 600 }}>
            课时告急预警 (≤3节)
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: summary.urgentCount > 0 ? '#E03E2D' : '#14574D', marginTop: 4 }}>
            {summary.urgentCount} <span style={{ fontSize: 12, fontWeight: 500 }}>位</span>
          </div>
        </div>

        <div
          style={{
            background: '#FFFDF7',
            border: '1px solid rgba(214, 180, 91, 0.28)',
            padding: '12px 14px',
            borderRadius: 12,
          }}
        >
          <div style={{ color: '#756A58', fontSize: 12 }}>储备偏低 (≤8节)</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#D97706', marginTop: 4 }}>
            {summary.warningCount} <span style={{ fontSize: 12, fontWeight: 500 }}>位</span>
          </div>
        </div>
      </div>

      {/* 快捷过滤条 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          background: '#FFFFFF',
          padding: '10px 14px',
          borderRadius: 12,
          border: '1px solid rgba(58, 50, 39, 0.08)',
        }}
      >
        <Radio.Group
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          buttonStyle="solid"
          size={isMobile ? 'small' : 'middle'}
        >
          <Radio.Button value="all">全部课时 ({rows.length})</Radio.Button>
          <Radio.Button value="urgent">
            <span style={{ color: '#E03E2D', fontWeight: 700 }}>告急 (≤3节: {summary.urgentCount})</span>
          </Radio.Button>
          <Radio.Button value="warning">偏低 (≤8节: {summary.warningCount})</Radio.Button>
          <Radio.Button value="plentiful">充足</Radio.Button>
        </Radio.Group>

        <Input
          placeholder="在课时账本中搜索学员/课程/教师..."
          prefix={<SearchOutlined style={{ color: '#A89C8A' }} />}
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          allowClear
          style={{ width: isMobile ? '100%' : 260, borderRadius: 8 }}
        />
      </div>

      {/* 课时账本表格 */}
      <Card
        styles={{ body: { padding: isMobile ? 8 : 12 } }}
        style={{
          borderRadius: 14,
          border: '1px solid rgba(58, 50, 39, 0.08)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
        }}
      >
        <Table
          columns={columns}
          dataSource={filteredRows}
          pagination={{ pageSize: 15, showTotal: (t) => `共 ${t} 条课时账目` }}
          scroll={{ x: 750 }}
          size="middle"
        />
      </Card>
    </div>
  )
}
