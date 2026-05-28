export const SUBJECT_COLORS: Record<string, { bg: string; color: string }> = {
  '数学': { bg: '#FAEEDA', color: '#854F0B' },
  '语文': { bg: '#FAECE7', color: '#993C1D' },
  '英语': { bg: '#E6F1FB', color: '#185FA5' },
  '物理': { bg: '#EEEDFE', color: '#3C3489' },
  '化学': { bg: '#E1F5EE', color: '#085041' },
  '生物': { bg: '#EAF3DE', color: '#27500A' },
  '历史': { bg: '#FCEBEB', color: '#A32D2D' },
  '地理': { bg: '#E6F1FB', color: '#0C447C' },
  '政治': { bg: '#F1EFE8', color: '#444441' },
  '编程': { bg: '#EEEDFE', color: '#534AB7' },
  '美术': { bg: '#FBEAF0', color: '#72243E' },
  '音乐': { bg: '#FAEEDA', color: '#633806' },
}

export const ALL_SUBJECTS = Object.keys(SUBJECT_COLORS)
