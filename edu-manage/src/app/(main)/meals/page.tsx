'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import {
  Button, Card, Col, DatePicker, Form, Input, Modal, Row, Statistic, Switch,
  Table, Tabs, Tag, Typography, message,
} from 'antd'
import { DownloadOutlined, EditOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Title, Text } = Typography
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六']

type MealTemplate = {
  id: string
  weekday: number
  title: string | null
  breakfast: string | null
  lunch: string | null
  dinner: string | null
  snack: string | null
  note: string | null
  allowDouble?: boolean
}

type MealReport = {
  id: string
  teacher: { id: string; name: string }
  submittedAt: string
  totalCount: number
  riceSingle: number
  riceDouble: number
  details: Array<{ studentId: string; studentName: string; portion: 'single' | 'double' }>
}

type MealSummary = {
  totalCount: number
  singleCount: number
  doubleCount: number
  unreportedTeachers: unknown[]
  parentStats?: {
    eating: number
    notEating: number
    unselected: number
  }
}

function mondayOf(value: Dayjs) {
  const offset = value.day() === 0 ? 6 : value.day() - 1
  return value.startOf('day').subtract(offset, 'day')
}

export default function MealsPage() {
  const isMobile = useIsMobile() ?? false
  const [historyWeek, setHistoryWeek] = useState(() => mondayOf(dayjs()))
  const [templates, setTemplates] = useState<MealTemplate[]>([])
  const [reports, setReports] = useState<MealReport[]>([])
  const [historyReports, setHistoryReports] = useState<MealReport[]>([])
  const [summary, setSummary] = useState<MealSummary>({ totalCount: 0, singleCount: 0, doubleCount: 0, unreportedTeachers: [] })
  const [templateEditing, setTemplateEditing] = useState<{ weekday: number; template?: MealTemplate } | null>(null)
  const [saving, setSaving] = useState(false)
  const [templateForm] = Form.useForm()
  const today = dayjs().format('YYYY-MM-DD')

  const fetchTemplates = useCallback(async () => {
    const res = await fetch('/api/admin/meal-templates')
    const data = await res.json()
    setTemplates(data.templates || [])
  }, [])

  const fetchToday = useCallback(async () => {
    const [reportRes, summaryRes] = await Promise.all([
      fetch(`/api/meals/report?date=${today}`),
      fetch(`/api/meals/summary?date=${today}`),
    ])
    const reportData = await reportRes.json()
    const summaryData = await summaryRes.json()
    setReports(reportData.reports || [])
    setSummary(summaryData || {})
  }, [today])

  const fetchHistory = useCallback(async () => {
    const payloads = await Promise.all(Array.from({ length: 6 }, (_, index) =>
      fetch(`/api/meals/report?date=${historyWeek.add(index, 'day').format('YYYY-MM-DD')}`).then((res) => res.json())
    ))
    setHistoryReports(payloads.flatMap((payload) => payload.reports || []))
  }, [historyWeek])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])
  useEffect(() => { fetchToday() }, [fetchToday])
  useEffect(() => { fetchHistory() }, [fetchHistory])

  const templateMap = useMemo(() => new Map(templates.map((template) => [template.weekday, template])), [templates])

  const openTemplateEditor = (weekday: number, template?: MealTemplate) => {
    setTemplateEditing({ weekday, template })
    templateForm.setFieldsValue({
      lunch: template?.lunch,
      allowDouble: template?.allowDouble !== false,
      note: template?.note,
    })
  }

  const saveTemplate = async () => {
    const values = await templateForm.validateFields()
    setSaving(true)
    try {
      const res = await fetch(templateEditing?.template ? `/api/admin/meal-templates/${templateEditing.template.id}` : '/api/admin/meal-templates', {
        method: templateEditing?.template ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, weekday: templateEditing?.weekday }),
      })
      if (!res.ok) throw new Error('save failed')
      message.success('周期菜单已保存')
      setTemplateEditing(null)
      templateForm.resetFields()
      fetchTemplates()
    } catch {
      message.error('周期菜单保存失败')
    } finally {
      setSaving(false)
    }
  }

  const exportToday = () => {
    const summaryRows = reports.map((report) => ({
      教师: report.teacher.name,
      就餐人数: report.totalCount,
      单份人数: report.riceSingle,
      双份人数: report.riceDouble,
      上报时间: dayjs(report.submittedAt).format('YYYY-MM-DD HH:mm'),
    }))
    const detailRows = reports.flatMap((report) => (report.details || []).map((detail) => ({
      学员: detail.studentName,
      教师: report.teacher.name,
      份数: detail.portion === 'double' ? '双份' : '单份',
    })))
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), '汇总')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detailRows), '明细')
    XLSX.writeFile(workbook, `就餐汇总-${today}.xlsx`)
  }

  const reportColumns = [
    { title: '教师姓名', dataIndex: ['teacher', 'name'], key: 'teacher' },
    { title: '上报时间', dataIndex: 'submittedAt', key: 'submittedAt', render: (value: string) => dayjs(value).format('MM-DD HH:mm') },
    { title: '就餐人数', dataIndex: 'totalCount', key: 'totalCount' },
    { title: '双份人数', dataIndex: 'riceDouble', key: 'riceDouble' },
  ]

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>就餐管理</Title>
      <Tabs items={[
        {
          key: 'templates',
          label: '周期菜单',
          children: (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
              gap: 12,
            }}>
              {WEEKDAYS.map((weekday, index) => {
                const dayOfWeek = index + 1
                const template = templateMap.get(dayOfWeek)
                return (
                  <Card
                    key={weekday}
                    hoverable
                    onClick={() => !template && openTemplateEditor(dayOfWeek)}
                    style={{
                      borderRadius: 10,
                      minHeight: template ? 116 : 76,
                      border: template ? '1px solid #EEE7E1' : '1px dashed #E8D8CA',
                      background: template ? '#fff' : '#FCFBF9',
                    }}
                    styles={{ body: { padding: isMobile ? 10 : 12 } }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: template ? 8 : 0 }}>
                      <Text strong style={{ fontSize: 14, color: '#1F2329' }}>{weekday}</Text>
                      {template && (
                        <Button
                          size="small"
                          type="text"
                          icon={<EditOutlined />}
                          onClick={(event) => { event.stopPropagation(); openTemplateEditor(dayOfWeek, template) }}
                        >
                          编辑
                        </Button>
                      )}
                    </div>
                    {template ? (
                      <div style={{ display: 'grid', gap: 6 }}>
                        <Text strong style={{ fontSize: 15, color: '#1F2329', lineHeight: 1.35 }}>{template.lunch || '未设置米饭配菜'}</Text>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                          <Tag color={template.allowDouble !== false ? 'green' : 'default'} style={{ margin: 0 }}>
                            {template.allowDouble !== false ? '可双倍米饭' : '不可双倍'}
                          </Tag>
                          {template.note && <Text type="secondary" style={{ fontSize: 12 }}>{template.note}</Text>}
                        </div>
                      </div>
                    ) : (
                      <Button type="link" size="small" style={{ padding: 0, height: 24 }} onClick={(event) => { event.stopPropagation(); openTemplateEditor(dayOfWeek) }}>
                        点击设置
                      </Button>
                    )}
                  </Card>
                )
              })}
            </div>
          ),
        },
        {
          key: 'reports',
          label: '教师上报',
          children: (
            <>
              <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>今日 {today}</Text>
              <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                  ['总就餐人数', summary.totalCount || 0],
                  ['单份', summary.singleCount || 0],
                  ['双份', summary.doubleCount || 0],
                  ['未上报教师', summary.unreportedTeachers?.length || 0],
                ].map(([title, value]) => (
                  <Col xs={12} md={6} key={String(title)}>
                    <Card><Statistic title={title} value={value as number} suffix={title === '未上报教师' ? '位' : '人'} /></Card>
                  </Col>
                ))}
              </Row>
              {summary?.parentStats && (
                <Card title="家长自主选餐" style={{ marginTop: 12, marginBottom: 16, borderRadius: 10 }}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic title="选择用餐" value={summary.parentStats.eating} valueStyle={{ color: '#27a644' }} />
                    </Col>
                    <Col span={8}>
                      <Statistic title="选择不用餐" value={summary.parentStats.notEating} valueStyle={{ color: '#9a8e7a' }} />
                    </Col>
                    <Col span={8}>
                      <Statistic title="未选择" value={summary.parentStats.unselected} valueStyle={{ color: '#f5a623' }} />
                    </Col>
                  </Row>
                </Card>
              )}
              <Table
                rowKey="id"
                dataSource={reports}
                columns={reportColumns}
                pagination={false}
                scroll={isMobile ? { x: 520 } : undefined}
                expandable={{
                  expandedRowRender: (report) => (
                    <Text>{(report.details || []).map((detail) => `${detail.studentName}（${detail.portion === 'double' ? '双份' : '单份'}）`).join('、') || '无明细'}</Text>
                  ),
                }}
              />
              <Button icon={<DownloadOutlined />} style={{ marginTop: 16 }} onClick={exportToday}>导出今日汇总</Button>
            </>
          ),
        },
        {
          key: 'history',
          label: '历史记录',
          children: (
            <>
              <DatePicker picker="week" value={historyWeek} onChange={(value) => value && setHistoryWeek(mondayOf(value))} style={{ marginBottom: 12 }} />
              <Table
                rowKey="id"
                dataSource={historyReports}
                columns={[
                  ...reportColumns,
                  { title: '上报日期', dataIndex: 'reportDate', key: 'reportDate', render: (value: string) => dayjs(value).format('YYYY-MM-DD') },
                  { title: '明细', key: 'details', render: (_value: unknown, report: MealReport) => <Tag>{report.details?.length || 0} 名学员</Tag> },
                ]}
                scroll={isMobile ? { x: 680 } : undefined}
              />
            </>
          ),
        },
      ]} />

      <Modal title="设置周期菜单" open={!!templateEditing} onCancel={() => setTemplateEditing(null)} onOk={saveTemplate} confirmLoading={saving}>
        <Form form={templateForm} layout="vertical">
          <Form.Item name="lunch" label="午餐菜品（如：红烧肉）" rules={[{ required: true, message: '请填写午餐' }]}>
            <Input placeholder="填写今日菜品" />
          </Form.Item>
          <Form.Item name="allowDouble" label="是否允许双倍米饭" valuePropName="checked">
            <Switch checkedChildren="允许" unCheckedChildren="不允许" />
          </Form.Item>
          <Form.Item name="note" label="备注">
            <Input.TextArea rows={2} placeholder="可选备注" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
