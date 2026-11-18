import { afterEach, describe, expect, it, vi } from 'vitest'
import { cacheAvatarObjectUrl, clearCachedAvatarImages, peekCachedAvatarObjectUrl } from '@/lib/avatar-image-cache'

describe('avatar image session cache', () => {
  afterEach(() => {
    clearCachedAvatarImages()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('deduplicates simultaneous requests and reuses the cached object URL', async () => {
    vi.stubGlobal('window', { location: { href: 'https://muzhexuetang.test/parent' } })
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:cached-avatar')
    const fetchImage = vi.fn(async () => new Response(new Blob(['portrait'], { type: 'image/png' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchImage)

    const [first, second] = await Promise.all([
      cacheAvatarObjectUrl('/api/uploads/teacher.png'),
      cacheAvatarObjectUrl('/api/uploads/teacher.png'),
    ])

    expect(first).toBe('blob:cached-avatar')
    expect(second).toBe(first)
    expect(fetchImage).toHaveBeenCalledTimes(1)
    expect(createObjectUrl).toHaveBeenCalledTimes(1)
    expect(peekCachedAvatarObjectUrl('/api/uploads/teacher.png')).toBe(first)
  })

  it('creates a compact cached copy from the rendered image without downloading it again', async () => {
    vi.stubGlobal('window', { location: { href: 'https://muzhexuetang.test/parent' } })
    const fetchImage = vi.fn()
    vi.stubGlobal('fetch', fetchImage)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:rendered-avatar')
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage: vi.fn() })),
      toBlob: (callback: BlobCallback) => callback(new Blob(['compact portrait'], { type: 'image/webp' })),
    }
    vi.stubGlobal('document', { createElement: vi.fn(() => canvas) })
    const loadedImage = { naturalWidth: 1600, naturalHeight: 1200 } as HTMLImageElement

    await cacheAvatarObjectUrl('/people/teacher.png', loadedImage)

    expect(fetchImage).not.toHaveBeenCalled()
    expect(canvas.width).toBe(512)
    expect(canvas.height).toBe(384)
  })

  it('revokes and forgets cached portraits when the authenticated session is cleared', async () => {
    vi.stubGlobal('window', { location: { href: 'https://muzhexuetang.test/parent' } })
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:cached-avatar')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob(['portrait'], { type: 'image/png' }), { status: 200 })))

    await cacheAvatarObjectUrl('/people/teacher.png')
    clearCachedAvatarImages()

    expect(peekCachedAvatarObjectUrl('/people/teacher.png')).toBeUndefined()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:cached-avatar')
  })
})
