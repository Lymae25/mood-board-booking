import { Suspense } from 'react'
import { JetBrains_Mono } from 'next/font/google'
import JarvisHud from '@/app/components/JarvisHud'

const jetBrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '700'] })

function HudLoading() {
  return (
    <div className={jetBrainsMono.className} style={{ minHeight: '100vh', backgroundColor: '#02060d', color: '#4fc3f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase' }}>
      Initialiserer Jarvis...
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<HudLoading />}>
      <JarvisHud fontClassName={jetBrainsMono.className} />
    </Suspense>
  )
}
