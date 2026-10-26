import { format } from 'date-fns'

export const fmtDate = (d: Date | string) => format(new Date(d), 'M月d日')
export const fmtDateTime = (d: Date | string) => format(new Date(d), 'M月d日 HH:mm')
export const fmtFull = (d: Date | string) => format(new Date(d), 'yyyy-MM-dd')

type DateInput = Date | string | null | undefined

export function formatLocaleDate(value: DateInput, fallback = '-') {
  return value ? new Date(value).toLocaleDateString('zh-CN') : fallback
}

export function formatLocaleDateTime(value: DateInput, fallback = '-') {
  return value ? new Date(value).toLocaleString('zh-CN') : fallback
}
