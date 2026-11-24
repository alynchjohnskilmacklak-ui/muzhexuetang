'use client'

import { useMemo, useRef, useState } from 'react'
import { Button, Image, Input, Tag, Upload } from 'antd'
import { PictureOutlined, SendOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { toast } from 'sonner'
import { useSignedUrls } from '@/hooks/useSignedUrls'
import { PRACTICE_CHECKIN_OPTIONS, type ParentPracticeCheckin } from '@/lib/classroom-feedback/feedback-followup'

export type AdminPracticeReply = {
  id: string
  content: string
  imageUrls: string[]
  createdAt: string
}

type Props = {
  feedbackId: string
  studentId: string
  studentName: string
  checkin: ParentPracticeCheckin | null
  initialReplies: AdminPracticeReply[]
}

const MAX_IMAGES = 6

export function AdminPracticeReplyPanel({ feedbackId, studentId, studentName, checkin, initialReplies }: Props) {
  const [replies, setReplies] = useState(initialReplies)
  const [content, setContent] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const pendingUploads = useRef(0)
  const imageKeys = useMemo(() => [...replies.flatMap((reply) => reply.imageUrls), ...imageUrls], [replies, imageUrls])
  const { urls: signedImages } = useSignedUrls(imageKeys)
  const checkinLabel = PRACTICE_CHECKIN_OPTIONS.find((option) => option.value === checkin?.status)?.label || '未登记'

  const uploadRequest: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    if (imageUrls.length + pendingUploads.current >= MAX_IMAGES) {
      const error = new Error(`最多添加 ${MAX_IMAGES} 张图片`)
      toast.error(error.message)
      onError?.(error)
      return
    }
    pendingUploads.current += 1
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file as File)
      form.append('uploadType', 'admin-practice-reply')
      form.append('studentId', studentId)
      form.append('feedbackId', feedbackId)
      const response = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await response.json()
      if (!response.ok || typeof data.url !== 'string') throw new Error(data.error || '图片上传失败')
      setImageUrls((current) => current.length >= MAX_IMAGES ? current : [...current, data.url])
      onSuccess?.(data)
      toast.success('图片已添加')
    } catch (error) {
      const uploadError = error instanceof Error ? error : new Error('图片上传失败')
      toast.error(uploadError.message)
      onError?.(uploadError)
    } finally {
      pendingUploads.current = Math.max(0, pendingUploads.current - 1)
      setUploading(pendingUploads.current > 0)
    }
  }

  const sendReply = async () => {
    if (!content.trim() && imageUrls.length === 0) {
      toast.warning('请填写批示内容或添加图片')
      return
    }
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/classroom-feedback/${encodeURIComponent(feedbackId)}/practice-replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, content, imageUrls }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '批示发送失败')
      setReplies((current) => [...current, data.reply as AdminPracticeReply])
      setContent('')
      setImageUrls([])
      toast.success(data.notifiedParent ? '管理批示已发送给家长' : '批示已保存，当前未找到可通知的家长账号')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '批示发送失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-label={`${studentName}的家庭练习回传与管理批示`} style={{ display: 'grid', gap: 10, padding: 12, borderRadius: 12, border: '1px solid var(--color-hairline)', background: 'var(--color-primary-bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <strong style={{ color: 'var(--color-ink)', fontSize: 13 }}>{studentName} · 家庭练习回传</strong>
        <Tag color={checkin ? 'processing' : 'default'} style={{ margin: 0 }}>{checkinLabel}</Tag>
        {checkin?.updatedAt && <time style={{ color: 'var(--color-ink-subtle)', fontSize: 11 }}>{new Date(checkin.updatedAt).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })}</time>}
      </div>
      {checkin?.note && <div style={{ padding: '9px 10px', borderRadius: 9, background: 'var(--color-surface-1)', color: 'var(--color-ink)', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{checkin.note}</div>}

      {replies.map((reply, replyIndex) => {
        const imageStart = replies.slice(0, replyIndex).reduce((count, item) => count + item.imageUrls.length, 0)
        return (
          <article key={reply.id} style={{ display: 'grid', gap: 7, padding: 10, borderRadius: 10, background: 'var(--color-surface-1)', border: '1px solid var(--color-hairline)' }}>
            <time style={{ color: 'var(--color-ink-subtle)', fontSize: 11 }}>管理团队已回复 · {new Date(reply.createdAt).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })}</time>
            {reply.content && <div style={{ color: 'var(--color-ink)', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{reply.content}</div>}
            {reply.imageUrls.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {reply.imageUrls.map((url, index) => <Image key={`${reply.id}-${url}`} src={signedImages[imageStart + index] || url} alt={`${studentName}管理批示图片`} width={76} height={76} style={{ objectFit: 'cover', borderRadius: 8 }} />)}
              </div>
            )}
          </article>
        )
      })}

      {checkin && (
        <div style={{ display: 'grid', gap: 8, paddingTop: 4 }}>
          <Input.TextArea
            value={content}
            onChange={(event) => setContent(event.target.value.slice(0, 1000))}
            maxLength={1000}
            showCount
            autoSize={{ minRows: 2, maxRows: 5 }}
            placeholder="向家长说明处理意见、后续安排或练习建议"
            aria-label={`给${studentName}家长的管理批示`}
          />
          {imageUrls.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {imageUrls.map((url, index) => <div key={`${url}-${index}`} style={{ position: 'relative' }}>
                <Image src={signedImages[replies.reduce((count, reply) => count + reply.imageUrls.length, 0) + index] || url} alt="待发送图片" width={68} height={68} style={{ objectFit: 'cover', borderRadius: 8 }} />
                <button type="button" aria-label="移除此图片" onClick={() => setImageUrls((current) => current.filter((_, itemIndex) => itemIndex !== index))} style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, border: 0, borderRadius: 999, background: 'var(--color-ink)', color: '#fff', cursor: 'pointer' }}>×</button>
              </div>)}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Upload accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif" multiple showUploadList={false} disabled={uploading || imageUrls.length >= MAX_IMAGES} customRequest={uploadRequest}>
              <Button icon={<PictureOutlined />} loading={uploading} disabled={imageUrls.length >= MAX_IMAGES}>添加图片 · {imageUrls.length}/{MAX_IMAGES}</Button>
            </Upload>
            <Button type="primary" icon={<SendOutlined />} loading={saving} disabled={uploading} onClick={() => void sendReply()}>回传给家长</Button>
          </div>
          <span style={{ color: 'var(--color-ink-subtle)', fontSize: 10 }}>批示及照片仅管理端与对应学员家长可见，任课老师不可见。</span>
        </div>
      )}
    </section>
  )
}
