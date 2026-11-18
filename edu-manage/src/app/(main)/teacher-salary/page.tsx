'use client'

import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import {
  Alert,
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import { BrandModal } from '@/components/Common/BrandModal'
import { CheckCircleOutlined, DeleteOutlined, DollarOutlined, DownloadOutlined, EditOutlined } from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'
import { submitSalarySettlement, SalarySubmissionError } from '@/lib/salary-settlement-client'
import { CachedAvatarImage } from '@/components/Common/CachedAvatarImage'
import { getTeacherAvatarUrl } from '@/lib/teacher-avatars'

const { Text, Title } = Typography
const fetcher = async (url: string) => {
  const response = await fetch(url)
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || '薪资数据加载失败，请重试')
  return payload
}

const PERIOD_OPTIONS = [
  { label: '本月', value: 'month' },
  { label: '本周', value: 'week' },
  { label: '全部', value: 'all' },
]

const ONE_ON_ONE_GRADES = ['初一', '初二', '初三', '高一', '高二', '高三'] as const

const TYPE_META: Record<string, { color: string; label: string }> = {
  LESSON_PAY: { color: '#1D9E75', label: '课时薪资' },
  LESSON_PAY_ADJUSTMENT: { color: '#C77F00', label: '课时薪资结算调整' },
  FEEDBACK_BONUS: { color: '#E8784A', label: '反馈奖励' },
  STUDY_HALL_BONUS: { color: '#C6821E', label: '作业登记奖励' },
  STUDY_HALL_ATTENDANCE: { color: '#1D9E75', label: '晚托考勤奖励' },
  SALARY_SETTLEMENT: { color: '#C9A45C', label: '工资结算' },
  manual_adjust: { color: '#534AB7', label: '手动调整' },
}

interface TeacherOption {
  id: string
  name: string
}

interface SalarySummary {
  teacherId: string
  name: string
  avatar?: string | null
  gender?: string | null
  lesson: number
  feedback: number
  adjustment: number
  smallClass: number
  intensive: number
  feedbackCount: number
  rewardCount: number
  recordCount: number
  pendingCount: number
  total: number
  settledAt?: string | null
  settledTotal?: number
}

interface SalaryTransaction {
  id: string
  teacherId: string
  teacherName: string
  type: string
  salaryBucket: 'SMALL_CLASS' | 'INTENSIVE'
  amount: number
  description?: string | null
  settledAt?: string | null
  createdAt: string
}

function SalaryAdjustmentModal({ teacherId, teacherName, open, onClose, onSaved }: {
  teacherId: string
  teacherName: string
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const response = await fetch('/api/admin/salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId,
          amount: values.amount,
          description: values.description.trim(),
          salaryBucket: values.salaryBucket,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '调整失败')
      message.success('工资调整已记录')
      form.resetFields()
      onSaved()
      onClose()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '调整失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BrandModal
      title={`手动调整工资 · ${teacherName}`}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={saving}
      okText="确定调整"
      cancelText="取消"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" preserve={false} initialValues={{ salaryBucket: 'SMALL_CLASS' }}>
        <Form.Item
          label="工资归属"
          name="salaryBucket"
          rules={[{ required: true, message: '请选择工资归属' }]}
        >
          <Segmented
            block
            options={[
              { label: '小班课薪资', value: 'SMALL_CLASS' },
              { label: '一对一/二/三薪资', value: 'INTENSIVE' },
            ]}
          />
        </Form.Item>
        <Form.Item
          label="调整金额（元）"
          name="amount"
          extra="正数表示增加工资，负数表示扣减工资"
          rules={[
            { required: true, message: '请输入调整金额' },
            { validator: (_, value) => typeof value === 'number' && Number.isFinite(value) && value !== 0 ? Promise.resolve() : Promise.reject(new Error('金额必须是非0有效数字')) },
          ]}
        >
          <InputNumber inputMode="decimal" precision={2} step={10} placeholder="例如：100 或 -50" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="调整原因" name="description" rules={[{ required: true, whitespace: true, message: '请填写调整原因' }]}>
          <Input.TextArea rows={3} maxLength={200} showCount placeholder="例如：6月优势工资补差" />
        </Form.Item>
      </Form>
    </BrandModal>
  )
}

interface SalaryPayload {
  term: { id: string; name: string; status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' } | null
  readOnly: boolean
  teachers: TeacherOption[]
  summary: SalarySummary[]
  transactions: SalaryTransaction[]
  total: number
  page: number
  limit: number
}

function SalaryConfigDrawer({ teacherId, teacherName, open, onClose, onSaved }: {
  teacherId: string
  teacherName: string
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  useSWR(
    open && teacherId ? `/api/admin/salary/config?teacherId=${teacherId}` : null,
    fetcher,
    {
      onSuccess: (data) => form.setFieldsValue({
        groupRateJunior: data.groupRateJunior,
        groupRateSenior: data.groupRateSenior,
        feedbackRateGroup: data.feedbackRateGroup,
        feedbackRateOneOne: data.feedbackRateOneOne,
        ...Object.fromEntries(ONE_ON_ONE_GRADES.map((grade) => [`oo_${grade}`, data.oneOnOneRates?.[grade]])),
      }),
    },
  )

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    const response = await fetch('/api/admin/salary/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId,
        groupRateJunior: values.groupRateJunior,
        groupRateSenior: values.groupRateSenior,
        feedbackRateGroup: values.feedbackRateGroup,
        feedbackRateOneOne: values.feedbackRateOneOne,
        oneOnOneRates: Object.fromEntries(ONE_ON_ONE_GRADES.map((grade) => [grade, values[`oo_${grade}`]])),
      }),
    })
    setSaving(false)
    if (!response.ok) {
      message.error('保存失败')
      return
    }
    message.success('薪资配置已保存')
    onSaved()
    onClose()
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`薪资配置 · ${teacherName}`}
      width={420}
      footer={<Space><Button type="primary" loading={saving} onClick={handleSave} style={{ background: 'var(--color-primary)' }}>保存</Button><Button onClick={onClose}>取消</Button></Space>}
    >
      <Form form={form} layout="vertical" size="small">
        <Title level={5} style={{ marginTop: 0 }}>班课底薪（元/小时）</Title>
        <Row gutter={12}>
          <Col span={12}><Form.Item label="初中班课" name="groupRateJunior" rules={[{ required: true }]}><InputNumber min={0} max={999} step={0.5} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={12}><Form.Item label="高中班课" name="groupRateSenior" rules={[{ required: true }]}><InputNumber min={0} max={999} step={0.5} style={{ width: '100%' }} /></Form.Item></Col>
        </Row>
        <Title level={5}>一对一底薪（元/小时）</Title>
        <Row gutter={12}>
          {ONE_ON_ONE_GRADES.map((grade) => (
            <Col span={8} key={grade}><Form.Item label={grade} name={`oo_${grade}`} rules={[{ required: true }]}><InputNumber min={0} max={999} step={1} style={{ width: '100%' }} /></Form.Item></Col>
          ))}
        </Row>
        <Title level={5}>课堂反馈奖励（元/人）</Title>
        <Row gutter={12}>
          <Col span={12}><Form.Item label="班课" name="feedbackRateGroup" rules={[{ required: true }]}><InputNumber min={0} max={99} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={12}><Form.Item label="一对一" name="feedbackRateOneOne" rules={[{ required: true }]}><InputNumber min={0} max={99} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
        </Row>
        <Text type="secondary" style={{ fontSize: 11 }}>修改后仅影响未来薪资，已发放记录不会追溯修改。</Text>
      </Form>
    </Drawer>
  )
}

export default function TeacherSalaryAdminPage() {
  const isMobile = useIsMobile() ?? false
  const [period, setPeriod] = useState('month')
  const [filterTeacher, setFilterTeacher] = useState('')
  const [salaryBucket, setSalaryBucket] = useState<'ALL' | 'SMALL_CLASS' | 'INTENSIVE'>('ALL')
  const [configDrawer, setConfigDrawer] = useState({ open: false, teacherId: '', teacherName: '' })
  const [adjustmentModal, setAdjustmentModal] = useState({ open: false, teacherId: '', teacherName: '' })
  const [settleTarget, setSettleTarget] = useState({ open: false, teacherId: '', teacherName: '', total: 0, count: 0 })
  const settlementLock = useRef(false)
  const [settling, setSettling] = useState(false)
  const [settlementError, setSettlementError] = useState('')
  const [settlementUncertain, setSettlementUncertain] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<SalaryTransaction | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [transactionPage, setTransactionPage] = useState(1)
  const [exportingTeacherId, setExportingTeacherId] = useState('')
  const transactionPageSize = 50
  const query = new URLSearchParams({ period, page: String(transactionPage), limit: String(transactionPageSize) })
  if (filterTeacher) query.set('teacherId', filterTeacher)
  if (salaryBucket !== 'ALL') query.set('bucket', salaryBucket)
  const { data, error, isLoading, mutate } = useSWR<SalaryPayload>(`/api/admin/salary?${query.toString()}`, fetcher, { refreshInterval: 30_000, revalidateOnFocus: true, revalidateOnReconnect: true })

  useEffect(() => {
    setTransactionPage(1)
  }, [period, filterTeacher, salaryBucket])

  const teachers = data?.teachers ?? []
  const summary = data?.summary ?? []
  const transactions = data?.transactions ?? []
  const readOnly = data?.readOnly ?? false
  const totalAll = summary.reduce((sum, item) => sum + item.total, 0)
  const totalSmallClass = summary.reduce((sum, item) => sum + item.smallClass, 0)
  const totalIntensive = summary.reduce((sum, item) => sum + item.intensive, 0)

  const exportTeacherSalary = async (teacherId: string, teacherName: string) => {
    if (exportingTeacherId) return
    setExportingTeacherId(teacherId)
    message.loading({ content: `正在导出${teacherName}老师的薪资流水...`, key: 'salary-export' })
    try {
      const params = new URLSearchParams({ teacherId, period })
      const response = await fetch(`/api/admin/salary/export?${params.toString()}`)
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || '导出失败')
      }
      const blob = await response.blob()
      const disposition = response.headers.get('Content-Disposition') || ''
      const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
      const filename = encodedName ? decodeURIComponent(encodedName) : `${teacherName}老师薪资流水.xlsx`
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      message.success({ content: '薪资核对表已导出，五类工资已分别汇总并附完整明细', key: 'salary-export' })
    } catch (error) {
      message.error({ content: error instanceof Error ? error.message : '导出失败', key: 'salary-export' })
    } finally {
      setExportingTeacherId('')
    }
  }

  const deleteManualAdjustment = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/salary?id=${encodeURIComponent(pendingDelete.id)}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '删除失败')
      message.success('手动调整已删除')
      setPendingDelete(null)
      await mutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  const settleSalary = async () => {
    if (!settleTarget.teacherId || settlementLock.current || settlementUncertain) return
    settlementLock.current = true
    const termId = data?.term?.id
    setSettling(true)
    setSettlementError('')
    try {
      const receipt = await submitSalarySettlement({ teacherId: settleTarget.teacherId, period, termId, expectedTotal: settleTarget.total })
      setSettleTarget((prev) => ({ ...prev, open: false }))
      message.success(`已登记结算 ¥${receipt.total.toFixed(2)}，${receipt.count}笔流水已结清`)
      await mutate().catch(() => message.warning('结算已登记，但页面刷新失败，请刷新后核对，不要重复操作'))
    } catch (error) {
      const text = error instanceof Error ? error.message : '结算失败，请刷新核对后重试'
      setSettlementError(text)
      setSettlementUncertain(error instanceof SalarySubmissionError && error.outcomeUncertain)
      message.error(text)
    } finally {
      settlementLock.current = false
      setSettling(false)
    }
  }

  const summaryColumns: never[] = []

  const detailColumns = [
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 140, render: (value: string) => new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) },
    { title: '教师', dataIndex: 'teacherName', key: 'teacherName', width: 100 },
    {
      title: '薪资归属',
      dataIndex: 'salaryBucket',
      key: 'salaryBucket',
      width: 125,
      render: (value: SalaryTransaction['salaryBucket']) => (
        <Tag color={value === 'INTENSIVE' ? 'purple' : 'green'} style={{ borderRadius: 999 }}>
          {value === 'INTENSIVE' ? '一对一/二/三' : '小班课'}
        </Tag>
      ),
    },
    { title: '类型', dataIndex: 'type', key: 'type', width: 110, render: (value: string) => <Tag color={TYPE_META[value]?.color ?? 'default'} style={{ borderRadius: 999 }}>{TYPE_META[value]?.label ?? value}</Tag> },
    { title: '说明', dataIndex: 'description', key: 'description', ellipsis: true, render: (value?: string | null) => value || '-' },
    {
      title: '金额', dataIndex: 'amount', key: 'amount', width: 110, align: 'right' as const,
      render: (value: number) => <Text strong style={{ color: value >= 0 ? '#1D9E75' : '#E24B4A' }}>{value >= 0 ? '+' : '-'}¥{Math.abs(value).toFixed(2)}</Text>,
    },
    {
      title: '操作', key: 'action', width: 80, align: 'center' as const,
      render: (_: unknown, row: SalaryTransaction) => row.type === 'manual_adjust'
        ? <Button danger type="text" size="small" icon={<DeleteOutlined />} onClick={() => setPendingDelete(row)}>删除</Button>
        : null,
    },
  ]

  const renderSummaryCards = () => {
    const sorted = [...summary].sort((a, b) => b.recordCount - a.recordCount || b.total - a.total || a.name.localeCompare(b.name, 'zh-Hans-CN'))
    const activeTeachers = sorted.filter((item) => item.recordCount > 0)
    const idleTeachers = sorted.filter((item) => item.recordCount === 0)
    const renderCard = (row: SalarySummary, active: boolean) => {
      return (
        <div
          key={row.teacherId}
          style={{
            borderRadius: 16, overflow: 'hidden',
            background: active ? '#fff' : 'rgba(255,255,255,.72)',
            border: active ? '1px solid rgba(201,164,92,.5)' : '1px dashed #E0DAD0',
            boxShadow: active ? '0 4px 14px rgba(58,50,39,.07)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 10px' }}>
            <CachedAvatarImage
              src={getTeacherAvatarUrl(row.avatar, row.gender, row.teacherId)}
              fallbackSrc={getTeacherAvatarUrl(null, row.gender, row.teacherId)}
              alt={row.name}
              style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(201,164,92,.4)' }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14.5, fontWeight: 800, color: '#1F2329' }}>{row.name}</span>
                <span style={{
                  fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 999,
                  color: active ? '#8A6B2F' : '#98A2B3',
                  background: active ? 'rgba(201,164,92,.14)' : 'rgba(152,162,179,.12)',
                  border: `1px solid ${active ? 'rgba(201,164,92,.4)' : 'rgba(152,162,179,.3)'}`,
                }}>{active ? `${row.recordCount} 条记录` : '暂无记录'}</span>
                {row.settledAt ? (
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 999, color: '#0E5E4E', background: 'rgba(29,158,117,.12)', border: '1px solid rgba(29,158,117,.35)' }}>
                    已结算 ¥{Number(row.settledTotal ?? 0).toFixed(2)}
                  </span>
                ) : null}
              </div>
              <div style={{ fontSize: 11.5, color: '#98A2B3', marginTop: 2 }}>
                反馈 {row.feedbackCount} 次 · 奖励 {row.rewardCount} 次
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: '#98A2B3' }}>待结算</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: active ? '#0E5E4E' : '#B8B2A8', fontVariantNumeric: 'tabular-nums' }}>
                ¥{row.total.toFixed(2)}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 6, padding: '0 14px 12px' }}>
            {([
              ['小班课', row.smallClass, '#1D9E75'],
              ['个性化', row.intensive, '#7C5CFF'],
              ['课时工资', row.lesson, '#0E5E4E'],
              ['反馈奖励', row.feedback, '#E8784A'],
              ['管理调整', row.adjustment, '#C77F00'],
            ] as Array<[string, number, string]>).map(([label, value, color]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 8px', borderRadius: 9, background: active ? '#F7F5F1' : 'rgba(247,245,241,.5)', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#98A2B3', whiteSpace: 'nowrap' }}>{label}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>¥{Number(value).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, padding: '8px 14px', borderTop: '1px solid #F4EFE8', background: 'rgba(247,245,241,.55)' }}>
            <Button size="small" icon={<EditOutlined />} onClick={() => setConfigDrawer({ open: true, teacherId: row.teacherId, teacherName: row.name })}>配置</Button>
            <Button
              size="small"
              icon={<CheckCircleOutlined />}
              disabled={readOnly || Boolean(error) || settling || row.pendingCount === 0}
              loading={settling && settleTarget.teacherId === row.teacherId}
              onClick={() => { setSettlementError(''); setSettlementUncertain(false); setSettleTarget({ open: true, teacherId: row.teacherId, teacherName: row.name, total: row.total, count: row.pendingCount }) }}
              style={{ background: 'linear-gradient(135deg,#C9A45C,#B98A2F)', borderColor: 'transparent', color: '#fff', fontWeight: 700 }}
            >{row.pendingCount === 0 ? '已结清' : '结算'}</Button>
            <Button size="small" icon={<DollarOutlined />} disabled={readOnly} onClick={() => setAdjustmentModal({ open: true, teacherId: row.teacherId, teacherName: row.name })}>调整</Button>
            <Button size="small" icon={<DownloadOutlined />} style={{ marginLeft: 'auto' }} loading={exportingTeacherId === row.teacherId} disabled={Boolean(exportingTeacherId) && exportingTeacherId !== row.teacherId} onClick={() => exportTeacherSalary(row.teacherId, row.name)}>导出</Button>
          </div>
        </div>
      )
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {activeTeachers.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0,1fr))', gap: 10 }}>
            {activeTeachers.map((row) => renderCard(row, true))}
          </div>
        )}
        {idleTeachers.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: '#98A2B3' }}>暂无薪资记录 · {idleTeachers.length} 位教师</span>
              <div style={{ flex: 1, height: 1, background: '#EEE8DF' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0,1fr))', gap: 10, opacity: .9 }}>
              {idleTeachers.map((row) => renderCard(row, false))}
            </div>
          </>
        )}
        {sorted.length === 0 && <div style={{ textAlign: 'center', color: '#98A2B3', padding: 30 }}>暂无教师数据</div>}
      </div>
    )
  }

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>教师薪资管理</Title>
      {error && <Alert type="error" showIcon message="薪资加载失败，请勿根据当前空白数据结算" description={error.message} action={<Button onClick={() => mutate()}>重试</Button>} style={{ marginBottom: 12 }} />}
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card size="small" bordered={false} style={{ borderRadius: 14 }}>
          <Space wrap>
            <Text strong>{data?.term?.name || '尚未启用运营批次'}</Text>
            <Tag color={readOnly ? 'default' : 'green'}>{readOnly ? '历史批次 · 只读' : '当前运营批次'}</Tag>
            <Text type="secondary">工资汇总、流水、反馈次数和导出均按数据总览选择的批次统计。</Text>
          </Space>
        </Card>
        <Space wrap>
          <Segmented options={PERIOD_OPTIONS} value={period} onChange={(value) => setPeriod(value as string)} />
          <Select
            allowClear
            placeholder="筛选教师"
            value={filterTeacher || undefined}
            onChange={(value) => setFilterTeacher(value ?? '')}
            options={teachers.map((teacher) => ({ label: teacher.name, value: teacher.id }))}
            style={{ width: 160 }}
          />
          <Segmented
            value={salaryBucket}
            onChange={(value) => setSalaryBucket(value as typeof salaryBucket)}
            options={[
              { label: '全部流水', value: 'ALL' },
              { label: '小班课', value: 'SMALL_CLASS' },
              { label: '一对一/二/三', value: 'INTENSIVE' },
            ]}
          />
        </Space>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))', gap: 10 }}>
          <div style={{
            gridColumn: isMobile ? '1 / -1' : undefined,
            borderRadius: 16, padding: '16px 16px', position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(150deg,#17352F,#0E5E4E 65%,#0B4B40)',
            border: '1px solid rgba(201,164,92,.5)', boxShadow: '0 8px 20px rgba(18,60,53,.18)',
          }}>
            <div style={{ position: 'absolute', top: -40, right: -24, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(242,227,182,.28), transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ fontSize: 12.5, color: 'rgba(245,241,232,.7)' }}>教师待结算工资总和</div>
            <div style={{ fontSize: isMobile ? 28 : 34, fontWeight: 800, color: '#F2E3B6', marginTop: 4, fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>¥{totalAll.toFixed(2)}</div>
            <div style={{ fontSize: 11.5, color: 'rgba(242,227,182,.7)', marginTop: 4 }}>小班课 ＋ 个性化课程 · 共 {summary.length} 位教师</div>
          </div>
          <div style={{ borderRadius: 16, padding: '14px 14px', background: '#fff', border: '1px solid #F0E9DF', boxShadow: '0 4px 14px rgba(58,50,39,.05)' }}>
            <div style={{ fontSize: 12, color: '#98A2B3' }}>小班课薪资</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1D9E75', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>¥{totalSmallClass.toFixed(2)}</div>
            <div style={{ fontSize: 11, color: '#B8B2A8', marginTop: 4 }}>课时/反馈/调整合计</div>
          </div>
          <div style={{ borderRadius: 16, padding: '14px 14px', background: '#fff', border: '1px solid #F0E9DF', boxShadow: '0 4px 14px rgba(58,50,39,.05)' }}>
            <div style={{ fontSize: 12, color: '#98A2B3' }}>一对一/二/三薪资</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#7C5CFF', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>¥{totalIntensive.toFixed(2)}</div>
            <div style={{ fontSize: 11, color: '#B8B2A8', marginTop: 4 }}>个性化课程合计</div>
          </div>
        </div>

        <Tabs
          items={[
            {
              key: 'summary',
              label: '按教师汇总',
              children: isLoading ? <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div> : renderSummaryCards(),
            },
            {
              key: 'detail',
              label: salaryBucket === 'INTENSIVE' ? '一对一/二/三流水' : salaryBucket === 'SMALL_CLASS' ? '小班课流水' : '全部流水',
              children: <Table dataSource={transactions} columns={detailColumns} rowKey="id" loading={isLoading} pagination={{ current: transactionPage, pageSize: transactionPageSize, total: data?.total ?? 0, showSizeChanger: false, hideOnSinglePage: true, showTotal: (total) => `共 ${total} 条流水`, onChange: setTransactionPage }} size="small" scroll={{ x: isMobile ? 680 : undefined }} locale={{ emptyText: '暂无数据' }} />,
            },
          ]}
        />
      </Space>

      <SalaryConfigDrawer {...configDrawer} onClose={() => setConfigDrawer((prev) => ({ ...prev, open: false }))} onSaved={() => mutate()} />
      {!readOnly && <SalaryAdjustmentModal {...adjustmentModal} onClose={() => setAdjustmentModal((prev) => ({ ...prev, open: false }))} onSaved={() => mutate()} />}
      <BrandModal
        title={`结算工资 · ${settleTarget.teacherName}`}
        open={settleTarget.open}
        onCancel={() => { if (!settling) setSettleTarget((prev) => ({ ...prev, open: false })) }}
        zIndex={1100}
        width={isMobile ? 'calc(100vw - 24px)' : 440}
        maskClosable={!settling}
        keyboard={!settling}
        onOk={settleSalary}
        okText={settling ? '正在结算…' : settlementUncertain ? '请先核对结果' : '确认结算'}
        okButtonProps={{ disabled: settlementUncertain }}
        cancelText="取消"
        confirmLoading={settling}
        destroyOnHidden
      >
        <div style={{ padding: '6px 0' }}>
          {settling && <Alert type="info" showIcon message="正在核对并提交结算，请勿重复点击" style={{ marginBottom: 12 }} />}
          {settlementError && <Alert type={settlementUncertain ? 'warning' : 'error'} showIcon message={settlementUncertain ? '结算结果尚未确认' : '结算没有完成'} description={settlementError} action={<Button onClick={async () => { try { await fetcher(`/api/admin/salary?${query.toString()}`); await mutate(); message.success('余额已刷新，请关闭窗口后核对余额与流水') } catch (error) { message.error(error instanceof Error ? error.message : '余额刷新失败') } }}>刷新余额</Button>} style={{ marginBottom: 12 }} />}
          <Text>确认结清 <Text strong>{settleTarget.teacherName}</Text> 老师{PERIOD_OPTIONS.find(option => option.value === period)?.label}的 <Text strong>{settleTarget.count} 笔</Text>待结算流水，共 <Text strong>¥{settleTarget.total.toFixed(2)}</Text>？</Text>
          <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(201,164,92,.1)', border: '1px solid rgba(201,164,92,.35)', fontSize: 12.5, color: '#8A6B2F' }}>
            仅结清该教师，其他教师余额不受影响。结算后该范围待结算余额归零，历史明细与批次仍保留并可导出。这是账目结算登记，不会自动转账；新流水需要另行核对。
          </div>
          {settleTarget.total < 0 && <Alert type="warning" showIcon message="当前是负数余额。确认后登记账目结清，不代表向教师实际付款；请先核对管理调整流水。" style={{ marginTop: 12 }} />}
        </div>
      </BrandModal>
      <BrandModal
        title="删除手动调整"
        open={Boolean(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
        onOk={deleteManualAdjustment}
        okText="删除"
        okButtonProps={{ danger: true }}
        cancelText="取消"
        confirmLoading={deleting}
        destroyOnHidden
      >
        <Text>确定删除“{pendingDelete?.description || '手动调整'}”这条流水吗？删除后工资合计会同步变化。</Text>
      </BrandModal>
    </div>
  )
}
