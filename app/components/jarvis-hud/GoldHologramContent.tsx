'use client'
import { GOLD } from './theme'
import Panel from './Panel'
import type { HologramTab } from './CircularMenu'
import type { StatusData } from './Panels'

export interface TrendVideo {
  url: string
  platform: 'tiktok' | 'instagram'
  title: string
  author: string
  thumbnail_url: string | null
  embed_type: 'tiktok_oembed' | 'open_external'
  posted_at: string | null
  verified_at: string | null
}

export interface Trend {
  title: string
  source_link: string | null
  sound_or_hashtag: string
  why_it_works: string
  usage_idea: string
  suggested_client: string | null
  videos: TrendVideo[]
}

export interface CustomerWithProjects {
  id: string
  name: string
  projects: { id: string; name: string; status: string }[]
}

export interface CalendarMeeting { id: string; title: string; meetingDate: string; meetingTime: string }

function ageLabel(postedAt: string | null): string | null {
  if (!postedAt) return null
  const days = Math.floor((Date.now() - new Date(postedAt).getTime()) / (1000 * 60 * 60 * 24))
  if (days < 0) return null
  if (days < 14) return `${days} ${days === 1 ? 'dag' : 'dage'} gammel`
  const weeks = Math.round(days / 7)
  return `${weeks} ${weeks === 1 ? 'uge' : 'uger'} gammel`
}

function tiktokVideoId(url: string): string {
  const match = url.match(/\/video\/(\d+)/)
  return match ? match[1] : ''
}

interface Props {
  tab: HologramTab
  trends: Trend[]
  trendsDemo: boolean
  customers: CustomerWithProjects[]
  meetings: CalendarMeeting[]
  status: StatusData | null
  onSaveTrend: (trend: Trend, video: TrendVideo) => void
}

export default function GoldHologramContent({ tab, trends, trendsDemo, customers, meetings, status, onSaveTrend }: Props) {
  if (!tab) return null

  return (
    <div style={{
      position: 'absolute', inset: 0, overflowY: 'auto', padding: '40px 24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none'
    }}>
      <div style={{ maxWidth: 1100, width: '100%', pointerEvents: 'auto' }}>
        {tab === 'trends' && (
          <>
            <p style={{ textAlign: 'center', color: GOLD.mid, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: 1, marginBottom: 20 }}>
              {trendsDemo ? 'DEMO-DATA — Hvilken video vil du se først?' : 'Hvilken video vil du se først?'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {trends.map((trend, ti) => (
                <Panel key={ti} title={trend.title} track="gold">
                  <p style={{ fontSize: 10, opacity: 0.7, marginBottom: 6 }}>{trend.sound_or_hashtag}</p>
                  <p style={{ fontSize: 12, marginBottom: 6 }}>{trend.why_it_works}</p>
                  <p style={{ fontSize: 11, opacity: 0.8, fontStyle: 'italic', marginBottom: 10 }}>{trend.usage_idea}</p>
                  {trend.suggested_client && <p style={{ fontSize: 10, opacity: 0.6, marginBottom: 10 }}>FORESLÅET KUNDE: {trend.suggested_client}</p>}
                  {trend.videos.map((video, vi) => (
                    <div key={vi} style={{ marginBottom: 10, borderTop: '1px solid rgba(255,179,0,0.25)', paddingTop: 10 }}>
                      {trendsDemo ? (
                        // Demo trends carry fake video URLs/IDs - never hand
                        // those to TikTok's real embed.js (it would try to
                        // load a real, non-existent video and show TikTok's
                        // own cookie-consent chrome for nothing).
                        <div style={{ padding: 16, border: `1px dashed ${GOLD.mid}`, textAlign: 'center', fontSize: 11, opacity: 0.7 }}>
                          [ DEMO-VIDEO - {video.platform === 'tiktok' ? 'TikTok' : 'Instagram'}-embed vises her med rigtig data ]
                        </div>
                      ) : video.platform === 'tiktok' ? (
                        <blockquote className="tiktok-embed" cite={video.url} data-video-id={tiktokVideoId(video.url)} style={{ maxWidth: '100%', minWidth: 0 }}>
                          <section></section>
                        </blockquote>
                      ) : (
                        <a href={video.url} target="_blank" rel="noreferrer" style={{ display: 'block', padding: 10, border: `1px solid ${GOLD.mid}`, color: GOLD.bright, fontSize: 12, textDecoration: 'none' }}>
                          {video.thumbnail_url && <img src={video.thumbnail_url} alt={video.title} style={{ width: '100%', marginBottom: 8 }} />}
                          ↗ Åbn Instagram Reel eksternt: {video.title || video.author}
                        </a>
                      )}
                      {ageLabel(video.posted_at) && <p style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>{ageLabel(video.posted_at)}</p>}
                      <button
                        onClick={() => onSaveTrend(trend, video)}
                        style={{ marginTop: 8, padding: '8px 14px', background: 'transparent', border: `1px solid ${GOLD.bright}`, color: GOLD.bright, fontSize: 10, textTransform: 'uppercase', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        Gem til kunde
                      </button>
                    </div>
                  ))}
                </Panel>
              ))}
              {trends.length === 0 && <p style={{ color: GOLD.mid, opacity: 0.6 }}>Ingen trends fundet endnu.</p>}
            </div>
          </>
        )}

        {tab === 'kunder' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {customers.map(c => (
              <Panel key={c.id} title={c.name} track="gold">
                {c.projects.length === 0 && <p style={{ fontSize: 11, opacity: 0.6 }}>Ingen projekter</p>}
                {c.projects.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                    <span>{p.name}</span>
                    <span style={{ opacity: 0.7, textTransform: 'uppercase', fontSize: 9 }}>{p.status}</span>
                  </div>
                ))}
              </Panel>
            ))}
            {customers.length === 0 && <p style={{ color: GOLD.mid, opacity: 0.6 }}>Ingen kunder endnu.</p>}
          </div>
        )}

        {tab === 'kalender' && (
          <Panel title="Møder denne uge" track="gold" style={{ maxWidth: 600, margin: '0 auto' }}>
            {meetings.length === 0 && <p style={{ fontSize: 12, opacity: 0.6 }}>Ingen planlagte møder.</p>}
            {meetings.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8, borderBottom: '1px solid rgba(255,179,0,0.2)', paddingBottom: 8 }}>
                <span>{m.title}</span>
                <span style={{ opacity: 0.7 }}>{m.meetingDate} {m.meetingTime}</span>
              </div>
            ))}
          </Panel>
        )}

        {tab === 'system' && (
          <Panel title="System" track="gold" style={{ maxWidth: 500, margin: '0 auto' }}>
            {!status ? <p style={{ fontSize: 12, opacity: 0.6 }}>Indlæser...</p> : (
              <div style={{ fontSize: 12, lineHeight: 1.9 }}>
                <p>Jarvis: {status.jarvisOnline ? 'ONLINE' : 'OFFLINE'}{status.jarvisResponseTimeMs !== null ? ` (${status.jarvisResponseTimeMs}ms)` : ''}</p>
                <p>Portal: ONLINE</p>
                <p>Kunder: {status.customerCount}</p>
                <p>Projekter: {status.projectCount}</p>
                <p>Trends denne uge: {status.trendsCount}</p>
                {status.demo && <p style={{ color: '#f59e0b', marginTop: 8 }}>DEMO-DATA (JARVIS_API_URL/JARVIS_API_KEY ikke sat)</p>}
              </div>
            )}
          </Panel>
        )}
      </div>
    </div>
  )
}
