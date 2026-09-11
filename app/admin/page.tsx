import { Suspense } from 'react'
import AdminPanel from '@/app/components/AdminPanel'

function AdminLoading() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>LOADING</div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminPanel />
    </Suspense>
  )
}
