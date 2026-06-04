'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Empty, Input, Modal, Select, Space, Spin, Typography, message } from 'antd'
import { ImportOutlined, PlusOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons'
import { StudentCard } from './_components/StudentCard'
import { StudentForm } from './_components/StudentForm'
import { ImportModal } from './_components/ImportModal'
import { PageLayout } from '@/components/Layout/PageLayout'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Text } = Typography

const GRADE_ORDER = ['高三', '高二', '高一', '初三', '初二', '初一']
const GRADE_FILTERS = ['全部', '初一', '初二', '初三', '高一', '高二', '高三']
const GRADE_SELECT_OPTIONS = [
  '小学一年级',
  '小学二年级',
  '小学三年级',
  '小学四年级',
  '小学五年级',
  '小学六年级',
  '初一',
  '初二',
  '初三',
  '高一',
  '高二',
  '高三',
]
const TYPE_FILTERS = [
  { value: 'all', label: '全部类型', color: '#98A2B3' },
  { value: 'ONE_ON_ONE', label: '一对一', color: '#534AB7' },
  { value: 'ONE_ON_TWO', label: '一对二', color: '#185FA5' },
  { value: 'ONE_ON_THREE', label: '一对三', color: '#D4537E' },
  { value: 'GROUP', label: '班课', color: '#E8784A' },
]

type Student = {
  id: string
  name: string
  status: string
  gender?: string | null
  grade?: string | null
  school?: string | null
  enrolledAt: string
  remainHours: number
  totalHours: number
  source?: string | null
  courseType?: string | null
  mainTeacher?: { id: string; name: string } | null
  schedules?: Array<{ schedule: { course?: { id: string; name: string } | null } }>
}

type GroupedStudents = Record<string, Student[]>

function readQuery() {
  if (typeof window === 'undefined') return { grade: 'all', courseType: 'all', q: '', status: '' }
  const params = new URLSearchParams(window.location.search)
  return {
    grade: params.get('grade') || 'all',
    courseType: params.get('courseType') || 'all',
    q: params.get('q') || '',
    status: params.get('status') || '',
  }
}

export default function StudentsPage() {
  const isMobile = useIsMobile() ?? false
  const [grouped, setGrouped] = useState<GroupedStudents>({})
  const [gradeCounts, setGradeCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterGrade, setFilterGrade] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState<string | undefined>()
  const [lowHourOnly, setLowHourOnly] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [deleting, setDeleting] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    const query = readQuery()
    setFilterGrade(query.grade)
    setFilterType(query.courseType)
    setSearch(query.q)
    setFilterStatus(query.status || undefined)
  }, [])

  const allStudents = useMemo(() => Object.values(grouped).flat(), [grouped])
  const activeCount = allStudents.filter((student) => student.status === 'ACTIVE').length
  const lowHourCount = allStudents.filter((student) => student.status === 'ACTIVE' && student.remainHours <= 3).length

  const updateUrl = useCallback((next: { grade?: string; courseType?: string; q?: string; status?: string; lowHour?: boolean }) => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const merged = {
      grade: next.grade ?? filterGrade,
      courseType: next.courseType ?? filterType,
      q: next.q ?? search,
      status: next.status ?? filterStatus ?? '',
    }
    if (merged.grade && merged.grade !== 'all') params.set('grade', merged.grade)
    else params.delete('grade')
    if (merged.courseType && merged.courseType !== 'all') params.set('courseType', merged.courseType)
    else params.delete('courseType')
    if (merged.q) params.set('q', merged.q)
    else params.delete('q')
    if (merged.status) params.set('status', merged.status)
    else params.delete('status')
    if (next.lowHour) params.set('lowHours', '1')
    else if (next.lowHour === false) params.delete('lowHours')
    window.history.replaceState(null, '', `${window.location.pathname}${params.toString() ? `?${params}` : ''}`)
  }, [filterGrade, filterStatus, filterType, search])

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('groupByGrade', 'true')
    params.set('limit', '500')
    if (filterGrade !== 'all') params.set('grade', filterGrade)
    if (filterType !== 'all') params.set('courseType', filterType)
    if (filterStatus) params.set('status', filterStatus)
    if (search) params.set('q', search)
    if (lowHourOnly) params.set('lowHours', '1')
    try {
      const [studentRes, countRes] = await Promise.all([
        fetch(`/api/students?${params}`),
        fetch('/api/students/grade-counts'),
      ])
      const studentPayload = await studentRes.json()
      const countPayload = await countRes.json()
      setGrouped(studentPayload || {})
      setGradeCounts(countPayload || {})
    } catch {
      message.error('学员数据加载失败')
    } finally {
      setLoading(false)
    }
  }, [filterGrade, filterStatus, filterType, lowHourOnly, search])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  const handleGradeChange = (grade: string) => {
    setFilterGrade(grade)
    updateUrl({ grade })
  }

  const handleTypeChange = (courseType: string) => {
    setFilterType(courseType)
    updateUrl({ courseType })
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    updateUrl({ q: value })
  }

  const handleStatusChange = (value?: string) => {
    setFilterStatus(value)
    updateUrl({ status: value || '' })
  }

  const handleEdit = (student: Record<string, unknown>) => { setEditData(student); setFormOpen(true) }
  const handleFormClose = () => { setFormOpen(false); setEditData(null); fetchStudents() }

  const handleDeleteConfirm = async () => {
    if (!deleting) return
    try {
      const res = await fetch(`/api/students/${deleting.id}`, { method: 'DELETE' })
      if (res.ok) {
        message.success(`「${deleting.name}」已离校，默认列表不再显示`)
        fetchStudents()
      } else {
        const err = await res.json().catch(() => null)
        message.error(err?.error || `操作失败：${res.status}`)
      }
    } catch {
      message.error('网络错误')
    }
    setDeleting(null)
  }

  const groupedEntries = useMemo(() => {
    const ordered = GRADE_ORDER.filter((grade) => grouped[grade]?.length).map((grade) => [grade, grouped[grade]] as const)
    const rest = Object.entries(grouped).filter(([grade]) => !GRADE_ORDER.includes(grade) && grouped[grade]?.length)
    return [...ordered, ...rest]
  }, [grouped])

  const sidebar = (
    <aside style={{ width: 220, flexShrink: 0, borderRight: '1px solid #EEE7E1', padding: 16, minHeight: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column', gap: 18, background: '#fffaf5' }}>
      <div style={{ borderLeft: '3px solid #e8784a', paddingLeft: 10 }}>
        <div style={{ color: '#1F2329', fontWeight: 700 }}>牧哲学堂学员</div>
        <div style={{ color: '#98A2B3', fontSize: 12 }}>按年级和班型管理</div>
        <div style={{ color: '#E87545', fontSize: 28, fontWeight: 800, marginTop: 8 }}>{activeCount}</div>
        <div style={{ color: '#98A2B3', fontSize: 12 }}>当前筛选在读人数</div>
      </div>

      <div>
        <div style={{ color: '#98A2B3', fontSize: 12, marginBottom: 8 }}>按年级筛选</div>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          {GRADE_FILTERS.map((grade) => {
            const value = grade === '全部' ? 'all' : grade
            const active = filterGrade === value
            const count = value === 'all' ? Object.values(gradeCounts).reduce((sum, item) => sum + item, 0) : gradeCounts[value] || 0
            return (
              <button key={value} onClick={() => handleGradeChange(value)} style={{ width: '100%', border: 0, borderRadius: 7, padding: '8px 10px', background: active ? '#E8784A14' : 'transparent', color: active ? '#E8784A' : '#4f5662', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', fontWeight: active ? 600 : 400 }}>
                <span>{grade}</span><span>{count}</span>
              </button>
            )
          })}
        </Space>
      </div>

      <div>
        <div style={{ color: '#98A2B3', fontSize: 12, marginBottom: 8 }}>按课程类型</div>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          {TYPE_FILTERS.map((item) => {
            const active = filterType === item.value
            return (
              <button key={item.value} onClick={() => handleTypeChange(item.value)} style={{ width: '100%', border: 0, borderRadius: 7, padding: '8px 10px', background: active ? '#E8784A14' : 'transparent', color: active ? '#E8784A' : '#4f5662', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: active ? 600 : 400 }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: item.color }} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </Space>
      </div>

      <button
        onClick={() => { const next = !lowHourOnly; setLowHourOnly(next); updateUrl({ lowHour: next }) }}
        style={{ marginTop: 'auto', textAlign: 'left', border: '1px solid #F1D3CF', background: lowHourOnly ? '#FFF0EE' : '#FFF8F6', borderRadius: 8, padding: 12, color: '#1F2329', cursor: 'pointer' }}
      >
        <WarningOutlined style={{ color: '#e03e2d', marginRight: 6 }} />
        欠费预警
        <div style={{ color: '#e03e2d', fontSize: 24, fontWeight: 800, marginTop: 4 }}>{lowHourCount}</div>
        <div style={{ color: '#98A2B3', fontSize: 12 }}>剩余课时 ≤ 3</div>
      </button>
    </aside>
  )

  return (
    <PageLayout title="学员管理" subtitle="按年级、课程类型和课时风险快速定位学员">
      <div style={{ display: 'flex', background: '#fffdfb', border: '1px solid #EEE7E1', borderRadius: 8, overflow: 'hidden' }}>
        {!isMobile && sidebar}
        <main style={{ flex: 1, minWidth: 0, padding: isMobile ? 12 : 16 }}>
          <Space direction={isMobile ? 'vertical' : 'horizontal'} wrap style={{ width: '100%', marginBottom: 16, justifyContent: 'space-between' }}>
            <Space direction={isMobile ? 'vertical' : 'horizontal'} wrap style={{ flex: 1, width: isMobile ? '100%' : undefined }}>
              <Input
                placeholder="搜索姓名、手机、家长"
                prefix={<SearchOutlined style={{ color: '#98A2B3' }} />}
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
                style={{ width: isMobile ? '100%' : 320 }}
                allowClear
              />
              <Select
                placeholder="全部状态"
                value={filterStatus}
                onChange={handleStatusChange}
                allowClear
                style={{ width: isMobile ? '100%' : 132 }}
                options={[
                  { label: '潜客', value: 'LEAD' },
                  { label: '试听', value: 'TRIAL' },
                  { label: '在读', value: 'ACTIVE' },
                  { label: '结课', value: 'COMPLETED' },
                  { label: '离校', value: 'INACTIVE' },
                ]}
              />
              <Select
                placeholder="年级筛选"
                value={filterGrade === 'all' ? undefined : filterGrade}
                onChange={(value) => handleGradeChange(value || 'all')}
                allowClear
                style={{ width: isMobile ? '100%' : 132 }}
                options={GRADE_SELECT_OPTIONS.map((grade) => ({ label: grade, value: grade }))}
              />
              <Select
                defaultValue="createdAt"
                style={{ width: isMobile ? '100%' : 120 }}
                options={[{ label: '最近添加', value: 'createdAt' }, { label: '课时升序', value: 'remainHours' }]}
              />
            </Space>
            <Space>
              <Button icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>导入</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditData(null); setFormOpen(true) }} style={{ background: '#E87545', borderColor: '#E8784A' }}>添加学员</Button>
            </Space>
          </Space>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
          ) : groupedEntries.length === 0 ? (
            <Card bordered={false} style={{ borderRadius: 8, textAlign: 'center', padding: 60, background: '#ffffff', border: '1px solid #EEE7E1' }}>
              <Empty description="暂无学员数据"><Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>添加第一位学员</Button></Empty>
            </Card>
          ) : (
            <Space direction="vertical" size={18} style={{ width: '100%' }}>
              {groupedEntries.map(([grade, students]) => (
                <section key={grade}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <h2 style={{ color: '#1F2329', fontSize: 14, fontWeight: 700, margin: 0 }}>{grade}</h2>
                    <div style={{ height: 1, background: '#EEE7E1', flex: 1 }} />
                    <span style={{ color: '#98A2B3', fontSize: 12 }}>{students.length}人</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                    {students.map((student) => (
                      <StudentCard key={student.id} student={student} onEdit={handleEdit} onDelete={(item) => setDeleting(item)} />
                    ))}
                  </div>
                </section>
              ))}
            </Space>
          )}
        </main>
      </div>

      <StudentForm open={formOpen} onClose={handleFormClose} initialData={editData} mode={editData ? 'edit' : 'create'} />
      <ImportModal open={importOpen} onClose={() => { setImportOpen(false); fetchStudents() }} />

      <Modal title="确认离校操作" open={!!deleting} onCancel={() => setDeleting(null)} onOk={handleDeleteConfirm}
        okText="确认离校" cancelText="取消" okButtonProps={{ danger: true }}>
        <p>确认将 <strong style={{ color: '#e03e2d' }}>{deleting?.name as string}</strong> 标记为离校？</p>
        <Text style={{ color: '#98A2B3', fontSize: 13 }}>此操作将同时<b>停用关联家长账号</b>，家长将无法登录系统。数据不会丢失，状态可后续修改。</Text>
      </Modal>
    </PageLayout>
  )
}
