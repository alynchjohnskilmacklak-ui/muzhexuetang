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
  message,
} from 'antd'
import { EditOutlined, KeyOutlined, LinkOutlined, PlusOutlined, StopOutlined } from '@ant-design/icons'

type AccountStatus = 'active' | 'disabled' | string

interface UserAccount {
  id: string
  email: string
  name: string
  role: 'admin' | 'teacher' | 'parent' | string
  status: AccountStatus
  lastLoginAt: string | null
  lastLoginIp?: string | null
  lastLoginDevice?: string | null
  createdAt: string
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
const SUPER_ADMIN_NAME = '任文涛'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '请求失败')
  return data
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('zh-CN') : '-'
}

function statusTag(status: AccountStatus) {
  return <Tag color={status === 'active' ? 'green' : 'red'}>{status === 'active' ? '正常' : '已停用'}</Tag>
}

export function AdminsTab({ currentUserId }: { currentUserId: string }) {
  const { data, isLoading, mutate } = useSWR<AccountsResponse>('/api/settings/accounts', fetcher)
  const [activeRole, setActiveRole] = useState('admin')
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [mode, setMode] = useState<ModalMode | null>(null)
  const [target, setTarget] = useState<UserAccount | TeacherAccount | ParentAccount | null>(null)
  const [submitting, setSubmitting] = useState(false)
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
      message.success(status === 'active' ? '账号已启用' : '账号已停用')
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
        message.success(payload.initialPassword ? `账号已创建，初始密码：${payload.initialPassword}` : '账号已创建')
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

  const admins = filterUsers(data?.admins || [])
  const parents = filterUsers(data?.parents || [])
  const currentAdmin = (data?.admins || []).find((admin) => admin.id === currentUserId)
  const currentIsSuperAdmin = currentAdmin?.name === SUPER_ADMIN_NAME
  const teachers = (data?.teachers || []).filter((teacher) => {
    const text = `${teacher.name}${teacher.phone}${teacher.email || ''}${teacher.account?.email || ''}`.toLowerCase()
    return (!keyword || text.includes(keyword.toLowerCase())) && (!statusFilter || teacher.account?.status === statusFilter)
  })

  const userActions = (record: UserAccount) => (
    <Space wrap>
      <Button size="small" icon={<EditOutlined />} onClick={() => openModal('edit', record)}>编辑</Button>
      <Button size="small" icon={<KeyOutlined />} onClick={() => openModal('reset', record)}>重置密码</Button>
      {record.status === 'active' ? (
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
    { title: '最近登录', dataIndex: 'lastLoginAt', key: 'lastLoginAt', width: 180, render: formatDate },
    {
      title: '操作',
      key: 'action',
      width: 360,
      render: (_: unknown, record: UserAccount) => {
        if (record.id === currentUserId) return <Typography.Text type="secondary">当前账号</Typography.Text>
        if (record.name === SUPER_ADMIN_NAME && !currentIsSuperAdmin) {
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
    { title: '最近登录', dataIndex: 'lastLoginAt', key: 'lastLoginAt', width: 180, render: formatDate },
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
              <Form.Item name="password" label="初始密码" tooltip="留空时使用手机号后 6 位">
                <Input.Password placeholder="留空自动生成" />
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
                <Input />
              </Form.Item>
              <Form.Item name="studentIds" label="绑定学员">
                <Select
                  mode="multiple"
                  placeholder="选择需要绑定的学员"
                  options={studentsWithoutParent.map((student) => ({ label: `${student.name}${student.grade ? ` / ${student.grade}` : ''}`, value: student.id }))}
                />
              </Form.Item>
              <Form.Item name="password" label="初始密码" tooltip="留空时使用手机号后 6 位">
                <Input.Password placeholder="留空自动生成" />
              </Form.Item>
            </>
          )}

          {mode === 'admin' && (
            <Form.Item
              name="password"
              label="初始密码"
              rules={[
                { required: true, message: '请输入初始密码' },
                { min: 8, message: '管理员密码至少 8 位' },
              ]}
            >
              <Input.Password />
            </Form.Item>
          )}

          {mode === 'reset' && (
            <Form.Item name="password" label="新密码" rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '密码至少 6 位' }]}>
              <Input.Password />
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
    </Card>
  )
}
