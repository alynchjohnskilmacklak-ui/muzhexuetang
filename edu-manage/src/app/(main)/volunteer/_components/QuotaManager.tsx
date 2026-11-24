'use client'

import { useMemo, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Upload,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  BankOutlined,
  CompassOutlined,
  DownloadOutlined,
  TeamOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import useSWR from 'swr'
import { useIsMobile } from '@/hooks/useIsMobile'

type Quota = {
  id: string
  schoolName: string
  district: string
  allocQuota: number
  normalQuota: number
  totalQuota: number
  note?: string | null
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function QuotaManager() {
  const isMobile = useIsMobile() ?? false
  const [selectedDistrict, setSelectedDistrict] = useState<string | undefined>()
  const [searchKey, setSearchKey] = useState('')

  const url = useMemo(() => {
    const params = new URLSearchParams()
    if (searchKey.trim()) params.set('q', searchKey.trim())
    if (selectedDistrict) params.set('district', selectedDistrict)
    const qs = params.toString()
    return `/api/volunteer/quota${qs ? `?${qs}` : ''}`
  }, [searchKey, selectedDistrict])

  const { data, mutate, isLoading } = useSWR(url, fetcher)
  const records: Quota[] = Array.isArray(data?.records) ? data.records : []
  const districts: string[] = Array.isArray(data?.districts) ? data.districts : []

  // KPI Statistics
  const stats = useMemo(() => {
    const highSchools = new Set(records.map((r) => r.schoolName)).size
    const totalAlloc = records.reduce((sum, r) => sum + (r.allocQuota || 0), 0)
    return {
      highSchools,
      districtsCount: districts.length,
      totalAlloc,
      recordCount: records.length,
    }
  }, [records, districts])

  const columns: ColumnsType<Quota> = [
    {
      title: '目标高中',
      dataIndex: 'schoolName',
      width: 220,
      render: (name: string) => (
        <span style={{ fontWeight: 600, color: '#1F2329' }}>{name}</span>
      ),
    },
    {
      title: '县 (市、区)',
      dataIndex: 'district',
      width: 140,
      render: (district: string) => <Tag color="blue">{district}</Tag>,
    },
    {
      title: '生源初中',
      dataIndex: 'note',
      width: 180,
      render: (note?: string | null) => note || <span style={{ color: '#C4BAB0' }}>全区统筹</span>,
    },
    {
      title: '分配生计划',
      dataIndex: 'allocQuota',
      width: 120,
      render: (quota: number) => (
        <span style={{ fontWeight: 700, color: '#E8784A' }}>{quota} 人</span>
      ),
    },
    {
      title: '合计计划',
      dataIndex: 'totalQuota',
      width: 100,
      render: (quota: number) => `${quota} 人`,
    },
  ]

  return (
    <Space direction="vertical" size={14} style={{ width: '100%' }}>
      {/* 3 KPI overview cards */}
      <Row gutter={[10, 10]}>
        <Col xs={8} sm={8}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, border: '1px solid #EEE7E1', background: '#FAF8F5' }}
            styles={{ body: { padding: isMobile ? '10px 4px' : '12px 14px', textAlign: 'center' } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, color: '#8D806F' }}>
              <BankOutlined style={{ color: '#14574D' }} />
              <span>目标高中</span>
            </div>
            <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: '#14574D', marginTop: 2 }}>
              {stats.highSchools} <span style={{ fontSize: 12, fontWeight: 400 }}>所</span>
            </div>
          </Card>
        </Col>

        <Col xs={8} sm={8}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, border: '1px solid #EEE7E1', background: '#F0FDF4' }}
            styles={{ body: { padding: isMobile ? '10px 4px' : '12px 14px', textAlign: 'center' } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, color: '#8D806F' }}>
              <CompassOutlined style={{ color: '#27A644' }} />
              <span>覆盖区县</span>
            </div>
            <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: '#27A644', marginTop: 2 }}>
              {stats.districtsCount} <span style={{ fontSize: 12, fontWeight: 400 }}>个</span>
            </div>
          </Card>
        </Col>

        <Col xs={8} sm={8}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, border: '1px solid #EEE7E1', background: '#FFF9F5' }}
            styles={{ body: { padding: isMobile ? '10px 4px' : '12px 14px', textAlign: 'center' } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, color: '#8D806F' }}>
              <TeamOutlined style={{ color: '#E8784A' }} />
              <span>分配生总额</span>
            </div>
            <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: '#E8784A', marginTop: 2 }}>
              {stats.totalAlloc.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 400 }}>人</span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Filter and Upload Toolbar */}
      <Card
        bordered={false}
        style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}
        styles={{ body: { padding: 12 } }}
      >
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Space wrap direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: isMobile ? '100%' : undefined }}>
            <Input.Search
              placeholder="搜索学校或区县..."
              style={{ width: isMobile ? '100%' : 220 }}
              allowClear
              onSearch={(q) => setSearchKey(q)}
            />
            <Select
              allowClear
              placeholder="选择区县"
              value={selectedDistrict}
              style={{ width: isMobile ? '100%' : 150 }}
              options={districts.map((district) => ({ label: district, value: district }))}
              onChange={(district) => setSelectedDistrict(district)}
            />
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
                  toast.success(`成功导入 ${count} 条分配生名额记录`)
                  mutate()
                }
                if (info.file.status === 'error') toast.error('导入失败，请检查格式后重试')
              }}
            >
              <Button icon={<UploadOutlined />} style={{ borderRadius: 8 }}>
                导入Excel
              </Button>
            </Upload>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => toast.info('模板列要求：学校名称、县（市、区）、分配生计划、统招计划、合计、说明')}
              style={{ borderRadius: 8 }}
            >
              下载模板
            </Button>
          </Space>
        </Space>
      </Card>

      {/* Table or Mobile Cards */}
      {isMobile ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {records.length === 0 ? (
            <Card style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
              <Empty description="暂无符合条件的分配生名额记录" />
            </Card>
          ) : (
            records.map((r) => (
              <Card
                key={r.id}
                style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}
                styles={{ body: { padding: 12 } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#1F2329' }}>{r.schoolName}</div>
                    <div style={{ fontSize: 12, color: '#8D806F', marginTop: 2 }}>{r.note || '全区统筹'}</div>
                  </div>
                  <Tag color="blue" style={{ margin: 0 }}>{r.district}</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAF8F5', borderRadius: 8, padding: '8px 10px', fontSize: 12 }}>
                  <span>分配生计划：<strong style={{ color: '#E8784A', fontSize: 14 }}>{r.allocQuota}</strong> 人</span>
                  <span>合计：<strong>{r.totalQuota}</strong> 人</span>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <Card style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={records}
            loading={isLoading}
            pagination={{ pageSize: 15, showTotal: (t) => `共 ${t} 条名额记录` }}
            scroll={{ x: 'max-content' }}
            size="middle"
          />
        </Card>
      )}
    </Space>
  )
}
