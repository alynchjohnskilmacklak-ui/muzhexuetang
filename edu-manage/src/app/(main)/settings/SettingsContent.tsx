'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Menu, Spin } from 'antd'
import {
  BankOutlined, EditOutlined, HomeOutlined, DollarOutlined,
  BellOutlined, SafetyOutlined, CloudOutlined, FileSearchOutlined,
  TeamOutlined, UserOutlined,
  CrownOutlined,
} from '@ant-design/icons'
import { OrgInfoTab } from './OrgInfoTab'
import { SubjectsTab } from './SubjectsTab'
import { RoomsTab } from './RoomsTab'
import { FeeTypesTab } from './FeeTypesTab'
import { NotifyTab } from './NotifyTab'
import { RolesTab } from './RolesTab'
import { BackupTab } from './BackupTab'
import { LogsTab } from './LogsTab'
import { AdminsTab } from './AdminsTab'
import { TeacherAccountsTab } from './TeacherAccountsTab'
import { ParentAccountsTab } from './ParentAccountsTab'
import { MembershipTab } from './MembershipTab'
import { useIsMobile } from '@/hooks/useIsMobile'

const tabs = [
  { key: 'info', icon: <BankOutlined />, label: '机构信息' },
  { key: 'subjects', icon: <EditOutlined />, label: '学科管理' },
  { key: 'rooms', icon: <HomeOutlined />, label: '教室管理' },
  { key: 'fees', icon: <DollarOutlined />, label: '费用类型' },
  { key: 'notify', icon: <BellOutlined />, label: '通知设置' },
  { key: 'roles', icon: <SafetyOutlined />, label: '角色权限' },
  { key: 'teacher-accounts', icon: <UserOutlined />, label: '教师账号' },
  { key: 'parent-accounts', icon: <TeamOutlined />, label: '家长账号' },
  { key: 'membership', icon: <CrownOutlined />, label: '会员权益' },
  { key: 'backup', icon: <CloudOutlined />, label: '数据备份' },
  { key: 'logs', icon: <FileSearchOutlined />, label: '操作日志' },
  { key: 'admins', icon: <TeamOutlined />, label: '账号管理' },
]

function SettingsTabs({ currentUserId }: { currentUserId: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const isMobile = useIsMobile() ?? false
  const activeTab = searchParams.get('tab') || 'info'

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 16 : 24 }}>
      {isMobile ? (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'flex', gap: 4, paddingBottom: 4, minWidth: `${tabs.length * 72}px` }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => router.push(`/settings?tab=${tab.key}`)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                  border: `1px solid ${activeTab === tab.key ? '#E8784A' : '#EEE7E1'}`,
                  background: activeTab === tab.key ? 'rgba(232,120,74,.08)' : '#fff',
                  color: activeTab === tab.key ? '#E8784A' : '#5a4e3a',
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <Menu
          mode="inline"
          selectedKeys={[activeTab]}
          items={tabs}
          style={{ width: 180, borderRadius: 10, flexShrink: 0 }}
          onClick={({ key }) => router.push(`/settings?tab=${key}`)}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {activeTab === 'info' && <OrgInfoTab />}
        {activeTab === 'subjects' && <SubjectsTab />}
        {activeTab === 'rooms' && <RoomsTab />}
        {activeTab === 'fees' && <FeeTypesTab />}
        {activeTab === 'notify' && <NotifyTab />}
        {activeTab === 'roles' && <RolesTab />}
        {activeTab === 'backup' && <BackupTab />}
        {activeTab === 'logs' && <LogsTab />}
        {activeTab === 'admins' && <AdminsTab currentUserId={currentUserId} />}
        {activeTab === 'teacher-accounts' && <TeacherAccountsTab />}
        {activeTab === 'parent-accounts' && <ParentAccountsTab />}
        {activeTab === 'membership' && <MembershipTab />}
      </div>
    </div>
  )
}

export function SettingsContent({ currentUserId }: { currentUserId: string }) {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin /></div>}>
      <SettingsTabs currentUserId={currentUserId} />
    </Suspense>
  )
}
