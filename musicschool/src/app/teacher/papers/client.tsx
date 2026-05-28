'use client'

import { useState } from 'react'
import useSWR from 'swr'
import {
  Button, Card, Empty, Form, Image, Input, Modal, Select, Space,
  Tag, Typography, Upload, message, Row, Col, List, Popconfirm,
} from 'antd'
import {
  DeleteOutlined, EyeOutlined, FileImageOutlined,
  InboxOutlined, PlusOutlined, SendOutlined,
} from '@ant-design/icons'
import type { UploadFile } from 'antd'

const { Title, Text } = Typography
const { TextArea } = Input
const fetcher = (url: string) => fetch(url).then(r => r.json())

export function TeacherPapersClient() {
  const [form] = Form.useForm()
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [expandedPaper, setExpandedPaper] = useState<string | null>(null)

  const { data: papers, mutate } = useSWR('/api/teacher/papers', fetcher, { refreshInterval: 30_000 })
  const { data: studentsData } = useSWR('/api/teacher/students', fetcher)
  const students = Array.isArray(studentsData?.students) ? studentsData.students : Array.isArray(studentsData) ? studentsData : []

  const paperList = Array.isArray(papers) ? papers : []

  const handleUpload = async (options: any) => {
    const formData = new FormData()
    formData.append('file', options.file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      options.onSuccess({ url: data.url }, options.file)
    } catch (e: any) {
      options.onError(e)
    }
  }

  const handlePreview = (file: UploadFile) => {
    setPreviewUrl(file.url || file.thumbUrl || '')
    setPreviewOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const imageUrls = fileList.filter(f => f.status === 'done').map(f => f.response?.url || f.url || '').filter(Boolean)
      if (imageUrls.length === 0) {
        message.error('请至少上传一张图片')
        return
      }
      setSubmitting(true)
      const res = await fetch('/api/teacher/papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: values.studentIds,
          title: values.title,
          subject: values.subject || '学习档案',
          imageUrls,
          overallComment: values.overallComment || '',
          paperDate: values.paperDate || new Date().toISOString(),
          status: values.publish ? 'PUBLISHED' : 'DRAFT',
          publish: values.publish,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      message.success(values.publish ? '已推送家长' : '草稿已保存')
      setModalOpen(false)
      form.resetFields()
      setFileList([])
      mutate()
    } catch (e: any) {
      message.error(e.message || '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>试卷上传</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>上传批改后的试卷，推送给家长查看</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}
          style={{ background: '#E8784A', borderColor: '#E8784A', borderRadius: 8 }}>
          新建试卷
        </Button>
      </div>

      {paperList.length === 0 ? (
        <Card bordered={false} style={{ borderRadius: 12, minHeight: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid #F0DDD2' }}>
          <Empty description="暂无试卷记录，点击上方按钮新建" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </Card>
      ) : (
        <List
          dataSource={paperList}
          grid={{ gutter: 16, xs: 1, sm: 2, lg: 3 }}
          renderItem={(paper: any) => {
            const urls = (() => { try { return JSON.parse(paper.imageUrls) } catch { return Array.isArray(paper.imageUrls) ? paper.imageUrls : [] } })()
            const isExpanded = expandedPaper === paper.id
            return (
              <List.Item>
                <Card
                  bordered={false}
                  style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2' }}
                  title={
                    <Space>
                      <FileImageOutlined style={{ color: '#E8784A' }} />
                      <Text strong ellipsis style={{ maxWidth: 160 }}>{paper.title}</Text>
                    </Space>
                  }
                  extra={
                    <Space size={4}>
                      <Tag color={paper.status === 'PUBLISHED' ? 'green' : 'orange'} style={{ borderRadius: 9999 }}>
                        {paper.status === 'PUBLISHED' ? '已推送' : '草稿'}
                      </Tag>
                    </Space>
                  }
                >
                  <div style={{ fontSize: 12, color: '#7A869A', marginBottom: 8 }}>
                    <div>学生：{paper.student?.name}</div>
                    <div>科目：{paper.subject} · 日期：{paper.paperDate?.slice(0, 10)}</div>
                  </div>
                  {urls.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(isExpanded ? urls : urls.slice(0, 3)).map((url: string, i: number) => (
                        <Image
                          key={i}
                          src={url}
                          width={isExpanded ? 140 : 60}
                          height={isExpanded ? 100 : 60}
                          style={{ borderRadius: 8, objectFit: 'cover', cursor: 'pointer' }}
                          preview={{ mask: <EyeOutlined /> }}
                        />
                      ))}
                      {!isExpanded && urls.length > 3 && (
                        <div onClick={() => setExpandedPaper(paper.id)} style={{
                          width: 60, height: 60, borderRadius: 8, background: '#f5f5f5',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', fontSize: 12, color: '#98A2B3',
                        }}>+{urls.length - 3}</div>
                      )}
                    </div>
                  )}
                  {isExpanded && (
                    <Button type="link" size="small" onClick={() => setExpandedPaper(null)} style={{ padding: 0, marginTop: 4 }}>
                      收起
                    </Button>
                  )}
                  {paper.overallComment && (
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
                      {paper.overallComment}
                    </Text>
                  )}
                </Card>
              </List.Item>
            )
          }}
        />
      )}

      {/* Create/Edit Modal */}
      <Modal title="新建试卷" open={modalOpen} onCancel={() => { setModalOpen(false); setFileList([]); form.resetFields() }}
        width={640} onOk={handleSubmit} confirmLoading={submitting} okText="保存草稿" destroyOnClose
        footer={(_, { OkBtn }) => (
          <Space>
            <Button onClick={() => {
              form.setFieldsValue({ publish: false })
              setTimeout(handleSubmit, 0)
            }} loading={submitting}>保存草稿</Button>
            <Button type="primary" onClick={() => {
              form.setFieldsValue({ publish: true })
              setTimeout(handleSubmit, 0)
            }} loading={submitting}
              style={{ background: '#E8784A', borderColor: '#E8784A' }}
              icon={<SendOutlined />}>推送家长</Button>
          </Space>
        )}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="试卷标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="如：期中数学试卷" />
          </Form.Item>
          <Form.Item name="studentIds" label="选择学生" rules={[{ required: true, message: '请选择学生' }]}>
            <Select mode="multiple" placeholder="选择学生" options={
              students.map((s: any) => ({ label: s.name, value: s.id }))
            } />
          </Form.Item>
          <Form.Item name="subject" label="科目">
            <Select placeholder="选择科目" allowClear options={[
              '语文', '数学', '英语', '物理', '化学', '生物', '地理', '历史', '政治',
            ].map(s => ({ label: s, value: s }))} />
          </Form.Item>
          <Form.Item name="paperDate" label="试卷日期">
            <Input type="date" />
          </Form.Item>

          <Form.Item label="上传试卷图片">
            <Upload
              listType="picture-card"
              fileList={fileList}
              customRequest={handleUpload}
              onPreview={handlePreview}
              onChange={({ fileList: newList }) => setFileList(newList)}
              multiple
              accept="image/*"
            >
              {fileList.length >= 9 ? null : (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>上传</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          <Form.Item name="overallComment" label="总体评价">
            <TextArea rows={3} placeholder="可选填" />
          </Form.Item>
          <Form.Item name="publish" hidden><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal open={previewOpen} footer={null} onCancel={() => setPreviewOpen(false)} width={800}>
        <Image src={previewUrl} style={{ width: '100%' }} preview={false} />
      </Modal>
    </div>
  )
}
