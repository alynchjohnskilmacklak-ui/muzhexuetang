'use client'
import { AdaptiveSelect } from '@/components/AdaptiveSelect';

import { useState, useEffect, type ReactNode } from 'react'
import useSWR from 'swr'
import {
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Form,
  Input,
  Pagination,
  Popconfirm,
  Row,
  Segmented,
  Spin,
  Statistic,
  Tabs,
  Tag,
  Typography,
  Alert,
  message,
} from 'antd'
import { BrandModal } from '@/components/Common/BrandModal'
import { EditOutlined, HistoryOutlined, KeyOutlined, LinkOutlined, PlusOutlined, StopOutlined } from '@ant-design/icons'
import { isUserActive } from '@/lib/user-status'
import { useIsMobile } from '@/hooks/useIsMobile'
import { PASSWORD_MIN_LENGTH, validatePassword } from '@/lib/password-policy'
import { formatLocaleDateTime } from '@/lib/format-date'

type AccountStatus = 'active' | 'disabled' | string

interface UserAccount {
  id: string
  email: string
  phone?: string | null
  name: string
  role: 'admin' | 'teacher' | 'parent' | string
  status: AccountStatus
  isSuperAdmin?: boolean
  lastLoginAt: string | null
  lastLoginIp?: string | null
  lastLoginDevice?: string | null
  createdAt: string
  passwordSecurity: {
    encrypted: boolean
    changedAt: string | null
    source: string
    history: Array<{ changedAt: string; source: string; operator: string }>
  }
}

interface TeacherAccount {
  id: string
  name: string
  phone: string
  email: string | null
  subjects: string
  status: string
  account: UserAccount | null
}

interface StudentLite {
  id: string
  name: string
  grade: string | null
  parentName: string | null
  parentPhone: string | null
  parentId: string | null
  parentUserId: string | null
  status: string
}

interface ParentAccount extends UserAccount {
  students: StudentLite[]
}

interface AccountsResponse {
  admins: UserAccount[]
  teachers: TeacherAccount[]
  parents: ParentAccount[]
  studentsWithoutParent: StudentLite[]
}

type ModalMode = 'admin' | 'teacher' | 'parent' | 'edit' | 'phone' | 'reset' | 'bind'
type AccountSelection =
  | { role: 'admin'; record: UserAccount }
  | { role: 'teacher'; record: TeacherAccount }
  | { role: 'parent'; record: ParentAccount }

const ACCOUNT_PAGE_SIZE = 8

function AccountPersonCard({
  name,
  role,
  status,
  primary,
  secondary,
  onClick,
}: {
  name: string
  role: string
  status: string | null | undefined
  primary: string
  secondary: string
  onClick: () => void
}) {
  const tone = status == null ? 'pending' : isUserActive(status) ? 'active' : 'disabled'
  const statusLabel = status == null ? '未创建账号' : isUserActive(status) ? '正常' : '已停用'

  return (
    <button type="button" className="settings-account-person-card" onClick={onClick}>
      <span className="settings-account-card-heading">
        <span className="settings-account-card-avatar" aria-hidden="true">{Array.from(name.trim())[0] || '用'}</span>
        <span className="settings-account-card-identity">
          <span className="settings-account-card-name">{name || '未命名'}</span>
          <span className="settings-account-card-role">{role}</span>
        </span>
        <span className={`settings-account-card-status is-${tone}`}>{statusLabel}</span>
      </span>
      <span className="settings-account-card-meta">
        <span className="settings-account-card-meta-item">
          <span className="settings-account-card-meta-label">主要账号</span>
          <span className="settings-account-card-meta-value">{primary || '未登记'}</span>
        </span>
        <span className="settings-account-card-meta-item">
          <span className="settings-account-card-meta-label">关联信息</span>
          <span className="settings-account-card-meta-value">{secondary || '暂无'}</span>
        </span>
      </span>
      <span className="settings-account-card-open">查看详情与操作 <span aria-hidden="true">→</span></span>
    </button>
  )
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '请求失败')
  return data
}

function statusTag(status: AccountStatus) {
  return <Tag color={isUserActive(status) ? 'green' : 'red'}>{isUserActive(status) ? '正常' : '已停用'}</Tag>
}

export function AdminsTab({ currentUserId, initialRole = 'admin' }: { currentUserId: string; initialRole?: string }) {
  const { data, error, isLoading, mutate } = useSWR<AccountsResponse>('/api/settings/accounts', fetcher)
  const [activeRole, setActiveRole] = useState(initialRole)
  useEffect(() => { setActiveRole(initialRole) }, [initialRole])
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedAccount, setSelectedAccount] = useState<AccountSelection | null>(null)
  const [mode, setMode] = useState<ModalMode | null>(null)
  const [target, setTarget] = useState<UserAccount | TeacherAccount | ParentAccount | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [issuedCredential, setIssuedCredential] = useState<{ email: string; password: string } | null>(null)
  const [passwordHistoryTarget, setPasswordHistoryTarget] = useState<UserAccount | null>(null)
  const [form] = Form.useForm()
  const isMobile = useIsMobile() ?? false

  useEffect(() => { setCurrentPage(1) }, [activeRole, keyword, statusFilter])

  const studentsWithoutParent = data?.studentsWithoutParent || []

  const runJson = async (url: string, init: RequestInit) => {
    const res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(payload.error || '操作失败')
    return payload
  }

  const openModal = (nextMode: ModalMode, nextTarget: typeof target = null) => {
    setMode(nextMode)
    setTarget(nextTarget)
    form.resetFields()
    if (nextMode === 'edit' && nextTarget && 'email' in nextTarget) {
      form.setFieldsValue({
        name: nextTarget.name,
        email: nextTarget.email,
        ...('role' in nextTarget && nextTarget.role === 'admin' ? { phone: nextTarget.phone || '' } : {}),
      })
    }
    if (nextMode === 'phone' && nextTarget && 'role' in nextTarget && nextTarget.role === 'admin') {
      form.setFieldsValue({ phone: nextTarget.phone || '' })
    }
  }

  const closeModal = () => {
    setMode(null)
    setTarget(null)
    form.resetFields()
  }

  const changeStatus = async (userId: string, status: 'active' | 'disabled') => {
    try {
      await runJson('/api/settings/accounts', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'status', userId, status }),
      })
      message.success(isUserActive(status) ? '账号已启用' : '账号已停用')
      mutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  const softDelete = async (userId: string) => {
    try {
      await runJson(`/api/settings/accounts?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' })
      message.success('账号已停用')
      mutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  const unbindStudent = async (studentId: string) => {
    try {
      await runJson('/api/settings/accounts', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'unbind-student', studentId }),
      })
      message.success('已解绑学员')
      mutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true)
    try {
      if (mode === 'admin' || mode === 'teacher' || mode === 'parent') {
        const payload = await runJson('/api/settings/accounts', {
          method: 'POST',
          body: JSON.stringify({ ...values, role: mode }),
        })
        if (payload.initialPassword) {
          setIssuedCredential({ email: payload.user.email, password: payload.initialPassword })
        } else {
          message.success('账号已创建')
        }
      }
      if (mode === 'edit' && target && 'id' in target) {
        await runJson('/api/settings/accounts', {
          method: 'PATCH',
          body: JSON.stringify({ ...values, action: 'update', userId: target.id }),
        })
        message.success('账号已更新')
      }
      if (mode === 'phone' && target && 'id' in target) {
        await runJson('/api/settings/accounts', {
          method: 'PATCH',
          body: JSON.stringify({ action: 'update-login-phone', userId: target.id, phone: values.phone || '' }),
        })
        message.success(values.phone ? '登录手机号已绑定' : '登录手机号已解除绑定')
      }
      if (mode === 'reset' && target && 'id' in target) {
        await runJson('/api/settings/accounts', {
          method: 'PATCH',
          body: JSON.stringify({ ...values, action: 'reset-password', userId: target.id }),
        })
        message.success('密码已重置，旧设备会失效')
      }
      if (mode === 'bind' && target && 'id' in target) {
        await runJson('/api/settings/accounts', {
          method: 'PATCH',
          body: JSON.stringify({ ...values, action: 'bind-students', userId: target.id }),
        })
        message.success('学员已绑定')
      }
      closeModal()
      mutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const filterUsers = <T extends UserAccount>(items: T[]) => items.filter((item) => {
    const text = [item.name, item.email, item.phone || '', item.role].join('').toLowerCase()
    return (!keyword || text.includes(keyword.toLowerCase())) && (!statusFilter || item.status === statusFilter)
  })

  const passwordRule = {
    validator: async (_: unknown, value: unknown) => {
      const result = validatePassword(String(value || ''))
      if (!result.valid) throw new Error(result.errors[0])
    },
  }

  const optionalPasswordRule = {
    validator: async (_: unknown, value: unknown) => {
      if (!value) return
      const result = validatePassword(String(value))
      if (!result.valid) throw new Error(result.errors[0])
    },
  }

  const admins = filterUsers(data?.admins || [])
  const parents = filterUsers(data?.parents || [])
  const currentAdmin = (data?.admins || []).find((admin) => admin.id === currentUserId)
  const currentIsSuperAdmin = currentAdmin?.isSuperAdmin === true
  const teachers = (data?.teachers || []).filter((teacher) => {
    const text = `${teacher.name}${teacher.phone}${teacher.email || ''}${teacher.account?.email || ''}`.toLowerCase()
    return (!keyword || text.includes(keyword.toLowerCase())) && (!statusFilter || teacher.account?.status === statusFilter)
  })

  const userActions = (record: UserAccount, closeDetails = false) => {
    const openAction = (nextMode: ModalMode) => {
      if (closeDetails) setSelectedAccount(null)
      openModal(nextMode, record)
    }
    const completeStatusChange = (status: 'active' | 'disabled') => {
      if (closeDetails) setSelectedAccount(null)
      return changeStatus(record.id, status)
    }

    return (
      <div className="settings-account-detail-actions">
        <Button icon={<EditOutlined />} onClick={() => openAction('edit')}>编辑资料</Button>
        <Button icon={<KeyOutlined />} onClick={() => openAction('reset')}>重置密码</Button>
        {isUserActive(record.status) ? (
          <Popconfirm title="确定停用该账号？" onConfirm={() => completeStatusChange('disabled')}>
            <Button danger icon={<StopOutlined />} disabled={record.id === currentUserId}>停用账号</Button>
          </Popconfirm>
        ) : (
          <Button onClick={() => completeStatusChange('active')}>启用账号</Button>
        )}
        <Popconfirm
          title="按现有规范仅停用账号，不删除业务数据。确定继续？"
          onConfirm={() => {
            if (closeDetails) setSelectedAccount(null)
            return softDelete(record.id)
          }}
        >
          <Button danger disabled={record.id === currentUserId}>删除/停用</Button>
        </Popconfirm>
      </div>
    )
  }

  const cardPageOffset = (currentPage - 1) * ACCOUNT_PAGE_SIZE
  const adminCards: ReactNode[] = admins.slice(cardPageOffset, cardPageOffset + ACCOUNT_PAGE_SIZE).map((record) => (
    <AccountPersonCard
      key={record.id}
      name={record.name}
      role={record.isSuperAdmin ? '最高权益管理员' : '管理员账号'}
      status={record.status}
      primary={record.email}
      secondary={record.phone ? `登录手机号 ${record.phone}` : '未绑定登录手机号'}
      onClick={() => setSelectedAccount({ role: 'admin', record })}
    />
  ))
  const teacherCards: ReactNode[] = teachers.slice(cardPageOffset, cardPageOffset + ACCOUNT_PAGE_SIZE).map((record) => (
    <AccountPersonCard
      key={record.id}
      name={record.name}
      role="教师账号"
      status={record.account?.status}
      primary={record.phone || '未登记手机号'}
      secondary={record.account?.email || record.email || '尚未创建登录账号'}
      onClick={() => setSelectedAccount({ role: 'teacher', record })}
    />
  ))
  const parentCards: ReactNode[] = parents.slice(cardPageOffset, cardPageOffset + ACCOUNT_PAGE_SIZE).map((record) => (
    <AccountPersonCard
      key={record.id}
      name={record.name}
      role="家长账号"
      status={record.status}
      primary={record.email || record.phone || '未登记账号'}
      secondary={record.students.length ? `已绑定 ${record.students.length} 位学员` : '尚未绑定学员'}
      onClick={() => setSelectedAccount({ role: 'parent', record })}
    />
  ))

  const renderAccountPanel = (cards: ReactNode[], total: number) => (
    <div className="settings-account-card-panel">
      <div className="settings-account-card-count">共 {total} 个账号 · 点击人员卡片查看详情和操作</div>
      {isLoading ? <div className="settings-account-card-loading"><Spin /></div> : total ? (
        <div className="settings-account-card-grid">{cards}</div>
      ) : (
        <Empty description="没有符合条件的账号" />
      )}
      {!isLoading && total > ACCOUNT_PAGE_SIZE && (
        <Pagination
          current={currentPage}
          pageSize={ACCOUNT_PAGE_SIZE}
          total={total}
          showSizeChanger={false}
          onChange={setCurrentPage}
          size={isMobile ? 'small' : 'default'}
        />
      )}
    </div>
  )

  const selectedRecord = selectedAccount?.record
  const detailAccount: UserAccount | null = selectedAccount
    ? selectedAccount.role === 'teacher' ? selectedAccount.record.account : selectedAccount.record
    : null
  const detailName = selectedRecord?.name || ''
  const detailRoleLabel = selectedAccount?.role === 'admin' ? '管理员账号'
    : selectedAccount?.role === 'teacher' ? '教师账号' : selectedAccount?.role === 'parent' ? '家长账号' : ''
  const detailStatus = selectedAccount?.role === 'teacher'
    ? selectedAccount.record.account?.status
    : selectedAccount?.record.status
  const detailEmail = selectedAccount?.role === 'teacher'
    ? selectedAccount.record.account?.email || selectedAccount.record.email || '未登记'
    : selectedRecord && 'email' in selectedRecord ? selectedRecord.email || '未登记' : '未登记'
  const detailPhone = selectedAccount?.role === 'teacher'
    ? selectedAccount.record.phone || '未登记'
    : selectedRecord && 'phone' in selectedRecord ? selectedRecord.phone || '未登记' : '未登记'
  const openDetailModal = (nextMode: ModalMode, nextTarget: typeof target) => {
    setSelectedAccount(null)
    openModal(nextMode, nextTarget)
  }

  const toolbar = (
    <div className="settings-account-toolbar">
      <div className="settings-account-filters">
        <Input.Search
          placeholder="搜索姓名、账号、手机号"
          allowClear
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          className="settings-account-search"
        />
        <Segmented
          block={isMobile}
          value={statusFilter || 'all'}
          onChange={(value) => setStatusFilter(value === 'all' ? '' : String(value))}
          options={[
            { label: '全部', value: 'all' },
            { label: '正常', value: 'active' },
            { label: '已停用', value: 'disabled' },
          ]}
          className="settings-account-status"
        />
      </div>
      <div className="settings-account-actions">
        {activeRole === 'admin' && <Button type="primary" icon={<PlusOutlined />} style={{ background: 'var(--color-primary)' }} onClick={() => openModal('admin')}>新增管理员</Button>}
        {activeRole === 'parent' && <Button type="primary" icon={<PlusOutlined />} style={{ background: 'var(--color-primary)' }} onClick={() => openModal('parent')}>新增家长账号</Button>}
      </div>
    </div>
  )

  return (
    <Card bordered={false} style={{ borderRadius: 10 }}>
      {error && <Alert type="error" showIcon message="账号与绑定数据加载失败" description={error.message} action={<Button onClick={() => mutate()}>重试</Button>} style={{ marginBottom: 16 }} />}

      <Row gutter={[10, 10]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FAFAF8', border: '1px solid #EDE9E1' }}>
            <div style={{ fontSize: isMobile ? 11 : 12, color: '#8C827A' }}>管理员</div>
            <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: '#17352F', marginTop: 2 }}>
              {data?.admins.length ?? 0}<span style={{ fontSize: 12, fontWeight: 400, marginLeft: 2 }}>个</span>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FAFAF8', border: '1px solid #EDE9E1' }}>
            <div style={{ fontSize: isMobile ? 11 : 12, color: '#8C827A' }}>教师账号</div>
            <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: '#14574D', marginTop: 2 }}>
              {data?.teachers.length ?? 0}<span style={{ fontSize: 12, fontWeight: 400, marginLeft: 2 }}>位</span>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FAFAF8', border: '1px solid #EDE9E1' }}>
            <div style={{ fontSize: isMobile ? 11 : 12, color: '#8C827A' }}>家长账号</div>
            <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: '#17352F', marginTop: 2 }}>
              {data?.parents.length ?? 0}<span style={{ fontSize: 12, fontWeight: 400, marginLeft: 2 }}>个</span>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div style={{ padding: '10px 14px', borderRadius: 10, background: studentsWithoutParent.length > 0 ? '#FFF7F0' : '#FAFAF8', border: `1px solid ${studentsWithoutParent.length > 0 ? '#F3D2BA' : '#EDE9E1'}` }}>
            <div style={{ fontSize: isMobile ? 11 : 12, color: studentsWithoutParent.length > 0 ? '#C45724' : '#8C827A' }}>待绑定学员</div>
            <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: studentsWithoutParent.length > 0 ? '#E8784A' : '#8C827A', marginTop: 2 }}>
              {studentsWithoutParent.length}<span style={{ fontSize: 12, fontWeight: 400, marginLeft: 2 }}>位</span>
            </div>
          </div>
        </Col>
      </Row>

      {toolbar}
      <Tabs
        activeKey={activeRole}
        onChange={(role) => { setActiveRole(role); setCurrentPage(1) }}
        items={[
          {
            key: 'admin',
            label: '管理员账号',
            children: renderAccountPanel(adminCards, admins.length),
          },
          {
            key: 'teacher',
            label: '教师账号',
            children: renderAccountPanel(teacherCards, teachers.length),
          },
          {
            key: 'parent',
            label: '家长账号与绑定',
            children: renderAccountPanel(parentCards, parents.length),
          },
        ]}
      />

      <Drawer
        title="人员账号详情"
        open={Boolean(selectedAccount)}
        onClose={() => setSelectedAccount(null)}
        placement={isMobile ? 'bottom' : 'right'}
        width={isMobile ? '100%' : 520}
        height={isMobile ? '86vh' : undefined}
        rootClassName="settings-account-detail-drawer"
        styles={{ body: { padding: '18px 20px' }, header: { padding: '16px 20px' } }}
        destroyOnHidden
      >
        {selectedAccount && (
          <div className="settings-account-detail">
            <div className="settings-account-detail-profile">
              <span className="settings-account-card-avatar" aria-hidden="true">{Array.from(detailName.trim())[0] || '用'}</span>
              <div className="settings-account-detail-identity">
                <strong>{detailName || '未命名'}</strong>
                <span>{detailRoleLabel}</span>
              </div>
              {detailStatus == null ? <Tag>未创建账号</Tag> : statusTag(detailStatus)}
            </div>

            <section className="settings-account-detail-section">
              <h3>账号信息</h3>
              <dl className="settings-account-detail-grid">
                <div><dt>登录账号</dt><dd>{detailEmail}</dd></div>
                <div><dt>手机号</dt><dd>{detailPhone}</dd></div>
                {selectedAccount.role === 'teacher' && <div><dt>授课学科</dt><dd>{selectedAccount.record.subjects || '未登记'}</dd></div>}
                {detailAccount && <div><dt>最近登录</dt><dd>{formatLocaleDateTime(detailAccount.lastLoginAt)}</dd></div>}
                {selectedAccount.role !== 'teacher' && <div><dt>创建时间</dt><dd>{formatLocaleDateTime(selectedAccount.record.createdAt)}</dd></div>}
              </dl>
            </section>

            {detailAccount && (
              <section className="settings-account-detail-section">
                <h3>密码与安全</h3>
                <div className="settings-account-security-card">
                  <Tag color={detailAccount.passwordSecurity.encrypted ? 'green' : 'red'}>
                    {detailAccount.passwordSecurity.encrypted ? '密码已加密' : '需要处理'}
                  </Tag>
                  <Typography.Text type="secondary">
                    {detailAccount.passwordSecurity.source}
                    {detailAccount.passwordSecurity.changedAt ? ` · ${formatLocaleDateTime(detailAccount.passwordSecurity.changedAt)}` : ''}
                  </Typography.Text>
                  <Button
                    type="link"
                    icon={<HistoryOutlined />}
                    onClick={() => { setSelectedAccount(null); setPasswordHistoryTarget(detailAccount) }}
                  >
                    查看密码修改记录
                  </Button>
                </div>
              </section>
            )}

            {selectedAccount.role === 'parent' && (
              <section className="settings-account-detail-section">
                <div className="settings-account-section-heading">
                  <h3>绑定学员</h3>
                  <Button icon={<LinkOutlined />} onClick={() => openDetailModal('bind', selectedAccount.record)}>绑定学员</Button>
                </div>
                {selectedAccount.record.students.length ? (
                  <div className="settings-account-students">
                    {selectedAccount.record.students.map((student) => (
                      <div className="settings-account-student" key={student.id}>
                        <span>{student.name}{student.grade ? ` · ${student.grade}` : ''}</span>
                        <Button type="link" danger onClick={() => { setSelectedAccount(null); void unbindStudent(student.id) }}>解绑</Button>
                      </div>
                    ))}
                  </div>
                ) : <Typography.Text type="secondary">当前没有绑定学员</Typography.Text>}
              </section>
            )}

            <section className="settings-account-detail-section">
              <h3>账号操作</h3>
              {selectedAccount.role === 'teacher' && !selectedAccount.record.account && (
                <Button block type="primary" icon={<PlusOutlined />} onClick={() => openDetailModal('teacher', selectedAccount.record)}>
                  创建教师登录账号
                </Button>
              )}
              {selectedAccount.role === 'admin' && detailAccount?.id === currentUserId && (
                <Button block icon={<EditOutlined />} onClick={() => openDetailModal('phone', detailAccount)}>
                  {detailAccount.phone ? '修改登录手机号' : '绑定登录手机号'}
                </Button>
              )}
              {selectedAccount.role === 'admin' && detailAccount?.id !== currentUserId && detailAccount?.isSuperAdmin && !currentIsSuperAdmin && (
                <Typography.Text type="secondary">最高权益管理员，仅最高权益管理员可操作此账号。</Typography.Text>
              )}
              {detailAccount && !(selectedAccount.role === 'admin' && detailAccount.id === currentUserId)
                && !(selectedAccount.role === 'admin' && detailAccount.isSuperAdmin && !currentIsSuperAdmin)
                && userActions(detailAccount, true)}
            </section>
          </div>
        )}
      </Drawer>

      <BrandModal
        title={mode === 'admin' ? '新增管理员' : mode === 'teacher' ? '创建教师登录账号' : mode === 'parent' ? '新增家长账号' : mode === 'reset' ? '重置密码' : mode === 'bind' ? '绑定学员' : mode === 'phone' ? '设置登录手机号' : '编辑账号'}
        open={Boolean(mode)}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {mode === 'teacher' && target && 'phone' in target && (
            <>
              <Form.Item label="教师（使用档案手机号登录）"><Input value={target.name} disabled /></Form.Item>
              <Form.Item name="teacherId" initialValue={target.id} hidden><Input /></Form.Item>
              <Form.Item name="email" label="登录邮箱" tooltip="留空时优先使用教师邮箱，没有教师邮箱则使用手机号生成 @tea.com 账号">
                <Input placeholder={target.email || `${target.phone}@tea.com`} />
              </Form.Item>
              <Form.Item name="password" label="初始密码" tooltip="留空时使用教师姓名拼音（小写、无空格）；填写自定义密码时需符合密码规则" rules={[optionalPasswordRule]}>
                <Input.Password placeholder="留空使用教师姓名拼音" autoComplete="new-password" />
              </Form.Item>
            </>
          )}

          {(mode === 'admin' || (mode === 'edit' && target && 'role' in target && target.role === 'admin')) && (
            <Form.Item
              name="phone"
              label="登录手机号"
              extra="教师档案手机号不会自动绑定到管理员账号；绑定后可用原账号密码登录管理端，同一手机号不能重复绑定。"
            >
              <Input type="tel" inputMode="tel" placeholder="请输入11位中国大陆手机号" autoComplete="tel" />
            </Form.Item>
          )}

          {mode === 'phone' && (
            <Form.Item
              name="phone"
              label="登录手机号"
              extra="教师档案手机号不会自动绑定到管理员账号；绑定后可用原账号密码登录管理端，同一手机号不能重复绑定。留空可解除绑定。"
            >
              <Input type="tel" inputMode="tel" placeholder="请输入11位中国大陆手机号" autoComplete="tel" />
            </Form.Item>
          )}

          {(mode === 'admin' || mode === 'parent' || mode === 'edit') && (
            <>
              <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                <Input />
              </Form.Item>
              <Form.Item
                name="email"
                label="登录邮箱"
                rules={[
                  { required: mode !== 'parent', message: '请输入登录邮箱' },
                  { type: 'email', message: '请输入正确邮箱' },
                ]}
              >
                <Input placeholder={mode === 'parent' ? '可留空，系统按手机号生成' : undefined} />
              </Form.Item>
            </>
          )}

          {mode === 'parent' && (
            <>
              <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}>
                <Input type="tel" inputMode="numeric" />
              </Form.Item>
              <Form.Item name="studentIds" label="绑定学员">
                <AdaptiveSelect
                  mode="multiple"
                  placeholder="选择需要绑定的学员"
                  options={studentsWithoutParent.map((student) => ({ label: `${student.name}${student.grade ? ` / ${student.grade}` : ''}`, value: student.id }))}
                />
              </Form.Item>
              <Form.Item name="password" label="初始密码" tooltip="留空时使用首位绑定学员姓名拼音；未绑定学员时使用家长姓名拼音" rules={[optionalPasswordRule]}>
                <Input.Password placeholder="留空使用学员姓名拼音" autoComplete="new-password" />
              </Form.Item>
            </>
          )}

          {mode === 'admin' && (
            <Form.Item
              name="password"
              label="初始密码"
              rules={[
                { required: true, message: '请输入初始密码' },
                passwordRule,
              ]}
            >
              <Input.Password autoComplete="new-password" placeholder={`至少 ${PASSWORD_MIN_LENGTH} 位，包含英文字母`} />
            </Form.Item>
          )}

          {mode === 'reset' && (
            <Form.Item name="password" label="新密码" rules={[{ required: true, message: '请输入新密码' }, passwordRule]}>
              <Input.Password autoComplete="new-password" placeholder={`至少 ${PASSWORD_MIN_LENGTH} 位，包含英文字母`} />
            </Form.Item>
          )}

          {mode === 'bind' && (
            <Form.Item name="studentIds" label="绑定学员" rules={[{ required: true, message: '请选择学员' }]}>
              <AdaptiveSelect
                mode="multiple"
                placeholder="选择需要绑定的学员"
                options={studentsWithoutParent.map((student) => ({ label: `${student.name}${student.grade ? ` / ${student.grade}` : ''}`, value: student.id }))}
              />
            </Form.Item>
          )}
        </Form>
      </BrandModal>

      <BrandModal
        title="账号创建成功"
        open={Boolean(issuedCredential)}
        onCancel={() => setIssuedCredential(null)}
        footer={<Button type="primary" onClick={() => setIssuedCredential(null)}>我已安全保存</Button>}
        width={460}
      >
        <Alert
          type="warning"
          showIcon
          message="初始密码仅显示这一次"
          description="请通过安全方式交给本人。系统不会保存可查看的明文密码，关闭后只能重新重置。"
          style={{ marginBottom: 18 }}
        />
        <Typography.Paragraph>
          <Typography.Text type="secondary">登录账号</Typography.Text><br />
          <Typography.Text strong copyable>{issuedCredential?.email}</Typography.Text>
        </Typography.Paragraph>
        <Typography.Paragraph>
          <Typography.Text type="secondary">初始密码</Typography.Text><br />
          <Typography.Text strong copyable>{issuedCredential?.password}</Typography.Text>
        </Typography.Paragraph>
      </BrandModal>

      <BrandModal
        title={`${passwordHistoryTarget?.name || ''} · 密码安全记录`}
        open={Boolean(passwordHistoryTarget)}
        onCancel={() => setPasswordHistoryTarget(null)}
        footer={<Button onClick={() => setPasswordHistoryTarget(null)}>关闭</Button>}
        width={560}
      >
        <Alert
          type="info"
          showIcon
          message="系统只记录修改时间、方式和操作人，不保存或展示明文密码。"
          style={{ marginBottom: 16 }}
        />
        {passwordHistoryTarget?.passwordSecurity.history.length ? (
          <div className="settings-password-history-list">
            {passwordHistoryTarget.passwordSecurity.history.map((entry) => (
              <article className="settings-password-history-item" key={`${entry.changedAt}-${entry.source}`}>
                <strong>{formatLocaleDateTime(entry.changedAt)}</strong>
                <span>方式：{entry.source || '未记录'}</span>
                <span>操作人：{entry.operator || '未记录'}</span>
              </article>
            ))}
          </div>
        ) : <Empty description="暂无历史审计记录" />}
      </BrandModal>
    </Card>
  )
}
