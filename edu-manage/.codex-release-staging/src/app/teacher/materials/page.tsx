'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import NextImage from 'next/image'
import {
  Button, Input, Modal, Popconfirm, Select, Skeleton, Space,
  Tabs, Tag, Typography,
} from 'antd'
import {
  DeleteOutlined, DownloadOutlined, EyeOutlined, PlusOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { fmtDate } from '@/lib/format-date'
import { GRADE_SUBJECTS, GRADES, SUBJECT_COLORS } from '@/data/subjects'
import {
  materialAudienceText,
  materialFileLabel,
} from '@/lib/material-format'
import { GuidedEmpty } from '@/components/Common/GuidedEmpty'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Title, Text } = Typography

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
  pdf: { color: 'var(--color-error)', bg: 'var(--color-surface-3)' },
  word: { color: 'var(--color-chart-6)', bg: 'var(--color-surface-3)' },
  doc: { color: 'var(--color-chart-6)', bg: 'var(--color-surface-3)' },
  docx: { color: 'var(--color-chart-6)', bg: 'var(--color-surface-3)' },
  ppt: { color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
  pptx: { color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
  excel: { color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  xls: { color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  xlsx: { color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
}

const AUDIENCE_STYLE: Record<string, { color: string; bg: string }> = {
  STUDENT: { color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  TEACHER: { color: 'var(--color-chart-6)', bg: 'var(--color-surface-3)' },
  BOTH: { color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
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
  return FILE_TYPE_STYLE[material.fileType] || FILE_TYPE_STYLE[ext] || { color: 'var(--color-brand-secure)', bg: 'var(--color-surface-3)' }
}

/** 按科目主色生成迷你书本封面渐变（浅 → 深，保证白字可读） */
function bookCoverStyle(subject: string) {
  const hex = SUBJECT_COLORS[subject] || '#8A6F5C'
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return { background: 'linear-gradient(160deg,#9C7B62 0%,#6E5340 100%)' }
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const darken = (n: number) => Math.round(n * 0.62)
  const bright = (n: number) => Math.min(255, Math.round(n * 1.14 + 18))
  return {
    background: `linear-gradient(160deg, rgb(${bright(r)},${bright(g)},${bright(b)}) 0%, rgb(${r},${g},${b}) 46%, rgb(${darken(r)},${darken(g)},${darken(b)}) 100%)`,
  }
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
  const isMobile = useIsMobile() ?? false
  const router = useRouter()
  const [tab, setTab] = useState<TabKey>('all')
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(false)
  const [grade, setGrade] = useState('')
  const [subject, setSubject] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewType, setPreviewType] = useState<'pdf' | 'image' | 'word' | 'download'>('pdf')

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
        <Button icon={<PlusOutlined />} onClick={() => router.push('/teacher/materials/upload')}>上传普通资料</Button>
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
        <div className="materials-empty"><GuidedEmpty title="还没有教学资料" description="上传讲义、练习或答案后，学生和教师可按权限查看，便于重复使用。" actionLabel="上传第一份资料" onAction={() => router.push('/teacher/materials/upload')} /></div>
      ) : (
        <div className="materials-list">
          {materials.map((material) => (
            <div key={material.id} className="material-card">
              <div className="mini-book" style={bookCoverStyle(material.subject)}>
                <div className="mini-book-spine" />
                <div className="mini-book-inner">
                  <span className="mini-book-title">{material.title}</span>
                  <span className="mini-book-subject">{material.subject}</span>
                  <span className="mini-book-type">{materialFileLabel(material.fileType)}</span>
                </div>
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

      <Modal title="资料预览" open={!!previewUrl} footer={null} onCancel={() => setPreviewUrl(null)} width="90vw" style={{ top: 20 }} styles={{ body: { padding: 0 } }}>
        {previewUrl && previewType === 'pdf' && <iframe src={previewUrl} title="PDF预览" style={{ width: '100%', height: '80vh', border: 0 }} />}
        {previewUrl && previewType === 'word' && <iframe src={previewUrl} title="Word预览" style={{ width: '100%', height: '80vh', border: 0 }} />}
        {previewUrl && previewType === 'image' && <div style={{ textAlign: 'center', padding: 16 }}><NextImage src={previewUrl} alt="资料预览" width={1200} height={800} unoptimized style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '78vh', objectFit: 'contain' }} /></div>}
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
          border: 1px solid var(--color-hairline);
          border-radius: var(--radius-md);
          background: var(--color-surface-1);
          box-shadow: var(--shadow-card);
        }

        .mini-book {
          position: relative;
          width: 84px;
          height: 112px;
          border-radius: 8px 9px 9px 8px;
          flex: 0 0 84px;
          overflow: hidden;
          box-shadow:
            0 8px 16px rgba(40, 30, 20, .16),
            inset -1px 0 0 rgba(255, 255, 255, .14);
        }

        .mini-book-spine {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 8px;
          border-radius: 8px 0 0 8px;
          background: rgba(0, 0, 0, .16);
          box-shadow: inset -1px 0 0 rgba(255, 255, 255, .10);
          z-index: 2;
        }

        .mini-book-spine::after {
          content: '';
          position: absolute;
          left: 3px;
          top: 5px;
          bottom: 5px;
          width: 1px;
          background: rgba(255, 255, 255, .22);
        }

        .mini-book-inner {
          position: absolute;
          inset: 0;
          padding: 12px 8px 8px 15px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .mini-book-title {
          color: #fff;
          font-size: 13.5px;
          font-weight: 700;
          line-height: 1.4;
          text-shadow: 0 1px 3px rgba(0, 0, 0, .28);
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: break-word;
          flex: 1;
        }

        .mini-book-subject {
          align-self: flex-start;
          padding: 2px 7px;
          border-radius: 999px;
          background: rgba(255, 255, 255, .22);
          border: 1px solid rgba(255, 255, 255, .30);
          color: #fff;
          font-size: 10.5px;
          font-weight: 600;
          text-shadow: 0 1px 2px rgba(0, 0, 0, .18);
        }

        .mini-book-type {
          align-self: flex-start;
          padding: 1px 6px;
          border-radius: 5px;
          background: rgba(255, 255, 255, .20);
          color: #fff;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: .4px;
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
          border-radius: var(--radius-pill);
          padding: 0 8px;
          font-size: 12px;
          color: var(--color-ink-muted);
          background: var(--color-surface-3);
          border: 1px solid var(--color-hairline);
        }

        .material-meta {
          display: block;
          font-size: 12px;
          color: var(--color-ink-subtle);
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
          border: 1px dashed var(--color-hairline-strong);
          border-radius: var(--radius-md);
          background: var(--color-surface-1);
        }

        
        
        
        
        
        
        
        
        
        .file-drop-zone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 128px;
          padding: 18px 14px;
          border: 1.5px dashed var(--color-hairline-strong);
          border-radius: 14px;
          background: linear-gradient(180deg, var(--color-primary-bg), rgba(255, 255, 255, .6));
          transition: border-color .18s ease, background .18s ease;
          cursor: pointer;
        }

        .file-drop-zone:hover {
          border-color: var(--color-primary);
          background: var(--color-primary-bg);
        }

        .file-drop-icon {
          font-size: 30px;
          color: var(--color-primary);
        }

        .file-drop-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-ink);
          text-align: center;
          word-break: break-all;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .file-drop-sub {
          font-size: 12px;
          color: var(--color-ink-subtle);
          text-align: center;
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
            min-height: 118px;
          }

          .mini-book {
            width: 74px;
            height: 100px;
            flex-basis: 74px;
          }

          .mini-book-inner {
            padding: 10px 7px 7px 13px;
            gap: 5px;
          }

          .mini-book-title {
            font-size: 12.5px;
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
