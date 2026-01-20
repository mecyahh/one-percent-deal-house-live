import './globals.css'
import ThemeProvider from './components/ThemeProvider'

export const metadata = {
  title: 'Flow',
  description: 'Deal tracking',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
