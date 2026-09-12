import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mood Board - Project Booking',
  description: 'Manage your project moods and bookings',
}

// viewportFit: 'cover' lets safe-area-inset-* (notch / home indicator)
// report real values instead of 0, so full-screen views (chat, PIN, admin
// nav) can pad around them.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
