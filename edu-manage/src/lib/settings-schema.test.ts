import { describe, expect, it } from 'vitest'
import { parseSettingsUpdate } from './settings-schema'
import { parseSubjectSettings } from './subject-settings'

describe('settings payload validation', () => {
  it('preserves text and numeric values', () => {
    expect(parseSettingsUpdate({ orgName: '牧哲学堂', founded: 2020 })).toEqual({ orgName: '牧哲学堂', founded: 2020 })
  })
  it('normalizes legacy uploaded logo addresses', () => {
    expect(parseSettingsUpdate({ logoUrl: '/uploads/logo.png' })).toEqual({ logoUrl: '/api/uploads/logo.png' })
  })
  it.each([[], null, {}, { unknown: 'x' }, { founded: '2020' }, { founded: 1800 }, { orgName: ' ' }, { logoUrl: { file: 'x' } }, { logoUrl: 'javascript:alert(1)' }])('rejects malformed or unsupported settings %j', input => {
    expect(() => parseSettingsUpdate(input)).toThrow()
  })
  it('does not overwrite notification or role policies', () => {
    expect(() => parseSettingsUpdate({ teacherCanViewOthers: true })).toThrow()
  })
  it('requires actual subject strings, not color-picker objects', () => {
    expect(parseSubjectSettings({ name: ' 数学 ', color: '#E8784A' }, true)).toEqual({ name: '数学', color: '#E8784A' })
    expect(() => parseSubjectSettings({ name: '数学', color: {} }, true)).toThrow()
    expect(() => parseSubjectSettings({ isActive: false })).toThrow()
    expect(() => parseSubjectSettings({ color: '#fff' })).toThrow()
    expect(() => parseSubjectSettings({ color: '#ffffff' }, true)).toThrow()
  })
})
