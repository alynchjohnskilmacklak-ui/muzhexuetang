export type UploadType = 'teacher-feedback' | 'parent-upload' | 'admin-material' | 'avatar' | 'generic'

const ROLE_UPLOAD_TYPES: Record<string, ReadonlySet<UploadType>> = {
  admin: new Set(['teacher-feedback', 'parent-upload', 'admin-material', 'avatar', 'generic']),
  teacher: new Set(['teacher-feedback', 'avatar', 'generic']),
  parent: new Set(['parent-upload', 'avatar', 'generic']),
}

export function normalizeUploadType(value: unknown): UploadType | null {
  if (value == null || value === '') return 'generic'
  if (value === 'teacher-feedback' || value === 'parent-upload' || value === 'admin-material' || value === 'avatar') {
    return value
  }
  return null
}

export function canUseUploadType(role: string, uploadType: UploadType): boolean {
  return ROLE_UPLOAD_TYPES[String(role || '').toLowerCase()]?.has(uploadType) === true
}

export function ownerTypeForUpload(uploadType: UploadType, role: string): string {
  if (uploadType === 'teacher-feedback') return 'feedback'
  if (uploadType === 'parent-upload') return 'parent_upload'
  if (uploadType === 'admin-material') return 'admin_material'
  if (uploadType === 'avatar') return 'avatar'
  if (role === 'teacher') return 'teacher_upload'
  if (role === 'parent') return 'parent_upload'
  return 'admin_material'
}

export function uploadRequiresImage(uploadType: UploadType): boolean {
  return uploadType === 'teacher-feedback' || uploadType === 'avatar'
}

export function uploadAllowsDocument(uploadType: UploadType): boolean {
  return uploadType === 'admin-material' || uploadType === 'parent-upload' || uploadType === 'generic'
}

