'use client'

import { useEffect, useState } from 'react'
import { Button, Select, Skeleton, Typography } from 'antd'
import { DownloadOutlined, EyeOutlined } from '@ant-design/icons'
import { GRADE_SUBJECTS, GRADES, SUBJECT_COLORS } from '@/data/subjects'
import { fmtDate } from '@/lib/format-date'
import { materialFileLabel } from '@/lib/material-format'
import { GuidedEmpty } from '@/components/Common/GuidedEmpty'
import { useRouter } from 'next/navigation'

const { Title, Text } = Typography

const COPY = {
  defaultGrade: '\u521d\u4e00',
  title: '\u5b66\u4e60\u8d44\u6599',
  subtitle: '\u8001\u5e08\u4e3a\u5b69\u5b50\u51c6\u5907\u7684\u5b66\u4e60\u6750\u6599',
  allSubjects: '\u5168\u90e8\u79d1\u76ee',
  empty: '\u8001\u5e08\u8fd8\u6ca1\u6709\u4e0a\u4f20\u5b66\u4e60\u8d44\u6599',
  teacher: '\u8001\u5e08',
  download: '\u4e0b\u8f7d',
  tapToPreview: '\u70b9\u51fb\u5c01\u9762\u9884\u89c8',
}

interface Material {
  id: string
  title: string
  grade: string
  subject: string
  fileName: string
  fileType: string
  materialType: string
  description: string | null
  downloads?: number
  teacher?: { id: string; name: string } | null
  createdAt: string
}

const MATERIAL_TYPES = [
  { value: '', label: '全部' },
  { value: 'TEXTBOOK', label: '课本' },
  { value: 'HANDOUT', label: '讲义' },
  { value: 'EXERCISE', label: '题库' },
  { value: 'EXAM', label: '试卷' },
  { value: 'ANSWER', label: '答案' },
  { value: 'REFERENCE', label: '参考' },
] as const

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

/** 按科目主色生成书籍封面渐变（浅色 → 深色），保证白字可读 */
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

export default function ParentMaterialsPage() {
  const router = useRouter()
  const [selectedGrade, setSelectedGrade] = useState<string>('')
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('')
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)

  // 默认选中当前孩子所在年级：URL ?childId= > cookie mz_parent_active_child > 第一个孩子
  useEffect(() => {
    const resolveDefaultGrade = async () => {
      try {
        const res = await fetch('/api/parent/today')
        const data = await res.json()
        const students: Array<{ student: { id: string; grade: string | null } }> = data.students || []
        if (!students.length) { setLoading(false); return }
        const params = new URLSearchParams(window.location.search)
        const childId = params.get('childId')
          || (document.cookie.match(/(?:^|;\s*)mz_parent_active_child=([^;]*)/)?.[1] || '')
          || students[0].student.id
        const active = students.find((item) => item.student.id === childId)?.student || students[0].student
        if (active.grade) {
          setSelectedGrade(active.grade)
        } else {
          setLoading(false)
        }
      } catch {
        setLoading(false)
      }
    }
    resolveDefaultGrade()
  }, [])

  useEffect(() => {
    if (!selectedGrade) return
    const fetchMaterials = async () => {
      setLoading(true)
      const params = new URLSearchParams({ grade: selectedGrade })
      if (selectedSubject) params.set('subject', selectedSubject)
      if (selectedType) params.set('materialType', selectedType)
      const res = await fetch(`/api/parent/materials?${params}`)
      const data = await res.json()
      setMaterials(data.materials || [])
      setLoading(false)
    }
    fetchMaterials()
  }, [selectedGrade, selectedSubject, selectedType])

  const subjects = GRADE_SUBJECTS[selectedGrade] || []

  const handleView = (material: Material) => {
    router.push(`/parent/materials/preview?id=${material.id}`)
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
        <Select className="materials-select" placeholder="选择年级" value={selectedGrade || undefined} onChange={(value) => { setSelectedGrade(value); setSelectedSubject('') }} options={GRADES.map((grade) => ({ label: grade, value: grade }))} popupClassName="materials-select-popup" />
        <Select className="materials-select" placeholder={COPY.allSubjects} allowClear value={selectedSubject || undefined} onChange={(value) => setSelectedSubject(value || '')} options={subjects.map((subject) => ({ label: subject, value: subject }))} popupClassName="materials-select-popup" />
      </div>

      <div className="type-tabs">
        {MATERIAL_TYPES.map((t) => (
          <button
            key={t.value || 'all'}
            className={`type-tab ${selectedType === t.value ? 'active' : ''}`}
            onClick={() => setSelectedType(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="materials-grid">
          <Skeleton.Node active style={{ width: '100%', height: 170 }} />
          <Skeleton.Node active style={{ width: '100%', height: 170 }} />
          <Skeleton.Node active style={{ width: '100%', height: 170 }} />
          <Skeleton.Node active style={{ width: '100%', height: 170 }} />
        </div>
      ) : materials.length === 0 ? (
        <div className="materials-empty">
          <GuidedEmpty title={selectedSubject ? '当前科目还没有资料' : '还没有学习资料'} description={selectedSubject ? '老师上传的对应科目讲义会显示在这里，可以先查看全部科目或课堂反馈。' : '老师准备的讲义和练习会显示在这里，帮助孩子课后复习。'} actionLabel={selectedSubject ? '查看全部科目' : '看看课堂反馈'} onAction={() => selectedSubject ? setSelectedSubject('') : router.push('/parent/class-feedback')} />
        </div>
      ) : (
        <div className="materials-grid">
          {materials.map((material) => (
            <div key={material.id} className="book-card">
              <div className="book-cover" style={bookCoverStyle(material.subject)} onClick={() => handleView(material)}>
                <div className="book-spine" />
                <div className="book-cover-inner">
                  <span className="book-topic">{material.subject}</span>
                  <span className="book-title">{material.title}</span>
                  <div className="book-rule" />
                  <div className="book-foot">
                    <span className="book-grade">{material.grade}</span>
                    <span className="book-type">{materialFileLabel(material.fileType)}</span>
                  </div>
                </div>
                <div className="book-hint"><EyeOutlined /> {COPY.tapToPreview}</div>
              </div>
              <div className="book-meta">
                <Text className="book-meta-text" ellipsis={{ tooltip: material.teacher?.name ? `${material.teacher.name} \u00b7 ${fmtDate(material.createdAt)}` : `${COPY.teacher} \u00b7 ${fmtDate(material.createdAt)}` }}>
                  {material.teacher?.name || COPY.teacher} · {fmtDate(material.createdAt)}
                </Text>
                <Button type="text" className="book-download" icon={<DownloadOutlined />} aria-label={COPY.download} onClick={() => handleDownload(material)} />
              </div>
            </div>
          ))}
        </div>
      )}

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

        .type-tabs {
          display: flex;
          gap: 8px;
          margin: -4px 0 14px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .type-tabs::-webkit-scrollbar { display: none; }

        .type-tab {
          flex: 0 0 auto;
          padding: 7px 16px;
          border-radius: 999px;
          border: 1px solid rgba(0,0,0,.10);
          background: #fff;
          color: #6b5d48;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          cursor: pointer;
          transition: all .15s;
        }
        .type-tab.active {
          background: #9A4622;
          border-color: #9A4622;
          color: #fff;
          font-weight: 600;
        }

        :global(.materials-select-popup .ant-select-item) {
          font-size: 14px !important;
          line-height: 22px !important;
          min-height: 38px !important;
          white-space: normal !important;
        }

        /* ===== 书架网格 ===== */
        .materials-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px 12px;
        }

        .book-card {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .book-cover {
          position: relative;
          aspect-ratio: 3 / 4.1;
          border-radius: 10px 12px 12px 10px;
          box-shadow:
            0 10px 22px rgba(40, 30, 20, .18),
            0 2px 6px rgba(40, 30, 20, .10),
            inset -1px 0 0 rgba(255, 255, 255, .16);
          cursor: pointer;
          overflow: hidden;
          transition: transform .18s cubic-bezier(.2, 0, 0, 1), box-shadow .18s ease;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }

        .book-cover:active {
          transform: scale(.975);
        }

        /* 书脊 */
        .book-spine {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 11px;
          border-radius: 10px 0 0 10px;
          background: rgba(0, 0, 0, .16);
          box-shadow: inset -1px 0 0 rgba(255, 255, 255, .10);
          z-index: 2;
        }

        .book-spine::after {
          content: '';
          position: absolute;
          left: 3px;
          top: 6px;
          bottom: 6px;
          width: 1px;
          background: rgba(255, 255, 255, .22);
        }

        .book-cover-inner {
          position: absolute;
          inset: 0;
          padding: 22px 12px 12px 24px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .book-topic {
          display: inline-block;
          align-self: flex-start;
          padding: 3px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, .22);
          border: 1px solid rgba(255, 255, 255, .32);
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 1px;
          backdrop-filter: blur(2px);
          text-shadow: 0 1px 2px rgba(0, 0, 0, .18);
        }

        .book-title {
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          line-height: 1.45;
          text-shadow: 0 1px 3px rgba(0, 0, 0, .28);
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: break-word;
          flex: 1;
        }

        .book-rule {
          height: 1px;
          background: linear-gradient(90deg, rgba(255,255,255,.55), rgba(255,255,255,.08));
        }

        .book-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }

        .book-grade {
          color: rgba(255, 255, 255, .92);
          font-size: 13px;
          font-weight: 600;
          text-shadow: 0 1px 2px rgba(0, 0, 0, .20);
        }

        .book-type {
          padding: 2px 8px;
          border-radius: 6px;
          background: rgba(255, 255, 255, .20);
          color: #fff;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .5px;
        }

        .book-hint {
          position: absolute;
          left: 24px;
          right: 10px;
          bottom: 0;
          height: 34px;
          display: flex;
          align-items: center;
          gap: 5px;
          color: rgba(255, 255, 255, .94);
          font-size: 11.5px;
          font-weight: 600;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, .22) 100%);
          z-index: 1;
        }

        .book-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 7px;
          padding: 0 2px;
          min-width: 0;
        }

        .book-meta-text {
          flex: 1;
          min-width: 0;
          font-size: 12px;
          color: #9a8e7a;
        }

        .book-download {
          flex: 0 0 auto;
          width: 34px;
          height: 34px;
          color: #8a6f5c !important;
        }

        .materials-empty {
          min-height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px dashed rgba(0, 0, 0, .10);
          border-radius: 10px;
          background: #fff;
        }

        @media (max-width: 560px) {
          .materials-select {
            flex: 1 1 calc(50% - 4px);
            min-width: 132px;
          }

          .materials-grid {
            gap: 12px 10px;
          }

          .book-cover-inner {
            padding: 18px 10px 10px 20px;
            gap: 7px;
          }

          .book-title {
            font-size: 15px;
          }

          .book-topic {
            font-size: 11px;
            padding: 2px 8px;
          }
        }

        @media (max-width: 340px) {
          .book-title {
            font-size: 14px;
          }

          .book-grade {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  )
}
