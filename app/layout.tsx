import './globals.css'
import './ops.css'
import CameraBackgroundProcessor from '@/components/CameraBackgroundProcessor'
import localFont from 'next/font/local'

const mainFont = localFont({
  src: '../public/fonts/OpeningHoursSans-Regular.otf',
  variable: '--font-main',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mainFont.variable}>
      <head>
        <title>MITS — Multiple Identity Tracking System</title>
        <meta name="description" content="Multiple Identity Tracking System — ALPR & Facial Recognition" />
      </head>
      <body>
        <CameraBackgroundProcessor />
        {children}
      </body>
    </html>
  )
}
