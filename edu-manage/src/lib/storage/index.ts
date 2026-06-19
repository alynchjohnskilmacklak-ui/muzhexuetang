/**
 * 文件存储抽象层。
 * 支持 local 和 aliyun-oss 两种 driver。
 *
 * 环境变量:
 *   STORAGE_DRIVER=local | aliyun-oss
 *   ALIYUN_OSS_REGION
 *   ALIYUN_OSS_BUCKET
 *   ALIYUN_OSS_ENDPOINT
 *   ALIYUN_OSS_ACCESS_KEY_ID
 *   ALIYUN_OSS_ACCESS_KEY_SECRET
 *   ALIYUN_OSS_PUBLIC_BASE_URL    — CDN 或 OSS 公网访问域名
 *   ALIYUN_OSS_PRIVATE_BUCKET     — true 表示私有 bucket，需签名 URL
 */

import { writeFile, mkdir, unlink } from 'fs/promises'
import { join, extname } from 'path'
import { createReadStream } from 'fs'

// ---- types ----

export interface UploadResult {
  url: string
  storageKey: string
  storageDriver: 'local' | 'aliyun-oss'
}

export interface StorageDriver {
  put(key: string, file: File, bucket?: string): Promise<UploadResult>
  delete(key: string): Promise<void>
  getUrl(key: string): string
}

// ---- local driver ----

const UPLOAD_ROOT = join(process.cwd(), 'public', 'uploads')

class LocalStorageDriver implements StorageDriver {
  async put(key: string, file: File): Promise<UploadResult> {
    const buffer = Buffer.from(await file.arrayBuffer())
    const filePath = join(UPLOAD_ROOT, key)
    const dir = filePath.substring(0, filePath.lastIndexOf('/'))
    await mkdir(dir, { recursive: true })
    await writeFile(filePath, buffer)
    return {
      url: `/api/uploads/${key}`,
      storageKey: key,
      storageDriver: 'local',
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = join(UPLOAD_ROOT, key)
    try { await unlink(filePath) } catch { /* 文件可能已删除 */ }
  }

  getUrl(key: string): string {
    return `/api/uploads/${key}`
  }
}

// ---- aliyun-oss driver ----

class AliyunOssDriver implements StorageDriver {
  private _client: unknown = null

  private async getClient(): Promise<unknown> {
    if (this._client) return this._client
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const OSS = require('ali-oss')
      this._client = new OSS({
        region: process.env.ALIYUN_OSS_REGION || 'oss-cn-hangzhou',
        bucket: process.env.ALIYUN_OSS_BUCKET || '',
        endpoint: process.env.ALIYUN_OSS_ENDPOINT,
        accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID || '',
        accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET || '',
      })
      return this._client
    } catch (err) {
      throw new Error(`OSS SDK 未安装或配置错误: ${err instanceof Error ? err.message : 'unknown'}`)
    }
  }

  async put(key: string, file: File): Promise<UploadResult> {
    const client = await this.getClient() as { put(key: string, buf: Buffer): Promise<{ url: string; name: string }> }
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await client.put(key, buffer)
    const baseUrl = process.env.ALIYUN_OSS_PUBLIC_BASE_URL || `https://${process.env.ALIYUN_OSS_BUCKET}.${process.env.ALIYUN_OSS_REGION}.aliyuncs.com`
    return {
      url: `${baseUrl}/${result.name}`,
      storageKey: result.name,
      storageDriver: 'aliyun-oss',
    }
  }

  async delete(key: string): Promise<void> {
    const client = await this.getClient() as { delete(key: string): Promise<void> }
    try { await client.delete(key) } catch { /* 忽略 */ }
  }

  getUrl(key: string): string {
    const baseUrl = process.env.ALIYUN_OSS_PUBLIC_BASE_URL || `https://${process.env.ALIYUN_OSS_BUCKET}.${process.env.ALIYUN_OSS_REGION}.aliyuncs.com`
    return `${baseUrl}/${key}`
  }
}

// ---- factory ----

const drivers: Record<string, StorageDriver> = {
  local: new LocalStorageDriver(),
  'aliyun-oss': new AliyunOssDriver(),
}

function getDriver(): StorageDriver {
  const configured = process.env.STORAGE_DRIVER || 'local'
  const driver = drivers[configured]
  if (!driver) {
    console.warn(`[storage] 未知 STORAGE_DRIVER "${configured}"，降级为 local`)
    return drivers.local
  }
  return driver
}

// ---- public API ----

/** 生成安全的文件名: {prefix}-{timestamp}-{random}.{ext} */
export function safeFilename(originalName: string, prefix = 'file'): string {
  const ext = extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, '') || '.bin'
  const safeExt = ext.length > 8 ? '.bin' : ext
  const ts = Date.now()
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${ts}-${rand}${safeExt}`
}

/** 判断文件是否为允许的图片格式 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(file.name)
}

/** 判断是否为允许的文档格式 */
export function isDocumentFile(file: File): boolean {
  return /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z)$/i.test(file.name)
}

/** 上传文件并返回统一结果 */
export async function uploadFile(file: File, options?: { prefix?: string; bucket?: string }): Promise<UploadResult> {
  const driver = getDriver()
  const key = safeFilename(file.name, options?.prefix)
  return driver.put(key, file, options?.bucket)
}

/** 删除文件 */
export async function deleteFile(key: string): Promise<void> {
  const driver = getDriver()
  return driver.delete(key)
}

/** 获取文件访问 URL */
export function getFileUrl(key: string): string {
  const driver = getDriver()
  return driver.getUrl(key)
}
