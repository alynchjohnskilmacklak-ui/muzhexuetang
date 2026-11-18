'use client'

import { useEffect, useState } from 'react'
import NextImage from 'next/image'
import useSWR from 'swr'
import { Button, Modal, Skeleton } from 'antd'
import { DownloadOutlined, EyeOutlined, FileImageOutlined, FilePdfOutlined, FilePptOutlined, FileWordOutlined } from '@ant-design/icons'
import { toast } from 'sonner'
import { materialFileLabel } from '@/lib/material-format'
import { downloadMaterialFile, loadMaterialPreview, type MaterialPreviewResult } from '@/lib/material-preview-client'
import { PdfCanvasViewer } from '@/components/Common/PdfCanvasViewer'

interface HistoryMaterial {
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
  studentNames: string[]
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || '讲义记录加载失败')
  return data as { materials: HistoryMaterial[] }
}

function FileIcon({ type }: { type: string }) {
  if (type === 'pdf') return <FilePdfOutlined />
  if (type === 'ppt') return <FilePptOutlined />
  if (type === 'image') return <FileImageOutlined />
  return <FileWordOutlined />
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short', timeZone: 'Asia/Shanghai' }).format(new Date(value))
}

export function ParentLessonPreviewHistory() {
  const { data, error, isLoading, mutate } = useSWR('/api/parent/materials/lesson-previews', fetcher, { refreshInterval: 30000, revalidateOnFocus: true, revalidateOnReconnect: true })
  const [viewer, setViewer] = useState<MaterialPreviewResult | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [viewerTitle, setViewerTitle] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => () => { if (viewer?.isBlob) URL.revokeObjectURL(viewer.url) }, [viewer])

  const openViewer = async (material: HistoryMaterial) => {
    setViewingId(material.id)
    try {
      const next = await loadMaterialPreview(material.id, material.fileType)
      setViewerTitle(material.title)
      setViewer(next)
    } catch (previewError) {
      toast.error(previewError instanceof Error ? previewError.message : '讲义预览加载失败')
    } finally {
      setViewingId(null)
    }
  }

  const materials = data?.materials || []

  const download = async (material: HistoryMaterial) => {
    setDownloadingId(material.id)
    try {
      await downloadMaterialFile(material.id, material.fileName)
    } catch (downloadError) {
      toast.error(downloadError instanceof Error ? downloadError.message : '讲义下载失败')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <main className="preview-history">
      <header>
        <span>学习工具</span>
        <h1>周末课讲义</h1>
        <p>老师为每次周末课准备的讲义都会保留在这里，最新上传的内容会同步显示在首页。</p>
      </header>

      {isLoading ? <div className="preview-history__loading"><Skeleton active /><Skeleton active /></div> : error ? (
        <div className="preview-history__empty"><strong>讲义记录加载失败</strong><span>{error.message}</span><Button onClick={() => mutate()}>重新加载</Button></div>
      ) : materials.length ? (
        <div className="preview-history__list">
          {materials.map((material, index) => (
            <article key={material.id} className="preview-history__row">
              <div className={`preview-history__file is-${material.fileType}`}><FileIcon type={material.fileType} /><span>{materialFileLabel(material.fileType)}</span></div>
              <div className="preview-history__body">
                <div className="preview-history__title"><h2>{material.title}</h2>{index === 0 && <span>最新</span>}</div>
                <p>{dateLabel(material.lessonDate)} · {material.startTime}-{material.endTime}</p>
                <small>{material.subject} · {material.teacherName} · {material.groupName}{material.studentNames.length ? ` · ${material.studentNames.join('、')}` : ''}</small>
                {material.description && <em>{material.description}</em>}
              </div>
              <div className="preview-history__actions">
                <Button type="primary" icon={<EyeOutlined />} loading={viewingId === material.id} onClick={() => openViewer(material)}>在线查看</Button>
                <Button icon={<DownloadOutlined />} loading={downloadingId === material.id} onClick={() => download(material)}>下载</Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="preview-history__empty"><FileWordOutlined /><strong>还没有周末课讲义</strong><span>老师发布后会自动显示在这里。</span></div>
      )}

      <Modal title={viewerTitle} open={!!viewer} footer={null} onCancel={() => setViewer(null)} width="95vw" style={{ top: 10 }} styles={{ body: { padding: 0 } }}>
        {viewer?.type === 'pdf'
          ? <PdfCanvasViewer url={viewer.url || undefined} data={viewer.data} title={viewerTitle} />
          : viewer?.type === 'image'
          ? <div className="preview-history__image"><NextImage src={viewer.url} alt={viewerTitle} width={1200} height={800} unoptimized /></div>
          : viewer && <iframe src={viewer.url} title={viewerTitle} className="preview-history__frame" />}
      </Modal>

      <style jsx>{`
        .preview-history { width: 100%; max-width: 820px; margin: 0 auto; }
        header { margin-bottom: 18px; }
        header > span { color: var(--color-role-parent); font-size: 12px; font-weight: 700; }
        h1 { margin: 5px 0 6px; color: var(--color-ink); font-size: 22px; }
        header p { margin: 0; color: var(--color-ink-muted); font-size: 14px; line-height: 1.6; }
        .preview-history__loading, .preview-history__list { display: flex; flex-direction: column; gap: 10px; }
        .preview-history__row { display: grid; grid-template-columns: 58px minmax(0, 1fr) auto; gap: 14px; align-items: center; padding: 14px; border: 1px solid var(--color-hairline); border-radius: var(--radius-lg); background: var(--color-surface-1); box-shadow: var(--shadow-card); }
        .preview-history__file { width: 58px; height: 68px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; border-radius: var(--radius-md); color: var(--color-error); background: var(--color-surface-3); font-size: 28px; }
        .preview-history__file span { font-size: 12px; font-weight: 800; }
        .preview-history__file.is-word { color: var(--color-chart-6); }
        .preview-history__file.is-ppt { color: var(--color-primary); background: var(--color-primary-bg); }
        .preview-history__file.is-image { color: var(--color-brand-secure); }
        .preview-history__body { min-width: 0; }
        .preview-history__title { display: flex; align-items: center; gap: 8px; }
        .preview-history__title h2 { overflow: hidden; margin: 0; color: var(--color-ink); font-size: 16px; text-overflow: ellipsis; white-space: nowrap; }
        .preview-history__title span { padding: 2px 7px; border-radius: var(--radius-pill); color: var(--color-role-parent); background: var(--color-role-parent-bg); font-size: 12px; }
        .preview-history__body p { margin: 6px 0 3px; color: var(--color-ink-muted); font-size: 12px; }
        .preview-history__body small { display: block; overflow: hidden; color: var(--color-ink-subtle); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
        .preview-history__body em { display: block; margin-top: 7px; color: var(--color-ink-muted); font-size: 12px; font-style: normal; }
        .preview-history__actions { display: flex; flex-direction: column; gap: 7px; min-width: 108px; }
        .preview-history__empty { min-height: 260px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px; border: 1px dashed var(--color-hairline-strong); border-radius: var(--radius-lg); color: var(--color-ink-subtle); background: var(--color-surface-1); text-align: center; }
        .preview-history__empty > :first-child { font-size: 28px; }
        .preview-history__empty strong { color: var(--color-ink); }
        .preview-history__empty span { font-size: 12px; }
        .preview-history__frame { width: 100%; height: 82vh; border: 0; background: var(--color-surface-1); }
        .preview-history__image { padding: 16px; text-align: center; background: var(--color-canvas); }
        .preview-history__image :global(img) { width: auto; height: auto; max-width: 100%; max-height: 80vh; object-fit: contain; }
        @media (max-width: 620px) {
          h1 { font-size: 22px; }
          .preview-history__row { grid-template-columns: 50px minmax(0, 1fr); gap: 11px; padding: 12px; }
          .preview-history__file { width: 50px; height: 60px; }
          .preview-history__actions { grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </main>
  )
}
