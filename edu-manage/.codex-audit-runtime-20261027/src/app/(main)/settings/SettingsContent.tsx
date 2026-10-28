'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Menu, Select, Spin } from 'antd'
import { SettingOutlined, SafetyOutlined, GiftOutlined, FileDoneOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { OrgInfoTab } from './OrgInfoTab'
import { SubjectsTab } from './SubjectsTab'
import { RoomsTab } from './RoomsTab'
import { FeeTypesTab } from './FeeTypesTab'
import { NotifyTab } from './NotifyTab'
import { RolesTab } from './RolesTab'
import { BackupTab } from './BackupTab'
import { LogsTab } from './LogsTab'
import { AdminsTab } from './AdminsTab'
import { MembershipTab } from './MembershipTab'
import { TeacherBenefitsTab } from './TeacherBenefitsTab'
import { useIsMobile } from '@/hooks/useIsMobile'

const groupIcons: Record<string, React.ReactNode> = {
  basic: <SettingOutlined />, security: <SafetyOutlined />, content: <GiftOutlined />, audit: <FileDoneOutlined />,
}
const groups = [
  { key: 'basic', label: '基础设置', children: [{ key: 'info', label: '机构资料' }, { key: 'subjects', label: '学科目录' }, { key: 'rooms', label: '教室' }, { key: 'fees', label: '费用类型' }] },
  { key: 'security', label: '账号与安全', children: [{ key: 'admins', label: '账号与绑定' }, { key: 'roles', label: '权限规则说明' }] },
  { key: 'content', label: '消息与权益', children: [{ key: 'notify', label: '通知规则说明' }, { key: 'membership', label: '家长权益文案' }, { key: 'teacher-benefits', label: '教师福利文案' }] },
  { key: 'audit', label: '审计与导出', children: [{ key: 'logs', label: '操作日志' }, { key: 'backup', label: '业务数据导出' }] },
]
const tabs = groups.flatMap((group) => group.children)
function SettingsTabs({ currentUserId }: { currentUserId: string }) {
  const params = useSearchParams()
  const router = useRouter()
  const mobile = useIsMobile() ?? false
  const requested = params.get('tab') || 'info'
  const accountRole = requested === 'teacher-accounts' ? 'teacher' : requested === 'parent-accounts' ? 'parent' : params.get('role') || 'admin'
  const normalized = ['teacher-accounts', 'parent-accounts'].includes(requested) ? 'admins' : requested
  const active = tabs.some((tab) => tab.key === normalized) ? normalized : 'info'
  const [visited, setVisited] = useState<string[]>([active])
  useEffect(() => { setVisited((previous) => previous.includes(active) ? previous : [...previous, active]) }, [active])
  const panels: Record<string, React.ReactNode> = {
    info: <OrgInfoTab />, subjects: <SubjectsTab />, rooms: <RoomsTab />, fees: <FeeTypesTab />,
    notify: <NotifyTab />, roles: <RolesTab />, backup: <BackupTab />, logs: <LogsTab />,
    admins: <AdminsTab currentUserId={currentUserId} initialRole={['admin', 'teacher', 'parent'].includes(accountRole) ? accountRole : 'admin'} />,
    membership: <MembershipTab />, 'teacher-benefits': <TeacherBenefitsTab />,
  }
  const activeTab = tabs.find((tab) => tab.key === active)
  const activeGroup = groups.find((group) => group.children.some((child) => child.key === active))
  const select = (key: string) => router.push('/settings?tab=' + key, { scroll: false })
  return (
    <div className="settings-brand-root" style={{ width: '100%', maxWidth: '100%', display: 'grid', gap: 16 }}>
      {/* 品牌引导条 */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px',
        borderRadius: 14, background: 'linear-gradient(135deg, rgba(201,164,92,.12), rgba(242,227,182,.18))',
        border: '1px solid rgba(201,164,92,.35)', fontSize: 12.5, color: '#6B5424', lineHeight: 1.7,
      }}>
        <InfoCircleOutlined style={{ marginTop: 2, color: '#B98A2F' }} />
        <span>设置分为<strong>基础、账号、消息权益和审计</strong>四组；切换栏目会保留已打开表单，刷新或离开页面前请保存。维护与回收站位于<strong>数据管理</strong>。</span>
      </div>
      <style>{`
        .settings-brand-root .ant-menu-inline { border-inline-end: none !important; border-radius: 14px; overflow: hidden; }
        .settings-brand-root .ant-menu-item { margin-inline: 6px !important; width: calc(100% - 12px) !important; border-radius: 10px !important; }
        .settings-brand-root .ant-menu-item-selected { background: rgba(14,94,78,.1) !important; color: #0E5E4E !important; font-weight: 700; }
        .settings-brand-root .ant-menu-item-selected::after { display: none !important; }
        .settings-brand-root .ant-menu-submenu-title { font-weight: 700; color: #17352F; }
        .settings-brand-root .ant-select-selector { border-radius: 999px !important; border-color: #E5DECF !important; }
        .settings-brand-root .ant-alert-info { border-radius: 12px !important; border-color: rgba(201,164,92,.35) !important; background: rgba(242,227,182,.14) !important; }
        .settings-brand-root .ant-alert-info .ant-alert-message { color: #6B5424 !important; }
        .settings-brand-root .ant-card { border-radius: 14px !important; border-color: #EDE9E1 !important; }
        .settings-brand-root .ant-btn { border-radius: 999px !important; }
      `}</style>
      <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: 16 }}>
        {mobile ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <Select
              aria-label="选择设置栏目"
              value={active}
              onChange={select}
              options={groups.map((group) => ({ label: group.label, options: group.children.map((tab) => ({ value: tab.key, label: tab.label })) }))}
              style={{ width: '100%', minHeight: 44 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 11.5, color: '#98A2B3' }}>
              <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(201,164,92,.12)', color: '#8A6B2F', fontWeight: 600 }}>{activeGroup?.label}</span>
              <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(14,94,78,.08)', color: '#0E5E4E', fontWeight: 700 }}>{activeTab?.label}</span>
            </div>
          </div>
        ) : (
          <Menu
            mode="inline"
            selectedKeys={[active]}
            defaultOpenKeys={groups.map((group) => group.key)}
            items={groups.map((group) => ({ key: group.key, label: group.label, icon: groupIcons[group.key], children: group.children.map((tab) => ({ key: tab.key, label: tab.label })) }))}
            onClick={({ key }) => select(key)}
            style={{ width: 216, flexShrink: 0, border: '1px solid #EDE9E1', borderRadius: 14, padding: '8px 0', boxShadow: '0 2px 8px rgba(23,47,41,.04)' }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0, maxWidth: '100%' }}>
          {Object.entries(panels).filter(([key]) => visited.includes(key) || key === active).map(([key, panel]) => <div key={key} hidden={key !== active}>{panel}</div>)}
        </div>
      </div>
    </div>
  )
}
export function SettingsContent({ currentUserId }: { currentUserId: string }) {
  return <Suspense fallback={<Spin />}><SettingsTabs currentUserId={currentUserId} /></Suspense>
}
