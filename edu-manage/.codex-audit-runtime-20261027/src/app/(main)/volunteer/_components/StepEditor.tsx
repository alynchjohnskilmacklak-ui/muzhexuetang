'use client'

import { Button, Checkbox, Image, Input, Space, Upload } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { BATCH_TAGS } from '@/lib/volunteer-shared'
import { normalizeUploadUrl } from '@/lib/upload-url'
import { useIsMobile } from '@/hooks/useIsMobile'

type Step = {
  id: string
  title: string
  content: string
  tipContent?: string | null
  imageUrl?: string | null
  batchTags: string[]
  isPublished: boolean
}

export function StepEditor({ step, onSaved }: { step?: Step; onSaved: () => void }) {
  const isMobile = useIsMobile() ?? false
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tipContent, setTipContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [batchTags, setBatchTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTitle(step?.title || '')
    setContent(step?.content || '')
    setTipContent(step?.tipContent || '')
    setImageUrl(step?.imageUrl || '')
    setBatchTags(step?.batchTags || [])
  }, [step])

  if (!step) {
    return <div style={{ height: 360, display: 'grid', placeItems: 'center', color: '#98A2B3' }}>请选择左侧步骤进行编辑</div>
  }

  const save = async (publish: boolean) => {
    if (publish && !content.trim()) {
      toast.error('步骤内容为空，不能发布')
      return
    }
    setSaving(true)
    const res = await fetch(`/api/volunteer/steps/${step.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, tipContent, imageUrl, batchTags, isPublished: publish }),
    })
    setSaving(false)
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) return toast.error(payload.error || '保存失败')
    toast.success('步骤已保存')
    onSaved()
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="步骤标题" />
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '220px 1fr', gap: 16 }}>
        <div style={{ border: '1px solid #EEE7E1', borderRadius: 8, minHeight: 132, background: '#FCFBF9', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
          {imageUrl ? <Image src={normalizeUploadUrl(imageUrl)} alt="步骤截图" width={220} height={132} style={{ objectFit: 'cover', borderRadius: 4 }} fallback="/file.svg" /> : <span style={{ color: '#98A2B3' }}>暂无截图</span>}
        </div>
        <Upload.Dragger
          name="file"
          action="/api/upload"
          accept="image/*"
          maxCount={1}
          showUploadList={false}
          beforeUpload={(file) => {
            if (!file.type.startsWith('image/')) { toast.warning('仅支持图片文件'); return Upload.LIST_IGNORE }
            if (file.size > 10 * 1024 * 1024) { toast.warning('图片大小不能超过 10MB'); return Upload.LIST_IGNORE }
            return true
          }}
          onChange={(info) => {
            if (info.file.status === 'uploading') return
            if (info.file.status === 'done') {
              const url = (info.file.response as { url?: string } | undefined)?.url
              const error = (info.file.response as { error?: string } | undefined)?.error
              if (url) { setImageUrl(url); toast.success('截图上传成功') }
              else if (error) toast.error(`截图上传失败：${error}`)
            } else if (info.file.status === 'error') {
              toast.error('截图上传失败：网络错误，请重试')
            }
          }}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">上传或替换步骤截图</p>
          <p className="ant-upload-hint">支持 image/*，单张不超过10MB</p>
        </Upload.Dragger>
      </div>
      <Input.TextArea value={content} onChange={(event) => setContent(event.target.value)} placeholder="步骤说明" maxLength={500} showCount autoSize={{ minRows: 6, maxRows: 10 }} status={!content.trim() ? 'warning' : undefined} />
      <Input.TextArea value={tipContent} onChange={(event) => setTipContent(event.target.value)} placeholder="温馨提示（可选）" maxLength={200} showCount autoSize={{ minRows: 2, maxRows: 4 }} />
      <Checkbox.Group value={batchTags} onChange={(value) => setBatchTags(value as string[])} options={BATCH_TAGS} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button loading={saving} onClick={() => save(false)}>保存草稿</Button>
        <Button type="primary" loading={saving} onClick={() => save(true)}>保存并发布</Button>
      </div>
    </Space>
  )
}
