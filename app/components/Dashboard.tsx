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

  async function deleteProject(id: string) {
    if (!confirm('Delete this project? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setProjects(projects.filter(p => p.id !== id))
      }
    } catch (e) { console.error('Delete project error:', e) }
  }

  if (loading) return <div style={{ padding: '40px' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '40px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '40px' }}>MOOD BOARD</h1>
        <p style={{ color: '#999', marginBottom: '40px', fontSize: '14px' }}>Project Booking Overview</p>

        {!showForm && (
          <button onClick={() => setShowForm(true)} style={{ padding: '12px 24px', backgroundColor: '#111', border: '1px solid #333', color: '#fff', cursor: 'pointer', marginBottom: '40px', fontWeight: 'bold' }}>
            + NEW PROJECT
          </button>
        )}

        {showForm && (
          <form onSubmit={createProject} style={{ backgroundColor: '#111', border: '1px solid #333', padding: '30px', marginBottom: '40px', maxWidth: '500px' }}>
            <div style={{ marginBottom: '20px' }}>
              <input type="text" placeholder="Project Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', fontSize: '14px' }} required />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', fontSize: '14px', minHeight: '80px', fontFamily: 'inherit' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <input type="text" placeholder="Client Name" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', fontSize: '14px' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} style={{ padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', fontSize: '14px' }} />
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} style={{ padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', fontSize: '14px' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <input type="url" placeholder="Logo URL (optional)" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', fontSize: '14px' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#333', border: '1px solid #555', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>Create</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid #333', color: '#666', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {projects.map((project: any) => (
            <Link key={project.id} href={`/project/${project.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ backgroundColor: '#111', border: '1px solid #333', padding: '20px', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}>
                {project.logoUrl && (
                  <img src={project.logoUrl} alt={project.name} style={{ width: '100%', height: '120px', objectFit: 'cover', marginBottom: '15px' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                )}
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>{project.name}</h3>
                <p style={{ color: '#999', fontSize: '12px', marginBottom: '10px' }}>{project.description}</p>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>{project.clientName}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', border: '1px solid #666', padding: '4px 8px', color: '#999' }}>{project.status}</span>
                  <button 
                    onClick={(e) => { e.preventDefault(); deleteProject(project.id) }}
                    style={{ padding: '4px 12px', backgroundColor: '#330000', border: '1px solid #660000', color: '#ff6666', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
