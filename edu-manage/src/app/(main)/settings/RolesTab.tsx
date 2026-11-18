'use client'
import { Alert, Card, Typography } from 'antd'
import Link from 'next/link'
export function RolesTab() {
  return <Card style={{ borderRadius: 14, width: '100%' }}><Typography.Title level={4}>权限规则说明</Typography.Title><Alert type="info" showIcon message="当前规则说明，不是可配置开关" /><Typography.Paragraph style={{ marginTop: 16 }}>权限在服务端按角色、课次和学生关联关系校验，不以页面按钮是否显示为准。</Typography.Paragraph><Typography.Paragraph style={{ marginTop: 16 }}>管理员处理普通业务；覆盖恢复、永久清理等敏感维护需超级管理员身份及再次确认。</Typography.Paragraph><Typography.Paragraph style={{ marginTop: 16 }}>教师按授课关系查看授权课次、学生和反馈；家长只能读取账号授权绑定的孩子。</Typography.Paragraph><Typography.Paragraph style={{ marginTop: 16 }}>旧的“教师查看财务/其他教师学生”配置未接入权限守卫，已停止修改，不会擅自扩展教师权限。</Typography.Paragraph><Link href="/settings?tab=admins">查看账号与绑定</Link></Card>
}
