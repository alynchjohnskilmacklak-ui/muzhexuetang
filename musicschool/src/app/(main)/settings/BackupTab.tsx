'use client'

import { Card, Button, Typography, message, Popconfirm, Spin } from 'antd'
import { DownloadOutlined, CloudUploadOutlined, FileExcelOutlined, DeleteOutlined, ScanOutlined } from '@ant-design/icons'
import { useState } from 'react'
import useSWR from 'swr'

const { Text, Title } = Typography
const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function BackupTab() {
  const [backingUp, setBackingUp] = useState(false)
  const [exportStudents, setExportStudents] = useState(false)
  const [exportFinance, setExportFinance] = useState(false)
  const [cleaning, setCleaning] = useState(false)

  const { data: cleanupStats, mutate: refreshStats } = useSWR('/api/admin/cleanup', fetcher, { refreshInterval: 0 })

  const handleBackup = async () => {
    setBackingUp(true)
    try {
      const res = await fetch('/api/settings/backup/create', { method: 'POST' })
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click(); URL.revokeObjectURL(url)
      message.success('备份文件已下载')
    } catch { message.error('备份失败') }
    setBackingUp(false)
  }

  const handleExportStudents = async () => {
    setExportStudents(true)
    const res = await fetch('/api/settings/export/students')
    const blob = await res.blob(); const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `学员数据-${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click(); URL.revokeObjectURL(url)
    message.success('学员数据已导出')
    setExportStudents(false)
  }

  const handleExportFinance = async () => {
    setExportFinance(true)
    const res = await fetch('/api/settings/export/finance')
    const blob = await res.blob(); const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `财务报表-${new Date().getFullYear()}.xlsx`
    a.click(); URL.revokeObjectURL(url)
    message.success('财务报表已导出')
    setExportFinance(false)
  }

  const handleCleanup = async () => {
    setCleaning(true)
    const res = await fetch('/api/admin/cleanup', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setCleaning(false)
    if (data.success) {
      const r = data.results
      message.success(`已永久删除: 班级${r.archivedGroups} 排课${r.cancelledSchedules} 课次${r.cancelledLessons} 试卷${r.deletedPapers} 教师${r.resignedTeachers} 学员${r.inactiveStudents}`)
      refreshStats()
    } else {
      message.error('清理失败')
    }
  }

  const total = cleanupStats?.totalSoftDeleted || 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card bordered={false} style={{ borderRadius: 10 }}>
        <Title level={5}><CloudUploadOutlined /> 全量数据备份</Title>
        <Text type="secondary">导出所有学员、教师、课程、缴费、考勤数据为 JSON 文件</Text>
        <div style={{ marginTop: 12 }}>
          <Button type="primary" icon={<CloudUploadOutlined />} loading={backingUp} onClick={handleBackup} style={{ background: '#E8784A' }}>
            执行完整备份
          </Button>
        </div>
      </Card>

      <Card bordered={false} style={{ borderRadius: 10 }}>
        <Title level={5}><FileExcelOutlined /> 导出学员数据</Title>
        <Text type="secondary">包含学员信息、课时余额、缴费记录、报名课程</Text>
        <div style={{ marginTop: 12 }}>
          <Button icon={<DownloadOutlined />} loading={exportStudents} onClick={handleExportStudents}>导出 Excel</Button>
        </div>
      </Card>

      <Card bordered={false} style={{ borderRadius: 10 }}>
        <Title level={5}><FileExcelOutlined /> 导出财务报表</Title>
        <Text type="secondary">包含月度收入汇总、各学员缴费明细</Text>
        <div style={{ marginTop: 12 }}>
          <Button icon={<DownloadOutlined />} loading={exportFinance} onClick={handleExportFinance}>导出 Excel</Button>
        </div>
      </Card>

      {/* Permanent cleanup card */}
      <Card bordered={false} style={{ borderRadius: 10, border: total > 0 ? '1px solid #D4537E' : undefined }}>
        <Title level={5}><DeleteOutlined style={{ color: total > 0 ? '#D4537E' : '#9a8e7a' }} /> 永久删除已废弃数据</Title>
        <Text type="secondary">彻底清除所有已标记删除、已归档、已离职、已离校的记录及关联数据。此操作不可恢复。</Text>
        {cleanupStats ? (
          <div style={{ margin: '12px 0', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {cleanupStats.archivedGroups > 0 && <span style={{ fontSize: 12, color: '#D4537E', background: '#FFF1F0', padding: '2px 8px', borderRadius: 4 }}>已归档班级 {cleanupStats.archivedGroups}</span>}
            {cleanupStats.cancelledSchedules > 0 && <span style={{ fontSize: 12, color: '#D4537E', background: '#FFF1F0', padding: '2px 8px', borderRadius: 4 }}>已取消排课 {cleanupStats.cancelledSchedules}</span>}
            {cleanupStats.cancelledLessons > 0 && <span style={{ fontSize: 12, color: '#D4537E', background: '#FFF1F0', padding: '2px 8px', borderRadius: 4 }}>已取消课次 {cleanupStats.cancelledLessons}</span>}
            {cleanupStats.deletedPapers > 0 && <span style={{ fontSize: 12, color: '#D4537E', background: '#FFF1F0', padding: '2px 8px', borderRadius: 4 }}>已删除试卷 {cleanupStats.deletedPapers}</span>}
            {cleanupStats.resignedTeachers > 0 && <span style={{ fontSize: 12, color: '#D4537E', background: '#FFF1F0', padding: '2px 8px', borderRadius: 4 }}>已离职教师 {cleanupStats.resignedTeachers}</span>}
            {cleanupStats.inactiveStudents > 0 && <span style={{ fontSize: 12, color: '#D4537E', background: '#FFF1F0', padding: '2px 8px', borderRadius: 4 }}>已离校学员 {cleanupStats.inactiveStudents}</span>}
            {cleanupStats.withdrawnEnrollments > 0 && <span style={{ fontSize: 12, color: '#D4537E', background: '#FFF1F0', padding: '2px 8px', borderRadius: 4 }}>已退班记录 {cleanupStats.withdrawnEnrollments}</span>}
            {total === 0 && <span style={{ fontSize: 12, color: '#1D9E75', background: '#F6FFED', padding: '2px 8px', borderRadius: 4 }}>暂无待清理数据</span>}
          </div>
        ) : <div style={{ margin: '8px 0' }}><Spin size="small" /></div>}
        <Popconfirm title="永久删除所有已废弃数据？此操作不可恢复！" onConfirm={handleCleanup} okText="确认删除" cancelText="取消" okButtonProps={{ danger: true }}>
          <Button danger icon={<DeleteOutlined />} loading={cleaning} disabled={total === 0}>
            永久删除 ({total} 条)
          </Button>
        </Popconfirm>
      </Card>
    </div>
  )
}
