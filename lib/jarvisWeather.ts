// Copenhagen weather via Open-Meteo (open, no API key needed). Server-side
// only so the client never makes an arbitrary external request - the HUD
// page fetches this through the existing admin-gated /api/jarvis/weather
// route instead, same "all data via existing routes" rule as everything
// else on the page.
const COPENHAGEN_LAT = 55.6761
const COPENHAGEN_LON = 12.5683

export interface JarvisWeather {
  temperature: number
  feelsLike: number
  windSpeed: number
  humidity: number
  sunrise: string
  sunset: string
  tomorrow: { max: number; min: number }
  demo: boolean
}

const FALLBACK_WEATHER: JarvisWeather = {
  temperature: 14,
  feelsLike: 12,
  windSpeed: 18,
  humidity: 72,
  sunrise: '07:12',
  sunset: '19:48',
  tomorrow: { max: 16, min: 9 },
  demo: true
}

function toHm(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export async function fetchCopenhagenWeather(): Promise<JarvisWeather> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${COPENHAGEN_LAT}&longitude=${COPENHAGEN_LON}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min&timezone=Europe%2FCopenhagen&forecast_days=2`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) })
    if (!res.ok) throw new Error(`Open-Meteo status ${res.status}`)
    const data = await res.json()
    return {
      temperature: Math.round(data.current.temperature_2m),
      feelsLike: Math.round(data.current.apparent_temperature),
      windSpeed: Math.round(data.current.wind_speed_10m),
      humidity: Math.round(data.current.relative_humidity_2m),
      sunrise: toHm(data.daily.sunrise[0]),
      sunset: toHm(data.daily.sunset[0]),
      tomorrow: {
        max: Math.round(data.daily.temperature_2m_max[1]),
        min: Math.round(data.daily.temperature_2m_min[1])
      },
      demo: false
    }
  } catch (e) {
    console.error('fetchCopenhagenWeather: falling back -', e instanceof Error ? e.message : e)
    return FALLBACK_WEATHER
  }
}
