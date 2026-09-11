'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CustomerSelector() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdminPin, setShowAdminPin] = useState(false)
  const [adminPin, setAdminPin] = useState('')
  const [error, setError] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [lastHoveredId, setLastHoveredId] = useState<string | null>(null)
  const [panicPhase, setPanicPhase] = useState<'none' | 'panic' | 'slowing1' | 'slowing2' | 'slowing3'>('none')
  const router = useRouter()

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(data => { setCustomers(data || []); setLoading(false) })
  }, [])

  useEffect(() => {
    if (hoveredId) {
      setLastHoveredId(hoveredId)
      setPanicPhase('none')
    } else if (lastHoveredId) {
      setPanicPhase('panic')
      const t1 = setTimeout(() => setPanicPhase('slowing1'), 1500)
      const t2 = setTimeout(() => setPanicPhase('slowing2'), 3000)
      const t3 = setTimeout(() => setPanicPhase('slowing3'), 4500)
      const t4 = setTimeout(() => { setPanicPhase('none'); setLastHoveredId(null) }, 6500)
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
    }
  }, [hoveredId])

  function checkAdminPin() {
    if (adminPin === '1010') { router.push('/admin') } else { setError('Forkert kode'); setTimeout(() => setError(''), 2000) }
  }

  if (loading) return <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>LOADING</div>

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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
        .circle-wrap-0 { animation: float-1 4s ease-in-out infinite; }
        .circle-wrap-1 { animation: float-2 5s ease-in-out infinite; }
        .circle-wrap-2 { animation: float-3 3.5s ease-in-out infinite; }
        .circle-wrap-3 { animation: float-1 4.5s ease-in-out infinite; }
        .circle-wrap-4 { animation: float-2 5.5s ease-in-out infinite; }
        .circle-wrap-5 { animation: float-3 4s ease-in-out infinite; }

        /* Normal rotation speeds (per index % 6) */
        .spin-normal-0 { animation: spin-cw 20s linear infinite; }
        .spin-normal-1 { animation: spin-ccw 25s linear infinite; }
        .spin-normal-2 { animation: spin-cw 18s linear infinite; }
        .spin-normal-3 { animation: spin-cw 30s linear infinite; }
        .spin-normal-4 { animation: spin-ccw 22s linear infinite; }
        .spin-normal-5 { animation: spin-cw 28s linear infinite; }

        /* Panic speeds - super fast */
        .spin-panic-0 { animation: spin-cw 0.4s linear infinite !important; }
        .spin-panic-1 { animation: spin-ccw 0.5s linear infinite !important; }
        .spin-panic-2 { animation: spin-cw 0.35s linear infinite !important; }
        .spin-panic-3 { animation: spin-cw 0.45s linear infinite !important; }
        .spin-panic-4 { animation: spin-ccw 0.4s linear infinite !important; }
        .spin-panic-5 { animation: spin-cw 0.5s linear infinite !important; }

        /* Slowing phase 1 - medium fast */
        .spin-slow1-0 { animation: spin-cw 2s linear infinite !important; }
        .spin-slow1-1 { animation: spin-ccw 2.5s linear infinite !important; }
        .spin-slow1-2 { animation: spin-cw 1.8s linear infinite !important; }
        .spin-slow1-3 { animation: spin-cw 2.2s linear infinite !important; }
        .spin-slow1-4 { animation: spin-ccw 2s linear infinite !important; }
        .spin-slow1-5 { animation: spin-cw 2.5s linear infinite !important; }

        /* Slowing phase 2 - medium */
        .spin-slow2-0 { animation: spin-cw 6s linear infinite !important; }
        .spin-slow2-1 { animation: spin-ccw 7s linear infinite !important; }
        .spin-slow2-2 { animation: spin-cw 5.5s linear infinite !important; }
        .spin-slow2-3 { animation: spin-cw 8s linear infinite !important; }
        .spin-slow2-4 { animation: spin-ccw 6.5s linear infinite !important; }
        .spin-slow2-5 { animation: spin-cw 7.5s linear infinite !important; }

        /* Slowing phase 3 - almost normal */
        .spin-slow3-0 { animation: spin-cw 12s linear infinite !important; }
        .spin-slow3-1 { animation: spin-ccw 14s linear infinite !important; }
        .spin-slow3-2 { animation: spin-cw 11s linear infinite !important; }
        .spin-slow3-3 { animation: spin-cw 16s linear infinite !important; }
        .spin-slow3-4 { animation: spin-ccw 13s linear infinite !important; }
        .spin-slow3-5 { animation: spin-cw 15s linear infinite !important; }

        .is-nervous { animation: nervous-shake 0.25s ease-in-out infinite !important; }
        .is-nervous .circle-spin { animation-play-state: paused !important; }

        .circle-spin { transition: none; }
        .is-panic .circle-spin,
        .is-slow1 .circle-spin,
        .is-slow2 .circle-spin,
        .is-slow3 .circle-spin { transition: none; }
      `}</style>

      <h1 style={{ fontSize: '48px', fontWeight: '900', letterSpacing: '2px', marginBottom: '20px', textTransform: 'uppercase' }}>MOOD BOARD</h1>
      <p style={{ fontSize: '14px', color: '#999', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '80px' }}>Vælg bruger</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '40px', maxWidth: '1200px', width: '100%', marginBottom: '80px' }}>
        {customers.map((c: any, idx: number) => {
          const isNervous = hoveredId === c.id
          const affectedByPanic = panicPhase !== 'none' && c.id !== lastHoveredId
          
          let spinClass = `spin-normal-${idx % 6}`
          if (affectedByPanic) {
            if (panicPhase === 'panic') spinClass = `spin-panic-${idx % 6}`
            else if (panicPhase === 'slowing1') spinClass = `spin-slow1-${idx % 6}`
            else if (panicPhase === 'slowing2') spinClass = `spin-slow2-${idx % 6}`
            else if (panicPhase === 'slowing3') spinClass = `spin-slow3-${idx % 6}`
          }

          const wrapClass = [
            `circle-wrap-${idx % 6}`,
            isNervous ? 'is-nervous' : ''
          ].filter(Boolean).join(' ')

          return (
            <div
              key={c.id}
              onClick={() => router.push(`/pin/${c.id}`)}
              onMouseEnter={() => setHoveredId(c.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={wrapClass}
              style={{ cursor: 'pointer', textAlign: 'center', position: 'relative' }}
            >
              <div
                className={`circle-spin ${spinClass}`}
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
                  transition: 'border 0.3s'
                }}
              >
                {c.logoUrl ? <img src={c.logoUrl} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '48px', color: '#666' }}>{c.name.charAt(0)}</span>}
              </div>
              <p style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>{c.name}</p>
            </div>
          )
        })}
      </div>

      {customers.length === 0 && <p style={{ color: '#666', marginBottom: '40px' }}>Ingen brugere endnu. Login som admin for at oprette.</p>}

      {!showAdminPin && <button onClick={() => setShowAdminPin(true)} style={{ padding: '12px 24px', backgroundColor: 'transparent', border: '1px solid #333', color: '#999', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>Admin Login</button>}
      
      {showAdminPin && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          <input type="password" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && checkAdminPin()} maxLength={4} placeholder="Admin PIN" style={{ padding: '12px 24px', backgroundColor: 'transparent', border: '1px solid #333', color: '#fff', fontSize: '18px', textAlign: 'center', letterSpacing: '8px', width: '200px' }} autoFocus />
          {error && <p style={{ color: '#ff6666', fontSize: '12px' }}>{error}</p>}
          <button onClick={checkAdminPin} style={{ padding: '10px 24px', backgroundColor: '#fff', border: 'none', color: '#000', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>Login</button>
        </div>
      )}
    </div>
  )
}
