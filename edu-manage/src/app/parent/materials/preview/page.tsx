'use client'

import { Suspense, useEffect, useState } from 'react'
import NextImage from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Skeleton, Typography } from 'antd'
import { ArrowLeftOutlined, DownloadOutlined, ExportOutlined, FileTextOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

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

  const loadPreview = async () => {
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
      setTitle(item?.title || COPY.preview)
      setDownloadUrl(`/api/materials/${id}/view?download=1`)
      setStatus('ready')
    } catch (error) {
      console.error('\u8d44\u6599\u9884\u89c8\u52a0\u8f7d\u5931\u8d25', error)
      setErrorMsg(error instanceof Error ? error.message : COPY.loadFailed)
      setStatus('error')
    }
  }

  useEffect(() => {
    loadPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return (
    <div className="preview-page">
      <div className="preview-header">
        <Button type="text" className="preview-back" icon={<ArrowLeftOutlined />} onClick={() => router.back()} aria-label="\u8fd4\u56de" />
        <div className="preview-heading">
          <Title level={5}>{COPY.preview}</Title>
          <Text type="secondary" ellipsis style={{ maxWidth: '100%' }}>{title}</Text>
        </div>
      </div>

      <div className="preview-body">
        {status === 'loading' && (
          <div className="preview-loading">
            <Skeleton.Node active style={{ width: 120, height: 150, borderRadius: 10 }} />
            <Text type="secondary">{COPY.loading}</Text>
          </div>
        )}

        {status === 'error' && (
          <div className="preview-error">
            <FileTextOutlined className="preview-error-icon" />
            <Title level={5}>{errorMsg}</Title>
            <Text type="secondary">可以返回资料列表，或联系老师确认资料状态。</Text>
            <Button type="primary" onClick={loadPreview}>{COPY.retry}</Button>
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
