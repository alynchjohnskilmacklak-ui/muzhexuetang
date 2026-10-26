'use client'

import { useState, useEffect, useCallback } from 'react'
import { Row, Col, Input, Select, Button, Space, Empty, Spin, Card, Pagination, Modal, Form, message } from 'antd'
import { PlusOutlined, SearchOutlined, TeamOutlined, TrophyOutlined, ClockCircleOutlined, CalendarOutlined, CrownOutlined, IdcardOutlined } from '@ant-design/icons'
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
        style={{ background: 'linear-gradient(135deg,#0E5E4E,#0B4B40)', borderColor: '#0E5E4E', boxShadow: '0 3px 10px rgba(14,94,78,.25)' }}>添加教师</Button>
    </Space>
  ) : null

  const statCards = [
    { key: 'total', title: '在职教师档案', value: String(stats.total), icon: <IdcardOutlined />, color: '#C9A45C', main: true },
    { key: 'type', title: '全职 / 兼职', value: `${stats.fullTime} / ${stats.partTime}`, icon: <ClockCircleOutlined />, color: '#0E5E4E', main: false },
    { key: 'rating', title: '平均满意度', value: String(stats.avgRating), icon: <TrophyOutlined />, color: '#B98A2F', main: false },
    { key: 'todo', title: '待排课', value: '0', icon: <CalendarOutlined />, color: '#185FA5', main: false },
  ]

  return (
    <PageLayout title="教师管理" subtitle="管理教师档案、排课与考核" actions={actions}>
      {/* 品牌概览 Hero 区 */}
      <div style={{
        borderRadius: 18, padding: isMobile ? 18 : 24, marginBottom: 16,
        background: 'linear-gradient(135deg,#123C35 0%,#0E5E4E 55%,#0B4B40 100%)',
        boxShadow: '0 6px 22px rgba(14,94,78,.22)',
        color: '#F7F3E8', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -30, top: -40, fontSize: 160, opacity: .07, transform: 'rotate(-12deg)' }}><TeamOutlined /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <CrownOutlined style={{ color: '#C9A45C', fontSize: 15 }} />
          <span style={{ fontSize: isMobile ? 12 : 13, letterSpacing: 2, color: 'rgba(242,227,182,.9)' }}>牧哲学堂 · 师资团队</span>
        </div>
        <div style={{ fontSize: isMobile ? 26 : 34, fontWeight: 800, lineHeight: 1.2 }}>
          {stats.total} 位教师 <span style={{ fontSize: isMobile ? 15 : 18, fontWeight: 500, color: 'rgba(247,243,232,.75)' }}>在岗护航每一节课</span>
        </div>
        <div style={{ marginTop: 8, fontSize: isMobile ? 12 : 13, color: 'rgba(247,243,232,.72)', lineHeight: 1.6 }}>
          教师档案为全局资料，不会因换期开班而重复创建；卡片中的学员数、课次与授课数据跟随当前运营批次。
        </div>
        {term && (
          <span style={{ display: 'inline-block', marginTop: 10, padding: '4px 12px', borderRadius: 999, background: 'rgba(201,164,92,.16)', border: '1px solid rgba(201,164,92,.35)', color: '#F2E3B6', fontSize: 11.5, fontWeight: 600 }}>
            当前数据范围：{term.name}
          </span>
        )}
      </div>

      {/* 品牌统计卡 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))', gap: 10, marginBottom: 20 }}>
        {statCards.map(item => item.main ? (
          <div key={item.key} style={{
            gridColumn: isMobile ? 'span 2' : undefined,
            borderRadius: 16, padding: '16px 18px',
            background: 'linear-gradient(135deg,#FAF8F4,#F3EEE3)', border: '1px solid #E7DFCE',
            boxShadow: '0 2px 10px rgba(23,47,41,.06)',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#C9A45C,#B98A2F)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 3px 10px rgba(185,138,47,.3)' }}>{item.icon}</div>
            <div>
              <div style={{ fontSize: 11.5, color: '#8A6B2F', fontWeight: 600, marginBottom: 2 }}>{item.title}</div>
              <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, color: '#0B4B40', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{item.value}</div>
            </div>
          </div>
        ) : (
          <div key={item.key} style={{ borderRadius: 16, padding: '14px 16px', background: '#fff', border: '1px solid #EDE9E1', boxShadow: '0 2px 8px rgba(23,47,41,.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, background: item.color + '14', color: item.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{item.icon}</span>
              <span style={{ fontSize: 11, color: '#667085', fontWeight: 600 }}>{item.title}</span>
            </div>
            <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: '#17352F', fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
        <Input placeholder="搜索姓名、手机、科目…" prefix={<SearchOutlined style={{ color: '#98A2B3' }} />}
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ width: isMobile ? '100%' : 260, borderRadius: 999 }} allowClear />
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
