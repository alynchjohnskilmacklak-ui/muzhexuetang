'use client'

import { useMemo, useState } from 'react'
import { Button, Card, Empty, Radio, Tag, Typography, Collapse } from 'antd'
import { toast } from 'sonner'
import { DownOutlined, RightOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { Title, Text } = Typography

type Menu = {
  id: string; mainDish: string; sideDish: string | null
  allowDouble: boolean; notes: string | null
}
type Student = { id: string; name: string; grade: string | null; school?: string | null }
type MealGroup = {
  id: string; name: string; courseName: string; courseType: string
  studentCount: number; students: Student[]
}
type Detail = { studentId: string; studentName: string; portion: 'single' | 'double' }
type Report = {
  id: string; totalCount: number; riceSingle: number; riceDouble: number
  submittedAt: string; details: Detail[]
}

export function TeacherMealsClient({
  menu, mealGroups, report, reportDate,
}: {
  menu: Menu | null
  mealGroups: MealGroup[]
  report: Report | null
  reportDate: string
}) {
  const [currentReport, setCurrentReport] = useState(report)
  const [editing, setEditing] = useState(!report)
  const [submitting, setSubmitting] = useState(false)
  const [portions, setPortions] = useState<Record<string, 'none' | 'single' | 'double'>>(() => {
    const selected = Object.fromEntries((report?.details || []).map(d => [d.studentId, d.portion]))
    const allStudents = mealGroups.flatMap(g => g.students)
    return Object.fromEntries(allStudents.map(s => [s.id, selected[s.id] || 'none']))
  })

  const allStudents = useMemo(() => mealGroups.flatMap(g => g.students), [mealGroups])
  const details = useMemo(() => allStudents.flatMap(s => {
    const p = portions[s.id]
    return p === 'single' || p === 'double' ? [{ studentId: s.id, studentName: s.name, portion: p }] : []
  }), [allStudents, portions])
  const stats = {
    total: details.length,
    single: details.filter(d => d.portion === 'single').length,
    double: details.filter(d => d.portion === 'double').length,
  }

  const setGroupAll = (students: Student[], value: 'none' | 'single' | 'double') => {
    setPortions(prev => {
      const next = { ...prev }
      for (const s of students) next[s.id] = value
      return next
    })
  }

  const groupStats = (students: Student[]) => {
    let total = 0, single = 0, double = 0
    for (const s of students) {
      const p = portions[s.id]
      if (p === 'single') { total++; single++ }
      else if (p === 'double') { total++; double++ }
    }
    return { total, single, double }
  }

  const submit = async () => {
    if (!menu) return
    setSubmitting(true)
    try {
      const res = await fetch(currentReport ? `/api/meals/report/${currentReport.id}` : '/api/meals/report', {
        method: currentReport ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuId: menu.id, reportDate, details }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'submit failed')
      setCurrentReport(data); setEditing(false)
      toast.success(currentReport ? '上报已更新' : '上报已提交')
    } catch { toast.error('就餐上报提交失败') }
    finally { setSubmitting(false) }
  }

  if (!menu) return <Empty description="今日菜单尚未设置，暂不能上报" />

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>就餐上报</Title>
      <Card style={{ marginBottom: 16, borderRadius: 12 }}>
        <Text type="secondary">{dayjs(reportDate).format('YYYY-MM-DD')} 今日菜单</Text>
        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{menu.mainDish}</div>
        <Text style={{ display: 'block', marginTop: 6 }}>{menu.sideDish || '菜品待补充'}</Text>
        {menu.allowDouble && <Tag color="orange" style={{ marginTop: 10 }}>允许双份主食</Tag>}
      </Card>

      <Card title={currentReport && !editing ? '已提交' : '今日就餐上报'} style={{ borderRadius: 12 }}>
        {currentReport && !editing ? (
          <>
            <Text type="secondary">提交时间 {dayjs(currentReport.submittedAt).format('YYYY-MM-DD HH:mm')}</Text>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '12px 0' }}>
              <Tag color="blue">就餐 {currentReport.totalCount} 人</Tag>
              <Tag color="green">单份 {currentReport.riceSingle} 人</Tag>
              <Tag color="orange">双份 {currentReport.riceDouble} 人</Tag>
            </div>
            <Text>{(currentReport.details || []).map(d => `${d.studentName}（${d.portion === 'double' ? '双份' : '单份'}）`).join('、') || '今日无学员就餐'}</Text>
            <Button style={{ display: 'block', marginTop: 16 }} onClick={() => setEditing(true)}>修改上报</Button>
          </>
        ) : (
          <>
            {mealGroups.map(group => {
              const gs = groupStats(group.students)
              return (
                <Card key={group.id} size="small" style={{ marginBottom: 12, borderRadius: 10, border: '1px solid #EEE7E1' }}
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        <Text strong style={{ fontSize: 14 }}>{group.courseName}</Text>
                        <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>{group.courseType === 'ONE_ON_ONE' ? '散课' : `${group.studentCount}人`}</Text>
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {gs.total > 0 && <Tag color="blue" style={{ borderRadius: 9999 }}>已选{gs.total}</Tag>}
                        {gs.single > 0 && <Tag color="green" style={{ borderRadius: 9999 }}>单{gs.single}</Tag>}
                        {gs.double > 0 && <Tag color="orange" style={{ borderRadius: 9999 }}>双{gs.double}</Tag>}
                      </div>
                    </div>
                  }
                  extra={
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button size="small" onClick={() => setGroupAll(group.students, 'none')}>全不就餐</Button>
                      <Button size="small" onClick={() => setGroupAll(group.students, 'single')}>全单份</Button>
                      {menu.allowDouble && <Button size="small" onClick={() => setGroupAll(group.students, 'double')}>全双份</Button>}
                    </div>
                  }>
                  {group.students.map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,.04)' }}>
                      <div style={{ minWidth: 80 }}>
                        <Text style={{ fontSize: 13 }}>{s.name}</Text>
                        <Text type="secondary" style={{ display: 'block', fontSize: 10 }}>{[s.grade, s.school].filter(Boolean).join(' · ') || '-'}</Text>
                      </div>
                      <Radio.Group value={portions[s.id] || 'none'} onChange={e => setPortions(prev => ({ ...prev, [s.id]: e.target.value }))} size="small">
                        <Radio.Button value="none">不就餐</Radio.Button>
                        <Radio.Button value="single">单份</Radio.Button>
                        {menu.allowDouble && <Radio.Button value="double">双份</Radio.Button>}
                      </Radio.Group>
                    </div>
                  ))}
                </Card>
              )
            })}
            <div style={{ margin: '16px 0', fontWeight: 600, fontSize: 14 }}>
              就餐：{stats.total}人 | 单份：{stats.single}人 | 双份：{stats.double}人
            </div>
            <Button type="primary" loading={submitting} onClick={submit}>提交上报</Button>
          </>
        )}
      </Card>
    </div>
  )
}
