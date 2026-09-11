'use client'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/lib/useTranslation'
import { resolveUploadUrl } from '@/lib/resolveUploadUrl'
import TypingIndicator from './TypingIndicator'

interface ChatScene { id: string; title: string }

const TYPING_THROTTLE_MS = 2000
const TYPING_POLL_MS = 2000

export default function ChatWidget({ customerId, projectName, scenes }: { customerId: string, projectName?: string, scenes?: ChatScene[] }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [taggedScene, setTaggedScene] = useState('')
  const [sending, setSending] = useState(false)
  const [attachedImage, setAttachedImage] = useState('')
  const [attachUploading, setAttachUploading] = useState(false)
  const [adminTyping, setAdminTyping] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const attachInputRef = useRef<HTMLInputElement>(null)
  const lastTypingSentRef = useRef(0)
  const { t } = useTranslation()

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

  useEffect(() => {
    if (!customerId || !open) return
    checkTyping()
    const iv = setInterval(checkTyping, TYPING_POLL_MS)
    return () => clearInterval(iv)
  }, [customerId, open])

  async function checkTyping() {
    try {
      const res = await fetch(`/api/typing?customerId=${customerId}`)
      const data = await res.json()
      setAdminTyping(!!data.adminTyping)
    } catch (e) {}
  }

  function notifyTyping() {
    const now = Date.now()
    if (now - lastTypingSentRef.current < TYPING_THROTTLE_MS) return
    lastTypingSentRef.current = now
    fetch('/api/typing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId, sender: 'customer' }) }).catch(() => {})
  }

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

  async function handleAttach(e: any) {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok && data.url) setAttachedImage(data.url)
    } catch (e) {}
    setAttachUploading(false)
    if (attachInputRef.current) attachInputRef.current.value = ''
  }

  async function send() {
    if ((!input.trim() && !attachedImage) || sending) return
    setSending(true)
    const sceneLabel = taggedScene ? scenes?.find(s => s.id === taggedScene)?.title : undefined
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, sender: 'customer', content: input.trim(), imageUrl: attachedImage || null, projectRef: projectName || null, sceneRef: sceneLabel || null })
    })
    setInput('')
    setTaggedScene('')
    setAttachedImage('')
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
              <p style={{ fontSize: '12px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('chat.title', 'Besked til Admin')}</p>
              {projectName && <p style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{projectName}</p>}
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', color: '#999', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>

          <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {messages.length === 0 && <p style={{ color: '#666', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('chat.emptyState', 'Skriv til admin herunder')}</p>}
            {messages.map(m => (
              <div key={m.id} style={{ alignSelf: m.sender === 'customer' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                {(m.projectRef || m.sceneRef) && (
                  <p style={{ fontSize: '9px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', textAlign: m.sender === 'customer' ? 'right' : 'left' }}>
                    {[m.projectRef, m.sceneRef].filter(Boolean).join(' · ')}
                  </p>
                )}
                {m.imageUrl && (
                  <a href={resolveUploadUrl(m.imageUrl)} target="_blank" rel="noreferrer" style={{ display: 'block', marginBottom: m.content ? '6px' : 0 }}>
                    <img src={resolveUploadUrl(m.imageUrl)} alt="" style={{ maxWidth: '300px', maxHeight: '300px', display: 'block', border: m.sender === 'customer' ? 'none' : '1px solid #333' }} />
                  </a>
                )}
                {m.content && (
                  <div style={{ padding: '10px 14px', backgroundColor: m.sender === 'customer' ? '#fff' : 'transparent', color: m.sender === 'customer' ? '#000' : '#fff', border: m.sender === 'customer' ? 'none' : '1px solid #333', fontSize: '13px', lineHeight: '1.5', wordBreak: 'break-word' }}>
                    {m.content}
                  </div>
                )}
                <p style={{ fontSize: '9px', color: '#666', marginTop: '4px', textAlign: m.sender === 'customer' ? 'right' : 'left' }}>{new Date(m.createdAt).toLocaleString('da-DK')}</p>
              </div>
            ))}
          </div>

          <div style={{ padding: '14px 20px', borderTop: '1px solid #333' }}>
            {adminTyping && <TypingIndicator label={t('chat.typingTemplate', '{name} skriver...').replace('{name}', 'Chrome Vault')} />}
            {scenes && scenes.length > 0 && (
              <select value={taggedScene} onChange={(e) => setTaggedScene(e.target.value)} style={{ width: '100%', padding: '8px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: taggedScene ? '#fff' : '#666', fontSize: '11px', outline: 'none', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <option value="" style={{ backgroundColor: '#000' }}>{t('chat.tagScene', 'Tag en scene (valgfri)')}</option>
                {scenes.map(s => <option key={s.id} value={s.id} style={{ backgroundColor: '#000' }}>{s.title}</option>)}
              </select>
            )}
            {(attachedImage || attachUploading) && (
              <div style={{ marginBottom: '10px' }}>
                {attachUploading ? (
                  <p style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('upload.uploadingLabel', 'Uploader...')}</p>
                ) : (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={resolveUploadUrl(attachedImage)} alt="" style={{ maxHeight: '70px', maxWidth: '110px', display: 'block', border: '1px solid #333' }} />
                    <button onClick={() => setAttachedImage('')} style={{ position: 'absolute', top: '-8px', right: '-8px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff', color: '#000', border: 'none', cursor: 'pointer', fontSize: '12px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>×</button>
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <textarea
                value={input}
                onChange={(e) => { setInput(e.target.value); notifyTyping() }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder={t('chat.typeMessage', 'Skriv en besked...')}
                style={{ flex: 1, resize: 'none', minHeight: '38px', maxHeight: '80px', padding: '8px 10px', backgroundColor: 'transparent', border: '1px solid #333', color: '#fff', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
              />
              <button type="button" onClick={() => attachInputRef.current?.click()} title={t('chat.attachImage', 'Billede')} style={{ width: '38px', padding: 0, backgroundColor: 'transparent', border: '1px solid #333', color: '#999', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>+</button>
              <input ref={attachInputRef} type="file" accept="image/*" onChange={handleAttach} style={{ display: 'none' }} />
              <button onClick={send} disabled={sending || (!input.trim() && !attachedImage)} style={{ padding: '0 18px', backgroundColor: '#fff', border: 'none', color: '#000', cursor: sending ? 'default' : 'pointer', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', opacity: sending || (!input.trim() && !attachedImage) ? 0.5 : 1 }}>{t('common.send', 'Send')}</button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '58px', height: '58px', borderRadius: '50%', backgroundColor: '#fff', color: '#000', border: 'none', cursor: 'pointer', fontSize: open ? '22px' : '10px', fontWeight: 900, letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
      >
        {open ? '×' : t('chat.launcherLabel', 'Chat').toUpperCase()}
        {!open && unreadCount > 0 && (
          <span style={{ position: 'absolute', top: '-4px', right: '-4px', backgroundColor: '#ff6666', color: '#fff', fontSize: '10px', fontWeight: 'bold', minWidth: '20px', height: '20px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid #000' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  )
}
