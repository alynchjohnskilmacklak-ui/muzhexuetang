export type PeriodType = 'CLASS' | 'BREAK' | 'BIG_BREAK' | 'LUNCH'

export type SchedulePeriod = {
  id: string
  name: string
  type: PeriodType
  start: string
  end: string
}

export const SCHEDULE_PERIODS: SchedulePeriod[] = [
  { id:'am1',  name:'上午第一', type:'CLASS' as const,     start:'08:00', end:'08:40' },
  { id:'bk1',  name:'课间',     type:'BREAK' as const,     start:'08:40', end:'08:50' },
  { id:'am2',  name:'上午第二', type:'CLASS' as const,     start:'08:50', end:'09:30' },
  { id:'gbk1', name:'大课间',   type:'BIG_BREAK' as const, start:'09:30', end:'09:50' },
  { id:'am3',  name:'上午第三', type:'CLASS' as const,     start:'09:50', end:'10:30' },
  { id:'bk2',  name:'课间',     type:'BREAK' as const,     start:'10:30', end:'10:40' },
  { id:'am4',  name:'上午第四', type:'CLASS' as const,     start:'10:40', end:'11:20' },
  { id:'lunch',name:'午休',     type:'LUNCH' as const,     start:'11:20', end:'14:00' },
  { id:'pm1',  name:'下午第一', type:'CLASS' as const,     start:'14:00', end:'14:40' },
  { id:'bk3',  name:'课间',     type:'BREAK' as const,     start:'14:40', end:'14:50' },
  { id:'pm2',  name:'下午第二', type:'CLASS' as const,     start:'14:50', end:'15:30' },
  { id:'gbk2', name:'大课间',   type:'BIG_BREAK' as const, start:'15:30', end:'15:50' },
  { id:'pm3',  name:'下午第三', type:'CLASS' as const,     start:'15:50', end:'16:30' },
  { id:'bk4',  name:'课间',     type:'BREAK' as const,     start:'16:30', end:'16:40' },
  { id:'pm4',  name:'下午第四', type:'CLASS' as const,     start:'16:40', end:'17:20' },
]

export const PERIOD_HEIGHTS: Record<PeriodType, number> = {
  CLASS:     80,
  BREAK:     18,
  BIG_BREAK: 24,
  LUNCH:     28,
}

export const PERIOD_BG: Record<PeriodType, string> = {
  CLASS:     'transparent',
  BREAK:     'rgba(0,0,0,.025)',
  BIG_BREAK: 'rgba(83,74,183,.05)',
  LUNCH:     'rgba(29,158,117,.04)',
}

export const CLASS_PERIODS_ONLY = SCHEDULE_PERIODS.filter(p => p.type === 'CLASS')

const VALID_TYPES = new Set<PeriodType>(['CLASS', 'BREAK', 'BIG_BREAK', 'LUNCH'])
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/

export function normalizeSchedulePeriods(value: unknown): SchedulePeriod[] {
  if (!Array.isArray(value)) return SCHEDULE_PERIODS.map(period => ({ ...period }))
  const periods = value.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    const type = row.type as PeriodType
    const start = typeof row.start === 'string' ? row.start : ''
    const end = typeof row.end === 'string' ? row.end : ''
    if (!VALID_TYPES.has(type) || !TIME_RE.test(start) || !TIME_RE.test(end) || start >= end) return []
    return [{
      id: typeof row.id === 'string' && row.id.trim() ? row.id.trim() : `period-${index + 1}`,
      name: typeof row.name === 'string' && row.name.trim() ? row.name.trim() : '未命名时段',
      type,
      start,
      end,
    }]
  })
  return periods.length ? periods.sort((a, b) => a.start.localeCompare(b.start)) : SCHEDULE_PERIODS.map(period => ({ ...period }))
}

export function findSchedulePeriod(periods: SchedulePeriod[], startTime: string): SchedulePeriod | undefined {
  const exact = periods.find(period => period.type === 'CLASS' && period.start === startTime)
  if (exact) return exact
  return periods.find(period => period.type === 'CLASS' && period.start <= startTime && startTime < period.end)
}

// One-on-one / small-group hourly periods (60min blocks, 08:00-24:00)
export const HOURLY_PERIODS = [
  { id:'h08', name:'08:00', start:'08:00', end:'09:00' },
  { id:'h09', name:'09:00', start:'09:00', end:'10:00' },
  { id:'h10', name:'10:00', start:'10:00', end:'11:00' },
  { id:'h11', name:'11:00', start:'11:00', end:'12:00' },
  { id:'h12', name:'12:00', start:'12:00', end:'13:00' },
  { id:'h13', name:'13:00', start:'13:00', end:'14:00' },
  { id:'h14', name:'14:00', start:'14:00', end:'15:00' },
  { id:'h15', name:'15:00', start:'15:00', end:'16:00' },
  { id:'h16', name:'16:00', start:'16:00', end:'17:00' },
  { id:'h17', name:'17:00', start:'17:00', end:'18:00' },
  { id:'h18', name:'18:00', start:'18:00', end:'19:00' },
  { id:'h19', name:'19:00', start:'19:00', end:'20:00' },
  { id:'h20', name:'20:00', start:'20:00', end:'21:00' },
  { id:'h21', name:'21:00', start:'21:00', end:'22:00' },
  { id:'h22', name:'22:00', start:'22:00', end:'23:00' },
  { id:'h23', name:'23:00', start:'23:00', end:'24:00' },
]

export function getPeriodId(startTime: string): string | null {
  const period = SCHEDULE_PERIODS.find(p => p.type === 'CLASS' && p.start === startTime)
  return period?.id || null
}
