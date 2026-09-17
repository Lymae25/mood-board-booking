'use client'

interface Props {
  values: number[]
  color: string
  width?: number
  height?: number
}

export default function Sparkline({ values, color, width = 140, height = 32 }: Props) {
  if (values.length === 0) return null
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = Math.max(max - min, 1)
  const step = width / Math.max(values.length - 1, 1)
  const points = values.map((v, i) => {
    const x = i * step
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} opacity={0.9} />
      <polyline points={`0,${height} ${points} ${width},${height}`} fill={color} opacity={0.08} stroke="none" />
    </svg>
  )
}
