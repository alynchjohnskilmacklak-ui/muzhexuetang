'use client'

import useSWR from 'swr'
import type { WeatherAudience, WeatherDay, WeatherForecast, WeatherIcon } from '@/lib/weather/forecast'

type WeatherResult = WeatherForecast | { available: false }

async function fetchWeather(url: string): Promise<WeatherResult> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('天气预报暂不可用')
  return response.json() as Promise<WeatherResult>
}

function WeatherGlyph({ kind }: { kind: WeatherIcon }) {
  if (kind === 'sun') return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3.5" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.5 1.5m11.2 11.2 1.5 1.5m0-14.2-1.5 1.5M6.4 17.6l-1.5 1.5" /></svg>
  )
  if (kind === 'rain' || kind === 'snow') return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7.2 15h11a3.7 3.7 0 0 0 .2-7.4 6.6 6.6 0 0 0-12.8 1.7A2.9 2.9 0 0 0 7.2 15Z" />{kind === 'rain' ? <path d="m8 18-1 2m6-2-1 2m6-2-1 2" /> : <path d="M7 19h2m-1-1v2m4-1h2m-1-1v2m4-1h2m-1-1v2" />}</svg>
  )
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M7.2 18h11a3.7 3.7 0 0 0 .2-7.4 6.6 6.6 0 0 0-12.8 1.7A2.9 2.9 0 0 0 7.2 18Z" /></svg>
}

function WeatherDayItem({ day, index }: { day: WeatherDay; index: number }) {
  return <li className="hero-weather__day">
    <span className="hero-weather__day-name">{['今天', '明天', '后天'][index]}</span>
    <span className="hero-weather__day-condition"><WeatherGlyph kind={day.icon} />{day.condition}</span>
    <span className="hero-weather__day-temp">{day.minTemp}～{day.maxTemp}°</span>
  </li>
}

export function WeatherHeroStrip({ audience, variant = 'dark' }: { audience: WeatherAudience; variant?: 'dark' | 'light' }) {
  const { data } = useSWR<WeatherResult>('/api/weather/xinle', fetchWeather, {
    dedupingInterval: 30 * 60_000,
    refreshInterval: 30 * 60_000,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    shouldRetryOnError: false,
  })

  // 附属信息获取失败时不占位，也不阻断 HERO 的主要业务内容。
  if (!data || !data.available) return null

  return <div className={`hero-weather hero-weather--${variant}`} aria-label="新乐市今明后三天天气">
    <div className="hero-weather__copy">
      <div className="hero-weather__heading"><WeatherGlyph kind={data.days[0].icon} /><strong>新乐市 · 今明后天气</strong></div>
      <p>{data.tips[audience]}</p>
      <a href="https://lbs.amap.com/api/webservice/guide/api/weatherinfo" target="_blank" rel="noopener noreferrer">天气数据：高德天气</a>
    </div>
    <ol className="hero-weather__days">{data.days.slice(0, 3).map((day, index) => <WeatherDayItem key={day.date} day={day} index={index} />)}</ol>
  </div>
}
