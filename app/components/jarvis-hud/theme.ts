// Shared visual language for the Jarvis HUD. Two color tracks, per the
// design brief: cyan/ice for Jarvis itself (core, rings, menu, chrome),
// gold/amber for anything Jarvis is showing (trends, customers, calendar).
export const CYAN = {
  bright: '#00d9ff',
  mid: '#4fc3f7',
  deep: '#0a84ff',
  text: '#e8f9ff'
}

export const GOLD = {
  bright: '#ffd54f',
  mid: '#ffb300',
  deep: '#ff8f00',
  text: '#fff3d6'
}

export const BG = '#02060d'

export const FONT_STACK = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"

export type HudState = 'idle' | 'listening' | 'thinking' | 'speaking'

export const STATE_COLOR: Record<HudState, string> = {
  idle: CYAN.mid,
  listening: CYAN.bright,
  thinking: CYAN.deep,
  speaking: CYAN.bright
}

// Small helper for the "cut corner" panel look used throughout - a CSS
// clip-path with a notch on two opposite corners.
export function panelClipPath(size = 14): string {
  return `polygon(${size}px 0, 100% 0, 100% calc(100% - ${size}px), calc(100% - ${size}px) 100%, 0 100%, 0 ${size}px)`
}
