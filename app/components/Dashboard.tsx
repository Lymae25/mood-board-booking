'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Project } from '@/lib/db'

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    clientName: '',
    startDate: '',
    endDate: ''
  })

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      setProjects(data)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, status: 'active' })
      })
      const newProject = await res.json()
      setProjects([...projects, newProject])
      setFormData({ name: '', description: '', clientName: '', startDate: '', endDate: '' })
      setShowForm(false)
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '10px' }}>MOOD BOARD</h1>
            <p style={{ fontSize: '14px', color: '#999' }}>Project Booking Overview</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '12px 24px',
              backgroundColor: '#111',
              color: '#fff',
              border: '1px solid #444',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {showForm ? 'CANCEL' : 'NEW PROJECT'}
          </button>
        </div>

        {showForm && (
          <div style={{ backgroundColor: '#111', border: '1px solid #333', padding: '40px', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '30px' }}>Create Project</h2>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
              <input
                type="text"
                placeholder="Project Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  padding: '12px',
                  backgroundColor: '#000',
                  border: '1px solid #333',
                  color: '#fff',
                  fontSize: '14px'
                }}
                required
              />
              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{
                  padding: '12px',
                  backgroundColor: '#000',
                  border: '1px solid #333',
                  color: '#fff',
                  fontSize: '14px',
                  minHeight: '80px',
                  fontFamily: 'inherit'
                }}
              />
              <input
                type="text"
                placeholder="Client Name"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                style={{
                  padding: '12px',
                  backgroundColor: '#000',
                  border: '1px solid #333',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  style={{
                    padding: '12px',
                    backgroundColor: '#000',
                    border: '1px solid #333',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  style={{
                    padding: '12px',
                    backgroundColor: '#000',
                    border: '1px solid #333',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
              </div>
              <button
                type="submit"
                style={{
                  padding: '12px',
                  backgroundColor: '#111',
                  color: '#fff',
                  border: '1px solid #444',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                CREATE
              </button>
            </form>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/project/${project.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{
                backgroundColor: '#111',
                border: '1px solid #333',
                padding: '30px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                height: '100%'
              }}
              onMouseOver={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = '#666'
                el.style.backgroundColor = '#1a1a1a'
              }}
              onMouseOut={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = '#333'
                el.style.backgroundColor = '#111'
              }}
              >
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>
                  {project.name}
                </h3>
                <p style={{ fontSize: '14px', color: '#999', marginBottom: '20px', lineHeight: '1.5' }}>
                  {project.description}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#666' }}>
                  <span>{project.clientName}</span>
                  <span style={{ border: '1px solid #555', padding: '4px 12px', color: '#aaa' }}>
                    {project.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {projects.length === 0 && !showForm && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
            <p>No projects yet. Create one to get started!</p>
          </div>
        )}
      </div>
    </div>
  )
}
