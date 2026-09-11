'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import StatusBadge, { STATUSES, getStatusStyle } from './StatusBadge'

export default function AdminPanel() {
  const [customers, setCustomers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [customerForm, setCustomerForm] = useState({ name: '', logoUrl: '', pin: '' })
  const [projectForm, setProjectForm] = useState({ customerId: '', name: '', description: '', clientName: '', logoUrl: '', startDate: '', endDate: '' })
  const [view, setView] = useState<'overview' | 'manage'>('overview')
  const [filterStatus, setFilterStatus] = useState<string>('all')
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
    await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...projectForm, status: 'new' }) })
    setProjectForm({ customerId: '', name: '', description: '', clientName: '', logoUrl: '', startDate: '', endDate: '' })
    setShowProjectForm(false)
    loadData()
  }

  async function deleteCustomer(id: string, e: any) {
    e.stopPropagation()
    if (!confirm('Slet kunde og alle deres projekter?')) return
    await fetch(`/api/customers/${id}`, { method: 'DELETE' })
    loadData()
  }

  async function deleteProject(id: string) {
    if (!confirm('Slet projekt?')) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    loadData()
  }

  function daysUntil(dateStr: string) {
    if (!dateStr) return null
    const target = new Date(dateStr)
    const now = new Date()
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  // Sort projects: overdue first, then by deadline ascending, then by createdAt
  const sortedProjects = [...projects].sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1
    if (b.status === 'done' && a.status !== 'done') return -1
    if (a.endDate && b.endDate) return new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
    if (a.endDate) return -1
    if (b.endDate) return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const filteredProjects = filterStatus === 'all' ? sortedProjects : sortedProjects.filter(p => p.status === filterStatus)

  // Stats
  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status !== 'done').length,
    urgent: projects.filter(p => { const d = daysUntil(p.endDate); return d !== null && d <= 7 && p.status !== 'done' }).length,
    overdue: projects.filter(p => { const d = daysUntil(p.endDate); return d !== null && d < 0 && p.status !== 'done' }).length,
    done: projects.filter(p => p.status === 'done').length
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

        {/* View toggle */}
        <div style={{ borderBottom: '1px solid #333', marginBottom: '40px' }}>
          <button onClick={() => setView('overview')} style={{ padding: '15px 0', marginRight: '40px', backgroundColor: 'transparent', border: 'none', color: view === 'overview' ? '#fff' : '#666', cursor: 'pointer', fontSize: '13px', fontWeight: view === 'overview' ? '900' : 'normal', letterSpacing: '1px', textTransform: 'uppercase', borderBottom: view === 'overview' ? '2px solid #fff' : '2px solid transparent' }}>Overblik</button>
          <button onClick={() => setView('manage')} style={{ padding: '15px 0', marginRight: '40px', backgroundColor: 'transparent', border: 'none', color: view === 'manage' ? '#fff' : '#666', cursor: 'pointer', fontSize: '13px', fontWeight: view === 'manage' ? '900' : 'normal', letterSpacing: '1px', textTransform: 'uppercase', borderBottom: view === 'manage' ? '2px solid #fff' : '2px solid transparent' }}>Håndter Kunder</button>
        </div>

        {view === 'overview' && (
          <div>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '50px' }}>
              <div style={{ padding: '25px', border: '1px solid #333' }}>
                <p style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Total Projekter</p>
                <p style={{ fontSize: '36px', fontWeight: '900' }}>{stats.total}</p>
              </div>
              <div style={{ padding: '25px', border: '1px solid #333' }}>
                <p style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Aktive</p>
                <p style={{ fontSize: '36px', fontWeight: '900', color: '#60a5fa' }}>{stats.active}</p>
              </div>
              <div style={{ padding: '25px', border: `1px solid ${stats.urgent > 0 ? '#fbbf24' : '#333'}` }}>
                <p style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>⚠ Deadline &lt; 7 dage</p>
                <p style={{ fontSize: '36px', fontWeight: '900', color: stats.urgent > 0 ? '#fbbf24' : '#fff' }}>{stats.urgent}</p>
              </div>
              <div style={{ padding: '25px', border: `1px solid ${stats.overdue > 0 ? '#ff6666' : '#333'}` }}>
                <p style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>🔴 Forsinket</p>
                <p style={{ fontSize: '36px', fontWeight: '900', color: stats.overdue > 0 ? '#ff6666' : '#fff' }}>{stats.overdue}</p>
              </div>
              <div style={{ padding: '25px', border: '1px solid #333' }}>
                <p style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>✓ Færdige</p>
                <p style={{ fontSize: '36px', fontWeight: '900', color: '#4ade80' }}>{stats.done}</p>
              </div>
            </div>

            {/* Filter */}
            <div style={{ marginBottom: '30px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginRight: '10px' }}>Filter:</span>
              <button onClick={() => setFilterStatus('all')} style={{ padding: '6px 14px', backgroundColor: filterStatus === 'all' ? '#fff' : 'transparent', color: filterStatus === 'all' ? '#000' : '#999', border: '1px solid #333', cursor: 'pointer', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Alle</button>
              {STATUSES.map(s => (
                <button key={s.key} onClick={() => setFilterStatus(s.key)} style={{ padding: '6px 14px', backgroundColor: filterStatus === s.key ? s.bg : 'transparent', color: filterStatus === s.key ? s.color : '#999', border: `1px solid ${filterStatus === s.key ? s.color : '#333'}`, cursor: 'pointer', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>{s.label}</button>
              ))}
            </div>

            {/* Projects table/list */}
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '20px' }}>Projekter</h2>
              {filteredProjects.length === 0 ? (
                <p style={{ color: '#666', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Ingen projekter matcher filtret</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredProjects.map((p: any) => {
                    const customer = customers.find((c: any) => c.id === p.customerId)
                    const days = daysUntil(p.endDate)
                    const urgent = days !== null && days <= 7 && p.status !== 'done'
                    const overdue = days !== null && days < 0 && p.status !== 'done'
                    return (
                      <div key={p.id} style={{ padding: '20px', border: `1px solid ${overdue ? '#ff6666' : urgent ? '#fbbf24' : '#333'}`, display: 'grid', gridTemplateColumns: '60px 1fr auto auto auto', gap: '20px', alignItems: 'center' }}>
                        {customer?.logoUrl ? (
                          <img src={customer.logoUrl} alt={customer.name} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #333' }} />
                        ) : (
                          <div style={{ width: '50px', height: '50px', borderRadius: '50%', border: '1px solid #333', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '18px', color: '#666' }}>{customer?.name.charAt(0) || '?'}</span>
                          </div>
                        )}
                        <div>
                          <p style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{customer?.name || 'Ingen kunde'}</p>
                          <h3 style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{p.name}</h3>
                          {p.description && <p style={{ fontSize: '11px', color: '#999' }}>{p.description}</p>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {p.endDate ? (
                            <>
                              <p style={{ fontSize: '11px', color: overdue ? '#ff6666' : urgent ? '#fbbf24' : '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Deadline</p>
                              <p style={{ fontSize: '13px', color: overdue ? '#ff6666' : urgent ? '#fbbf24' : '#fff', fontWeight: 'bold' }}>{new Date(p.endDate).toLocaleDateString('da-DK')}</p>
                              {days !== null && (
                                <p style={{ fontSize: '10px', color: overdue ? '#ff6666' : urgent ? '#fbbf24' : '#666', marginTop: '2px' }}>
                                  {days > 0 ? `${days} dage` : days === 0 ? 'I dag' : `${Math.abs(days)} dage forsinket`}
                                </p>
                              )}
                            </>
                          ) : (
                            <p style={{ fontSize: '11px', color: '#666' }}>Ingen deadline</p>
                          )}
                        </div>
                        <StatusBadge projectId={p.id} status={p.status} onUpdate={loadData} />
                        <Link href={`/project/${p.id}`} style={{ padding: '8px 14px', backgroundColor: 'transparent', border: '1px solid #666', color: '#999', textDecoration: 'none', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase' }}>Åbn</Link>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'manage' && (
          <div>
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
                  <div key={c.id} onClick={() => router.push(`/customer/${c.id}`)} style={{ border: '1px solid #333', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.borderColor = '#fff' }} onMouseOut={(e) => { e.currentTarget.style.borderColor = '#333' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '1px solid #333', overflow: 'hidden', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {c.logoUrl ? <img src={c.logoUrl} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '20px', color: '#666' }}>{c.name.charAt(0)}</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>{c.name}</h3>
                      <p style={{ fontSize: '11px', color: '#666' }}>PIN: {c.pin}</p>
                    </div>
                    <button onClick={(e) => deleteCustomer(c.id, e)} style={{ padding: '6px 12px', backgroundColor: 'transparent', border: '1px solid #666', color: '#999', cursor: 'pointer', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase' }}>Slet</button>
                  </div>
                ))}
              </div>
            </div>

            {/* PROJEKTER */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase' }}>Alle Projekter</h2>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>Start Dato</label>
                      <input type="date" value={projectForm.startDate} onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '14px', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>Deadline</label>
                      <input type="date" value={projectForm.endDate} onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '14px', outline: 'none' }} />
                    </div>
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
                        <div style={{ marginBottom: '15px' }}>
                          <StatusBadge projectId={p.id} status={p.status} onUpdate={loadData} />
                        </div>
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
        )}
      </div>
    </div>
  )
}
