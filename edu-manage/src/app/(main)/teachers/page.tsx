'use client'

import { useState, useEffect, useCallback, type ComponentProps } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Alert, Input, Select, Segmented, Button, Empty, Spin, Card, Pagination, Form, message } from 'antd'
import { AuditOutlined, CalendarOutlined, DollarOutlined, HolderOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { BrandModal } from '@/components/Common/BrandModal'
import { PageLayout } from '@/components/Layout/PageLayout'
import { TeacherCard } from './_components/TeacherCard'
import { TeacherForm } from './_components/TeacherForm'
import { DeleteConfirmModal } from './_components/DeleteConfirmModal'
import { ALL_SUBJECTS } from '@/constants/subjects'

const PAGE_SIZE = 100
const TEACHER_ORDER_KEY = 'muzhe-teacher-order-v1'

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

function readTeacherOrder() {
  try {
    const value = localStorage.getItem(TEACHER_ORDER_KEY)
    const parsed = value ? JSON.parse(value) : []
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function SortableTeacherCard({ teacher, ...props }: ComponentProps<typeof TeacherCard>) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: teacher.id })
  const dragHandle = (
    <button
      ref={setActivatorNodeRef}
      type="button"
      className="teacher-directory-drag-handle"
      aria-label={`按住拖动${teacher.name}调整顺序`}
      title="按住拖动调整顺序"
      onClick={(event) => event.stopPropagation()}
      {...attributes}
      {...listeners}
    >
      <HolderOutlined aria-hidden="true" />
    </button>
  )

  return (
    <div
      ref={setNodeRef}
      className="teacher-directory-sortable-item"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 2 : undefined,
        position: 'relative',
      }}
    >
      <TeacherCard teacher={teacher} {...props} dragHandle={dragHandle} />
    </div>
  )
}

export default function TeachersPage() {
  const router = useRouter()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string | undefined>()
  const [filterSubject, setFilterSubject] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [term, setTerm] = useState<TermScope | null>(null)
  const [messageTarget, setMessageTarget] = useState<{ teacher: Record<string, unknown>; type: 'remind' | 'praise' } | null>(null)
  const [messageTitle, setMessageTitle] = useState('')
  const [messageContent, setMessageContent] = useState('')
  const [sending, setSending] = useState(false)
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({})

  const fetchTeachers = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    const params = new URLSearchParams()
    if (filterType) params.set('type', filterType)
    if (search) params.set('q', search)
    if (filterSubject) params.set('subject', filterSubject)
    params.set('page', String(page))
    params.set('limit', String(PAGE_SIZE))
    try {
      const tRes = await fetch(`/api/teachers?${params}`).then(r => { if (!r.ok) throw new Error('教师列表加载失败'); return r.json() })
      if (tRes.total > 0 && page > Math.ceil(tRes.total / PAGE_SIZE)) {
        setPage(Math.ceil(tRes.total / PAGE_SIZE))
        return
      }
      const savedOrder = readTeacherOrder()
      const savedRank = new Map<string, number>(savedOrder.map((id, index) => [id, index]))
      const loadedTeachers = [...(tRes.teachers || [])] as Teacher[]
      loadedTeachers.sort((a, b) => (savedRank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (savedRank.get(b.id) ?? Number.MAX_SAFE_INTEGER))
      setTeachers(loadedTeachers)
      setTotal(tRes.total || 0)
      setTerm(tRes.term || null)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '教师档案加载失败，请检查网络后重试。')
    } finally { setLoading(false) }
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const oldIndex = teachers.findIndex((teacher) => teacher.id === active.id)
    const newIndex = teachers.findIndex((teacher) => teacher.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const reordered = arrayMove(teachers, oldIndex, newIndex)
    setTeachers(reordered)

    try {
      const savedOrder = readTeacherOrder()
      const visibleIds = new Set(teachers.map((teacher) => teacher.id))
      const firstVisible = savedOrder.findIndex((id) => visibleIds.has(id))
      const hiddenBefore = firstVisible < 0 ? [] : savedOrder.slice(0, firstVisible).filter((id) => !visibleIds.has(id))
      const hiddenAfter = (firstVisible < 0 ? savedOrder : savedOrder.slice(firstVisible)).filter((id) => !visibleIds.has(id))
      const nextOrder = [...hiddenBefore, ...reordered.map((teacher) => teacher.id), ...hiddenAfter]
      localStorage.setItem(TEACHER_ORDER_KEY, JSON.stringify(nextOrder))
      message.success('教师顺序已保存到当前浏览器')
    } catch {
      message.warning('顺序已调整，但当前浏览器无法保存')
    }
  }

  return (
    <PageLayout
      title="教师档案"
      subtitle="师资资质 · 任教科目 · 带教课时 · 沟通操作与行为日志"
    >
      {loadError && (
        <Alert
          type="error"
          showIcon
          message="教师档案暂时无法加载"
          description={loadError}
          action={<Button size="small" onClick={fetchTeachers}>重试</Button>}
          style={{ marginBottom: 16, borderRadius: 10 }}
        />
      )}

      <section className="teacher-directory-shell">
        <div className="teacher-directory-toolbar">
          <div className="teacher-directory-search-filters">
            <Input placeholder="搜索姓名、手机或科目" prefix={<SearchOutlined />}
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} allowClear />
            <Segmented
              aria-label="按任职类型筛选"
              size="large"
              value={filterType || 'ALL'}
              onChange={value => { setFilterType(value === 'ALL' ? undefined : String(value)); setPage(1) }}
              options={[
                { label: '全部', value: 'ALL' },
                { label: '全职', value: 'FULL_TIME' },
                { label: '兼职', value: 'PART_TIME' },
                { label: '离职', value: 'RESIGNED' },
              ]}
            />
            <Select placeholder="全部科目" value={filterSubject} onChange={value => { setFilterSubject(value); setPage(1) }} allowClear
          options={ALL_SUBJECTS.map(subject => ({ label: subject, value: subject }))} />
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditData(null); setFormOpen(true) }}>添加教师</Button>
        </div>
        <div className="teacher-directory-summary">
          <span>共 {total} 位教师</span>
          {term && <span>数据范围：{term.name}</span>}
          <span className="teacher-directory-sort-note">按住卡片右上角拖动排序，顺序保存在本浏览器</span>
        </div>

      {loading ? (
        <div className="teacher-directory-loading"><Spin size="large" /></div>
      ) : loadError ? null : teachers.length === 0 ? (
        <Card bordered className="teacher-directory-empty">
          <Empty description={search || filterType || filterSubject ? '没有符合筛选条件的教师' : '暂无教师数据'}>
            {!search && !filterType && !filterSubject &&
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditData(null); setFormOpen(true) }}>添加第一位教师</Button>}
          </Empty>
        </Card>
      ) : (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={teachers.map((teacher) => teacher.id)} strategy={rectSortingStrategy}>
              <div className="teacher-directory-grid">
                {teachers.map((teacher) => (
                  <SortableTeacherCard key={teacher.id} teacher={teacher}
                    onEdit={(record) => { setEditData(record); setFormOpen(true) }}
                    onDelete={(record) => setDeleteTarget({ id: record.id as string, name: record.name as string })}
                    onMessage={(targetTeacher, type) => { setMessageTarget({ teacher: targetTeacher, type }); setMessageTitle(''); setMessageContent('') }}
                    unreadCount={unreadMap[teacher.id] || 0} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {total > PAGE_SIZE && <Pagination current={page} pageSize={PAGE_SIZE} total={total} showSizeChanger={false}
            onChange={setPage} className="teacher-directory-pagination" />}
        </>
      )}
      </section>

      <TeacherForm open={formOpen} onClose={() => { setFormOpen(false); setEditData(null); fetchTeachers() }} initialData={editData} mode={editData ? 'edit' : 'create'} />
      <DeleteConfirmModal open={!!deleteTarget} teacherId={deleteTarget?.id || null} teacherName={deleteTarget?.name || ''} onClose={() => setDeleteTarget(null)} onDeleted={fetchTeachers} />
      <BrandModal
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
      </BrandModal>
    </PageLayout>
  )
}
