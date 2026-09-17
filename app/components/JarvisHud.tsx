'use client'
import { useEffect, useRef, useState } from 'react'
import AdminNav from './AdminNav'
import HexCore from './jarvis-hud/HexCore'
import CircularMenu, { Mode, HologramTab } from './jarvis-hud/CircularMenu'
import GoldHologram from './jarvis-hud/GoldHologram'
import GoldHologramContent, { Trend, TrendVideo, CustomerWithProjects, CalendarMeeting } from './jarvis-hud/GoldHologramContent'
import SaveModal from './jarvis-hud/SaveModal'
import BottomBar from './jarvis-hud/BottomBar'
import { TopLeftPanel, StatusPanel, ClockWeatherPanel, ActivityPanel, LogPanel, StatusData, WeatherData, MeetingItem, LogItem } from './jarvis-hud/Panels'
import { useJarvisVoice, useMicVolume, useReducedMotion } from './jarvis-hud/hooks'
import { HudState } from './jarvis-hud/theme'
import { useTranslation } from '@/lib/useTranslation'

interface ChatLine { role: 'user' | 'jarvis'; text: string }
interface Customer { id: string; name: string }
interface Project { id: string; name: string; customerId?: string; status?: string }
interface Meeting { id: string; title: string; meetingDate: string; meetingTime: string }
interface Message { customerId: string; sender: string; readByAdmin: boolean }

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function JarvisHud({ fontClassName }: { fontClassName?: string }) {
  const { t } = useTranslation()
  const reducedMotion = useReducedMotion()
  const mic = useMicVolume()
  const voice = useJarvisVoice()
  const inputRef = useRef<HTMLInputElement>(null)

  const [messages, setMessages] = useState<ChatLine[]>([])
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<Mode>(null)
  const [hologramTab, setHologramTab] = useState<HologramTab>(null)
  const [sending, setSending] = useState(false)
  const [demoMode, setDemoMode] = useState(false)

  const [trends, setTrends] = useState<Trend[]>([])
  const [trendsDemo, setTrendsDemo] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [logEntries, setLogEntries] = useState<LogItem[]>([])
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [jarvisStatus, setJarvisStatus] = useState<{ jarvisOnline: boolean; jarvisResponseTimeMs: number | null; demo: boolean; history: number[] } | null>(null)

  const [saveTarget, setSaveTarget] = useState<{ trend: Trend; video: TrendVideo } | null>(null)
  const [saveCustomerId, setSaveCustomerId] = useState('')
  const [saveProjects, setSaveProjects] = useState<Project[]>([])
  const [saveProjectId, setSaveProjectId] = useState('')
  const [saveStatus, setSaveStatus] = useState('')

  // Derived, not stored - avoids races between chat/thinking/speaking state
  // updates (see hooks.ts for how mic/voice track their own state).
  const hudState: HudState = mic.listening ? 'listening' : sending ? 'thinking' : voice.speaking ? 'speaking' : 'idle'

  async function loadTrends() {
    try {
      const res = await fetch('/api/jarvis/trends')
      const data = await res.json()
      setTrends(data?.data?.trends || [])
      setTrendsDemo(!!data?.demo)
    } catch {
      setTrends([])
    }
  }

  async function loadEverything() {
    loadTrends()
    fetch('/api/customers').then(r => r.json()).then((d) => setCustomers(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/projects').then(r => r.json()).then((d) => setProjects(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/meetings').then(r => r.json()).then((d) => setMeetings(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/messages').then(r => r.json()).then((d) => {
      const list: Message[] = Array.isArray(d) ? d : []
      setUnreadMessages(list.filter(m => m.sender === 'customer' && !m.readByAdmin).length)
    }).catch(() => {})
    fetch('/api/jarvis/log').then(r => r.json()).then((d) => setLogEntries(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/jarvis/weather').then(r => r.json()).then(setWeather).catch(() => {})
    fetch('/api/jarvis/status').then(r => r.json()).then(setJarvisStatus).catch(() => {})
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEverything()
    const statusInterval = setInterval(() => {
      fetch('/api/jarvis/status').then(r => r.json()).then(setJarvisStatus).catch(() => {})
    }, 20_000)
    const logInterval = setInterval(() => {
      fetch('/api/jarvis/log').then(r => r.json()).then((d) => setLogEntries(Array.isArray(d) ? d : [])).catch(() => {})
    }, 20_000)
    return () => { clearInterval(statusInterval); clearInterval(logInterval) }
  }, [])

  // TikTok's embed.js scans the DOM once on load for .tiktok-embed blocks -
  // re-run its loader whenever new trend cards appear inside the hologram.
  useEffect(() => {
    if (trends.length === 0 || hologramTab !== 'trends') return
    const w = window as unknown as { tiktokEmbedLoad?: () => void }
    if (w.tiktokEmbedLoad) {
      w.tiktokEmbedLoad()
    } else {
      const script = document.createElement('script')
      script.src = 'https://www.tiktok.com/embed.js'
      script.async = true
      document.body.appendChild(script)
    }
  }, [trends, hologramTab])

  async function speak(text: string) {
    try {
      const res = await fetch('/api/jarvis/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      const data = await res.json()
      if (data.demo || !data.audioBase64) {
        await voice.speakDemo(text)
      } else {
        await voice.speakReal(data.audioBase64, data.alignment)
      }
    } catch {
      await voice.speakDemo(text)
    }
  }

  async function sendMessage(text: string, opts?: { asMode?: Mode }) {
    if (!text.trim() || sending) return
    setSending(true)
    setMessages(prev => [...prev, { role: 'user', text }])
    try {
      const res = await fetch('/api/jarvis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, mode: opts?.asMode ?? mode })
      })
      const data = await res.json()
      if (res.ok) {
        setMessages(prev => [...prev, { role: 'jarvis', text: data.reply }])
        setDemoMode(!!data.demo)
        setSending(false)
        await speak(data.reply)
      } else {
        setMessages(prev => [...prev, { role: 'jarvis', text: t('jarvisHud.unreachable', 'Kunne ikke få svar fra Jarvis lige nu.') }])
        setSending(false)
      }
    } catch {
      setMessages(prev => [...prev, { role: 'jarvis', text: t('jarvisHud.unreachable', 'Kunne ikke få svar fra Jarvis lige nu.') }])
      setSending(false)
    }
  }

  function selectMode(m: Exclude<Mode, null>) {
    setMode(m)
    setHologramTab(null)
    sendMessage(`/${m}`, { asMode: m })
  }

  function selectHologram(tabKey: Exclude<HologramTab, null>) {
    setHologramTab(prev => (prev === tabKey ? null : tabKey))
  }

  function focusChat() {
    setHologramTab(null)
    inputRef.current?.focus()
  }

  function toggleMic() {
    if (mic.listening) { mic.stop(); return }
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
    if (!w.SpeechRecognition && !w.webkitSpeechRecognition) {
      setMessages(prev => [...prev, { role: 'jarvis', text: t('jarvisHud.noSpeechSupport', 'Talegenkendelse understøttes ikke i denne browser. Prøv Chrome eller Edge.') }])
      return
    }
    mic.start((transcript) => sendMessage(transcript))
  }

  function handleSend() {
    sendMessage(input)
    setInput('')
  }

  function openSaveModal(trend: Trend, video: TrendVideo) {
    setSaveTarget({ trend, video })
    setSaveCustomerId('')
    setSaveProjectId('')
    setSaveStatus('')
  }

  function selectSaveCustomer(id: string) {
    setSaveCustomerId(id)
    setSaveProjects(projects.filter(p => p.customerId === id))
    setSaveProjectId('')
  }

  async function submitSave() {
    if (!saveTarget || !saveCustomerId || !saveProjectId) return
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/mood-board-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: saveCustomerId,
          projectId: saveProjectId,
          title: saveTarget.trend.title,
          description: `${saveTarget.trend.why_it_works}\n\n${saveTarget.trend.usage_idea}\n\nKilde: ${saveTarget.video.url}`,
          sourceUrl: saveTarget.video.url,
          thumbnailUrl: saveTarget.video.thumbnail_url || '',
          category: 'Trend'
        })
      })
      if (res.ok) {
        setSaveStatus('saved')
        setTimeout(() => setSaveTarget(null), 1200)
      } else {
        setSaveStatus('error')
      }
    } catch {
      setSaveStatus('error')
    }
  }

  const todayMeetings: MeetingItem[] = meetings
    .filter(m => m.meetingDate === todayIso())
    .map(m => ({ id: m.id, title: m.title, meetingTime: m.meetingTime }))

  const weekMeetings: CalendarMeeting[] = meetings
    .filter(m => {
      const d = new Date(m.meetingDate)
      // eslint-disable-next-line react-hooks/purity -- filtering a fetched list against "now" for display, not deriving persisted state
      const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      return diff >= -0.5 && diff <= 7
    })
    .sort((a, b) => `${a.meetingDate}${a.meetingTime}`.localeCompare(`${b.meetingDate}${b.meetingTime}`))
    .map(m => ({ id: m.id, title: m.title, meetingDate: m.meetingDate, meetingTime: m.meetingTime }))

  const customersWithProjects: CustomerWithProjects[] = customers.map(c => ({
    id: c.id,
    name: c.name,
    projects: projects.filter(p => p.customerId === c.id).map(p => ({ id: p.id, name: p.name, status: p.status || 'new' }))
  }))

  const combinedStatus: StatusData | null = jarvisStatus ? {
    jarvisOnline: jarvisStatus.jarvisOnline,
    portalOnline: true,
    jarvisResponseTimeMs: jarvisStatus.jarvisResponseTimeMs,
    history: jarvisStatus.history,
    demo: jarvisStatus.demo,
    customerCount: customers.length,
    projectCount: projects.length,
    trendsCount: trends.length
  } : null

  return (
    <div className={`jh-hud ${reducedMotion ? 'jh-reduced' : ''} ${fontClassName || ''}`} style={{ minHeight: '100vh', background: '#02060d', color: '#e8f9ff', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes jh-grid-drift { from { background-position: 0 0; } to { background-position: 60px 60px; } }
        @keyframes jh-scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
        .jh-bg-grid {
          position: absolute; inset: 0;
          background-image: linear-gradient(rgba(79,195,247,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(79,195,247,0.06) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
        }
        .jh-hud:not(.jh-reduced) .jh-bg-grid { animation: jh-grid-drift 12s linear infinite; }
        .jh-scanline-layer {
          position: absolute; inset: 0; pointer-events: none; overflow: hidden; opacity: 0.05;
        }
        .jh-hud:not(.jh-reduced) .jh-scanline {
          position: absolute; left: 0; right: 0; height: 120px;
          background: linear-gradient(to bottom, transparent, rgba(79,195,247,0.4), transparent);
          animation: jh-scanline 6s linear infinite;
        }
        .jh-hud { font-family: 'JetBrains Mono', monospace; }
        .jh-panels { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 900px) {
          .jh-layout {
            flex-direction: column !important;
            /* flex-start (row-mode's "top align panels of different
               heights") only affects the cross axis, which becomes WIDTH
               once flex-direction flips to column - left at flex-start
               here, children never stretch to fill it and instead take
               their own max-content width (560px from the hex core),
               overflowing a narrow viewport. stretch fixes that. */
            align-items: stretch !important;
            min-width: 0;
          }
          .jh-side-col { width: 100% !important; min-width: 0 !important; }
          .jh-core-wrap { min-width: 0; order: -1; }
        }
      `}</style>

      <div className={`jh-bg-grid`} />
      <div className="jh-scanline-layer"><div className="jh-scanline" /></div>

      <AdminNav trail={['Jarvis']} />

      <div style={{ position: 'relative', zIndex: 1, padding: '20px 24px 40px', maxWidth: 1600, margin: '0 auto' }}>
        <div className="jh-layout" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <div className="jh-side-col" style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 20, flexShrink: 0 }}>
            <TopLeftPanel userName="Lymae" />
            <StatusPanel status={combinedStatus} />
            <LogPanel entries={logEntries} />
          </div>

          <div className="jh-core-wrap" style={{ flex: 1, position: 'relative', minHeight: 640, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {demoMode && (
              <p style={{ fontSize: 10, color: '#f59e0b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                Demo-tilstand: JARVIS_API_URL/JARVIS_API_KEY ikke sat
              </p>
            )}
            <div style={{ position: 'relative', width: '100%', maxWidth: 560, aspectRatio: '1 / 1' }}>
              <HexCore state={hudState} level={mic.listening ? mic.level : voice.level} bands={voice.bands} reducedMotion={reducedMotion} />
              <CircularMenu
                radiusPercent={37}
                activeMode={mode}
                activeHologramTab={hologramTab}
                onSelectMode={selectMode}
                onSelectHologram={selectHologram}
                onFocusChat={focusChat}
              />
              <p style={{ position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#4fc3f7', opacity: 0.7 }}>
                {hudState}
              </p>
            </div>

            <div style={{ width: '100%', marginTop: 30 }}>
              <BottomBar
                ref={inputRef}
                messages={messages}
                input={input}
                onInputChange={setInput}
                onSend={handleSend}
                listening={mic.listening}
                onToggleMic={toggleMic}
                sending={sending}
              />
            </div>
          </div>

          <div className="jh-side-col" style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 20, flexShrink: 0 }}>
            <ClockWeatherPanel weather={weather} />
            <ActivityPanel meetings={todayMeetings} unreadMessages={unreadMessages} />
          </div>
        </div>
      </div>

      <div style={{ position: 'fixed', inset: 0, zIndex: hologramTab ? 200 : -1 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(2,6,13,0.8)', opacity: hologramTab ? 1 : 0, transition: 'opacity 0.4s ease', pointerEvents: 'none' }} />
        <GoldHologram open={!!hologramTab} reducedMotion={reducedMotion} />
        <GoldHologramContent
          tab={hologramTab}
          trends={trends}
          trendsDemo={trendsDemo}
          customers={customersWithProjects}
          meetings={weekMeetings}
          status={combinedStatus}
          onSaveTrend={openSaveModal}
        />
        {hologramTab && (
          <button
            onClick={() => setHologramTab(null)}
            style={{ position: 'absolute', top: 20, right: 20, padding: '10px 18px', background: 'transparent', border: '1px solid #ffb300', color: '#ffd54f', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}
          >
            Luk ✕
          </button>
        )}
      </div>

      <SaveModal
        target={saveTarget}
        customers={customers}
        projects={saveProjects}
        customerId={saveCustomerId}
        projectId={saveProjectId}
        status={saveStatus}
        onSelectCustomer={selectSaveCustomer}
        onSelectProject={setSaveProjectId}
        onCancel={() => setSaveTarget(null)}
        onSubmit={submitSave}
      />
    </div>
  )
}
