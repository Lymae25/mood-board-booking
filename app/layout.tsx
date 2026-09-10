import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mood Board - Project Booking',
  description: 'Manage your project moods and bookings',
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
