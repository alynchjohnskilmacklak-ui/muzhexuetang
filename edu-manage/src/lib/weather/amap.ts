import 'server-only'
import { parseAmapForecast, shanghaiDate, type WeatherForecast } from './forecast'

const CACHE_MS = 30 * 60 * 1000
const STALE_MS = 6 * 60 * 60 * 1000

let cached: { forecast: WeatherForecast; at: number } | null = null
let pending: Promise<WeatherForecast | null> | null = null

async function requestForecast(): Promise<WeatherForecast | null> {
  const key = process.env.AMAP_WEATHER_KEY?.trim()
  if (!key) return null

  try {
    const url = new URL('https://restapi.amap.com/v3/weather/weatherInfo')
    url.searchParams.set('city', '130184') // 新乐市 adcode
    url.searchParams.set('extensions', 'all')
    url.searchParams.set('output', 'JSON')
    url.searchParams.set('key', key)
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(4_000) })
    if (!response.ok) throw new Error('HTTP response failed')
    const forecast = parseAmapForecast(await response.json())
    if (!forecast) throw new Error('Forecast data unavailable')
    cached = { forecast, at: Date.now() }
    return forecast
  } catch {
    // 不记录请求 URL：高德 Web 服务 Key 以查询参数传递。
    console.warn('[weather:forecast] 高德预报暂不可用')
    return cached && Date.now() - cached.at < STALE_MS &&
      cached.forecast.days[0].date === shanghaiDate(new Date()) ? cached.forecast : null
  }
}

export async function getXinleForecast(): Promise<WeatherForecast | null> {
  if (cached && Date.now() - cached.at < CACHE_MS && cached.forecast.days[0].date === shanghaiDate(new Date())) {
    return cached.forecast
  }
  if (!pending) pending = requestForecast().finally(() => { pending = null })
  return pending
}
