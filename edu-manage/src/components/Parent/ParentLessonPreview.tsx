'use client'

import { useEffect, useMemo, useState } from 'react'
import NextImage from 'next/image'
import { useRouter } from 'next/navigation'
import { Button, Modal } from 'antd'
import { ClockCircleOutlined, DownloadOutlined, EyeOutlined, FileImageOutlined, FilePdfOutlined, FilePptOutlined, FileWordOutlined, HistoryOutlined } from '@ant-design/icons'
import { toast } from 'sonner'
import { PdfCanvasViewer } from '@/components/Common/PdfCanvasViewer'
import { materialFileLabel } from '@/lib/material-format'
import { downloadMaterialFile, loadMaterialPreview, type MaterialPreviewResult } from '@/lib/material-preview-client'

export interface LessonPreviewItem {
  id: string
  title: string
  fileName: string
  fileType: string
  description: string | null
  createdAt: string
  lessonDate: string
  startTime: string
  endTime: string
  subject: string
  teacherName: string
  groupName: string
  studentIds: string[]
}

function FileIcon({ type }: { type: string }) {
  if (type === 'pdf') return <FilePdfOutlined />
  if (type === 'word') return <FileWordOutlined />
  if (type === 'ppt') return <FilePptOutlined />
  if (type === 'image') return <FileImageOutlined />
  return <FileWordOutlined />
}

function weekdayLabel(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { weekday: 'long', timeZone: 'Asia/Shanghai' }).format(new Date(value))
}

function shanghaiDateKey(value: Date | string) {
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Shanghai' }).formatToParts(new Date(value))
  const part = (type: string) => parts.find((item) => item.type === type)?.value || ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function lessonDayLabel(value: string) {
  const lessonKey = shanghaiDateKey(value)
  const todayKey = shanghaiDateKey(new Date())
  const difference = Math.round((Date.parse(`${lessonKey}T00:00:00Z`) - Date.parse(`${todayKey}T00:00:00Z`)) / 86400000)
  if (difference === 0) return '今天'
  if (difference === 1) return '明天'
  if (difference === 2) return '后天'
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Shanghai' }).format(new Date(value))
}

export function ParentLessonPreview({ items, activeChildId }: { items: LessonPreviewItem[]; activeChildId: string }) {
  const router = useRouter()
  const materials = useMemo(() => {
    const childItems = items.filter((item) => !activeChildId || item.studentIds.includes(activeChildId))
    const nextDate = childItems.map((item) => shanghaiDateKey(item.lessonDate)).sort()[0]
    return childItems
      .filter((item) => shanghaiDateKey(item.lessonDate) === nextDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.teacherName.localeCompare(b.teacherName, 'zh-CN'))
  }, [activeChildId, items])
  const [selectedMaterial, setSelectedMaterial] = useState<LessonPreviewItem | null>(null)
  const [viewerTitle, setViewerTitle] = useState('')
  const [viewer, setViewer] = useState<MaterialPreviewResult | null>(null)
  const [viewing, setViewing] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (selectedMaterial && !materials.some((item) => item.id === selectedMaterial.id)) setSelectedMaterial(null)
  }, [materials, selectedMaterial])

  useEffect(() => () => { if (viewer?.isBlob) URL.revokeObjectURL(viewer.url) }, [viewer])

  const openViewer = async () => {
    if (!selectedMaterial) return
    setViewing(true)
    try {
      const nextViewer = await loadMaterialPreview(selectedMaterial.id, selectedMaterial.fileType)
      setViewerTitle(selectedMaterial.title)
      setViewer(nextViewer)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '讲义打开失败')
    } finally {
      setViewing(false)
    }
  }

  const download = async () => {
    if (!selectedMaterial) return
    setDownloading(true)
    try {
      await downloadMaterialFile(selectedMaterial.id, selectedMaterial.fileName)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '讲义下载失败')
    } finally {
      setDownloading(false)
    }
  }

  const previewDay = materials[0]
  if (!previewDay) return null
  const dayLabel = lessonDayLabel(previewDay.lessonDate)

  return (
    <>
      <section className="lesson-preview-card" aria-label="周末课讲义预告">
        <div className="lesson-preview-card__inner">
          <div className="lesson-preview-card__top">
            <div className="lesson-preview-card__badge"><i /> 周末课讲义已更新 · {materials.length} 门</div>
            <button type="button" onClick={() => router.push('/parent/archive?tab=materials')}>往期讲义 ›</button>
          </div>
          <div className="lesson-preview-card__list">
            {materials.map((material) => (
              <button type="button" className="lesson-preview-card__row" key={material.id} onClick={() => setSelectedMaterial(material)}>
                <span className={`lesson-preview-file is-${material.fileType}`}><FileIcon type={material.fileType} /><small>{materialFileLabel(material.fileType)}</small></span>
                <span className="lesson-preview-copy">
                  <span className="lesson-preview-copy__when"><ClockCircleOutlined /> {dayLabel} · {weekdayLabel(material.lessonDate)} · {material.startTime}-{material.endTime}</span>
                  <strong>{material.title}</strong>
                  <small>{material.subject} · {material.teacherName}</small>
                </span>
                <span className="lesson-preview-card__view">查看</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <Modal title="周末课讲义" open={!!selectedMaterial} onCancel={() => setSelectedMaterial(null)} footer={null} width={560} className="lesson-preview-detail-modal">
        {selectedMaterial && <>
          <div className="lesson-preview-document">
            <span className={`lesson-preview-file is-${selectedMaterial.fileType}`}><FileIcon type={selectedMaterial.fileType} /><small>{materialFileLabel(selectedMaterial.fileType)}</small></span>
            <strong>{selectedMaterial.title}</strong>
            <small>{selectedMaterial.fileName}</small>
          </div>
          <div className="lesson-preview-details">
            <div><span>上课时间</span><strong>{lessonDayLabel(selectedMaterial.lessonDate)} {weekdayLabel(selectedMaterial.lessonDate)} {selectedMaterial.startTime}-{selectedMaterial.endTime}</strong></div>
            <div><span>授课老师</span><strong>{selectedMaterial.teacherName} · {selectedMaterial.subject}</strong></div>
            <div><span>所属班级</span><strong>{selectedMaterial.groupName}</strong></div>
            <div><span>上传时间</span><strong>{new Date(selectedMaterial.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></div>
            {selectedMaterial.description && <div><span>说明</span><strong>{selectedMaterial.description}</strong></div>}
          </div>
          <Button className="lesson-preview-history-link" block icon={<HistoryOutlined />} onClick={() => router.push('/parent/archive?tab=materials')}>查看全部往期讲义</Button>
          <div className="lesson-preview-actions">
            <Button icon={<DownloadOutlined />} loading={downloading} onClick={download}>下载</Button>
            <Button className="lesson-preview-online" type="primary" icon={<EyeOutlined />} loading={viewing} onClick={openViewer}>在线查看</Button>
          </div>
        </>}
      </Modal>

      <Modal title={viewerTitle} open={!!viewer} footer={null} onCancel={() => setViewer(null)} width="95vw" style={{ top: 10 }} styles={{ body: { padding: 0 } }}>
        {viewer?.type === 'pdf'
          ? <PdfCanvasViewer url={viewer.url || undefined} data={viewer.data} title={viewerTitle} />
          : viewer?.type === 'image'
          ? <div className="lesson-preview-image"><NextImage src={viewer.url} alt={viewerTitle} width={1200} height={800} unoptimized /></div>
          : viewer && <iframe src={viewer.url} title={viewerTitle} className="lesson-preview-frame" />}
      </Modal>

      <style jsx>{`
        .lesson-preview-card { padding: 4px; border-radius: var(--radius-xl); background: var(--color-brand-secure); box-shadow: var(--shadow-card); }
        .lesson-preview-card__inner { padding: 16px; border-radius: var(--radius-lg); background: var(--color-surface-1); }
        .lesson-preview-card__top { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 4px; }
        .lesson-preview-card__top > button { min-height: 38px; flex: 0 0 auto; padding: 4px 2px; border: 0; color: var(--color-ink-muted); background: transparent; font-size: 12px; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
        .lesson-preview-card__top > button:focus-visible, .lesson-preview-card__row:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
        .lesson-preview-card__badge { display: inline-flex; align-items: center; gap: 7px; color: var(--color-brand-secure); font-size: 12px; font-weight: 700; }
        .lesson-preview-card__badge i { width: 7px; height: 7px; flex: 0 0 7px; border-radius: 50%; background: var(--color-brand-secure); box-shadow: 0 0 0 0 var(--color-brand-secure); animation: preview-pulse 2s infinite; }
        .lesson-preview-card__list { display: flex; flex-direction: column; }
        .lesson-preview-card__row { width: 100%; display: grid; grid-template-columns: 46px minmax(0, 1fr) auto; gap: 11px; align-items: center; padding: 11px 0; border: 0; border-bottom: 1px solid var(--color-hairline); color: inherit; background: transparent; text-align: left; cursor: pointer; }
        .lesson-preview-card__row:last-child { padding-bottom: 2px; border-bottom: 0; }
        .lesson-preview-file { width: 46px; height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; border-radius: var(--radius-md); color: var(--color-error); background: var(--color-surface-3); font-size: 20px; }
        .lesson-preview-file small { font-size: 12px; font-weight: 800; letter-spacing: .04em; }
        .lesson-preview-file.is-word { color: var(--color-chart-6); }
        .lesson-preview-file.is-ppt { color: var(--color-primary); background: var(--color-primary-bg); }
        .lesson-preview-file.is-image { color: var(--color-brand-secure); }
        .lesson-preview-copy { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .lesson-preview-copy strong { overflow: hidden; color: var(--color-ink); font-size: 14px; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; }
        .lesson-preview-copy .lesson-preview-copy__when { color: var(--color-brand-secure); font-size: 12px; font-weight: 700; line-height: 1.4; }
        .lesson-preview-copy small { overflow: hidden; color: var(--color-ink-muted); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
        .lesson-preview-card__view { padding: 7px 11px; border-radius: var(--radius-md); color: var(--color-on-primary); background: var(--color-ink); font-size: 12px; font-weight: 650; }
        .lesson-preview-document { min-height: clamp(240px, 42vh, 360px); margin-top: 8px; border-radius: var(--radius-lg); background: var(--color-canvas); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; }
        .lesson-preview-document .lesson-preview-file { width: 60px; height: 72px; font-size: 28px; }
        .lesson-preview-document .lesson-preview-file small { font-size: 12px; }
        .lesson-preview-document strong { color: var(--color-ink); font-size: 16px; }
        .lesson-preview-document > small { color: var(--color-ink-muted); }
        .lesson-preview-details { margin-top: 12px; }
        .lesson-preview-details > div { display: flex; justify-content: space-between; gap: 20px; padding: 10px 0; border-bottom: 1px solid var(--color-hairline); font-size: 13px; }
        .lesson-preview-details span { color: var(--color-ink-muted); flex: 0 0 64px; }
        .lesson-preview-details strong { color: var(--color-ink); text-align: right; }
        .lesson-preview-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
        :global(.lesson-preview-history-link) { min-height: 42px; margin-top: 14px; color: var(--color-ink-muted); }
        .lesson-preview-actions :global(.ant-btn) { min-height: 44px; }
        .lesson-preview-actions :global(.lesson-preview-online) { border-color: var(--color-brand-secure); background: var(--color-brand-secure); }
        .lesson-preview-frame { width: 100%; height: 82vh; border: 0; }
        .lesson-preview-image { padding: 16px; text-align: center; background: var(--color-canvas); }
        .lesson-preview-image :global(img) { width: auto; height: auto; max-width: 100%; max-height: 80vh; object-fit: contain; }
        @keyframes preview-pulse { 70% { box-shadow: 0 0 0 7px rgba(83,74,183,0); } 100% { box-shadow: 0 0 0 0 rgba(83,74,183,0); } }
        @media (max-width: 390px) {
          .lesson-preview-card__inner { padding: 14px; }
          .lesson-preview-card__row { grid-template-columns: 42px minmax(0, 1fr) auto; gap: 9px; }
          .lesson-preview-file { width: 42px; height: 52px; }
          .lesson-preview-card__view { padding: 7px 9px; }
        }
        @media (prefers-reduced-motion: reduce) { .lesson-preview-card__badge i { animation: none; } }
      `}</style>
    </>
  )
}
