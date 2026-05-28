export type MealPortion = 'single' | 'double'

export type MealDetail = {
  studentId: string
  studentName: string
  portion: MealPortion
}

export function startOfLocalDay(value: Date | string) {
  const date = value instanceof Date ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(0, 0, 0, 0)
  return date
}

export function startOfMealWeek(value: Date | string) {
  const date = startOfLocalDay(value)
  if (!date) return null
  const offset = date.getDay() === 0 ? 6 : date.getDay() - 1
  date.setDate(date.getDate() - offset)
  return date
}

export function parseMealDetails(value: unknown): MealDetail[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const detail = item as Record<string, unknown>
    const studentId = typeof detail.studentId === 'string' ? detail.studentId : ''
    const studentName = typeof detail.studentName === 'string' ? detail.studentName : ''
    const portion = detail.portion === 'double' ? 'double' : detail.portion === 'single' ? 'single' : null
    return studentId && studentName && portion ? [{ studentId, studentName, portion }] : []
  })
}

export function mealCounts(details: MealDetail[], mainDish = '') {
  const riceSingle = details.filter((detail) => detail.portion === 'single').length
  const riceDouble = details.filter((detail) => detail.portion === 'double').length
  const noodleCount = /面|noodle/i.test(mainDish) ? details.length : 0
  return {
    totalCount: details.length,
    riceSingle,
    riceDouble,
    noodleCount,
  }
}

export type EffectiveMealMenu = {
  id: string | null
  dayOfWeek: number
  mainDish: string
  sideDish: string | null
  allowDouble: boolean
  notes: string | null
  source: 'date' | 'template'
}

export function templateToMenuLike(template: {
  id: string
  weekday: number
  title: string | null
  breakfast: string | null
  lunch: string | null
  dinner: string | null
  snack: string | null
  note: string | null
}): EffectiveMealMenu {
  const sideParts = [
    template.breakfast ? `早餐：${template.breakfast}` : '',
    template.dinner ? `晚餐：${template.dinner}` : '',
    template.snack ? `加餐：${template.snack}` : '',
  ].filter(Boolean)

  return {
    id: null,
    dayOfWeek: template.weekday,
    mainDish: template.lunch || template.title || '周期菜单',
    sideDish: sideParts.join('；') || null,
    allowDouble: false,
    notes: template.note,
    source: 'template',
  }
}
