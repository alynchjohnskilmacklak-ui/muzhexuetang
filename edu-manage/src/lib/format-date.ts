import { format } from 'date-fns'

/** 统一日期/时间格式化工具，全项目优先使用这三个函数。 */

/** M月d日，如 6月20日 */
export const fmtDate = (d: Date | string | number) => format(new Date(d), 'M月d日')

/** M月d日 HH:mm，如 6月20日 14:30 */
export const fmtDateTime = (d: Date | string | number) => format(new Date(d), 'M月d日 HH:mm')

/** yyyy-MM-dd，如 2026-06-20 */
export const fmtFull = (d: Date | string | number) => format(new Date(d), 'yyyy-MM-dd')
