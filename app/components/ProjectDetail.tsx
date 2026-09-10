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
  const [activeTab, setActiveTab] = useState('mood-board')
  const [showIdeaForm, setShowIdeaForm] = useState(false)
  const [showTimelineForm, setShowTimelineForm] = useState(false)
  
  const [ideaForm, setIdeaForm] = useState({ title: '', description: '', category: '', imageUrl: '' })
  const [timelineForm, setTimelineForm] = useState({ title: '', description: '', dueDate: '', status: 'pending', imageUrl: '' })

  useEffect(() => { fetchData() }, [projectId])

  async function fetchData() {
    try {
      const pRes = await fetch('/api/projects')
      const projects = await pRes.json()
      const found = projects.find((p: Project) => p.id === projectId)
      setProject(found)

      const idRes = await fetch(`/api/ideas?projectId=${projectId}`)
      setIdeas(await idRes.json())

      const tRes = await fetch(`/api/timeline?projectId=${projectId}`)
      setTimeline(await tRes.json())
    } catch (e) {
      console.error(e)
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
    } catch (e) {
      console.error(e)
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
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>
  if (!project) return <div className="p-8 text-center">Project not found</div>

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-gray-500 text-sm mb-12 block">← BACK</Link>

        <div className="mb-16">
          <h1 className="text-5xl font-bold mb-6">{project.name}</h1>
          <p className="text-gray-400 mb-8 text-lg">{project.description}</p>
          <div className="grid grid-cols-3 gap-12 text-sm">
            <div><p className="text-gray-600">CLIENT</p><p className="text-gray-300">{project.clientName}</p></div>
            <div><p className="text-gray-600">STATUS</p><p className="text-gray-300">{project.status}</p></div>
            <div><p className="text-gray-600">PERIOD</p><p className="text-gray-300">{project.startDate} – {project.endDate}</p></div>
          </div>
        </div>

        <div className="flex gap-12 mb-12 border-b border-gray-700 pb-6">
          <button
            onClick={() => setActiveTab('mood-board')}
            className={`text-lg font-bold uppercase tracking-widest ${activeTab === 'mood-board' ? 'text-white border-b-2 border-white pb-6 -mb-6' : 'text-gray-600'}`}
          >
            Mood Board
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`text-lg font-bold uppercase tracking-widest ${activeTab === 'timeline' ? 'text-white border-b-2 border-white pb-6 -mb-6' : 'text-gray-600'}`}
          >
            Timeline
          </button>
        </div>

        {activeTab === 'mood-board' && (
          <div>
            {!showIdeaForm && (
              <button
                onClick={() => setShowIdeaForm(true)}
                className="mb-12 px-8 py-3 border border-gray-700 hover:border-gray-400 text-white font-bold uppercase"
              >
                + Add Idea
              </button>
            )}

            {showIdeaForm && (
              <form onSubmit={handleAddIdea} className="mb-16 p-8 bg-gray-900 border border-gray-700">
                <div className="mb-6">
                  <input
                    type="text"
                    placeholder="Title"
                    value={ideaForm.title}
                    onChange={(e) => setIdeaForm({ ...ideaForm, title: e.target.value })}
                    className="w-full bg-black border-b border-gray-700 text-white p-2 text-lg"
                    required
                  />
                </div>
                <div className="mb-6">
                  <textarea
                    placeholder="Description"
                    value={ideaForm.description}
                    onChange={(e) => setIdeaForm({ ...ideaForm, description: e.target.value })}
                    className="w-full bg-black border-b border-gray-700 text-white p-2 text-lg h-20"
                  />
                </div>
                <div className="mb-6">
                  <input
                    type="text"
                    placeholder="Category"
                    value={ideaForm.category}
                    onChange={(e) => setIdeaForm({ ...ideaForm, category: e.target.value })}
                    className="w-full bg-black border-b border-gray-700 text-white p-2 text-lg"
                  />
                </div>
                <div className="mb-6">
                  <input
                    type="url"
                    placeholder="Image URL"
                    value={ideaForm.imageUrl}
                    onChange={(e) => setIdeaForm({ ...ideaForm, imageUrl: e.target.value })}
                    className="w-full bg-black border-b border-gray-700 text-white p-2 text-lg"
                  />
                </div>
                <div className="flex gap-4">
                  <button type="submit" className="px-8 py-2 border border-gray-500 text-white font-bold">Save</button>
                  <button type="button" onClick={() => setShowIdeaForm(false)} className="px-8 py-2 border border-gray-700 text-gray-500">Cancel</button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-3 gap-8">
              {ideas.map((idea) => (
                <div key={idea.id} className="border border-gray-700 p-6">
                  {idea.imageUrl && <img src={idea.imageUrl} alt={idea.title} className="w-full h-48 object-cover mb-4" onError={(e) => (e.currentTarget.style.display = 'none')} />}
                  <h3 className="text-xl font-bold mb-3">{idea.title}</h3>
                  <p className="text-gray-400 mb-4">{idea.description}</p>
                  <span className="text-xs text-gray-600">{idea.category}</span>
                </div>
              ))}
            </div>

            {ideas.length === 0 && !showIdeaForm && <p className="text-center text-gray-600 py-16">No ideas yet</p>}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div>
            {!showTimelineForm && (
              <button
                onClick={() => setShowTimelineForm(true)}
                className="mb-12 px-8 py-3 border border-gray-700 hover:border-gray-400 text-white font-bold uppercase"
              >
                + Add Milestone
              </button>
            )}

            {showTimelineForm && (
              <form onSubmit={handleAddTimeline} className="mb-16 p-8 bg-gray-900 border border-gray-700">
                <div className="mb-6">
                  <input
                    type="text"
                    placeholder="Title"
                    value={timelineForm.title}
                    onChange={(e) => setTimelineForm({ ...timelineForm, title: e.target.value })}
                    className="w-full bg-black border-b border-gray-700 text-white p-2 text-lg"
                    required
                  />
                </div>
                <div className="mb-6">
                  <textarea
                    placeholder="Description"
                    value={timelineForm.description}
                    onChange={(e) => setTimelineForm({ ...timelineForm, description: e.target.value })}
                    className="w-full bg-black border-b border-gray-700 text-white p-2 text-lg h-20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-8 mb-6">
                  <input
                    type="date"
                    value={timelineForm.dueDate}
                    onChange={(e) => setTimelineForm({ ...timelineForm, dueDate: e.target.value })}
                    className="bg-black border-b border-gray-700 text-white p-2 text-lg"
                    required
                  />
                  <select
                    value={timelineForm.status}
                    onChange={(e) => setTimelineForm({ ...timelineForm, status: e.target.value })}
                    className="bg-black border-b border-gray-700 text-white p-2 text-lg"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="mb-6">
                  <input
                    type="url"
                    placeholder="Image URL"
                    value={timelineForm.imageUrl}
                    onChange={(e) => setTimelineForm({ ...timelineForm, imageUrl: e.target.value })}
                    className="w-full bg-black border-b border-gray-700 text-white p-2 text-lg"
                  />
                </div>
                <div className="flex gap-4">
                  <button type="submit" className="px-8 py-2 border border-gray-500 text-white font-bold">Save</button>
                  <button type="button" onClick={() => setShowTimelineForm(false)} className="px-8 py-2 border border-gray-700 text-gray-500">Cancel</button>
                </div>
              </form>
            )}

            <div className="space-y-8">
              {timeline.map((item) => (
                <div key={item.id} className="border border-gray-700 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold">{item.title}</h3>
                    <span className="text-xs border border-gray-600 px-2 py-1">{item.status}</span>
                  </div>
                  <p className="text-gray-400 mb-4">{item.description}</p>
                  <p className="text-sm text-gray-600 mb-4">Due: {new Date(item.dueDate).toLocaleDateString()}</p>
                  {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="w-full h-64 object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />}
                </div>
              ))}
            </div>

            {timeline.length === 0 && !showTimelineForm && <p className="text-center text-gray-600 py-16">No milestones yet</p>}
          </div>
        )}
      </div>
    </div>
  )
}
