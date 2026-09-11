'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useTranslation } from '@/lib/useTranslation'

const BAR_HEIGHT = 56

function readIsAdmin(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem('isAdmin') === 'true'
  } catch (e) {
    return false
  }
}

// A thin bar reminding admin where they are while previewing a customer's
// dashboard or a project, with a one-click way back to /admin. Renders
// nothing for real customers - readIsAdmin() only returns true in a
// browser that actually logged in through the admin PIN.
export default function AdminNav({ trail }: { trail: (string | null | undefined)[] }) {
  // Lazy-init rather than an effect: this page's content is always gated
  // behind a loading screen on first render (see CustomerDashboard/
  // ProjectDetail), so the server-rendered HTML never reaches this far -
  // there's no hydration mismatch to guard against here.
  const [isAdmin] = useState(readIsAdmin)
  const [hovering, setHovering] = useState(false)
  const { t } = useTranslation()

  if (!isAdmin) return null

  const crumbs = [t('admin.title', 'ADMIN'), ...trail.filter((x): x is string => !!x)]

  return (
    <>
      {/* Reserves the space the fixed bar below occupies, so page content
          isn't hidden underneath it. */}
      <div style={{ height: `${BAR_HEIGHT}px` }} />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: `${BAR_HEIGHT}px`, zIndex: 300, backgroundColor: '#000', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', gap: '18px', padding: '0 130px 0 24px' }}>
        <Link
          href="/admin"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', textDecoration: 'none', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', border: `1px solid ${hovering ? '#fff' : '#333'}`, padding: '8px 14px', flexShrink: 0, transition: 'border-color 0.2s' }}
        >
          ← {t('admin.title', 'ADMIN')}
        </Link>
        <p style={{ fontSize: '11px', color: '#666', letterSpacing: '0.5px', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0, margin: 0 }}>
          {crumbs.join(' › ')}
        </p>
        <span style={{ fontSize: '9px', fontWeight: 'bold', letterSpacing: '1px', color: '#000', backgroundColor: '#fff', padding: '5px 10px', flexShrink: 0 }}>
          {t('admin.adminModeBadge', 'ADMIN MODE')}
        </span>
      </div>
    </>
  )
}
