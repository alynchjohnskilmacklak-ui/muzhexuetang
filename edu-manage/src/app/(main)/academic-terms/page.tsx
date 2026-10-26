'use client'

import { useMemo, useState } from 'react'
import { Alert, Button, Card, Col, DatePicker, Drawer, Empty, Form, Input, Modal, Row, Select, Space, Typography } from 'antd'
import { BookOutlined, CalendarOutlined, CheckCircleOutlined, CloudDownloadOutlined, DeleteOutlined, EyeOutlined, InboxOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import useSWR, { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/useIsMobile'
import BackupRestorePanel from '@/components/DataAdmin/BackupRestorePanel'
import { isAdminTermScopedSWRKey } from '@/lib/admin-term-scope-client'

const { Title, Text } = Typography
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
              <Button icon={<CloudDownloadOutlined />} onClick={() => setBackupOpen(true)} style={{ borderRadius: 10, borderColor: '#D8C9A8', color: '#0E5E4E' }}>备份与恢复</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                createForm.setFieldsValue({ kind: 'WEEKEND' })
                setCreateOpen(true)
              }} style={{ background: 'linear-gradient(135deg,#0E5E4E,#123C35)', border: '1px solid rgba(201,164,92,.55)', borderRadius: 10, boxShadow: '0 6px 16px rgba(18,60,53,.2)' }}>
                创建并进入新批次
              </Button>
            </Space>
          </Col>
        </Row>

        {/* 当前工作区 · 深绿鎏金卡 */}
        <div style={{
          borderRadius: 18, overflow: 'hidden',
          border: activeTerm ? '1px solid rgba(201,164,92,.5)' : '1px dashed rgba(201,164,92,.6)',
          background: activeTerm
            ? 'linear-gradient(150deg,#17352F 0%,#0E5E4E 55%,#0B4B40 100%)'
            : 'linear-gradient(150deg,#F7F5F1,#F0E8DC)',
          boxShadow: activeTerm ? '0 10px 26px rgba(18,60,53,.2)' : 'none',
          color: activeTerm ? '#F5F1E8' : '#3A4A40',
          position: 'relative', padding: '16px 18px',
        }}>
          <div style={{ position: 'absolute', top: -46, right: -30, width: 170, height: 170, borderRadius: '50%', background: activeTerm ? 'radial-gradient(circle, rgba(201,164,92,.22), transparent 70%)' : 'none', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 700, letterSpacing: 1,
              color: activeTerm ? '#F2E3B6' : '#8A6B2F',
              background: activeTerm ? 'rgba(201,164,92,.16)' : 'rgba(201,164,92,.18)',
              border: activeTerm ? '1px solid rgba(201,164,92,.5)' : '1px solid rgba(201,164,92,.4)',
              padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap',
            }}>
              {activeTerm ? <><CheckCircleOutlined /> 当前工作区</> : <><InboxOutlined /> 未启用批次</>}
            </span>
            {activeTerm && (
              <span style={{ fontSize: 11, color: 'rgba(242,227,182,.7)', whiteSpace: 'nowrap' }}>
                学员、班级、排课、反馈默认只展示本批次
              </span>
            )}
          </div>
          <div style={{ marginTop: 12, fontSize: 18, fontWeight: 800, color: activeTerm ? '#F5F1E8' : '#3A4A40' }}>
            {activeTerm ? activeTerm.name : '目前没有正在使用的批次'}
          </div>
          <div style={{ marginTop: 4, fontSize: 12.5, color: activeTerm ? 'rgba(245,241,232,.72)' : '#8A8F98', lineHeight: 1.7 }}>
            {activeTerm
              ? '学员管理、班级、排课和反馈默认只展示这个批次。切换到历史批次时仅查看，不会混入当前名单。'
              : '可以创建一个全新的空白批次，也可以从下面选择一个未启用批次进入。'}
          </div>
          {activeTerm && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11.5, color: 'rgba(245,241,232,.7)' }}>运营周期</span>
              <span style={{
                fontSize: 11.5, fontWeight: 700, color: '#123C35',
                background: 'linear-gradient(135deg,#F2E3B6,#D8BC7C)',
                padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap',
              }}>
                {dayjs(activeTerm.startDate).format('YYYY-MM-DD')} 至 {dayjs(activeTerm.endDate).format('YYYY-MM-DD')}
              </span>
              <span style={{ fontSize: 11.5, color: 'rgba(245,241,232,.55)' }}>编号 {activeTerm.code}</span>
            </div>
          )}
        </div>

        {/* 怎么使用 */}
        <Card bordered={false} style={{ borderRadius: 16, background: '#ffffff', border: '1px solid #F0E9DF', boxShadow: '0 4px 14px rgba(58,50,39,.05)' }}>
          <Row gutter={[16, 12]} align="middle">
            <Col xs={24} md={7}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 13,
                  background: 'linear-gradient(145deg,#0E5E4E,#17352F)',
                  color: '#F2E3B6', display: 'grid', placeItems: 'center', fontSize: 17,
                  border: '1px solid rgba(201,164,92,.5)',
                }}><CalendarOutlined /></div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#1F2329' }}>怎么使用</div>
                  <div style={{ color: '#98A2B3', fontSize: 12.5 }}>不需要复制旧学员，也不需要每天创建</div>
                </div>
              </div>
            </Col>
            <Col xs={24} md={17}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                {[
                  { step: '1', title: '暑假班结束', description: '先备份，再点击「结束并归档」' },
                  { step: '2', title: '开始新业务', description: '创建「周末晚托班」等新批次' },
                  { step: '3', title: '正常运营', description: '在空白名单中添加本期学员和班级' },
                ].map((item, index) => (
                  <div key={item.step} style={{
                    borderRadius: 14, padding: 14,
                    background: 'linear-gradient(150deg,#F7F5F1,#FCFAF7)',
                    border: '1px solid #F0E9DF', position: 'relative',
                  }}>
                    {!isMobile && index < 2 && (
                      <div style={{ position: 'absolute', top: '50%', right: -10, transform: 'translateY(-50%)', color: '#C9A45C', fontSize: 14, zIndex: 1 }}>›</div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{
                        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                        display: 'grid', placeItems: 'center',
                        fontSize: 12.5, fontWeight: 800,
                        color: '#F2E3B6', background: 'linear-gradient(145deg,#0E5E4E,#123C35)',
                        border: '1px solid rgba(201,164,92,.5)',
                      }}>{item.step}</span>
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: '#1F2329' }}>{item.title}</span>
                    </div>
                    <div style={{ color: '#8A8F98', fontSize: 12.5, lineHeight: 1.6 }}>{item.description}</div>
                  </div>
                ))}
              </div>
            </Col>
          </Row>
        </Card>

        {/* 统计卡 */}
        <Row gutter={[12, 12]}>
          {[
            { label: '全部批次', value: terms.length, icon: <CalendarOutlined />, grad: 'linear-gradient(145deg,#4C8DFF,#2f6fdb)' },
            { label: '当前学员', value: activeTerm?._count.memberships || 0, icon: <TeamOutlined />, grad: 'linear-gradient(145deg,#27a644,#15804F)' },
            { label: '当前班级', value: activeTerm?._count.classGroups || 0, icon: <BookOutlined />, grad: 'linear-gradient(145deg,#FFB84D,#E8784A)' },
            { label: '历史归档', value: terms.filter((term) => term.status === 'ARCHIVED').length, icon: <InboxOutlined />, grad: 'linear-gradient(145deg,#8A8F98,#5A6470)' },
          ].map((item) => (
            <Col xs={12} md={6} key={item.label}>
              <Card bordered={false} style={{ borderRadius: 16, background: '#ffffff', border: '1px solid #F0E9DF', boxShadow: '0 4px 14px rgba(58,50,39,.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 13, flexShrink: 0,
                    background: item.grad, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 16,
                    boxShadow: '0 4px 10px rgba(58,50,39,.12)',
                  }}>{item.icon}</div>
                  <div>
                    <div style={{ color: '#1F2329', fontSize: 23, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{item.value}</div>
                    <div style={{ color: '#98A2B3', fontSize: 12, marginTop: 1 }}>{item.label}</div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {terms.length === 0 && !isLoading ? (
          <Card bordered={false} style={{ borderRadius: 16, border: '1px solid #F0E9DF' }}>
            <Empty description="还没有运营批次"><Button type="primary" onClick={() => setCreateOpen(true)} style={{ background: 'linear-gradient(135deg,#0E5E4E,#123C35)', border: '1px solid rgba(201,164,92,.55)' }}>创建第一期</Button></Empty>
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {terms.map((term) => {
              const isActive = term.status === 'ACTIVE'
              const isArchived = term.status === 'ARCHIVED'
              const isCurrentView = selectedTermId === term.id
              const statusCfg = isActive
                ? { text: '当前工作区', fg: '#123C35', bg: 'linear-gradient(135deg,#F2E3B6,#D8BC7C)', border: 'rgba(242,227,182,.7)' }
                : isArchived
                  ? { text: '历史归档', fg: '#8A6B2F', bg: 'rgba(201,164,92,.15)', border: 'rgba(201,164,92,.4)' }
                  : { text: '未启用', fg: '#8A8F98', bg: 'rgba(152,162,179,.1)', border: 'rgba(152,162,179,.3)' }
              return (
                <Col xs={24} lg={12} key={term.id}>
                  <div style={{
                    borderRadius: 16, overflow: 'hidden', height: '100%',
                    border: isActive ? '1px solid rgba(201,164,92,.5)' : '1px solid #F0E9DF',
                    background: isActive
                      ? 'linear-gradient(155deg,#17352F 0%,#0E5E4E 60%,#0B4B40 100%)'
                      : '#ffffff',
                    boxShadow: isActive ? '0 10px 26px rgba(18,60,53,.2)' : '0 4px 14px rgba(58,50,39,.05)',
                  }}>
                    {isActive && <div style={{ height: 4, background: 'linear-gradient(90deg,#C9A45C,#F2E3B6 60%,#C9A45C)' }} />}
                    <div style={{ padding: '15px 16px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color: isActive ? '#F5F1E8' : '#1F2329' }}>{term.name}</span>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 999, whiteSpace: 'nowrap',
                              color: isActive ? '#F2E3B6' : '#8A6B2F',
                              background: isActive ? 'rgba(201,164,92,.16)' : 'rgba(201,164,92,.12)',
                              border: isActive ? '1px solid rgba(201,164,92,.5)' : '1px solid rgba(201,164,92,.3)',
                            }}>{KIND_LABEL[term.kind]}</span>
                          </div>
                          <div style={{
                            marginTop: 6, fontSize: 12,
                            color: isActive ? 'rgba(245,241,232,.7)' : '#98A2B3',
                          }}>
                            {dayjs(term.startDate).format('YYYY-MM-DD')} 至 {dayjs(term.endDate).format('YYYY-MM-DD')} · 编号 {term.code}
                          </div>
                          {term.description && (
                            <div style={{
                              marginTop: 8, fontSize: 12.5, lineHeight: 1.7,
                              color: isActive ? 'rgba(245,241,232,.82)' : '#5A4E3A',
                              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                            }}>{term.description}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999, whiteSpace: 'nowrap',
                            color: statusCfg.fg, background: statusCfg.bg, border: `1px solid ${statusCfg.border}`,
                          }}>{statusCfg.text}</span>
                          {isCurrentView && (
                            <span style={{
                              fontSize: 10.5, fontWeight: 700, padding: '1px 8px', borderRadius: 999, whiteSpace: 'nowrap',
                              color: '#F2E3B6', background: 'rgba(47,111,219,.2)', border: '1px solid rgba(47,111,219,.5)',
                            }}>正在查看</span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8, marginTop: 13 }}>
                        <div style={{
                          borderRadius: 12, padding: '10px 12px',
                          background: isActive ? 'rgba(255,255,255,.08)' : '#F7F5F1',
                          border: isActive ? '1px solid rgba(242,227,182,.22)' : '1px solid #EFE8DD',
                        }}>
                          <div style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: isActive ? '#F5F1E8' : '#1F2329' }}>{term._count.memberships}</div>
                          <div style={{ fontSize: 11.5, marginTop: 1, color: isActive ? 'rgba(245,241,232,.65)' : '#98A2B3' }}>本期学员</div>
                        </div>
                        <div style={{
                          borderRadius: 12, padding: '10px 12px',
                          background: isActive ? 'rgba(255,255,255,.08)' : '#F7F5F1',
                          border: isActive ? '1px solid rgba(242,227,182,.22)' : '1px solid #EFE8DD',
                        }}>
                          <div style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: isActive ? '#F5F1E8' : '#1F2329' }}>{term._count.classGroups}</div>
                          <div style={{ fontSize: 11.5, marginTop: 1, color: isActive ? 'rgba(245,241,232,.65)' : '#98A2B3' }}>本期班级</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 13 }}>
                        <Button size="small" icon={<EyeOutlined />} loading={busy} onClick={() => void openTermStudents(term)}
                          style={isActive ? { borderColor: 'rgba(242,227,182,.4)', color: '#F2E3B6', background: 'rgba(255,255,255,.06)' } : undefined}>
                          {term.status === 'ARCHIVED' ? '查看本期档案' : '打开学员名单'}
                        </Button>
                        {term.status === 'DRAFT' && (
                          <Button size="small" type="primary" icon={<CheckCircleOutlined />} loading={busy} onClick={() => modal.confirm({
                            title: `进入“${term.name}”工作区？`,
                            content: '当前工作区会自动归档，全部历史记录仍然保留。这个新批次可以从空白名单开始添加学员。',
                            onOk: () => requestAction(term.id, 'activate', '已切换到新批次'),
                          })} style={{ background: 'linear-gradient(135deg,#0E5E4E,#123C35)', border: '1px solid rgba(201,164,92,.55)' }}>启用并进入</Button>
                        )}
                        {term.status === 'ACTIVE' && (
                          <Button size="small" danger icon={<InboxOutlined />} loading={busy} onClick={() => modal.confirm({
                            title: `结束并归档“${term.name}”？`,
                            content: '建议先下载数据库备份。归档不会删除学员、课程、反馈、考勤或财务记录。',
                            onOk: () => requestAction(term.id, 'archive', '本期已结束并归档'),
                          })}>结束并归档</Button>
                        )}
                        {term.status === 'DRAFT' && term._count.memberships === 0 && term._count.classGroups === 0 && term._count.studyPlans === 0 && (
                          <Button size="small" danger icon={<DeleteOutlined />} loading={busy} onClick={() => modal.confirm({
                            title: `删除空白批次“${term.name}”？`,
                            content: '只会删除这个尚未使用的空白批次。',
                            okButtonProps: { danger: true },
                            onOk: () => deleteTerm(term),
                          })}>删除空白批次</Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Col>
              )
            })}
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
