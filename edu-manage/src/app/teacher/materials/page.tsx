'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState } from 'react'
import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Tabs,
  Tag,
  Typography,
  Upload,
} from 'antd'
import { toast } from 'sonner'
import {
  DeleteOutlined, DownloadOutlined, EyeOutlined, FileTextOutlined, PlusOutlined, UploadOutlined,
} from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'
import { GRADE_SUBJECTS, GRADES, SUBJECT_COLORS } from '@/data/subjects'
import {
  materialAudienceText,
  materialFileColor,
  materialFileLabel,
  materialSourceLabel,
  materialStatusLabel,
} from '@/lib/material-format'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

type TabKey = 'all' | 'student' | 'teacher' | 'mine'

interface Material {
  id: string
  title: string
  grade: string
  subject: string
  fileName: string
  fileType: string
  description: string | null
  audience: string
  source: string
  status: string
  tags: string[]
  teacherId: string | null
  downloads: number
  createdAt: string
  uploader?: { name: string | null }
  teacher?: { id: string; name: string } | null
}

export default function TeacherMaterialsPage() {
  const [tab, setTab] = useState<TabKey>('all')
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [grade, setGrade] = useState('')
  const [subject, setSubject] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewType, setPreviewType] = useState<'pdf' | 'image' | 'word' | 'download'>('pdf')
  const [form] = Form.useForm()
  const uploadGrade = Form.useWatch('grade', form)
  const [fileList, setFileList] = useState<UploadFile[]>([])

  const fetchMaterials = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ tab })
    if (grade) params.set('grade', grade)
    if (subject) params.set('subject', subject)
    const res = await fetch(`/api/teacher/materials?${params}`)
    const data = await res.json()
    setMaterials(data.materials || [])
    setLoading(false)
  }, [tab, grade, subject])

  useEffect(() => { fetchMaterials() }, [fetchMaterials])

  const subjectOptions = useMemo(() => {
    const source = grade ? GRADE_SUBJECTS[grade] || [] : Array.from(new Set(Object.values(GRADE_SUBJECTS).flat()))
    return source.map((item) => ({ label: item, value: item }))
  }, [grade])

  const uploadSubjects = (uploadGrade ? GRADE_SUBJECTS[uploadGrade] || [] : []).map((item) => ({ label: item, value: item }))

  const handleUpload = async () => {
    const values = await form.validateFields()
    if (!fileList[0]?.originFileObj) {
      toast.warning('请选择文件')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', fileList[0].originFileObj as File)
    formData.append('title', values.title)
    formData.append('grade', values.grade)
    formData.append('subject', values.subject)
    formData.append('audience', values.audience)
    formData.append('status', values.publishNow ? 'PUBLISHED' : 'DRAFT')
    if (values.description) formData.append('description', values.description)
    if (values.tags) formData.append('tags', values.tags)

    const res = await fetch('/api/teacher/materials', { method: 'POST', body: formData })
    setUploading(false)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || '上传失败')
      return
    }
    toast.success('上传成功')
    setModalOpen(false)
    form.resetFields()
    setFileList([])
    setTab('mine')
    fetchMaterials()
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/teacher/materials/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('已删除')
      fetchMaterials()
    } else {
      toast.error('删除失败')
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
      setPreviewType(material.fileType as 'pdf' | 'image')
      setPreviewUrl(`/api/materials/${material.id}/view`)
      return
    }
    window.open(`/api/materials/${material.id}/view?download=1`, '_blank')
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <Title level={4} style={{ margin: 0 }}>学习资料</Title>
          <Text type="secondary">查看学生版、教师版资料，并上传通用练习、讲义、教案或复习资料。</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>上传资料</Button>
      </div>

      <Card style={{ marginBottom: 16, borderRadius: 8 }}>
        <Space wrap>
          <Select placeholder="全部年级" allowClear style={{ width: 140 }} value={grade || undefined} onChange={(value) => { setGrade(value || ''); setSubject('') }} options={GRADES.map((item) => ({ label: item, value: item }))} />
          <Select placeholder="全部科目" allowClear style={{ width: 140 }} value={subject || undefined} onChange={(value) => setSubject(value || '')} options={subjectOptions} />
          {(grade || subject) && <Button onClick={() => { setGrade(''); setSubject('') }}>清空筛选</Button>}
        </Space>
      </Card>

      <Tabs
        activeKey={tab}
        onChange={(key) => setTab(key as TabKey)}
        items={[
          { key: 'all', label: '全部资料' },
          { key: 'student', label: '学生版资料' },
          { key: 'teacher', label: '教师版资料' },
          { key: 'mine', label: '我上传的' },
        ]}
      />

      {materials.length === 0 && !loading ? (
        <Card><Empty description="暂无资料" /></Card>
      ) : (
        <Row gutter={[12, 12]}>
          {materials.map((material) => (
            <Col key={material.id} xs={24} md={12} xl={8}>
              <Card loading={loading} style={{ borderRadius: 8, height: '100%' }} styles={{ body: { display: 'flex', flexDirection: 'column', minHeight: 230 } }}>
                <Space align="start" style={{ width: '100%' }}>
                  <FileTextOutlined style={{ color: materialFileColor(material.fileType), fontSize: 28, marginTop: 2 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Text strong style={{ display: 'block', fontSize: 15 }} ellipsis={{ tooltip: material.title }}>{material.title}</Text>
                    <Space size={4} wrap style={{ marginTop: 8 }}>
                      <Tag>{material.grade}</Tag>
                      <Tag color={SUBJECT_COLORS[material.subject] || 'default'}>{material.subject}</Tag>
                      <Tag color={materialFileColor(material.fileType)}>{materialFileLabel(material.fileType)}</Tag>
                    </Space>
                  </div>
                </Space>
                {material.description && <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginTop: 10, marginBottom: 8 }}>{material.description}</Paragraph>}
                <Space size={4} wrap>
                  <Tag color={material.audience === 'TEACHER' ? 'orange' : material.audience === 'BOTH' ? 'blue' : 'green'}>{materialAudienceText(material.audience)}</Tag>
                  <Tag>{materialSourceLabel(material.source)}</Tag>
                  {tab === 'mine' && <Tag color={material.status === 'DRAFT' ? 'default' : 'success'}>{materialStatusLabel(material.status)}</Tag>}
                  {material.tags?.map((tag) => <Tag key={tag}>{tag}</Tag>)}
                </Space>
                <Text type="secondary" style={{ fontSize: 12, marginTop: 10 }}>
                  上传者：{material.teacher?.name || material.uploader?.name || '我'} · {new Date(material.createdAt).toLocaleDateString('zh-CN')} · {material.downloads} 次
                </Text>
                <Space style={{ marginTop: 'auto', paddingTop: 14 }}>
                  <Button icon={<EyeOutlined />} onClick={() => handlePreview(material)}>预览</Button>
                  <Button icon={<DownloadOutlined />} onClick={() => window.open(`/api/materials/${material.id}/view?download=1`, '_blank')}>下载</Button>
                  {tab === 'mine' && (
                    <Popconfirm title="确认删除该资料？" onConfirm={() => handleDelete(material.id)}>
                      <Button danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                  )}
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title="上传学习资料"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setFileList([]) }}
        onOk={handleUpload}
        confirmLoading={uploading}
        okText="上传"
        width={640}
      >
        <Form form={form} layout="vertical" initialValues={{ audience: 'TEACHER', publishNow: true }} style={{ marginTop: 16 }}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input maxLength={80} showCount />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="grade" label="年级" rules={[{ required: true, message: '请选择年级' }]}>
                <Select options={GRADES.map((item) => ({ label: item, value: item }))} onChange={() => form.setFieldValue('subject', undefined)} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="subject" label="科目" rules={[{ required: true, message: '请选择科目' }]}>
                <Select options={uploadSubjects} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="audience" label="资料类型" rules={[{ required: true }]}>
            <Select
              options={[
                { label: '教师版资料：仅教师和管理端可见', value: 'TEACHER' },
                { label: '学生版资料：家长端可见', value: 'STUDENT' },
                { label: '通用资料：家长端和教师端都可见', value: 'BOTH' },
              ]}
            />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Input placeholder="多个标签用逗号或空格分隔" />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <TextArea rows={3} maxLength={200} showCount />
          </Form.Item>
          <Form.Item name="publishNow" label="发布状态">
            <Select options={[{ label: '立即发布', value: true }, { label: '保存草稿', value: false }]} />
          </Form.Item>
          <Form.Item label="文件" required>
            <Upload beforeUpload={() => false} maxCount={1} fileList={fileList} onChange={({ fileList: list }) => setFileList(list)} accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z">
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
    </div>
  )
}
