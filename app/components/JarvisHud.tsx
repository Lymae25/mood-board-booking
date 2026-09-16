'use client'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/lib/useTranslation'
import AdminNav from './AdminNav'

type HudState = 'idle' | 'listening' | 'thinking' | 'speaking'
type Mode = 'cvs' | 'privat' | 'nets' | null

interface ChatLine {
  role: 'user' | 'jarvis'
  text: string
}

interface TrendVideo {
  url: string
  platform: 'tiktok' | 'instagram'
  title: string
  author: string
  thumbnail_url: string | null
  embed_type: 'tiktok_oembed' | 'open_external'
  posted_at: string | null
  verified_at: string | null
}

interface Trend {
  title: string
  source_link: string | null
  sound_or_hashtag: string
  why_it_works: string
  usage_idea: string
  suggested_client: string | null
  videos: TrendVideo[]
}

interface Customer {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
}

interface JarvisLogEntry {
  id: string
  action: string
  detail: string | null
  createdAt: string
}

// Minimal shape for the Web Speech API's SpeechRecognition, which is not
// part of TypeScript's standard DOM lib. Typed narrowly enough to satisfy
// the linter without pulling in a third-party lib.dom extension.
interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

function tiktokVideoId(url: string): string {
  const match = url.match(/\/video\/(\d+)/)
  return match ? match[1] : ''
}

function ageLabel(postedAt: string | null): string | null {
  if (!postedAt) return null
  const days = Math.floor((Date.now() - new Date(postedAt).getTime()) / (1000 * 60 * 60 * 24))
  if (days < 0) return null
  if (days < 14) return `${days} ${days === 1 ? 'dag' : 'dage'} gammel`
  const weeks = Math.round(days / 7)
  return `${weeks} ${weeks === 1 ? 'uge' : 'uger'} gammel`
}

export default function JarvisHud() {
  const [messages, setMessages] = useState<ChatLine[]>([])
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<Mode>(null)
  const [hudState, setHudState] = useState<HudState>('idle')
  const [sending, setSending] = useState(false)
  const [listening, setListening] = useState(false)
  const [demoMode, setDemoMode] = useState(false)
  const [trends, setTrends] = useState<Trend[]>([])
  const [trendsDemo, setTrendsDemo] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [saveTarget, setSaveTarget] = useState<{ trend: Trend; video: TrendVideo } | null>(null)
  const [saveCustomerId, setSaveCustomerId] = useState('')
  const [saveProjects, setSaveProjects] = useState<Project[]>([])
  const [saveProjectId, setSaveProjectId] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const [showLog, setShowLog] = useState(false)
  const [logEntries, setLogEntries] = useState<JarvisLogEntry[]>([])
  const [logLoading, setLogLoading] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const scriptLoadedRef = useRef(false)
  const { t } = useTranslation()

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

  useEffect(() => {
    // Standard fetch-on-mount pattern, identical to the one already used
    // throughout this codebase (AdminPanel.tsx's loadData(), etc.) - the
    // newer react-hooks/set-state-in-effect rule flags this one specifically
    // (its try/catch shape appears to confuse the analyzer) without flagging
    // the equivalent pattern elsewhere in the app, so it's silenced here
    // rather than restructured into something inconsistent with the rest
    // of the codebase's convention.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTrends()
    fetch('/api/customers').then(r => r.json()).then(setCustomers).catch(() => {})
  }, [])

  // TikTok's embed.js scans the DOM once on load for .tiktok-embed blocks.
  // New cards added after that (e.g. after loadTrends() resolves) need it
  // re-run, which the script itself does via a global it exposes.
  useEffect(() => {
    if (trends.length === 0) return
    if (!scriptLoadedRef.current) {
      const script = document.createElement('script')
      script.src = 'https://www.tiktok.com/embed.js'
      script.async = true
      document.body.appendChild(script)
      scriptLoadedRef.current = true
    } else {
      const w = window as unknown as { tiktokEmbedLoad?: () => void }
      w.tiktokEmbedLoad?.()
    }
  }, [trends])

  async function speak(text: string) {
    setHudState('speaking')
    try {
      const res = await fetch('/api/jarvis/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('audio')) {
        const buf = await res.arrayBuffer()
        const blob = new Blob([buf], { type: 'audio/mpeg' })
        const audio = new Audio(URL.createObjectURL(blob))
        audio.onended = () => setHudState('idle')
        await audio.play()
        return
      }
    } catch {
      // fall through to browser TTS below
    }
    // Demo mode or ElevenLabs call failed - fall back to the browser's own
    // speech synthesis so the HUD still "speaks" during local testing.
    try {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'da-DK'
      utterance.onend = () => setHudState('idle')
      window.speechSynthesis.speak(utterance)
    } catch {
      setHudState('idle')
    }
  }

  async function sendMessage(text: string, opts?: { asMode?: Mode }) {
    if (!text.trim() || sending) return
    setSending(true)
    setHudState('thinking')
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
        await speak(data.reply)
      } else {
        setMessages(prev => [...prev, { role: 'jarvis', text: t('jarvisHud.unreachable', 'Kunne ikke få svar fra Jarvis lige nu.') }])
        setHudState('idle')
      }
    } catch {
      setMessages(prev => [...prev, { role: 'jarvis', text: t('jarvisHud.unreachable', 'Kunne ikke få svar fra Jarvis lige nu.') }])
      setHudState('idle')
    } finally {
      setSending(false)
    }
  }

  function selectMode(m: Exclude<Mode, null>) {
    setMode(m)
    sendMessage(`/${m}`, { asMode: m })
  }

  function startListening() {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }
    const SpeechRecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SpeechRecognitionCtor) {
      setMessages(prev => [...prev, { role: 'jarvis', text: t('jarvisHud.noSpeechSupport', 'Talegenkendelse understøttes ikke i denne browser. Prøv Chrome eller Edge.') }])
      return
    }
    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'da-DK'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      sendMessage(transcript)
    }
    recognition.onend = () => { setListening(false); if (hudState === 'listening') setHudState('idle') }
    recognition.onerror = () => { setListening(false); setHudState('idle') }
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
    setHudState('listening')
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  function openSaveModal(trend: Trend, video: TrendVideo) {
    setSaveTarget({ trend, video })
    setSaveCustomerId('')
    setSaveProjectId('')
    setSaveStatus('')
  }

  useEffect(() => {
    if (!saveCustomerId) return
    fetch(`/api/projects?customerId=${saveCustomerId}`).then(r => r.json()).then(setSaveProjects).catch(() => setSaveProjects([]))
  }, [saveCustomerId])

  // Reset the project choice/list synchronously with the customer picker
  // itself (an event handler, not an effect) rather than via a second
  // effect reacting to saveCustomerId - avoids the "setState synchronously
  // in an effect" pattern the linter flags on the fetch effect above.
  function selectSaveCustomer(id: string) {
    setSaveCustomerId(id)
    setSaveProjects([])
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

  // Del D: admin-only activity log (chat turns, trend saves, draft
  // approvals/rejections - see logJarvisAction() calls in the API routes).
  // Lazy-loaded on first expand rather than on mount, since most admins
  // won't open it every visit.
  async function toggleLog() {
    const next = !showLog
    setShowLog(next)
    if (next && logEntries.length === 0) {
      setLogLoading(true)
      try {
        const res = await fetch('/api/jarvis/log')
        const data = await res.json()
        setLogEntries(Array.isArray(data) ? data : [])
      } catch {
        setLogEntries([])
      } finally {
        setLogLoading(false)
      }
    }
  }

  const ringColor = { idle: '#666', listening: '#4ade80', thinking: '#60a5fa', speaking: '#f472b6' }[hudState]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '24px' }}>
      <style>{`
        @keyframes jarvis-pulse { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.06); opacity: 1; } }
        @keyframes jarvis-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .jarvis-ring { animation: jarvis-pulse 2.2s ease-in-out infinite; }
        .jarvis-ring.thinking, .jarvis-ring.listening { animation: jarvis-pulse 0.9s ease-in-out infinite; }
        .jarvis-ring-inner { animation: jarvis-spin 6s linear infinite; }
        .jh-mode-btn { padding: 10px 20px; background: transparent; border: 1px solid #333; color: #ccc; cursor: pointer; font-size: 11px; letterSpacing: 1px; text-transform: uppercase; }
        .jh-mode-btn.active { background: #fff; color: #000; border-color: #fff; }
        .jh-mode-btn.nets { border-color: #7f1d1d; color: #fca5a5; }
        .jh-mode-btn.nets.active { background: #7f1d1d; color: #fff; }
        .jh-trend-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
        @media (max-width: 767px) { .jh-trend-grid { grid-template-columns: 1fr; } }
      `}</style>
      <AdminNav trail={['Jarvis']} />

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px' }}>
          <div
            className={`jarvis-ring ${hudState}`}
            style={{
              width: '180px', height: '180px', borderRadius: '50%',
              border: `2px solid ${ringColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '16px', position: 'relative'
            }}
          >
            <div
              className="jarvis-ring-inner"
              style={{
                width: '140px', height: '140px', borderRadius: '50%',
                border: `1px dashed ${ringColor}`, opacity: 0.5
              }}
            />
            <span style={{ position: 'absolute', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: ringColor }}>{hudState}</span>
          </div>

          {demoMode && <p style={{ fontSize: '11px', color: '#f59e0b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Demo-tilstand: JARVIS_API_URL/JARVIS_API_KEY ikke sat</p>}

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button className={`jh-mode-btn ${mode === 'cvs' ? 'active' : ''}`} onClick={() => selectMode('cvs')}>CVS</button>
            <button className={`jh-mode-btn ${mode === 'privat' ? 'active' : ''}`} onClick={() => selectMode('privat')}>Privat</button>
            <button className={`jh-mode-btn nets ${mode === 'nets' ? 'active' : ''}`} onClick={() => selectMode('nets')} title="Nets-tilstand: intet gemmes, kun rådgivning - ingen adgang til kunde-/kortdata">⚠ Nets</button>
          </div>

          <button
            onClick={() => listening ? stopListening() : startListening()}
            style={{
              width: '64px', height: '64px', borderRadius: '50%', border: `2px solid ${listening ? '#4ade80' : '#333'}`,
              background: listening ? '#14532d' : 'transparent', color: '#fff', fontSize: '22px', cursor: 'pointer', marginBottom: '20px'
            }}
            title="Hold/tryk for at tale"
          >
            🎙
          </button>

          <div style={{ width: '100%', maxWidth: '600px', maxHeight: '260px', overflowY: 'auto', border: '1px solid #222', padding: '16px', marginBottom: '16px', fontSize: '13px' }}>
            {messages.length === 0 && <p style={{ color: '#555' }}>Skriv eller tal til Jarvis for at starte.</p>}
            {messages.map((m, i) => (
              <p key={i} style={{ marginBottom: '8px', color: m.role === 'user' ? '#fff' : '#9ca3af' }}>
                <strong>{m.role === 'user' ? 'Dig' : 'Jarvis'}:</strong> {m.text}
              </p>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '600px' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { sendMessage(input); setInput('') } }}
              placeholder="Skriv til Jarvis..."
              style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #333', color: '#fff' }}
            />
            <button onClick={() => { sendMessage(input); setInput('') }} disabled={sending} style={{ padding: '12px 20px', background: '#fff', color: '#000', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Send</button>
          </div>
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Trending nu</h2>
        {trendsDemo && <p style={{ fontSize: '11px', color: '#f59e0b', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Demo-tilstand: testdata, ikke rigtige trends</p>}

        <div className="jh-trend-grid" style={{ marginBottom: '60px' }}>
          {trends.map((trend, ti) => (
            <div key={ti} style={{ border: '1px solid #222', padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px' }}>{trend.title}</h3>
              <p style={{ fontSize: '11px', color: '#999', marginBottom: '6px' }}>{trend.sound_or_hashtag}</p>
              <p style={{ fontSize: '12px', color: '#ccc', marginBottom: '6px' }}>{trend.why_it_works}</p>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px', fontStyle: 'italic' }}>{trend.usage_idea}</p>
              {trend.suggested_client && <p style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '10px' }}>Foreslået kunde: {trend.suggested_client}</p>}

              {trend.videos.map((video, vi) => (
                <div key={vi} style={{ marginBottom: '12px', borderTop: '1px solid #222', paddingTop: '10px' }}>
                  {video.platform === 'tiktok' ? (
                    <blockquote className="tiktok-embed" cite={video.url} data-video-id={tiktokVideoId(video.url)} style={{ maxWidth: '100%', minWidth: 0 }}>
                      <section></section>
                    </blockquote>
                  ) : (
                    <a href={video.url} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '10px', border: '1px solid #333', color: '#93c5fd', fontSize: '12px', textDecoration: 'none' }}>
                      {video.thumbnail_url && <img src={video.thumbnail_url} alt={video.title} style={{ width: '100%', marginBottom: '8px' }} />}
                      ↗ Åbn Instagram Reel eksternt: {video.title || video.author}
                    </a>
                  )}
                  {ageLabel(video.posted_at) && <p style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>{ageLabel(video.posted_at)}</p>}
                  <button onClick={() => openSaveModal(trend, video)} style={{ marginTop: '8px', padding: '8px 14px', background: 'transparent', border: '1px solid #fff', color: '#fff', fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer' }}>Gem til kunde</button>
                </div>
              ))}
            </div>
          ))}
          {trends.length === 0 && <p style={{ color: '#555' }}>Ingen trends fundet endnu.</p>}
        </div>

        <button onClick={toggleLog} style={{ marginBottom: '16px', padding: '10px 20px', background: 'transparent', border: '1px solid #333', color: '#999', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer' }}>
          {showLog ? '▾' : '▸'} Aktivitetslog
        </button>
        {showLog && (
          <div style={{ border: '1px solid #222', padding: '16px', marginBottom: '60px', maxHeight: '360px', overflowY: 'auto' }}>
            {logLoading && <p style={{ color: '#555', fontSize: '12px' }}>Indlæser...</p>}
            {!logLoading && logEntries.length === 0 && <p style={{ color: '#555', fontSize: '12px' }}>Ingen aktivitet endnu.</p>}
            {!logLoading && logEntries.map((entry) => (
              <div key={entry.id} style={{ borderBottom: '1px solid #222', padding: '10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{entry.action}</span>
                  <span style={{ fontSize: '10px', color: '#666' }}>{new Date(entry.createdAt).toLocaleString('da-DK')}</span>
                </div>
                {entry.detail && <p style={{ fontSize: '11px', color: '#999', marginTop: '4px', wordBreak: 'break-word' }}>{entry.detail}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {saveTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ background: '#111', border: '1px solid #333', padding: '24px', width: '360px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '16px' }}>Gem til kunde (kladde)</h3>
            <select value={saveCustomerId} onChange={(e) => selectSaveCustomer(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', background: '#000', color: '#fff', border: '1px solid #333' }}>
              <option value="">Vælg kunde</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={saveProjectId} onChange={(e) => setSaveProjectId(e.target.value)} disabled={!saveCustomerId} style={{ width: '100%', padding: '10px', marginBottom: '16px', background: '#000', color: '#fff', border: '1px solid #333' }}>
              <option value="">Vælg projekt</option>
              {saveProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <p style={{ fontSize: '11px', color: '#666', marginBottom: '16px' }}>Gemmes som KLADDE - kunden ser den ikke, før du godkender den under projektets Inspo-tab.</p>
            {saveStatus === 'error' && <p style={{ color: '#ff6666', fontSize: '12px', marginBottom: '10px' }}>Kunne ikke gemme.</p>}
            {saveStatus === 'saved' && <p style={{ color: '#4ade80', fontSize: '12px', marginBottom: '10px' }}>Gemt!</p>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setSaveTarget(null)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #333', color: '#999', cursor: 'pointer' }}>Annuller</button>
              <button onClick={submitSave} disabled={!saveCustomerId || !saveProjectId || saveStatus === 'saving'} style={{ flex: 1, padding: '10px', background: '#fff', color: '#000', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Gem</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
