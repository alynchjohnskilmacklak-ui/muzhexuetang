'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Image,
  Input,
  List,
  Popconfirm,
  QRCode,
  Row,
  Segmented,
  Select,
  Space,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import { BrandModal } from '@/components/Common/BrandModal'
import {
  CheckCircleOutlined,
  CopyOutlined,
  KeyOutlined,
  LinkOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
  WechatOutlined,
} from '@ant-design/icons'
import useSWR from 'swr'
import { toast } from 'sonner'
import { PageLayout } from '@/components/Layout/PageLayout'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Title, Text, Paragraph } = Typography

const fetcher = (url: string) =>
  fetch(url).then(async (response) => {
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || '加载家长账号失败')
    return payload
  })

type ParentAccount = {
  id: string
  name: string
  email: string
  status: string
  lastLoginAt?: string | null
  qywxExternalUserId?: string | null
  students: Array<{ id: string; name: string; grade?: string | null }>
  activationTokens: Array<{ expiresAt: string }>
}

type AcademicTermOption = {
  id: string
  name: string
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
}

type QywxStaff = {
  id: string
  name: string
  role: string
  qywxUserId: string | null
}

type QywxContact = { external_userid: string; name: string; member: string; bound: boolean }

type QywxParent = {
  id: string
  name: string
  phone: string | null
  children: string[]
  students: Array<{ id: string; name: string; grade: string | null }>
  qywxExternalUserId: string | null
  qywxSenderUserId: string | null
}

type QywxBindingData = {
  parents: QywxParent[]
  contacts: QywxContact[]
  staff: QywxStaff[]
  matchedStaffCount: number
  wecomError: string | null
}

export default function ParentAccessPage() {
  const isMobile = useIsMobile() ?? false
  const { data: termData, error: termError } = useSWR<{
    terms: AcademicTermOption[]
    selectedTermId?: string | null
  }>('/api/admin/academic-terms', fetcher)
  const [selectedTermId, setSelectedTermId] = useState<string>()
  const [activeTab, setActiveTab] = useState('activation')
  const [staffValues, setStaffValues] = useState<Record<string, string>>({})
  const [staffBindingId, setStaffBindingId] = useState<string>()
  const [parentSelections, setParentSelections] = useState<Record<string, { externalUserId: string; senderUserId: string }>>({})

  useEffect(() => {
    if (!termData) return
    if (selectedTermId && termData.terms.some((term) => term.id === selectedTermId)) return
    const preferred = termData.selectedTermId
      || termData.terms.find((term) => term.status === 'ACTIVE')?.id
      || termData.terms[0]?.id
    setSelectedTermId(preferred)
  }, [termData, selectedTermId])

  const selectedTerm = termData?.terms.find((term) => term.id === selectedTermId)
  const accountUrl = termData
    ? termData.terms.length > 0
      ? selectedTermId ? `/api/admin/parent-activation?termId=${encodeURIComponent(selectedTermId)}` : null
      : '/api/admin/parent-activation'
    : null
  const { data, isLoading, mutate } = useSWR<{ accounts: ParentAccount[] }>(
    accountUrl,
    fetcher,
  )
  const qywxUrl = activeTab === 'activation'
    ? null
    : `/api/qywx/bind-management${selectedTermId ? `?termId=${encodeURIComponent(selectedTermId)}` : ''}`
  const {
    data: qywxData,
    error: qywxError,
    isLoading: qywxLoading,
    mutate: mutateQywx,
  } = useSWR<QywxBindingData>(qywxUrl, fetcher)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [issuingId, setIssuingId] = useState<string>()
  const [issued, setIssued] = useState<{
    activationUrl: string
    expiresAt: string
    parent: { name: string; email: string }
  } | null>(null)
  const [bindingId, setBindingId] = useState<string>()
  const [bindQr, setBindQr] = useState<{
    parentName: string
    qrCode: string
  } | null>(null)

  const rawAccounts = useMemo(() => data?.accounts || [], [data])

  // Statistics
  const stats = useMemo(() => {
    const total = rawAccounts.length
    const pendingActivation = rawAccounts.filter((a) => a.activationTokens.length > 0).length
    const active = rawAccounts.filter((a) => a.status === 'active').length
    return { total, pendingActivation, active }
  }, [rawAccounts])

  // Filtered accounts
  const accounts = useMemo(() => {
    return rawAccounts.filter((account) => {
      if (statusFilter === 'PENDING' && account.activationTokens.length === 0) return false
      if (statusFilter === 'ACTIVE' && account.status !== 'active') return false

      if (keyword.trim()) {
        const normalized = keyword.trim().toLowerCase()
        const match = [
          account.name,
          account.email,
          ...account.students.map((student) => student.name),
        ].some((value) => value?.toLowerCase().includes(normalized))
        if (!match) return false
      }

      return true
    })
  }, [rawAccounts, keyword, statusFilter])

  const issue = async (account: ParentAccount) => {
    setIssuingId(account.id)
    try {
      const response = await fetch('/api/admin/parent-activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentUserId: account.id, termId: selectedTermId }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '生成失败')
      setIssued(payload)
      await mutate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成失败')
    } finally {
      setIssuingId(undefined)
    }
  }

  const copyLink = async () => {
    if (!issued) return
    await navigator.clipboard.writeText(issued.activationUrl)
    toast.success('激活链接已复制，可直接发给家长微信')
  }

  const bindQywx = async (account: ParentAccount) => {
    setBindingId(account.id)
    try {
      const response = await fetch('/api/qywx/bind-qrcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentUserId: account.id, termId: selectedTermId }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '生成企微绑定二维码失败')
      if (payload.alreadyBound) {
        toast.success('该家长已绑定企业微信')
        await mutate()
        return
      }
      setBindQr({ parentName: account.name || '家长', qrCode: payload.qrCodeDataUrl || payload.qrCode })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成企微绑定二维码失败')
    } finally {
      setBindingId(undefined)
    }
  }

  const saveStaffBinding = async (staff: QywxStaff) => {
    const qywxUserId = (staffValues[staff.id] ?? staff.qywxUserId ?? '').trim()
    if (!qywxUserId) {
      toast.error('请填写企业微信通讯录中的成员 UserID')
      return
    }
    setStaffBindingId(staff.id)
    try {
      const response = await fetch('/api/qywx/bind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: staff.id, qywxUserId }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '员工企微绑定失败')
      toast.success(`${staff.role === 'admin' ? '管理端' : '教师'}企微成员已绑定`)
      await mutateQywx()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '员工企微绑定失败')
    } finally {
      setStaffBindingId(undefined)
    }
  }

  const saveStudentBinding = async (parent: QywxParent) => {
    const selection = parentSelections[parent.id]
    if (!selection) {
      toast.error('请先选择企业微信联系人及负责发送的成员')
      return
    }
    setBindingId(parent.id)
    try {
      const response = await fetch('/api/qywx/bind-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: parent.id,
          externalUserId: selection.externalUserId,
          senderUserId: selection.senderUserId,
          termId: selectedTermId,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '学员企微关联失败')
      toast.success('家长企微联系人已绑定')
      setParentSelections((current) => {
        const next = { ...current }
        delete next[parent.id]
        return next
      })
      await mutateQywx()
      await mutate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '学员企微关联失败')
    } finally {
      setBindingId(undefined)
    }
  }

  const unbindStudentParent = async (parent: QywxParent) => {
    setBindingId(parent.id)
    try {
      const query = new URLSearchParams({ userId: parent.id })
      if (selectedTermId) query.set('termId', selectedTermId)
      const response = await fetch(`/api/qywx/bind-management?${query.toString()}`, { method: 'DELETE' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '解除家长企微绑定失败')
      toast.success('已解除家长企微绑定')
      await mutateQywx()
      await mutate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '解除家长企微绑定失败')
    } finally {
      setBindingId(undefined)
    }
  }

  const renderStaffTab = (role: 'admin' | 'teacher') => {
    const staff = (qywxData?.staff || []).filter((item) => item.role === role)
    return (
      <Card bordered={false} style={{ border: '1px solid var(--color-hairline)', borderRadius: 14 }}>
        <Alert
          type="info"
          showIcon
          message="填写企业微信通讯录中的成员 UserID"
          description="保存后，系统发送给该员工的企业微信通知会使用此成员身份。"
          style={{ marginBottom: 12 }}
        />
        {qywxError ? (
          <Alert type="error" showIcon message="加载企业微信成员失败" description={qywxError.message} />
        ) : staff.length === 0 && !qywxLoading ? (
          <Empty description={`当前校区暂无可绑定的${role === 'admin' ? '管理端' : '教师'}账号`} />
        ) : (
          <List
            loading={qywxLoading}
            dataSource={staff}
            renderItem={(item) => (
              <List.Item style={{ padding: isMobile ? '12px 4px' : '14px 8px' }}>
                <div style={{ display: 'flex', width: '100%', gap: 12, alignItems: isMobile ? 'stretch' : 'center', flexWrap: 'wrap' }}>
                  <Avatar icon={<UserOutlined />} style={{ background: 'var(--color-brand-gold-bg)', color: 'var(--color-brand-gold)', flexShrink: 0 }} />
                  <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                    <Text strong>{item.name}</Text>
                    <div style={{ marginTop: 3 }}>
                      <Tag color={item.qywxUserId ? 'success' : 'default'}>{item.qywxUserId ? '已关联企微成员' : '尚未关联'}</Tag>
                    </div>
                  </div>
                  <Space.Compact style={{ width: isMobile ? '100%' : 380, maxWidth: '100%' }}>
                    <Input
                      aria-label={`${item.name}的企业微信成员 UserID`}
                      value={staffValues[item.id] ?? item.qywxUserId ?? ''}
                      onChange={(event) => setStaffValues((current) => ({ ...current, [item.id]: event.target.value }))}
                      placeholder="企业微信通讯录成员 UserID"
                      autoComplete="off"
                      maxLength={128}
                    />
                    <Button type="primary" loading={staffBindingId === item.id} onClick={() => saveStaffBinding(item)} disabled={qywxLoading || Boolean(staffBindingId)}>
                      保存企微绑定
                    </Button>
                  </Space.Compact>
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>
    )
  }

  const renderStudentBindings = () => {
    if (qywxError) {
      return <Alert type="error" showIcon message="加载企业微信联系人失败" description={qywxError.message} />
    }
    const parents = qywxData?.parents || []
    const contacts = qywxData?.contacts || []
    const staff = qywxData?.staff || []
    return (
      <Card bordered={false} style={{ border: '1px solid var(--color-hairline)', borderRadius: 14 }} styles={{ body: { padding: isMobile ? 8 : 16 } }}>
        {qywxData?.wecomError && <Alert type="warning" showIcon message="企微联系人暂时无法读取" description={qywxData.wecomError} style={{ marginBottom: 12 }} />}
        <Alert
          type="info"
          showIcon
          message={`当前批次：${selectedTerm?.name || '全部批次'}`}
          description="家长和学员按所选批次筛选。企微联系人绑定在家长账号上，系统发给该家长的学员通知会使用此联系人。"
          style={{ marginBottom: 12 }}
        />
        <List
          loading={qywxLoading}
          dataSource={parents}
          locale={{ emptyText: <Empty description="所选批次暂无可关联的家长和学员" /> }}
          renderItem={(parent) => {
            const isBound = Boolean(parent.qywxExternalUserId)
            const boundContact = contacts.find((contact) => contact.external_userid === parent.qywxExternalUserId)
            const boundStaff = staff.find((member) => member.qywxUserId === parent.qywxSenderUserId)
            const availableContacts = contacts.filter((contact) =>
              !contact.bound && !parents.some((other) => other.id !== parent.id && other.qywxExternalUserId === contact.external_userid),
            )
            const selectedValue = parentSelections[parent.id] ? JSON.stringify(parentSelections[parent.id]) : undefined
            const options = availableContacts.map((contact) => ({
              value: JSON.stringify({ externalUserId: contact.external_userid, senderUserId: contact.member }),
              label: `${contact.name}${staff.find((member) => member.qywxUserId === contact.member)?.name ? ` · ${staff.find((member) => member.qywxUserId === contact.member)?.name}` : ''}`,
            }))
            const selectedOption = options.find((option) => option.value === selectedValue)
            return (
              <List.Item key={parent.id} style={{ padding: isMobile ? '10px 4px' : '12px 8px' }}>
                <Card size="small" style={{ width: '100%', borderRadius: 10 }}>
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      <div>
                        <Text strong>{parent.name || '家长'}</Text>
                        <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{parent.phone || '未登记手机号'}</Text>
                      </div>
                      <Tag color={isBound ? 'success' : 'default'}>{isBound ? '已关联' : '待关联'}</Tag>
                    </div>
                    <Text style={{ fontSize: 13, lineHeight: 1.6 }}>
                      本批次学员：{parent.students.map((student) => `${student.name}${student.grade ? `（${student.grade}）` : ''}`).join('、') || '无'}
                    </Text>
                    {isBound ? (
                      <>
                        <Alert
                          type="success"
                          showIcon
                          message={`企微联系人：${boundContact?.name || parent.qywxExternalUserId}`}
                          description={boundStaff ? `发送成员：${boundStaff.name}` : parent.qywxSenderUserId ? `发送成员 ID：${parent.qywxSenderUserId}` : undefined}
                        />
                        <Popconfirm
                          title="解除家长企微绑定？"
                          description="此绑定属于家长账号，解除后该账号在其他批次的企微通知也会受影响。"
                          okText="解除绑定"
                          cancelText="保留绑定"
                          okButtonProps={{ danger: true, loading: bindingId === parent.id }}
                          onConfirm={() => { void unbindStudentParent(parent) }}
                        >
                          <Button danger loading={bindingId === parent.id} disabled={Boolean(bindingId)}>
                            解除家长企微绑定
                          </Button>
                        </Popconfirm>
                      </>
                    ) : (
                      <Space direction="vertical" size={8} style={{ display: 'flex' }}>
                        <Select
                          aria-label={`为${parent.name}选择企微联系人`}
                          value={selectedValue}
                          options={options}
                          onChange={(value) => {
                            const next = JSON.parse(String(value)) as { externalUserId: string; senderUserId: string }
                            setParentSelections((current) => ({ ...current, [parent.id]: next }))
                          }}
                          placeholder={availableContacts.length ? '选择企微联系人及发送成员' : '暂无可分配联系人，请先绑定管理端或教师 UserID'}
                          showSearch={options.length > 5}
                          optionFilterProp="label"
                          getPopupContainer={(trigger) => trigger.parentElement || document.body}
                          listHeight={240}
                          virtual={false}
                          disabled={qywxLoading || options.length === 0 || Boolean(bindingId)}
                          style={{ width: '100%' }}
                          notFoundContent="没有可用联系人"
                        />
                        <Button type="primary" icon={<WechatOutlined />} loading={bindingId === parent.id} disabled={!selectedOption || Boolean(bindingId)} onClick={() => saveStudentBinding(parent)}>
                          绑定家长企微联系人
                        </Button>
                      </Space>
                    )}
                  </Space>
                </Card>
              </List.Item>
            )
          }}
        />
      </Card>
    )
  }

  return (
    <PageLayout
      title="家长激活与企微绑定"
      subtitle="按运营批次管理家长账号，并分别关联管理端、教师及本批次学员的企业微信身份"
      actions={
        <Button icon={<ReloadOutlined />} onClick={() => { void mutate(); if (activeTab !== 'activation') void mutateQywx() }} loading={isLoading || qywxLoading}>
          刷新
        </Button>
      }
    >
      <Card bordered={false} style={{ border: '1px solid #EEE7E1', borderRadius: 12, marginBottom: 14 }} styles={{ body: { padding: 12 } }}>
        <Space direction={isMobile ? 'vertical' : 'horizontal'} align={isMobile ? 'start' : 'center'} size={10} style={{ display: 'flex' }}>
          <Text strong style={{ whiteSpace: 'nowrap' }}>运营批次</Text>
          <Select
            aria-label="选择运营批次"
            value={selectedTermId}
            loading={!termData && !termError}
            disabled={!termData?.terms.length || Boolean(termError)}
            onChange={(value) => {
              setSelectedTermId(value)
              setStatusFilter('ALL')
              setKeyword('')
              setParentSelections({})
            }}
            options={termData?.terms.map((term) => ({
              value: term.id,
              label: `${term.name}${term.status === 'ACTIVE' ? '（当前）' : term.status === 'ARCHIVED' ? '（归档）' : '（未启用）'}`,
            })) || []}
            placeholder="选择要查看的批次"
            getPopupContainer={(trigger) => trigger.parentElement || document.body}
            listHeight={280}
            virtual={false}
            style={{ width: isMobile ? '100%' : 360, maxWidth: '100%' }}
          />
          {selectedTerm && <Text type="secondary" style={{ fontSize: 12 }}>列表只包含该批次内有学员的家长</Text>}
        </Space>
        {termError && <Alert type="error" showIcon message="加载运营批次失败" description={termError.message} style={{ marginTop: 10 }} />}
        {termData && termData.terms.length === 0 && <Alert type="info" showIcon message="当前校区还没有运营批次，家长激活列表暂按全部家长显示。" style={{ marginTop: 10 }} />}
      </Card>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        destroyOnHidden
        items={[
          { key: 'activation', label: '家长激活' },
          { key: 'admin', label: '管理端绑定' },
          { key: 'teacher', label: '教师绑定' },
          { key: 'student', label: '学员企微关联' },
        ]}
        style={{ marginBottom: 12 }}
      />

      {activeTab === 'activation' && (
        <>
      {/* 3 KPI metric cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8}>
          <Card
            className="pressable"
            bordered={false}
            style={{
              borderRadius: 12,
              border: statusFilter === 'ALL' ? '2px solid #14574D' : '1px solid #EEE7E1',
              background: '#FAF8F5',
              cursor: 'pointer',
            }}
            styles={{ body: { padding: '14px 16px' } }}
            onClick={() => setStatusFilter('ALL')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#8D806F' }}>全部家长账号</span>
              <UserOutlined style={{ color: '#14574D', fontSize: 15 }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#14574D', marginTop: 4 }}>
              {stats.total}
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={8}>
          <Card
            className="pressable"
            bordered={false}
            style={{
              borderRadius: 12,
              border: statusFilter === 'PENDING' ? '2px solid #E8784A' : '1px solid #EEE7E1',
              background: '#FFF9F5',
              cursor: 'pointer',
            }}
            styles={{ body: { padding: '14px 16px' } }}
            onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#8D806F' }}>激活链接待使用</span>
              <KeyOutlined style={{ color: '#E8784A', fontSize: 15 }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#E8784A', marginTop: 4 }}>
              {stats.pendingActivation}
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card
            className="pressable"
            bordered={false}
            style={{
              borderRadius: 12,
              border: statusFilter === 'ACTIVE' ? '2px solid #27A644' : '1px solid #EEE7E1',
              background: '#F0FDF4',
              cursor: 'pointer',
            }}
            styles={{ body: { padding: '14px 16px' } }}
            onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#8D806F' }}>可正常登录</span>
              <CheckCircleOutlined style={{ color: '#27A644', fontSize: 15 }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#27A644', marginTop: 4 }}>
              {stats.active}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Search & Filter Bar */}
      <Card
        bordered={false}
        style={{ borderRadius: 12, border: '1px solid #EEE7E1', marginBottom: 16 }}
        styles={{ body: { padding: 14 } }}
      >
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Segmented
            value={statusFilter}
            onChange={(val) => setStatusFilter(String(val))}
            options={[
              { label: `全部 (${stats.total})`, value: 'ALL' },
              { label: `待使用 (${stats.pendingActivation})`, value: 'PENDING' },
              { label: `可登录 (${stats.active})`, value: 'ACTIVE' },
            ]}
          />
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: '#8D806F' }} />}
            placeholder="搜索家长账号、邮箱或孩子姓名..."
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            style={{ width: isMobile ? '100%' : 280, borderRadius: 8 }}
          />
        </Space>
      </Card>

      {/* Account List */}
      <Card
        bordered={false}
        style={{ borderRadius: 14, border: '1px solid #EEE7E1' }}
        styles={{ body: { padding: isMobile ? 8 : 16 } }}
      >
        <List
          loading={isLoading}
          dataSource={accounts}
          locale={{ emptyText: <Empty description="暂无匹配的家长账号" /> }}
          renderItem={(account) => {
            const hasPendingToken = account.activationTokens.length > 0
            const isSelfReady = account.status === 'active'

            return (
              <List.Item
                style={{
                  padding: isMobile ? '12px 8px' : '14px 12px',
                  borderBottom: '1px solid #F2ECE4',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    width: '100%',
                    gap: 12,
                    alignItems: isMobile ? 'flex-start' : 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <Avatar
                    icon={<UserOutlined />}
                    size={44}
                    style={{
                      backgroundColor: '#FAF0E6',
                      color: '#8A6517',
                      borderRadius: 12,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                    <Space wrap size={6}>
                      <span style={{ fontWeight: 600, fontSize: 15, color: '#1F2329' }}>
                        {account.name || '家长'}
                      </span>
                      <Tag
                        color={isSelfReady ? 'success' : 'default'}
                        style={{ borderRadius: 6, margin: 0 }}
                      >
                        {isSelfReady ? '可登录' : account.status}
                      </Tag>
                      {hasPendingToken && (
                        <Tag color="orange" style={{ borderRadius: 6, margin: 0 }}>
                          链接待使用
                        </Tag>
                      )}
                      {account.qywxExternalUserId && (
                        <Tag color="green" icon={<WechatOutlined />} style={{ borderRadius: 6, margin: 0 }}>
                          已绑定企业微信
                        </Tag>
                      )}
                    </Space>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                      <Text style={{ fontSize: 12, color: '#8D806F', wordBreak: 'break-all' }}>
                        账号/邮箱：<span style={{ color: '#1F2329' }}>{account.email}</span>
                      </Text>
                      <Text style={{ fontSize: 12, color: '#8D806F' }}>
                        绑定学员：
                        <span style={{ color: '#1F2329' }}>
                          {account.students
                            .map((student) => `${student.name}${student.grade ? ` (${student.grade})` : ''}`)
                            .join('、') || '尚未绑定学员'}
                        </span>
                      </Text>
                    </div>
                  </div>
                  <Space size={8} wrap style={{ flexShrink: 0, marginLeft: isMobile ? 0 : 'auto' }}>
                    <Button
                      key="qywx"
                      icon={<WechatOutlined />}
                      loading={bindingId === account.id}
                      onClick={() => bindQywx(account)}
                      style={{
                        borderRadius: 8,
                        borderColor: 'var(--color-primary, #14574D)',
                        color: 'var(--color-primary, #14574D)',
                      }}
                    >
                      企微绑定
                    </Button>
                    <Button
                      key="issue"
                      type="primary"
                      ghost={!isMobile}
                      icon={hasPendingToken ? <QrcodeOutlined /> : <LinkOutlined />}
                      loading={issuingId === account.id}
                      onClick={() => issue(account)}
                      style={{
                        borderRadius: 8,
                        borderColor: 'var(--color-primary, #14574D)',
                        color: isMobile ? undefined : 'var(--color-primary, #14574D)',
                        background: isMobile ? 'var(--color-primary, #14574D)' : undefined,
                      }}
                    >
                      {hasPendingToken ? '重新生成' : '生成登录链接'}
                    </Button>
                  </Space>
                </div>
              </List.Item>
            )
          }}
        />
      </Card>
        </>
      )}

      {activeTab === 'admin' && renderStaffTab('admin')}
      {activeTab === 'teacher' && renderStaffTab('teacher')}
      {activeTab === 'student' && renderStudentBindings()}

      {/* 企微绑定二维码 */}
      <BrandModal
        open={Boolean(bindQr)}
        title="企业微信绑定二维码"
        footer={null}
        onCancel={() => {
          setBindQr(null)
          void mutate()
        }}
        width={isMobile ? 'calc(100vw - 24px)' : 420}
      >
        {bindQr && (
          <Space direction="vertical" align="center" size={12} style={{ width: '100%' }}>
            <Text strong style={{ fontSize: 15 }}>
              {bindQr.parentName} · 企业微信绑定
            </Text>
            <Image
              src={bindQr.qrCode}
              alt="企业微信绑定二维码"
              width={isMobile ? 200 : 220}
              height={isMobile ? 200 : 220}
              preview={false}
              style={{ borderRadius: 10, background: '#fff', border: '1px solid #F2ECE4' }}
            />
            <Text style={{ fontSize: 12, color: '#8D806F', textAlign: 'center' }}>
              家长用微信扫码 → 微信会弹出「添加企业微信联系人」→ 确认后系统自动完成绑定。
            </Text>
            <Text style={{ fontSize: 12, color: '#8D806F', textAlign: 'center' }}>
              扫完后点下面的按钮刷新，该家长会显示「已绑定企业微信」。
            </Text>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                void mutate()
                toast.success('已刷新绑定状态')
              }}
            >
              刷新绑定状态
            </Button>
          </Space>
        )}
      </BrandModal>

      {/* QR Code and Activation Link Modal */}
      <BrandModal
        open={Boolean(issued)}
        title="家长一次性激活入口"
        footer={null}
        onCancel={() => setIssued(null)}
        width={isMobile ? 'calc(100vw - 24px)' : 480}
      >
        {issued && (
          <Space
            direction="vertical"
            align="center"
            size={16}
            style={{ width: '100%', textAlign: 'center', padding: '12px 0' }}
          >
            <div
              style={{
                padding: 16,
                background: '#FFFFFF',
                borderRadius: 16,
                border: '1px solid #EEE7E1',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              }}
            >
              <QRCode value={issued.activationUrl} size={isMobile ? 220 : 250} color="#1A1201" />
            </div>

            <div>
              <Title level={4} style={{ margin: '0 0 2px' }}>
                {issued.parent.name || '家长'}
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {issued.parent.email}
              </Text>
            </div>

            <Paragraph style={{ margin: 0, fontSize: 13, color: '#5A4E3A', lineHeight: 1.6 }}>
              请家长使用微信扫码，核对绑定的孩子姓名后设置登录密码。
              <br />
              链接在 7 天内有效且只能激活使用一次。
            </Paragraph>

            <Input.TextArea
              value={issued.activationUrl}
              autoSize
              readOnly
              style={{ borderRadius: 8, fontSize: 12, background: '#FAF8F5' }}
            />

            <Button
              type="primary"
              size="large"
              icon={<CopyOutlined />}
              block
              onClick={copyLink}
              style={{
                borderRadius: 10,
                background: 'var(--color-primary, #14574D)',
                borderColor: 'var(--color-primary, #14574D)',
                height: 44,
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              复制链接发给家长微信
            </Button>

            <Text type="secondary" style={{ fontSize: 12 }}>
              提示：重新生成会立即作废旧链接；若家长已有密码，不会影响原登录。
            </Text>
          </Space>
        )}
      </BrandModal>
    </PageLayout>
  )
}
