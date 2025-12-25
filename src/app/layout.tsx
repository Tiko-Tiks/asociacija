import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Community Core',
  description: 'Community management platform',
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


