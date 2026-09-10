'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function ProjectDetail({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<any>(null)
  const [ideas, setIdeas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const p = await fetch('/api/projects').then(r => r.json())
        setProject(p.find((x: any) => x.id === projectId) || null)
        const i = await fetch(`/api/ideas?projectId=${projectId}`).then(r => r.json())
        setIdeas(i || [])
      } catch (e) {}
      setLoading(false)
    }
    load()
  }, [projectId])

  if (loading) return <div style={{ padding: '40px' }}>Loading...</div>
  if (!project) return <div style={{ padding: '40px' }}>Not found</div>

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '40px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <Link href="/" style={{ color: '#999', textDecoration: 'none', marginBottom: '40px', display: 'block' }}>
          ← Back
        </Link>
        <h1 style={{ fontSize: '40px', marginBottom: '20px' }}>{project.name}</h1>
        <p style={{ color: '#aaa', marginBottom: '40px', fontSize: '16px' }}>{project.description}</p>
        <div style={{ color: '#666', fontSize: '14px' }}>
          {ideas.length} ideas saved
        </div>
      </div>
    </div>
  )
}
