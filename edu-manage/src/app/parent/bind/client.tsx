'use client'

import { useState } from 'react'
import { Button, Card, Typography, Spin, Alert, Modal, message } from 'antd'
import { WechatOutlined, CheckCircleFilled } from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Title, Text } = Typography

export function BindWxClient({ bound, userName }: { bound: boolean; userName: string }) {
  const isMobile = useIsMobile() ?? false
  const [loading, setLoading] = useState(false)
  const [qrcodeUrl, setQrcodeUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [unbinding, setUnbinding] = useState(false)
  const [isBound, setIsBound] = useState(bound)

  const getQrcode = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/wxpusher/qrcode')
      const data = await res.json()
      if (data.bound) {
        setIsBound(true)
        return
      }
      if (data.qrcodeUrl) {
        setQrcodeUrl(data.qrcodeUrl)
      } else {
        setError(data.error || '二维码获取失败，请检查服务器配置')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const checkBound = async () => {
    setChecking(true)
    try {
      const res = await fetch('/api/wxpusher/qrcode')
      const data = await res.json()
      if (data.bound) {
        setIsBound(true)
        setQrcodeUrl(null)
        message.success('微信绑定成功！')
      } else {
        message.info('暂未检测到绑定，请确认已用微信扫码并关注公众号')
      }
    } catch {
      message.error('检查失败，请重试')
    } finally {
      setChecking(false)
    }
  }

  const handleUnbind = () => {
    Modal.confirm({
      title: '解除微信绑定',
      content: '解除后将无法接收微信提醒，需要重新绑定后才能恢复。',
      okText: '确定解除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        setUnbinding(true)
        try {
          const res = await fetch('/api/parent/wechat/unbind', { method: 'POST' })
          if (res.ok) {
            setIsBound(false)
            setQrcodeUrl(null)
            message.success('已解除微信绑定')
          } else {
            message.error('解除绑定失败，请稍后重试')
          }
        } catch {
          message.error('解除绑定失败，请稍后重试')
        } finally {
          setUnbinding(false)
        }
      },
    })
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'transparent', padding: isMobile ? 0 : 24 }}>
      <Card
        style={{ width: isMobile ? '100%' : 480, margin: isMobile ? 0 : '40px auto' }}
        styles={{ body: { padding: isMobile ? 20 : 40, textAlign: 'center' } }}
      >
        {isBound ? (
          <>
            <CheckCircleFilled style={{ fontSize: 56, color: '#27a644', marginBottom: 16 }} />
            <Title level={4} style={{ marginBottom: 8 }}>微信已绑定</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
              老师发送课堂反馈或平安回家通知时，消息将实时推送到您的微信
            </Text>
            <Button type="link" danger loading={unbinding} onClick={handleUnbind}>
              解除绑定
            </Button>
          </>
        ) : (
          <>
            <WechatOutlined style={{ fontSize: 56, color: '#E8784A', marginBottom: 16 }} />
            <Title level={4} style={{ marginBottom: 8 }}>微信未绑定</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24, lineHeight: 1.8 }}>
              绑定后，老师发送课堂反馈或平安回家通知时<br />
              消息将实时推送到您的微信上
            </Text>

            {error && (
              <Alert
                type="warning"
                showIcon
                message="暂时无法获取二维码"
                description={error}
                style={{ marginBottom: 16, textAlign: 'left' }}
                closable
                onClose={() => setError(null)}
              />
            )}

            {!qrcodeUrl ? (
              <Button
                type="primary"
                block
                loading={loading}
                onClick={getQrcode}
                style={{ background: '#E8784A', borderColor: '#E8784A', height: 42 }}
              >
                立即绑定
              </Button>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <img src={qrcodeUrl} alt="绑定二维码" width={200} height={200} style={{ borderRadius: 8 }} />
                </div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
                  使用微信扫描上方二维码，关注公众号即可完成绑定<br />
                  二维码有效期30分钟，过期请刷新页面重新获取
                </Text>
                <Button block loading={checking} onClick={checkBound}
                  style={{ borderColor: '#E8784A', color: '#E8784A' }}>
                  已完成扫码，检查绑定状态
                </Button>
                <Button type="link" block style={{ marginTop: 8, color: '#8a8f98' }}
                  onClick={() => { setQrcodeUrl(null); setError(null) }}>
                  重新获取二维码
                </Button>
              </>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
