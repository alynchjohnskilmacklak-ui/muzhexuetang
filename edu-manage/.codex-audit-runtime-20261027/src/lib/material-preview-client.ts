export type MaterialPreviewType = 'pdf' | 'image' | 'word'

export interface MaterialPreviewResult {
  url: string
  type: MaterialPreviewType
  isBlob: boolean
  data?: Uint8Array
}

export async function loadMaterialPreview(id: string, fallbackType: string): Promise<MaterialPreviewResult> {
  const response = await fetch(`/api/materials/${id}/view`)
  const contentType = response.headers.get('content-type') || ''
  if (!response.ok) {
    const data = contentType.includes('application/json') ? await response.json().catch(() => null) : null
    throw new Error(data?.error || '讲义预览加载失败')
  }

  if (contentType.includes('application/json')) {
    const data = await response.json() as { type?: string; url?: string; viewerUrl?: string }
    const url = data.viewerUrl || data.url
    if (!url) throw new Error('当前文件暂不支持在线预览')
    const type = ['pdf', 'image', 'word'].includes(data.type || '') ? data.type as MaterialPreviewType : fallbackType as MaterialPreviewType
    return { url, type, isBlob: false }
  }

  if (fallbackType === 'word' && !contentType.includes('text/html')) throw new Error('旧版 Word 格式请下载后查看')
  if (!['pdf', 'image', 'word'].includes(fallbackType)) throw new Error('当前格式请下载后查看')
  // iOS 微信内置浏览器不能稳定地再次 fetch blob: URL。PDF 直接保留第一次
  // 鉴权请求取得的字节并交给 PDF.js，避免出现 "Load failed"。
  if (fallbackType === 'pdf') {
    return {
      url: '',
      type: 'pdf',
      isBlob: false,
      data: new Uint8Array(await response.arrayBuffer()),
    }
  }
  return { url: URL.createObjectURL(await response.blob()), type: fallbackType as MaterialPreviewType, isBlob: true }
}

export async function downloadMaterialFile(id: string, fileName: string): Promise<void> {
  const response = await fetch(`/api/materials/${id}/view?download=1`)
  const contentType = response.headers.get('content-type') || ''
  if (!response.ok) {
    const data = contentType.includes('application/json') ? await response.json().catch(() => null) : null
    throw new Error(data?.error || '讲义下载失败')
  }

  const objectUrl = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName || '周末课讲义'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000)
}
