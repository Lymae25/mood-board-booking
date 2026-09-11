'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CustomerSelector() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdminPin, setShowAdminPin] = useState(false)
  const [adminPin, setAdminPin] = useState('')
  const [error, setError] = useState('')
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
        .circle-wrap-0:hover, .circle-wrap-1:hover, .circle-wrap-2:hover, .circle-wrap-3:hover, .circle-wrap-4:hover, .circle-wrap-5:hover { animation-play-state: paused; }
        .circle-hover:hover .circle-spin { animation-play-state: paused !important; }
      `}</style>

      <h1 style={{ fontSize: '48px', fontWeight: '900', letterSpacing: '2px', marginBottom: '20px', textTransform: 'uppercase' }}>MOOD BOARD</h1>
      <p style={{ fontSize: '14px', color: '#999', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '80px' }}>Vælg bruger</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '40px', maxWidth: '1200px', width: '100%', marginBottom: '80px' }}>
        {customers.map((c: any, idx: number) => (
          <div key={c.id} onClick={() => router.push(`/pin/${c.id}`)} className={`circle-wrap-${idx % 6} circle-hover`} style={{ cursor: 'pointer', textAlign: 'center', transition: 'all 0.3s' }} onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.1)' }} onMouseOut={(e) => { e.currentTarget.style.transform = '' }}>
            <div className={`circle-spin circle-spin-${idx % 6}`} style={{ width: '160px', height: '160px', borderRadius: '50%', border: '2px solid #333', overflow: 'hidden', margin: '0 auto 20px', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {c.logoUrl ? <img src={c.logoUrl} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '48px', color: '#666' }}>{c.name.charAt(0)}</span>}
            </div>
            <p style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>{c.name}</p>
          </div>
        ))}
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
