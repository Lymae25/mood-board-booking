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
  unreadMessages: number
  uptimeSeconds: number
  networkHistory: number[]
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

// Translates the log's machine-readable action/detail pair into a plain
// Danish sentence for the admin log view - e.g. "Chat: Fortæl mig om
// dagens trends", "Trend gemt til Chateau Motel", "Kladde afvist".
function translateLogEntry(e: LogItem): string {
  switch (e.action) {
    case 'chat':
      return `Chat: ${e.detail || '(tom besked)'}`
    case 'save_trend_to_customer':
      return e.detail ? `Trend gemt til ${e.detail}` : 'Trend gemt til kunde'
    case 'approve_trend_draft':
      return 'Kladde godkendt'
    case 'reject_trend_draft':
      return 'Kladde afvist'
    default:
      return e.detail ? `${e.action} · ${e.detail}` : e.action
  }
}

export function LogPanel({ entries }: { entries: LogItem[] }) {
  return (
    <Panel title="Seneste handlinger" style={{ minWidth: 260, maxHeight: 220, overflowY: 'auto' }}>
      {entries.length === 0 && <p style={{ fontSize: 11, opacity: 0.5 }}>Ingen aktivitet endnu</p>}
      {entries.map(e => (
        <div key={e.id} style={{ fontSize: 10, marginBottom: 6, borderLeft: `2px solid ${CYAN.mid}`, paddingLeft: 8 }}>
          <p style={{ opacity: 0.5 }}>{new Date(e.createdAt).toLocaleTimeString('da-DK')}</p>
          <p>{translateLogEntry(e)}</p>
        </div>
      ))}
    </Panel>
  )
}

// --- Del A punkt 1 (TÆTHED): small extra panels filling out the bottom of
// the HUD like a classic sci-fi dashboard. All figures come from the same
// admin-gated /api/jarvis/status call as the rest of StatusPanel (real,
// process-local counters - see lib/requestMetrics.ts) except the decorative
// ticker, which is clearly cosmetic and never claims to represent a metric.

export function NetworkPanel({ history }: { history: number[] }) {
  return (
    <Panel title="Netværksaktivitet" style={{ minWidth: 200 }}>
      <Sparkline values={history.length ? history : [0]} color={CYAN.bright} width={160} height={36} />
      <p style={{ fontSize: 9, opacity: 0.6, marginTop: 6 }}>API-KALD / MIN. (SIDSTE {history.length || 20} MIN.)</p>
    </Panel>
  )
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}t ${minutes}m`
  if (hours > 0) return `${hours}t ${minutes}m`
  return `${minutes}m ${seconds % 60}s`
}

export function UptimePanel({ uptimeSeconds }: { uptimeSeconds: number }) {
  return (
    <Panel title="Oppetid" style={{ minWidth: 160 }}>
      <p style={{ fontSize: 22, fontWeight: 700 }}>{formatUptime(uptimeSeconds)}</p>
      <p style={{ fontSize: 9, opacity: 0.6, marginTop: 4 }}>SERVERPROCES</p>
    </Panel>
  )
}

// Trend-scout kører hver mandag kl. 08:00 (fast skema, ikke live-data - se
// ~/jarvis MIGRATION-PLAN.md). Rent klient-side ur-udregning, ligesom
// ClockWeatherPanel allerede gør for selve klokken.
function nextTrendScoutRun(from: Date): Date {
  const target = new Date(from)
  target.setHours(8, 0, 0, 0)
  const day = target.getDay() // 0 = søndag, 1 = mandag
  let daysUntilMonday = (1 - day + 7) % 7
  if (daysUntilMonday === 0 && from.getTime() >= target.getTime()) daysUntilMonday = 7
  target.setDate(target.getDate() + daysUntilMonday)
  return target
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return days > 0 ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

export function NextRunPanel() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <Panel title="Næste trend-scout" style={{ minWidth: 200 }}>
      <p style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {now ? formatCountdown(nextTrendScoutRun(now).getTime() - now.getTime()) : '--:--:--'}
      </p>
      <p style={{ fontSize: 9, opacity: 0.6, marginTop: 4 }}>MANDAG KL. 08:00</p>
    </Panel>
  )
}

export function PlatformBarsPanel({ trends, trendsDemo }: { trends: { videos: { platform: string }[] }[]; trendsDemo: boolean }) {
  const counts: Record<string, number> = {}
  for (const trend of trends) {
    for (const video of trend.videos) {
      counts[video.platform] = (counts[video.platform] || 0) + 1
    }
  }
  const entries = Object.entries(counts)
  const max = Math.max(1, ...entries.map(([, n]) => n))
  const labels: Record<string, string> = { tiktok: 'TIKTOK', instagram: 'INSTAGRAM' }

  return (
    <Panel title="Trends pr. platform" style={{ minWidth: 200 }}>
      {entries.length === 0 && <p style={{ fontSize: 11, opacity: 0.5 }}>Ingen trends indlæst</p>}
      {entries.map(([platform, count]) => (
        <div key={platform} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 3, opacity: 0.8 }}>
            <span>{labels[platform] || platform.toUpperCase()}</span>
            <span>{count}</span>
          </div>
          <div style={{ height: 5, background: 'rgba(79,195,247,0.15)' }}>
            <div style={{ height: '100%', width: `${(count / max) * 100}%`, background: CYAN.bright }} />
          </div>
        </div>
      ))}
      {trendsDemo && <p style={{ fontSize: 9, color: '#f59e0b', marginTop: 4 }}>DEMO-DATA</p>}
    </Panel>
  )
}

// Purely decorative "sci-fi ticker" strip - cosmetic chrome only, never
// claims to represent a real metric (no label implying otherwise), same
// spirit as HexCore's own hex-code ring.
export function DataStripPanel() {
  const [seed] = useState(() => Math.floor(Math.random() * 0xffffff))
  const chars = '0123456789ABCDEF'
  const tokens = Array.from({ length: 14 }, (_, i) => {
    const n = (seed + i * 733) % 0xffff
    return n.toString(16).toUpperCase().padStart(4, '0')
  })
  return (
    <Panel title="Sys.telemetri" style={{ minWidth: 220 }}>
      <p style={{ fontSize: 9, letterSpacing: 1.5, lineHeight: 2, opacity: 0.5, wordBreak: 'break-all' }}>
        {tokens.map((tok, i) => (
          <span key={i} style={{ marginRight: 10, color: i % 3 === 0 ? CYAN.bright : CYAN.mid }}>
            {chars[(seed + i) % 16]}·{tok}
          </span>
        ))}
      </p>
    </Panel>
  )
}
