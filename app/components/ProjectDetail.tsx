'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Project, Idea, TimelineItem } from '@/lib/db'

interface ProjectDetailProps {
  projectId: string
}

interface TimelineItemWithImage extends TimelineItem {
  imageUrl?: string
}

export default function ProjectDetail({ projectId }: ProjectDetailProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [timeline, setTimeline] = useState<TimelineItemWithImage[]>([])
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
    status: 'pending' as 'pending' | 'in-progress' | 'completed',
    imageUrl: ''
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
      setTimelineForm({ title: '', description: '', dueDate: '', status: 'pending', imageUrl: '' })
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
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '60px 40px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Back Button */}
        <Link href="/" style={{ color: '#666', textDecoration: 'none', fontSize: '13px', marginBottom: '80px', display: 'block', letterSpacing: '1px' }}>
          ← BACK
        </Link>

        {/* Project Header */}
        <div style={{ marginBottom: '80px' }}>
          <h1 style={{ fontSize: '56px', fontWeight: 'bold', marginBottom: '30px', letterSpacing: '2px', lineHeight: '1.1' }}>
            {project.name}
          </h1>
          <p style={{ fontSize: '16px', color: '#aaa', marginBottom: '50px', lineHeight: '1.8', maxWidth: '700px' }}>
            {project.description}
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '50px', fontSize: '13px', marginBottom: '60px' }}>
            <div>
              <p style={{ color: '#555', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '11px' }}>Client</p>
              <p style={{ color: '#fff', fontSize: '14px' }}>{project.clientName || 'TBA'}</p>
            </div>
            <div>
              <p style={{ color: '#555', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '11px' }}>Status</p>
              <p style={{ color: '#fff', fontSize: '14px', textTransform: 'capitalize' }}>{project.status}</p>
            </div>
            <div>
              <p style={{ color: '#555', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '11px' }}>Period</p>
              <p style={{ color: '#fff', fontSize: '14px' }}>
                {project.startDate ? new Date(project.startDate).toLocaleDateString('da-DK') : 'TBA'} – {project.endDate ? new Date(project.endDate).toLocaleDateString('da-DK') : 'TBA'}
              </p>
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: '#222', marginBottom: '80px' }}></div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', marginBottom: '80px', borderBottom: '1px solid #222', paddingBottom: '60px' }}>
          <button
            onClick={() => setActiveTab('mood-board')}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: activeTab === 'mood-board' ? '#fff' : '#555',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              padding: '0',
              textAlign: 'left',
              transition: 'color 0.3s'
            }}
          >
            <span style={{ display: 'block', color: '#555', fontSize: '13px', marginBottom: '8px', letterSpacing: '2px' }}>01</span>
            Mood Board
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: activeTab === 'timeline' ? '#fff' : '#555',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              padding: '0',
              textAlign: 'left',
              transition: 'color 0.3s'
            }}
          >
            <span style={{ display: 'block', color: '#555', fontSize: '13px', marginBottom: '8px', letterSpacing: '2px' }}>02</span>
            Timeline
          </button>
        </div>

        {/* Mood Board Tab */}
        {activeTab === 'mood-board' && (
          <div style={{ marginBottom: '120px' }}>
            {!showIdeaForm && (
              <button
                onClick={() => setShowIdeaForm(true)}
                style={{
                  padding: '20px 40px',
                  backgroundColor: 'transparent',
                  color: '#fff',
                  border: '1px solid #333',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  marginBottom: '60px',
                  transition: 'all 0.3s'
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#666'
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#111'
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#333'
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                }}
              >
                + Add Idea
              </button>
            )}

            {showIdeaForm && (
              <form onSubmit={handleAddIdea} style={{ marginBottom: '80px' }}>
                <div style={{ marginBottom: '40px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#666', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
                    Title
                  </label>
                  <input
                    type="text"
                    value={ideaForm.title}
                    onChange={(e) => setIdeaForm({ ...ideaForm, title: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '16px 0',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid #333',
                      color: '#fff',
                      fontSize: '16px',
                      fontFamily: 'inherit'
                    }}
                    placeholder="Idea title"
                    required
                  />
                </div>

                <div style={{ marginBottom: '40px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#666', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
                    Description
                  </label>
                  <textarea
                    value={ideaForm.description}
                    onChange={(e) => setIdeaForm({ ...ideaForm, description: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '16px 0',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid #333',
                      color: '#fff',
                      fontSize: '16px',
                      minHeight: '60px',
                      fontFamily: 'inherit',
                      resize: 'none'
                    }}
                    placeholder="Describe the idea"
                  />
                </div>

                <div style={{ marginBottom: '40px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#666', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
                    Category
                  </label>
                  <input
                    type="text"
                    value={ideaForm.category}
                    onChange={(e) => setIdeaForm({ ...ideaForm, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '16px 0',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid #333',
                      color: '#fff',
                      fontSize: '16px',
                      fontFamily: 'inherit'
                    }}
                    placeholder="Color, Typography, Layout, etc"
                  />
                </div>

                <div style={{ marginBottom: '40px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#666', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={ideaForm.imageUrl}
                    onChange={(e) => setIdeaForm({ ...ideaForm, imageUrl: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '16px 0',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid #333',
                      color: '#fff',
                      fontSize: '16px',
                      fontFamily: 'inherit'
                    }}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div style={{ display: 'flex', gap: '20px' }}>
                  <button
                    type="submit"
                    style={{
                      padding: '16px 40px',
                      backgroundColor: 'transparent',
                      color: '#fff',
                      border: '1px solid #555',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '2px',
                      transition: 'all 0.3s'
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#fff'
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#111'
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#555'
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                    }}
                  >
                    Save Idea
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowIdeaForm(false)}
                    style={{
                      padding: '16px 40px',
                      backgroundColor: 'transparent',
                      color: '#666',
                      border: '1px solid #333',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '2px'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {ideas.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '50px' }}>
                {ideas.map((idea, idx) => (
                  <div key={idea.id}>
                    <div style={{ marginBottom: '20px' }}>
                      <span style={{ fontSize: '13px', color: '#666', textTransform: 'uppercase', letterSpacing: '2px' }}>Idea {String(idx + 1).padStart(2, '0')}</span>
                    </div>
                    {idea.imageUrl && (
                      <div style={{ height: '280px', overflow: 'hidden', marginBottom: '30px', backgroundColor: '#111' }}>
                        <img
                          src={idea.imageUrl}
                          alt={idea.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).parentElement!.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                    <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px', lineHeight: '1.3' }}>
                      {idea.title}
                    </h3>
                    <p style={{ fontSize: '14px', color: '#999', marginBottom: '20px', lineHeight: '1.6' }}>
                      {idea.description}
                    </p>
                    <p style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {idea.category}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {ideas.length === 0 && !showIdeaForm && (
              <p style={{ fontSize: '14px', color: '#666', textAlign: 'center', padding: '80px 20px' }}>
                No ideas yet. Click "Add Idea" to start building your mood board.
              </p>
            )}
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div>
            {!showTimelineForm && (
              <button
                onClick={() => setShowTimelineForm(true)}
                style={{
                  padding: '20px 40px',
                  backgroundColor: 'transparent',
                  color: '#fff',
                  border: '1px solid #333',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  marginBottom: '60px',
                  transition: 'all 0.3s'
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#666'
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#111'
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#333'
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                }}
              >
                + Add Milestone
              </button>
            )}

            {showTimelineForm && (
              <form onSubmit={handleAddTimeline} style={{ marginBottom: '80px' }}>
                <div style={{ marginBottom: '40px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#666', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
                    Title
                  </label>
                  <input
                    type="text"
                    value={timelineForm.title}
                    onChange={(e) => setTimelineForm({ ...timelineForm, title: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '16px 0',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid #333',
                      color: '#fff',
                      fontSize: '16px',
                      fontFamily: 'inherit'
                    }}
                    placeholder="Milestone title"
                    required
                  />
                </div>

                <div style={{ marginBottom: '40px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#666', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
                    Description / What's in the clip?
                  </label>
                  <textarea
                    value={timelineForm.description}
                    onChange={(e) => setTimelineForm({ ...timelineForm, description: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '16px 0',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid #333',
                      color: '#fff',
                      fontSize: '16px',
                      minHeight: '60px',
                      fontFamily: 'inherit',
                      resize: 'none'
                    }}
                    placeholder="What should be in this clip? Shots, scenes, ideas..."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', marginBottom: '40px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: '#666', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={timelineForm.dueDate}
                      onChange={(e) => setTimelineForm({ ...timelineForm, dueDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '16px 0',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid #333',
                        color: '#fff',
                        fontSize: '16px',
                        fontFamily: 'inherit',
                        cursor: 'pointer'
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: '#666', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
                      Status
                    </label>
                    <select
                      value={timelineForm.status}
                      onChange={(e) => setTimelineForm({ ...timelineForm, status: e.target.value as any })}
                      style={{
                        width: '100%',
                        padding: '16px 0',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid #333',
                        color: '#fff',
                        fontSize: '16px',
                        cursor: 'pointer',
                        fontFamily: 'inherit'
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '40px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#666', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
                    Reference Image URL (Reel preview, storyboard, etc)
                  </label>
                  <input
                    type="url"
                    value={timelineForm.imageUrl}
                    onChange={(e) => setTimelineForm({ ...timelineForm, imageUrl: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '16px 0',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid #333',
                      color: '#fff',
                      fontSize: '16px',
                      fontFamily: 'inherit'
                    }}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div style={{ display: 'flex', gap: '20px' }}>
                  <button
                    type="submit"
                    style={{
                      padding: '16px 40px',
                      backgroundColor: 'transparent',
                      color: '#fff',
                      border: '1px solid #555',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '2px',
                      transition: 'all 0.3s'
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#fff'
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#111'
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#555'
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                    }}
                  >
                    Save Milestone
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTimelineForm(false)}
                    style={{
                      padding: '16px 40px',
                      backgroundColor: 'transparent',
                      color: '#666',
                      border: '1px solid #333',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '2px'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {timeline.length > 0 && (
              <div style={{ display: 'grid', gap: '60px' }}>
                {timeline.map((item, idx) => (
                  <div key={item.id}>
                    <div style={{ marginBottom: '30px' }}>
                      <span style={{ fontSize: '13px', color: '#666', textTransform: 'uppercase', letterSpacing: '2px' }}>Milestone {String(idx + 1).padStart(2, '0')}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '50px', alignItems: 'start', marginBottom: '30px' }}>
                      <div>
                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px', lineHeight: '1.3' }}>
                          {item.title}
                        </h3>
                        <p style={{ fontSize: '14px', color: '#999', marginBottom: '20px', lineHeight: '1.6' }}>
                          {item.description}
                        </p>
                        <p style={{ fontSize: '13px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          Due {new Date(item.dueDate).toLocaleDateString('da-DK', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <div style={{
                        textAlign: 'center',
                        padding: '12px',
                        border: '1px solid #333',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        color: item.status === 'completed' ? '#aaa' : item.status === 'in-progress' ? '#999' : '#666',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.status}
                      </div>
                    </div>
                    {item.imageUrl && (
                      <div style={{ height: '300px', overflow: 'hidden', backgroundColor: '#111', marginBottom: '40px' }}>
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).parentElement!.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                    <div style={{ height: '1px', backgroundColor: '#222', marginTop: '40px' }}></div>
                  </div>
                ))}
              </div>
            )}

            {timeline.length === 0 && !showTimelineForm && (
              <p style={{ fontSize: '14px', color: '#666', textAlign: 'center', padding: '80px 20px' }}>
                No milestones yet. Click "Add Milestone" to build your timeline.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
