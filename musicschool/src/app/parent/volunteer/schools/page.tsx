'use client'

import { useEffect, useState } from 'react'
import { Card, Input, Select, Typography, Modal, Row, Col, Empty, Skeleton } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { SchoolCard } from '@/components/Volunteer/SchoolCard'

const { Title, Text } = Typography

export default function ParentSchoolsPage() {
  const [schools, setSchools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [detailSchool, setDetailSchool] = useState<any | null>(null)

  useEffect(() => {
    fetch('/api/schools')
      .then(r => r.json())
      .then(d => { setSchools(d.schools || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = schools.filter((s: any) => {
    const matchSearch = !search
      || s.name.includes(search)
      || s.location.includes(search)
      || (s.keyFeature || '').includes(search)
      || (s.intro || '').includes(search)
    const matchType = !filterType || s.type === filterType
    const matchLocation = !filterLocation || s.location === filterLocation
    return matchSearch && matchType && matchLocation
  })

  const locations = [...new Set(schools.map((s: any) => s.location))] as string[]

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={5} style={{ margin: 0, marginBottom: 4, fontSize: 16 }}>
          高中学校信息
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          了解石家庄及新乐周边高中学校详细信息，助力志愿填报
        </Text>
      </div>

      <Card style={{ marginBottom: 16, borderRadius: 12 }} styles={{ body: { padding: '12px 16px' } }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索学校名称、特色..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 160 }}
            allowClear
          />
          <Select
            placeholder="学校类型" allowClear style={{ width: 110 }}
            value={filterType || undefined}
            onChange={v => setFilterType(v || '')}
            options={['省示范', '市重点', '县中', '民办'].map(t => ({ label: t, value: t }))}
          />
          <Select
            placeholder="所在地" allowClear style={{ width: 110 }}
            value={filterLocation || undefined}
            onChange={v => setFilterLocation(v || '')}
            options={locations.map(l => ({ label: l, value: l }))}
          />
        </div>
      </Card>

      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : filtered.length === 0 ? (
        <Empty description="没有找到匹配的学校" />
      ) : (
        <Row gutter={[12, 12]}>
          {filtered.map((school: any) => (
            <Col key={school.id} xs={24} sm={12} md={8} xl={6}>
              <div onClick={() => setDetailSchool(school)} style={{ cursor: 'pointer', height: '100%' }}>
                <SchoolCard school={school} compact />
              </div>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title={detailSchool?.name}
        open={!!detailSchool}
        onCancel={() => setDetailSchool(null)}
        footer={null}
        width={600}
        style={{ top: 30 }}
      >
        {detailSchool && <SchoolCard school={detailSchool} compact={false} />}
      </Modal>
    </div>
  )
}
