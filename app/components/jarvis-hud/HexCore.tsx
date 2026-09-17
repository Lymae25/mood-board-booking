'use client'
import { useMemo } from 'react'
import { CYAN, HudState, STATE_COLOR } from './theme'
import type { AudioBands } from './hooks'

interface Props {
  state: HudState
  level: number
  bands: AudioBands
  reducedMotion: boolean
}

const CENTER = 200
const VIEWBOX = 400

function hexPoints(radius: number, rotationDeg = 0): string {
  const pts: string[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 90 + rotationDeg)
    pts.push(`${CENTER + radius * Math.cos(angle)},${CENTER + radius * Math.sin(angle)}`)
  }
  return pts.join(' ')
}

function ticks(radius: number, count: number, length: number) {
  const items: { x1: number; y1: number; x2: number; y2: number; key: number }[] = []
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI / 180) * ((360 / count) * i)
    const x1 = CENTER + radius * Math.cos(angle)
    const y1 = CENTER + radius * Math.sin(angle)
    const x2 = CENTER + (radius - length) * Math.cos(angle)
    const y2 = CENTER + (radius - length) * Math.sin(angle)
    items.push({ x1, y1, x2, y2, key: i })
  }
  return items
}

function arcSegments(radius: number, segments: number, gapDeg: number) {
  const spanDeg = 360 / segments - gapDeg
  const paths: string[] = []
  for (let i = 0; i < segments; i++) {
    const start = (360 / segments) * i
    const end = start + spanDeg
    const startRad = (Math.PI / 180) * start
    const endRad = (Math.PI / 180) * end
    const x1 = CENTER + radius * Math.cos(startRad)
    const y1 = CENTER + radius * Math.sin(startRad)
    const x2 = CENTER + radius * Math.cos(endRad)
    const y2 = CENTER + radius * Math.sin(endRad)
    paths.push(`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`)
  }
  return paths
}

function codeTokens(radius: number, count: number) {
  const chars = '0123456789ABCDEF'
  const items: { x: number; y: number; text: string; key: number }[] = []
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI / 180) * ((360 / count) * i)
    const x = CENTER + radius * Math.cos(angle)
    const y = CENTER + radius * Math.sin(angle)
    const code = `${chars[(i * 7) % 16]}${chars[(i * 13) % 16]}`
    items.push({ x, y, text: code, key: i })
  }
  return items
}

export default function HexCore({ state, level, bands, reducedMotion }: Props) {
  const color = STATE_COLOR[state]
  const innerTicks = useMemo(() => ticks(96, 60, 6), [])
  const outerTicks = useMemo(() => ticks(190, 36, 8), [])
  const arcs3 = useMemo(() => arcSegments(122, 5, 14), [])
  const arcs6 = useMemo(() => arcSegments(196, 8, 10), [])
  const codes = useMemo(() => codeTokens(146, 16), [])

  // Speaking scales the whole core with the low band, and the inner
  // wireframe with the mid band - "deep tones drive the outer hexagon,
  // mid tones the inner lines" per the brief.
  const outerScale = state === 'speaking' ? 1 + bands.low * 0.14 : state === 'listening' ? 1 + level * 0.08 : 1
  const innerScale = state === 'speaking' ? 1 + bands.mid * 0.22 : 1
  const glow = state === 'speaking' ? 18 + level * 40 : state === 'listening' ? 14 + level * 26 : state === 'thinking' ? 22 : 12
  const sparkleOpacity = state === 'speaking' ? Math.min(1, bands.high * 1.6) : 0

  const animClass = reducedMotion ? 'jh-core-reduced' : ''

  return (
    <div className={`jh-hexcore ${animClass}`} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <style>{`
        .jh-hexcore svg { width: 100%; height: 100%; overflow: visible; }
        .jh-ring { transform-origin: ${CENTER}px ${CENTER}px; }
        .jh-hexcore:not(.jh-core-reduced) .jh-ring-1 { animation: jh-spin-cw 14s linear infinite; }
        .jh-hexcore:not(.jh-core-reduced) .jh-ring-2 { animation: jh-spin-ccw 22s linear infinite; }
        .jh-hexcore:not(.jh-core-reduced) .jh-ring-3 { animation: jh-spin-cw 30s linear infinite; }
        .jh-hexcore:not(.jh-core-reduced) .jh-ring-4 { animation: jh-spin-ccw 46s linear infinite; }
        .jh-hexcore:not(.jh-core-reduced) .jh-ring-5 { animation: jh-spin-cw 60s linear infinite; }
        .jh-hexcore:not(.jh-core-reduced) .jh-ring-6 { animation: jh-spin-ccw 80s linear infinite; }
        @keyframes jh-spin-cw { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes jh-spin-ccw { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes jh-breathe { 0%, 100% { opacity: 0.75; } 50% { opacity: 1; } }
        .jh-hexcore:not(.jh-core-reduced) .jh-breathe { animation: jh-breathe 3.6s ease-in-out infinite; }
        @keyframes jh-scan { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .jh-hexcore:not(.jh-core-reduced) .jh-scanner { animation: jh-scan 2.1s linear infinite; }
        @keyframes jh-center-pulse { 0%, 100% { r: 6; } 50% { r: 9; } }
        .jh-hexcore:not(.jh-core-reduced) .jh-center-dot { animation: jh-center-pulse 2s ease-in-out infinite; }
      `}</style>
      <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
        <defs>
          <filter id="jh-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation={glow / 6} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g style={{ filter: 'url(#jh-glow)' }}>
          {/* Ring 6: sparse outer segmented arcs */}
          <g className="jh-ring jh-ring-6">
            {arcs6.map((d, i) => (
              <path key={i} d={d} fill="none" stroke={CYAN.mid} strokeWidth={1} opacity={0.35} />
            ))}
          </g>

          {/* Ring 5: thin dashed outer circle */}
          <circle className="jh-ring jh-ring-5" cx={CENTER} cy={CENTER} r={170} fill="none" stroke={CYAN.deep} strokeWidth={1} strokeDasharray="2 6" opacity={0.4} />

          {/* Ring 4: hex codes around the circumference */}
          <g className="jh-ring jh-ring-4">
            {codes.map((c) => (
              <text key={c.key} x={c.x} y={c.y} fill={CYAN.mid} fontSize={7} fontFamily="'JetBrains Mono', monospace" textAnchor="middle" opacity={0.55}>{c.text}</text>
            ))}
          </g>

          {/* Ring 3: segmented arcs, clock-tick style */}
          <g className="jh-ring jh-ring-3">
            {arcs3.map((d, i) => (
              <path key={i} d={d} fill="none" stroke={color} strokeWidth={2} opacity={0.7} />
            ))}
            {outerTicks.map((t) => (
              <line key={t.key} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={CYAN.bright} strokeWidth={1} opacity={0.5} />
            ))}
          </g>

          {/* Ring 2: dense tick ring, like a watch face */}
          <g className="jh-ring jh-ring-2">
            {innerTicks.map((t) => (
              <line key={t.key} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={CYAN.mid} strokeWidth={1} opacity={0.6} />
            ))}
          </g>

          {/* Ring 1: dashed inner circle */}
          <circle className="jh-ring jh-ring-1" cx={CENTER} cy={CENTER} r={70} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="6 4" opacity={0.8} />

          {/* Thinking-only scanner sweep */}
          {state === 'thinking' && (
            <g className="jh-scanner" style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}>
              <path d={`M ${CENTER} ${CENTER} L ${CENTER} ${CENTER - 196}`} stroke={CYAN.bright} strokeWidth={2} opacity={0.9} />
              <circle cx={CENTER} cy={CENTER - 196} r={4} fill={CYAN.bright} />
            </g>
          )}

          {/* Outer hexagon wireframe */}
          <g style={{ transform: `scale(${outerScale})`, transformOrigin: `${CENTER}px ${CENTER}px`, transition: 'transform 0.08s linear' }}>
            <polygon points={hexPoints(150)} fill="none" stroke={color} strokeWidth={2} className="jh-breathe" />
            <polygon points={hexPoints(150)} fill={color} opacity={0.03} />
          </g>

          {/* Inner hexagon + spokes to outer vertices */}
          <g style={{ transform: `scale(${innerScale})`, transformOrigin: `${CENTER}px ${CENTER}px`, transition: 'transform 0.08s linear' }}>
            <polygon points={hexPoints(90, 30)} fill="none" stroke={CYAN.bright} strokeWidth={1.5} opacity={0.85} />
            {hexPoints(90, 30).split(' ').map((p, i) => {
              const [x, y] = p.split(',').map(Number)
              return <line key={i} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke={CYAN.mid} strokeWidth={0.75} opacity={0.5} />
            })}
          </g>

          {/* Center point */}
          <circle className="jh-center-dot" cx={CENTER} cy={CENTER} r={6} fill={CYAN.bright} />
          <circle cx={CENTER} cy={CENTER} r={2} fill="#ffffff" />

          {/* Sparkle particles on high frequencies while speaking */}
          {sparkleOpacity > 0 && Array.from({ length: 10 }).map((_, i) => {
            const angle = (Math.PI / 180) * (36 * i + (level * 90))
            const r = 100 + (i % 3) * 20
            return (
              <circle
                key={i}
                cx={CENTER + r * Math.cos(angle)}
                cy={CENTER + r * Math.sin(angle)}
                r={1.4}
                fill="#ffffff"
                opacity={sparkleOpacity * (0.4 + 0.6 * ((i % 3) / 2))}
              />
            )
          })}
        </g>
      </svg>
    </div>
  )
}
