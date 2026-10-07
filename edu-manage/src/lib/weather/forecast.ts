export type WeatherIcon = 'sun' | 'cloud' | 'rain' | 'snow'
export type WeatherAudience = 'parent' | 'teacher' | 'admin'

export interface WeatherDay {
  date: string
  condition: string
  icon: WeatherIcon
  minTemp: number
  maxTemp: number
}

export interface WeatherForecast {
  available: true
  city: '新乐市'
  days: [WeatherDay, WeatherDay, WeatherDay]
  tips: Record<WeatherAudience, string>
}

type RecordValue = Record<string, unknown>

function asRecord(value: unknown): RecordValue | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : null
}

export function shanghaiDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const part = (type: string) => parts.find(item => item.type === type)?.value || ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function iconForCondition(condition: string): WeatherIcon {
  if (condition.includes('雨')) return 'rain'
  if (condition.includes('雪')) return 'snow'
  if (condition.includes('晴') && !condition.includes('云') && !condition.includes('阴')) return 'sun'
  return 'cloud'
}

function parseTemperature(value: unknown): number | null {
  if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') return null
  const temperature = Number(value)
  return Number.isFinite(temperature) ? temperature : null
}

function parseDay(value: unknown): WeatherDay | null {
  const day = asRecord(value)
  const dayText = typeof day?.dayweather === 'string' ? day.dayweather.trim() : ''
  const nightText = typeof day?.nightweather === 'string' ? day.nightweather.trim() : ''
  const dayTemp = parseTemperature(day?.daytemp)
  const nightTemp = parseTemperature(day?.nighttemp)
  const date = typeof day?.date === 'string' ? day.date : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !dayText || !nightText ||
    dayTemp === null || nightTemp === null || dayTemp < -60 || dayTemp > 65 ||
    nightTemp < -60 || nightTemp > 65) return null
  const conditionText = dayText === nightText ? dayText : `${dayText}转${nightText}`

  return {
    date,
    condition: conditionText.slice(0, 16),
    icon: iconForCondition(conditionText),
    minTemp: Math.round(Math.min(dayTemp, nightTemp)),
    maxTemp: Math.round(Math.max(dayTemp, nightTemp)),
  }
}

function dayLabel(index: number): string {
  return ['今天', '明天', '后天'][index] || '未来'
}

export function buildWeatherTips(days: [WeatherDay, WeatherDay, WeatherDay]): Record<WeatherAudience, string> {
  // 三天视野：今天、明天、后天都参与提醒，让家长对近三天的出行安排心里有数
  const horizon = days
  const label = (index: number) => dayLabel(index)
  const wetIndex = horizon.findIndex(day => day.icon === 'rain' || day.icon === 'snow')
  const hotIndex = horizon.findIndex(day => day.maxTemp >= 32)
  const coldIndex = horizon.findIndex(day => day.minTemp <= 5)
  const cloudyIndex = horizon.findIndex(day => day.condition.includes('阴'))

  const wetText = wetIndex >= 0
    ? `${label(wetIndex)}${horizon[wetIndex].icon === 'snow' ? '有雨雪' : '有雨'}`
    : ''
  const heatText = hotIndex >= 0 ? `${label(hotIndex)}较热` : ''
  const coldText = coldIndex >= 0 ? `${label(coldIndex)}早晚偏凉` : ''
  const cloudyText = cloudyIndex >= 0 && wetIndex < 0 && hotIndex < 0 && coldIndex < 0
    ? `${label(cloudyIndex)}偏阴`
    : ''

  if (wetIndex >= 0) return {
    parent: `${wetText}，接送孩子记得带伞${heatText ? `；${heatText}，注意防晒补水` : ''}${coldText ? `；${coldText}，注意添衣` : ''}。`,
    teacher: `${wetText}，往返教室记得带伞、注意路滑${heatText ? `；${heatText}，注意防晒补水` : ''}${coldText ? `；${coldText}，留意早晚温差` : ''}。`,
    admin: `${wetText}，请留意师生到校通行${heatText ? `；${heatText}，关注防晒补水` : ''}${coldText ? `；${coldText}，提醒师生添衣` : ''}。`,
  }
  if (heatText && hotIndex >= 0) return {
    parent: `${heatText}，接送途中注意防晒补水，孩子课间也记得多喝水。`,
    teacher: `${heatText}，课间注意补水，外出记得防晒。`,
    admin: `${heatText}，请关注教室通风和饮水。`,
  }
  if (coldText && coldIndex >= 0) return {
    parent: `${coldText}，早晚接送记得给孩子多带一件外套。`,
    teacher: `${coldText}，早晚通勤注意保暖。`,
    admin: `${coldText}，请提醒师生注意早晚保暖。`,
  }
  if (cloudyText) return {
    parent: `${cloudyText}，接送时可备伞。`,
    teacher: `${cloudyText}，出门可备伞。`,
    admin: `${cloudyText}，外出事务可留意天气变化。`,
  }
  return {
    parent: '近三天天气平稳，祝孩子学习顺利。',
    teacher: '近三天天气平稳，祝今天教学顺利。',
    admin: '天气平稳，三日预报供出行参考。',
  }
}

export function parseAmapForecast(raw: unknown, now = new Date()): WeatherForecast | null {
  const response = asRecord(raw)
  if (response?.status !== '1' || response.infocode !== '10000' || !Array.isArray(response.forecasts)) return null
  const cityForecast = asRecord(response.forecasts[0])
  if (cityForecast?.adcode !== '130184' || !Array.isArray(cityForecast.casts)) return null
  const today = shanghaiDate(now)
  const days = cityForecast.casts
    .map(parseDay)
    .filter((day): day is WeatherDay => day !== null && day.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter((day, index, list) => index === 0 || day.date !== list[index - 1].date)
    .slice(0, 3)

  const expectedDates = [0, 1, 2].map(offset =>
    shanghaiDate(new Date(new Date(`${today}T04:00:00.000Z`).getTime() + offset * 86_400_000)),
  )
  if (days.length !== 3 || days.some((day, index) => day.date !== expectedDates[index])) return null
  const forecast = days as [WeatherDay, WeatherDay, WeatherDay]
  return { available: true, city: '新乐市', days: forecast, tips: buildWeatherTips(forecast) }
}
