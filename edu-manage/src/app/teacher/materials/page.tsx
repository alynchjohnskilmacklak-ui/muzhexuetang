'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button, Col, Empty, Form, Input, Modal, Popconfirm, Row, Select, Skeleton, Space,
  Tabs, Tag, Typography, Upload,
} from 'antd'
import {
  DeleteOutlined, DownloadOutlined, EyeOutlined, FileTextOutlined, PlusOutlined, UploadOutlined,
} from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'
import { toast } from 'sonner'
import { fmtDate } from '@/lib/format-date'
import { GRADE_SUBJECTS, GRADES, SUBJECT_COLORS } from '@/data/subjects'
import {
  materialAudienceText,
  materialFileLabel,
} from '@/lib/material-format'

const { Title, Text } = Typography
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

const FILE_TYPE_STYLE: Record<string, { color: string; bg: string }> = {
  pdf: { color: '#E24B4A', bg: 'rgba(226,75,74,.10)' },
  word: { color: '#185FA5', bg: 'rgba(24,95,165,.10)' },
  doc: { color: '#185FA5', bg: 'rgba(24,95,165,.10)' },
  docx: { color: '#185FA5', bg: 'rgba(24,95,165,.10)' },
  ppt: { color: '#E8784A', bg: 'rgba(232,120,74,.12)' },
  pptx: { color: '#E8784A', bg: 'rgba(232,120,74,.12)' },
  excel: { color: '#1D9E75', bg: 'rgba(29,158,117,.10)' },
  xls: { color: '#1D9E75', bg: 'rgba(29,158,117,.10)' },
  xlsx: { color: '#1D9E75', bg: 'rgba(29,158,117,.10)' },
}

const AUDIENCE_STYLE: Record<string, { color: string; bg: string }> = {
  STUDENT: { color: '#1D9E75', bg: 'rgba(29,158,117,.10)' },
  TEACHER: { color: '#185FA5', bg: 'rgba(24,95,165,.10)' },
  BOTH: { color: '#E8784A', bg: 'rgba(232,120,74,.12)' },
}

function rgbaFromHex(hex: string | undefined, alpha: number) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return `rgba(232,120,74,${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function getFileStyle(material: Pick<Material, 'fileType' | 'fileName'>) {
  const ext = material.fileName?.split('.').pop()?.toLowerCase() || ''
  return FILE_TYPE_STYLE[material.fileType] || FILE_TYPE_STYLE[ext] || { color: '#7a7fad', bg: 'rgba(122,127,173,.12)' }
}

function softTagStyle(color?: string) {
  return {
    color: color || '#5a4e3a',
    backgroundColor: rgbaFromHex(color, 0.10),
    border: `1px solid ${rgbaFromHex(color, 0.20)}`,
  }
}

function audienceTagStyle(audience: string) {
  const style = AUDIENCE_STYLE[audience] || AUDIENCE_STYLE.BOTH
  return {
    color: style.color,
    backgroundColor: style.bg,
    border: `1px solid ${style.bg}`,
  }
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
    <div className="teacher-materials-page">
      <div className="materials-header">
        <div className="materials-heading">
          <Title level={4} className="materials-title">学习资料</Title>
          <Text type="secondary" className="materials-subtitle">上传与查看教学资料</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>上传资料</Button>
      </div>

      <div className="materials-filters">
        <Select placeholder="全部年级" allowClear className="materials-select" value={grade || undefined} onChange={(value) => { setGrade(value || ''); setSubject('') }} options={GRADES.map((item) => ({ label: item, value: item }))} />
        <Select placeholder="全部科目" allowClear className="materials-select" value={subject || undefined} onChange={(value) => setSubject(value || '')} options={subjectOptions} />
        {(grade || subject) && <Button className="clear-filter" onClick={() => { setGrade(''); setSubject('') }}>清空筛选</Button>}
      </div>

      <Tabs
        className="materials-tabs"
        activeKey={tab}
        onChange={(key) => setTab(key as TabKey)}
        items={[
          { key: 'all', label: '全部资料' },
          { key: 'student', label: '学生版资料' },
          { key: 'teacher', label: '教师版资料' },
          { key: 'mine', label: '我上传的' },
        ]}
      />

      {loading ? (
        <div className="materials-list">
          <Skeleton active paragraph={{ rows: 3 }} />
          <Skeleton active paragraph={{ rows: 3 }} />
          <Skeleton active paragraph={{ rows: 3 }} />
        </div>
      ) : materials.length === 0 ? (
        <div className="materials-empty"><Empty description="暂无资料,点击右上角上传" /></div>
      ) : (
        <div className="materials-list">
          {materials.map((material) => (
            <div key={material.id} className="material-card">
              <div className="file-icon" style={{ color: getFileStyle(material).color, backgroundColor: getFileStyle(material).bg }}>
                <FileTextOutlined />
              </div>
              <div className="material-body">
                <Text strong className="material-title" ellipsis={{ tooltip: material.title }}>{material.title}</Text>
                <Space size={4} wrap className="material-tags">
                  <Tag className="material-tag">{material.grade}</Tag>
                  <Tag className="material-tag" style={softTagStyle(SUBJECT_COLORS[material.subject])}>{material.subject}</Tag>
                  <Tag className="material-tag" style={{ color: getFileStyle(material).color, backgroundColor: getFileStyle(material).bg, border: `1px solid ${getFileStyle(material).bg}` }}>{materialFileLabel(material.fileType)}</Tag>
                  <Tag className="material-tag" style={audienceTagStyle(material.audience)}>{materialAudienceText(material.audience)}</Tag>
                </Space>
                <Text type="secondary" className="material-meta" ellipsis>
                  {material.teacher?.name || material.uploader?.name || '我'} · {fmtDate(material.createdAt)} · 下载{material.downloads || 0}次
                </Text>
              </div>
              <div className="material-actions">
                <Button type="text" icon={<EyeOutlined />} onClick={() => handlePreview(material)}><span className="action-label">预览</span></Button>
                <Button type="text" icon={<DownloadOutlined />} onClick={() => window.open(`/api/materials/${material.id}/view?download=1`, '_blank')}><span className="action-label">下载</span></Button>
                  {tab === 'mine' && (
                    <Popconfirm title="确认删除该资料？" onConfirm={() => handleDelete(material.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />}><span className="action-label">删除</span></Button>
                    </Popconfirm>
                  )}
              </div>
            </div>
          ))}
        </div>
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

      <style jsx>{`
        .teacher-materials-page {
          width: 100%;
        }

        .materials-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .materials-heading {
          min-width: 0;
        }

        .materials-title {
          margin: 0 !important;
          color: #1a1201 !important;
        }

        .materials-subtitle {
          font-size: 13px;
        }

        .materials-filters {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
          flex-wrap: wrap;
        }

        .materials-select {
          width: 144px;
        }

        .clear-filter {
          min-height: 32px;
        }

        .materials-tabs {
          margin-bottom: 8px;
        }

        .materials-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .material-card {
          display: flex;
          align-items: center;
          gap: 14px;
          min-height: 128px;
          padding: 16px;
          border: 1px solid rgba(0,0,0,.06);
          border-radius: 10px;
          background: #fff;
          box-shadow: 0 8px 20px rgba(26,18,1,.035);
        }

        .file-icon {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 48px;
          font-size: 24px;
        }

        .material-body {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .material-title {
          display: block;
          max-width: 100%;
          font-size: 16px;
          line-height: 1.35;
          color: #1a1201;
        }

        .material-tags {
          min-height: 22px;
        }

        :global(.material-tag) {
          height: 22px;
          line-height: 20px;
          margin-inline-end: 0;
          border-radius: 999px;
          padding: 0 8px;
          font-size: 12px;
          color: #5a4e3a;
          background: #f5f2ee;
          border: 1px solid rgba(0,0,0,.06);
        }

        .material-meta {
          display: block;
          font-size: 12px;
          color: #9a8e7a;
        }

        .material-actions {
          flex: 0 0 78px;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 4px;
        }

        .materials-empty {
          min-height: 240px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px dashed rgba(0,0,0,.10);
          border-radius: 10px;
          background: #fff;
        }

        @media (max-width: 560px) {
          .materials-header {
            align-items: flex-start;
          }

          .materials-select {
            flex: 1 1 calc(50% - 4px);
            min-width: 132px;
          }

          .material-card {
            gap: 10px;
            padding: 12px;
            min-height: 120px;
          }

          .file-icon {
            width: 44px;
            height: 44px;
            flex-basis: 44px;
            font-size: 22px;
          }

          .material-actions {
            flex-basis: 36px;
            align-items: center;
          }

          .action-label {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
