'use client'
import { ReactNode } from 'react'
import { CYAN, GOLD, panelClipPath } from './theme'

interface Props {
  title: string
  children: ReactNode
  track?: 'cyan' | 'gold'
  style?: React.CSSProperties
  className?: string
}

export default function Panel({ title, children, track = 'cyan', style, className }: Props) {
  const color = track === 'gold' ? GOLD : CYAN
  return (
    <div
      className={`jh-panel ${className || ''}`}
      style={{
        position: 'relative',
        background: 'rgba(2, 10, 20, 0.55)',
        border: `1px solid ${track === 'gold' ? 'rgba(255, 179, 0, 0.35)' : 'rgba(79, 195, 247, 0.3)'}`,
        clipPath: panelClipPath(12),
        padding: '14px 16px',
        backdropFilter: 'blur(2px)',
        ...style
      }}
    >
      <div style={{ position: 'absolute', top: 6, left: 6, width: 8, height: 8, borderTop: `1px solid ${color.mid}`, borderLeft: `1px solid ${color.mid}`, opacity: 0.8 }} />
      <div style={{ position: 'absolute', bottom: 6, right: 6, width: 8, height: 8, borderBottom: `1px solid ${color.mid}`, borderRight: `1px solid ${color.mid}`, opacity: 0.8 }} />
      <p style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: color.mid, marginBottom: 10, fontFamily: "'JetBrains Mono', monospace" }}>{title}</p>
      <div style={{ color: color.text, fontFamily: "'JetBrains Mono', monospace" }}>{children}</div>
    </div>
  )
}
