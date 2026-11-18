'use client'

import { useState, useEffect, useCallback } from 'react'
import { Row, Col, Input, Select, Button, Space, Empty, Spin, Card, Statistic, Alert, Pagination, Modal, Form, message } from 'antd'
import { PlusOutlined, SearchOutlined, TeamOutlined, TrophyOutlined, ClockCircleOutlined, CalendarOutlined } from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { TeacherCard } from './_components/TeacherCard'
import { TeacherForm } from './_components/TeacherForm'
import { DeleteConfirmModal } from './_components/DeleteConfirmModal'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ALL_SUBJECTS } from '@/constants/subjects'

const PAGE_SIZE = 24

type Teacher = {
  id: string; name: string; phone: string; employmentType: string; status: string
  avatar?: string | null
  education?: string | null; university?: string | null; major?: string | null
  subjects: string; monthlyHours: number; rating: number; joinedAt: string
  _count?: { students: number; schedules: number }
}

type TermScope = {
  id: string
  name: string
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
}

export default function TeachersPage() {
  const isMobile = useIsMobile() ?? false
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string | undefined>()
  const [filterSubject, setFilterSubject] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [stats, setStats] = useState({ total: 0, fullTime: 0, partTime: 0, avgRating: 0 })
  const [term, setTerm] = useState<TermScope | null>(null)
  const [messageTarget, setMessageTarget] = useState<{ teacher: Record<string, unknown>; type: 'remind' | 'praise' } | null>(null)
  const [messageTitle, setMessageTitle] = useState('')
  const [messageContent, setMessageContent] = useState('')
  const [sending, setSending] = useState(false)
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({})

  const fetchTeachers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterType) params.set('type', filterType)
    if (search) params.set('q', search)
    if (filterSubject) params.set('subject', filterSubject)
    params.set('page', String(page))
    params.set('limit', String(PAGE_SIZE))
    try {
      const [tRes, sRes] = await Promise.all([
        fetch(`/api/teachers?${params}`).then(r => { if (!r.ok) throw new Error('教师列表加载失败'); return r.json() }),
        fetch('/api/teachers/stats').then(r => { if (!r.ok) throw new Error('教师统计加载失败'); return r.json() }),
      ])
      if (tRes.total > 0 && page > Math.ceil(tRes.total / PAGE_SIZE)) {
        setPage(Math.ceil(tRes.total / PAGE_SIZE))
        return
      }
      setTeachers(tRes.teachers || [])
      setTotal(tRes.total || 0)
      setTerm(tRes.term || null)
      setStats(sRes)
    } catch { message.error('教师档案加载失败，请重试') } finally { setLoading(false) }
  }, [search, filterType, filterSubject, page])

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/teacher-messages')
      if (!res.ok) return
      const data = await res.json()
      const map: Record<string, number> = {}
      ;(data.messages || []).forEach((item: { teacherId: string; readAt: string | null }) => {
        if (!item.readAt) map[item.teacherId] = (map[item.teacherId] || 0) + 1
      })
      setUnreadMap(map)
    } catch { /* 静默 */ }
  }, [])

  useEffect(() => { fetchMessages() }, [fetchMessages])

  useEffect(() => { fetchTeachers() }, [fetchTeachers])

  const actions = !isMobile ? (
    <Space>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditData(null); setFormOpen(true) }}
        style={{ background: '#E8784A', borderColor: '#E8784A' }}>添加教师</Button>
    </Space>
  ) : null

  return (
    <PageLayout title="教师管理" subtitle="管理教师档案、排课与考核" actions={actions}>
      <Alert
        showIcon
        type={term?.status === 'ARCHIVED' ? 'info' : 'success'}
        message={term ? `当前数据范围：${term.name}` : '尚未选择运营批次'}
        description={term?.status === 'ARCHIVED'
          ? '正在查看历史批次。教师档案永久保留；教师卡片中的学员数、课次和授课数据仅统计该历史批次。'
          : '教师档案为全局资料，不会因换期开班而重复创建；教师卡片中的学员数、课次和授课数据跟随当前运营批次。'}
        style={{ marginBottom: 20 }}
      />
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}><Card bordered style={{ borderRadius: 12 }} styles={{ body: { padding: 20 } }}>
          <Statistic title="在职教师档案" value={stats.total} prefix={<TeamOutlined style={{ color: '#27a644' }} />} valueStyle={{ color: '#1F2329' }} />
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
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ width: isMobile ? '100%' : 260 }} allowClear />
        <Select placeholder="全部类型" value={filterType} onChange={value => { setFilterType(value); setPage(1) }} allowClear style={{ width: isMobile ? '100%' : 120 }}
          options={[{ label: '全职', value: 'FULL_TIME' }, { label: '兼职', value: 'PART_TIME' }, { label: '离职', value: 'RESIGNED' }]} />
        <Select placeholder="按科目筛选" value={filterSubject} onChange={value => { setFilterSubject(value); setPage(1) }} allowClear style={{ width: isMobile ? '100%' : 120 }}
          options={ALL_SUBJECTS.map(subject => ({ label: subject, value: subject }))} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : teachers.length === 0 ? (
        <Card bordered style={{ borderRadius: 12, textAlign: 'center', padding: 60 }}>
          <Empty description={search || filterType || filterSubject ? '没有符合筛选条件的教师' : '暂无教师数据'}>
            {!search && !filterType && !filterSubject &&
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>添加第一位教师</Button>}
          </Empty>
        </Card>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {teachers.map(t => (
              <Col key={t.id} xs={24} lg={12}>
                <TeacherCard teacher={t}
                  onEdit={(d) => { setEditData(d); setFormOpen(true) }}
                  onDelete={(d) => setDeleteTarget({ id: d.id as string, name: d.name as string })}
                  onMessage={(teacher, type) => { setMessageTarget({ teacher, type }); setMessageTitle(''); setMessageContent('') }}
                  unreadCount={unreadMap[t.id] || 0} />
              </Col>
            ))}
          </Row>
          {total > PAGE_SIZE && <Pagination current={page} pageSize={PAGE_SIZE} total={total} showSizeChanger={false}
            onChange={setPage} style={{ marginTop: 20, textAlign: isMobile ? 'center' : 'right' }} />}
        </>
      )}

      <TeacherForm open={formOpen} onClose={() => { setFormOpen(false); setEditData(null); fetchTeachers() }} initialData={editData} mode={editData ? 'edit' : 'create'} />
      <DeleteConfirmModal open={!!deleteTarget} teacherId={deleteTarget?.id || null} teacherName={deleteTarget?.name || ''} onClose={() => setDeleteTarget(null)} onDeleted={fetchTeachers} />
      <Modal
        title={messageTarget?.type === 'praise'
          ? `表扬 · ${String(messageTarget?.teacher?.name || '')}`
          : `提醒 · ${String(messageTarget?.teacher?.name || '')}`}
        open={!!messageTarget}
        onCancel={() => setMessageTarget(null)}
        onOk={async () => {
          if (!messageTarget) return
          if (!messageTitle.trim()) { message.warning('请填写标题'); return }
          if (!messageContent.trim()) { message.warning('请填写内容'); return }
          setSending(true)
          try {
            const res = await fetch('/api/admin/teacher-messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                teacherId: messageTarget.teacher.id,
                type: messageTarget.type,
                title: messageTitle.trim(),
                content: messageContent.trim(),
              }),
            })
            if (!res.ok) throw new Error('发送失败')
            message.success(messageTarget.type === 'praise' ? '表扬已发送，教师端首页将弹出' : '提醒已发送，教师端首页将弹出')
            setMessageTarget(null)
            fetchMessages()
          } catch {
            message.error('发送失败，请重试')
          } finally {
            setSending(false)
          }
        }}
        confirmLoading={sending}
      >
        <Form layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="标题" required>
            <Input
              value={messageTitle}
              onChange={(e) => setMessageTitle(e.target.value)}
              maxLength={40}
              placeholder={messageTarget?.type === 'praise' ? '如：本周课堂表现非常出色' : '如：请及时补交考勤'}
            />
          </Form.Item>
          <Form.Item label="内容" required>
            <Input.TextArea
              rows={4}
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              maxLength={500}
              showCount
              placeholder="将弹窗显示在该教师端首页，仅该教师可见"
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageLayout>
  )
}
