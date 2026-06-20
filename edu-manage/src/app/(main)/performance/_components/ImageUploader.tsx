'use client'

import { useEffect, useState } from 'react'
import { Upload } from 'antd'
import { toast } from 'sonner'
import type { UploadFile, UploadProps } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import { normalizeUploadUrl } from '@/lib/upload-url'

export function ImageUploader({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  const [fileList, setFileList] = useState<UploadFile[]>([])

  useEffect(() => {
    setFileList(value.map((url, index) => ({
      uid: `saved-${index}-${url}`,
      name: url.split('/').pop() || `image-${index + 1}`,
      status: 'done',
      url: normalizeUploadUrl(url),
    })))
  }, [value])

  const props: UploadProps = {
    name: 'file',
    action: '/api/upload',
    accept: 'image/*',
    listType: 'picture',
    maxCount: 9,
    fileList,
    beforeUpload(file) {
      if (!file.type.startsWith('image/')) {
        toast.error('只能上传图片')
        return Upload.LIST_IGNORE
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('单张图片不能超过 10MB')
        return Upload.LIST_IGNORE
      }
      return true
    },
    onChange(info) {
      const nextList = info.fileList.slice(0, 9)
      setFileList(nextList)

      if (info.file.status === 'done') toast.success('照片已添加')
      if (info.file.status === 'error') toast.error('照片上传失败，请重新登录后再试')

      if (info.file.status === 'done' || info.file.status === 'removed') {
        const urls = nextList
          .filter((file) => file.status === 'done')
          .map((file) => normalizeUploadUrl((file.response as { url?: string } | undefined)?.url || file.url))
          .filter((url): url is string => Boolean(url))
        onChange(urls)
      }
    },
    onRemove(file) {
      const urls = fileList
        .filter((item) => item.uid !== file.uid)
        .map((item) => normalizeUploadUrl((item.response as { url?: string } | undefined)?.url || item.url))
        .filter((url): url is string => Boolean(url))
      onChange(urls)
      return true
    },
  }

  return (
    <Upload.Dragger {...props}>
      <p className="ant-upload-drag-icon"><InboxOutlined /></p>
      <p className="ant-upload-text">上传课堂照片</p>
      <p className="ant-upload-hint">最多 9 张图片，单张不超过 10MB</p>
    </Upload.Dragger>
  )
}
