'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import StatusBadge, { STATUSES } from './StatusBadge'
import LanguageSwitcher from './LanguageSwitcher'
import FileUploader from './FileUploader'
import TypingIndicator from './TypingIndicator'
import { useTranslation } from '@/lib/useTranslation'
import { resolveUploadUrl } from '@/lib/resolveUploadUrl'
import { useIsMobile } from '@/lib/useMediaQuery'

const TYPING_THROTTLE_MS = 2000
const TYPING_POLL_MS = 2000

const MEETING_TYPES = [
  { key: 'coffee', labelKey: 'admin.meetingTypeCoffee', label: 'Kaffemøde', color: '#f97316' },
  { key: 'production', labelKey: 'admin.meetingTypeProduction', label: 'Produktion', color: '#3b82f6' },
  { key: 'review', labelKey: 'admin.meetingTypeReview', label: 'Review', color: '#a855f7' },
  { key: 'other', labelKey: 'admin.meetingTypeOther', label: 'Andet', color: '#6b7280' }
]

function meetingTypeInfo(key: string) {
  return MEETING_TYPES.find(m => m.key === key) || MEETING_TYPES[3]
}

export default function AdminPanel() {
  const [customers, setCustomers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [customerForm, setCustomerForm] = useState({ name: '', logoUrl: '', pin: '' })
  const [projectForm, setProjectForm] = useState({ customerId: '', name: '', description: '', clientName: '', logoUrl: '', startDate: '', endDate: '' })
  const router = useRouter()
  const searchParams = useSearchParams()
  const chatParam = searchParams.get('chat')
  // Bonus: ?chat=<customerId> in the URL (e.g. from an email link) opens
  // straight into the Beskeder tab, derived once up front so there's no
  // flash of the Overblik tab before switching.
  const [view, setView] = useState<'overview' | 'manage' | 'messages' | 'calendar'>(() => (chatParam ? 'messages' : 'overview'))
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [messages, setMessages] = useState<any[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [timeline, setTimeline] = useState<any[]>([])
  const [calendarMonth, setCalendarMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [meetings, setMeetings] = useState<any[]>([])
  const [showMeetingForm, setShowMeetingForm] = useState(false)
  const [meetingForm, setMeetingForm] = useState({ customerId: '', title: '', description: '', meetingDate: '', meetingTime: '', duration: '60', meetingType: 'coffee', location: '' })
  const [replyImage, setReplyImage] = useState('')
  const [replyImageUploading, setReplyImageUploading] = useState(false)
  const [customerTyping, setCustomerTyping] = useState(false)
  const replyAttachInputRef = useRef<HTMLInputElement>(null)
  const lastTypingSentRef = useRef(0)
  const { t } = useTranslation()
  const isMobile = useIsMobile()

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    loadMessages()
    const iv = setInterval(loadMessages, 6000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    if (chatParam) openConversation(chatParam)
  }, [chatParam])

  useEffect(() => {
    if (!selectedCustomerId) return
    checkTyping(selectedCustomerId)
    const iv = setInterval(() => checkTyping(selectedCustomerId), TYPING_POLL_MS)
    return () => clearInterval(iv)
  }, [selectedCustomerId])

  async function checkTyping(customerId: string) {
    try {
      const res = await fetch(`/api/typing?customerId=${customerId}`)
      const data = await res.json()
      setCustomerTyping(!!data.customerTyping)
    } catch (e) {}
  }

  function notifyTyping() {
    if (!selectedCustomerId) return
    const now = Date.now()
    if (now - lastTypingSentRef.current < TYPING_THROTTLE_MS) return
    lastTypingSentRef.current = now
    fetch('/api/typing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId: selectedCustomerId, sender: 'admin' }) }).catch(() => {})
  }

  async function loadMessages() {
    const res = await fetch('/api/messages?admin=1010')
    const data = await res.json()
    setMessages(data || [])
  }

  async function openConversation(customerId: string) {
    setSelectedCustomerId(customerId)
    await fetch('/api/messages', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId, reader: 'admin' }) })
    setMessages(prev => prev.map(m => m.customerId === customerId && m.sender === 'customer' ? { ...m, readByAdmin: true } : m))
  }

  async function handleReplyAttach(e: any) {
    const file = e.target.files?.[0]
    if (!file) return
    setReplyImageUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok && data.url) setReplyImage(data.url)
    } catch (e) {}
    setReplyImageUploading(false)
    if (replyAttachInputRef.current) replyAttachInputRef.current.value = ''
  }

  async function sendReply() {
    if ((!reply.trim() && !replyImage) || !selectedCustomerId || sendingReply) return
    setSendingReply(true)
    await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId: selectedCustomerId, sender: 'admin', content: reply.trim(), imageUrl: replyImage || null }) })
    setReply('')
    setReplyImage('')
    setSendingReply(false)
    loadMessages()
  }

  async function loadData() {
    const [c, p, t, m] = await Promise.all([
      fetch('/api/customers?admin=1010').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/timeline?admin=1010').then(r => r.json()),
      fetch('/api/meetings').then(r => r.json())
    ])
    setCustomers(c || [])
    setProjects(p || [])
    setTimeline(t || [])
    setMeetings(m || [])
    setLoading(false)
  }

  async function createMeeting(e: any) {
    e.preventDefault()
    if (!meetingForm.customerId || !meetingForm.title || !meetingForm.meetingDate || !meetingForm.meetingTime) return
    await fetch('/api/meetings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(meetingForm) })
    setMeetingForm({ customerId: '', title: '', description: '', meetingDate: '', meetingTime: '', duration: '60', meetingType: 'coffee', location: '' })
    setShowMeetingForm(false)
    loadData()
  }

  async function deleteMeeting(id: string) {
    if (!confirm(t('admin.deleteMeetingConfirm', 'Slet aftale?'))) return
    await fetch(`/api/meetings/${id}`, { method: 'DELETE' })
    setSelectedDate(null)
    loadData()
  }

  function prevMonth() {
    setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
    setSelectedDate(null)
  }

  function nextMonth() {
    setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))
    setSelectedDate(null)
  }

  function getMonthGrid(monthDate: Date) {
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const leadingBlanks = (firstDay.getDay() + 6) % 7 // Monday-first
    const cells: (string | null)[] = []
    for (let i = 0; i < leadingBlanks; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }

  async function createCustomer(e: any) {
    e.preventDefault()
    if (!customerForm.name || !customerForm.pin || customerForm.pin.length !== 4) return
    await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(customerForm) })
    setCustomerForm({ name: '', logoUrl: '', pin: '' })
    setShowCustomerForm(false)
    loadData()
  }

  async function createProject(e: any) {
    e.preventDefault()
    if (!projectForm.name || !projectForm.customerId) return
    await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...projectForm, status: 'new' }) })
    setProjectForm({ customerId: '', name: '', description: '', clientName: '', logoUrl: '', startDate: '', endDate: '' })
    setShowProjectForm(false)
    loadData()
  }

  async function deleteCustomer(id: string, e: any) {
    e.stopPropagation()
    if (!confirm(t('admin.deleteCustomerConfirm', 'Slet kunde og alle deres projekter?'))) return
    await fetch(`/api/customers/${id}`, { method: 'DELETE' })
    loadData()
  }

  async function deleteProject(id: string) {
    if (!confirm(t('admin.deleteProjectConfirm', 'Slet projekt?'))) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    loadData()
  }

  function daysUntil(dateStr: string) {
    if (!dateStr) return null
    const target = new Date(dateStr)
    const now = new Date()
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  // Sort projects: overdue first, then by deadline ascending, then by createdAt
  const sortedProjects = [...projects].sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1
    if (b.status === 'done' && a.status !== 'done') return -1
    if (a.endDate && b.endDate) return new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
    if (a.endDate) return -1
    if (b.endDate) return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const filteredProjects = filterStatus === 'all' ? sortedProjects : sortedProjects.filter(p => p.status === filterStatus)

  const totalUnread = messages.filter(m => m.sender === 'customer' && !m.readByAdmin).length

  // Calendar events: project deadlines + timeline milestones + meetings, color-coded
  type CalendarEvent = { id: string, date: string, kind: 'deadline' | 'milestone' | 'meeting', title: string, projectId?: string, meeting?: any, customer: any, color: string }
  const calendarEvents: CalendarEvent[] = [
    ...projects.filter((p: any) => p.endDate).map((p: any) => {
      const customer = customers.find((c: any) => c.id === p.customerId)
      const days = daysUntil(p.endDate)
      const done = p.status === 'done'
      const overdue = !done && days !== null && days < 0
      const urgent = !done && days !== null && days >= 0 && days <= 7
      const color = done ? '#4ade80' : overdue ? '#ff6666' : urgent ? '#fbbf24' : '#fff'
      return { id: `deadline-${p.id}`, date: p.endDate.slice(0, 10), kind: 'deadline' as const, title: p.name, projectId: p.id, customer, color }
    }),
    ...timeline.filter((t: any) => t.dueDate).map((t: any) => {
      const project = projects.find((p: any) => p.id === t.projectId)
      const customer = project ? customers.find((c: any) => c.id === project.customerId) : undefined
      const days = daysUntil(t.dueDate)
      const done = t.status === 'completed' || t.status === 'done'
      const overdue = !done && days !== null && days < 0
      const urgent = !done && days !== null && days >= 0 && days <= 7
      const color = done ? '#4ade80' : overdue ? '#ff6666' : urgent ? '#fbbf24' : '#fff'
      return { id: `milestone-${t.id}`, date: t.dueDate.slice(0, 10), kind: 'milestone' as const, title: t.title, projectId: t.projectId, customer, color }
    }),
    ...meetings.filter((m: any) => m.meetingDate).map((m: any) => {
      const customer = customers.find((c: any) => c.id === m.customerId)
      const color = meetingTypeInfo(m.meetingType).color
      return { id: `meeting-${m.id}`, date: m.meetingDate.slice(0, 10), kind: 'meeting' as const, title: m.title, meeting: m, customer, color }
    })
  ]
  const eventsByDate: Record<string, CalendarEvent[]> = {}
  calendarEvents.forEach(e => { (eventsByDate[e.date] = eventsByDate[e.date] || []).push(e) })

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const monthGrid = getMonthGrid(calendarMonth)
  const monthLabel = calendarMonth.toLocaleDateString('da-DK', { month: 'long', year: 'numeric' })
  const weekdays = t('admin.calendarWeekdays', 'MAN,TIR,ON,TOR,FRE,LØR,SØN').split(',')

  // Stats
  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status !== 'done').length,
    urgent: projects.filter(p => { const d = daysUntil(p.endDate); return d !== null && d <= 7 && p.status !== 'done' }).length,
    overdue: projects.filter(p => { const d = daysUntil(p.endDate); return d !== null && d < 0 && p.status !== 'done' }).length,
    done: projects.filter(p => p.status === 'done').length
  }

  if (loading) return <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t('common.loading', 'LOADING')}</div>

  return (
    <div className="ap-page" style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '60px 40px' }}>
      <style>{`
        @media (max-width: 767px) {
          .ap-page { padding: 20px 14px !important; }
          .ap-top-header { margin-bottom: 30px !important; padding-bottom: 20px !important; }
          .ap-top-header h1 { font-size: 30px !important; }
          .ap-tabs { display: flex !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch; scrollbar-width: none; margin: 0 -14px 30px !important; padding: 0 14px !important; }
          .ap-tabs::-webkit-scrollbar { display: none; }
          .ap-tabs button { flex-shrink: 0; margin-right: 26px !important; white-space: nowrap; }
          .ap-meeting-cta { width: 100%; min-height: 48px; }
          .ap-stats { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .ap-stats > div { padding: 16px !important; }
          .ap-stats p:last-child { font-size: 26px !important; }
          .ap-filter button { min-height: 40px; }
          .ap-row { grid-template-columns: 52px 1fr !important; gap: 10px 14px !important; padding: 16px !important; }
          .ap-row > *:nth-child(3), .ap-row > *:nth-child(4), .ap-row > *:nth-child(5) { grid-column: 1 / -1 !important; }
          .ap-row > *:nth-child(3) { text-align: left !important; }
          .ap-manage-grid { grid-template-columns: 1fr !important; }
          .ap-manage-form { max-width: 100% !important; padding: 20px !important; }
          .ap-manage-form-grid { grid-template-columns: 1fr !important; }
          .ap-manage-form-actions { flex-direction: column !important; }
          .ap-manage-form-actions button { width: 100%; min-height: 44px; }
          .ap-messages-grid { grid-template-columns: 1fr !important; min-height: calc(100vh - 220px) !important; }
          .ap-thread-scroll { max-height: none !important; }
          .ap-calendar-cell { min-height: 52px !important; padding: 6px !important; }
          .ap-calendar-nav button { min-width: 44px; min-height: 44px; }
          .ap-daycard { padding: 16px !important; }
          .ap-meeting-modal { padding: 0 !important; }
          .ap-meeting-form { max-width: none !important; width: 100% !important; height: 100% !important; max-height: none !important; border-left: none !important; border-right: none !important; border-bottom: none !important; padding: 24px 20px !important; padding-top: max(24px, env(safe-area-inset-top)) !important; padding-bottom: max(24px, env(safe-area-inset-bottom)) !important; }
          .ap-meeting-form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <LanguageSwitcher />
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div className="ap-top-header" style={{ marginBottom: '60px', borderBottom: '1px solid #333', paddingBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '48px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>{t('admin.title', 'ADMIN')}</h1>
            <p style={{ fontSize: '12px', color: '#999', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('admin.subtitle', 'Chrome Vault Studios')}</p>
          </div>
          <button onClick={() => { try { window.localStorage.removeItem('isAdmin') } catch (e) {}; router.push('/') }} style={{ padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid #333', color: '#999', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', flexShrink: 0 }}>{t('common.logout', 'Log ud')}</button>
        </div>

        {/* View toggle */}
        <div className="ap-tabs" style={{ borderBottom: '1px solid #333', marginBottom: '40px' }}>
          <button onClick={() => setView('overview')} style={{ padding: '15px 0', marginRight: '40px', backgroundColor: 'transparent', border: 'none', color: view === 'overview' ? '#fff' : '#666', cursor: 'pointer', fontSize: '13px', fontWeight: view === 'overview' ? '900' : 'normal', letterSpacing: '1px', textTransform: 'uppercase', borderBottom: view === 'overview' ? '2px solid #fff' : '2px solid transparent' }}>{t('admin.tabOverview', 'Overblik')}</button>
          <button onClick={() => setView('manage')} style={{ padding: '15px 0', marginRight: '40px', backgroundColor: 'transparent', border: 'none', color: view === 'manage' ? '#fff' : '#666', cursor: 'pointer', fontSize: '13px', fontWeight: view === 'manage' ? '900' : 'normal', letterSpacing: '1px', textTransform: 'uppercase', borderBottom: view === 'manage' ? '2px solid #fff' : '2px solid transparent' }}>{t('admin.tabManage', 'Håndter Kunder')}</button>
          <button onClick={() => setView('messages')} style={{ padding: '15px 0', marginRight: '40px', backgroundColor: 'transparent', border: 'none', color: view === 'messages' ? '#fff' : '#666', cursor: 'pointer', fontSize: '13px', fontWeight: view === 'messages' ? '900' : 'normal', letterSpacing: '1px', textTransform: 'uppercase', borderBottom: view === 'messages' ? '2px solid #fff' : '2px solid transparent', position: 'relative' }}>
            {t('admin.tabMessages', 'Beskeder')}
            {totalUnread > 0 && <span style={{ position: 'absolute', top: '8px', right: '-20px', backgroundColor: '#ff6666', color: '#fff', fontSize: '9px', fontWeight: 'bold', minWidth: '17px', height: '17px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{totalUnread > 9 ? '9+' : totalUnread}</span>}
          </button>
          <button onClick={() => setView('calendar')} style={{ padding: '15px 0', marginRight: '40px', backgroundColor: 'transparent', border: 'none', color: view === 'calendar' ? '#fff' : '#666', cursor: 'pointer', fontSize: '13px', fontWeight: view === 'calendar' ? '900' : 'normal', letterSpacing: '1px', textTransform: 'uppercase', borderBottom: view === 'calendar' ? '2px solid #fff' : '2px solid transparent' }}>{t('admin.tabCalendar', 'Kalender')}</button>
        </div>

        {view === 'overview' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '30px' }}>
              <button className="ap-meeting-cta" onClick={() => setShowMeetingForm(true)} style={{ padding: '12px 24px', backgroundColor: 'transparent', border: '1px solid #fff', color: '#fff', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 'bold' }}>+ {t('admin.createMeetingBtn', 'Opret Aftale')}</button>
            </div>

            {/* Stats */}
            <div className="ap-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '50px' }}>
              <div style={{ padding: '25px', border: '1px solid #333' }}>
                <p style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>{t('admin.statTotalProjects', 'Total Projekter')}</p>
                <p style={{ fontSize: '36px', fontWeight: '900' }}>{stats.total}</p>
              </div>
              <div style={{ padding: '25px', border: '1px solid #333' }}>
                <p style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>{t('admin.statActive', 'Aktive')}</p>
                <p style={{ fontSize: '36px', fontWeight: '900', color: '#60a5fa' }}>{stats.active}</p>
              </div>
              <div style={{ padding: '25px', border: `1px solid ${stats.urgent > 0 ? '#fbbf24' : '#333'}` }}>
                <p style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>{t('admin.statUrgent', '⚠ Deadline < 7 dage')}</p>
                <p style={{ fontSize: '36px', fontWeight: '900', color: stats.urgent > 0 ? '#fbbf24' : '#fff' }}>{stats.urgent}</p>
              </div>
              <div style={{ padding: '25px', border: `1px solid ${stats.overdue > 0 ? '#ff6666' : '#333'}` }}>
                <p style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>{t('admin.statOverdue', '🔴 Forsinket')}</p>
                <p style={{ fontSize: '36px', fontWeight: '900', color: stats.overdue > 0 ? '#ff6666' : '#fff' }}>{stats.overdue}</p>
              </div>
              <div style={{ padding: '25px', border: '1px solid #333' }}>
                <p style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>{t('admin.statDone', '✓ Færdige')}</p>
                <p style={{ fontSize: '36px', fontWeight: '900', color: '#4ade80' }}>{stats.done}</p>
              </div>
            </div>

            {/* Filter */}
            <div className="ap-filter" style={{ marginBottom: '30px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginRight: '10px' }}>{t('admin.filterLabel', 'Filter:')}</span>
              <button onClick={() => setFilterStatus('all')} style={{ padding: '8px 14px', backgroundColor: filterStatus === 'all' ? '#fff' : 'transparent', color: filterStatus === 'all' ? '#000' : '#999', border: '1px solid #333', cursor: 'pointer', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('admin.filterAll', 'Alle')}</button>
              {STATUSES.map(s => (
                <button key={s.key} onClick={() => setFilterStatus(s.key)} style={{ padding: '8px 14px', backgroundColor: filterStatus === s.key ? s.bg : 'transparent', color: filterStatus === s.key ? s.color : '#999', border: `1px solid ${filterStatus === s.key ? s.color : '#333'}`, cursor: 'pointer', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t(s.labelKey, s.label)}</button>
              ))}
            </div>

            {/* Projects table/list */}
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '20px' }}>{t('admin.projectsHeading', 'Projekter')}</h2>
              {filteredProjects.length === 0 ? (
                <p style={{ color: '#666', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('admin.noProjectsMatchFilter', 'Ingen projekter matcher filtret')}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredProjects.map((p: any) => {
                    const customer = customers.find((c: any) => c.id === p.customerId)
                    const days = daysUntil(p.endDate)
                    const urgent = days !== null && days <= 7 && p.status !== 'done'
                    const overdue = days !== null && days < 0 && p.status !== 'done'
                    return (
                      <div key={p.id} className="ap-row" style={{ padding: '20px', border: `1px solid ${overdue ? '#ff6666' : urgent ? '#fbbf24' : '#333'}`, display: 'grid', gridTemplateColumns: '60px 1fr auto auto auto', gap: '20px', alignItems: 'center' }}>
                        {customer?.logoUrl ? (
                          <img src={resolveUploadUrl(customer.logoUrl)} alt={customer.name} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #333' }} />
                        ) : (
                          <div style={{ width: '50px', height: '50px', borderRadius: '50%', border: '1px solid #333', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '18px', color: '#666' }}>{customer?.name.charAt(0) || '?'}</span>
                          </div>
                        )}
                        <div>
                          <p style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{customer?.name || t('admin.noCustomer', 'Ingen kunde')}</p>
                          <h3 style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{p.name}</h3>
                          {p.description && <p style={{ fontSize: '11px', color: '#999' }}>{p.description}</p>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {p.endDate ? (
                            <>
                              <p style={{ fontSize: '11px', color: overdue ? '#ff6666' : urgent ? '#fbbf24' : '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{t('customer.deadlineLabel', 'Deadline')}</p>
                              <p style={{ fontSize: '13px', color: overdue ? '#ff6666' : urgent ? '#fbbf24' : '#fff', fontWeight: 'bold' }}>{new Date(p.endDate).toLocaleDateString('da-DK')}</p>
                              {days !== null && (
                                <p style={{ fontSize: '10px', color: overdue ? '#ff6666' : urgent ? '#fbbf24' : '#666', marginTop: '2px' }}>
                                  {days > 0 ? `${days} ${t('customer.daysLabel', 'dage')}` : days === 0 ? t('customer.todayLabel', 'I dag') : `${Math.abs(days)} ${t('customer.overdueDaysLabel', 'dage forsinket')}`}
                                </p>
                              )}
                            </>
                          ) : (
                            <p style={{ fontSize: '11px', color: '#666' }}>{t('admin.noDeadline', 'Ingen deadline')}</p>
                          )}
                        </div>
                        <StatusBadge projectId={p.id} status={p.status} onUpdate={loadData} />
                        <Link href={`/project/${p.id}`} style={{ padding: '8px 14px', minHeight: '40px', display: 'inline-flex', alignItems: 'center', backgroundColor: 'transparent', border: '1px solid #666', color: '#999', textDecoration: 'none', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('common.open', 'Åbn')}</Link>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'manage' && (
          <div>
            {/* KUNDER */}
            <div style={{ marginBottom: '80px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase' }}>{t('admin.customersHeading', 'Kunder')}</h2>
                {!showCustomerForm && <button onClick={() => setShowCustomerForm(true)} style={{ padding: '12px 24px', backgroundColor: 'transparent', border: '1px solid #fff', color: '#fff', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 'bold' }}>+ {t('admin.newCustomer', 'Ny Kunde')}</button>}
              </div>

              {showCustomerForm && (
                <form onSubmit={createCustomer} className="ap-manage-form" style={{ marginBottom: '40px', maxWidth: '600px', border: '1px solid #333', padding: '30px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>{t('admin.customerName', 'Kunde Navn')}</label>
                    <input type="text" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '16px', outline: 'none' }} required />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>{t('customer.logoUrl', 'Logo URL')}</label>
                    <input type="url" inputMode="url" value={customerForm.logoUrl} onChange={(e) => setCustomerForm({ ...customerForm, logoUrl: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '16px', outline: 'none', marginBottom: '15px' }} />
                    <p style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>{t('upload.orLabel', 'eller')}</p>
                    <FileUploader value={customerForm.logoUrl} onUploaded={(url) => setCustomerForm({ ...customerForm, logoUrl: url })} />
                  </div>
                  <div style={{ marginBottom: '30px' }}>
                    <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>{t('admin.pinLabel', 'PIN (4 cifre)')}</label>
                    <input type="password" inputMode="numeric" value={customerForm.pin} onChange={(e) => setCustomerForm({ ...customerForm, pin: e.target.value })} maxLength={4} pattern="[0-9]{4}" style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '16px', outline: 'none' }} required />
                  </div>
                  <div className="ap-manage-form-actions" style={{ display: 'flex', gap: '15px' }}>
                    <button type="submit" style={{ padding: '12px 24px', minHeight: '44px', backgroundColor: '#fff', border: 'none', color: '#000', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('common.create', 'Opret')}</button>
                    <button type="button" onClick={() => setShowCustomerForm(false)} style={{ padding: '12px 24px', minHeight: '44px', backgroundColor: 'transparent', border: '1px solid #333', color: '#999', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('common.cancel', 'Annuller')}</button>
                  </div>
                </form>
              )}

              <div className="ap-manage-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {customers.map((c: any) => (
                  <div key={c.id} onClick={() => router.push(`/customer/${c.id}`)} style={{ border: '1px solid #333', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.borderColor = '#fff' }} onMouseOut={(e) => { e.currentTarget.style.borderColor = '#333' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '1px solid #333', overflow: 'hidden', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {c.logoUrl ? <img src={resolveUploadUrl(c.logoUrl)} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '20px', color: '#666' }}>{c.name.charAt(0)}</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>{c.name}</h3>
                      <p style={{ fontSize: '11px', color: '#666' }}>{t('admin.pinPrefix', 'PIN:')} {c.pin}</p>
                    </div>
                    <button onClick={(e) => deleteCustomer(c.id, e)} style={{ padding: '6px 12px', minHeight: '36px', backgroundColor: 'transparent', border: '1px solid #666', color: '#999', cursor: 'pointer', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('common.delete', 'Slet')}</button>
                  </div>
                ))}
              </div>
            </div>

            {/* PROJEKTER */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase' }}>{t('admin.allProjectsHeading', 'Alle Projekter')}</h2>
                {!showProjectForm && customers.length > 0 && <button onClick={() => setShowProjectForm(true)} style={{ padding: '12px 24px', backgroundColor: 'transparent', border: '1px solid #fff', color: '#fff', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 'bold' }}>+ {t('admin.newProjectBtn', 'Nyt Projekt')}</button>}
              </div>

              {showProjectForm && (
                <form onSubmit={createProject} className="ap-manage-form" style={{ marginBottom: '40px', maxWidth: '600px', border: '1px solid #333', padding: '30px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>{t('admin.customerLabel', 'Kunde')}</label>
                    <select value={projectForm.customerId} onChange={(e) => setProjectForm({ ...projectForm, customerId: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '16px', outline: 'none' }} required>
                      <option value="" style={{ backgroundColor: '#000' }}>{t('admin.selectCustomer', 'Vælg kunde')}</option>
                      {customers.map((c: any) => <option key={c.id} value={c.id} style={{ backgroundColor: '#000' }}>{c.name}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>{t('customer.projectName', 'Projekt Navn')}</label>
                    <input type="text" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '16px', outline: 'none' }} required />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>{t('customer.description', 'Beskrivelse')}</label>
                    <textarea value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '16px', outline: 'none', minHeight: '60px', fontFamily: 'inherit', resize: 'none' }} />
                  </div>
                  <div className="ap-manage-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>{t('customer.startDate', 'Start Dato')}</label>
                      <input type="date" value={projectForm.startDate} onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '16px', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>{t('customer.deadlineLabel', 'Deadline')}</label>
                      <input type="date" value={projectForm.endDate} onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '16px', outline: 'none' }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '30px' }}>
                    <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>{t('customer.logoUrl', 'Logo URL')}</label>
                    <input type="url" inputMode="url" value={projectForm.logoUrl} onChange={(e) => setProjectForm({ ...projectForm, logoUrl: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '16px', outline: 'none', marginBottom: '15px' }} />
                    <p style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>{t('upload.orLabel', 'eller')}</p>
                    <FileUploader value={projectForm.logoUrl} onUploaded={(url) => setProjectForm({ ...projectForm, logoUrl: url })} />
                  </div>
                  <div className="ap-manage-form-actions" style={{ display: 'flex', gap: '15px' }}>
                    <button type="submit" style={{ padding: '12px 24px', minHeight: '44px', backgroundColor: '#fff', border: 'none', color: '#000', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('common.create', 'Opret')}</button>
                    <button type="button" onClick={() => setShowProjectForm(false)} style={{ padding: '12px 24px', minHeight: '44px', backgroundColor: 'transparent', border: '1px solid #333', color: '#999', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('common.cancel', 'Annuller')}</button>
                  </div>
                </form>
              )}

              <div className="ap-manage-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                {projects.map((p: any) => {
                  const customer = customers.find((c: any) => c.id === p.customerId)
                  return (
                    <div key={p.id} style={{ border: '1px solid #333' }}>
                      {p.logoUrl && <img src={resolveUploadUrl(p.logoUrl)} alt={p.name} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />}
                      <div style={{ padding: '20px' }}>
                        <p style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>{customer?.name || t('admin.noCustomer', 'Ingen kunde')}</p>
                        <h3 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>{p.name}</h3>
                        <p style={{ fontSize: '12px', color: '#999', marginBottom: '15px' }}>{p.description}</p>
                        <div style={{ marginBottom: '15px' }}>
                          <StatusBadge projectId={p.id} status={p.status} onUpdate={loadData} />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <Link href={`/project/${p.id}`} style={{ padding: '6px 12px', minHeight: '36px', display: 'inline-flex', alignItems: 'center', backgroundColor: 'transparent', border: '1px solid #666', color: '#999', textDecoration: 'none', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('common.open', 'Åbn')}</Link>
                          <button onClick={() => deleteProject(p.id)} style={{ padding: '6px 12px', minHeight: '36px', backgroundColor: 'transparent', border: '1px solid #666', color: '#999', cursor: 'pointer', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('common.delete', 'Slet')}</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {view === 'messages' && (
          <div className="ap-messages-grid" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '30px', minHeight: '500px' }}>
            {(!isMobile || !selectedCustomerId) && (
              <div style={{ border: '1px solid #333' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #333' }}>
                  <h2 style={{ fontSize: '14px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('admin.conversationsHeading', 'Samtaler')}</h2>
                </div>
                <div>
                  {customers.length === 0 && <p style={{ padding: '20px', color: '#666', fontSize: '12px' }}>{t('admin.noCustomersYet', 'Ingen kunder endnu')}</p>}
                  {customers.map((c: any) => {
                    const msgs = messages.filter((m: any) => m.customerId === c.id)
                    const unread = msgs.filter((m: any) => m.sender === 'customer' && !m.readByAdmin).length
                    const last = msgs[msgs.length - 1]
                    const active = selectedCustomerId === c.id
                    return (
                      <div key={c.id} onClick={() => openConversation(c.id)} style={{ padding: '16px 20px', borderBottom: '1px solid #222', cursor: 'pointer', backgroundColor: active ? '#111' : 'transparent', display: 'flex', alignItems: 'center', gap: '12px', minHeight: '44px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', border: '1px solid #333', backgroundColor: '#111', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {c.logoUrl ? <img src={resolveUploadUrl(c.logoUrl)} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '13px', color: '#666' }}>{c.name.charAt(0)}</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>{c.name}</p>
                          <p style={{ fontSize: '11px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{last ? `${last.sender === 'admin' ? t('admin.youPrefix', 'Dig:') + ' ' : ''}${last.content || t('chat.attachImage', 'Billede')}` : t('admin.noMessagesYet', 'Ingen beskeder endnu')}</p>
                        </div>
                        {unread > 0 && <span style={{ backgroundColor: '#ff6666', color: '#fff', fontSize: '10px', fontWeight: 'bold', minWidth: '20px', height: '20px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0 }}>{unread}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {(!isMobile || selectedCustomerId) && (
            <div style={{ border: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
              {!selectedCustomerId ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: '#666', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('admin.selectConversation', 'Vælg en samtale')}</p>
                </div>
              ) : (() => {
                const activeCustomer = customers.find((c: any) => c.id === selectedCustomerId)
                const thread = messages.filter((m: any) => m.customerId === selectedCustomerId)
                return (
                  <>
                    <div style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', gap: '14px' }}>
                      {isMobile && (
                        <button onClick={() => setSelectedCustomerId(null)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer', padding: 0, minWidth: '44px', minHeight: '44px', flexShrink: 0 }}>←</button>
                      )}
                      <p style={{ fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>{activeCustomer?.name}</p>
                    </div>
                    <div className="ap-thread-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '400px' }}>
                      {thread.length === 0 && <p style={{ color: '#666', fontSize: '12px' }}>{t('admin.noMessagesYet', 'Ingen beskeder endnu')}</p>}
                      {thread.map((m: any) => (
                        <div key={m.id} style={{ alignSelf: m.sender === 'admin' ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                          {(m.projectRef || m.sceneRef) && (
                            <p style={{ fontSize: '9px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', textAlign: m.sender === 'admin' ? 'right' : 'left' }}>
                              {[m.projectRef, m.sceneRef].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          {m.imageUrl && (
                            <a href={resolveUploadUrl(m.imageUrl)} target="_blank" rel="noreferrer" style={{ display: 'block', marginBottom: m.content ? '6px' : 0 }}>
                              <img src={resolveUploadUrl(m.imageUrl)} alt="" style={{ maxWidth: '300px', maxHeight: '300px', display: 'block', border: m.sender === 'admin' ? 'none' : '1px solid #333' }} />
                            </a>
                          )}
                          {m.content && (
                            <div style={{ padding: '10px 14px', backgroundColor: m.sender === 'admin' ? '#fff' : 'transparent', color: m.sender === 'admin' ? '#000' : '#fff', border: m.sender === 'admin' ? 'none' : '1px solid #333', fontSize: '13px', lineHeight: '1.5', wordBreak: 'break-word' }}>
                              {m.content}
                            </div>
                          )}
                          <p style={{ fontSize: '9px', color: '#666', marginTop: '4px', textAlign: m.sender === 'admin' ? 'right' : 'left' }}>{new Date(m.createdAt).toLocaleString('da-DK')}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '16px 20px', borderTop: '1px solid #333' }}>
                      {customerTyping && <TypingIndicator label={t('chat.typingTemplate', '{name} skriver...').replace('{name}', activeCustomer?.name || '')} />}
                      {(replyImage || replyImageUploading) && (
                        <div style={{ marginBottom: '10px' }}>
                          {replyImageUploading ? (
                            <p style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('upload.uploadingLabel', 'Uploader...')}</p>
                          ) : (
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                              <img src={resolveUploadUrl(replyImage)} alt="" style={{ maxHeight: '70px', maxWidth: '110px', display: 'block', border: '1px solid #333' }} />
                              <button onClick={() => setReplyImage('')} style={{ position: 'absolute', top: '-8px', right: '-8px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff', color: '#000', border: 'none', cursor: 'pointer', fontSize: '12px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>×</button>
                            </div>
                          )}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <textarea
                          value={reply}
                          onChange={(e) => { setReply(e.target.value); notifyTyping() }}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                          placeholder={t('admin.typeReplyPlaceholder', 'Skriv et svar...')}
                          style={{ flex: 1, resize: 'none', minHeight: '44px', maxHeight: '100px', padding: '10px', backgroundColor: 'transparent', border: '1px solid #333', color: '#fff', fontSize: '16px', outline: 'none', fontFamily: 'inherit' }}
                        />
                        <button type="button" onClick={() => replyAttachInputRef.current?.click()} title={t('chat.attachImage', 'Billede')} style={{ width: '44px', minHeight: '44px', padding: 0, backgroundColor: 'transparent', border: '1px solid #333', color: '#999', cursor: 'pointer', fontSize: '18px', lineHeight: 1, flexShrink: 0 }}>+</button>
                        <input ref={replyAttachInputRef} type="file" accept="image/*" onChange={handleReplyAttach} style={{ display: 'none' }} />
                        <button onClick={sendReply} disabled={sendingReply || (!reply.trim() && !replyImage)} style={{ padding: '0 20px', minHeight: '44px', backgroundColor: '#fff', border: 'none', color: '#000', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', opacity: sendingReply || (!reply.trim() && !replyImage) ? 0.5 : 1, flexShrink: 0 }}>{t('common.send', 'Send')}</button>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
            )}
          </div>
        )}

        {view === 'calendar' && (
          <div>
            {/* Month navigation */}
            <div className="ap-calendar-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px' }}>
              <button onClick={prevMonth} style={{ padding: '10px 18px', minWidth: '44px', minHeight: '44px', backgroundColor: 'transparent', border: '1px solid #333', color: '#fff', cursor: 'pointer', fontSize: '14px' }}>←</button>
              <h2 style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'center' }}>{monthLabel}</h2>
              <button onClick={nextMonth} style={{ padding: '10px 18px', minWidth: '44px', minHeight: '44px', backgroundColor: 'transparent', border: '1px solid #333', color: '#fff', cursor: 'pointer', fontSize: '14px' }}>→</button>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', flexWrap: 'wrap' }}>
              {[
                { color: '#ff6666', label: t('admin.calendarLegendOverdue', 'Forsinket') },
                { color: '#fbbf24', label: t('admin.calendarLegendUrgent', '< 7 dage') },
                { color: '#fff', label: t('admin.calendarLegendNormal', 'Normal') },
                { color: '#4ade80', label: t('admin.calendarLegendDone', 'Done') }
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: l.color, display: 'inline-block' }} />
                  <span style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{l.label}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', flexWrap: 'wrap' }}>
              {MEETING_TYPES.map(mt => (
                <div key={mt.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: mt.color, display: 'inline-block' }} />
                  <span style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t(mt.labelKey, mt.label)}</span>
                </div>
              ))}
            </div>

            {/* Weekday header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', marginBottom: '1px' }}>
              {weekdays.map(d => (
                <div key={d} style={{ padding: '10px', textAlign: 'center', fontSize: '10px', color: '#666', letterSpacing: '1px' }}>{d}</div>
              ))}
            </div>

            {/* Month grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', backgroundColor: '#222', marginBottom: '40px' }}>
              {monthGrid.map((dateStr, i) => {
                if (!dateStr) return <div key={i} style={{ backgroundColor: '#000', minHeight: '90px' }} />
                const dayEvents = eventsByDate[dateStr] || []
                const isToday = dateStr === todayStr
                const isSelected = dateStr === selectedDate
                return (
                  <div
                    key={i}
                    className="ap-calendar-cell"
                    onClick={() => setSelectedDate(dayEvents.length > 0 ? (isSelected ? null : dateStr) : null)}
                    style={{ backgroundColor: isSelected ? '#111' : '#000', minHeight: '90px', padding: '8px', cursor: dayEvents.length > 0 ? 'pointer' : 'default', border: isToday ? '1px solid #fff' : '1px solid transparent' }}
                  >
                    <p style={{ fontSize: '11px', color: isToday ? '#fff' : '#666', fontWeight: isToday ? 'bold' : 'normal', marginBottom: '6px' }}>{parseInt(dateStr.slice(8, 10), 10)}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                      {dayEvents.slice(0, 4).map(ev => (
                        <div key={ev.id} title={ev.title} style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${ev.color}`, overflow: 'hidden', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {ev.customer?.logoUrl ? <img src={resolveUploadUrl(ev.customer.logoUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '7px', color: '#999' }}>{ev.customer?.name?.charAt(0) || '?'}</span>}
                        </div>
                      ))}
                      {dayEvents.length > 4 && <span style={{ fontSize: '9px', color: '#999' }}>+{dayEvents.length - 4}</span>}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Selected date event list */}
            {selectedDate && (
              <div className="ap-daycard" style={{ border: '1px solid #333', padding: '25px 30px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '20px' }}>
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {(eventsByDate[selectedDate] || []).map(ev => {
                    const kindLabel = ev.kind === 'deadline' ? t('admin.calendarDeadlineKind', 'Deadline') : ev.kind === 'meeting' ? t('admin.calendarMeetingKind', 'Aftale') : t('admin.calendarMilestoneKind', 'Milestone')
                    return (
                      <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '14px', border: `1px solid ${ev.color === '#fff' ? '#333' : ev.color}` }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `2px solid ${ev.color}`, overflow: 'hidden', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {ev.customer?.logoUrl ? <img src={resolveUploadUrl(ev.customer.logoUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '13px', color: '#999' }}>{ev.customer?.name?.charAt(0) || '?'}</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '9px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>{ev.customer?.name || t('admin.noCustomer', 'Ingen kunde')} · {kindLabel}</p>
                          <p style={{ fontSize: '13px', fontWeight: 'bold', color: ev.color }}>{ev.title}</p>
                          {ev.kind === 'meeting' && ev.meeting && (
                            <p style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                              {ev.meeting.meetingTime} · {ev.meeting.duration || 60} min{ev.meeting.location ? ` · ${ev.meeting.location}` : ''}
                            </p>
                          )}
                        </div>
                        {ev.kind === 'meeting' && ev.meeting ? (
                          <button onClick={() => deleteMeeting(ev.meeting.id)} style={{ padding: '8px 14px', minHeight: '40px', backgroundColor: 'transparent', border: '1px solid #666', color: '#999', cursor: 'pointer', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', flexShrink: 0 }}>{t('common.delete', 'Slet')}</button>
                        ) : (
                          <Link href={`/project/${ev.projectId}`} style={{ padding: '8px 14px', minHeight: '40px', display: 'inline-flex', alignItems: 'center', backgroundColor: 'transparent', border: '1px solid #666', color: '#999', textDecoration: 'none', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', flexShrink: 0 }}>{t('common.open', 'Åbn')}</Link>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showMeetingForm && (
        <div className="ap-meeting-modal" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setShowMeetingForm(false)}>
          <form onSubmit={createMeeting} onClick={(e) => e.stopPropagation()} className="ap-meeting-form" style={{ backgroundColor: '#000', border: '1px solid #333', padding: '40px', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '30px' }}>{t('admin.meetingModalTitle', 'Ny Aftale')}</h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>{t('admin.customerLabel', 'Kunde')}</label>
              <select value={meetingForm.customerId} onChange={(e) => setMeetingForm({ ...meetingForm, customerId: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '16px', outline: 'none' }} required>
                <option value="" style={{ backgroundColor: '#000' }}>{t('admin.selectCustomer', 'Vælg kunde')}</option>
                {customers.map((c: any) => <option key={c.id} value={c.id} style={{ backgroundColor: '#000' }}>{c.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>{t('project.titlePlaceholder', 'Titel')}</label>
              <input type="text" value={meetingForm.title} onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })} placeholder="Kaffemøde" style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '16px', outline: 'none' }} required />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>{t('customer.description', 'Beskrivelse')}</label>
              <textarea value={meetingForm.description} onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '16px', outline: 'none', minHeight: '60px', fontFamily: 'inherit', resize: 'none' }} />
            </div>

            <div className="ap-meeting-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>{t('admin.meetingDateLabel', 'Dato')}</label>
                <input type="date" value={meetingForm.meetingDate} onChange={(e) => setMeetingForm({ ...meetingForm, meetingDate: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '16px', outline: 'none' }} required />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>{t('admin.meetingTimeLabel', 'Tidspunkt')}</label>
                <input type="time" value={meetingForm.meetingTime} onChange={(e) => setMeetingForm({ ...meetingForm, meetingTime: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '16px', outline: 'none' }} required />
              </div>
            </div>

            <div className="ap-meeting-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>{t('admin.meetingDurationLabel', 'Varighed (minutter)')}</label>
                <input type="number" inputMode="numeric" min={5} step={5} value={meetingForm.duration} onChange={(e) => setMeetingForm({ ...meetingForm, duration: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '16px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>{t('admin.meetingTypeLabel', 'Type')}</label>
                <select value={meetingForm.meetingType} onChange={(e) => setMeetingForm({ ...meetingForm, meetingType: e.target.value })} style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '16px', outline: 'none' }}>
                  {MEETING_TYPES.map(mt => <option key={mt.key} value={mt.key} style={{ backgroundColor: '#000' }}>{t(mt.labelKey, mt.label)}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: meetingTypeInfo(meetingForm.meetingType).color, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t(meetingTypeInfo(meetingForm.meetingType).labelKey, meetingTypeInfo(meetingForm.meetingType).label)}</span>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>{t('admin.meetingLocationLabel', 'Sted')}</label>
              <input type="text" value={meetingForm.location} onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })} placeholder="Café Norden, Nørrebro" style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '16px', outline: 'none' }} />
            </div>

            <div className="ap-manage-form-actions" style={{ display: 'flex', gap: '15px' }}>
              <button type="submit" style={{ padding: '12px 24px', minHeight: '44px', backgroundColor: '#fff', border: 'none', color: '#000', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('common.create', 'Opret')}</button>
              <button type="button" onClick={() => setShowMeetingForm(false)} style={{ padding: '12px 24px', minHeight: '44px', backgroundColor: 'transparent', border: '1px solid #333', color: '#999', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('common.cancel', 'Annuller')}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
