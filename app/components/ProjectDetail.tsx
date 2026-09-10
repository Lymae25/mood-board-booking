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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-sm tracking-widest mb-4">LOADING</div>
          <div className="w-12 h-12 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-sm tracking-widest uppercase">Project Not Found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-8 py-16">
        {/* Back Link */}
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm tracking-widest uppercase mb-12 inline-block transition">
          ← BACK
        </Link>

        {/* Project Header */}
        <div className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 p-12 mb-12">
          <h1 className="text-4xl font-black text-gray-300 mb-4 tracking-wider">
            {project.name}
          </h1>
          <p className="text-gray-500 mb-8 leading-relaxed text-sm">
            {project.description}
          </p>
          <div className="flex gap-8 text-xs text-gray-600 tracking-widest uppercase">
            {project.clientName && (
              <div>
                <span className="text-gray-700">Client</span>
                <p className="text-gray-400 mt-1">{project.clientName}</p>
              </div>
            )}
            <div>
              <span className="text-gray-700">Status</span>
              <p className="text-gray-400 mt-1 font-semibold">{project.status}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-8 mb-12 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('mood-board')}
            className={`px-2 py-4 text-sm tracking-widest font-semibold transition relative ${
              activeTab === 'mood-board'
                ? 'text-gray-300'
                : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            MOOD BOARD
            {activeTab === 'mood-board' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-400"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-2 py-4 text-sm tracking-widest font-semibold transition relative ${
              activeTab === 'timeline'
                ? 'text-gray-300'
                : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            TIMELINE
            {activeTab === 'timeline' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-400"></div>
            )}
          </button>
        </div>

        {/* Mood Board Tab */}
        {activeTab === 'mood-board' && (
          <div>
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-2xl font-black text-gray-300 tracking-wider">IDEAS</h2>
              <button
                onClick={() => setShowIdeaForm(!showIdeaForm)}
                className="px-6 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 text-xs tracking-widest font-semibold transition"
              >
                {showIdeaForm ? 'CANCEL' : 'ADD IDEA'}
              </button>
            </div>

            {showIdeaForm && (
              <div className="animate-fade-in bg-gradient-to-b from-gray-900 to-black border border-gray-800 p-8 mb-12">
                <form onSubmit={handleAddIdea} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Idea Title"
                    value={ideaFormData.title}
                    onChange={(e) => setIdeaFormData({ ...ideaFormData, title: e.target.value })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 text-gray-300 placeholder-gray-600 focus:border-gray-400 transition text-sm"
                    required
                  />
                  <textarea
                    placeholder="Description"
                    value={ideaFormData.description}
                    onChange={(e) => setIdeaFormData({ ...ideaFormData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 text-gray-300 placeholder-gray-600 focus:border-gray-400 transition text-sm h-20 resize-none"
                  />
                  <input
                    type="text"
                    placeholder="Category"
                    value={ideaFormData.category}
                    onChange={(e) => setIdeaFormData({ ...ideaFormData, category: e.target.value })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 text-gray-300 placeholder-gray-600 focus:border-gray-400 transition text-sm"
                  />
                  <input
                    type="url"
                    placeholder="Image URL (optional)"
                    value={ideaFormData.imageUrl}
                    onChange={(e) => setIdeaFormData({ ...ideaFormData, imageUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 text-gray-300 placeholder-gray-600 focus:border-gray-400 transition text-sm"
                  />
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 text-xs tracking-widest font-semibold transition"
                  >
                    ADD
                  </button>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ideas.map((idea) => (
                <div key={idea.id} className="animate-fade-in bg-gradient-to-b from-gray-900 to-black border border-gray-800 hover:border-gray-600 p-6 transition group">
                  {idea.imageUrl && (
                    <div className="mb-4 overflow-hidden bg-black">
                      <img
                        src={idea.imageUrl}
                        alt={idea.title}
                        className="w-full h-40 object-cover group-hover:scale-105 transition duration-500"
                      />
                    </div>
                  )}
                  <h3 className="text-lg font-black text-gray-300 mb-2 tracking-wide">
                    {idea.title}
                  </h3>
                  <p className="text-gray-500 mb-4 text-sm leading-relaxed">
                    {idea.description}
                  </p>
                  <span className="text-xs bg-black border border-gray-700 text-gray-400 px-3 py-1 inline-block tracking-widest uppercase font-semibold">
                    {idea.category}
                  </span>
                </div>
              ))}
            </div>

            {ideas.length === 0 && !showIdeaForm && (
              <div className="text-center py-16">
                <p className="text-gray-600 text-sm tracking-widest uppercase">NO IDEAS YET</p>
              </div>
            )}
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div>
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-2xl font-black text-gray-300 tracking-wider">TIMELINE</h2>
              <button
                onClick={() => setShowTimelineForm(!showTimelineForm)}
                className="px-6 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 text-xs tracking-widest font-semibold transition"
              >
                {showTimelineForm ? 'CANCEL' : 'ADD MILESTONE'}
              </button>
            </div>

            {showTimelineForm && (
              <div className="animate-fade-in bg-gradient-to-b from-gray-900 to-black border border-gray-800 p-8 mb-12">
                <form onSubmit={handleAddTimelineItem} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Milestone Title"
                    value={timelineFormData.title}
                    onChange={(e) => setTimelineFormData({ ...timelineFormData, title: e.target.value })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 text-gray-300 placeholder-gray-600 focus:border-gray-400 transition text-sm"
                    required
                  />
                  <textarea
                    placeholder="Description"
                    value={timelineFormData.description}
                    onChange={(e) => setTimelineFormData({ ...timelineFormData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 text-gray-300 placeholder-gray-600 focus:border-gray-400 transition text-sm h-20 resize-none"
                  />
                  <input
                    type="date"
                    value={timelineFormData.dueDate}
                    onChange={(e) => setTimelineFormData({ ...timelineFormData, dueDate: e.target.value })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 text-gray-300 focus:border-gray-400 transition text-sm"
                  />
                  <select
                    value={timelineFormData.status}
                    onChange={(e) => setTimelineFormData({ ...timelineFormData, status: e.target.value })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 text-gray-300 focus:border-gray-400 transition text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 text-xs tracking-widest font-semibold transition"
                  >
                    ADD
                  </button>
                </form>
              </div>
            )}

            <div className="space-y-4">
              {timeline.map((item) => (
                <div key={item.id} className="animate-fade-in bg-gradient-to-b from-gray-900 to-black border border-gray-800 hover:border-gray-600 p-6 transition">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-black text-gray-300 tracking-wide flex-1">
                      {item.title}
                    </h3>
                    <span className={`text-xs px-3 py-1 border font-semibold tracking-widest uppercase whitespace-nowrap ml-4 ${
                      item.status === 'completed' 
                        ? 'border-green-700 text-green-400 bg-green-950/30'
                        : item.status === 'in-progress' 
                        ? 'border-yellow-700 text-yellow-400 bg-yellow-950/30'
                        : 'border-gray-700 text-gray-400 bg-black'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-gray-500 mb-4 text-sm leading-relaxed">
                    {item.description}
                  </p>
                  <p className="text-gray-600 text-xs tracking-widest uppercase">
                    DUE: {new Date(item.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>

            {timeline.length === 0 && !showTimelineForm && (
              <div className="text-center py-16">
                <p className="text-gray-600 text-sm tracking-widest uppercase">NO MILESTONES YET</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
