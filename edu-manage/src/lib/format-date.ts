import { format } from 'date-fns'

export const fmtDate = (d: Date | string) => format(new Date(d), 'M月d日')
export const fmtDateTime = (d: Date | string) => format(new Date(d), 'M月d日 HH:mm')
export const fmtFull = (d: Date | string) => format(new Date(d), 'yyyy-MM-dd')