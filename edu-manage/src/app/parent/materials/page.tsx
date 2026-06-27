'use client'

import { useEffect, useState } from 'react'
import { Button, Empty, Modal, Select, Skeleton, Space, Tag, Typography } from 'antd'
import { DownloadOutlined, EyeOutlined, FileTextOutlined } from '@ant-design/icons'
import { GRADE_SUBJECTS, GRADES, SUBJECT_COLORS } from '@/data/subjects'
import { fmtDate } from '@/lib/format-date'
import { materialFileLabel } from '@/lib/material-format'

const { Title, Text } = Typography

const COPY = {
  defaultGrade: '\u521d\u4e00',
  title: '\u5b66\u4e60\u8d44\u6599',
  subtitle: '\u8001\u5e08\u4e3a\u5b69\u5b50\u51c6\u5907\u7684\u5b66\u4e60\u6750\u6599',
  allSubjects: '\u5168\u90e8\u79d1\u76ee',
  empty: '\u8001\u5e08\u8fd8\u6ca1\u6709\u4e0a\u4f20\u5b66\u4e60\u8d44\u6599',
  teacher: '\u8001\u5e08',
  download: '\u4e0b\u8f7d',
  preview: '\u9884\u89c8',
  pdfPreview: 'PDF\u9884\u89c8',
  wordPreview: 'Word\u9884\u89c8',
  copyright: '\u672c\u8d44\u6599\u4ec5\u4f9b\u5728\u7ebf\u67e5\u770b\uff0c\u7248\u6743\u5f52\u7267\u54f2\u5b66\u5802\u6240\u6709',
}

interface Material {
  id: string
  title: string
  grade: string
  subject: string
  fileName: string
  fileType: string
  description: string | null
  downloads?: number
  teacher?: { id: string; name: string } | null
  createdAt: string
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

function rgbaFromHex(hex: string | undefined, alpha: number) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return `rgba(232,120,74,${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function softTagStyle(color?: string) {
  return {
    color: color || '#5a4e3a',
    backgroundColor: rgbaFromHex(color, 0.10),
    border: `1px solid ${rgbaFromHex(color, 0.20)}`,
  }
}

function getFileStyle(material: Pick<Material, 'fileType' | 'fileName'>) {
  const ext = material.fileName?.split('.').pop()?.toLowerCase() || ''
  return FILE_TYPE_STYLE[material.fileType] || FILE_TYPE_STYLE[ext] || { color: '#7a7fad', bg: 'rgba(122,127,173,.12)' }
}

export default function ParentMaterialsPage() {
  const [selectedGrade, setSelectedGrade] = useState<string>(COPY.defaultGrade)
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState('')
  const [previewType, setPreviewType] = useState<'pdf' | 'image' | 'word'>('pdf')

  useEffect(() => {
    const fetchMaterials = async () => {
      setLoading(true)
      const params = new URLSearchParams({ grade: selectedGrade })
      if (selectedSubject) params.set('subject', selectedSubject)
      const res = await fetch(`/api/parent/materials?${params}`)
      const data = await res.json()
      setMaterials(data.materials || [])
      setLoading(false)
    }
    fetchMaterials()
  }, [selectedGrade, selectedSubject])

  const subjects = GRADE_SUBJECTS[selectedGrade] || []

  const handleView = async (material: Material) => {
    setPreviewTitle(material.title)
    if (material.fileType === 'word') {
      const res = await fetch(`/api/materials/${material.id}/view`)
      const data = await res.json()
      if (data.viewerUrl) {
        setPreviewType('word')
        setPreviewUrl(data.viewerUrl)
      }
      return
    }
    setPreviewType(material.fileType as 'pdf' | 'image')
    setPreviewUrl(`/api/materials/${material.id}/view`)
  }

  const handleDownload = (material: Material) => {
    window.open(`/api/materials/${material.id}/view?download=1`, '_blank')
  }

  return (
    <div className="parent-materials-page">
      <div className="materials-header">
        <Title level={5} className="materials-title">{COPY.title}</Title>
        <Text type="secondary" className="materials-subtitle">{COPY.subtitle}</Text>
      </div>

      <div className="materials-filters">
        <Select className="materials-select" value={selectedGrade} onChange={(value) => { setSelectedGrade(value); setSelectedSubject('') }} options={GRADES.map((grade) => ({ label: grade, value: grade }))} />
        <Select className="materials-select" placeholder={COPY.allSubjects} allowClear value={selectedSubject || undefined} onChange={(value) => setSelectedSubject(value || '')} options={subjects.map((subject) => ({ label: subject, value: subject }))} />
      </div>

      {loading ? (
        <div className="materials-list">
          <Skeleton active paragraph={{ rows: 3 }} />
          <Skeleton active paragraph={{ rows: 3 }} />
          <Skeleton active paragraph={{ rows: 3 }} />
        </div>
      ) : materials.length === 0 ? (
        <div className="materials-empty">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={COPY.empty} />
        </div>
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
                </Space>
                <Text type="secondary" className="material-meta" ellipsis>
                  {material.teacher?.name || COPY.teacher} · {fmtDate(material.createdAt)}
                </Text>
              </div>
              <div className="material-actions">
                <Button type="primary" icon={<DownloadOutlined />} onClick={() => handleDownload(material)}>{COPY.download}</Button>
                <Button icon={<EyeOutlined />} onClick={() => handleView(material)}>{COPY.preview}</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        title={previewTitle}
        open={!!previewUrl}
        onCancel={() => setPreviewUrl(null)}
        footer={null}
        width="95vw"
        style={{ top: 10 }}
        styles={{ body: { padding: 0 } }}
      >
        {previewUrl && previewType === 'pdf' && <iframe src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`} style={{ width: '100%', height: '85vh', border: 'none' }} title={COPY.pdfPreview} />}
        {previewUrl && previewType === 'word' && <iframe src={previewUrl} style={{ width: '100%', height: '85vh', border: 'none' }} title={COPY.wordPreview} />}
        {previewUrl && previewType === 'image' && (
          <div style={{ textAlign: 'center', padding: 16, background: '#f0f0f0' }}>
            <img src={previewUrl} alt={previewTitle} style={{ maxWidth: '100%', maxHeight: '82vh', objectFit: 'contain' }} onContextMenu={(event) => event.preventDefault()} draggable={false} />
          </div>
        )}
        <div style={{ padding: '8px 16px', backgroundColor: '#fff8f6', borderTop: '1px solid rgba(0,0,0,.06)', textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>{COPY.copyright}</Text>
        </div>
      </Modal>

      <style jsx>{`
        .parent-materials-page {
          width: 100%;
        }

        .materials-header {
          margin-bottom: 12px;
        }

        .materials-title {
          margin: 0 0 4px !important;
          font-size: 18px !important;
          color: #1a1201 !important;
        }

        .materials-subtitle {
          font-size: 13px;
        }

        .materials-filters {
          display: flex;
          gap: 8px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }

        .materials-select {
          width: 148px;
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
          min-height: 124px;
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
          flex: 0 0 92px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .material-actions :global(.ant-btn) {
          min-height: 36px;
          border-radius: 10px;
        }

        .materials-empty {
          min-height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px dashed rgba(0,0,0,.10);
          border-radius: 10px;
          background: #fff;
        }

        @media (max-width: 560px) {
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
            flex-basis: 78px;
          }

          .material-actions :global(.ant-btn) {
            padding-inline: 8px;
          }
        }
      `}</style>
    </div>
  )
}
