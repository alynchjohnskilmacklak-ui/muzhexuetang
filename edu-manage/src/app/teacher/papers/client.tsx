'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  Button,
  Card,
  Form,
  Image,
  Input,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
  Upload,
  List,
} from 'antd'
import {
  CheckCircleFilled,
  ClockCircleOutlined,
  EyeOutlined,
  FileImageFilled,
  FileImageOutlined,
  PlusOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd'
import { toast } from 'sonner'
import { GuidedEmpty } from '@/components/Common/GuidedEmpty'
import { BrandModal } from '@/components/Common/BrandModal'
import { useIsMobile } from '@/hooks/useIsMobile'
import { resolveTier, TIER_APP, TIER_THEME, type TeacherTier } from '@/constants/teacher-tier'
import { SUBJECT_COLORS } from '@/constants/subjects'

const { Text } = Typography
const { TextArea } = Input
const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Paper = {
  id: string
  title: string
  imageUrls: string | string[]
  status: string
  student?: { id?: string; name?: string }
  subject?: string
  paperDate?: string
  overallComment?: string
}

type StudentOption = { id: string; name: string }

export function TeacherPapersClient() {
  const isMobile = useIsMobile() ?? false
  const [form] = Form.useForm()
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [expandedPaper, setExpandedPaper] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL')

  // 获取教师身份与专属梯队主题
  const { data: dashData } = useSWR<{ teacher?: { id: string; name: string; tierLevel?: string | null } }>(
    '/api/teacher/dashboard',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  )

  const currentTier: TeacherTier = resolveTier(dashData?.teacher?.tierLevel)
  const tierTheme = TIER_THEME[currentTier]
  const appTheme = TIER_APP[currentTier]

  // 梯队动态专属风格
  const tierVisual = useMemo(() => {
    switch (currentTier) {
      case 'MANAGER':
        return {
          gradient: 'linear-gradient(135deg, #241A5E 0%, #4C3FA8 55%, #6B5DC2 100%)',
          shadow: '0 12px 30px rgba(76, 63, 168, 0.32)',
          subColor: '#E2D9F4',
          badgeBg: 'rgba(255, 255, 255, 0.16)',
          badgeFg: '#E2D9F4',
          badgeBorder: 'rgba(226, 217, 244, 0.28)',
          accentColor: '#4C3FA8',
          goldColor: '#FDE68A',
          bannerTag: `🛡️ ${tierTheme.label} · 试卷管理`,
        }
      case 'ELITE':
        return {
          gradient: 'linear-gradient(135deg, #061A17 0%, #0D3732 55%, #18524B 100%)',
          shadow: '0 12px 30px rgba(13, 55, 50, 0.38)',
          subColor: '#F6E9C8',
          badgeBg: 'rgba(201, 164, 92, 0.24)',
          badgeFg: '#F6E9C8',
          badgeBorder: 'rgba(201, 164, 92, 0.38)',
          accentColor: '#0D3732',
          goldColor: '#C9A45C',
          bannerTag: `👑 ${tierTheme.label} · 试卷管理`,
        }
      case 'SENIOR':
        return {
          gradient: 'linear-gradient(135deg, #0B2923 0%, #14574D 55%, #1E7E6F 100%)',
          shadow: '0 12px 30px rgba(20, 87, 77, 0.35)',
          subColor: '#D1FAE5',
          badgeBg: 'rgba(255, 255, 255, 0.16)',
          badgeFg: '#A7F3D0',
          badgeBorder: 'rgba(167, 243, 208, 0.25)',
          accentColor: '#14574D',
          goldColor: '#F3D98F',
          bannerTag: `⭐ ${tierTheme.label} · 试卷管理`,
        }
      case 'EXPERIENCED':
        return {
          gradient: 'linear-gradient(135deg, #103B31 0%, #267461 55%, #38957E 100%)',
          shadow: '0 12px 30px rgba(38, 116, 97, 0.32)',
          subColor: '#CCFBF1',
          badgeBg: 'rgba(255, 255, 255, 0.16)',
          badgeFg: '#99F6E4',
          badgeBorder: 'rgba(153, 246, 228, 0.25)',
          accentColor: '#267461',
          goldColor: '#FDE68A',
          bannerTag: `🌿 ${tierTheme.label} · 试卷管理`,
        }
      case 'NEW':
      default:
        return {
          gradient: 'linear-gradient(135deg, #174233 0%, #3D8A6F 55%, #52A687 100%)',
          shadow: '0 12px 30px rgba(61, 138, 111, 0.32)',
          subColor: '#D1FAE5',
          badgeBg: 'rgba(255, 255, 255, 0.16)',
          badgeFg: '#A7F3D0',
          badgeBorder: 'rgba(167, 243, 208, 0.25)',
          accentColor: '#3D8A6F',
          goldColor: '#FEF08A',
          bannerTag: `🌱 ${tierTheme.label} · 试卷管理`,
        }
    }
  }, [currentTier, tierTheme])

  const { data: papers, mutate } = useSWR<Paper[]>('/api/teacher/papers', fetcher, { refreshInterval: 300_000 })
  const { data: studentsData } = useSWR<{ students?: StudentOption[] } | StudentOption[]>('/api/teacher/students', fetcher)
  const students = Array.isArray(studentsData) ? studentsData : studentsData?.students || []

  const paperList = Array.isArray(papers) ? papers : []

  // 统计指标
  const stats = useMemo(() => {
    const total = paperList.length
    const published = paperList.filter((p) => p.status === 'PUBLISHED').length
    const draft = paperList.filter((p) => p.status !== 'PUBLISHED').length
    return { total, published, draft }
  }, [paperList])

  // 筛选试卷
  const filteredPapers = useMemo(() => {
    if (statusFilter === 'ALL') return paperList
    return paperList.filter((p) => (statusFilter === 'PUBLISHED' ? p.status === 'PUBLISHED' : p.status !== 'PUBLISHED'))
  }, [paperList, statusFilter])

  if (!papers) {
    return (
      <div style={{ padding: 16 }}>
        <Skeleton active paragraph={{ rows: 3 }} style={{ marginBottom: 12 }} />
        <Skeleton active paragraph={{ rows: 3 }} style={{ marginBottom: 12 }} />
        <Skeleton active paragraph={{ rows: 2 }} />
      </div>
    )
  }

  const handleUpload: NonNullable<UploadProps['customRequest']> = async (options) => {
    const formData = new FormData()
    formData.append('file', options.file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      options.onSuccess?.({ url: data.url }, options.file)
    } catch (e) {
      options.onError?.(e instanceof Error ? e : new Error('上传失败'))
    }
  }

  const handlePreview = (file: UploadFile) => {
    setPreviewUrl(file.url || file.thumbUrl || '')
    setPreviewOpen(true)
  }

  const handleSubmit = async (shouldPublish: boolean) => {
    try {
      const values = await form.validateFields()
      const uploadingFiles = fileList.filter((f) => f.status === 'uploading')
      if (uploadingFiles.length > 0) {
        toast.warning(`还有 ${uploadingFiles.length} 张图片正在上传，请稍候再试`)
        return
      }
      const imageUrls = fileList
        .filter((f) => f.status === 'done')
        .map((f) => f.response?.url || f.url || '')
        .filter(Boolean)
      if (imageUrls.length === 0) {
        toast.error('请至少上传一张试卷图片')
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
          status: shouldPublish ? 'PUBLISHED' : 'DRAFT',
          publish: shouldPublish,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(shouldPublish ? '试卷已成功归档并推送给家长' : '试卷草稿已保存')
      setModalOpen(false)
      form.resetFields()
      setFileList([])
      mutate()
    } catch {
      toast.error('请检查表单或至少上传一张图片')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ width: '100%', paddingBottom: isMobile ? 88 : 32, color: '#17352F' }}>
      {/* ========================================================= */}
      {/* 顶部根据老师等级/标签动态渲染专属高光数据看板 (HERO BANNER) */}
      {/* ========================================================= */}
      <div
        style={{
          background: tierVisual.gradient,
          borderRadius: 22,
          padding: isMobile ? '20px 18px' : '24px 26px',
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: tierVisual.shadow,
          marginBottom: 16,
        }}
      >
        {/* 背景光晕 */}
        <div
          style={{
            position: 'absolute',
            top: -30,
            right: -25,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: tierVisual.badgeBg,
                border: `1px solid ${tierVisual.badgeBorder}`,
                backdropFilter: 'blur(8px)',
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 800,
                color: tierVisual.badgeFg,
                marginBottom: 8,
                letterSpacing: '0.04em',
              }}
            >
              <FileImageFilled style={{ color: tierVisual.goldColor }} />
              <span>{tierVisual.bannerTag}</span>
            </div>
            <div
              style={{
                color: '#FFFFFF !important',
                fontSize: isMobile ? 24 : 28,
                fontWeight: 900,
                letterSpacing: '-0.02em',
                lineHeight: 1.25,
                textShadow: '0 2px 8px rgba(0,0,0,0.45)',
              }}
            >
              批改试卷归档与推送
            </div>
            <div style={{ fontSize: 12.5, color: tierVisual.subColor, marginTop: 5, opacity: 0.95 }}>
              拍照上传批改试卷，一键推送给家长留存，构建连续学情成长轨迹
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #FFE082 0%, #FFB300 100%)',
              border: 'none',
              borderRadius: 14,
              padding: '9px 15px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              color: '#4A230D',
              fontWeight: 900,
              fontSize: 13,
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
              flexShrink: 0,
            }}
          >
            <PlusOutlined style={{ fontSize: 13, color: '#4A230D' }} />
            <span>新建试卷</span>
          </button>
        </div>

        {/* 3 大核心指标小卡片 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            marginTop: 18,
          }}
        >
          {/* 指标 1：全部归档 */}
          <div
            onClick={() => setStatusFilter('ALL')}
            style={{
              background: statusFilter === 'ALL' ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.12)',
              border: statusFilter === 'ALL' ? `1.5px solid ${tierVisual.goldColor}` : '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: 14,
              padding: '10px 12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: 11, color: tierVisual.subColor }}>已归档试卷</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF', marginTop: 2 }}>
              {stats.total} <span style={{ fontSize: 11, fontWeight: 600 }}>份</span>
            </div>
            <div style={{ fontSize: 10, color: tierVisual.subColor, opacity: 0.9, marginTop: 1 }}>点击查看全部</div>
          </div>

          {/* 指标 2：已推送家长 */}
          <div
            onClick={() => setStatusFilter('PUBLISHED')}
            style={{
              background: statusFilter === 'PUBLISHED' ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.12)',
              border: statusFilter === 'PUBLISHED' ? `1.5px solid ${tierVisual.goldColor}` : '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: 14,
              padding: '10px 12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: 11, color: tierVisual.subColor }}>已推送家长</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF', marginTop: 2 }}>
              {stats.published} <span style={{ fontSize: 11, fontWeight: 600 }}>份</span>
            </div>
            <div style={{ fontSize: 10, color: tierVisual.subColor, opacity: 0.9, marginTop: 1 }}>家长端可查阅</div>
          </div>

          {/* 指标 3：待推送草稿 */}
          <div
            onClick={() => setStatusFilter('DRAFT')}
            style={{
              background: statusFilter === 'DRAFT' ? 'rgba(224, 120, 61, 0.35)' : 'rgba(255, 255, 255, 0.12)',
              border: statusFilter === 'DRAFT' ? '1.5px solid #FFAB91' : '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: 14,
              padding: '10px 12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: 11, color: stats.draft > 0 ? '#FFE0B2' : tierVisual.subColor }}>待推送草稿</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: stats.draft > 0 ? '#FFE082' : '#FFFFFF', marginTop: 2 }}>
              {stats.draft} <span style={{ fontSize: 11, fontWeight: 600 }}>份</span>
            </div>
            <div style={{ fontSize: 10, color: stats.draft > 0 ? '#FFAB91' : tierVisual.subColor, marginTop: 1 }}>
              {stats.draft > 0 ? '⚠️ 点击处理草稿' : '暂无草稿'}
            </div>
          </div>
        </div>
      </div>

      {/* 快捷过滤条 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[
          { key: 'ALL', label: `全部试卷 (${stats.total})` },
          { key: 'PUBLISHED', label: `已推送家长 (${stats.published})` },
          { key: 'DRAFT', label: `待推送草稿 (${stats.draft})`, highlight: stats.draft > 0 },
        ].map((t) => {
          const active = statusFilter === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setStatusFilter(t.key as typeof statusFilter)}
              style={{
                background: active
                  ? t.highlight
                    ? '#C2572C'
                    : tierVisual.accentColor
                  : t.highlight
                    ? '#FDF2EB'
                    : '#FFFFFF',
                color: active
                  ? '#FFFFFF'
                  : t.highlight
                    ? '#C2572C'
                    : '#5A4E3A',
                border: active
                  ? 'none'
                  : t.highlight
                    ? '1px solid rgba(194, 87, 44, 0.3)'
                    : '1px solid rgba(0,0,0,0.1)',
                borderRadius: 999,
                padding: '6px 14px',
                fontSize: 12.5,
                fontWeight: active || t.highlight ? 800 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: active ? '0 3px 10px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.02)',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* 试卷列表 */}
      {filteredPapers.length === 0 ? (
        <Card
          bordered={false}
          style={{
            borderRadius: 18,
            minHeight: 320,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <GuidedEmpty
            title="还没有相关的试卷记录"
            description="上传试卷后可以关联学员并推送给家长，形成连续的学习资料记录。"
            actionLabel="上传第一份试卷"
            onAction={() => setModalOpen(true)}
          />
        </Card>
      ) : (
        <List
          dataSource={filteredPapers}
          grid={{ gutter: 14, xs: 1, sm: 2, lg: 3 }}
          renderItem={(paper) => {
            const urls: string[] = (() => {
              if (Array.isArray(paper.imageUrls)) return paper.imageUrls
              try {
                return JSON.parse(paper.imageUrls) as string[]
              } catch {
                return []
              }
            })()
            const isExpanded = expandedPaper === paper.id
            const subjectPalette = paper.subject ? SUBJECT_COLORS[paper.subject] : undefined

            return (
              <List.Item>
                <div
                  style={{
                    borderRadius: 18,
                    background: '#FFFFFF',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    boxShadow: '0 3px 12px rgba(0,0,0,0.03)',
                    padding: '16px',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    {/* 卡片头部 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <FileImageOutlined style={{ color: tierVisual.accentColor, fontSize: 16 }} />
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#17352F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {paper.title}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 999,
                          color: paper.status === 'PUBLISHED' ? '#14574D' : '#C2572C',
                          background: paper.status === 'PUBLISHED' ? '#EAF5F0' : '#FDF2EB',
                          border: paper.status === 'PUBLISHED' ? '1px solid rgba(20,87,77,0.2)' : '1px solid rgba(194,87,44,0.3)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {paper.status === 'PUBLISHED' ? '已推送' : '草稿'}
                      </span>
                    </div>

                    {/* 学生与科目 */}
                    <div style={{ fontSize: 12, color: '#7A694F', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: '#17352F' }}>
                        学员：{paper.student?.name || '全班'}
                      </span>
                      {paper.subject && (
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: subjectPalette?.color ?? 'var(--color-on-primary)',
                            background: subjectPalette?.bg ?? 'var(--color-primary)',
                            padding: '1px 6px',
                            borderRadius: 4,
                          }}
                        >
                          {paper.subject}
                        </span>
                      )}
                      <span>·</span>
                      <span>{paper.paperDate?.slice(0, 10)}</span>
                    </div>

                    {/* 图片缩略图网格 */}
                    {urls.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                        <Image.PreviewGroup>
                          {(isExpanded ? urls : urls.slice(0, 3)).map((url: string, i: number) => (
                            <Image
                              key={i}
                              src={url}
                              alt={`试卷图片 ${i + 1}`}
                              width={isExpanded ? 130 : 64}
                              height={isExpanded ? 90 : 64}
                              style={{ borderRadius: 8, objectFit: 'cover', cursor: 'pointer' }}
                              preview={{ mask: <EyeOutlined /> }}
                            />
                          ))}
                        </Image.PreviewGroup>
                        {!isExpanded && urls.length > 3 && (
                          <button
                            type="button"
                            aria-label={`展开其余 ${urls.length - 3} 张试卷图片`}
                            onClick={() => setExpandedPaper(paper.id)}
                            style={{
                              width: 64,
                              height: 64,
                              borderRadius: 8,
                              background: '#F5FAF7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 700,
                              color: tierVisual.accentColor,
                              border: `1px dashed ${tierVisual.accentColor}55`,
                            }}
                          >
                            +{urls.length - 3}
                          </button>
                        )}
                      </div>
                    )}

                    {isExpanded && (
                      <Button type="link" size="small" onClick={() => setExpandedPaper(null)} style={{ padding: 0, color: tierVisual.accentColor }}>
                        收起图片
                      </Button>
                    )}

                    {/* 总体评价 */}
                    {paper.overallComment && (
                      <div
                        style={{
                          background: '#F9F8F5',
                          borderRadius: 8,
                          padding: '6px 10px',
                          fontSize: 12,
                          color: '#5C5040',
                          lineHeight: 1.5,
                          marginTop: 6,
                        }}
                      >
                        <span style={{ fontWeight: 700, color: '#17352F' }}>批改点评：</span>
                        {paper.overallComment}
                      </div>
                    )}
                  </div>
                </div>
              </List.Item>
            )
          }}
        />
      )}

      {/* 新建试卷模态框 */}
      <BrandModal
        title="上传批改试卷"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false)
          setFileList([])
          form.resetFields()
        }}
        width={640}
        confirmLoading={submitting}
        okText="保存草稿"
        destroyOnClose
        footer={() => (
          <Space>
            <Button onClick={() => handleSubmit(false)} loading={submitting} disabled={fileList.some((f) => f.status === 'uploading')}>
              存为草稿
            </Button>
            <Button
              type="primary"
              onClick={() => handleSubmit(true)}
              loading={submitting}
              disabled={fileList.some((f) => f.status === 'uploading')}
              style={{ background: tierVisual.accentColor, borderColor: tierVisual.accentColor }}
              icon={<SendOutlined />}
            >
              {fileList.some((f) => f.status === 'uploading')
                ? `上传中 (${fileList.filter((f) => f.status === 'uploading').length})`
                : '发布并推送家长'}
            </Button>
          </Space>
        )}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="试卷标题" rules={[{ required: true, message: '请输入试卷标题' }]}>
            <Input placeholder="如：九年级期中数学压轴题强化试卷" />
          </Form.Item>
          <Form.Item name="studentIds" label="关联学生" rules={[{ required: true, message: '请选择学生' }]}>
            <Select
              mode="multiple"
              placeholder="选择关联的学员"
              showSearch={false}
              virtual={false}
              getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
              options={students.map((s) => ({ label: s.name, value: s.id }))}
            />
          </Form.Item>
          <Form.Item name="subject" label="考试科目">
            <Select
              placeholder="选择科目"
              allowClear
              options={['语文', '数学', '英语', '物理', '化学', '生物', '地理', '历史', '道法'].map((s) => ({
                label: s,
                value: s,
              }))}
            />
          </Form.Item>
          <Form.Item name="paperDate" label="考试/批改日期">
            <Input type="date" />
          </Form.Item>

          <Form.Item label="试卷高清照片 (支持多张连续试卷)">
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
                  <PlusOutlined style={{ color: tierVisual.accentColor }} />
                  <div style={{ marginTop: 6, fontSize: 12, color: '#7A694F' }}>添加照片</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          <Form.Item name="overallComment" label="名师批改点评 (同步展示给家长)">
            <TextArea rows={3} placeholder="总结学生在本次试卷中的优势、薄弱考点与提分突破建议..." />
          </Form.Item>
        </Form>
      </BrandModal>

      <BrandModal open={previewOpen} title={null} footer={null} onCancel={() => setPreviewOpen(false)} width={800}>
        <Image src={previewUrl} alt="试卷图片预览" style={{ width: '100%' }} preview={false} />
      </BrandModal>
    </div>
  )
}
