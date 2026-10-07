import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadMaterialPreview } from './material-preview-client'

describe('material preview client', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('passes authenticated PDF bytes directly to the viewer without a blob URL', async () => {
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob(['pdf-bytes'], { type: 'application/pdf' }), {
      headers: { 'content-type': 'application/pdf' },
    })))

    const result = await loadMaterialPreview('material-1', 'pdf')
    expect(result).toMatchObject({
      url: '',
      type: 'pdf',
      isBlob: false,
    })
    expect(new TextDecoder().decode(result.data)).toBe('pdf-bytes')
    expect(createObjectUrl).not.toHaveBeenCalled()
  })
})
