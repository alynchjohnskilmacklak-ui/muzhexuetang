'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Menu, Spin } from 'antd'
import {
  BankOutlined, EditOutlined, HomeOutlined, DollarOutlined,
  BellOutlined, SafetyOutlined, CloudOutlined, FileSearchOutlined,
} from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { OrgInfoTab } from './OrgInfoTab'
import { SubjectsTab } from './SubjectsTab'
import { RoomsTab } from './RoomsTab'
import { FeeTypesTab } from './FeeTypesTab'
import { NotifyTab } from './NotifyTab'
import { RolesTab } from './RolesTab'
import { BackupTab } from './BackupTab'
import { LogsTab } from './LogsTab'

const tabs = [
  { key: 'info', icon: <BankOutlined />, label: '机构信息' },
  { key: 'subjects', icon: <EditOutlined />, label: '学科管理' },
  { key: 'rooms', icon: <HomeOutlined />, label: '教室管理' },
  { key: 'fees', icon: <DollarOutlined />, label: '费用类型' },
  { key: 'notify', icon: <BellOutlined />, label: '通知设置' },
  { key: 'roles', icon: <SafetyOutlined />, label: '角色权限' },
  { key: 'backup', icon: <CloudOutlined />, label: '数据备份' },
  { key: 'logs', icon: <FileSearchOutlined />, label: '操作日志' },
]

function SettingsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') || 'info'

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      <Menu
        mode="inline"
        selectedKeys={[activeTab]}
        items={tabs}
        style={{ width: 180, borderRadius: 10, flexShrink: 0 }}
        onClick={({ key }) => router.push(`/settings?tab=${key}`)}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        {activeTab === 'info' && <OrgInfoTab />}
        {activeTab === 'subjects' && <SubjectsTab />}
        {activeTab === 'rooms' && <RoomsTab />}
        {activeTab === 'fees' && <FeeTypesTab />}
        {activeTab === 'notify' && <NotifyTab />}
        {activeTab === 'roles' && <RolesTab />}
        {activeTab === 'backup' && <BackupTab />}
        {activeTab === 'logs' && <LogsTab />}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <PageLayout title="系统设置">
      <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin /></div>}>
        <SettingsContent />
      </Suspense>
    </PageLayout>
  )
}
