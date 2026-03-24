import './globals.css'
import type { ReactNode } from 'react'

export const metadata = { title: 'BlueCollar', description: 'Find Skilled Workers Near You' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
