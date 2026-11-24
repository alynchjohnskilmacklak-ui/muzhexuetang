'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import NextImage from 'next/image'
import {
  Button, Form, Input, Popconfirm, Segmented, Select, Space,
  Switch, Table, Tag, Upload, message, Tooltip,
} from 'antd'
import { BrandModal } from '@/components/Common/BrandModal'
import {
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileImageOutlined,
  FileTextOutlined,
  PlusOutlined,
  UploadOutlined,
  SearchOutlined,
  ReloadOutlined,
  CloudServerOutlined,
  CheckCircleOutlined,
  UserOutlined,
  TeamOutlined,
  FolderOpenOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload/interface'
import { GRADE_SUBJECTS, GRADES, SUBJECT_COLORS } from '@/data/subjects'
import {
  materialAudienceLabel,
  materialFileLabel,
  materialSourceLabel,
  materialStatusLabel,
} from '@/lib/material-format'

const { TextArea } = Input

interface Material {
  id: string
  title: string
  grade: string
  subject: string
  fileName: string
  fileSize: number
  fileType: string
  materialType: string
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
const MATERIAL_TYPE_NAMES: Record<string, string> = {
  TEXTBOOK: '课本',
  HANDOUT: '讲义',
  EXERCISE: '题库',
  EXAM: '试卷',
  ANSWER: '答案',
  REFERENCE: '参考',
}

function getFileIcon(type: string) {
  switch (type?.toLowerCase()) {
    case 'pdf':
      return <FilePdfOutlined style={{ color: '#E03131' }} />
    case 'word':
    case 'doc':
    case 'docx':
      return <FileWordOutlined style={{ color: '#1971C2' }} />
    case 'excel':
    case 'xls':
    case 'xlsx':
      return <FileExcelOutlined style={{ color: '#2F9E44' }} />
    case 'ppt':
    case 'pptx':
      return <FilePptOutlined style={{ color: '#D9480F' }} />
    case 'image':
    case 'png':
    case 'jpg':
    case 'jpeg':
      return <FileImageOutlined style={{ color: '#9C36B5' }} />
    default:
      return <FileTextOutlined style={{ color: '#14574D' }} />
  }
}

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

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
  const [searchKeyword, setSearchKeyword] = useState('')
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
    fetch('/api/materials/oss-signature')
      .then(r => r.json())
      .then(d => setOssEnabled(!!d.enabled))
      .catch(() => setOssEnabled(false))
  }, [])

  useEffect(() => {
    fetchMaterials()
  }, [fetchMaterials])

  const subjectOptions = useMemo(() => {
    const source = filterGrade ? GRADE_SUBJECTS[filterGrade] || [] : Array.from(new Set(Object.values(GRADE_SUBJECTS).flat()))
    return source.map((subject) => ({ label: subject, value: subject }))
  }, [filterGrade])

  const uploadSubjectOptions = (selectedGrade ? GRADE_SUBJECTS[selectedGrade] || [] : []).map((subject) => ({ label: subject, value: subject }))

  // 前端关键字过滤
  const filteredMaterials = useMemo(() => {
    if (!searchKeyword.trim()) return materials
    const kw = searchKeyword.trim().toLowerCase()
    return materials.filter(m =>
      m.title.toLowerCase().includes(kw) ||
      m.fileName?.toLowerCase().includes(kw) ||
      m.teacher?.name?.toLowerCase().includes(kw) ||
      m.uploader?.name?.toLowerCase().includes(kw) ||
      m.subject?.toLowerCase().includes(kw),
    )
  }, [materials, searchKeyword])

  const handleUpload = async () => {
    const values = await form.validateFields()
    const file = fileList[0]?.originFileObj as File | undefined
    if (!file) {
      message.warning('请选择文件')
      return
    }

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
            materialType: values.materialType,
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
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', values.title)
        formData.append('grade', values.grade)
        formData.append('subject', values.subject)
        formData.append('audience', values.audience)
        formData.append('materialType', values.materialType)
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

      message.success('资料上传成功')
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
      message.success('资料已删除')
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
      title: '资料名称',
      dataIndex: 'title',
      render: (title: string, row) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 260 }}>
          <div style={{ fontSize: 20, paddingTop: 2 }}>
            {getFileIcon(row.fileType)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#17352F', lineHeight: 1.35 }}>{title}</div>
            <div style={{ fontSize: 11.5, color: '#8A7E6B', marginTop: 2 }}>
              {row.fileName} {row.fileSize ? `· ${formatBytes(row.fileSize)}` : ''}
            </div>
            {row.description && <div style={{ fontSize: 12, color: '#999', marginTop: 3 }}>{row.description}</div>}
          </div>
        </div>
      ),
    },
    {
      title: '学段学科',
      width: 140,
      render: (_, row) => (
        <Space size={4}>
          <Tag color="default">{row.grade}</Tag>
          <Tag color={SUBJECT_COLORS[row.subject] || 'default'}>{row.subject}</Tag>
        </Space>
      ),
    },
    {
      title: '分类 / 受众',
      width: 160,
      render: (_, row) => (
        <Space size={4}>
          <Tag color="cyan">{MATERIAL_TYPE_NAMES[row.materialType] || '讲义'}</Tag>
          <Tag color={row.audience === 'TEACHER' ? 'orange' : row.audience === 'BOTH' ? 'blue' : 'green'}>
            {materialAudienceLabel(row.audience)}
          </Tag>
        </Space>
      ),
    },
    {
      title: '上传人 / 时间',
      width: 160,
      render: (_, row) => (
        <div style={{ fontSize: 12 }}>
          <div style={{ color: '#17352F', fontWeight: 600 }}>{row.teacher?.name || row.uploader?.name || '管理员'}</div>
          <div style={{ color: '#999' }}>{new Date(row.createdAt).toLocaleDateString('zh-CN')}</div>
        </div>
      ),
    },
    {
      title: '下载次数',
      dataIndex: 'downloads',
      width: 90,
      align: 'center',
      render: (v) => <span style={{ fontWeight: 700, color: '#14574D' }}>{v || 0}</span>,
    },
    {
      title: '操作',
      width: 160,
      fixed: 'right',
      render: (_value, row) => (
        <Space direction="horizontal" size={8}>
          <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => handlePreview(row)}>
            预览
          </Button>
          <Button size="small" type="link" icon={<DownloadOutlined />} onClick={() => window.open(`/api/materials/${row.id}/view?download=1`, '_blank')}>
            下载
          </Button>
          <Popconfirm title="删除后家长端和教师端都不可见，确认删除？" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const studentCount = materials.filter((item) => item.audience === 'STUDENT').length
  const teacherCount = materials.filter((item) => item.audience === 'TEACHER').length
  const bothCount = materials.filter((item) => item.audience === 'BOTH').length
  const hasFilter = Boolean(filterGrade || filterSubject || filterAudience || filterTeacherId || searchKeyword)

  return (
    <div className="admin-materials-view">
      {/* 
        【顶部 Header 与状态栏】
      */}
      <div className="admin-header-card">
        <div className="admin-header-left">
          <div className="title-row">
            <h1 className="admin-page-title">学习资料管理</h1>
            <span className="driver-pill">
              <CloudServerOutlined /> {ossEnabled ? '阿里云 OSS 存储' : '本地安全存储'}
            </span>
          </div>
          <p className="admin-page-subtitle">
            全校教学资料统一中台 · 涵盖学生同步课本、章节讲义、单元试卷与教师备课包
          </p>
        </div>

        <div className="admin-header-right">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="upload-hero-btn"
            onClick={() => setUploadOpen(true)}
          >
            上传学习资料
          </Button>
        </div>
      </div>

      {/* 
        【指标看板：微拟物紧凑一体化条】
        告别原先 4 个傻大方块，采用单行连贯卡片，可点击快速筛选
      */}
      <div className="stats-strip">
        <div
          className={`stat-cell ${filterAudience === '' ? 'active' : ''}`}
          onClick={() => setFilterAudience('')}
        >
          <div className="stat-icon-wrap" style={{ background: 'rgba(20, 87, 77, 0.1)', color: '#14574D' }}>
            <FolderOpenOutlined />
          </div>
          <div className="stat-text-box">
            <span className="stat-label">全部学习资料</span>
            <span className="stat-number">{materials.length}</span>
          </div>
        </div>

        <div
          className={`stat-cell ${filterAudience === 'STUDENT' ? 'active' : ''}`}
          onClick={() => setFilterAudience('STUDENT')}
        >
          <div className="stat-icon-wrap" style={{ background: 'rgba(47, 158, 68, 0.1)', color: '#2F9E44' }}>
            <UserOutlined />
          </div>
          <div className="stat-text-box">
            <span className="stat-label">学生版 · 家长可见</span>
            <span className="stat-number">{studentCount}</span>
          </div>
        </div>

        <div
          className={`stat-cell ${filterAudience === 'TEACHER' ? 'active' : ''}`}
          onClick={() => setFilterAudience('TEACHER')}
        >
          <div className="stat-icon-wrap" style={{ background: 'rgba(245, 159, 0, 0.1)', color: '#F59F00' }}>
            <TeamOutlined />
          </div>
          <div className="stat-text-box">
            <span className="stat-label">教师版 · 内部备课</span>
            <span className="stat-number">{teacherCount}</span>
          </div>
        </div>

        <div
          className={`stat-cell ${filterAudience === 'BOTH' ? 'active' : ''}`}
          onClick={() => setFilterAudience('BOTH')}
        >
          <div className="stat-icon-wrap" style={{ background: 'rgba(25, 113, 194, 0.1)', color: '#1971C2' }}>
            <AppstoreOutlined />
          </div>
          <div className="stat-text-box">
            <span className="stat-label">通用版 · 全员共享</span>
            <span className="stat-number">{bothCount}</span>
          </div>
        </div>
      </div>

      {/* 
        【一体化工作台筛选栏】
        搜索、年级、科目、受众紧凑整合，告别松散多排堆叠
      */}
      <div className="filter-work-bar">
        <div className="filter-inputs">
          <Input
            prefix={<SearchOutlined style={{ color: '#A09580' }} />}
            placeholder="搜索资料名称 / 上传老师..."
            allowClear
            className="search-input"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />

          <Select
            placeholder="全部年级"
            allowClear
            className="filter-select"
            value={filterGrade || undefined}
            onChange={(value) => {
              setFilterGrade(value || '')
              setFilterSubject('')
            }}
            options={GRADES.map((grade) => ({ label: grade, value: grade }))}
          />

          <Select
            placeholder="全部科目"
            allowClear
            className="filter-select"
            value={filterSubject || undefined}
            onChange={(value) => setFilterSubject(value || '')}
            options={subjectOptions}
          />
        </div>

        <div className="filter-audience-wrap">
          <Segmented
            aria-label="资料受众"
            value={filterAudience || 'all'}
            onChange={(val) => setFilterAudience(val === 'all' ? '' : String(val))}
            options={[
              { label: '全部', value: 'all' },
              { label: '学生版', value: 'STUDENT' },
              { label: '教师版', value: 'TEACHER' },
              { label: '通用版', value: 'BOTH' },
            ]}
          />

          {hasFilter && (
            <button
              type="button"
              className="clear-btn"
              onClick={() => {
                setFilterGrade('')
                setFilterSubject('')
                setFilterAudience('')
                setFilterTeacherId('')
                setSearchKeyword('')
              }}
            >
              <ReloadOutlined /> 重置
            </button>
          )}
        </div>
      </div>

      {/* 
        【桌面端：现代化 Table 呈现】
      */}
      <div className="desktop-table-container">
        <Table
          columns={columns}
          dataSource={filteredMaterials}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 15, showTotal: (t) => `共 ${t} 份资料` }}
          scroll={{ x: 1080 }}
          className="admin-clean-table"
        />
      </div>

      {/* 
        【移动端：全新精致卡片列表】
        杜绝原来的 3 个粗苯大按钮，采用清晰层级与紧凑操作
      */}
      <div className="mobile-cards-container">
        {filteredMaterials.length === 0 ? (
          <div className="mobile-empty">
            <p>未找到符合条件的学习资料</p>
          </div>
        ) : (
          filteredMaterials.map((material) => (
            <div key={material.id} className="mobile-material-card">
              <div className="card-top-row">
                <div className="doc-type-icon">
                  {getFileIcon(material.fileType)}
                </div>
                <div className="doc-main-info">
                  <h3 className="doc-title">{material.title}</h3>
                  <div className="doc-file-meta">
                    {material.fileName} {material.fileSize ? `· ${formatBytes(material.fileSize)}` : ''}
                  </div>
                </div>
              </div>

              <div className="card-badge-row">
                <span className="badge-grade">{material.grade}</span>
                <span
                  className="badge-subject"
                  style={{
                    color: SUBJECT_COLORS[material.subject] || '#14574D',
                    background: 'rgba(20, 87, 77, 0.08)',
                  }}
                >
                  {material.subject}
                </span>
                <span className="badge-type">
                  {MATERIAL_TYPE_NAMES[material.materialType] || '讲义'}
                </span>
                <span
                  className="badge-audience"
                  style={{
                    color: material.audience === 'TEACHER' ? '#D9480F' : material.audience === 'BOTH' ? '#1971C2' : '#2F9E44',
                    background: material.audience === 'TEACHER' ? 'rgba(217, 72, 15, 0.08)' : material.audience === 'BOTH' ? 'rgba(25, 113, 194, 0.08)' : 'rgba(47, 158, 68, 0.08)',
                  }}
                >
                  {materialAudienceLabel(material.audience)}
                </span>
              </div>

              <div className="card-bottom-row">
                <span className="uploader-info">
                  {material.teacher?.name || material.uploader?.name || '管理员'} · {new Date(material.createdAt).toLocaleDateString('zh-CN')}
                </span>

                <div className="card-action-btns">
                  <button
                    type="button"
                    className="m-btn m-btn-preview"
                    onClick={() => handlePreview(material)}
                  >
                    <EyeOutlined /> 预览
                  </button>
                  <button
                    type="button"
                    className="m-btn m-btn-download"
                    title="下载资料"
                    onClick={() => window.open(`/api/materials/${material.id}/view?download=1`, '_blank')}
                  >
                    <DownloadOutlined />
                  </button>
                  <Popconfirm
                    title="确认彻底删除该资料？"
                    description="删除后家长端和教师端都将不可见。"
                    onConfirm={() => handleDelete(material.id)}
                    okText="删除"
                    cancelText="取消"
                  >
                    <button type="button" className="m-btn m-btn-delete" title="删除资料">
                      <DeleteOutlined />
                    </button>
                  </Popconfirm>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 
        【上传资料模态弹窗】
      */}
      <BrandModal
        title="上传学习资料"
        open={uploadOpen}
        onCancel={() => {
          setUploadOpen(false)
          form.resetFields()
          setFileList([])
        }}
        onOk={handleUpload}
        confirmLoading={uploading}
        okText="确认上传"
        width={640}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ audience: 'STUDENT', materialType: 'HANDOUT', isPinned: false }}
          style={{ marginTop: 12 }}
        >
          <Form.Item name="title" label="资料标题" rules={[{ required: true, message: '请输入资料标题' }]}>
            <Input maxLength={80} showCount placeholder="如：七年级上册英语第一单元核心语法精讲" />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="grade" label="学段年级" rules={[{ required: true, message: '请选择年级' }]}>
              <Select
                options={GRADES.map((grade) => ({ label: grade, value: grade }))}
                onChange={() => form.setFieldValue('subject', undefined)}
                placeholder="选择年级"
              />
            </Form.Item>
            <Form.Item name="subject" label="所属学科" rules={[{ required: true, message: '请选择科目' }]}>
              <Select options={uploadSubjectOptions} placeholder="选择学科" />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="materialType" label="资料分类" rules={[{ required: true, message: '请选择资料分类' }]}>
              <Select
                virtual={false}
                options={[
                  { label: '同步课本', value: 'TEXTBOOK' },
                  { label: '章节讲义', value: 'HANDOUT' },
                  { label: '课后题库', value: 'EXERCISE' },
                  { label: '单元试卷', value: 'EXAM' },
                  { label: '参考答案', value: 'ANSWER' },
                  { label: '拓展参考', value: 'REFERENCE' },
                ]}
              />
            </Form.Item>
            <Form.Item name="audience" label="公开范围" rules={[{ required: true }]}>
              <Select
                options={[
                  { label: '学生版（家长端、教师端均可见）', value: 'STUDENT' },
                  { label: '教师版（仅教师端、管理端可见）', value: 'TEACHER' },
                  { label: '通用版（全员均可见）', value: 'BOTH' },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item name="tags" label="检索标签">
            <Input placeholder="输入标签，方便快速分类检索（多个以空格隔开）" />
          </Form.Item>

          <Form.Item name="isPinned" label="置顶显示" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="description" label="资料说明（选填）">
            <TextArea rows={2} maxLength={200} showCount placeholder="备注资料使用说明、适用单元或重点建议..." />
          </Form.Item>

          <Form.Item label="上传文件" required>
            <Upload
              beforeUpload={() => false}
              maxCount={1}
              fileList={fileList}
              onChange={({ fileList: list }) => setFileList(list)}
              accept={ossEnabled ? '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx' : '.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z'}
            >
              <Button icon={<UploadOutlined />} style={{ minHeight: 38 }}>
                选择本地文件
              </Button>
            </Upload>
          </Form.Item>
        </Form>
      </BrandModal>

      {/* 
        【资料预览弹窗】
      */}
      <BrandModal
        title="资料在线预览"
        open={!!previewUrl}
        footer={null}
        onCancel={() => setPreviewUrl(null)}
        width="90vw"
        style={{ top: 20 }}
        styles={{ body: { padding: 0 } }}
      >
        {previewUrl && previewType === 'pdf' && (
          <iframe src={previewUrl} title="PDF预览" style={{ width: '100%', height: '80vh', border: 0 }} />
        )}
        {previewUrl && previewType === 'word' && (
          <iframe src={previewUrl} title="Word预览" style={{ width: '100%', height: '80vh', border: 0 }} />
        )}
        {previewUrl && previewType === 'image' && (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <NextImage
              src={previewUrl}
              alt="资料预览"
              width={1200}
              height={800}
              unoptimized
              style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '78vh', objectFit: 'contain' }}
            />
          </div>
        )}
      </BrandModal>

      {/* 
        【专属高质感工作台样式】
      */}
      <style jsx>{`
        .admin-materials-view {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 8px 12px 32px;
        }

        /* 顶部 Header */
        .admin-header-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid rgba(20, 87, 77, 0.12);
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
          box-shadow: 0 2px 8px rgba(20, 87, 77, 0.04);
          gap: 16px;
          flex-wrap: wrap;
        }

        .admin-header-left {
          min-width: 0;
          flex: 1;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .admin-page-title {
          margin: 0;
          font-size: 21px;
          font-weight: 800;
          color: #17352F;
          letter-spacing: -0.3px;
        }

        .driver-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 10px;
          border-radius: 999px;
          background: rgba(20, 87, 77, 0.08);
          color: #14574D;
          font-size: 11.5px;
          font-weight: 700;
        }

        .admin-page-subtitle {
          margin: 4px 0 0;
          font-size: 13px;
          color: #7A694F;
        }

        :global(.upload-hero-btn.ant-btn-primary) {
          background: #14574D !important;
          border-color: #14574D !important;
          border-radius: 10px !important;
          font-weight: 700 !important;
          height: 38px !important;
          padding: 0 18px !important;
          box-shadow: 0 2px 8px rgba(20, 87, 77, 0.25) !important;
        }

        /* 一体化紧凑指标条 */
        .stats-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 14px;
        }

        .stat-cell {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid rgba(20, 87, 77, 0.1);
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 6px rgba(20, 87, 77, 0.03);
        }

        .stat-cell:hover {
          border-color: #14574D;
          transform: translateY(-1px);
        }

        .stat-cell.active {
          border-color: #14574D;
          background: #f7faf9;
          box-shadow: 0 2px 8px rgba(20, 87, 77, 0.1);
        }

        .stat-icon-wrap {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }

        .stat-text-box {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .stat-label {
          font-size: 12px;
          color: #8A7E6B;
          white-space: nowrap;
        }

        .stat-number {
          font-size: 19px;
          font-weight: 800;
          color: #17352F;
          line-height: 1.2;
        }

        /* 一体化工作台检索条 */
        .filter-work-bar {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid rgba(20, 87, 77, 0.1);
          padding: 10px 14px;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .filter-inputs {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          flex: 1;
        }

        :global(.search-input) {
          width: 220px !important;
          border-radius: 8px !important;
        }

        :global(.filter-select) {
          width: 120px !important;
        }

        .filter-audience-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .clear-btn {
          border: none;
          background: transparent;
          color: #999;
          font-size: 12px;
          cursor: pointer;
          padding: 4px 8px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .clear-btn:hover {
          color: #14574D;
        }

        /* 桌面端表格 */
        .desktop-table-container {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid rgba(20, 87, 77, 0.1);
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(20, 87, 77, 0.03);
        }

        /* 移动端卡片列表（从粗大笨重 -> 现代化精致工卡） */
        .mobile-cards-container {
          display: none;
          flex-direction: column;
          gap: 10px;
        }

        .mobile-material-card {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid rgba(20, 87, 77, 0.12);
          padding: 12px 14px;
          box-shadow: 0 2px 6px rgba(20, 87, 77, 0.04);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .card-top-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .doc-type-icon {
          font-size: 24px;
          padding-top: 1px;
          flex-shrink: 0;
        }

        .doc-main-info {
          flex: 1;
          min-width: 0;
        }

        .doc-title {
          margin: 0 0 2px;
          font-size: 15px;
          font-weight: 800;
          color: #17352F;
          line-height: 1.35;
        }

        .doc-file-meta {
          font-size: 11.5px;
          color: #8A7E6B;
          word-break: break-all;
        }

        .card-badge-row {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
        }

        .badge-grade, .badge-subject, .badge-type, .badge-audience {
          font-size: 10.5px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 4px;
        }

        .badge-grade {
          background: #f0eee8;
          color: #695e4d;
        }

        .badge-type {
          background: #f1f8f6;
          color: #14574D;
        }

        .card-bottom-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 8px;
          border-top: 1px solid #f6f3ed;
          gap: 8px;
        }

        .uploader-info {
          font-size: 11px;
          color: #999;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .card-action-btns {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .m-btn {
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          padding: 4px 10px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }

        .m-btn-preview {
          background: #f0f7f5;
          color: #14574D;
          border-color: rgba(20, 87, 77, 0.2);
        }

        .m-btn-preview:hover {
          background: #14574D;
          color: #ffffff;
        }

        .m-btn-download {
          background: #ffffff;
          color: #5A4E3A;
          border-color: rgba(0, 0, 0, 0.12);
          width: 28px;
          height: 28px;
          padding: 0;
          justify-content: center;
        }

        .m-btn-download:hover {
          color: #14574D;
          border-color: #14574D;
        }

        .m-btn-delete {
          background: #fff5f5;
          color: #e03131;
          border-color: rgba(224, 49, 49, 0.2);
          width: 28px;
          height: 28px;
          padding: 0;
          justify-content: center;
        }

        .m-btn-delete:hover {
          background: #e03131;
          color: #ffffff;
        }

        .mobile-empty {
          text-align: center;
          padding: 40px 16px;
          color: #999;
          font-size: 13px;
          background: #ffffff;
          border-radius: 12px;
        }

        @media (max-width: 900px) {
          .stats-strip {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .admin-materials-view {
            padding: 4px 8px 30px;
          }

          .desktop-table-container {
            display: none;
          }

          .mobile-cards-container {
            display: flex;
          }

          :global(.search-input) {
            width: 100% !important;
          }

          :global(.filter-select) {
            flex: 1 !important;
          }

          .filter-audience-wrap {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  )
}
