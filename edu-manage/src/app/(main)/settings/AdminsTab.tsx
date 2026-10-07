'use client'

import { useState } from 'react'
import useSWR from 'swr'
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Alert,
  message,
} from 'antd'
import { EditOutlined, HistoryOutlined, KeyOutlined, LinkOutlined, PlusOutlined, StopOutlined } from '@ant-design/icons'
import { isUserActive } from '@/lib/user-status'
import { PASSWORD_MIN_LENGTH, validatePassword } from '@/lib/password-policy'
import { formatLocaleDateTime } from '@/lib/format-date'

type AccountStatus = 'active' | 'disabled' | string

interface UserAccount {
  id: string
  email: string
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

type ModalMode = 'admin' | 'teacher' | 'parent' | 'edit' | 'reset' | 'bind'
const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '请求失败')
  return data
}

function statusTag(status: AccountStatus) {
  return <Tag color={isUserActive(status) ? 'green' : 'red'}>{isUserActive(status) ? '正常' : '已停用'}</Tag>
}

export function AdminsTab({ currentUserId }: { currentUserId: string }) {
  const { data, isLoading, mutate } = useSWR<AccountsResponse>('/api/settings/accounts', fetcher)
  const [activeRole, setActiveRole] = useState('admin')
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [mode, setMode] = useState<ModalMode | null>(null)
  const [target, setTarget] = useState<UserAccount | TeacherAccount | ParentAccount | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [issuedCredential, setIssuedCredential] = useState<{ email: string; password: string } | null>(null)
  const [passwordHistoryTarget, setPasswordHistoryTarget] = useState<UserAccount | null>(null)
  const [form] = Form.useForm()

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
      form.setFieldsValue({ name: nextTarget.name, email: nextTarget.email })
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
    const text = `${item.name}${item.email}${item.role}`.toLowerCase()
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

  const passwordSecurity = (_: unknown, record: UserAccount) => (
    <Space direction="vertical" size={0}>
      <Tag color={record.passwordSecurity.encrypted ? 'green' : 'red'}>
        {record.passwordSecurity.encrypted ? '已加密' : '需处理'}
      </Tag>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {record.passwordSecurity.source}
        {record.passwordSecurity.changedAt ? ` · ${formatLocaleDateTime(record.passwordSecurity.changedAt)}` : ''}
      </Typography.Text>
      <Button
        type="link"
        size="small"
        icon={<HistoryOutlined />}
        style={{ padding: 0, height: 'auto' }}
        onClick={() => setPasswordHistoryTarget(record)}
      >
        查看修改记录
      </Button>
    </Space>
  )

  const admins = filterUsers(data?.admins || [])
  const parents = filterUsers(data?.parents || [])
  const currentAdmin = (data?.admins || []).find((admin) => admin.id === currentUserId)
  const currentIsSuperAdmin = currentAdmin?.isSuperAdmin === true
  const teachers = (data?.teachers || []).filter((teacher) => {
    const text = `${teacher.name}${teacher.phone}${teacher.email || ''}${teacher.account?.email || ''}`.toLowerCase()
    return (!keyword || text.includes(keyword.toLowerCase())) && (!statusFilter || teacher.account?.status === statusFilter)
  })

  const userActions = (record: UserAccount) => (
    <Space wrap>
      <Button size="small" icon={<EditOutlined />} onClick={() => openModal('edit', record)}>编辑</Button>
      <Button size="small" icon={<KeyOutlined />} onClick={() => openModal('reset', record)}>重置密码</Button>
      {isUserActive(record.status) ? (
        <Popconfirm title="确定停用该账号？" onConfirm={() => changeStatus(record.id, 'disabled')}>
          <Button size="small" danger icon={<StopOutlined />} disabled={record.id === currentUserId}>停用</Button>
        </Popconfirm>
      ) : (
        <Button size="small" onClick={() => changeStatus(record.id, 'active')}>启用</Button>
      )}
      <Popconfirm title="按现有规范仅停用账号，不删除业务数据。确定继续？" onConfirm={() => softDelete(record.id)}>
        <Button size="small" danger disabled={record.id === currentUserId}>删除/停用</Button>
      </Popconfirm>
    </Space>
  )

  const adminColumns = [
    { title: '姓名', dataIndex: 'name', key: 'name', width: 140 },
    { title: '邮箱', dataIndex: 'email', key: 'email', width: 220 },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: statusTag },
    { title: '密码状态', key: 'passwordSecurity', width: 210, render: passwordSecurity },
    { title: '最近登录', dataIndex: 'lastLoginAt', key: 'lastLoginAt', width: 180, render: (value: string | null) => formatLocaleDateTime(value) },
    {
      title: '操作',
      key: 'action',
      width: 360,
      render: (_: unknown, record: UserAccount) => {
        if (record.id === currentUserId) return <Typography.Text type="secondary">当前账号</Typography.Text>
        if (record.isSuperAdmin && !currentIsSuperAdmin) {
          return <Typography.Text type="secondary">最高权益管理员</Typography.Text>
        }
        return userActions(record)
      },
    },
  ]

  const teacherColumns = [
    { title: '教师', dataIndex: 'name', key: 'name', width: 120 },
    { title: '手机号', dataIndex: 'phone', key: 'phone', width: 140 },
    { title: '教师邮箱', dataIndex: 'email', key: 'email', width: 200, render: (value: string | null) => value || '-' },
    { title: '登录账号', key: 'account', width: 240, render: (_: unknown, record: TeacherAccount) => record.account?.email || <Tag>未创建</Tag> },
    { title: '状态', key: 'status', width: 100, render: (_: unknown, record: TeacherAccount) => record.account ? statusTag(record.account.status) : '-' },
    { title: '密码状态', key: 'passwordSecurity', width: 210, render: (_: unknown, record: TeacherAccount) => record.account ? passwordSecurity(_, record.account) : '-' },
    {
      title: '操作',
      key: 'action',
      width: 380,
      render: (_: unknown, record: TeacherAccount) => record.account ? userActions(record.account) : (
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openModal('teacher', record)}>
          创建账号
        </Button>
      ),
    },
  ]

  const parentColumns = [
    { title: '家长', dataIndex: 'name', key: 'name', width: 120 },
    { title: '账号', dataIndex: 'email', key: 'email', width: 220 },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: statusTag },
    { title: '密码状态', key: 'passwordSecurity', width: 210, render: passwordSecurity },
    {
      title: '绑定学员',
      key: 'students',
      width: 260,
      render: (_: unknown, record: ParentAccount) => (
        <Space wrap>
          {record.students.length ? record.students.map((student) => (
            <Tag key={student.id} closable onClose={(event) => { event.preventDefault(); void unbindStudent(student.id) }}>
              {student.name}{student.grade ? ` / ${student.grade}` : ''}
            </Tag>
          )) : <Typography.Text type="secondary">未绑定</Typography.Text>}
        </Space>
      ),
    },
    { title: '最近登录', dataIndex: 'lastLoginAt', key: 'lastLoginAt', width: 180, render: (value: string | null) => formatLocaleDateTime(value) },
    {
      title: '操作',
      key: 'action',
      width: 430,
      render: (_: unknown, record: ParentAccount) => (
        <Space wrap>
          <Button size="small" icon={<LinkOutlined />} onClick={() => openModal('bind', record)}>绑定学员</Button>
          {userActions(record)}
        </Space>
      ),
    },
  ]

  const toolbar = (
    <Space wrap style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
      <Space wrap>
        <Input.Search
          placeholder="搜索姓名、账号、手机号"
          allowClear
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          style={{ width: 260 }}
        />
        <Select
          placeholder="状态筛选"
          allowClear
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: '正常', value: 'active' },
            { label: '已停用', value: 'disabled' },
          ]}
          style={{ width: 140 }}
        />
      </Space>
      <Space wrap>
        {activeRole === 'admin' && <Button type="primary" icon={<PlusOutlined />} style={{ background: '#E8784A' }} onClick={() => openModal('admin')}>新增管理员</Button>}
        {activeRole === 'parent' && <Button type="primary" icon={<PlusOutlined />} style={{ background: '#E8784A' }} onClick={() => openModal('parent')}>新增家长账号</Button>}
      </Space>
    </Space>
  )

  return (
    <Card bordered={false} style={{ borderRadius: 10 }}>
      {toolbar}
      <Tabs
        activeKey={activeRole}
        onChange={setActiveRole}
        items={[
          {
            key: 'admin',
            label: '管理员管理',
            children: <Table columns={adminColumns} dataSource={admins} rowKey="id" loading={isLoading} pagination={{ pageSize: 10 }} scroll={{ x: 1000 }} />,
          },
          {
            key: 'teacher',
            label: '教师管理',
            children: <Table columns={teacherColumns} dataSource={teachers} rowKey="id" loading={isLoading} pagination={{ pageSize: 10 }} scroll={{ x: 1100 }} />,
          },
          {
            key: 'parent',
            label: '学员/家长管理',
            children: <Table columns={parentColumns} dataSource={parents} rowKey="id" loading={isLoading} pagination={{ pageSize: 10 }} scroll={{ x: 1200 }} />,
          },
        ]}
      />

      <Modal
        title={mode === 'admin' ? '新增管理员' : mode === 'teacher' ? '创建教师登录账号' : mode === 'parent' ? '新增家长账号' : mode === 'reset' ? '重置密码' : mode === 'bind' ? '绑定学员' : '编辑账号'}
        open={Boolean(mode)}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {mode === 'teacher' && target && 'phone' in target && (
            <>
              <Form.Item label="教师"><Input value={target.name} disabled /></Form.Item>
              <Form.Item name="teacherId" initialValue={target.id} hidden><Input /></Form.Item>
              <Form.Item name="email" label="登录邮箱" tooltip="留空时优先使用教师邮箱，没有教师邮箱则使用手机号生成 @tea.com 账号">
                <Input placeholder={target.email || `${target.phone}@tea.com`} />
              </Form.Item>
              <Form.Item name="password" label="初始密码" tooltip="留空时由系统生成独立强密码；只在创建成功后显示一次" rules={[optionalPasswordRule]}>
                <Input.Password placeholder="留空自动生成强密码" autoComplete="new-password" />
              </Form.Item>
            </>
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
                <Select
                  mode="multiple"
                  placeholder="选择需要绑定的学员"
                  options={studentsWithoutParent.map((student) => ({ label: `${student.name}${student.grade ? ` / ${student.grade}` : ''}`, value: student.id }))}
                />
              </Form.Item>
              <Form.Item name="password" label="初始密码" tooltip="留空时由系统生成独立强密码；只在创建成功后显示一次" rules={[optionalPasswordRule]}>
                <Input.Password placeholder="留空自动生成强密码" autoComplete="new-password" />
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
              <Select
                mode="multiple"
                placeholder="选择需要绑定的学员"
                options={studentsWithoutParent.map((student) => ({ label: `${student.name}${student.grade ? ` / ${student.grade}` : ''}`, value: student.id }))}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="账号创建成功"
        open={Boolean(issuedCredential)}
        onCancel={() => setIssuedCredential(null)}
        footer={<Button type="primary" onClick={() => setIssuedCredential(null)}>我已安全保存</Button>}
        width={460}
        centered
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
      </Modal>

      <Modal
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
        <Table
          size="small"
          rowKey={(record) => `${record.changedAt}-${record.source}`}
          pagination={false}
          dataSource={passwordHistoryTarget?.passwordSecurity.history || []}
          columns={[
            { title: '时间', dataIndex: 'changedAt', render: (value: string | null) => formatLocaleDateTime(value), width: 190 },
            { title: '方式', dataIndex: 'source', width: 150 },
            { title: '操作人', dataIndex: 'operator' },
          ]}
          locale={{ emptyText: '暂无历史审计记录' }}
          scroll={{ x: 480 }}
        />
      </Modal>
    </Card>
  )
}
