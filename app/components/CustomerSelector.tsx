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
  const rotationsRef = useRef<{ [id: string]: number }>({})
  const speedsRef = useRef<{ [id: string]: number }>({})
  const targetSpeedsRef = useRef<{ [id: string]: number }>({})
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)
  const [, setTick] = useState(0)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(data => { setCustomers(data || []); setLoading(false) })
  }, [])

  function getNormalSpeed(idx: number) {
    const speeds = [18, -14, 20, -12, 16, -15]
    return speeds[idx % 6]
  }

  useEffect(() => {
    customers.forEach((c, i) => {
      if (rotationsRef.current[c.id] === undefined) rotationsRef.current[c.id] = 0
      if (speedsRef.current[c.id] === undefined) speedsRef.current[c.id] = getNormalSpeed(i)
      if (targetSpeedsRef.current[c.id] === undefined) targetSpeedsRef.current[c.id] = getNormalSpeed(i)
    })
  }, [customers])

  useEffect(() => {
    if (selectedId) return
    customers.forEach((c, i) => {
      if (hoveredId === c.id) {
        targetSpeedsRef.current[c.id] = 0
      } else if (hoveredId !== null) {
        const normal = getNormalSpeed(i)
        targetSpeedsRef.current[c.id] = normal > 0 ? 600 : -600
      } else {
        targetSpeedsRef.current[c.id] = getNormalSpeed(i)
      }
    })
  }, [hoveredId, customers, selectedId])

  useEffect(() => {
    if (customers.length === 0) return

    function animate(time: number) {
      const dt = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0
      lastTimeRef.current = time

      customers.forEach(c => {
        const current = speedsRef.current[c.id] || 0
        const target = targetSpeedsRef.current[c.id] || 0
        const diff = target - current
        speedsRef.current[c.id] = current + diff * Math.min(1, dt * 1.2)
        rotationsRef.current[c.id] = (rotationsRef.current[c.id] || 0) + speedsRef.current[c.id] * dt
      })

      setTick(t => (t + 1) % 1000000)
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      lastTimeRef.current = 0
    }
  }, [customers])

  function handleSelect(customerId: string) {
    if (selectedId) return
    setSelectedId(customerId)
    setTimeout(() => { router.push(`/pin/${customerId}`) }, 1600)
  }

  function checkAdminPin() {
    if (adminPin === '1010') { router.push('/admin') } else { setError('Forkert kode'); setTimeout(() => setError(''), 2000) }
  }

  if (loading) return <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>LOADING</div>

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <style>{`
        @keyframes float-1 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes float-2 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
        @keyframes float-3 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
        @keyframes nervous-shake {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-2px, -1px); }
          50% { transform: translate(2px, 1px); }
          75% { transform: translate(-1px, 2px); }
        }
        .float-0 { animation: float-1 4s ease-in-out infinite; }
        .float-1 { animation: float-2 5s ease-in-out infinite; }
        .float-2 { animation: float-3 3.5s ease-in-out infinite; }
        .float-3 { animation: float-1 4.5s ease-in-out infinite; }
        .float-4 { animation: float-2 5.5s ease-in-out infinite; }
        .float-5 { animation: float-3 4s ease-in-out infinite; }
        .is-nervous { animation: nervous-shake 0.15s ease-in-out infinite !important; }
      `}</style>

      <h1 style={{ fontSize: '48px', fontWeight: '900', letterSpacing: '2px', marginBottom: '20px', textTransform: 'uppercase', opacity: selectedId ? 0 : 1, transition: 'opacity 0.6s' }}>MOOD BOARD</h1>
      <p style={{ fontSize: '14px', color: '#999', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '80px', opacity: selectedId ? 0 : 1, transition: 'opacity 0.6s' }}>Vælg bruger</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '40px', maxWidth: '1200px', width: '100%', marginBottom: '80px' }}>
        {customers.map((c: any, idx: number) => {
          const isNervous = hoveredId === c.id && !selectedId
          const isFalling = selectedId !== null && selectedId !== c.id
          const isSelected = selectedId === c.id
          const rotation = rotationsRef.current[c.id] || 0

          const wrapClasses = [
            !selectedId ? `float-${idx % 6}` : '',
            isNervous ? 'is-nervous' : ''
          ].filter(Boolean).join(' ')

          const fallOffsetX = (Math.sin(idx * 2.3) * 100)
          const fallRotation = 45 + (idx * 37) % 90

          const fallTransform = isFalling
            ? `translate(${fallOffsetX}px, 120vh) rotate(${fallRotation}deg)`
            : ''

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
                transform: fallTransform || undefined,
                transition: isFalling ? 'transform 1.4s cubic-bezier(0.55, 0.05, 0.6, 0.95), opacity 1.4s ease-in' : undefined,
                opacity: isFalling ? 0 : 1,
                zIndex: isSelected ? 100 : 1
              }}
            >
              <div
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
                  transform: `rotate(${rotation}deg)`,
                  willChange: 'transform'
                }}
              >
                {c.logoUrl ? <img src={c.logoUrl} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '48px', color: '#666' }}>{c.name.charAt(0)}</span>}
              </div>
              <p style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', opacity: isFalling ? 0 : 1, transition: 'opacity 0.4s' }}>{c.name}</p>
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
