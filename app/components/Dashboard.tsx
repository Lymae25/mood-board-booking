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
        body: JSON.stringify({
          ...formData,
          status: 'active'
        })
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-sm tracking-widest mb-4">LOADING</div>
          <div className="w-12 h-12 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="flex justify-between items-start mb-20">
          <div>
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 mb-2" style={{
              letterSpacing: '3px',
              fontFamily: 'Inter, sans-serif'
            }}>
              MOOD BOARD
            </h1>
            <p className="text-gray-500 text-sm tracking-widest">PROJECT BOOKING OVERVIEW</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 text-sm tracking-widest font-semibold transition"
          >
            {showForm ? 'CANCEL' : 'NEW PROJECT'}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="animate-fade-in bg-gradient-to-b from-gray-900 to-black border border-gray-800 p-12 mb-16">
            <h2 className="text-2xl font-black text-gray-300 mb-8 tracking-widest">CREATE PROJECT</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-xs text-gray-500 tracking-widest uppercase mb-2 block">Project Name</label>
                <input
                  type="text"
                  placeholder="Enter project name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-black border border-gray-700 text-gray-300 placeholder-gray-600 focus:border-gray-400 transition text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 tracking-widest uppercase mb-2 block">Description</label>
                <textarea
                  placeholder="Project description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-black border border-gray-700 text-gray-300 placeholder-gray-600 focus:border-gray-400 transition text-sm h-24 resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 tracking-widest uppercase mb-2 block">Client Name</label>
                <input
                  type="text"
                  placeholder="Client name"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full px-4 py-3 bg-black border border-gray-700 text-gray-300 placeholder-gray-600 focus:border-gray-400 transition text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 tracking-widest uppercase mb-2 block">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-3 bg-black border border-gray-700 text-gray-300 focus:border-gray-400 transition text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 tracking-widest uppercase mb-2 block">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-3 bg-black border border-gray-700 text-gray-300 focus:border-gray-400 transition text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full px-6 py-3 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 text-sm tracking-widest font-semibold transition"
              >
                CREATE
              </button>
            </form>
          </div>
        )}

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/project/${project.id}`}
              className="animate-fade-in group"
            >
              <div className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 hover:border-gray-600 p-8 transition duration-500 relative overflow-hidden h-full flex flex-col">
                {/* Hover effect background */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-800 to-transparent opacity-0 group-hover:opacity-10 transition duration-500 -translate-x-full group-hover:translate-x-full"></div>
                
                <div className="relative z-10">
                  <h3 className="text-xl font-black text-gray-300 mb-3 tracking-wider group-hover:text-white transition">
                    {project.name}
                  </h3>
                  <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                    {project.description}
                  </p>
                  <div className="space-y-3 text-xs text-gray-600">
                    {project.clientName && (
                      <p className="tracking-widest uppercase">Client: <span className="text-gray-400">{project.clientName}</span></p>
                    )}
                    <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                      <span className="tracking-widest uppercase text-gray-700">
                        Status
                      </span>
                      <span className="text-gray-400 tracking-widest uppercase text-xs font-semibold px-3 py-1 border border-gray-700">
                        {project.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {projects.length === 0 && !showForm && (
          <div className="text-center py-20">
            <p className="text-gray-600 text-sm tracking-widest uppercase mb-4">NO PROJECTS YET</p>
            <p className="text-gray-700 text-sm">Click "New Project" to create your first mood board</p>
          </div>
        )}
      </div>
    </div>
  )
}
