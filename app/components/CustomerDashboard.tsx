'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import StatusBadge, { getStatusStyle } from './StatusBadge'
import ChatWidget from './ChatWidget'
import LanguageSwitcher from './LanguageSwitcher'
import FileUploader from './FileUploader'
import { useTranslation } from '@/lib/useTranslation'

export default function CustomerDashboard({ customerId }: { customerId: string }) {
  const [projects, setProjects] = useState<any[]>([])
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showPinForm, setShowPinForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', clientName: '', logoUrl: '', startDate: '', endDate: '' })
  const [newPin, setNewPin] = useState('')
  const [pinMsg, setPinMsg] = useState('')
  const router = useRouter()
  const { t } = useTranslation()

  useEffect(() => { loadData() }, [customerId])

  async function loadData() {
    const [c, p] = await Promise.all([
      fetch('/api/customers').then(r => r.json()),
      fetch(`/api/projects?customerId=${customerId}`).then(r => r.json())
    ])
    setCustomer(c.find((x: any) => x.id === customerId))
    setProjects(p || [])
    setLoading(false)
  }

  async function createProject(e: any) {
    e.preventDefault()
    if (!form.name) return
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, customerId, status: 'new' })
    })
    setForm({ name: '', description: '', clientName: '', logoUrl: '', startDate: '', endDate: '' })
    setShowForm(false)
    loadData()
  }

  async function changePin(e: any) {
    e.preventDefault()
    if (newPin.length !== 4) { setPinMsg(t('customer.pinMustBe4Digits', 'PIN skal være 4 cifre')); return }
    const res = await fetch(`/api/customers/${customerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: newPin })
    })
    if (res.ok) {
      setPinMsg(t('customer.pinUpdated', 'PIN opdateret!'))
      setNewPin('')
      setTimeout(() => { setShowPinForm(false); setPinMsg('') }, 1500)
    }
  }

  function daysUntil(dateStr: string) {
    if (!dateStr) return null
    const target = new Date(dateStr)
    const now = new Date()
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  if (loading) return <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t('common.loading', 'LOADING')}</div>

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '60px 40px' }}>
      <LanguageSwitcher />
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '60px', borderBottom: '1px solid #333', paddingBottom: '40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {customer?.logoUrl && <img src={customer.logoUrl} alt={customer.name} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #333' }} />}
            <div>
              <h1 style={{ fontSize: '36px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase' }}>{customer?.name}</h1>
              <p style={{ fontSize: '12px', color: '#999', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '5px' }}>{t('customer.myProjects', 'Mine Projekter')}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowPinForm(true)} style={{ padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid #333', color: '#999', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('customer.changePin', 'Skift PIN')}</button>
            <button onClick={() => router.push('/')} style={{ padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid #333', color: '#999', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('common.logout', 'Log ud')}</button>
          </div>
        </div>

        {showPinForm && (
          <form onSubmit={changePin} style={{ marginBottom: '40px', maxWidth: '400px', border: '1px solid #333', padding: '30px' }}>
            <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>{t('customer.newPinLabel', 'Ny PIN (4 cifre)')}</label>
            <input type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} maxLength={4} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '14px', outline: 'none', marginBottom: '20px' }} autoFocus />
            {pinMsg && <p style={{ color: pinMsg.includes('opdateret') || pinMsg.includes('updated') || pinMsg.includes('Na-update') ? '#66ff66' : '#ff6666', fontSize: '12px', marginBottom: '20px' }}>{pinMsg}</p>}
            <div style={{ display: 'flex', gap: '15px' }}>
              <button type="submit" style={{ padding: '12px 24px', backgroundColor: '#fff', border: 'none', color: '#000', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('common.save', 'Opdater')}</button>
              <button type="button" onClick={() => { setShowPinForm(false); setNewPin(''); setPinMsg('') }} style={{ padding: '12px 24px', backgroundColor: 'transparent', border: '1px solid #333', color: '#999', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('common.cancel', 'Annuller')}</button>
            </div>
          </form>
        )}

        {!showForm && !showPinForm && (
          <button onClick={() => setShowForm(true)} style={{ padding: '16px 32px', backgroundColor: 'transparent', border: '1px solid #fff', color: '#fff', cursor: 'pointer', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '60px' }}>+ {t('customer.newProject', 'Nyt Projekt')}</button>
        )}

        {showForm && (
          <form onSubmit={createProject} style={{ marginBottom: '60px', maxWidth: '600px' }}>
            <div style={{ marginBottom: '30px' }}>
              <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>{t('customer.projectName', 'Projekt Navn')}</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '14px', outline: 'none' }} required />
            </div>
            <div style={{ marginBottom: '30px' }}>
              <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>{t('customer.description', 'Beskrivelse')}</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '14px', outline: 'none', minHeight: '60px', fontFamily: 'inherit', resize: 'none' }} />
            </div>
            <div style={{ marginBottom: '30px' }}>
              <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>{t('customer.clientName', 'Klient Navn')}</label>
              <input type="text" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '14px', outline: 'none' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>{t('customer.startDate', 'Start Dato')}</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '14px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>{t('customer.endDate', 'Slut Dato (Deadline)')}</label>
                <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '14px', outline: 'none' }} />
              </div>
            </div>
            <div style={{ marginBottom: '40px' }}>
              <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>{t('customer.logoUrl', 'Logo URL')}</label>
              <input type="url" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '14px', outline: 'none', marginBottom: '15px' }} />
              <p style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>{t('upload.orLabel', 'eller')}</p>
              <FileUploader value={form.logoUrl} onUploaded={(url) => setForm({ ...form, logoUrl: url })} />
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <button type="submit" style={{ padding: '12px 24px', backgroundColor: '#fff', border: 'none', color: '#000', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('common.create', 'Opret')}</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '12px 24px', backgroundColor: 'transparent', border: '1px solid #333', color: '#999', cursor: 'pointer', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('common.cancel', 'Annuller')}</button>
            </div>
          </form>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '40px' }}>
          {projects.map((project: any) => {
            const days = daysUntil(project.endDate)
            const urgent = days !== null && days <= 7 && project.status !== 'done'
            return (
              <div key={project.id} style={{ backgroundColor: 'transparent', border: urgent ? '1px solid #ff6666' : '1px solid #333', transition: 'all 0.3s', position: 'relative' }}>
                <Link href={`/project/${project.id}?customer=1`} style={{ textDecoration: 'none', display: 'block' }}>
                  {project.logoUrl && <img src={project.logoUrl} alt={project.name} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />}
                  <div style={{ padding: '30px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '900', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#fff' }}>{project.name}</h3>
                    <p style={{ color: '#999', fontSize: '12px', marginBottom: '20px', lineHeight: '1.6' }}>{project.description}</p>
                    {project.endDate && (
                      <p style={{ fontSize: '11px', color: urgent ? '#ff6666' : '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '15px' }}>
                        {urgent ? '⚠ ' : ''}{t('customer.deadlineLabel', 'Deadline')}: {new Date(project.endDate).toLocaleDateString('da-DK')}
                        {days !== null && ` (${days > 0 ? days + ' ' + t('customer.daysLabel', 'dage') : days === 0 ? t('customer.todayLabel', 'i dag') : Math.abs(days) + ' ' + t('customer.overdueDaysLabel', 'dage forsinket')})`}
                      </p>
                    )}
                  </div>
                </Link>
                <div style={{ padding: '0 30px 20px' }}>
                  <StatusBadge projectId={project.id} status={project.status} onUpdate={loadData} />
                </div>
              </div>
            )
          })}
        </div>

        {projects.length === 0 && !showForm && <div style={{ textAlign: 'center', paddingTop: '60px' }}><p style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('customer.noProjectsYet', 'Ingen projekter endnu')}</p></div>}
      </div>

      <ChatWidget customerId={customerId} />
    </div>
  )
}
