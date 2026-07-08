'use client'
import { useEffect, useState } from 'react'
import { WifiOff, Sun, Moon } from 'lucide-react'
import GlobalSearch from './GlobalSearch'

import { useTheme } from '@/lib/ThemeContext'

interface Props {
  title: string
  subtitle?: string
  connected?: boolean
}

export default function TopBar({ title, subtitle, connected }: Props) {
  const { isLightMode, toggleLightMode } = useTheme()
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const bg = isLightMode ? 'rgba(242,242,247,0.85)' : 'rgba(14, 17, 20, 0.85)'
  const border = isLightMode ? 'rgba(60,60,67,0.1)' : '#222831'
  const titleColor = isLightMode ? '#1D1D1F' : '#c8d0d8'
  const subtitleColor = isLightMode ? '#8E8E93' : '#78899a'

  return (
    <header
      className="h-14 sticky top-0 z-10 flex items-center justify-between px-6 gap-8"
      style={{
        background: bg,
        borderBottom: `1px solid ${border}`,
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }}
    >
      <div className="flex-shrink-0 min-w-[200px]">
        <h1 className="font-bold text-base leading-tight" style={{ color: titleColor, letterSpacing: '-0.015em' }}>
          {title}
        </h1>
      </div>

      <div className="flex-1 flex justify-center max-w-xl">
        <GlobalSearch />
      </div>

      <div className="flex items-center justify-end gap-4 flex-shrink-0 min-w-[200px]">
        <button
          onClick={toggleLightMode}
          aria-label="Toggle theme"
          className={`relative flex items-center justify-between p-1 rounded-full border w-12 h-6 transition-all duration-300 ${
            isLightMode ? 'bg-[#F2F2F7] border-slate-300' : 'bg-[#181d22] border-[#222831]'
          }`}
        >
          {/* Sliding Circle */}
          <div 
            className={`absolute top-0.5 bottom-0.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] flex items-center justify-center ${
              isLightMode ? 'bg-white shadow-sm' : 'bg-[#e8a000]'
            }`}
            style={{
              width: '18px',
              height: '18px',
              left: isLightMode ? '2px' : '26px'
            }}
          >
            {isLightMode ? (
              <Sun size={10} className="text-[#FF9500]" />
            ) : (
              <Moon size={10} className="text-[#0a0c0e]" />
            )}
          </div>
        </button>
        <span className="text-[13px] font-mono font-bold w-[64px] text-right inline-block flex-shrink-0" style={{ color: subtitleColor }}>
          {time}
        </span>
      </div>
    </header>
  )
}
