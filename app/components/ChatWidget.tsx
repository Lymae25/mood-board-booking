'use client'
import { useEffect, useRef, useState } from 'react'

interface ChatScene { id: string; title: string }

export default function ChatWidget({ customerId, projectName, scenes }: { customerId: string, projectName?: string, scenes?: ChatScene[] }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [taggedScene, setTaggedScene] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!customerId) return
    load()
    pollRef.current = setInterval(load, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [customerId])

  useEffect(() => {
    if (open) markRead()
  }, [open])

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, open])

  async function load() {
    try {
      const res = await fetch(`/api/messages?customerId=${customerId}`)
      const data = await res.json()
      setMessages(data || [])
    } catch (e) {}
  }

  async function markRead() {
    await fetch('/api/messages', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId, reader: 'customer' }) })
    setMessages(prev => prev.map(m => m.sender === 'admin' ? { ...m, readByCustomer: true } : m))
  }

  async function send() {
    if (!input.trim() || sending) return
    setSending(true)
    const sceneLabel = taggedScene ? scenes?.find(s => s.id === taggedScene)?.title : undefined
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, sender: 'customer', content: input.trim(), projectRef: projectName || null, sceneRef: sceneLabel || null })
    })
    setInput('')
    setTaggedScene('')
    setSending(false)
    load()
  }

  const unreadCount = messages.filter(m => m.sender === 'admin' && !m.readByCustomer).length

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      {open && (
        <div style={{ width: '340px', height: '460px', backgroundColor: '#000', border: '1px solid #333', display: 'flex', flexDirection: 'column', marginBottom: '15px', boxShadow: '0 0 40px rgba(0,0,0,0.6)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>Besked til Admin</p>
              {projectName && <p style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{projectName}</p>}
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', color: '#999', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>

          <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {messages.length === 0 && <p style={{ color: '#666', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Skriv til admin herunder</p>}
            {messages.map(m => (
              <div key={m.id} style={{ alignSelf: m.sender === 'customer' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                {(m.projectRef || m.sceneRef) && (
                  <p style={{ fontSize: '9px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', textAlign: m.sender === 'customer' ? 'right' : 'left' }}>
                    {[m.projectRef, m.sceneRef].filter(Boolean).join(' · ')}
                  </p>
                )}
                <div style={{ padding: '10px 14px', backgroundColor: m.sender === 'customer' ? '#fff' : 'transparent', color: m.sender === 'customer' ? '#000' : '#fff', border: m.sender === 'customer' ? 'none' : '1px solid #333', fontSize: '13px', lineHeight: '1.5', wordBreak: 'break-word' }}>
                  {m.content}
                </div>
                <p style={{ fontSize: '9px', color: '#666', marginTop: '4px', textAlign: m.sender === 'customer' ? 'right' : 'left' }}>{new Date(m.createdAt).toLocaleString('da-DK')}</p>
              </div>
            ))}
          </div>

          <div style={{ padding: '14px 20px', borderTop: '1px solid #333' }}>
            {scenes && scenes.length > 0 && (
              <select value={taggedScene} onChange={(e) => setTaggedScene(e.target.value)} style={{ width: '100%', padding: '8px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: taggedScene ? '#fff' : '#666', fontSize: '11px', outline: 'none', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <option value="" style={{ backgroundColor: '#000' }}>Tag en scene (valgfri)</option>
                {scenes.map(s => <option key={s.id} value={s.id} style={{ backgroundColor: '#000' }}>{s.title}</option>)}
              </select>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Skriv en besked..."
                style={{ flex: 1, resize: 'none', minHeight: '38px', maxHeight: '80px', padding: '8px 10px', backgroundColor: 'transparent', border: '1px solid #333', color: '#fff', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
              />
              <button onClick={send} disabled={sending || !input.trim()} style={{ padding: '0 18px', backgroundColor: '#fff', border: 'none', color: '#000', cursor: sending ? 'default' : 'pointer', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', opacity: sending || !input.trim() ? 0.5 : 1 }}>Send</button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '58px', height: '58px', borderRadius: '50%', backgroundColor: '#fff', color: '#000', border: 'none', cursor: 'pointer', fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
      >
        {open ? '×' : '💬'}
        {!open && unreadCount > 0 && (
          <span style={{ position: 'absolute', top: '-4px', right: '-4px', backgroundColor: '#ff6666', color: '#fff', fontSize: '10px', fontWeight: 'bold', minWidth: '20px', height: '20px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid #000' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  )
}
