import { describe, expect, it } from 'vitest'
import {
  canRoleAccessMaterialAudience,
  detectMaterialFileType,
  hasValidMaterialFileSignature,
  isAllowedMaterialExtension,
  materialContentType,
} from '@/lib/material-file'

describe('material file policy', () => {
  it('uses one extension and type policy for every uploader', () => {
    expect(isAllowedMaterialExtension('.DOCX')).toBe(true)
    expect(isAllowedMaterialExtension('.exe')).toBe(false)
    expect(detectMaterialFileType('.xlsx')).toBe('excel')
    expect(detectMaterialFileType('.webp')).toBe('image')
  })

  it('maps download content types consistently', () => {
    expect(materialContentType('word', '.doc')).toBe('application/msword')
    expect(materialContentType('image', '.png')).toBe('image/png')
  })

  it('rejects renamed executables and accepts matching document containers', () => {
    expect(hasValidMaterialFileSignature(Buffer.from('%PDF-1.7'), '.pdf')).toBe(true)
    expect(hasValidMaterialFileSignature(Buffer.from('MZ fake executable'), '.pdf')).toBe(false)
    expect(hasValidMaterialFileSignature(Buffer.from([0x50, 0x4b, 0x03, 0x04]), '.docx')).toBe(true)
    expect(hasValidMaterialFileSignature(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), '.doc')).toBe(true)
  })

  it('keeps role audience access explicit', () => {
    expect(canRoleAccessMaterialAudience('admin', 'TEACHER')).toBe(true)
    expect(canRoleAccessMaterialAudience('teacher', 'STUDENT')).toBe(true)
    expect(canRoleAccessMaterialAudience('parent', 'TEACHER')).toBe(false)
  })
})
