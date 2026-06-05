import type { Metadata } from 'next'
import { Changa } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/layout/theme-provider'

const changa = Changa({
  subsets: ['latin'],
  variable: '--font-changa',
  weight: ['300', '400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'CSFinance — Gestão Financeira',
  description: 'Gestão financeira pessoal e empresarial para colaboradores da CSHUB',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${changa.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-background font-sans">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
