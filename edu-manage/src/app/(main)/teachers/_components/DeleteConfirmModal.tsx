'use client'

import { useState, useEffect } from 'react'
import { Modal, Spin, Select, message, Divider } from 'antd'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function DeleteConfirmModal({
  open, teacherId, teacherName, onClose, onDeleted,
}: { open: boolean; teacherId: string | null; teacherName: string; onClose: () => void; onDeleted: () => void }) {
  const [loading, setLoading] = useState(false)
  const [impact, setImpact] = useState<{ courses: number; students: number; schedules: number; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [transferTo, setTransferTo] = useState('')

  const { data: teachers } = useSWR(open ? '/api/teachers?status=ACTIVE&limit=200' : null, fetcher)
  const availableTeachers = (teachers?.filter
    ? teachers.filter((t: any) => t.id !== teacherId && t.status === 'ACTIVE')
    : []
  ) as { id: string; name: string; subjects: string }[]

  useEffect(() => {
    if (open && teacherId) {
      setTransferTo('')
      setLoading(true)
      fetch(`/api/teachers/${teacherId}`).then(r => r.json()).then(d => {
        setImpact({ courses: d._count?.courses || 0, students: d._count?.students || 0, schedules: d._count?.schedules || 0, name: d.name || teacherName })
      }).catch(() => setImpact(null)).finally(() => setLoading(false))
    }
  }, [open, teacherId, teacherName])

  const handleDelete = async () => {
    if (!teacherId) return
    setDeleting(true)
    try {
      const url = transferTo
        ? `/api/teachers/${teacherId}?transferTo=${encodeURIComponent(transferTo)}`
        : `/api/teachers/${teacherId}`
      const res = await fetch(url, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        message.success(transferTo
          ? `「${teacherName}」已离职，所有学员/课程已转交至 ${data.transferTo || ''}`
          : `「${teacherName}」已办理离职`
        )
        onDeleted()
      } else {
        message.error(data.error || '操作失败')
      }
    } catch { message.error('网络错误') }
    setDeleting(false)
    onClose()
  }

  return (
    <Modal title="确认离职操作" open={open} onCancel={onClose} onOk={handleDelete} okText={transferTo ? '转交并离职' : '确认离职'} cancelText="取消" okButtonProps={{ danger: true, loading: deleting }}>
      {loading ? <Spin /> : impact ? (
        <>
          <p><strong style={{ color: '#e03e2d' }}>{impact.name}</strong> 老师名下有关联数据：</p>
          <ul style={{ color: '#5a4e3a', paddingLeft: 20, lineHeight: 2 }}>
            <li>{impact.courses} 门在授课程</li>
            <li>{impact.students} 名在带学员</li>
            <li>{impact.schedules} 条排课记录</li>
          </ul>

          <Divider style={{ margin: '12px 0' }} />
          <div style={{ marginBottom: 8, fontWeight: 600, color: '#1F2329' }}>选择接替教师（可选）</div>
          <Select
            showSearch
            allowClear
            placeholder="不选择则自动清理所有关联数据"
            style={{ width: '100%' }}
            value={transferTo || undefined}
            onChange={(v) => setTransferTo(v || '')}
            options={availableTeachers.map((t) => ({
              label: `${t.name}${t.subjects ? ' · ' + t.subjects : ''}`,
              value: t.id,
            }))}
            filterOption={(input, option) => (option?.label as string || '').includes(input)}
          />
          <div style={{ color: '#98A2B3', fontSize: 12, marginTop: 4 }}>
            {transferTo
              ? '学员、课程、排课将全部转交给接替教师'
              : '不选择接替教师时，将释放学员、停用课程、取消排课'}
          </div>
        </>
      ) : (
        <p>确认将 <strong>{teacherName}</strong> 标记为离职？</p>
      )}
    </Modal>
  )
}
