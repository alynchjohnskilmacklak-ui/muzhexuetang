'use client'
import { Alert, Card, Typography } from 'antd'
import Link from 'next/link'
export function NotifyTab() {
  return <Card style={{ borderRadius: 14, width: '100%' }}><Typography.Title level={4}>通知规则说明</Typography.Title><Alert type="info" showIcon message="当前规则说明，不是可配置开关" /><Typography.Paragraph style={{ marginTop: 16 }}>站内通知由课程变更、反馈发布等实际业务事件生成；站内通知不代表已经发送微信或短信。</Typography.Paragraph><Typography.Paragraph style={{ marginTop: 16 }}>现有通知流程保持不变。旧的试卷推送、旷课提醒、低课时阈值与表现推送开关尚未接入统一规则，暂不开放修改。</Typography.Paragraph><Typography.Paragraph style={{ marginTop: 16 }}>请在数据管理的健康诊断中查看课程变更及站内通知关联情况。</Typography.Paragraph><Link href="/data-admin?tab=health">查看通知链路诊断</Link></Card>
}
