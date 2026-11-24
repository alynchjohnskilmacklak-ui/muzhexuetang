'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import NextImage from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Skeleton, Typography } from 'antd'
import { ArrowLeftOutlined, DownloadOutlined, ExportOutlined, FileTextOutlined } from '@ant-design/icons'
import { getArchiveEntryTransitionName, getRubberBandOffset, runDocumentViewTransition } from '@/lib/ui-motion'

const { Title, Text } = Typography
const MATERIAL_PREVIEW_KEY = 'muzhe-parent-material-preview'

type PreviewLaunch = {
  id: string
  title: string
  subject: string
  grade: string
  coverBackground?: string
  view?: 'list' | 'covers'
  selectedGrade?: string
  selectedSubject?: string
  selectedType?: string
  activeChildId?: string
  transitionName?: string
}

const COPY = {
  preview: '\u8d44\u6599\u9884\u89c8',
  openNewTab: '\u5728\u65b0\u6807\u7b7e\u9875\u6253\u5f00',
  download: '\u4e0b\u8f7d',
  copyright: '\u672c\u8d44\u6599\u4ec5\u4f9b\u5728\u7ebf\u67e5\u770b\uff0c\u7248\u6743\u5f52\u7267\u54f2\u5b66\u5802\u6240\u6709',
  loadFailed: '\u8d44\u6599\u52a0\u8f7d\u5931\u8d25',
  notFound: '\u672a\u627e\u5230\u8be5\u4efd\u8d44\u6599',
  retry: '\u91cd\u8bd5',
  loading: '\u6b63\u5728\u52a0\u8f7d\u8d44\u6599\u2026',
}

function PreviewInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [isImage, setIsImage] = useState(false)
  const [title, setTitle] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [launch, setLaunch] = useState<PreviewLaunch | null>(null)
  const [coverExpanded, setCoverExpanded] = useState(false)
  const coverGestureStart = useRef<{ y: number; height: number; time: number } | null>(null)
  const coverGestureMoved = useRef(false)
  const transitionName = id ? getArchiveEntryTransitionName('material', id) : undefined

  const loadPreview = async (titleFallback = '') => {
    if (!id) {
      setStatus('error')
      setErrorMsg(COPY.notFound)
      return
    }
    setStatus('loading')
    try {
      // 轻量请求：只拿 metadata（fileType/title），不下载文件本体
      // PDF/图片由浏览器原生 viewer（iframe / <img>）流式加载，不经过 JS 内存
      const metaRes = await fetch(`/api/parent/materials`)
      if (!metaRes.ok) throw new Error(COPY.loadFailed)
      const data = await metaRes.json()
      const list = Array.isArray(data?.materials) ? data.materials : []
      const item = list.find((m: { id: string }) => m.id === id)
      const ft = String(item?.fileType || '').toLowerCase()
      setIsImage(['image', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ft))
      setTitle(item?.title || titleFallback || COPY.preview)
      setDownloadUrl(`/api/materials/${id}/view?download=1`)
      setStatus('ready')
    } catch (error) {
      console.error('\u8d44\u6599\u9884\u89c8\u52a0\u8f7d\u5931\u8d25', error)
      setErrorMsg(error instanceof Error ? error.message : COPY.loadFailed)
      setStatus('error')
    }
  }

  useEffect(() => {
    let titleFallback = ''
    try {
      const stored = sessionStorage.getItem(MATERIAL_PREVIEW_KEY)
      const parsed = stored ? JSON.parse(stored) as PreviewLaunch : null
      if (parsed?.id === id) {
        setLaunch(parsed)
        setTitle(parsed.title)
        titleFallback = parsed.title
      }
    } catch { /* The preview metadata request remains the fallback. */ }
    loadPreview(titleFallback)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const beginCoverGesture = (event: React.PointerEvent<HTMLButtonElement>) => {
    const height = coverExpanded ? 144 : 72
    coverGestureStart.current = { y: event.clientY, height, time: performance.now() }
    coverGestureMoved.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveCoverGesture = (event: React.PointerEvent<HTMLButtonElement>) => {
    const start = coverGestureStart.current
    if (!start) return
    const delta = start.y - event.clientY
    const next = start.height + delta
    const height = next < 72
      ? 72 - getRubberBandOffset(72 - next, 26)
      : next > 144
        ? 144 + getRubberBandOffset(next - 144, 26)
        : next
    const shell = event.currentTarget.closest<HTMLElement>('.preview-cover-shell')
    const cover = shell?.querySelector<HTMLElement>('.preview-cover')
    shell?.classList.add('is-dragging')
    cover?.style.setProperty('height', `${height}px`)
    if (Math.abs(delta) > 10) coverGestureMoved.current = true
  }

  const finishCoverGesture = (event: React.PointerEvent<HTMLButtonElement>) => {
    const start = coverGestureStart.current
    if (!start) return
    const delta = start.y - event.clientY
    const velocity = delta / Math.max(1, performance.now() - start.time)
    coverGestureStart.current = null
    const shell = event.currentTarget.closest<HTMLElement>('.preview-cover-shell')
    shell?.classList.remove('is-dragging')
    shell?.querySelector<HTMLElement>('.preview-cover')?.style.removeProperty('height')
    if (Math.abs(delta) > 10) {
      const nextExpanded = delta > 38 || velocity > .55
        ? true
        : delta < -38 || velocity < -.55
          ? false
          : coverExpanded
      setCoverExpanded(nextExpanded)
      coverGestureMoved.current = true
    }
  }

  const returnToMaterials = () => {
    const navigate = () => {
      router.back()
      window.setTimeout(() => {
        try { sessionStorage.removeItem(MATERIAL_PREVIEW_KEY) } catch { /* Ignore unavailable storage. */ }
      }, 6000)
    }
    let navigationStarted = false
    const transitioned = runDocumentViewTransition(async () => {
      navigationStarted = true
      navigate()
      let frames = 0
      while (frames < 120) {
        if (id && document.querySelector(`[data-material-source="${id}"]`)) return
        frames += 1
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
      }
    })
    if (!transitioned && !navigationStarted) navigate()
  }

  return (
    <div className="preview-page">
      <div className="preview-header">
        <Button type="text" className="preview-back mobile-shell-back" icon={<ArrowLeftOutlined />} onClick={returnToMaterials} aria-label="\u8fd4\u56de" />
        <div className="preview-heading">
          <Title level={5}>{COPY.preview}</Title>
        </div>
      </div>

      <div className={`preview-cover-shell${coverExpanded ? ' is-expanded' : ''}`}>
        <div
          className="preview-cover"
          style={{
            background: launch?.id === id ? launch.coverBackground : 'linear-gradient(160deg,#5D8D7E 0%,#14574D 52%,#0D3732 100%)',
            viewTransitionName: launch?.id === id ? launch.transitionName || transitionName : 'none',
          } as React.CSSProperties}
          data-material-transition-ready={launch?.id === id ? id : undefined}
        >
          <div className="preview-cover-spine" />
          <div className="preview-cover-copy">
            <small>{launch?.id === id ? `${launch.subject} · ${launch.grade}` : '牧哲学堂学习资料'}</small>
            <strong>{title}</strong>
          </div>
        </div>
        <button
          type="button"
          className="preview-cover-handle"
          aria-label={coverExpanded ? '收起资料封面' : '展开资料封面'}
          aria-expanded={coverExpanded}
          onPointerDown={beginCoverGesture}
          onPointerMove={moveCoverGesture}
          onPointerUp={finishCoverGesture}
          onPointerCancel={(event) => {
            coverGestureStart.current = null
            coverGestureMoved.current = false
            const shell = event.currentTarget.closest<HTMLElement>('.preview-cover-shell')
            shell?.classList.remove('is-dragging')
            shell?.querySelector<HTMLElement>('.preview-cover')?.style.removeProperty('height')
          }}
          onClick={() => {
            if (coverGestureMoved.current) { coverGestureMoved.current = false; return }
            setCoverExpanded((expanded) => !expanded)
          }}
        ><span /></button>
      </div>

      <div className="preview-body parent-entry-stagger" style={{ '--entry-stagger-index': 1 } as React.CSSProperties}>
        {status === 'loading' && (
          <div className="preview-loading" role="status" aria-live="polite" aria-label={COPY.loading}>
            <div className="mz-skeleton" style={{ width: 120, aspectRatio: '3 / 4', borderRadius: 10 }} />
            <div className="mz-skeleton" style={{ width: 120, height: 12, borderRadius: 6 }} />
            <Text type="secondary">{COPY.loading}</Text>
          </div>
        )}

        {status === 'error' && (
          <div className="preview-error">
            <FileTextOutlined className="preview-error-icon" />
            <Title level={5}>{errorMsg}</Title>
            <Text type="secondary">可以返回资料列表，或联系老师确认资料状态。</Text>
            <Button type="primary" onClick={() => loadPreview()}>{COPY.retry}</Button>
          </div>
        )}

        {status === 'ready' && isImage && (
          <div className="preview-image-wrap">
            <NextImage
              src={`/api/materials/${id}/view`}
              alt={title}
              width={1200}
              height={1600}
              unoptimized
              style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
              onContextMenu={(event) => event.preventDefault()}
              draggable={false}
            />
          </div>
        )}

        {status === 'ready' && !isImage && (
          <iframe
            src={`/api/materials/${id}/view#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
            className="preview-iframe"
            title={COPY.preview}
          />
        )}
      </div>

      <div className="preview-footer">
        <div className="preview-footer-inner">
          <Button icon={<ExportOutlined />} onClick={() => window.open(`/api/materials/${id}/view`, '_blank', 'noopener,noreferrer')}>
            {COPY.openNewTab}
          </Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={() => window.open(downloadUrl, '_blank')}>
            {COPY.download}
          </Button>
        </div>
        <div className="preview-copyright">
          <Text type="secondary" style={{ fontSize: 11.5 }}>{COPY.copyright}</Text>
        </div>
      </div>

      <style jsx>{`
        .preview-page {
          width: 100%;
          height: 100dvh;
          display: flex;
          flex-direction: column;
          background: #f5f3f0;
        }

        .preview-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 14px 8px;
          background: #fff;
          border-bottom: 1px solid rgba(0, 0, 0, .05);
          z-index: 3;
        }

        .preview-cover-shell { flex: 0 0 auto; padding: 0 14px; background: #fff; }
        .preview-cover { position: relative; display: flex; height: 72px; overflow: hidden; align-items: stretch; border-radius: 12px 14px 14px 12px; color: #fff; box-shadow: 0 7px 16px rgba(26, 18, 1, .13); transition: height 400ms cubic-bezier(.16, 1, .3, 1); }
        .preview-cover-shell.is-expanded .preview-cover { height: 144px; }
        .preview-cover-shell.is-dragging .preview-cover { transition: none; }
        .preview-cover-spine { flex: 0 0 8px; background: rgba(0, 0, 0, .15); box-shadow: inset -1px 0 rgba(255, 255, 255, .16); }
        .preview-cover-copy { display: flex; min-width: 0; flex-direction: column; justify-content: center; gap: 5px; padding: 10px 14px; }
        .preview-cover-copy small { color: rgba(255, 255, 255, .78); font-size: 11px; }
        .preview-cover-copy strong { display: -webkit-box; overflow: hidden; color: #fff; font-size: 15px; line-height: 1.45; text-overflow: ellipsis; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .preview-cover-handle { display: grid; width: 100%; min-height: 24px; place-items: center; padding: 4px 0; border: 0; background: #fff; cursor: grab; touch-action: none; }
        .preview-cover-handle:active { cursor: grabbing; }
        .preview-cover-handle span { width: 34px; height: 4px; border-radius: 999px; background: var(--color-hairline-strong); }

        .preview-back {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          font-size: 18px;
        }

        .preview-heading {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .preview-heading :global(.ant-typography) {
          margin: 0 !important;
        }

        .preview-heading h5 {
          font-size: 16px !important;
          color: #1a1201 !important;
        }

        .preview-heading span {
          max-width: 100%;
          font-size: 12px;
        }

        .preview-body {
          flex: 1;
          min-height: 0;
          overflow: hidden;
          background: #f5f3f0;
        }

        .preview-iframe {
          width: 100%;
          height: 100%;
          border: none;
          background: #fff;
        }

        .preview-image-wrap {
          height: 100%;
          overflow: auto;
          display: flex;
          justify-content: center;
          background: #e9e6e1;
          padding: 10px;
        }

        .preview-loading {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
        }

        .preview-error {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          text-align: center;
          padding: 24px;
        }

        .preview-error-icon {
          font-size: 42px;
          color: #d9cfc2;
        }

        .preview-error h5 {
          margin: 0 !important;
          color: #1a1201 !important;
        }

        .preview-error :global(.ant-btn) {
          margin-top: 8px;
          min-height: 42px;
          border-radius: 10px;
        }

        .preview-footer {
          background: #fff;
          border-top: 1px solid rgba(0, 0, 0, .05);
          padding: 10px 14px calc(10px + env(safe-area-inset-bottom));
        }

        .preview-footer-inner {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 10px;
        }

        .preview-footer-inner :global(.ant-btn) {
          min-height: 44px;
          border-radius: 11px;
          font-weight: 600;
        }

        .preview-copyright {
          margin-top: 8px;
          text-align: center;
        }
      `}</style>
    </div>
  )
}

export default function ParentMaterialPreviewPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}><Skeleton active paragraph={{ rows: 6 }} /></div>}>
      <PreviewInner />
    </Suspense>
  )
}
