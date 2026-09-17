'use client'
import { useEffect, useState } from 'react'
import Panel from './Panel'
import Sparkline from './Sparkline'
import { CYAN } from './theme'

const JARVIS_HUD_VERSION = 'v2.0.0'

export function TopLeftPanel({ userName }: { userName: string }) {
  return (
    <Panel title="Jarvis OS" style={{ minWidth: 220 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40,
          clipPath: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)',
          background: `linear-gradient(145deg, ${CYAN.deep}, ${CYAN.bright})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 16, color: '#001018', flexShrink: 0
        }}>
          {userName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>{userName.toUpperCase()}</p>
          <p style={{ fontSize: 9, color: CYAN.mid, opacity: 0.8 }}>BUILD {JARVIS_HUD_VERSION}</p>
        </div>
      </div>
    </Panel>
  )
}

export interface StatusData {
  jarvisOnline: boolean
  portalOnline: boolean
  jarvisResponseTimeMs: number | null
  history: number[]
  demo: boolean
  customerCount: number
  projectCount: number
  trendsCount: number
}

function StatusDot({ online }: { online: boolean }) {
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: online ? '#4ade80' : '#ff5a5a',
      boxShadow: online ? '0 0 6px #4ade80' : '0 0 6px #ff5a5a',
      marginRight: 6
    }} />
  )
}

export function StatusPanel({ status }: { status: StatusData | null }) {
  return (
    <Panel title="System status" style={{ minWidth: 220 }}>
      {!status ? (
        <p style={{ fontSize: 11, opacity: 0.6 }}>Indlæser...</p>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
            <span><StatusDot online={status.jarvisOnline} />Jarvis</span>
            <span>{status.jarvisResponseTimeMs !== null ? `${status.jarvisResponseTimeMs}ms` : '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 10 }}>
            <span><StatusDot online={status.portalOnline} />Portal</span>
            <span>OK</span>
          </div>
          <Sparkline values={status.history} color={CYAN.bright} />
          {status.demo && <p style={{ fontSize: 9, color: '#f59e0b', marginTop: 4 }}>DEMO-DATA</p>}
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 10 }}>
            <div><span style={{ fontSize: 16, fontWeight: 700 }}>{status.customerCount}</span><br /><span style={{ opacity: 0.6 }}>KUNDER</span></div>
            <div><span style={{ fontSize: 16, fontWeight: 700 }}>{status.projectCount}</span><br /><span style={{ opacity: 0.6 }}>PROJEKTER</span></div>
            <div style={{ gridColumn: '1 / -1' }}><span style={{ fontSize: 16, fontWeight: 700 }}>{status.trendsCount}</span><br /><span style={{ opacity: 0.6 }}>TRENDS DENNE UGE</span></div>
          </div>
        </>
      )}
    </Panel>
  )
}

export interface WeatherData {
  temperature: number
  feelsLike: number
  windSpeed: number
  humidity: number
  sunrise: string
  sunset: string
  tomorrow: { max: number; min: number }
  demo: boolean
}

export function ClockWeatherPanel({ weather }: { weather: WeatherData | null }) {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <Panel title="København" style={{ minWidth: 240 }}>
      <p style={{ fontSize: 32, fontWeight: 700, letterSpacing: 2, lineHeight: 1 }}>
        {now ? now.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
      </p>
      <p style={{ fontSize: 11, opacity: 0.7, marginBottom: 10 }}>
        {now ? now.toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
      </p>
      {weather && (
        <div style={{ fontSize: 11, lineHeight: 1.7 }}>
          <p style={{ fontSize: 22, fontWeight: 700 }}>{weather.temperature}°C <span style={{ fontSize: 11, opacity: 0.6 }}>(føles som {weather.feelsLike}°C)</span></p>
          <p>Vind {weather.windSpeed} km/t · Fugtighed {weather.humidity}%</p>
          <p>Sol {weather.sunrise} → {weather.sunset}</p>
          <p>I morgen: {weather.tomorrow.max}° / {weather.tomorrow.min}°</p>
          {weather.demo && <p style={{ fontSize: 9, color: '#f59e0b' }}>RESERVE-DATA (Open-Meteo ikke tilgængelig)</p>}
        </div>
      )}
    </Panel>
  )
}

export interface MeetingItem { id: string; title: string; meetingTime: string; customerName?: string }

export function ActivityPanel({ meetings, unreadMessages }: { meetings: MeetingItem[]; unreadMessages: number }) {
  return (
    <Panel title="I dag" style={{ minWidth: 240 }}>
      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 10, opacity: 0.6, marginBottom: 6 }}>MØDER</p>
        {meetings.length === 0 && <p style={{ fontSize: 11, opacity: 0.5 }}>Ingen møder i dag</p>}
        {meetings.map(m => (
          <div key={m.id} style={{ fontSize: 11, marginBottom: 4, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span>{m.title}</span>
            <span style={{ opacity: 0.7 }}>{m.meetingTime}</span>
          </div>
        ))}
      </div>
      <div>
        <p style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>ULÆSTE BESKEDER</p>
        <p style={{ fontSize: 20, fontWeight: 700 }}>{unreadMessages}</p>
      </div>
    </Panel>
  )
}

export interface LogItem { id: string; action: string; detail: string | null; createdAt: string }

export function LogPanel({ entries }: { entries: LogItem[] }) {
  return (
    <Panel title="Seneste handlinger" style={{ minWidth: 260, maxHeight: 220, overflowY: 'auto' }}>
      {entries.length === 0 && <p style={{ fontSize: 11, opacity: 0.5 }}>Ingen aktivitet endnu</p>}
      {entries.map(e => (
        <div key={e.id} style={{ fontSize: 10, marginBottom: 6, borderLeft: `2px solid ${CYAN.mid}`, paddingLeft: 8 }}>
          <p style={{ opacity: 0.5 }}>{new Date(e.createdAt).toLocaleTimeString('da-DK')}</p>
          <p><span style={{ color: CYAN.bright }}>{e.action}</span>{e.detail ? ` · ${e.detail}` : ''}</p>
        </div>
      ))}
    </Panel>
  )
}
