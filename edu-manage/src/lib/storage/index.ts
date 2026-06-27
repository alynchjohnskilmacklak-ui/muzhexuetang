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
import crypto from 'crypto'

// ---- types ----

export interface UploadResult {
  url: string
  storageKey: string
  storageDriver: 'local' | 'aliyun-oss'
}

export interface PostSignature {
  host: string
  accessKeyId: string
  policy: string
  signature: string
  key: string
  expire: number
}

export interface StorageDriver {
  put(key: string, file: File, bucket?: string): Promise<UploadResult>
  putBuffer(key: string, buffer: Buffer, mimeType: string): Promise<UploadResult>
  delete(key: string): Promise<void>
  getUrl(key: string): string
}

export type StorageErrorCode =
  | 'OSS_SDK_MISSING'
  | 'OSS_CONFIG_MISSING'
  | 'OSS_SIGNATURE_FAILED'
  | 'OSS_ACCESS_DENIED'
  | 'OSS_BUCKET_NOT_FOUND'

export class StorageConfigurationError extends Error {
  code: StorageErrorCode
  status: number

  constructor(code: StorageErrorCode, message: string, status = 500) {
    super(message)
    this.name = 'StorageConfigurationError'
    this.code = code
    this.status = status
  }
}

function isAliOssModuleMissing(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: unknown }).code === 'MODULE_NOT_FOUND'
}

function requiredOssEnvMissing(): string[] {
  return [
    'ALIYUN_OSS_REGION',
    'ALIYUN_OSS_BUCKET',
    'ALIYUN_OSS_ENDPOINT',
    'ALIYUN_OSS_ACCESS_KEY_ID',
    'ALIYUN_OSS_ACCESS_KEY_SECRET',
    'ALIYUN_OSS_PUBLIC_BASE_URL',
  ].filter((key) => !process.env[key])
}

function assertAliyunOssReady(): void {
  try { require.resolve('ali-oss') }
  catch (err) {
    if (isAliOssModuleMissing(err)) {
      throw new StorageConfigurationError(
        'OSS_SDK_MISSING',
        'OSS 依赖未安装，请在服务器执行 npm install ali-oss 并重新构建',
        500
      )
    }
    throw err
  }

  if (requiredOssEnvMissing().length > 0) {
    throw new StorageConfigurationError(
      'OSS_CONFIG_MISSING',
      'OSS 配置不完整，请检查 ALIYUN_OSS_REGION / BUCKET / ACCESS_KEY',
      500
    )
  }
}

function ossEndpointHost(): string {
  const endpoint = process.env.ALIYUN_OSS_ENDPOINT || ''
  return endpoint.replace(/^https?:\/\//, '').replace(/\/+$/, '')
}

function ossPostHost(bucket: string): string {
  const endpoint = ossEndpointHost()
  if (!endpoint) return `${bucket}.${process.env.ALIYUN_OSS_REGION}.aliyuncs.com`
  return endpoint.startsWith(`${bucket}.`) ? endpoint : `${bucket}.${endpoint}`
}

function classifyOssError(err: unknown, fallbackCode: StorageErrorCode = 'OSS_SIGNATURE_FAILED'): StorageConfigurationError {
  if (err instanceof StorageConfigurationError) return err
  const raw = err as { code?: unknown; status?: unknown; statusCode?: unknown; name?: unknown; message?: unknown }
  const text = String(raw?.message || raw?.code || raw?.name || '')
  const status = typeof raw?.status === 'number'
    ? raw.status
    : typeof raw?.statusCode === 'number'
      ? raw.statusCode
      : 500

  if (status === 403 || /AccessDenied|InvalidAccessKeyId|SignatureDoesNotMatch|Forbidden/i.test(text)) {
    return new StorageConfigurationError('OSS_ACCESS_DENIED', 'OSS AccessKey 无效或无权访问 Bucket', 403)
  }
  if (status === 404 || /NoSuchBucket|BucketNotFound/i.test(text)) {
    return new StorageConfigurationError('OSS_BUCKET_NOT_FOUND', 'OSS Bucket 不存在或 Endpoint/Region 配置错误', 404)
  }
  return new StorageConfigurationError(fallbackCode, 'OSS 签名或上传失败，请检查 OSS 配置后重试', status)
}

// ---- local driver ----

const UPLOAD_ROOT = process.env.UPLOAD_DIR || join(process.cwd(), 'public', 'uploads')

class LocalStorageDriver implements StorageDriver {
  async put(key: string, file: File): Promise<UploadResult> {
    return this.putBuffer(key, Buffer.from(await file.arrayBuffer()), file.type)
  }

  async putBuffer(key: string, buffer: Buffer, _mimeType: string): Promise<UploadResult> {
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
    assertAliyunOssReady()
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const OSS = require('ali-oss')
      this._client = new OSS({
        region: process.env.ALIYUN_OSS_REGION,
        bucket: process.env.ALIYUN_OSS_BUCKET,
        endpoint: process.env.ALIYUN_OSS_ENDPOINT,
        accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
        accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET,
      })
      return this._client
    } catch (err) {
      console.error('[storage] ali-oss client init failed', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      })
      throw classifyOssError(err)
    }
  }

  async put(key: string, file: File): Promise<UploadResult> {
    return this.putBuffer(key, Buffer.from(await file.arrayBuffer()), file.type)
  }

  async putBuffer(key: string, buffer: Buffer, _mimeType: string): Promise<UploadResult> {
    const client = await this.getClient() as { put(key: string, buf: Buffer): Promise<{ url: string; name: string }> }
    try {
      const result = await client.put(key, buffer)
      const baseUrl = process.env.ALIYUN_OSS_PUBLIC_BASE_URL || `https://${ossPostHost(process.env.ALIYUN_OSS_BUCKET || '')}`
      return {
        url: `${baseUrl.replace(/\/+$/, '')}/${result.name}`,
        storageKey: result.name,
        storageDriver: 'aliyun-oss',
      }
    } catch (err) {
      throw classifyOssError(err)
    }
  }

  async delete(key: string): Promise<void> {
    const client = await this.getClient() as { delete(key: string): Promise<void> }
    try { await client.delete(key) } catch { /* 忽略 */ }
  }

  getUrl(key: string): string {
    const baseUrl = process.env.ALIYUN_OSS_PUBLIC_BASE_URL || `https://${ossPostHost(process.env.ALIYUN_OSS_BUCKET || '')}`
    return `${baseUrl.replace(/\/+$/, '')}/${key}`
  }

  /** 生成浏览器直传 PostObject 签名 */
  async generatePostSignature(key: string, options?: { maxSize?: number; expireSeconds?: number; contentType?: string }): Promise<PostSignature> {
    const bucket = process.env.ALIYUN_OSS_BUCKET || ''
    const accessKeyId = process.env.ALIYUN_OSS_ACCESS_KEY_ID || ''
    const accessKeySecret = process.env.ALIYUN_OSS_ACCESS_KEY_SECRET || ''
    const host = ossPostHost(bucket)
    const expireSeconds = options?.expireSeconds ?? 300
    const maxSize = options?.maxSize ?? 200 * 1024 * 1024
    const now = new Date()
    const expireDate = new Date(now.getTime() + expireSeconds * 1000)

    const policy = {
      expiration: expireDate.toISOString(),
      conditions: [
        { bucket },
        ['content-length-range', 0, maxSize],
        { key },
      ],
    }
    if (options?.contentType) {
      (policy.conditions as Array<unknown>).push(['starts-with', '$Content-Type', options.contentType])
    }

    const policyBase64 = Buffer.from(JSON.stringify(policy)).toString('base64')
    let signature: string
    try {
      signature = crypto.createHmac('sha1', accessKeySecret).update(policyBase64).digest('base64')
    } catch (err) {
      throw classifyOssError(err, 'OSS_SIGNATURE_FAILED')
    }

    return { host, accessKeyId, policy: policyBase64, signature, key, expire: expireSeconds }
  }

  /** 生成私有 bucket 的限时签名下载 URL */
  async generateSignedUrl(key: string, options?: { expireSeconds?: number }): Promise<string> {
    let client: { signatureUrl(name: string, opts?: Record<string, unknown>): string }
    try {
      client = await this.getClient() as { signatureUrl(name: string, opts?: Record<string, unknown>): string }
    } catch (err) {
      console.error('[storage] OSS signed URL client init failed', {
        key,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      })
      throw err
    }
    const expireSeconds = options?.expireSeconds ?? 300
    try {
      return client.signatureUrl(key, { expires: expireSeconds })
    } catch (err) {
      console.error('[storage] OSS signed URL generation failed', {
        key,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      })
      throw classifyOssError(err, 'OSS_SIGNATURE_FAILED')
    }
  }
}

// ---- factory ----

const drivers: Record<string, StorageDriver> = {
  local: new LocalStorageDriver(),
  'aliyun-oss': new AliyunOssDriver(),
}

function getDriver(): StorageDriver {
  const configured = process.env.STORAGE_DRIVER || 'local'
  if (configured === 'aliyun-oss') {
    assertAliyunOssReady()
  }
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

/** 上传 Buffer 并返回统一结果（推荐，避免重复 read arrayBuffer） */
export async function uploadBuffer(buffer: Buffer, meta: { originalName: string; mimeType: string; prefix?: string; bucket?: string }): Promise<UploadResult> {
  const driver = getDriver()
  const key = safeFilename(meta.originalName, meta.prefix)
  return driver.putBuffer(key, buffer, meta.mimeType)
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

/** OSS 是否启用 */
export function isOssEnabled(): boolean {
  return (process.env.STORAGE_DRIVER || 'local') === 'aliyun-oss'
}

/** 生成 OSS 浏览器直传签名 */
export async function generateOssPostSignature(key: string, options?: { maxSize?: number; expireSeconds?: number; contentType?: string }): Promise<PostSignature> {
  const driver = getDriver()
  if (!(driver instanceof AliyunOssDriver)) {
    throw new Error('OSS 未启用')
  }
  return driver.generatePostSignature(key, options)
}

/** 生成 OSS 限时签名下载 URL（私有 bucket） */
export async function generateOssSignedUrl(key: string, options?: { expireSeconds?: number }): Promise<string> {
  const driver = getDriver()
  if (!(driver instanceof AliyunOssDriver)) {
    throw new Error('OSS 未启用')
  }
  return driver.generateSignedUrl(key, options)
}
