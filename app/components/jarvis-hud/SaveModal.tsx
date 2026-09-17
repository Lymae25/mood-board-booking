'use client'
import { GOLD } from './theme'
import type { Trend, TrendVideo } from './GoldHologramContent'

interface Customer { id: string; name: string }
interface Project { id: string; name: string }

interface Props {
  target: { trend: Trend; video: TrendVideo } | null
  customers: Customer[]
  projects: Project[]
  customerId: string
  projectId: string
  status: string
  onSelectCustomer: (id: string) => void
  onSelectProject: (id: string) => void
  onCancel: () => void
  onSubmit: () => void
}

export default function SaveModal({ target, customers, projects, customerId, projectId, status, onSelectCustomer, onSelectProject, onCancel, onSubmit }: Props) {
  if (!target) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,13,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900 }}>
      <div style={{ background: '#0a0e16', border: `1px solid ${GOLD.mid}`, padding: 24, width: 360, fontFamily: "'JetBrains Mono', monospace" }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, color: GOLD.bright }}>Gem til kunde (kladde)</h3>
        <select value={customerId} onChange={(e) => onSelectCustomer(e.target.value)} style={{ width: '100%', padding: 10, marginBottom: 10, background: '#000', color: '#fff', border: `1px solid ${GOLD.mid}` }}>
          <option value="">Vælg kunde</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={projectId} onChange={(e) => onSelectProject(e.target.value)} disabled={!customerId} style={{ width: '100%', padding: 10, marginBottom: 16, background: '#000', color: '#fff', border: `1px solid ${GOLD.mid}` }}>
          <option value="">Vælg projekt</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <p style={{ fontSize: 11, opacity: 0.6, marginBottom: 16 }}>Gemmes som KLADDE - kunden ser den ikke, før du godkender den under projektets Inspo-tab.</p>
        {status === 'error' && <p style={{ color: '#ff6666', fontSize: 12, marginBottom: 10 }}>Kunne ikke gemme.</p>}
        {status === 'saved' && <p style={{ color: '#4ade80', fontSize: 12, marginBottom: 10 }}>Gemt!</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 10, background: 'transparent', border: '1px solid #333', color: '#999', cursor: 'pointer' }}>Annuller</button>
          <button onClick={onSubmit} disabled={!customerId || !projectId || status === 'saving'} style={{ flex: 1, padding: 10, background: GOLD.bright, color: '#1a1000', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Gem</button>
        </div>
      </div>
    </div>
  )
}
