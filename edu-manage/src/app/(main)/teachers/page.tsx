'use client'

import { useState, useEffect, useCallback } from 'react'
import { Row, Col, Input, Select, Button, Space, Empty, Spin, Card, Statistic } from 'antd'
import { PlusOutlined, SearchOutlined, TeamOutlined, TrophyOutlined, ClockCircleOutlined, CalendarOutlined } from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { TeacherCard } from './_components/TeacherCard'
import { TeacherForm } from './_components/TeacherForm'
import { DeleteConfirmModal } from './_components/DeleteConfirmModal'
import { useIsMobile } from '@/hooks/useIsMobile'

type Teacher = {
  id: string; name: string; phone: string; employmentType: string; status: string
  avatar?: string | null
  education?: string | null; university?: string | null; major?: string | null
  subjects: string; monthlyHours: number; rating: number; joinedAt: string
  _count?: { students: number; schedules: number }
}

export default function TeachersPage() {
  const isMobile = useIsMobile() ?? false
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string | undefined>()
  const [filterSubject, setFilterSubject] = useState<string | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [stats, setStats] = useState({ total: 0, fullTime: 0, partTime: 0, avgRating: 0 })

  const fetchTeachers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterType) params.set('type', filterType)
    if (search) params.set('q', search)
    if (filterSubject) params.set('subject', filterSubject)
    params.set('limit', '100')
    try {
      const [tRes, sRes] = await Promise.all([
        fetch(`/api/teachers?${params}`).then(r => r.json()),
        fetch('/api/teachers/stats').then(r => r.json()),
      ])
      setTeachers(tRes.teachers || [])
      setStats(sRes)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [search, filterType, filterSubject])

  useEffect(() => { fetchTeachers() }, [fetchTeachers])

  const allSubjects = [...new Set(teachers.flatMap(t => (t.subjects || '').split(',').filter(Boolean)))]

  const actions = !isMobile ? (
    <Space>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditData(null); setFormOpen(true) }}
        style={{ background: '#E8784A', borderColor: '#E8784A' }}>添加教师</Button>
    </Space>
  ) : null

  return (
    <PageLayout title="教师管理" subtitle="管理教师档案、排课与考核" actions={actions}>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}><Card bordered style={{ borderRadius: 12 }} styles={{ body: { padding: 20 } }}>
          <Statistic title="在职教师" value={stats.total} prefix={<TeamOutlined style={{ color: '#27a644' }} />} valueStyle={{ color: '#1F2329' }} />
        </Card></Col>
        <Col xs={12} sm={6}><Card bordered style={{ borderRadius: 12 }} styles={{ body: { padding: 20 } }}>
          <Statistic title="全职 / 兼职" value={`${stats.fullTime} / ${stats.partTime}`} prefix={<ClockCircleOutlined style={{ color: '#E8784A' }} />} valueStyle={{ color: '#1F2329', fontSize: 20 }} />
        </Card></Col>
        <Col xs={12} sm={6}><Card bordered style={{ borderRadius: 12 }} styles={{ body: { padding: 20 } }}>
          <Statistic title="平均满意度" value={stats.avgRating} prefix={<TrophyOutlined style={{ color: '#f5a623' }} />} suffix="⭐" valueStyle={{ color: '#1F2329' }} />
        </Card></Col>
        <Col xs={12} sm={6}><Card bordered style={{ borderRadius: 12 }} styles={{ body: { padding: 20 } }}>
          <Statistic title="待排课" value={0} prefix={<CalendarOutlined style={{ color: '#828fff' }} />} valueStyle={{ color: '#1F2329' }} />
        </Card></Col>
      </Row>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
        <Input placeholder="搜索姓名、手机、科目…" prefix={<SearchOutlined style={{ color: '#98A2B3' }} />}
          value={search} onChange={e => setSearch(e.target.value)} style={{ width: isMobile ? '100%' : 260 }} allowClear />
        <Select placeholder="全部类型" value={filterType} onChange={setFilterType} allowClear style={{ width: 120 }}
          options={[{ label: '全职', value: 'FULL_TIME' }, { label: '兼职', value: 'PART_TIME' }, { label: '离职', value: 'RESIGNED' }]} />
        {allSubjects.length > 0 && (
          <Select placeholder="按科目筛选" value={filterSubject} onChange={setFilterSubject} allowClear style={{ width: 120 }}
            options={allSubjects.map(s => ({ label: s, value: s }))} />
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : teachers.length === 0 ? (
        <Card bordered style={{ borderRadius: 12, textAlign: 'center', padding: 60 }}>
          <Empty description="暂无教师数据">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>添加第一位教师</Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {teachers.map(t => (
            <Col key={t.id} xs={24} lg={12}>
              <TeacherCard teacher={t}
                onEdit={(d) => { setEditData(d); setFormOpen(true) }}
                onDelete={(d) => setDeleteTarget({ id: d.id as string, name: d.name as string })} />
            </Col>
          ))}
        </Row>
      )}

      <TeacherForm open={formOpen} onClose={() => { setFormOpen(false); setEditData(null); fetchTeachers() }} initialData={editData} mode={editData ? 'edit' : 'create'} />
      <DeleteConfirmModal open={!!deleteTarget} teacherId={deleteTarget?.id || null} teacherName={deleteTarget?.name || ''} onClose={() => setDeleteTarget(null)} onDeleted={fetchTeachers} />
    </PageLayout>
  )
}
