'use client'

import { useMemo, useState } from 'react'
import { Alert, Button, Card, Col, DatePicker, Drawer, Empty, Form, Input, Modal, Row, Select, Space, Statistic, Tag, Typography } from 'antd'
import { CalendarOutlined, CheckCircleOutlined, CloudDownloadOutlined, DeleteOutlined, EyeOutlined, InboxOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import useSWR, { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/useIsMobile'
import BackupRestorePanel from '@/components/DataAdmin/BackupRestorePanel'
import { isAdminTermScopedSWRKey } from '@/lib/admin-term-scope-client'

const { Title, Text, Paragraph } = Typography
const fetcher = (url: string) => fetch(url).then(async (response) => {
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || '加载失败')
  return data
})

type Term = {
  id: string
  name: string
  code: string
  kind: 'REGULAR' | 'SUMMER' | 'WINTER' | 'WEEKEND' | 'OTHER'
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  startDate: string
  endDate: string
  description?: string | null
  _count: { memberships: number; classGroups: number; studyPlans: number }
}

const KIND_LABEL: Record<Term['kind'], string> = {
  REGULAR: '常规班', SUMMER: '暑期班', WINTER: '寒假班', WEEKEND: '周末班', OTHER: '其他',
}
const STATUS_LABEL: Record<Term['status'], string> = {
  DRAFT: '未启用', ACTIVE: '当前工作区', ARCHIVED: '历史归档',
}
const STATUS_COLOR: Record<Term['status'], string> = { DRAFT: 'default', ACTIVE: 'green', ARCHIVED: 'gold' }

export default function AcademicTermsPage() {
  const isMobile = useIsMobile()
  const [modal, modalContextHolder] = Modal.useModal()
  const { mutate: mutateCache } = useSWRConfig()
  const { data, isLoading, mutate } = useSWR<{ terms: Term[]; selectedTermId?: string | null }>('/api/admin/academic-terms', fetcher)
  const terms = useMemo(() => data?.terms || [], [data?.terms])
  const selectedTermId = data?.selectedTermId || null
  const activeTerm = useMemo(() => terms.find((term) => term.status === 'ACTIVE'), [terms])
  const [createOpen, setCreateOpen] = useState(false)
  const [backupOpen, setBackupOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [createForm] = Form.useForm()

  const requestAction = async (termId: string, action: 'activate' | 'archive', success: string) => {
    setBusy(true)
    const toastId = toast.loading(action === 'activate'
      ? '正在启用批次并核对历史课程、反馈和薪资关联…'
      : '正在归档本期数据…')
    try {
      const response = await fetch(`/api/admin/academic-terms/${termId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '操作失败')
      const repair = payload.repaired as { classGroups?: number; feedbacks?: number; salaryTransactions?: number } | undefined
      const repairedCount = repair
        ? Number(repair.classGroups || 0) + Number(repair.feedbacks || 0) + Number(repair.salaryTransactions || 0)
        : 0
      toast.success(repairedCount > 0 ? `${success}，已恢复 ${repairedCount} 条历史业务关联` : success, { id: toastId })
      await mutate((current) => current ? {
        ...current,
        selectedTermId: action === 'activate' ? termId : current.selectedTermId,
        terms: current.terms.map((term) => {
          if (action === 'activate') {
            if (term.id === termId) return { ...term, status: 'ACTIVE' as const }
            if (term.status === 'ACTIVE') return { ...term, status: 'ARCHIVED' as const }
          }
          if (action === 'archive' && term.id === termId) return { ...term, status: 'ARCHIVED' as const }
          return term
        }),
      } : current, { revalidate: false })
      await mutateCache(isAdminTermScopedSWRKey, undefined, { revalidate: false })
      await mutate()
      if (action === 'activate') {
        window.location.assign('/dashboard')
      }
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败', { id: toastId })
      return false
    } finally {
      setBusy(false)
    }
  }

  const openTermStudents = async (term: Term) => {
    setBusy(true)
    try {
      const response = await fetch('/api/admin/academic-terms/scope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termId: term.id }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '打开批次失败')
      await mutate((current) => current ? { ...current, selectedTermId: term.id } : current, { revalidate: false })
      await mutateCache(isAdminTermScopedSWRKey, undefined, { revalidate: false })
      window.location.assign('/students')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '打开批次失败')
    } finally {
      setBusy(false)
    }
  }

  const deleteTerm = async (term: Term) => {
    setBusy(true)
    try {
      const response = await fetch(`/api/admin/academic-terms/${term.id}`, { method: 'DELETE' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '删除失败')
      toast.success(`空白批次“${term.name}”已删除`)
      await mutate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败')
    } finally {
      setBusy(false)
    }
  }

  const createTerm = async () => {
    const values = await createForm.validateFields()
    setBusy(true)
    try {
      const response = await fetch('/api/admin/academic-terms', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          startDate: values.period[0].format('YYYY-MM-DD'),
          endDate: values.period[1].format('YYYY-MM-DD'),
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '创建失败')
      const termId = payload.term?.id
      if (!termId) throw new Error('创建成功，但没有返回批次编号')

      const activateResponse = await fetch(`/api/admin/academic-terms/${termId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'activate' }),
      })
      const activatePayload = await activateResponse.json().catch(() => ({}))
      if (!activateResponse.ok) throw new Error(activatePayload.error || '进入新批次失败')

      toast.success('新批次已创建并进入，学员名单目前为空')
      setCreateOpen(false)
      createForm.resetFields()
      await mutateCache(isAdminTermScopedSWRKey, undefined, { revalidate: false })
      await mutate()
      window.location.assign('/students')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: isMobile ? 12 : 24, maxWidth: 1440, margin: '0 auto' }}>
      {modalContextHolder}
      <Space direction="vertical" size={18} style={{ width: '100%' }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col flex="auto">
            <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>运营批次</Title>
            <Text type="secondary">一期就是一个独立学员工作区。旧期归档保留全部记录，新期从空白名单开始。</Text>
          </Col>
          <Col>
            <Space wrap>
              <Button icon={<CloudDownloadOutlined />} size="large" onClick={() => setBackupOpen(true)}>备份与恢复</Button>
              <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => {
                createForm.setFieldsValue({ kind: 'WEEKEND' })
                setCreateOpen(true)
              }}>创建并进入新批次</Button>
            </Space>
          </Col>
        </Row>

        <Alert
          type={activeTerm ? 'success' : 'warning'}
          showIcon
          message={activeTerm ? `当前工作区：${activeTerm.name}` : '目前没有正在使用的批次'}
          description={activeTerm
            ? '学员管理、班级、排课和反馈默认只展示这个批次。切换到历史批次时仅查看，不会混入当前名单。'
            : '可以创建一个全新的空白批次，也可以从下面选择一个未启用批次进入。'}
        />

        <Card>
          <Row gutter={[16, 12]} align="middle">
            <Col xs={24} md={8}>
              <Title level={4} style={{ margin: 0 }}>怎么使用</Title>
              <Text type="secondary">不需要复制旧学员，也不需要每天创建。</Text>
            </Col>
            <Col xs={24} md={16}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                {[
                  ['1', '暑假班结束', '先备份，再点击“结束并归档”'],
                  ['2', '开始新业务', '创建“周末晚托班”等新批次'],
                  ['3', '正常运营', '在空白名单中添加本期学员和班级'],
                ].map(([step, title, description]) => (
                  <div key={step} style={{ borderRadius: 12, background: 'var(--color-surface-3, #f5f2ee)', padding: 14 }}>
                    <Tag color="orange" style={{ marginBottom: 8 }}>第 {step} 步</Tag>
                    <div style={{ fontWeight: 700 }}>{title}</div>
                    <Text type="secondary" style={{ fontSize: 13 }}>{description}</Text>
                  </div>
                ))}
              </div>
            </Col>
          </Row>
        </Card>

        <Row gutter={[12, 12]}>
          <Col xs={12} md={6}><Card><Statistic title="全部批次" value={terms.length} prefix={<CalendarOutlined />} /></Card></Col>
          <Col xs={12} md={6}><Card><Statistic title="当前学员" value={activeTerm?._count.memberships || 0} prefix={<TeamOutlined />} /></Card></Col>
          <Col xs={12} md={6}><Card><Statistic title="当前班级" value={activeTerm?._count.classGroups || 0} /></Card></Col>
          <Col xs={12} md={6}><Card><Statistic title="历史归档" value={terms.filter((term) => term.status === 'ARCHIVED').length} /></Card></Col>
        </Row>

        {terms.length === 0 && !isLoading ? (
          <Card><Empty description="还没有运营批次"><Button type="primary" onClick={() => setCreateOpen(true)}>创建第一期</Button></Empty></Card>
        ) : (
          <Row gutter={[16, 16]}>
            {terms.map((term) => (
              <Col xs={24} lg={12} key={term.id}>
                <Card
                  style={{ height: '100%', borderColor: term.status === 'ACTIVE' ? 'rgba(29,158,117,.35)' : undefined }}
                  title={<Space wrap><span>{term.name}</span><Tag>{KIND_LABEL[term.kind]}</Tag><Tag color={STATUS_COLOR[term.status]}>{STATUS_LABEL[term.status]}</Tag>{selectedTermId === term.id && <Tag color="blue">正在查看</Tag>}</Space>}
                >
                  <Space direction="vertical" size={14} style={{ width: '100%' }}>
                    <Text type="secondary">{dayjs(term.startDate).format('YYYY-MM-DD')} 至 {dayjs(term.endDate).format('YYYY-MM-DD')} · 编号 {term.code}</Text>
                    {term.description && <Paragraph style={{ margin: 0 }}>{term.description}</Paragraph>}
                    <Row gutter={8}>
                      <Col span={12}><Statistic title="本期学员" value={term._count.memberships} valueStyle={{ fontSize: 24 }} /></Col>
                      <Col span={12}><Statistic title="本期班级" value={term._count.classGroups} valueStyle={{ fontSize: 24 }} /></Col>
                    </Row>
                    <Space wrap>
                      <Button icon={<EyeOutlined />} loading={busy} onClick={() => void openTermStudents(term)}>
                        {term.status === 'ARCHIVED' ? '查看本期档案' : '打开学员名单'}
                      </Button>
                      {term.status === 'DRAFT' && (
                        <Button type="primary" icon={<CheckCircleOutlined />} loading={busy} onClick={() => modal.confirm({
                          title: `进入“${term.name}”工作区？`,
                          content: '当前工作区会自动归档，全部历史记录仍然保留。这个新批次可以从空白名单开始添加学员。',
                          onOk: () => requestAction(term.id, 'activate', '已切换到新批次'),
                        })}>启用并进入</Button>
                      )}
                      {term.status === 'ACTIVE' && (
                        <Button danger icon={<InboxOutlined />} loading={busy} onClick={() => modal.confirm({
                          title: `结束并归档“${term.name}”？`,
                          content: '建议先下载数据库备份。归档不会删除学员、课程、反馈、考勤或财务记录。',
                          onOk: () => requestAction(term.id, 'archive', '本期已结束并归档'),
                        })}>结束并归档</Button>
                      )}
                      {term.status === 'DRAFT' && term._count.memberships === 0 && term._count.classGroups === 0 && term._count.studyPlans === 0 && (
                        <Button danger icon={<DeleteOutlined />} loading={busy} onClick={() => modal.confirm({
                          title: `删除空白批次“${term.name}”？`,
                          content: '只会删除这个尚未使用的空白批次。',
                          okButtonProps: { danger: true },
                          onOk: () => deleteTerm(term),
                        })}>删除空白批次</Button>
                      )}
                    </Space>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Space>

      <Modal title="创建并进入新批次" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={createTerm} confirmLoading={busy} width={620} okText="创建并进入">
        <Alert type="info" showIcon message="新批次从空白名单开始" description="当前工作区会自动归档。旧学员、账号和全部业务记录不会删除，也不会自动复制到新批次。" style={{ marginBottom: 16 }} />
        <Form form={createForm} layout="vertical" initialValues={{ kind: 'WEEKEND' }}>
          <Form.Item name="name" label="批次名称" rules={[{ required: true, message: '请输入名称' }]}><Input placeholder="例如：牧哲学堂周末晚托班" maxLength={60} /></Form.Item>
          <Form.Item name="kind" label="业务类型" rules={[{ required: true }]}><Select options={Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label }))} /></Form.Item>
          <Form.Item name="period" label="起止日期" rules={[{ required: true, message: '请选择日期范围' }]}><DatePicker.RangePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="description" label="说明（可选）"><Input.TextArea rows={3} placeholder="记录本期课程安排或运营说明" maxLength={500} /></Form.Item>
        </Form>
      </Modal>

      <Drawer title="备份与恢复" open={backupOpen} onClose={() => setBackupOpen(false)} width={isMobile ? '100%' : 760}>
        <Alert type="warning" showIcon message="归档前建议先创建完整备份" description="归档是系统内的逻辑隔离，不等于数据库备份。备份文件用于服务器故障或误操作后的恢复。" style={{ marginBottom: 16 }} />
        <BackupRestorePanel backupOnly />
        <Button href="/data-admin" icon={<CloudDownloadOutlined />}>进入高级恢复与数据管理</Button>
      </Drawer>
    </div>
  )
}
