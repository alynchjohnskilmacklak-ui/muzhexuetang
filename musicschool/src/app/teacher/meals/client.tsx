'use client'

import { useMemo, useState } from 'react'
import { Button, Card, Empty, Radio, Tag, Typography, message } from 'antd'
import dayjs from 'dayjs'

const { Title, Text } = Typography

type Menu = {
  id: string
  mainDish: string
  sideDish: string | null
  allowDouble: boolean
  notes: string | null
}
type Student = { id: string; name: string; grade: string | null }
type Detail = { studentId: string; studentName: string; portion: 'single' | 'double' }
type Report = {
  id: string
  totalCount: number
  riceSingle: number
  riceDouble: number
  submittedAt: string
  details: Detail[]
}

export function TeacherMealsClient({
  menu,
  myStudents,
  report,
  reportDate,
}: {
  menu: Menu | null
  myStudents: Student[]
  report: Report | null
  reportDate: string
}) {
  const [currentReport, setCurrentReport] = useState(report)
  const [editing, setEditing] = useState(!report)
  const [submitting, setSubmitting] = useState(false)
  const [portions, setPortions] = useState<Record<string, 'none' | 'single' | 'double'>>(() => {
    const selected = Object.fromEntries((report?.details || []).map((detail) => [detail.studentId, detail.portion]))
    return Object.fromEntries(myStudents.map((student) => [student.id, selected[student.id] || 'none']))
  })

  const details = useMemo(() => myStudents.flatMap((student) => {
    const portion = portions[student.id]
    return portion === 'single' || portion === 'double'
      ? [{ studentId: student.id, studentName: student.name, portion }]
      : []
  }), [myStudents, portions])
  const stats = {
    total: details.length,
    single: details.filter((detail) => detail.portion === 'single').length,
    double: details.filter((detail) => detail.portion === 'double').length,
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
      setCurrentReport(data)
      setEditing(false)
      message.success(currentReport ? '上报已更新' : '上报已提交')
    } catch {
      message.error('就餐上报提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (!menu) {
    return <Empty description="今日菜单尚未设置，暂不能上报" />
  }

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
            <Text>{(currentReport.details || []).map((detail) => `${detail.studentName}（${detail.portion === 'double' ? '双份' : '单份'}）`).join('、') || '今日无学员就餐'}</Text>
            <Button style={{ display: 'block', marginTop: 16 }} onClick={() => setEditing(true)}>修改上报</Button>
          </>
        ) : (
          <>
            {myStudents.map((student) => (
              <div key={student.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
                <div style={{ minWidth: 88 }}>
                  <Text style={{ fontSize: 14 }}>{student.name}</Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{student.grade || '-'}</Text>
                </div>
                <Radio.Group
                  value={portions[student.id] || 'none'}
                  onChange={(event) => setPortions((prev) => ({ ...prev, [student.id]: event.target.value }))}
                  size="small"
                >
                  <Radio.Button value="none">不就餐</Radio.Button>
                  <Radio.Button value="single">单份</Radio.Button>
                  {menu.allowDouble && <Radio.Button value="double">双份</Radio.Button>}
                </Radio.Group>
              </div>
            ))}
            <div style={{ margin: '16px 0', fontWeight: 600 }}>
              就餐：{stats.total}人 | 单份：{stats.single}人 | 双份：{stats.double}人
            </div>
            <Button type="primary" loading={submitting} onClick={submit}>提交上报</Button>
          </>
        )}
      </Card>
    </div>
  )
}
