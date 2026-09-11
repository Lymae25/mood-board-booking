'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CustomerSelector() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdminPin, setShowAdminPin] = useState(false)
  const [adminPin, setAdminPin] = useState('')
  const [error, setError] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const decayTimerRef = useRef<any>(null)
  const [speeds, setSpeeds] = useState<{ [id: string]: number }>({})
  const router = useRouter()

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(data => { setCustomers(data || []); setLoading(false) })
  }, [])

  // Init speeds when customers load
  useEffect(() => {
    if (customers.length > 0) {
      const init: any = {}
      customers.forEach((c, i) => { init[c.id] = getNormalSpeed(i) })
      setSpeeds(init)
    }
  }, [customers])

  function getNormalSpeed(idx: number) {
    return [20, 25, 18, 30, 22, 28][idx % 6]
  }

  // Handle hover leave - trigger panic + smooth decay
  useEffect(() => {
    if (hoveredId === null && customers.length > 0 && Object.keys(speeds).length > 0) {
      // Check if any speed is different from normal (means we just hovered off)
      const anyPanicked = customers.some((c, i) => speeds[c.id] && speeds[c.id] < getNormalSpeed(i) - 1)
      if (!anyPanicked && !decayTimerRef.current) return
    }

    if (hoveredId !== null) {
      // Someone is hovered - trigger panic on all others
      if (decayTimerRef.current) { clearInterval(decayTimerRef.current); decayTimerRef.current = null }
      const panicSpeeds: any = {}
      customers.forEach((c, i) => {
        if (c.id !== hoveredId) {
          panicSpeeds[c.id] = 0.4 + (i % 6) * 0.03
        } else {
          panicSpeeds[c.id] = getNormalSpeed(i)
        }
      })
      setSpeeds(panicSpeeds)
    } else if (customers.length > 0) {
      // No hover - start smooth decay back to normal
      if (decayTimerRef.current) clearInterval(decayTimerRef.current)
      decayTimerRef.current = setInterval(() => {
        setSpeeds(prev => {
          const next: any = {}
          let allNormal = true
          customers.forEach((c, i) => {
            const normal = getNormalSpeed(i)
            const current = prev[c.id] || normal
            if (Math.abs(current - normal) < 0.1) {
              next[c.id] = normal
            } else {
              // Multiply by growth factor for smooth exponential decay
              next[c.id] = current + (normal - current) * 0.04
              allNormal = false
            }
          })
          if (allNormal && decayTimerRef.current) {
            clearInterval(decayTimerRef.current)
            decayTimerRef.current = null
          }
          return next
        })
      }, 50)
    }

    return () => {
      if (decayTimerRef.current && hoveredId !== null) {
        clearInterval(decayTimerRef.current)
        decayTimerRef.current = null
      }
    }
  }, [hoveredId, customers])

  function handleSelect(customerId: string) {
    setSelectedId(customerId)
    setTimeout(() => { router.push(`/pin/${customerId}`) }, 1400)
  }

  function checkAdminPin() {
    if (adminPin === '1010') { router.push('/admin') } else { setError('Forkert kode'); setTimeout(() => setError(''), 2000) }
  }

  if (loading) return <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>LOADING</div>

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', perspective: '1000px' }}>
      <style>{`
        @keyframes spin-cw { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes spin-ccw { 0% { transform: rotate(0deg); } 100% { transform: rotate(-360deg); } }
        @keyframes float-1 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes float-2 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
        @keyframes float-3 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
        @keyframes nervous-shake {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          10% { transform: translate(-3px, -1px) rotate(-1.5deg); }
          20% { transform: translate(3px, 2px) rotate(1.5deg); }
          30% { transform: translate(-3px, 1px) rotate(-1deg); }
          40% { transform: translate(3px, -2px) rotate(1deg); }
          50% { transform: translate(-2px, 2px) rotate(-1.5deg); }
          60% { transform: translate(2px, -2px) rotate(1.5deg); }
          70% { transform: translate(-3px, -1px) rotate(-1deg); }
          80% { transform: translate(3px, 1px) rotate(1deg); }
          90% { transform: translate(-1px, -1px) rotate(-0.5deg); }
        }
        .float-0 { animation: float-1 4s ease-in-out infinite; }
        .float-1 { animation: float-2 5s ease-in-out infinite; }
        .float-2 { animation: float-3 3.5s ease-in-out infinite; }
        .float-3 { animation: float-1 4.5s ease-in-out infinite; }
        .float-4 { animation: float-2 5.5s ease-in-out infinite; }
        .float-5 { animation: float-3 4s ease-in-out infinite; }
        .is-nervous { animation: nervous-shake 0.25s ease-in-out infinite !important; }
        .is-nervous .circle-spin { animation-play-state: paused !important; }
        .falling {
          animation: none !important;
          transition: transform 1.2s cubic-bezier(0.5, 0, 0.75, 0), opacity 1.2s ease-in !important;
          transform: translateY(120vh) rotate(45deg) !important;
          opacity: 0 !important;
        }
        .zoom-in {
          animation: none !important;
          transition: transform 1.3s cubic-bezier(0.5, 0, 0.5, 1) !important;
          transform: scale(6) translateZ(400px) !important;
          z-index: 100;
        }
      `}</style>

      <h1 style={{ fontSize: '48px', fontWeight: '900', letterSpacing: '2px', marginBottom: '20px', textTransform: 'uppercase', opacity: selectedId ? 0 : 1, transition: 'opacity 0.5s' }}>MOOD BOARD</h1>
      <p style={{ fontSize: '14px', color: '#999', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '80px', opacity: selectedId ? 0 : 1, transition: 'opacity 0.5s' }}>Vælg bruger</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '40px', maxWidth: '1200px', width: '100%', marginBottom: '80px', transformStyle: 'preserve-3d' }}>
        {customers.map((c: any, idx: number) => {
          const isNervous = hoveredId === c.id && !selectedId
          const isFalling = selectedId !== null && selectedId !== c.id
          const isSelected = selectedId === c.id
          const speed = speeds[c.id] || getNormalSpeed(idx)
          const isCCW = [1, 4].includes(idx % 6)
          const spinAnimation = isNervous ? 'none' : `${isCCW ? 'spin-ccw' : 'spin-cw'} ${speed}s linear infinite`

          const wrapClasses = [
            `float-${idx % 6}`,
            isNervous ? 'is-nervous' : '',
            isFalling ? 'falling' : '',
            isSelected ? 'zoom-in' : ''
          ].filter(Boolean).join(' ')

          return (
            <div
              key={c.id}
              onClick={() => !selectedId && handleSelect(c.id)}
              onMouseEnter={() => !selectedId && setHoveredId(c.id)}
              onMouseLeave={() => !selectedId && setHoveredId(null)}
              className={wrapClasses}
              style={{
                cursor: selectedId ? 'default' : 'pointer',
                textAlign: 'center',
                position: 'relative',
                transformStyle: 'preserve-3d'
              }}
            >
              <div
                className="circle-spin"
                style={{
                  width: '160px',
                  height: '160px',
                  borderRadius: '50%',
                  border: isNervous ? '2px solid #fff' : '2px solid #333',
                  overflow: 'hidden',
                  margin: '0 auto 20px',
                  backgroundColor: '#111',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'border 0.3s',
                  animation: spinAnimation
                }}
              >
                {c.logoUrl ? <img src={c.logoUrl} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '48px', color: '#666' }}>{c.name.charAt(0)}</span>}
              </div>
              <p style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', opacity: isSelected ? 0 : 1, transition: 'opacity 0.4s' }}>{c.name}</p>
            </div>
          )
        })}
      </div>

      {customers.length === 0 && <p style={{ color: '#666', marginBottom: '40px' }}>Ingen brugere endnu. Login som admin for at oprette.</p>}

      {!showAdminPin && !selectedId && <button onClick={() => setShowAdminPin(true)} style={{ padding: '12px 24px', backgroundColor: 'transparent', border: '1px solid #333', color: '#999', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>Admin Login</button>}
      
      {showAdminPin && !selectedId && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          <input type="password" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && checkAdminPin()} maxLength={4} placeholder="Admin PIN" style={{ padding: '12px 24px', backgroundColor: 'transparent', border: '1px solid #333', color: '#fff', fontSize: '18px', textAlign: 'center', letterSpacing: '8px', width: '200px' }} autoFocus />
          {error && <p style={{ color: '#ff6666', fontSize: '12px' }}>{error}</p>}
          <button onClick={checkAdminPin} style={{ padding: '10px 24px', backgroundColor: '#fff', border: 'none', color: '#000', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>Login</button>
        </div>
      )}
    </div>
  )
}
