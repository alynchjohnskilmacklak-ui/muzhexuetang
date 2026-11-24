export type UploadType = 'teacher-feedback' | 'parent-upload' | 'admin-material' | 'admin-practice-reply' | 'avatar' | 'meal-image' | 'parent-message' | 'generic'

const ROLE_UPLOAD_TYPES: Record<string, ReadonlySet<UploadType>> = {
  admin: new Set(['teacher-feedback', 'parent-upload', 'admin-material', 'admin-practice-reply', 'avatar', 'meal-image', 'parent-message', 'generic']),
  teacher: new Set(['teacher-feedback', 'avatar', 'meal-image', 'parent-message', 'generic']),
  parent: new Set(['parent-upload', 'avatar', 'parent-message', 'generic']),
}

export function normalizeUploadType(value: unknown): UploadType | null {
  if (value == null || value === '') return 'generic'
  if (value === 'generic' || value === 'teacher-feedback' || value === 'parent-upload' || value === 'admin-material' || value === 'admin-practice-reply' || value === 'avatar' || value === 'meal-image' || value === 'parent-message') {
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
  if (uploadType === 'admin-practice-reply') return 'admin_practice_reply'
  if (uploadType === 'avatar') return 'avatar'
  if (uploadType === 'meal-image') return 'meal_image'
  if (uploadType === 'parent-message') return 'parent_message'
  if (role === 'teacher') return 'teacher_upload'
  if (role === 'parent') return 'parent_upload'
  return 'admin_material'
}

export function uploadRequiresImage(uploadType: UploadType): boolean {
  return uploadType === 'teacher-feedback' || uploadType === 'admin-practice-reply' || uploadType === 'avatar' || uploadType === 'meal-image' || uploadType === 'parent-message'
}

export function uploadAllowsDocument(uploadType: UploadType): boolean {
  return uploadType === 'admin-material' || uploadType === 'parent-upload' || uploadType === 'generic'
}

