'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ChatWidget from './ChatWidget'
import LanguageSwitcher from './LanguageSwitcher'
import { useTranslation } from '@/lib/useTranslation'

export default function ProjectDetail({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<any>(null)
  const [scenes, setScenes] = useState<any[]>([])
  const [ideas, setIdeas] = useState<any[]>([])
  const [timeline, setTimeline] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [selectedScene, setSelectedScene] = useState<any>(null)
  const [tab, setTab] = useState('scenes')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const isCustomerView = searchParams.get('customer') === '1'
  const { t } = useTranslation()

  const [showSceneForm, setShowSceneForm] = useState(false)
  const [sceneForm, setSceneForm] = useState({ title: '', description: '', imageUrl: '', referenceUrl: '', referenceNote: '' })
  const [showIdeaForm, setShowIdeaForm] = useState(false)
  const [ideaForm, setIdeaForm] = useState({ title: '', description: '', imageUrl: '', category: 'link' })
  const [showTimelineForm, setShowTimelineForm] = useState(false)
  const [timelineForm, setTimelineForm] = useState({ title: '', description: '', dueDate: '', status: 'pending' })
  const [newNote, setNewNote] = useState('')

  useEffect(() => { loadAll() }, [projectId])

  async function loadAll() {
    const [p, s, i, tl] = await Promise.all([
      fetch(`/api/projects`).then(r => r.json()),
      fetch(`/api/scenes?projectId=${projectId}`).then(r => r.json()),
      fetch(`/api/ideas?projectId=${projectId}`).then(r => r.json()),
      fetch(`/api/timeline?projectId=${projectId}`).then(r => r.json())
    ])
    setProject(p.find((x: any) => x.id === projectId))
    setScenes(s || [])
    setIdeas(i || [])
    setTimeline(tl || [])
    setLoading(false)
  }

  async function loadNotes(sceneId: string) {
    const res = await fetch(`/api/notes?sceneId=${sceneId}`)
    const data = await res.json()
    setNotes(data || [])
  }

  function handleImageUpload(e: any, setter: any, form: any) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { setter({ ...form, imageUrl: reader.result as string }) }
    reader.readAsDataURL(file)
  }

  function handleDrop(e: any, setter: any, form: any) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => { setter({ ...form, imageUrl: reader.result as string }) }
    reader.readAsDataURL(file)
  }

  async function createScene() {
    if (!sceneForm.title) return
    const desc = sceneForm.referenceUrl ? `${sceneForm.description}\n\n---REF---\n${sceneForm.referenceUrl}\n${sceneForm.referenceNote}` : sceneForm.description
    await fetch('/api/scenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, sceneNumber: scenes.length + 1, title: sceneForm.title, description: desc, imageUrl: sceneForm.imageUrl })
    })
    setSceneForm({ title: '', description: '', imageUrl: '', referenceUrl: '', referenceNote: '' })
    setShowSceneForm(false)
    loadAll()
  }

  async function createIdea() {
    if (!ideaForm.title) return
    await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, ...ideaForm })
    })
    setIdeaForm({ title: '', description: '', imageUrl: '', category: 'link' })
    setShowIdeaForm(false)
    loadAll()
  }

  async function createTimelineItem() {
    if (!timelineForm.title) return
    await fetch('/api/timeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, ...timelineForm })
    })
    setTimelineForm({ title: '', description: '', dueDate: '', status: 'pending' })
    setShowTimelineForm(false)
    loadAll()
  }

  async function addNote() {
    if (!newNote || !selectedScene) return
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sceneId: selectedScene.id, projectId, content: newNote })
    })
    setNewNote('')
    loadNotes(selectedScene.id)
  }

  function parseSceneDesc(desc: string) {
    if (!desc) return { text: '', refUrl: '', refNote: '' }
    const parts = desc.split('\n\n---REF---\n')
    if (parts.length < 2) return { text: desc, refUrl: '', refNote: '' }
    const refLines = parts[1].split('\n')
    return { text: parts[0], refUrl: refLines[0] || '', refNote: refLines.slice(1).join('\n') || '' }
  }

  function milestoneStatusLabel(status: string) {
    if (status === 'in-progress') return t('project.statusInProgress', 'In Progress')
    if (status === 'done' || status === 'completed') return t('project.statusDone', 'Done')
    return t('project.statusPending', 'Pending')
  }

  if (loading) return <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t('common.loading', 'LOADING')}</div>

  const inputStyle = { width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', fontSize: '14px', outline: 'none', marginBottom: '15px', fontFamily: 'inherit' }
  const btnStyle = { padding: '10px 20px', backgroundColor: '#fff', border: 'none', color: '#000', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' as const }
  const btnGhost = { padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid #333', color: '#999', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' as const }
  const tabBtn = (active: boolean) => ({ padding: '15px 0', marginRight: '40px', backgroundColor: 'transparent', border: 'none', color: active ? '#fff' : '#666', cursor: 'pointer', fontSize: '13px', fontWeight: active ? '900' as any : 'normal', letterSpacing: '1px', textTransform: 'uppercase' as const, borderBottom: active ? '2px solid #fff' : '2px solid transparent' })

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '40px' }}>
      <LanguageSwitcher />
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <button onClick={() => router.back()} style={{ ...btnGhost, marginBottom: '30px' }}>← {t('common.back', 'Tilbage')}</button>

        <h1 style={{ fontSize: '48px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>{project?.name}</h1>
        <p style={{ color: '#999', marginBottom: '40px' }}>{project?.description}</p>

        <div style={{ borderBottom: '1px solid #333', marginBottom: '40px' }}>
          <button onClick={() => setTab('scenes')} style={tabBtn(tab === 'scenes')}>{t('project.tabScenes', 'Scener')} ({scenes.length})</button>
          <button onClick={() => setTab('inspo')} style={tabBtn(tab === 'inspo')}>{t('project.tabInspo', 'Inspo')} ({ideas.length})</button>
          <button onClick={() => setTab('timeline')} style={tabBtn(tab === 'timeline')}>{t('project.tabTimeline', 'Timeline')} ({timeline.length})</button>
        </div>

        {tab === 'scenes' && (
          <div>
            {!showSceneForm && <button onClick={() => setShowSceneForm(true)} style={{ ...btnStyle, marginBottom: '30px' }}>+ {t('project.newScene', 'Ny Scene')}</button>}
            {showSceneForm && (
              <div style={{ border: '1px solid #333', padding: '30px', marginBottom: '30px', maxWidth: '600px' }}>
                <input placeholder={t('project.sceneTitlePlaceholder', 'Scene titel')} value={sceneForm.title} onChange={(e) => setSceneForm({ ...sceneForm, title: e.target.value })} style={inputStyle} />
                <textarea placeholder={t('project.descriptionPlaceholder', 'Beskrivelse - hvad sker der?')} value={sceneForm.description} onChange={(e) => setSceneForm({ ...sceneForm, description: e.target.value })} style={{ ...inputStyle, minHeight: '80px', resize: 'none' }} />
                <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px', marginTop: '10px' }}>{t('project.referenceLink', 'Reference Link (Instagram, YouTube, TikTok...)')}</label>
                <input placeholder="https://..." value={sceneForm.referenceUrl} onChange={(e) => setSceneForm({ ...sceneForm, referenceUrl: e.target.value })} style={inputStyle} />
                <textarea placeholder={t('project.referenceNotePlaceholder', "Note til reference (fx 'skal være noget ala det her')")} value={sceneForm.referenceNote} onChange={(e) => setSceneForm({ ...sceneForm, referenceNote: e.target.value })} style={{ ...inputStyle, minHeight: '60px', resize: 'none' }} />
                <div onDrop={(e) => handleDrop(e, setSceneForm, sceneForm)} onDragOver={(e) => e.preventDefault()} style={{ border: '1px dashed #333', padding: '20px', textAlign: 'center', marginBottom: '15px', cursor: 'pointer' }} onClick={() => document.getElementById('scene-file')?.click()}>
                  {sceneForm.imageUrl ? <img src={sceneForm.imageUrl} alt="" style={{ maxWidth: '100%', maxHeight: '200px' }} /> : <span style={{ color: '#666', fontSize: '12px' }}>{t('project.dragDropImage', 'Drag & drop billede eller klik')}</span>}
                  <input type="file" id="scene-file" accept="image/*" onChange={(e) => handleImageUpload(e, setSceneForm, sceneForm)} style={{ display: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={createScene} style={btnStyle}>{t('common.save', 'Gem')}</button>
                  <button onClick={() => setShowSceneForm(false)} style={btnGhost}>{t('common.cancel', 'Annuller')}</button>
                </div>
              </div>
            )}

            {scenes.length > 0 && (
              <div style={{ overflowX: 'auto', paddingBottom: '20px', marginBottom: '40px', borderBottom: '1px solid #333' }}>
                <div style={{ display: 'flex', gap: '20px', minWidth: 'min-content' }}>
                  {scenes.map((s: any, i: number) => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div onClick={() => { setSelectedScene(s); loadNotes(s.id) }} style={{ border: selectedScene?.id === s.id ? '2px solid #fff' : '1px solid #333', padding: '15px', cursor: 'pointer', minWidth: '150px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#666', marginBottom: '5px' }}>SCENE {i + 1}</div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{s.title}</div>
                      </div>
                      {i < scenes.length - 1 && <span style={{ color: '#666', fontSize: '20px' }}>→</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedScene && (() => {
              const parsed = parseSceneDesc(selectedScene.description)
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                  <div style={{ border: '1px solid #333', padding: '30px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '20px', textTransform: 'uppercase' }}>{selectedScene.title}</h2>
                    {selectedScene.imageUrl && <img src={selectedScene.imageUrl} alt="" style={{ width: '100%', marginBottom: '20px' }} />}
                    <p style={{ color: '#ccc', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{parsed.text}</p>
                    {parsed.refUrl && (
                      <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #333' }}>
                        <p style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>{t('project.reference', 'REFERENCE')}</p>
                        <a href={parsed.refUrl} target="_blank" style={{ color: '#66aaff', wordBreak: 'break-all', fontSize: '12px' }}>{parsed.refUrl}</a>
                        {parsed.refNote && <p style={{ color: '#ccc', fontSize: '13px', marginTop: '10px', fontStyle: 'italic' }}>"{parsed.refNote}"</p>}
                      </div>
                    )}
                  </div>
                  <div style={{ border: '1px solid #333', padding: '30px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '900', marginBottom: '20px', textTransform: 'uppercase' }}>{t('project.notes', 'Noter')}</h3>
                    <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder={t('project.addNotePlaceholder', 'Tilføj note...')} style={{ ...inputStyle, minHeight: '80px', resize: 'none' }} />
                    <button onClick={addNote} style={btnStyle}>+ {t('project.addNoteButton', 'Tilføj')}</button>
                    <div style={{ marginTop: '30px' }}>
                      {notes.length === 0 && <p style={{ color: '#666', fontSize: '12px' }}>{t('project.noNotesYet', 'Ingen noter endnu')}</p>}
                      {notes.map((n: any) => (
                        <div key={n.id} style={{ padding: '15px', borderBottom: '1px solid #222' }}>
                          <p style={{ color: '#ccc', fontSize: '14px' }}>{n.content}</p>
                          <p style={{ color: '#666', fontSize: '10px', marginTop: '5px' }}>{new Date(n.createdAt).toLocaleString('da-DK')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {tab === 'inspo' && (
          <div>
            {!showIdeaForm && <button onClick={() => setShowIdeaForm(true)} style={{ ...btnStyle, marginBottom: '30px' }}>+ {t('project.newInspiration', 'Ny Inspiration')}</button>}
            {showIdeaForm && (
              <div style={{ border: '1px solid #333', padding: '30px', marginBottom: '30px', maxWidth: '600px' }}>
                <input placeholder={t('project.titlePlaceholder', 'Titel')} value={ideaForm.title} onChange={(e) => setIdeaForm({ ...ideaForm, title: e.target.value })} style={inputStyle} />
                <textarea placeholder={t('project.ideaNotePlaceholder', "Note (fx 'skal være noget ala det her')")} value={ideaForm.description} onChange={(e) => setIdeaForm({ ...ideaForm, description: e.target.value })} style={{ ...inputStyle, minHeight: '80px', resize: 'none' }} />
                <input placeholder={t('project.linkPlaceholder', 'Link (Instagram, YouTube, TikTok...)')} value={ideaForm.category} onChange={(e) => setIdeaForm({ ...ideaForm, category: e.target.value })} style={inputStyle} />
                <div onDrop={(e) => handleDrop(e, setIdeaForm, ideaForm)} onDragOver={(e) => e.preventDefault()} style={{ border: '1px dashed #333', padding: '20px', textAlign: 'center', marginBottom: '15px', cursor: 'pointer' }} onClick={() => document.getElementById('idea-file')?.click()}>
                  {ideaForm.imageUrl ? <img src={ideaForm.imageUrl} alt="" style={{ maxWidth: '100%', maxHeight: '200px' }} /> : <span style={{ color: '#666', fontSize: '12px' }}>{t('project.dragDropImageOptional', 'Drag & drop billede eller klik (valgfrit)')}</span>}
                  <input type="file" id="idea-file" accept="image/*" onChange={(e) => handleImageUpload(e, setIdeaForm, ideaForm)} style={{ display: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={createIdea} style={btnStyle}>{t('common.save', 'Gem')}</button>
                  <button onClick={() => setShowIdeaForm(false)} style={btnGhost}>{t('common.cancel', 'Annuller')}</button>
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {ideas.map((i: any) => (
                <div key={i.id} style={{ border: '1px solid #333', padding: '20px' }}>
                  {i.imageUrl && <img src={i.imageUrl} alt="" style={{ width: '100%', marginBottom: '15px' }} />}
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase' }}>{i.title}</h3>
                  {i.description && <p style={{ color: '#ccc', fontSize: '13px', marginBottom: '10px', fontStyle: 'italic' }}>"{i.description}"</p>}
                  {i.category && (i.category.startsWith('http') ? <a href={i.category} target="_blank" style={{ color: '#66aaff', fontSize: '12px', wordBreak: 'break-all' }}>{i.category}</a> : <span style={{ color: '#666', fontSize: '11px' }}>{i.category}</span>)}
                </div>
              ))}
              {ideas.length === 0 && !showIdeaForm && <p style={{ color: '#666', fontSize: '12px' }}>{t('project.noInspirationYet', 'Ingen inspiration endnu')}</p>}
            </div>
          </div>
        )}

        {tab === 'timeline' && (
          <div>
            {!showTimelineForm && <button onClick={() => setShowTimelineForm(true)} style={{ ...btnStyle, marginBottom: '30px' }}>+ {t('project.newMilestone', 'Milestone')}</button>}
            {showTimelineForm && (
              <div style={{ border: '1px solid #333', padding: '30px', marginBottom: '30px', maxWidth: '600px' }}>
                <input placeholder={t('project.titlePlaceholder', 'Titel')} value={timelineForm.title} onChange={(e) => setTimelineForm({ ...timelineForm, title: e.target.value })} style={inputStyle} />
                <textarea placeholder={t('customer.description', 'Beskrivelse')} value={timelineForm.description} onChange={(e) => setTimelineForm({ ...timelineForm, description: e.target.value })} style={{ ...inputStyle, minHeight: '60px', resize: 'none' }} />
                <input type="date" value={timelineForm.dueDate} onChange={(e) => setTimelineForm({ ...timelineForm, dueDate: e.target.value })} style={inputStyle} />
                <select value={timelineForm.status} onChange={(e) => setTimelineForm({ ...timelineForm, status: e.target.value })} style={inputStyle}>
                  <option value="pending">{t('project.statusPending', 'Pending')}</option>
                  <option value="in-progress">{t('project.statusInProgress', 'In Progress')}</option>
                  <option value="done">{t('project.statusDone', 'Done')}</option>
                </select>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={createTimelineItem} style={btnStyle}>{t('common.save', 'Gem')}</button>
                  <button onClick={() => setShowTimelineForm(false)} style={btnGhost}>{t('common.cancel', 'Annuller')}</button>
                </div>
              </div>
            )}
            <div>
              {timeline.map((tItem: any) => (
                <div key={tItem.id} style={{ border: '1px solid #333', padding: '20px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>{tItem.title}</h3>
                    <p style={{ color: '#999', fontSize: '12px' }}>{tItem.description}</p>
                    <p style={{ color: '#666', fontSize: '11px', marginTop: '5px' }}>{tItem.dueDate}</p>
                  </div>
                  <span style={{ fontSize: '10px', color: '#999', border: '1px solid #333', padding: '4px 10px', textTransform: 'uppercase' }}>{milestoneStatusLabel(tItem.status)}</span>
                </div>
              ))}
              {timeline.length === 0 && !showTimelineForm && <p style={{ color: '#666', fontSize: '12px' }}>{t('project.noMilestonesYet', 'Ingen milestones endnu')}</p>}
            </div>
          </div>
        )}
      </div>

      {isCustomerView && project?.customerId && (
        <ChatWidget customerId={project.customerId} projectName={project.name} scenes={scenes.map((s: any) => ({ id: s.id, title: s.title }))} />
      )}
    </div>
  )
}
