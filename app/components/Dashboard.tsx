'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Dashboard() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', clientName: '', startDate: '', endDate: '', logoUrl: '' })

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/projects')
        const data = await res.json()
        setProjects(data || [])
      } catch (e) { console.error('Load projects error:', e) }
      setLoading(false)
    }
    load()
  }, [])

  async function createProject(e: any) {
    e.preventDefault()
    if (!form.name) return
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, status: 'active' })
      })
      const newProject = await res.json()
      setProjects([...projects, newProject])
      setForm({ name: '', description: '', clientName: '', startDate: '', endDate: '', logoUrl: '' })
      setShowForm(false)
    } catch (e) { console.error('Create project error:', e) }
  }

  function closeForm() {
    setShowForm(false)
    setForm({ name: '', description: '', clientName: '', startDate: '', endDate: '', logoUrl: '' })
  }

  async function deleteProject(id: string, e: any) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete project?')) return
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      setProjects(projects.filter(p => p.id !== id))
    } catch (e) { console.error('Delete error:', e) }
  }

  if (loading) return <div style={{ padding: '80px', textAlign: 'center', backgroundColor: '#000', color: '#fff', minHeight: '100vh' }}>LOADING</div>

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '60px 40px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '80px', borderBottom: '1px solid #333', paddingBottom: '60px' }}>
          <h1 style={{ fontSize: '56px', fontWeight: '900', letterSpacing: '2px', marginBottom: '20px', textTransform: 'uppercase' }}>MOOD BOARD</h1>
          <p style={{ fontSize: '14px', color: '#999', letterSpacing: '1px', textTransform: 'uppercase' }}>Project Planning & Booking</p>
        </div>

        {/* New Project Button */}
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)} 
            style={{ 
              padding: '16px 32px', 
              backgroundColor: 'transparent', 
              border: '1px solid #fff', 
              color: '#fff', 
              cursor: 'pointer', 
              fontSize: '12px',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              fontWeight: 'bold',
              marginBottom: '60px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#111' }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            + New Project
          </button>
        )}

        {/* Form */}
        {showForm && (
          <form onSubmit={createProject} style={{ marginBottom: '60px', maxWidth: '600px' }}>
            <div style={{ marginBottom: '30px' }}>
              <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>Project Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '14px', outline: 'none' }} required />
            </div>
            <div style={{ marginBottom: '30px' }}>
              <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '14px', outline: 'none', minHeight: '60px', fontFamily: 'inherit', resize: 'none' }} />
            </div>
            <div style={{ marginBottom: '30px' }}>
              <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>Client Name</label>
              <input type="text" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '14px', outline: 'none' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>Start Date</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '14px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>End Date</label>
                <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '14px', outline: 'none' }} />
              </div>
            </div>
            <div style={{ marginBottom: '40px' }}>
              <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>Logo URL</label>
              <input type="url" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '14px', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <button type="submit" style={{ padding: '12px 24px', backgroundColor: '#fff', border: 'none', color: '#000', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.opacity = '0.8' }} onMouseOut={(e) => { e.currentTarget.style.opacity = '1' }}>Create</button>
              <button type="button" onClick={closeForm} style={{ padding: '12px 24px', backgroundColor: 'transparent', border: '1px solid #333', color: '#999', cursor: 'pointer', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff' }} onMouseOut={(e) => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#999' }}>Cancel</button>
            </div>
          </form>
        )}

        {/* Projects Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '40px' }}>
          {projects.map((project: any) => (
            <Link key={project.id} href={`/project/${project.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ backgroundColor: 'transparent', border: '1px solid #333', padding: '0', cursor: 'pointer', transition: 'all 0.3s', position: 'relative', group: 'true' }}>
                {project.logoUrl && (
                  <img src={project.logoUrl} alt={project.name} style={{ width: '100%', height: '160px', objectFit: 'cover' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                )}
                <div style={{ padding: '30px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '900', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>{project.name}</h3>
                  <p style={{ color: '#999', fontSize: '12px', marginBottom: '15px', lineHeight: '1.6' }}>{project.description}</p>
                  <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '20px' }}>{project.clientName}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid #333' }}>
                    <span style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{project.status}</span>
                    <button 
                      onClick={(e) => deleteProject(project.id, e)}
                      style={{ padding: '6px 12px', backgroundColor: 'transparent', border: '1px solid #666', color: '#999', cursor: 'pointer', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', transition: 'all 0.2s' }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff' }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = '#666'; e.currentTarget.style.color = '#999' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {projects.length === 0 && !showForm && (
          <div style={{ textAlign: 'center', paddingTop: '60px' }}>
            <p style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>No projects yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
