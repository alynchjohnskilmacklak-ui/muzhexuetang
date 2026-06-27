'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button, Card, Col, Form, Input, Modal, Popconfirm, Row, Select, Space,
  Statistic, Switch, Table, Tag, Typography, Upload, message,
} from 'antd'
import {
  DeleteOutlined, DownloadOutlined, EyeOutlined, FileTextOutlined, PlusOutlined, UploadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload/interface'
import { GRADE_SUBJECTS, GRADES, SUBJECT_COLORS } from '@/data/subjects'
import {
  materialAudienceLabel,
  materialFileColor,
  materialFileLabel,
  materialSourceLabel,
  materialStatusLabel,
} from '@/lib/material-format'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

interface Material {
  id: string
  title: string
  grade: string
  subject: string
  fileName: string
  fileSize: number
  fileType: string
  description: string | null
  downloads: number
  audience: string
  source: string
  status: string
  tags: string[]
  isPinned: boolean
  storageDriver: string | null
  createdAt: string
  uploader?: { name: string | null }
  teacher?: { id: string; name: string } | null
}

const OSS_DOC_EXTS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']
const OSS_MAX_SIZE = 200 * 1024 * 1024 // 200MB
const LOCAL_MAX_SIZE = 50 * 1024 * 1024 // 50MB
const LOCAL_EXTS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar', '.7z']

async function readApiError(res: Response, fallback: string) {
  const data = await res.json().catch(() => ({}))
  const error = typeof data.error === 'string' ? data.error : fallback
  const code = typeof data.code === 'string' ? data.code : undefined
  return { error, code }
}

function uploadFailureMessage(error: string, code?: string) {
  if (code === 'OSS_SDK_MISSING') {
    return '资料上传失败：OSS 依赖未安装，请联系管理员在服务器安装 ali-oss 并重启服务。'
  }
  if (code === 'OSS_CONFIG_MISSING') {
    return `资料上传失败：${error}，请联系管理员配置 OSS。`
  }
  return `资料上传失败：${error}`
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewType, setPreviewType] = useState<'pdf' | 'image' | 'word'>('pdf')
  const [filterGrade, setFilterGrade] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterAudience, setFilterAudience] = useState('')
  const [filterTeacherId, setFilterTeacherId] = useState('')
  const [ossEnabled, setOssEnabled] = useState(false)
  const [form] = Form.useForm()
  const selectedGrade = Form.useWatch('grade', form)
  const [fileList, setFileList] = useState<UploadFile[]>([])

  const fetchMaterials = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterGrade) params.set('grade', filterGrade)
    if (filterSubject) params.set('subject', filterSubject)
    if (filterAudience) params.set('audience', filterAudience)
    if (filterTeacherId) params.set('teacherId', filterTeacherId)
    const res = await fetch(`/api/materials?${params}`)
    const data = await res.json()
    setMaterials(data.materials || [])
    setLoading(false)
  }, [filterGrade, filterSubject, filterAudience, filterTeacherId])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setFilterTeacherId(params.get('teacherId') || '')
    fetch('/api/materials/oss-signature').then(r => r.json()).then(d => setOssEnabled(!!d.enabled)).catch(() => setOssEnabled(false))
  }, [])

  useEffect(() => { fetchMaterials() }, [fetchMaterials])

  const subjectOptions = useMemo(() => {
    const source = filterGrade ? GRADE_SUBJECTS[filterGrade] || [] : Array.from(new Set(Object.values(GRADE_SUBJECTS).flat()))
    return source.map((subject) => ({ label: subject, value: subject }))
  }, [filterGrade])

  const uploadSubjectOptions = (selectedGrade ? GRADE_SUBJECTS[selectedGrade] || [] : []).map((subject) => ({ label: subject, value: subject }))

  const handleUpload = async () => {
    const values = await form.validateFields()
    const file = fileList[0]?.originFileObj as File | undefined
    if (!file) {
      message.warning('请选择文件')
      return
    }

    // 校验文件类型和大小
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (ossEnabled) {
      if (!OSS_DOC_EXTS.includes(ext)) {
        message.error('仅支持 PDF、Word、Excel、PPT 文档格式')
        return
      }
      if (file.size > OSS_MAX_SIZE) {
        message.error('文件大小不能超过 200MB')
        return
      }
    } else {
      if (!LOCAL_EXTS.includes(ext)) {
        message.error('仅支持 PDF、Word、Excel、PPT、图片和压缩包格式')
        return
      }
      if (file.size > LOCAL_MAX_SIZE) {
        message.error('文件大小不能超过 50MB')
        return
      }
    }

    setUploading(true)
    try {
      if (ossEnabled) {
        // OSS 直传：获取签名 → 浏览器直传 OSS → 轻接口写元数据
        const sigRes = await fetch('/api/materials/oss-signature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, contentType: file.type }),
        })
        if (!sigRes.ok) {
          const err = await readApiError(sigRes, '获取上传签名失败')
          message.error(uploadFailureMessage(err.error, err.code))
          setUploading(false)
          return
        }
        const sig = await sigRes.json()

        const ossForm = new FormData()
        ossForm.append('key', sig.key)
        ossForm.append('policy', sig.policy)
        ossForm.append('signature', sig.signature)
        ossForm.append('OSSAccessKeyId', sig.accessKeyId)
        ossForm.append('success_action_status', '200')
        ossForm.append('file', file)

        const ossRes = await fetch(`https://${sig.host}`, { method: 'POST', body: ossForm })
        if (!ossRes.ok) {
          const errText = await ossRes.text().catch(() => '')
          message.error('资料上传失败：OSS 上传失败，' + (errText || ossRes.statusText))
          setUploading(false)
          return
        }

        // 轻接口写元数据
        const metaRes = await fetch('/api/materials/upload', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: sig.key,
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type,
            title: values.title,
            grade: values.grade,
            subject: values.subject,
            audience: values.audience,
            status: 'PUBLISHED',
            isPinned: Boolean(values.isPinned),
            description: values.description || undefined,
            tags: values.tags || undefined,
          }),
        })
        if (!metaRes.ok) {
          const err = await readApiError(metaRes, '保存资料信息失败')
          message.error(uploadFailureMessage(err.error, err.code))
          setUploading(false)
          return
        }
      } else {
        // 本地 FormData 上传
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', values.title)
        formData.append('grade', values.grade)
        formData.append('subject', values.subject)
        formData.append('audience', values.audience)
        formData.append('status', 'PUBLISHED')
        formData.append('isPinned', String(Boolean(values.isPinned)))
        if (values.description) formData.append('description', values.description)
        if (values.tags) formData.append('tags', values.tags)

        const res = await fetch('/api/materials/upload', { method: 'POST', body: formData })
        if (!res.ok) {
          const err = await readApiError(res, '上传失败')
          message.error(uploadFailureMessage(err.error, err.code))
          setUploading(false)
          return
        }
      }

      message.success('上传成功')
      setUploadOpen(false)
      form.resetFields()
      setFileList([])
      fetchMaterials()
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/materials?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      message.success('已删除')
      fetchMaterials()
    } else {
      message.error('删除失败')
    }
  }

  const handlePreview = async (material: Material) => {
    if (material.fileType === 'word') {
      const res = await fetch(`/api/materials/${material.id}/view`)
      const data = await res.json()
      if (data.viewerUrl) {
        setPreviewType('word')
        setPreviewUrl(data.viewerUrl)
      }
      return
    }
    if (['pdf', 'image'].includes(material.fileType)) {
      // OSS 文件返回 JSON { type, url }，本地文件返回二进制
      const url = `/api/materials/${material.id}/view`
      if (material.storageDriver === 'aliyun-oss') {
        const res = await fetch(url)
        const data = await res.json()
        if (data.url) {
          setPreviewType(material.fileType as 'pdf' | 'image')
          setPreviewUrl(data.url)
        }
        return
      }
      setPreviewType(material.fileType as 'pdf' | 'image')
      setPreviewUrl(url)
      return
    }
    window.open(`/api/materials/${material.id}/view?download=1`, '_blank')
  }

  const columns: ColumnsType<Material> = [
    {
      title: '标题',
      dataIndex: 'title',
      render: (title: string, row) => (
        <div style={{ minWidth: 220 }}>
          <Text strong>{title}</Text>
          {row.description && <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{row.description}</Text>}
          <Space size={4} wrap style={{ marginTop: 6 }}>
            {row.tags?.map((tag) => <Tag key={tag}>{tag}</Tag>)}
          </Space>
        </div>
      ),
    },
    { title: '年级', dataIndex: 'grade', width: 90, render: (grade: string) => <Tag>{grade}</Tag> },
    { title: '科目', dataIndex: 'subject', width: 90, render: (subject: string) => <Tag color={SUBJECT_COLORS[subject] || 'default'}>{subject}</Tag> },
    { title: '资料类型', dataIndex: 'audience', width: 110, render: (value: string) => <Tag color={value === 'TEACHER' ? 'orange' : value === 'BOTH' ? 'blue' : 'green'}>{materialAudienceLabel(value)}</Tag> },
    { title: '来源', dataIndex: 'source', width: 100, render: (value: string) => materialSourceLabel(value) },
    { title: '上传老师', dataIndex: ['teacher', 'name'], width: 110, render: (value: string) => value || '-' },
    { title: '文件类型', dataIndex: 'fileType', width: 100, render: (type: string) => <Tag color={materialFileColor(type)}>{materialFileLabel(type)}</Tag> },
    { title: '下载次数', dataIndex: 'downloads', width: 90 },
    { title: '状态', dataIndex: 'status', width: 90, render: (value: string) => <Tag color={value === 'PUBLISHED' ? 'success' : 'default'}>{materialStatusLabel(value)}</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', width: 120, render: (time: string) => new Date(time).toLocaleDateString('zh-CN') },
    {
      title: '操作',
      width: 170,
      fixed: 'right',
      render: (_value, row) => (
        <Space>
          <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => handlePreview(row)}>预览</Button>
          <Button size="small" type="link" icon={<DownloadOutlined />} onClick={() => window.open(`/api/materials/${row.id}/view?download=1`, '_blank')}>下载</Button>
          <Popconfirm title="删除后家长端和教师端都不可见，确认删除？" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const studentCount = materials.filter((item) => item.audience === 'STUDENT').length
  const teacherCount = materials.filter((item) => item.audience === 'TEACHER').length
  const bothCount = materials.filter((item) => item.audience === 'BOTH').length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <Title level={4} style={{ margin: 0 }}>学习资料管理</Title>
          <Text type="secondary">统一管理学生版资料、教师版资料和通用资料。</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setUploadOpen(true)}>上传资料</Button>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}><Card><Statistic title="全部资料" value={materials.length} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="学生版" value={studentCount} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="教师版" value={teacherCount} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="通用" value={bothCount} /></Card></Col>
      </Row>

      <Card style={{ marginBottom: 16, borderRadius: 8 }}>
        <Space wrap>
          <Select placeholder="全部年级" allowClear style={{ width: 130 }} value={filterGrade || undefined} onChange={(value) => { setFilterGrade(value || ''); setFilterSubject('') }} options={GRADES.map((grade) => ({ label: grade, value: grade }))} />
          <Select placeholder="全部科目" allowClear style={{ width: 130 }} value={filterSubject || undefined} onChange={(value) => setFilterSubject(value || '')} options={subjectOptions} />
          <Select placeholder="全部类型" allowClear style={{ width: 150 }} value={filterAudience || undefined} onChange={(value) => setFilterAudience(value || '')} options={[
            { label: '学生版资料', value: 'STUDENT' },
            { label: '教师版资料', value: 'TEACHER' },
            { label: '通用资料', value: 'BOTH' },
          ]} />
          {filterTeacherId && <Tag closable onClose={() => setFilterTeacherId('')}>已筛选教师：{filterTeacherId}</Tag>}
          {(filterGrade || filterSubject || filterAudience || filterTeacherId) && <Button onClick={() => { setFilterGrade(''); setFilterSubject(''); setFilterAudience(''); setFilterTeacherId('') }}>清空筛选</Button>}
        </Space>
      </Card>

      <div className="desktop-material-table">
        <Card style={{ borderRadius: 8 }}>
          <Table columns={columns} dataSource={materials} loading={loading} rowKey="id" pagination={{ pageSize: 20 }} scroll={{ x: 1300 }} />
        </Card>
      </div>

      <div className="mobile-material-cards">
        <Row gutter={[12, 12]}>
          {materials.map((material) => (
            <Col key={material.id} span={24}>
              <Card style={{ borderRadius: 8 }}>
                <Space align="start">
                  <FileTextOutlined style={{ color: materialFileColor(material.fileType), fontSize: 28 }} />
                  <div style={{ minWidth: 0 }}>
                    <Text strong style={{ display: 'block' }} ellipsis={{ tooltip: material.title }}>{material.title}</Text>
                    <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginBottom: 8 }}>{material.description || material.fileName}</Paragraph>
                    <Space size={4} wrap>
                      <Tag>{material.grade}</Tag>
                      <Tag color={SUBJECT_COLORS[material.subject] || 'default'}>{material.subject}</Tag>
                      <Tag color={material.audience === 'TEACHER' ? 'orange' : material.audience === 'BOTH' ? 'blue' : 'green'}>{materialAudienceLabel(material.audience)}</Tag>
                      <Tag color={materialFileColor(material.fileType)}>{materialFileLabel(material.fileType)}</Tag>
                    </Space>
                    <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 8 }}>
                      {materialSourceLabel(material.source)} · {material.teacher?.name || material.uploader?.name || '-'} · {new Date(material.createdAt).toLocaleDateString('zh-CN')}
                    </Text>
                    <Space style={{ marginTop: 10 }}>
                      <Button icon={<EyeOutlined />} onClick={() => handlePreview(material)}>预览</Button>
                      <Button icon={<DownloadOutlined />} onClick={() => window.open(`/api/materials/${material.id}/view?download=1`, '_blank')}>下载</Button>
                      <Popconfirm title="确认删除？" onConfirm={() => handleDelete(material.id)}>
                        <Button danger icon={<DeleteOutlined />}>删除</Button>
                      </Popconfirm>
                    </Space>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      <Modal title="上传学习资料" open={uploadOpen} onCancel={() => { setUploadOpen(false); form.resetFields(); setFileList([]) }} onOk={handleUpload} confirmLoading={uploading} okText="上传" width={640}>
        <Form form={form} layout="vertical" initialValues={{ audience: 'STUDENT', isPinned: false }} style={{ marginTop: 16 }}>
          <Form.Item name="title" label="资料标题" rules={[{ required: true, message: '请输入资料标题' }]}>
            <Input maxLength={80} showCount />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="grade" label="年级" rules={[{ required: true, message: '请选择年级' }]}>
                <Select options={GRADES.map((grade) => ({ label: grade, value: grade }))} onChange={() => form.setFieldValue('subject', undefined)} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="subject" label="科目" rules={[{ required: true, message: '请选择科目' }]}>
                <Select options={uploadSubjectOptions} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="audience" label="资料类型" rules={[{ required: true }]}>
            <Select options={[
              { label: '学生版资料：家长端可见，教师端也可查看', value: 'STUDENT' },
              { label: '教师版资料：仅教师端和管理端可见', value: 'TEACHER' },
              { label: '通用资料：家长端和教师端都可见', value: 'BOTH' },
            ]} />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Input placeholder="多个标签用逗号或空格分隔" />
          </Form.Item>
          <Form.Item name="isPinned" label="是否置顶" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="description" label="资料说明">
            <TextArea rows={3} maxLength={200} showCount />
          </Form.Item>
          <Form.Item label="上传文件" required>
            <Upload beforeUpload={() => false} maxCount={1} fileList={fileList} onChange={({ fileList: list }) => setFileList(list)} accept={ossEnabled ? '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx' : '.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z'}>
              <Button icon={<UploadOutlined />} style={{ minHeight: 40 }}>选择文件</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="资料预览" open={!!previewUrl} footer={null} onCancel={() => setPreviewUrl(null)} width="90vw" style={{ top: 20 }} styles={{ body: { padding: 0 } }}>
        {previewUrl && previewType === 'pdf' && <iframe src={previewUrl} title="PDF预览" style={{ width: '100%', height: '80vh', border: 0 }} />}
        {previewUrl && previewType === 'word' && <iframe src={previewUrl} title="Word预览" style={{ width: '100%', height: '80vh', border: 0 }} />}
        {previewUrl && previewType === 'image' && <div style={{ textAlign: 'center', padding: 16 }}><img src={previewUrl} alt="" style={{ maxWidth: '100%', maxHeight: '78vh', objectFit: 'contain' }} /></div>}
      </Modal>

      <style jsx>{`
        .mobile-material-cards { display: none; }
        @media (max-width: 768px) {
          .desktop-material-table { display: none; }
          .mobile-material-cards { display: block; }
        }
      `}</style>
    </div>
  )
}
