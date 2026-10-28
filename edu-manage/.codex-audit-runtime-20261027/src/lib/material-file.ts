export const ALLOWED_MATERIAL_EXTENSIONS = new Set([
  '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.rar', '.7z',
])

export type MaterialFileType = 'pdf' | 'word' | 'excel' | 'ppt' | 'archive' | 'image' | 'other'

export function isAllowedMaterialExtension(extension: string) {
  return ALLOWED_MATERIAL_EXTENSIONS.has(extension.toLowerCase())
}

function startsWithBytes(buffer: Buffer, bytes: number[]) {
  return buffer.length >= bytes.length && bytes.every((byte, index) => buffer[index] === byte)
}

/**
 * Validate the actual file signature instead of trusting a browser supplied
 * MIME type or filename. This intentionally checks only the container/header;
 * document parsing and malware scanning remain separate concerns.
 */
export function hasValidMaterialFileSignature(buffer: Buffer, extension: string) {
  const ext = extension.toLowerCase()
  if (buffer.length === 0 || !isAllowedMaterialExtension(ext)) return false

  if (ext === '.pdf') return startsWithBytes(buffer, [0x25, 0x50, 0x44, 0x46])
  if (ext === '.jpg' || ext === '.jpeg') return startsWithBytes(buffer, [0xff, 0xd8, 0xff])
  if (ext === '.png') return startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (ext === '.gif') return buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a'
  if (ext === '.webp') return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  if (ext === '.rar') return startsWithBytes(buffer, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07])
  if (ext === '.7z') return startsWithBytes(buffer, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])

  const isZip = startsWithBytes(buffer, [0x50, 0x4b, 0x03, 0x04])
    || startsWithBytes(buffer, [0x50, 0x4b, 0x05, 0x06])
    || startsWithBytes(buffer, [0x50, 0x4b, 0x07, 0x08])
  if (ext === '.zip' || ['.docx', '.xlsx', '.pptx'].includes(ext)) return isZip

  const isOle = startsWithBytes(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
  if (['.doc', '.xls', '.ppt'].includes(ext)) return isOle
  return false
}

export function detectMaterialFileType(extension: string): MaterialFileType {
  const ext = extension.toLowerCase()
  if (ext === '.pdf') return 'pdf'
  if (['.doc', '.docx'].includes(ext)) return 'word'
  if (['.xls', '.xlsx'].includes(ext)) return 'excel'
  if (['.ppt', '.pptx'].includes(ext)) return 'ppt'
  if (['.zip', '.rar', '.7z'].includes(ext)) return 'archive'
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return 'image'
  return 'other'
}

export function materialContentType(fileType: string, extension: string) {
  const ext = extension.toLowerCase()
  if (fileType === 'pdf') return 'application/pdf'
  if (fileType === 'word') return ext === '.doc'
    ? 'application/msword'
    : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (fileType === 'excel') return ext === '.xls'
    ? 'application/vnd.ms-excel'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (fileType === 'ppt') return ext === '.ppt'
    ? 'application/vnd.ms-powerpoint'
    : 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  if (fileType === 'archive') return 'application/octet-stream'
  if (ext === '.png') return 'image/png'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  return 'application/octet-stream'
}

export function canRoleAccessMaterialAudience(role: string | undefined, audience: string) {
  if (role === 'admin') return true
  if (audience === 'BOTH') return true
  if (role === 'teacher') return audience === 'TEACHER' || audience === 'STUDENT'
  return role === 'parent' && audience === 'STUDENT'
}
