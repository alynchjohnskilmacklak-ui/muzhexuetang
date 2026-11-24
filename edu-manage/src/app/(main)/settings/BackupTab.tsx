'use client'
import { Alert, Button, Card, Radio, Space, Typography, message } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { fetchJson } from '@/lib/fetch-json'

export function BackupTab() {
  const [busy, setBusy] = useState('')
  const [studentExportScope, setStudentExportScope] = useState<'current' | 'all'>('current')
  const download = async (kind: string) => {
    if (busy) return
    setBusy(kind)
    try {
      let blob: Blob
      const filename = kind === 'json'
        ? '牧哲学堂_业务数据.json'
        : kind === 'students'
          ? `牧哲学堂_${studentExportScope === 'all' ? '全部批次' : '当前批次'}_学员数据.xlsx`
          : '牧哲学堂_财务报表.xlsx'
      if (kind === 'json') {
        const data = await fetchJson('/api/settings/backup/create', { method: 'POST' })
        blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      } else {
        const endpoint = '/api/settings/export/' + (kind === 'students' ? 'students' : 'finance')
        const response = await fetch(kind === 'students' && studentExportScope === 'all' ? `${endpoint}?termId=all` : endpoint)
        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || '导出失败，请重试')
        }
        blob = await response.blob()
      }
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url; anchor.download = filename; anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      message.success('导出文件已生成')
    } catch (error) { message.error(error instanceof Error ? error.message : '导出失败，请重试') }
    finally { setBusy('') }
  }
  return <Card style={{ width: '100%', borderRadius: 14 }}>
    <Typography.Title level={4}>业务数据导出</Typography.Title>
    <Alert type="info" showIcon message="业务导出不等于可恢复备份" description="JSON最多包含5000条考勤、1000份试卷，不包含完整账号、课堂照片文件和所有关联表，不能用于覆盖恢复。" />
    <div style={{ marginTop: 18 }}>
      <Typography.Text strong>学员 Excel 导出范围</Typography.Text>
      <div style={{ marginTop: 8 }}>
        <Radio.Group
          value={studentExportScope}
          onChange={(event) => setStudentExportScope(event.target.value)}
          optionType="button"
          buttonStyle="solid"
          options={[
            { label: '当前批次', value: 'current' },
            { label: '全部批次', value: 'all' },
          ]}
        />
      </div>
      <Typography.Text type="secondary" style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
        当前批次跟随管理端顶部已选批次；课时余额按该批次的有效报名汇总。
      </Typography.Text>
    </div>
    <Space wrap style={{ marginBlock: 20 }}>
      {(['json', 'students', 'finance'] as const).map((kind) => <Button key={kind} disabled={!!busy && busy !== kind} loading={busy === kind} icon={<DownloadOutlined />} onClick={() => void download(kind)} style={{ minHeight: 44 }}>{kind === 'json' ? '导出业务 JSON' : kind === 'students' ? '导出学员 Excel' : '导出财务 Excel'}</Button>)}
    </Space>
    <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>完整备份与恢复在系统管理员维护模块操作；已删除的业务数据在系统回收站中受保留期保护。</Typography.Paragraph>
  </Card>
}
