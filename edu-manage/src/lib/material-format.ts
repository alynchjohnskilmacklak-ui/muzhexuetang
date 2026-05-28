import type { MaterialAudience, MaterialSource, MaterialStatus } from '@prisma/client'

export function materialAudienceLabel(audience: MaterialAudience | string) {
  if (audience === 'TEACHER') return '教师版'
  if (audience === 'BOTH') return '通用'
  return '学生版'
}

export function materialAudienceText(audience: MaterialAudience | string) {
  if (audience === 'TEACHER') return '教师可见'
  if (audience === 'BOTH') return '全部可见'
  return '家长可见'
}

export function materialSourceLabel(source: MaterialSource | string) {
  return source === 'TEACHER' ? '教师上传' : '管理端'
}

export function materialStatusLabel(status: MaterialStatus | string) {
  if (status === 'DRAFT') return '草稿'
  if (status === 'DELETED') return '已删除'
  return '已发布'
}

export function materialFileLabel(fileType: string) {
  const map: Record<string, string> = {
    pdf: 'PDF',
    word: 'Word',
    excel: 'Excel',
    ppt: 'PPT',
    image: '图片',
    archive: '压缩包',
  }
  return map[fileType] || '其他'
}

export function materialFileColor(fileType: string) {
  const map: Record<string, string> = {
    pdf: 'red',
    word: 'blue',
    excel: 'green',
    ppt: 'orange',
    image: 'purple',
    archive: 'gold',
  }
  return map[fileType] || 'default'
}
