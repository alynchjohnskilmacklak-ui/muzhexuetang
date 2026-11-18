'use client'

import { Card, Typography, Tag, Button } from 'antd'
import { WechatOutlined, CheckCircleFilled, MessageOutlined } from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Title, Text } = Typography

export function BindWxClient({ bound, userName, phone }: { bound: boolean; userName: string; phone?: string }) {
  const isMobile = useIsMobile() ?? false

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#faf6f0 0%,#fdfbf7 60%,#fff 100%)', padding: isMobile ? 16 : 40, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
      <Card style={{ maxWidth: 520, width: '100%', borderRadius: 16, border: '1px solid rgba(232,120,74,.18)', boxShadow: '0 8px 30px rgba(120,90,50,.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg,#E8784A,#F4A261)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#fff', fontSize: 30 }}>
            <WechatOutlined />
          </div>
          <Title level={4} style={{ margin: 0 }}>微信通知</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>课堂反馈、考勤与通知将推送到微信</Text>
        </div>

        {bound ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ marginBottom: 12 }}>
              <Tag color="success" style={{ padding: '4px 14px', borderRadius: 999, fontSize: 13 }}>
                <CheckCircleFilled /> 已绑定微信通知
              </Tag>
            </div>
            <Text style={{ display: 'block', fontSize: 14 }}>您的微信已开通牧哲学堂通知</Text>
            {phone && <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>绑定手机号：{phone}</Text>}
            <div style={{ background: '#faf8f5', borderRadius: 10, padding: 14, marginTop: 16, textAlign: 'left' }}>
              <Text style={{ fontSize: 13, color: '#5a4e3a' }}>
                · 老师提交课堂反馈后，您会第一时间在微信收到汇总卡片
                <br />· 点击卡片可直接查看孩子当日考勤与学习动态
                <br />· 通知如有遗漏，也可登录家长端查看全部记录
              </Text>
            </div>
          </div>
        ) : (
          <div style={{ padding: '8px 0' }}>
            <div style={{ background: '#fff7ee', border: '1px solid #f3d9bf', borderRadius: 12, padding: 18, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <MessageOutlined style={{ color: '#E8784A', fontSize: 18, marginTop: 2 }} />
                <div>
                  <Text strong style={{ fontSize: 14 }}>如何开通微信通知</Text>
                  <Text style={{ fontSize: 13, color: '#5a4e3a', display: 'block', marginTop: 6, lineHeight: 1.8 }}>
                    1. 校区工作人员会在企业微信中将您添加为「学员」（需要您本人的手机号）
                    <br />2. 添加后请在微信中通过该申请，仅需操作一次
                    <br />3. 通过后本页将自动变为「已绑定」，之后所有课堂反馈与通知都会推送到您的微信
                  </Text>
                </div>
              </div>
            </div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'center' }}>
              如您已添加但状态未更新，请联系校区工作人员确认绑定手机号是否一致
            </Text>
          </div>
        )}
      </Card>
    </div>
  )
}
