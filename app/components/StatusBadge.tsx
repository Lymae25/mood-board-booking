'use client'
import { useState } from 'react'

export const STATUSES = [
  { key: 'new', label: 'New', color: '#6b7280', bg: '#1f2937' },
  { key: 'under-construction', label: 'Under Construction', color: '#fbbf24', bg: '#78350f' },
  { key: 'editing', label: 'Editing', color: '#60a5fa', bg: '#1e3a8a' },
  { key: 'pending-verification', label: 'Pending Verification', color: '#f472b6', bg: '#831843' },
  { key: 'done', label: 'Done', color: '#4ade80', bg: '#14532d' }
]

export function getStatusStyle(status: string) {
  const s = STATUSES.find(x => x.key === status) || STATUSES[0]
  return { color: s.color, bg: s.bg, label: s.label }
}

export default function StatusBadge({ projectId, status, editable = true, onUpdate }: { projectId: string, status: string, editable?: boolean, onUpdate?: (newStatus: string) => void }) {
  const [current, setCurrent] = useState(status || 'new')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const style = getStatusStyle(current)

  async function changeStatus(newStatus: string, e: any) {
    e.stopPropagation()
    e.preventDefault()
    setSaving(true)
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
    if (res.ok) {
      setCurrent(newStatus)
      setOpen(false)
      if (onUpdate) onUpdate(newStatus)
    }
    setSaving(false)
  }

  if (!editable) {
    return (
      <span style={{ display: 'inline-block', padding: '4px 10px', backgroundColor: style.bg, color: style.color, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', borderRadius: '2px' }}>
        {style.label}
      </span>
    )
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(!open) }}
        disabled={saving}
        style={{ padding: '4px 10px', backgroundColor: style.bg, color: style.color, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', border: 'none', cursor: 'pointer', borderRadius: '2px', opacity: saving ? 0.5 : 1 }}
      >
        {style.label} ▾
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', backgroundColor: '#000', border: '1px solid #333', minWidth: '200px', zIndex: 200 }}>
          {STATUSES.map(s => (
            <button
              key={s.key}
              onClick={(e) => changeStatus(s.key, e)}
              style={{ display: 'block', width: '100%', padding: '10px 12px', backgroundColor: current === s.key ? '#111' : 'transparent', color: s.color, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', border: 'none', borderBottom: '1px solid #222', cursor: 'pointer', textAlign: 'left' }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#1a1a1a' }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = current === s.key ? '#111' : 'transparent' }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
