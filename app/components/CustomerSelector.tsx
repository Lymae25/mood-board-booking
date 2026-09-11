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
  const router = useRouter()

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(data => { setCustomers(data || []); setLoading(false) })
  }, [])

  function checkAdminPin() {
    if (adminPin === '1010') { router.push('/admin') } else { setError('Forkert kode'); setTimeout(() => setError(''), 2000) }
  }

  if (loading) return <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>LOADING</div>

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`
        @keyframes spin-slow-1 { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes spin-slow-2 { 0% { transform: rotate(0deg); } 100% { transform: rotate(-360deg); } }
        @keyframes spin-medium { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes float-1 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes float-2 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
        @keyframes float-3 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
        @keyframes shake {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          10% { transform: translate(-2px, -1px) rotate(-1deg); }
          20% { transform: translate(2px, 1px) rotate(1deg); }
          30% { transform: translate(-2px, 1px) rotate(-1deg); }
          40% { transform: translate(2px, -1px) rotate(1deg); }
          50% { transform: translate(-1px, 2px) rotate(-0.5deg); }
          60% { transform: translate(1px, -2px) rotate(0.5deg); }
          70% { transform: translate(-2px, -1px) rotate(-1deg); }
          80% { transform: translate(2px, 1px) rotate(1deg); }
          90% { transform: translate(-1px, -1px) rotate(-0.5deg); }
        }
        .circle-wrap-0 { animation: float-1 4s ease-in-out infinite; }
        .circle-wrap-1 { animation: float-2 5s ease-in-out infinite; }
        .circle-wrap-2 { animation: float-3 3.5s ease-in-out infinite; }
        .circle-wrap-3 { animation: float-1 4.5s ease-in-out infinite; }
        .circle-wrap-4 { animation: float-2 5.5s ease-in-out infinite; }
        .circle-wrap-5 { animation: float-3 4s ease-in-out infinite; }
        .circle-spin-0 { animation: spin-slow-1 20s linear infinite; }
        .circle-spin-1 { animation: spin-slow-2 25s linear infinite; }
        .circle-spin-2 { animation: spin-medium 18s linear infinite; }
        .circle-spin-3 { animation: spin-slow-1 30s linear infinite; }
        .circle-spin-4 { animation: spin-slow-2 22s linear infinite; }
        .circle-spin-5 { animation: spin-medium 28s linear infinite; }
        .is-hovered .circle-spin { animation-play-state: paused !important; }
        .is-hovered { animation-play-state: paused !important; }
        .is-scared { animation: shake 0.3s ease-in-out infinite !important; }
        .is-scared .circle-spin { animation-play-state: paused !important; }
      `}</style>

      <h1 style={{ fontSize: '48px', fontWeight: '900', letterSpacing: '2px', marginBottom: '20px', textTransform: 'uppercase' }}>MOOD BOARD</h1>
      <p style={{ fontSize: '14px', color: '#999', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '80px' }}>Vælg bruger</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '40px', maxWidth: '1200px', width: '100%', marginBottom: '80px' }}>
        {customers.map((c: any, idx: number) => {
          const isHovered = hoveredId === c.id
          const isScared = hoveredId !== null && hoveredId !== c.id
          const wrapClass = `circle-wrap-${idx % 6}${isHovered ? ' is-hovered' : ''}${isScared ? ' is-scared' : ''}`
          return (
            <div
              key={c.id}
              onClick={() => router.push(`/pin/${c.id}`)}
              onMouseEnter={() => setHoveredId(c.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={wrapClass}
              style={{ cursor: 'pointer', textAlign: 'center', transition: 'transform 0.4s ease-out', transform: isHovered ? 'scale(1.35)' : 'scale(1)', zIndex: isHovered ? 10 : 1, position: 'relative' }}
            >
              <div
                className={`circle-spin circle-spin-${idx % 6}`}
                style={{
                  width: '160px',
                  height: '160px',
                  borderRadius: '50%',
                  border: isHovered ? '3px solid #fff' : '2px solid #333',
                  overflow: 'hidden',
                  margin: '0 auto 20px',
                  backgroundColor: '#111',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isHovered ? '0 0 40px rgba(255,255,255,0.3), 0 0 80px rgba(255,255,255,0.1)' : 'none',
                  transition: 'border 0.3s, box-shadow 0.3s'
                }}
              >
                {c.logoUrl ? <img src={c.logoUrl} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '48px', color: '#666' }}>{c.name.charAt(0)}</span>}
              </div>
              <p style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: isHovered ? '#fff' : (isScared ? '#666' : '#fff'), transition: 'color 0.3s' }}>{c.name}</p>
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
