'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function ProjectDetail({ projectId }: { projectId: string }) {
  const [project, setProject] = useState(null)
  const [ideas, setIdeas] = useState([])
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('mood-board')

  useEffect(() => {
    const fetch_data = async () => {
      try {
        const p = await fetch('/api/projects').then(r => r.json())
        setProject(p.find((x: any) => x.id === projectId))
        const i = await fetch(`/api/ideas?projectId=${projectId}`).then(r => r.json())
        setIdeas(i)
        const t = await fetch(`/api/timeline?projectId=${projectId}`).then(r => r.json())
        setTimeline(t)
      } catch (e) {
        console.log(e)
      }
      setLoading(false)
    }
    fetch_data()
  }, [projectId])

  if (loading) return <div className="p-8">Loading...</div>
  if (!project) return <div className="p-8">Not found</div>

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-gray-500 mb-8 block">← Back</Link>
        
        <h1 className="text-4xl font-bold mb-4">{(project as any).name}</h1>
        <p className="text-gray-400 mb-8">{(project as any).description}</p>
        
        <div className="flex gap-8 mb-8 pb-4 border-b border-gray-700">
          <button onClick={() => setActiveTab('mood-board')} className={activeTab === 'mood-board' ? 'font-bold text-white' : 'text-gray-600'}>Ideas</button>
          <button onClick={() => setActiveTab('timeline')} className={activeTab === 'timeline' ? 'font-bold text-white' : 'text-gray-600'}>Timeline</button>
        </div>

        {activeTab === 'mood-board' && <div className="text-gray-400">{ideas.length} ideas</div>}
        {activeTab === 'timeline' && <div className="text-gray-400">{timeline.length} milestones</div>}
      </div>
    </div>
  )
}
