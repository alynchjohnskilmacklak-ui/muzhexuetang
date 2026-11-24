'use client'

import React, { useMemo, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import {
  Alert,
  Card,
  DatePicker,
  Input,
  Radio,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

const { Text } = Typography

export interface AttendanceRecordItem {
  key: string
  lessonId: string
  lessonDate: string
  studentId: string
  studentName: string
  courseName: string
  subject?: string
  status: 'PRESENT' | 'LATE' | 'LEAVE' | 'ABSENT' | string
  hours: number
}

interface StudentAttendanceTabProps {
  searchQuery: string
  division: string
  isMobile: boolean
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('消课流水加载失败')
  return res.json()
}

export function StudentAttendanceTab({
  searchQuery,
  division,
  isMobile,
}: StudentAttendanceTabProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(dayjs().format('YYYY-MM'))
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [localSearch, setLocalSearch] = useState('')

  const apiUrl = `/api/attendance/history?month=${selectedMonth}&division=${division}`
  const { data, error, isLoading, isValidating } = useSWR<{ lessons: any[] }>(
    apiUrl,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  // 展开并扁平化每堂课的学员考勤消课流水
  const flattenedRecords: AttendanceRecordItem[] = useMemo(() => {
    if (!data?.lessons || !Array.isArray(data.lessons)) return []
    const list: AttendanceRecordItem[] = []

    for (const lesson of data.lessons) {
      const courseName = lesson.group?.name || '综合课程'
      const subject = lesson.group?.course?.subject || ''
      const lessonDate = dayjs(lesson.lessonDate).format('YYYY-MM-DD HH:mm')

      if (Array.isArray(lesson.attendances)) {
        for (const att of lesson.attendances) {
          if (!att.student) continue
          list.push({
            key: `${lesson.id}-${att.id || att.student.id}`,
            lessonId: lesson.id,
            lessonDate,
            studentId: att.student.id,
            studentName: att.student.name,
            courseName,
            subject,
            status: att.status || 'PRESENT',
            hours: att.hours || 1,
          })
        }
      }
    }
    return list
  }, [data?.lessons])

  // 搜索与状态过滤
  const filteredRecords = useMemo(() => {
    const q = (localSearch || searchQuery).trim().toLowerCase()
    return flattenedRecords.filter((rec) => {
      if (q) {
        const matchName = rec.studentName.toLowerCase().includes(q)
        const matchCourse = rec.courseName.toLowerCase().includes(q)
        if (!matchName && !matchCourse) return false
      }
      if (statusFilter !== 'all' && rec.status !== statusFilter) {
        return false
      }
      return true
    })
  }, [flattenedRecords, localSearch, searchQuery, statusFilter])

  // 统计指标计算
  const stats = useMemo(() => {
    let presentCount = 0
    let lateCount = 0
    let leaveCount = 0
    let absentCount = 0
    let totalDeductedHours = 0

    flattenedRecords.forEach((r) => {
      totalDeductedHours += r.hours
      if (r.status === 'PRESENT') presentCount++
      else if (r.status === 'LATE') lateCount++
      else if (r.status === 'LEAVE') leaveCount++
      else if (r.status === 'ABSENT') absentCount++
    })

    const totalStudents = flattenedRecords.length
    const attendanceRate = totalStudents > 0
      ? Math.round(((presentCount + lateCount) / totalStudents) * 100)
      : 100

    return {
      totalCount: totalStudents,
      totalHours: Number(totalDeductedHours.toFixed(1)),
      attendanceRate,
      leaveCount,
      absentCount,
    }
  }, [flattenedRecords])

  const columns: ColumnsType<AttendanceRecordItem> = [
    {
      title: '上课时间',
      dataIndex: 'lessonDate',
      key: 'lessonDate',
      width: 150,
      render: (text) => (
        <span style={{ fontSize: 13, color: '#4A4033', fontVariantNumeric: 'tabular-nums' }}>
          {text}
        </span>
      ),
    },
    {
      title: '学员姓名',
      dataIndex: 'studentName',
      key: 'studentName',
      width: 140,
      render: (text, record) => (
        <Link
          href={`/students/${record.studentId}`}
          style={{ fontWeight: 700, color: '#14574D', fontSize: 13.5 }}
        >
          {text}
        </Link>
      ),
    },
    {
      title: '课程与班级',
      dataIndex: 'courseName',
      key: 'courseName',
      width: 180,
      render: (text, record) => (
        <div>
          <span style={{ fontWeight: 600, color: '#2B2110', fontSize: 13.5 }}>{text}</span>
          {record.subject && (
            <Tag color="#FAF6EE" style={{ color: '#14574D', border: '1px solid rgba(20,87,77,0.2)', marginLeft: 6, fontSize: 10.5 }}>
              {record.subject}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: '消课扣减',
      dataIndex: 'hours',
      key: 'hours',
      width: 100,
      render: (hours) => (
        <span style={{ fontWeight: 700, color: '#14574D', fontSize: 13.5 }}>
          {hours} 节
        </span>
      ),
    },
    {
      title: '出勤状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        switch (status) {
          case 'PRESENT':
            return <Tag color="success" icon={<CheckCircleOutlined />}>正常出勤</Tag>
          case 'LATE':
            return <Tag color="warning" icon={<ClockCircleOutlined />}>迟到进入</Tag>
          case 'LEAVE':
            return <Tag color="processing" icon={<UserOutlined />}>请假缺席</Tag>
          case 'ABSENT':
            return <Tag color="error" icon={<CloseCircleOutlined />}>旷课缺席</Tag>
          default:
            return <Tag>已履约</Tag>
        }
      },
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 顶部统计卡片 */}
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
          <div style={{ color: '#756A58', fontSize: 12 }}>本月消课总人次</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#14574D', marginTop: 4 }}>
            {stats.totalCount} <span style={{ fontSize: 12, fontWeight: 500 }}>人次</span>
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
          <div style={{ color: '#756A58', fontSize: 12 }}>累计消耗学时</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#14574D', marginTop: 4 }}>
            {stats.totalHours} <span style={{ fontSize: 12, fontWeight: 500 }}>节</span>
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
          <div style={{ color: '#756A58', fontSize: 12 }}>综合出勤履约率</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1D9E75', marginTop: 4 }}>
            {stats.attendanceRate}%
          </div>
        </div>

        <div
          style={{
            background: stats.leaveCount > 0 ? '#FFFBEB' : '#FFFDF7',
            border: '1px solid rgba(214, 180, 91, 0.28)',
            padding: '12px 14px',
            borderRadius: 12,
          }}
        >
          <div style={{ color: '#756A58', fontSize: 12 }}>请假 / 缺勤记录</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#D97706', marginTop: 4 }}>
            {stats.leaveCount + stats.absentCount} <span style={{ fontSize: 12, fontWeight: 500 }}>次</span>
          </div>
        </div>
      </div>

      {/* 筛选与搜索 */}
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
        <Space size={10} wrap>
          <DatePicker
            picker="month"
            value={dayjs(selectedMonth, 'YYYY-MM')}
            onChange={(val) => {
              if (val) setSelectedMonth(val.format('YYYY-MM'))
            }}
            allowClear={false}
            style={{ borderRadius: 8 }}
          />

          <Radio.Group
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            size={isMobile ? 'small' : 'middle'}
          >
            <Radio.Button value="all">全部出勤</Radio.Button>
            <Radio.Button value="PRESENT">正常出勤</Radio.Button>
            <Radio.Button value="LEAVE">请假</Radio.Button>
            <Radio.Button value="LATE">迟到</Radio.Button>
            <Radio.Button value="ABSENT">旷课</Radio.Button>
          </Radio.Group>
        </Space>

        <Input
          placeholder="搜索消课学员或课程..."
          prefix={<SearchOutlined style={{ color: '#A89C8A' }} />}
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          allowClear
          style={{ width: isMobile ? '100%' : 240, borderRadius: 8 }}
        />
      </div>

      {/* 消课流水明细表格 */}
      <Card
        styles={{ body: { padding: isMobile ? 8 : 12 } }}
        style={{
          borderRadius: 14,
          border: '1px solid rgba(58, 50, 39, 0.08)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
        }}
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin tip="正在载入消课流水..." />
          </div>
        ) : error ? (
          <Alert
            type="error"
            message="流水记录加载失败"
            description="请检查网络连接或稍后刷新重试"
            showIcon
          />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredRecords}
            pagination={{ pageSize: 15, showTotal: (t) => `共 ${t} 条消课记录` }}
            scroll={{ x: 700 }}
            size="middle"
          />
        )}
      </Card>
    </div>
  )
}
