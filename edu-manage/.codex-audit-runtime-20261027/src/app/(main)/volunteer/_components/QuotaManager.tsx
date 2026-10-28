'use client'

import { Button, Input, Select, Space, Table, Upload } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import { toast } from 'sonner'
import useSWR from 'swr'
import { useIsMobile } from '@/hooks/useIsMobile'

type Quota = { id: string; schoolName: string; district: string; allocQuota: number; normalQuota: number; totalQuota: number; note?: string | null }

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function QuotaManager() {
  const isMobile = useIsMobile() ?? false
  const { data, mutate, isLoading } = useSWR('/api/volunteer/quota', fetcher)
  const records: Quota[] = Array.isArray(data?.records) ? data.records : []
  const districts: string[] = Array.isArray(data?.districts) ? data.districts : []

  const columns: ColumnsType<Quota> = [
    { title: '目标高中', dataIndex: 'schoolName', width: 220 },
    { title: '县(市、区)', dataIndex: 'district', width: 140 },
    { title: '生源初中', dataIndex: 'note', width: 160 },
    { title: '分配生计划', dataIndex: 'allocQuota', width: 110 },
    { title: '合计', dataIndex: 'totalQuota', width: 80 },
  ]

  return (
    <Space direction="vertical" size={14} style={{ width: '100%' }}>
      <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
        <Space wrap direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: isMobile ? '100%' : undefined }}>
          <Input.Search placeholder="搜索学校或区县" style={{ width: isMobile ? '100%' : 240 }} onSearch={(q) => mutate(`/api/volunteer/quota?q=${encodeURIComponent(q)}`)} />
          <Select allowClear placeholder="区县" style={{ width: isMobile ? '100%' : 160 }} options={districts.map((district) => ({ label: district, value: district }))} onChange={(district) => mutate(`/api/volunteer/quota${district ? `?district=${encodeURIComponent(district)}` : ''}`)} />
        </Space>
        <Space wrap style={{ width: isMobile ? '100%' : undefined }}>
          <Upload
            accept=".xlsx,.xls"
            name="file"
            action="/api/volunteer/quota/import"
            showUploadList={false}
            onChange={(info) => {
              if (info.file.status === 'done') {
                const count = (info.file.response as { imported?: number })?.imported || 0
                toast.success(`成功导入 ${count} 条记录`)
                mutate()
              }
              if (info.file.status === 'error') toast.error('导入失败')
            }}
          >
            <Button icon={<UploadOutlined />}>导入Excel</Button>
          </Upload>
          <Button icon={<DownloadOutlined />} onClick={() => toast.info('模板列：学校名称、县（市、区）、分配生计划、统招计划、合计、说明')}>下载模板</Button>
        </Space>
      </Space>
      <Table rowKey="id" columns={columns} dataSource={records} loading={isLoading} pagination={{ pageSize: 12 }} scroll={{ x: 'max-content' }} />
    </Space>
  )
}
