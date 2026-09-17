'use client'
import { forwardRef } from 'react'
import { CYAN } from './theme'

interface ChatLine { role: 'user' | 'jarvis'; text: string }

interface Props {
  messages: ChatLine[]
  input: string
  onInputChange: (v: string) => void
  onSend: () => void
  listening: boolean
  onToggleMic: () => void
  sending: boolean
}

const BottomBar = forwardRef<HTMLInputElement, Props>(function BottomBar(
  { messages, input, onInputChange, onSend, listening, onToggleMic, sending }, ref
) {
  return (
    <div style={{ position: 'relative', maxWidth: 900, margin: '0 auto' }}>
      {messages.length > 0 && (
        <div style={{
          maxHeight: 120, overflowY: 'auto', marginBottom: 10,
          border: '1px solid rgba(79, 195, 247, 0.25)', background: 'rgba(2, 10, 20, 0.5)',
          padding: '10px 14px', fontSize: 12, fontFamily: "'JetBrains Mono', monospace"
        }}>
          {messages.slice(-6).map((m, i) => (
            <p key={i} style={{ marginBottom: 4, color: m.role === 'user' ? '#fff' : CYAN.mid }}>
              <strong>{m.role === 'user' ? 'DIG' : 'JARVIS'}:</strong> {m.text}
            </p>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={onToggleMic}
          aria-pressed={listening}
          title={listening ? 'Mikrofon aktiv - klik for at stoppe' : 'Klik for at tale'}
          style={{
            width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
            border: `2px solid ${listening ? '#4ade80' : CYAN.mid}`,
            background: listening ? 'rgba(74, 222, 128, 0.18)' : 'rgba(0, 217, 255, 0.06)',
            color: '#fff', fontSize: 18, cursor: 'pointer',
            boxShadow: listening ? '0 0 14px rgba(74, 222, 128, 0.6)' : 'none'
          }}
        >
          {listening ? '●' : '\u{1F3A4}'}
        </button>
        <input
          ref={ref}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSend() }}
          placeholder="SKRIV TIL JARVIS..."
          style={{
            flex: 1, padding: '13px 16px', background: 'rgba(2, 10, 20, 0.7)',
            border: `1px solid ${CYAN.mid}`, color: '#fff', fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13, letterSpacing: 0.5, outline: 'none'
          }}
        />
        <button
          onClick={onSend}
          disabled={sending}
          style={{
            padding: '13px 22px', background: CYAN.bright, border: 'none', color: '#001018',
            fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', cursor: sending ? 'default' : 'pointer',
            opacity: sending ? 0.6 : 1, fontFamily: "'JetBrains Mono', monospace", fontSize: 12
          }}
        >
          Send
        </button>
      </div>
      <p style={{ textAlign: 'center', marginTop: 14, fontSize: 10, letterSpacing: 3, color: CYAN.mid, opacity: 0.5 }}>
        CHROME VAULT STUDIOS
      </p>
    </div>
  )
})

export default BottomBar
