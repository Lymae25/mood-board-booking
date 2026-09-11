'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AdminPanel() {
  const [customers, setCustomers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [customerForm, setCustomerForm] = useState({ name: '', logoUrl: '', pin: '' })
  const [projectForm, setProjectForm] = useState({ customerId: '', name: '', description: '', clientName: '', logoUrl: '', startDate: '', endDate: '' })
  const router = useRouter()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [c, p] = await Promise.all([
      fetch('/api/customers?admin=1010').then(r => r.json()),
      fetch('/api/projects').then(r => r.json())
    ])
    setCustomers(c || [])
    setProjects(p || [])
    setLoading(false)
  }

  async function createCustomer(e: any) {
    e.preventDefault()
    if (!customerForm.name || !customerForm.pin || customerForm.pin.length !== 4) return
    await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(customerForm) })
    setCustomerForm({ name: '', logoUrl: '', pin: '' })
    setShowCustomerForm(false)
    loadData()
  }

  async function createProject(e: any) {
    e.preventDefault()
    if (!projectForm.name || !projectForm.customerId) return
    await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...projectForm, status: 'active' }) })
    setProjectForm({ customerId: '', name: '', description: '', clientName: '', logoUrl: '', startDate: '', endDate: '' })
    setShowProjectForm(false)
    loadData()
  }

  async function deleteCustomer(id: string) {
    if (!confirm('Slet kunde og alle deres projekter?')) return
    await fetch(`/api/customers/${id}`, { method: 'DELETE' })
    loadData()
  }

  async function deleteProject(id: string) {
    if (!confirm('Slet projekt?')) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    loadData()
  }

  if (loading) return <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>LOADING</div>

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '60px 40px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '60px', borderBottom: '1px solid #333', paddingBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '48px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>ADMIN</h1>
            <p style={{ fontSize: '12px', color: '#999', letterSpacing: '1px', textTransform: 'uppercase' }}>Chrome Vault Studios</p>
          </div>
          <button onClick={() => router.push('/')} style={{ padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid #333', color: '#999', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>Log ud</button>
        </div>

        {/* KUNDER */}
        <div style={{ marginBottom: '80px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase' }}>Kunder</h2>
            {!showCustomerForm && <button onClick={() => setShowCustomerForm(true)} style={{ padding: '12px 24px', backgroundColor: 'transparent', border: '1px solid #fff', color: '#fff', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 'bold' }}>+ Ny Kunde</button>}
          </div>

          {showCustomerForm && (
            <form onSubmit={createCustomer} style={{ marginBottom: '40px', maxWidth: '600px', border: '1px solid #333', padding: '30px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>Kunde Navn</label>
                <input type="text" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '14px', outline: 'none' }} required />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>Logo URL</label>
                <input type="url" value={customerForm.logoUrl} onChange={(e) => setCustomerForm({ ...customerForm, logoUrl: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '14px', outline: 'none' }} />
              </div>
              <div style={{ marginBottom: '30px' }}>
                <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>PIN (4 cifre)</label>
                <input type="password" value={customerForm.pin} onChange={(e) => setCustomerForm({ ...customerForm, pin: e.target.value })} maxLength={4} pattern="[0-9]{4}" style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '14px', outline: 'none' }} required />
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <button type="submit" style={{ padding: '12px 24px', backgroundColor: '#fff', border: 'none', color: '#000', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>Opret</button>
                <button type="button" onClick={() => setShowCustomerForm(false)} style={{ padding: '12px 24px', backgroundColor: 'transparent', border: '1px solid #333', color: '#999', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>Annuller</button>
              </div>
            </form>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {customers.map((c: any) => (
              <div key={c.id} style={{ border: '1px solid #333', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '1px solid #333', overflow: 'hidden', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {c.logoUrl ? <img src={c.logoUrl} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '20px', color: '#666' }}>{c.name.charAt(0)}</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>{c.name}</h3>
                  <p style={{ fontSize: '11px', color: '#666' }}>PIN: {c.pin}</p>
                </div>
                <button onClick={() => deleteCustomer(c.id)} style={{ padding: '6px 12px', backgroundColor: 'transparent', border: '1px solid #666', color: '#999', cursor: 'pointer', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase' }}>Slet</button>
              </div>
            ))}
          </div>
        </div>

        {/* PROJEKTER */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase' }}>Projekter</h2>
            {!showProjectForm && customers.length > 0 && <button onClick={() => setShowProjectForm(true)} style={{ padding: '12px 24px', backgroundColor: 'transparent', border: '1px solid #fff', color: '#fff', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 'bold' }}>+ Nyt Projekt</button>}
          </div>

          {showProjectForm && (
            <form onSubmit={createProject} style={{ marginBottom: '40px', maxWidth: '600px', border: '1px solid #333', padding: '30px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>Kunde</label>
                <select value={projectForm.customerId} onChange={(e) => setProjectForm({ ...projectForm, customerId: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '14px', outline: 'none' }} required>
                  <option value="" style={{ backgroundColor: '#000' }}>Vælg kunde</option>
                  {customers.map((c: any) => <option key={c.id} value={c.id} style={{ backgroundColor: '#000' }}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>Projekt Navn</label>
                <input type="text" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '14px', outline: 'none' }} required />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>Beskrivelse</label>
                <textarea value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '14px', outline: 'none', minHeight: '60px', fontFamily: 'inherit', resize: 'none' }} />
              </div>
              <div style={{ marginBottom: '30px' }}>
                <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>Logo URL</label>
                <input type="url" value={projectForm.logoUrl} onChange={(e) => setProjectForm({ ...projectForm, logoUrl: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '14px', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <button type="submit" style={{ padding: '12px 24px', backgroundColor: '#fff', border: 'none', color: '#000', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>Opret</button>
                <button type="button" onClick={() => setShowProjectForm(false)} style={{ padding: '12px 24px', backgroundColor: 'transparent', border: '1px solid #333', color: '#999', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>Annuller</button>
              </div>
            </form>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {projects.map((p: any) => {
              const customer = customers.find((c: any) => c.id === p.customerId)
              return (
                <div key={p.id} style={{ border: '1px solid #333' }}>
                  {p.logoUrl && <img src={p.logoUrl} alt={p.name} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />}
                  <div style={{ padding: '20px' }}>
                    <p style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>{customer?.name || 'Ingen kunde'}</p>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>{p.name}</h3>
                    <p style={{ fontSize: '12px', color: '#999', marginBottom: '15px' }}>{p.description}</p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <Link href={`/project/${p.id}`} style={{ padding: '6px 12px', backgroundColor: 'transparent', border: '1px solid #666', color: '#999', textDecoration: 'none', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase' }}>Åbn</Link>
                      <button onClick={() => deleteProject(p.id)} style={{ padding: '6px 12px', backgroundColor: 'transparent', border: '1px solid #666', color: '#999', cursor: 'pointer', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase' }}>Slet</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
