'use client'
import { useEffect, useRef } from 'react'
import { useTheme } from '@/lib/ThemeContext'

export interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive = true,
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  const { isLightMode } = useTheme()
  const overlayRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') onConfirm()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onConfirm, onCancel])

  if (!open) return null

  const modalBg = isLightMode ? 'bg-white' : 'bg-[#0e1114] border border-[#222831]'
  const titleColor = isLightMode ? 'text-[#1D1D1F]' : 'text-[#c8d0d8]'
  const msgColor = isLightMode ? 'text-[#8E8E93]' : 'text-[#78899a]'
  const borderDivider = isLightMode ? 'border-[#3C3C43]/20' : 'border-[#222831]'
  const btnHover = isLightMode ? 'hover:bg-slate-50' : 'hover:bg-[#181d22]'
  const cancelBtnColor = 'text-[#0A7E8C]'
  const confirmBtnColor = destructive
    ? 'text-[#FF3B30]'
    : 'text-[#0A7E8C]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        ref={overlayRef}
        className={`rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-w-[320px] w-full mx-4 flex flex-col ${modalBg}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 text-center flex-1">
          <h2 className={`text-[17px] font-semibold mb-1 ${titleColor}`}>{title}</h2>
          <p className={`text-[13px] leading-snug ${msgColor}`}>{message}</p>
        </div>
        
        <div className={`flex border-t h-[44px] ${borderDivider}`}>
          <button 
            onClick={onCancel}
            className={`flex-1 border-r text-[17px] transition-colors ${borderDivider} ${cancelBtnColor} ${btnHover}`}
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className={`flex-1 text-[17px] font-semibold transition-colors ${confirmBtnColor} ${btnHover}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
