'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { Avatar, Button, Card, Col, Empty, Input, List, Popconfirm, Row, Select, Space, Spin, Tag, Typography, message } from 'antd'
import { CheckOutlined, DeleteOutlined, MessageOutlined, ReloadOutlined, SendOutlined } from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Text, Paragraph } = Typography

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('加载失败')
  return res.json()
}

export default function CommunicationsPage() {
  const router = useRouter()
  const isMobile = useIsMobile() ?? false
  const [source, setSource] = useState('all')
  const [unread, setUnread] = useState(false)
  const [q, setQ] = useState('')
  const [replying, setReplying] = useState('')
  const [replyText, setReplyText] = useState('')
  const params = new URLSearchParams({ source, limit: '80' })
  if (unread) params.set('unread', '1')
  if (q.trim()) params.set('q', q.trim())
  const { data, mutate, isLoading } = useSWR(`/api/parent-communications?${params.toString()}`, fetcher)
  const items = Array.isArray(data?.items) ? data.items : []

  const stats = useMemo(() => ({
    total: items.length,
    unread: items.filter((item: any) => item.author?.role === 'parent' && !item.isRead).length,
    parent: items.filter((item: any) => item.author?.role === 'parent').length,
    staff: items.filter((item: any) => item.author?.role !== 'parent').length,
  }), [items])

  const markRead = async (item: any) => {
    const res = await fetch('/api/parent-communications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, type: item.type }),
    })
    if (!res.ok) return message.error('标记失败')
    message.success('已标记为已读')
    mutate()
  }

  const deleteComment = async (item: any) => {
    const res = await fetch(`/api/parent-communications?type=${item.type}&id=${item.id}&targetId=${item.targetId}`, { method: 'DELETE' })
    if (!res.ok) return message.error('删除失败')
    message.success('该条关联沟通已清除')
    mutate()
  }

  const sendReply = async (item: any) => {
    if (!replyText.trim()) return message.warning('请输入回复内容')
    const res = await fetch('/api/parent-communications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: item.type, targetId: item.targetId, content: replyText }),
    })
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      return message.error(payload.error || '回复失败')
    }
    message.success('已回复家长')
    setReplying('')
    setReplyText('')
    mutate()
  }

  return (
    <PageLayout
      title="家校沟通"
      subtitle="统一查看学习档案、在校表现中的家长留言，管理端可回复、标记和清理"
      actions={<Button icon={<ReloadOutlined />} onClick={() => mutate()}>刷新</Button>}
    >
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {[
          { label: '全部沟通', value: stats.total, color: '#1F2329', bg: '#fff' },
          { label: '家长留言', value: stats.parent, color: '#E8784A', bg: '#fff3ec' },
          { label: '未读待处理', value: stats.unread, color: '#D4537E', bg: '#fdf2f8', urgent: stats.unread > 0 },
          { label: '老师/管理回复', value: stats.staff, color: '#27A644', bg: '#f0fdf4' },
        ].map((card) => (
          <Col xs={12} sm={6} key={card.label}>
            <Card
              bordered={false}
              style={{ borderRadius: 10, border: `1px solid ${card.urgent ? '#F9A8D4' : '#EEE7E1'}`, background: card.bg, cursor: 'pointer' }}
              bodyStyle={{ padding: 14 }}
              onClick={() => card.label === '未读待处理' ? setUnread(true) : setUnread(false)}
            >
              <div style={{ fontSize: 11, color: '#98A2B3' }}>{card.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: card.color, marginTop: 4 }}>{card.value}</div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card bordered={false} style={{ borderRadius: 8, border: '1px solid #EEE7E1', marginBottom: 16 }}>
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space wrap>
            <Select
              value={source}
              onChange={setSource}
              style={{ width: 150 }}
              options={[
                { label: '全部来源', value: 'all' },
                { label: '表现反馈', value: 'post' },
                { label: '学习档案', value: 'paper' },
                { label: '课堂反馈通知', value: 'feedback' },
              ]}
            />
            <Select
              value={unread ? '1' : '0'}
              onChange={(value) => setUnread(value === '1')}
              style={{ width: 150 }}
              options={[
                { label: '全部状态', value: '0' },
                { label: '只看未读', value: '1' },
              ]}
            />
          </Space>
          <Space wrap style={{ width: isMobile ? '100%' : undefined }}>
            <Input.Search allowClear placeholder="搜索学生、老师、内容" value={q} onChange={(event) => setQ(event.target.value)} style={{ width: isMobile ? '100%' : 260 }} />
            <Button
              type="primary"
              icon={<SendOutlined />}
              style={{ background: '#E8784A', borderColor: '#E8784A' }}
              onClick={() => router.push('/notifications')}
            >
              发送新通知
            </Button>
          </Space>
        </Space>
      </Card>

      <Card bordered={false} style={{ borderRadius: 8, border: '1px solid #EEE7E1' }}>
        {isLoading ? (
          <div style={{ padding: 80, textAlign: 'center' }}><Spin size="large" /></div>
        ) : items.length === 0 ? (
          <Empty description="暂无沟通记录" />
        ) : (
          <List
            itemLayout="vertical"
            dataSource={items}
            renderItem={(item: any) => {
              const fromParent = item.author?.role === 'parent'
              const unreadParent = fromParent && !item.isRead
              return (
                <List.Item
                  key={`${item.type}-${item.id}`}
                  actions={[
                    unreadParent ? <Button key="read" size="small" icon={<CheckOutlined />} onClick={() => markRead(item)}>标记已读</Button> : null,
                    <Button key="reply" size="small" icon={<MessageOutlined />} onClick={() => setReplying(replying === item.id ? '' : item.id)}>回复</Button>,
                    <Popconfirm key="delete" title="确认清除该条内容下的全部沟通？" okText="清除" cancelText="取消" onConfirm={() => deleteComment(item)}>
                      <Button size="small" danger icon={<DeleteOutlined />}>清除沟通</Button>
                    </Popconfirm>,
                  ].filter(Boolean)}
                  style={{ borderBlockEnd: '1px solid #F0E7DE' }}
                >
                  <List.Item.Meta
                    avatar={<Avatar style={{ background: fromParent ? '#E8784A' : '#E8784A' }}>{(item.author?.name || item.author?.label || '?').charAt(0)}</Avatar>}
                    title={
                      <Space wrap>
                        <Text strong>{item.author?.name || item.author?.label || '未知用户'}</Text>
                        <Tag color={fromParent ? 'orange' : item.author?.role === 'admin' ? 'blue' : 'green'}>{item.author?.label}</Tag>
                        <Tag color={item.type === 'paper' ? 'geekblue' : 'purple'}>{item.scene}</Tag>
                        {unreadParent && <Tag color="red">未读</Tag>}
                      </Space>
                    }
                    description={
                      <div style={{ fontSize: 12 }}>
                        <span style={{ color: '#98A2B3' }}>{item.student?.name ? `学员：${item.student.name}` : '学员：-'}</span>
                        {item.teacher?.name && <span style={{ color: '#98A2B3', marginLeft: 8 }}>老师：{item.teacher.name}</span>}
                        {item.parent?.name && <span style={{ color: '#98A2B3', marginLeft: 8 }}>家长：{item.parent.name}</span>}
                        <span style={{ color: '#C4BAB0', marginLeft: 8 }}>
                          {new Date(item.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    }
                  />
                  <div style={{ paddingLeft: 48 }}>
                    <div style={{ color: '#8D806F', fontSize: 12, marginBottom: 6 }}>关联内容：{item.targetTitle || '-'}</div>
                    <Paragraph style={{ marginBottom: 0, color: '#1F2329' }}>{item.content}</Paragraph>
                    {replying === item.id && (
                      <Space.Compact style={{ width: '100%', marginTop: 12 }}>
                        <Input value={replyText} onChange={(event) => setReplyText(event.target.value)} placeholder="以管理端身份回复家长..." maxLength={200} />
                        <Button type="primary" icon={<SendOutlined />} onClick={() => sendReply(item)}>发送</Button>
                      </Space.Compact>
                    )}
                  </div>
                </List.Item>
              )
            }}
          />
        )}
      </Card>
    </PageLayout>
  )
}
