import { generateOssSignedUrl, isOssEnabled, isStorageObjectAvailable } from '@/lib/storage'
import { extractUploadStorageKey, protectedUploadFallback } from '@/lib/upload-url'

/** Page-scoped, already-authorized feedback thumbnails can start loading without a client signing round-trip. */
export async function signedFeedbackImageUrls(keys: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(keys.filter(Boolean))]
  const ossEnabled = isOssEnabled()
  return Object.fromEntries(await Promise.all(unique.map(async (key) => {
    const storageKey = extractUploadStorageKey(key)
    if (!ossEnabled) return [key, protectedUploadFallback(storageKey)] as const
    try {
      // OSS 账号不可用或对象不存在时，回退到本地 /api/uploads 通道，
      // 避免私有桶签名 URL 指向一个读不到的对象（如 UserDisable 场景）。
      if (!(await isStorageObjectAvailable(storageKey))) return [key, protectedUploadFallback(storageKey)] as const
      return [key, await generateOssSignedUrl(storageKey, { expireSeconds: 3600 })] as const
    } catch {
      return [key, protectedUploadFallback(storageKey)] as const
    }
  })))
}
