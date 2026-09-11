'use client'
import { useState } from 'react'
import { useTranslation } from '@/lib/useTranslation'
import { LANGUAGES } from '@/lib/translations'

export default function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation()
  const [open, setOpen] = useState(false)
  const current = LANGUAGES.find(l => l.code === language) || LANGUAGES[0]

  return (
    <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 500 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ padding: '8px 12px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px', lineHeight: 1 }}
      >
        <span>{current.flag}</span>
        <span style={{ fontSize: '9px', color: '#999' }}>▾</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', backgroundColor: '#000', border: '1px solid #333', minWidth: '150px' }}>
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => { setLanguage(l.code); setOpen(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', backgroundColor: language === l.code ? '#111' : 'transparent', color: '#fff', fontSize: '12px', border: 'none', borderBottom: '1px solid #222', cursor: 'pointer', textAlign: 'left' }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#1a1a1a' }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = language === l.code ? '#111' : 'transparent' }}
            >
              <span style={{ fontSize: '15px' }}>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
