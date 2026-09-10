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
  const [ideaFormData, setIdeaFormData] = useState({
    title: '',
    description: '',
    category: '',
    imageUrl: ''
  })
  const [timelineFormData, setTimelineFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    status: 'pending'
  })

  useEffect(() => {
    fetchData()
  }, [projectId])

  async function fetchData() {
    try {
      const projectRes = await fetch(`/api/projects?id=${projectId}`)
      const projectData = await projectRes.json()
      setProject(projectData[0])

      const ideasRes = await fetch(`/api/ideas?projectId=${projectId}`)
      const ideasData = await ideasRes.json()
      setIdeas(ideasData)

      const timelineRes = await fetch(`/api/timeline?projectId=${projectId}`)
      const timelineData = await timelineRes.json()
      setTimeline(timelineData)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddIdea(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, ...ideaFormData })
      })
      const newIdea = await res.json()
      setIdeas([...ideas, newIdea])
      setIdeaFormData({ title: '', description: '', category: '', imageUrl: '' })
      setShowIdeaForm(false)
    } catch (error) {
      console.error('Failed to add idea:', error)
    }
  }

  async function handleAddTimelineItem(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/api/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, ...timelineFormData })
      })
      const newItem = await res.json()
      setTimeline([...timeline, newItem])
      setTimelineFormData({ title: '', description: '', dueDate: '', status: 'pending' })
      setShowTimelineForm(false)
    } catch (error) {
      console.error('Failed to add timeline item:', error)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  if (!project) {
    return <div className="p-8 text-center">Project not found</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-7xl mx-auto p-8">
        <Link href="/" className="text-blue-400 hover:text-blue-300 mb-6 inline-block">
          ← Back to Projects
        </Link>

        <div className="bg-slate-700 p-8 rounded-lg mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{project.name}</h1>
          <p className="text-slate-400 mb-4">{project.description}</p>
          <div className="flex gap-4 text-sm text-slate-400">
            <span>Client: {project.clientName}</span>
            <span>Status: {project.status}</span>
          </div>
        </div>

        <div className="flex gap-4 mb-8 border-b border-slate-600">
          <button
            onClick={() => setActiveTab('mood-board')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'mood-board'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Mood Board
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'timeline'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Timeline
          </button>
        </div>

        {activeTab === 'mood-board' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Ideas</h2>
              <button
                onClick={() => setShowIdeaForm(!showIdeaForm)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
              >
                {showIdeaForm ? 'Cancel' : 'Add Idea'}
              </button>
            </div>

            {showIdeaForm && (
              <div className="bg-slate-700 p-6 rounded-lg mb-6">
                <form onSubmit={handleAddIdea} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Idea Title"
                    value={ideaFormData.title}
                    onChange={(e) => setIdeaFormData({ ...ideaFormData, title: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-600 text-white placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <textarea
                    placeholder="Description"
                    value={ideaFormData.description}
                    onChange={(e) => setIdeaFormData({ ...ideaFormData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-600 text-white placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Category (e.g., Color, Typography, Layout)"
                    value={ideaFormData.category}
                    onChange={(e) => setIdeaFormData({ ...ideaFormData, category: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-600 text-white placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="url"
                    placeholder="Image URL (optional)"
                    value={ideaFormData.imageUrl}
                    onChange={(e) => setIdeaFormData({ ...ideaFormData, imageUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-600 text-white placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
                  >
                    Add Idea
                  </button>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ideas.map((idea) => (
                <div key={idea.id} className="bg-slate-700 p-6 rounded-lg">
                  {idea.imageUrl && (
                    <img
                      src={idea.imageUrl}
                      alt={idea.title}
                      className="w-full h-40 object-cover rounded-lg mb-4"
                    />
                  )}
                  <h3 className="text-lg font-bold text-white mb-2">{idea.title}</h3>
                  <p className="text-slate-400 mb-3">{idea.description}</p>
                  <span className="text-xs bg-purple-600 text-white px-3 py-1 rounded-full">
                    {idea.category}
                  </span>
                </div>
              ))}
            </div>

            {ideas.length === 0 && !showIdeaForm && (
              <div className="text-center py-12">
                <p className="text-slate-400">No ideas yet. Add one to get started!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Timeline</h2>
              <button
                onClick={() => setShowTimelineForm(!showTimelineForm)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
              >
                {showTimelineForm ? 'Cancel' : 'Add Milestone'}
              </button>
            </div>

            {showTimelineForm && (
              <div className="bg-slate-700 p-6 rounded-lg mb-6">
                <form onSubmit={handleAddTimelineItem} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Milestone Title"
                    value={timelineFormData.title}
                    onChange={(e) => setTimelineFormData({ ...timelineFormData, title: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-600 text-white placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <textarea
                    placeholder="Description"
                    value={timelineFormData.description}
                    onChange={(e) => setTimelineFormData({ ...timelineFormData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-600 text-white placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={timelineFormData.dueDate}
                    onChange={(e) => setTimelineFormData({ ...timelineFormData, dueDate: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={timelineFormData.status}
                    onChange={(e) => setTimelineFormData({ ...timelineFormData, status: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
                  >
                    Add Milestone
                  </button>
                </form>
              </div>
            )}

            <div className="space-y-4">
              {timeline.map((item) => (
                <div key={item.id} className="bg-slate-700 p-6 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                      <p className="text-slate-400 mb-3">{item.description}</p>
                      <p className="text-sm text-slate-500">Due: {new Date(item.dueDate).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      item.status === 'completed' ? 'bg-green-600' :
                      item.status === 'in-progress' ? 'bg-yellow-600' :
                      'bg-slate-600'
                    } text-white`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {timeline.length === 0 && !showTimelineForm && (
              <div className="text-center py-12">
                <p className="text-slate-400">No milestones yet. Add one to get started!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
