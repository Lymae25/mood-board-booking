'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function ProjectDetail({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<any>(null)
  const [ideas, setIdeas] = useState<any[]>([])
  const [timeline, setTimeline] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('mood-board')
  const [showIdeaForm, setShowIdeaForm] = useState(false)
  const [showTimelineForm, setShowTimelineForm] = useState(false)
  const [ideaForm, setIdeaForm] = useState({ title: '', description: '', category: '', imageUrl: '' })
  const [timelineForm, setTimelineForm] = useState({ title: '', description: '', dueDate: '', status: 'pending', imageUrl: '' })

  useEffect(() => {
    const load = async () => {
      try {
        const p = await fetch('/api/projects').then(r => r.json())
        setProject(p.find((x: any) => x.id === projectId) || null)
        const i = await fetch(`/api/ideas?projectId=${projectId}`).then(r => r.json())
        setIdeas(i || [])
        const t = await fetch(`/api/timeline?projectId=${projectId}`).then(r => r.json())
        setTimeline(t || [])
      } catch (e) {}
      setLoading(false)
    }
    load()
  }, [projectId])

  async function addIdea(e: any) {
    e.preventDefault()
    if (!ideaForm.title) return
    try {
      const res = await fetch('/api/ideas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, ...ideaForm }) })
      const newIdea = await res.json()
      setIdeas([...ideas, newIdea])
      setIdeaForm({ title: '', description: '', category: '', imageUrl: '' })
      setShowIdeaForm(false)
    } catch (e) {}
  }

  async function addTimeline(e: any) {
    e.preventDefault()
    if (!timelineForm.title || !timelineForm.dueDate) return
    try {
      const res = await fetch('/api/timeline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, ...timelineForm }) })
      const newItem = await res.json()
      setTimeline([...timeline, newItem])
      setTimelineForm({ title: '', description: '', dueDate: '', status: 'pending', imageUrl: '' })
      setShowTimelineForm(false)
    } catch (e) {}
  }

  if (loading) return <div style={{ padding: '40px' }}>Loading...</div>
  if (!project) return <div style={{ padding: '40px' }}>Not found</div>

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '40px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Link href="/" style={{ color: '#999', textDecoration: 'none', marginBottom: '40px', display: 'block' }}>← Back</Link>
        
        <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '20px' }}>{project.name}</h1>
        <p style={{ color: '#aaa', marginBottom: '40px', fontSize: '16px' }}>{project.description}</p>

        <div style={{ display: 'flex', gap: '40px', marginBottom: '40px', borderBottom: '1px solid #333', paddingBottom: '20px' }}>
          <button onClick={() => setActiveTab('mood-board')} style={{ backgroundColor: 'transparent', border: 'none', color: activeTab === 'mood-board' ? '#fff' : '#666', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
            Mood Board ({ideas.length})
          </button>
          <button onClick={() => setActiveTab('timeline')} style={{ backgroundColor: 'transparent', border: 'none', color: activeTab === 'timeline' ? '#fff' : '#666', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
            Timeline ({timeline.length})
          </button>
        </div>

        {activeTab === 'mood-board' && (
          <div>
            {!showIdeaForm && (
              <button onClick={() => setShowIdeaForm(true)} style={{ padding: '12px 24px', backgroundColor: '#111', border: '1px solid #333', color: '#fff', cursor: 'pointer', marginBottom: '40px', fontWeight: 'bold' }}>
                + Add Idea
              </button>
            )}

            {showIdeaForm && (
              <form onSubmit={addIdea} style={{ backgroundColor: '#111', border: '1px solid #333', padding: '30px', marginBottom: '40px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <input type="text" placeholder="Title" value={ideaForm.title} onChange={(e) => setIdeaForm({ ...ideaForm, title: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', fontSize: '14px' }} required />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <textarea placeholder="Description" value={ideaForm.description} onChange={(e) => setIdeaForm({ ...ideaForm, description: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', fontSize: '14px', minHeight: '60px' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <input type="text" placeholder="Category" value={ideaForm.category} onChange={(e) => setIdeaForm({ ...ideaForm, category: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', fontSize: '14px' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <input type="url" placeholder="Image URL" value={ideaForm.imageUrl} onChange={(e) => setIdeaForm({ ...ideaForm, imageUrl: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#333', border: '1px solid #555', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
                  <button type="button" onClick={() => setShowIdeaForm(false)} style={{ padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid #333', color: '#666', cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {ideas.map((idea: any) => (
                <div key={idea.id} style={{ backgroundColor: '#111', border: '1px solid #333', padding: '20px' }}>
                  {idea.imageUrl && <img src={idea.imageUrl} alt={idea.title} style={{ width: '100%', height: '150px', objectFit: 'cover', marginBottom: '15px' }} onError={(e) => (e.currentTarget.style.display = 'none')} />}
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>{idea.title}</h3>
                  <p style={{ color: '#999', fontSize: '14px', marginBottom: '10px' }}>{idea.description}</p>
                  <span style={{ fontSize: '12px', color: '#666' }}>{idea.category}</span>
                </div>
              ))}
            </div>
            {ideas.length === 0 && !showIdeaForm && <p style={{ textAlign: 'center', color: '#666', paddingTop: '60px' }}>No ideas yet</p>}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div>
            {!showTimelineForm && (
              <button onClick={() => setShowTimelineForm(true)} style={{ padding: '12px 24px', backgroundColor: '#111', border: '1px solid #333', color: '#fff', cursor: 'pointer', marginBottom: '40px', fontWeight: 'bold' }}>
                + Add Milestone
              </button>
            )}

            {showTimelineForm && (
              <form onSubmit={addTimeline} style={{ backgroundColor: '#111', border: '1px solid #333', padding: '30px', marginBottom: '40px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <input type="text" placeholder="Title" value={timelineForm.title} onChange={(e) => setTimelineForm({ ...timelineForm, title: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', fontSize: '14px' }} required />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <textarea placeholder="What's in this clip? Scenes, shots, ideas..." value={timelineForm.description} onChange={(e) => setTimelineForm({ ...timelineForm, description: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', fontSize: '14px', minHeight: '60px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '8px' }}>Due Date</label>
                    <input 
                      type="date" 
                      value={timelineForm.dueDate} 
                      onChange={(e) => setTimelineForm({ ...timelineForm, dueDate: e.target.value })} 
                      style={{ width: '100%', padding: '12px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', fontSize: '14px' }} 
                      required 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '8px' }}>Status</label>
                    <select value={timelineForm.status} onChange={(e) => setTimelineForm({ ...timelineForm, status: e.target.value })} style={{ width: '100%', padding: '12px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', fontSize: '14px', cursor: 'pointer' }}>
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <input type="url" placeholder="Reference Image URL" value={timelineForm.imageUrl} onChange={(e) => setTimelineForm({ ...timelineForm, imageUrl: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#333', border: '1px solid #555', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
                  <button type="button" onClick={() => setShowTimelineForm(false)} style={{ padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid #333', color: '#666', cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            )}

            <div style={{ display: 'grid', gap: '20px' }}>
              {timeline.map((item: any) => (
                <div key={item.id} style={{ backgroundColor: '#111', border: '1px solid #333', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>{item.title}</h3>
                    <span style={{ fontSize: '12px', border: '1px solid #666', padding: '4px 8px', color: '#999' }}>{item.status}</span>
                  </div>
                  <p style={{ color: '#999', fontSize: '14px', marginBottom: '10px' }}>{item.description}</p>
                  <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>Due: {new Date(item.dueDate).toLocaleDateString()}</p>
                  {item.imageUrl && <img src={item.imageUrl} alt={item.title} style={{ width: '100%', height: '200px', objectFit: 'cover' }} onError={(e) => (e.currentTarget.style.display = 'none')} />}
                </div>
              ))}
            </div>
            {timeline.length === 0 && !showTimelineForm && <p style={{ textAlign: 'center', color: '#666', paddingTop: '60px' }}>No milestones yet</p>}
          </div>
        )}
      </div>
    </div>
  )
}
