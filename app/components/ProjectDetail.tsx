'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Project, Idea, TimelineItem } from '@/lib/db'

interface ProjectDetailProps {
  projectId: string
}

export default function ProjectDetail({ projectId }: ProjectDetailProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'mood-board' | 'timeline'>('mood-board')
  const [showIdeaForm, setShowIdeaForm] = useState(false)
  const [showTimelineForm, setShowTimelineForm] = useState(false)
  
  const [ideaForm, setIdeaForm] = useState({
    title: '',
    description: '',
    category: '',
    imageUrl: ''
  })
  
  const [timelineForm, setTimelineForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    status: 'pending' as 'pending' | 'in-progress' | 'completed'
  })

  useEffect(() => {
    fetchData()
  }, [projectId])

  async function fetchData() {
    try {
      const projectRes = await fetch('/api/projects')
      const projects = await projectRes.json()
      const found = projects.find((p: Project) => p.id === projectId)
      setProject(found)

      const ideasRes = await fetch(`/api/ideas?projectId=${projectId}`)
      setIdeas(await ideasRes.json())

      const timelineRes = await fetch(`/api/timeline?projectId=${projectId}`)
      setTimeline(await timelineRes.json())
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddIdea(e: React.FormEvent) {
    e.preventDefault()
    if (!ideaForm.title) return

    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, ...ideaForm })
      })
      const newIdea = await res.json()
      setIdeas([...ideas, newIdea])
      setIdeaForm({ title: '', description: '', category: '', imageUrl: '' })
      setShowIdeaForm(false)
    } catch (error) {
      console.error('Failed to add idea:', error)
    }
  }

  async function handleAddTimeline(e: React.FormEvent) {
    e.preventDefault()
    if (!timelineForm.title || !timelineForm.dueDate) return

    try {
      const res = await fetch('/api/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, ...timelineForm })
      })
      const newItem = await res.json()
      setTimeline([...timeline, newItem])
      setTimelineForm({ title: '', description: '', dueDate: '', status: 'pending' })
      setShowTimelineForm(false)
    } catch (error) {
      console.error('Failed to add timeline item:', error)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Project not found</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Back Button */}
        <Link href="/" style={{ color: '#999', textDecoration: 'none', fontSize: '12px', marginBottom: '40px', display: 'block' }}>
          ← BACK TO PROJECTS
        </Link>

        {/* Project Header */}
        <div style={{ backgroundColor: '#111', border: '1px solid #333', padding: '50px', marginBottom: '50px' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 'bold', marginBottom: '20px', letterSpacing: '1px' }}>
            {project.name}
          </h1>
          <p style={{ fontSize: '15px', color: '#aaa', marginBottom: '30px', lineHeight: '1.6', maxWidth: '800px' }}>
            {project.description}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '30px', fontSize: '12px' }}>
            <div>
              <p style={{ color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Client</p>
              <p style={{ color: '#fff', fontWeight: 'bold' }}>{project.clientName || 'N/A'}</p>
            </div>
            <div>
              <p style={{ color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</p>
              <p style={{ color: '#fff', fontWeight: 'bold', textTransform: 'capitalize' }}>{project.status}</p>
            </div>
            <div>
              <p style={{ color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Period</p>
              <p style={{ color: '#fff', fontWeight: 'bold' }}>
                {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'TBD'} - {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'TBD'}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '30px', borderBottom: '2px solid #222', marginBottom: '50px' }}>
          <button
            onClick={() => setActiveTab('mood-board')}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: activeTab === 'mood-board' ? '#fff' : '#666',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              padding: '15px 0',
              borderBottom: activeTab === 'mood-board' ? '3px solid #fff' : 'none',
              marginBottom: '-2px'
            }}
          >
            Mood Board
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: activeTab === 'timeline' ? '#fff' : '#666',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              padding: '15px 0',
              borderBottom: activeTab === 'timeline' ? '3px solid #fff' : 'none',
              marginBottom: '-2px'
            }}
          >
            Timeline
          </button>
        </div>

        {/* Mood Board Tab */}
        {activeTab === 'mood-board' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Ideas
              </h2>
              <button
                onClick={() => setShowIdeaForm(!showIdeaForm)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#111',
                  color: '#fff',
                  border: '1px solid #444',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                {showIdeaForm ? 'CANCEL' : 'ADD IDEA'}
              </button>
            </div>

            {/* Add Idea Form */}
            {showIdeaForm && (
              <div style={{ backgroundColor: '#111', border: '1px solid #333', padding: '40px', marginBottom: '40px' }}>
                <form onSubmit={handleAddIdea} style={{ display: 'grid', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                      Title
                    </label>
                    <input
                      type="text"
                      value={ideaForm.title}
                      onChange={(e) => setIdeaForm({ ...ideaForm, title: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#000',
                        border: '1px solid #333',
                        color: '#fff',
                        fontSize: '14px'
                      }}
                      placeholder="Idea title"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                      Description
                    </label>
                    <textarea
                      value={ideaForm.description}
                      onChange={(e) => setIdeaForm({ ...ideaForm, description: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#000',
                        border: '1px solid #333',
                        color: '#fff',
                        fontSize: '14px',
                        minHeight: '80px',
                        fontFamily: 'inherit',
                        resize: 'vertical'
                      }}
                      placeholder="Describe the idea"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                      Category
                    </label>
                    <input
                      type="text"
                      value={ideaForm.category}
                      onChange={(e) => setIdeaForm({ ...ideaForm, category: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#000',
                        border: '1px solid #333',
                        color: '#fff',
                        fontSize: '14px'
                      }}
                      placeholder="e.g., Color, Typography, Layout"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                      Image URL
                    </label>
                    <input
                      type="url"
                      value={ideaForm.imageUrl}
                      onChange={(e) => setIdeaForm({ ...ideaForm, imageUrl: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#000',
                        border: '1px solid #333',
                        color: '#fff',
                        fontSize: '14px'
                      }}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <button
                    type="submit"
                    style={{
                      padding: '12px',
                      backgroundColor: '#222',
                      color: '#fff',
                      border: '1px solid #444',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}
                  >
                    Create Idea
                  </button>
                </form>
              </div>
            )}

            {/* Ideas Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', marginBottom: '60px' }}>
              {ideas.map((idea) => (
                <div key={idea.id} style={{ backgroundColor: '#111', border: '1px solid #333', overflow: 'hidden' }}>
                  {idea.imageUrl && (
                    <div style={{ height: '200px', overflow: 'hidden', backgroundColor: '#000' }}>
                      <img
                        src={idea.imageUrl}
                        alt={idea.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <div style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
                      {idea.title}
                    </h3>
                    <p style={{ fontSize: '13px', color: '#999', marginBottom: '15px', lineHeight: '1.5' }}>
                      {idea.description}
                    </p>
                    <span style={{ display: 'inline-block', fontSize: '10px', color: '#999', border: '1px solid #444', padding: '6px 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {idea.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {ideas.length === 0 && !showIdeaForm && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
                <p style={{ fontSize: '14px' }}>No ideas yet. Add one to build your mood board!</p>
              </div>
            )}
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Timeline
              </h2>
              <button
                onClick={() => setShowTimelineForm(!showTimelineForm)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#111',
                  color: '#fff',
                  border: '1px solid #444',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                {showTimelineForm ? 'CANCEL' : 'ADD MILESTONE'}
              </button>
            </div>

            {/* Add Timeline Form */}
            {showTimelineForm && (
              <div style={{ backgroundColor: '#111', border: '1px solid #333', padding: '40px', marginBottom: '40px' }}>
                <form onSubmit={handleAddTimeline} style={{ display: 'grid', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                      Milestone Title
                    </label>
                    <input
                      type="text"
                      value={timelineForm.title}
                      onChange={(e) => setTimelineForm({ ...timelineForm, title: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#000',
                        border: '1px solid #333',
                        color: '#fff',
                        fontSize: '14px'
                      }}
                      placeholder="Milestone title"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                      Description
                    </label>
                    <textarea
                      value={timelineForm.description}
                      onChange={(e) => setTimelineForm({ ...timelineForm, description: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#000',
                        border: '1px solid #333',
                        color: '#fff',
                        fontSize: '14px',
                        minHeight: '80px',
                        fontFamily: 'inherit',
                        resize: 'vertical'
                      }}
                      placeholder="What needs to be done"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={timelineForm.dueDate}
                        onChange={(e) => setTimelineForm({ ...timelineForm, dueDate: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px',
                          backgroundColor: '#000',
                          border: '1px solid #333',
                          color: '#fff',
                          fontSize: '14px'
                        }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                        Status
                      </label>
                      <select
                        value={timelineForm.status}
                        onChange={(e) => setTimelineForm({ ...timelineForm, status: e.target.value as any })}
                        style={{
                          width: '100%',
                          padding: '12px',
                          backgroundColor: '#000',
                          border: '1px solid #333',
                          color: '#fff',
                          fontSize: '14px',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    style={{
                      padding: '12px',
                      backgroundColor: '#222',
                      color: '#fff',
                      border: '1px solid #444',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}
                  >
                    Create Milestone
                  </button>
                </form>
              </div>
            )}

            {/* Timeline Items */}
            <div style={{ display: 'grid', gap: '20px', marginBottom: '60px' }}>
              {timeline.map((item, index) => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', alignItems: 'start' }}>
                  <div style={{ backgroundColor: '#111', border: '1px solid #333', padding: '30px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
                      {item.title}
                    </h3>
                    <p style={{ fontSize: '13px', color: '#999', marginBottom: '15px', lineHeight: '1.5' }}>
                      {item.description}
                    </p>
                    <p style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Due: {new Date(item.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div style={{
                    padding: '12px 16px',
                    border: '1px solid #444',
                    textAlign: 'center',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: item.status === 'completed' ? '#90EE90' : item.status === 'in-progress' ? '#FFD700' : '#999'
                  }}>
                    {item.status}
                  </div>
                </div>
              ))}
            </div>

            {timeline.length === 0 && !showTimelineForm && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
                <p style={{ fontSize: '14px' }}>No milestones yet. Add one to track progress!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
