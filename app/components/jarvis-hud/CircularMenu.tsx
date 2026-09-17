'use client'
import { CYAN } from './theme'

export type Mode = 'cvs' | 'privat' | 'nets' | null
export type HologramTab = 'trends' | 'kunder' | 'kalender' | 'system' | null

interface MenuItem {
  key: string
  label: string
  kind: 'mode' | 'hologram' | 'chat'
  warn?: boolean
}

const ITEMS: MenuItem[] = [
  { key: 'cvs', label: 'CVS', kind: 'mode' },
  { key: 'privat', label: 'PRIVAT', kind: 'mode' },
  { key: 'nets', label: 'NETS', kind: 'mode', warn: true },
  { key: 'trends', label: 'TRENDS', kind: 'hologram' },
  { key: 'kunder', label: 'KUNDER', kind: 'hologram' },
  { key: 'kalender', label: 'KALENDER', kind: 'hologram' },
  { key: 'chat', label: 'CHAT', kind: 'chat' },
  { key: 'system', label: 'SYSTEM', kind: 'hologram' }
]

interface Props {
  radiusPercent: number
  activeMode: Mode
  activeHologramTab: HologramTab
  onSelectMode: (mode: Exclude<Mode, null>) => void
  onSelectHologram: (tab: Exclude<HologramTab, null>) => void
  onFocusChat: () => void
}

export default function CircularMenu({ radiusPercent, activeMode, activeHologramTab, onSelectMode, onSelectHologram, onFocusChat }: Props) {
  const isActive = (item: MenuItem) => {
    if (item.kind === 'mode') return activeMode === item.key
    if (item.kind === 'hologram') return activeHologramTab === item.key
    return false
  }

  function handleClick(item: MenuItem) {
    if (item.kind === 'mode') onSelectMode(item.key as Exclude<Mode, null>)
    else if (item.kind === 'hologram') onSelectHologram(item.key as Exclude<HologramTab, null>)
    else onFocusChat()
  }

  return (
    <div className="jh-menu" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <style>{`
        .jh-menu-ring {
          position: absolute; inset: 0; border-radius: 50%;
          border: 1px dashed rgba(79, 195, 247, 0.18);
          pointer-events: none;
        }
        .jh-menu-btn {
          position: absolute;
          transform: translate(-50%, -50%);
          padding: 9px 16px;
          background: rgba(2, 10, 20, 0.7);
          border: 1.5px solid rgba(79, 195, 247, 0.55);
          color: ${CYAN.mid};
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          cursor: pointer;
          pointer-events: auto;
          clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
          transition: background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.15s;
          white-space: nowrap;
          box-shadow: 0 0 0 rgba(0, 217, 255, 0);
        }
        .jh-menu-btn:hover {
          background: rgba(0, 217, 255, 0.16);
          border-color: ${CYAN.bright};
          color: ${CYAN.bright};
          box-shadow: 0 0 18px rgba(0, 217, 255, 0.55);
          transform: translate(-50%, -50%) scale(1.06);
        }
        .jh-menu-btn.active {
          background: ${CYAN.bright};
          color: #001018;
          border-color: ${CYAN.bright};
          box-shadow: 0 0 20px rgba(0, 217, 255, 0.8);
        }
        .jh-menu-btn.warn { border-color: rgba(255, 90, 90, 0.6); color: #ff8080; }
        .jh-menu-btn.warn:hover { border-color: #ff5a5a; color: #ff5a5a; box-shadow: 0 0 18px rgba(255, 90, 90, 0.55); }
        .jh-menu-btn.warn.active { background: #ff5a5a; color: #200000; box-shadow: 0 0 16px rgba(255, 90, 90, 0.7); }
      `}</style>
      <div className="jh-menu-ring" />
      {ITEMS.map((item, i) => {
        const angle = (Math.PI / 180) * ((360 / ITEMS.length) * i - 90)
        // radiusPercent is a percentage of the (always square) core
        // container, kept well inside 0-100 so every button - including
        // the ones straight up/down/left/right - stays fully on screen.
        const x = 50 + radiusPercent * Math.cos(angle)
        const y = 50 + radiusPercent * Math.sin(angle)
        return (
          <button
            key={item.key}
            className={`jh-menu-btn ${isActive(item) ? 'active' : ''} ${item.warn ? 'warn' : ''}`}
            style={{ left: `${x}%`, top: `${y}%` }}
            onClick={() => handleClick(item)}
            title={item.warn ? 'Nets-tilstand: ingen kunde- eller persondata' : undefined}
          >
            {item.warn ? '⚠ ' : ''}{item.label}
          </button>
        )
      })}
    </div>
  )
}
