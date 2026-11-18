import { describe, expect, it } from 'vitest'
import { buildWeatherTips, parseAmapForecast, type WeatherDay } from './forecast'

const baseDate = new Date('2026-10-02T18:00:00.000Z') // 北京时间 10 月 3 日

function cast(date: string, dayweather: string, nightweather: string, daytemp: string, nighttemp = '18') {
  return { date, dayweather, nightweather, daytemp, nighttemp }
}

function response(casts: unknown[], adcode = '130184') {
  return { status: '1', infocode: '10000', forecasts: [{ adcode, city: '新乐市', casts }] }
}

describe('新乐市高德天气预报', () => {
  it('只取北京时间当天起连续三天，同时考虑夜间天气', () => {
    const forecast = parseAmapForecast(response([
      cast('2026-10-02', '晴', '晴', '28'),
      cast('2026-10-03', '多云', '多云', '25'),
      cast('2026-10-04', '多云', '小雨', '22'),
      cast('2026-10-05', '阴', '阴', '23'),
    ]), baseDate)
    expect(forecast?.days.map(day => day.date)).toEqual(['2026-10-03', '2026-10-04', '2026-10-05'])
    expect(forecast?.days.map(day => day.icon)).toEqual(['cloud', 'rain', 'cloud'])
    expect(forecast?.days[1].condition).toBe('多云转小雨')
    expect(forecast?.tips.parent).toContain('明天有雨')
  })

  it('错误状态、错误城市、缺少当日或温度异常时不展示伪造预报', () => {
    const validDays = [cast('2026-10-03', '晴', '晴', '26'), cast('2026-10-04', '晴', '晴', '26'), cast('2026-10-05', '晴', '晴', '26')]
    expect(parseAmapForecast({ ...response(validDays), status: '0' }, baseDate)).toBeNull()
    expect(parseAmapForecast(response(validDays, '130100'), baseDate)).toBeNull()
    expect(parseAmapForecast(response(validDays.slice(1).concat(cast('2026-10-06', '晴', '晴', '26'))), baseDate)).toBeNull()
    expect(parseAmapForecast(response([{ ...validDays[0], daytemp: '' }, ...validDays.slice(1)]), baseDate)).toBeNull()
  })

  it('雨天优先提醒带伞，同时提醒高温防晒', () => {
    const days: [WeatherDay, WeatherDay, WeatherDay] = [
      { date: '2026-10-03', condition: '晴', icon: 'sun', minTemp: 25, maxTemp: 34 },
      { date: '2026-10-04', condition: '小雨', icon: 'rain', minTemp: 18, maxTemp: 25 },
      { date: '2026-10-05', condition: '阴', icon: 'cloud', minTemp: 17, maxTemp: 23 },
    ]
    expect(buildWeatherTips(days).parent).toContain('明天有雨，接送孩子记得带伞')
    expect(buildWeatherTips(days).parent).toContain('今天较热，注意防晒补水')
    expect(buildWeatherTips(days).teacher).toContain('注意路滑')
  })

  it('阴天与普通天气有独立、简短的文案', () => {
    const days: [WeatherDay, WeatherDay, WeatherDay] = [
      { date: '2026-10-03', condition: '晴', icon: 'sun', minTemp: 17, maxTemp: 26 },
      { date: '2026-10-04', condition: '阴', icon: 'cloud', minTemp: 16, maxTemp: 24 },
      { date: '2026-10-05', condition: '多云', icon: 'cloud', minTemp: 15, maxTemp: 25 },
    ]
    expect(buildWeatherTips(days).parent).toContain('明天偏阴')
    days[1] = { ...days[1], condition: '多云' }
    expect(buildWeatherTips(days).parent).toContain('天气平稳')
  })
})
