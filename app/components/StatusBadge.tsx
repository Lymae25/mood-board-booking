'use client'
import { useState } from 'react'
import { useTranslation } from '@/lib/useTranslation'
import { useIsMobile } from '@/lib/useMediaQuery'

export const STATUSES = [
  { key: 'new', label: 'New', labelKey: 'status.new', color: '#6b7280', bg: '#1f2937' },
  { key: 'under-construction', label: 'Under Construction', labelKey: 'status.underConstruction', color: '#fbbf24', bg: '#78350f' },
  { key: 'editing', label: 'Editing', labelKey: 'status.editing', color: '#60a5fa', bg: '#1e3a8a' },
  { key: 'pending-verification', label: 'Pending Verification', labelKey: 'status.pendingVerification', color: '#f472b6', bg: '#831843' },
  { key: 'done', label: 'Done', labelKey: 'status.done', color: '#4ade80', bg: '#14532d' }
]

export function getStatusStyle(status: string) {
  const s = STATUSES.find(x => x.key === status) || STATUSES[0]
  return { color: s.color, bg: s.bg, label: s.label, labelKey: s.labelKey }
}

export default function StatusBadge({ projectId, status, editable = true, onUpdate }: { projectId: string, status: string, editable?: boolean, onUpdate?: (newStatus: string) => void }) {
  const [current, setCurrent] = useState(status || 'new')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const { t } = useTranslation()
  const isMobile = useIsMobile()

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
        {t(style.labelKey, style.label)}
      </span>
    )
  }

  const optionsList = (
    <>
      {STATUSES.map(s => (
        <button
          key={s.key}
          onClick={(e) => changeStatus(s.key, e)}
          style={{ display: 'block', width: '100%', padding: '10px 12px', minHeight: '44px', backgroundColor: current === s.key ? '#111' : 'transparent', color: s.color, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', border: 'none', borderBottom: '1px solid #222', cursor: 'pointer', textAlign: 'left' }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#1a1a1a' }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = current === s.key ? '#111' : 'transparent' }}
        >
          {t(s.labelKey, s.label)}
        </button>
      ))}
    </>
  )

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(!open) }}
        disabled={saving}
        style={{ padding: '6px 12px', minHeight: '32px', backgroundColor: style.bg, color: style.color, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', border: 'none', cursor: 'pointer', borderRadius: '2px', opacity: saving ? 0.5 : 1 }}
      >
        {t(style.labelKey, style.label)} ▾
      </button>

      {open && isMobile && (
        // Bottom sheet: easier to hit and doesn't get clipped by a
        // scrolling ancestor the way an absolutely-positioned dropdown can.
        <div
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(false) }}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 500, display: 'flex', alignItems: 'flex-end' }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', backgroundColor: '#000', borderTop: '1px solid #333', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
            <div style={{ padding: '16px 20px 8px', fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('common.status', 'Status')}</div>
            {optionsList}
          </div>
        </div>
      )}

      {open && !isMobile && (
        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', backgroundColor: '#000', border: '1px solid #333', minWidth: '200px', zIndex: 200 }}>
          {optionsList}
        </div>
      )}
    </div>
  )
}
