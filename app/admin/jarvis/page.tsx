import { Suspense } from 'react'
import JarvisHud from '@/app/components/JarvisHud'

function HudLoading() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>LOADING</div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<HudLoading />}>
      <JarvisHud />
    </Suspense>
  )
}
