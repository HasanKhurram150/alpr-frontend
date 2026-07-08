'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeProvider, useTheme } from '@/lib/ThemeContext'
import Sidebar from '@/components/ui/Sidebar'
import { ToastProvider } from '@/components/ui/Toast'
import { useSSE } from '@/lib/useSSE'
import { Alert } from '@/types'
import {
  AlertTriangle, X, ShieldAlert, ExternalLink,
  Car, ChevronDown, ChevronUp, Bell, Check, User
} from 'lucide-react'

interface GunAlert { cameraName?: string; cameraId?: string; timestamp: string; frameIndex?: number }

// ─── Weapon Alert Banner ─────────────────────────────────────────────────────

function GunAlertBanner({ alerts, onDismiss }: { alerts: GunAlert[]; onDismiss: () => void }) {
  if (alerts.length === 0) return null
  const latest = alerts[alerts.length - 1]
  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-999 animate-in fade-in slide-in-from-top-4 duration-300"
      style={{ minWidth: 360 }}
    >
      <div
        className="flex items-center gap-4 px-5 py-4 rounded-2xl shadow-2xl text-white"
        style={{ background: 'linear-gradient(135deg, #FF3B30 0%, #C0152E 100%)' }}
      >
        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={20} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-black tracking-tight">
            ⚠ WEAPON DETECTED {alerts.length > 1 ? `(×${alerts.length})` : ''}
          </p>
          <p className="text-[11px] font-bold text-white/70 mt-0.5">
            {latest.cameraName ? `Camera: ${latest.cameraName}` : 'Manual detection'} ·{' '}
            {new Date(latest.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="w-7 h-7 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Watchlist Hit Popup Card ─────────────────────────────────────────────────

function WatchlistCard({ alert, onDismiss, onAcknowledge }: {
  alert: Alert
  onDismiss: (id: string) => void
  onAcknowledge: (id: string) => void
}) {
  const { isLightMode } = useTheme()
  const hasPerson = !!alert.personName
  const hasPlateImg = !!alert.thumbnailBase64
  const hasPersonFace = !!alert.personFaceThumbnail

  return (
    <div
      className="w-[360px] rounded-2xl overflow-hidden animate-in slide-in-from-right-4 fade-in duration-400"
      style={{
        background: 'var(--brand-card)',
        boxShadow: isLightMode 
          ? '0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(217,58,58,0.08)' 
          : '0 12px 40px rgba(0,0,0,0.5), 0 2px 12px rgba(217,58,58,0.2)',
        border: `1.5px solid ${isLightMode ? 'rgba(217,58,58,0.22)' : 'rgba(217,58,58,0.45)'}`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-2.5"
        style={{ background: 'linear-gradient(90deg, #d93a3a 0%, #e85c5c 100%)' }}
      >
        <div className="w-6 h-6 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <ShieldAlert size={13} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="text-white text-[11px] font-black uppercase tracking-wider flex-1">
          🔴 Watchlist Hit Detected
        </span>
        <span className="text-white/70 text-[10px] font-semibold tabular-nums">
          {new Date(alert.timestamp).toLocaleTimeString('en-PK', { hour12: false })}
        </span>
        <button
          onClick={() => onDismiss(alert.id)}
          className="w-5 h-5 rounded-2xl bg-white/20 hover:bg-white/35 flex items-center justify-center transition-all ml-1"
        >
          <X size={11} className="text-white" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Plate number */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">License Plate</p>
            <span
              className="text-xl font-black tracking-widest"
              style={{ color: '#d93a3a', letterSpacing: '0.16em', fontFamily: 'monospace' }}
            >
              {alert.plateText}
            </span>
          </div>
          {/* Plate capture image */}
          {hasPlateImg ? (
            <img
              src={`data:image/jpeg;base64,${alert.thumbnailBase64}`}
              alt={alert.plateText}
              className="rounded-2xl object-cover flex-shrink-0"
              style={{
                width: 96, height: 64,
                boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
                border: '2px solid rgba(217,58,58,0.2)',
              }}
            />
          ) : (
            <div
              className="rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ width: 96, height: 64, background: 'rgba(217,58,58,0.06)', border: '2px solid rgba(217,58,58,0.12)' }}
            >
              <Car size={22} strokeWidth={1.5} style={{ color: '#d93a3a', opacity: 0.5 }} />
            </div>
          )}
        </div>

        {/* Person info */}
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-2xl"
          style={{
            background: hasPerson 
              ? (isLightMode ? 'rgba(10,126,140,0.06)' : 'rgba(10,126,140,0.08)') 
              : (isLightMode ? 'rgba(142,142,147,0.06)' : 'rgba(142,142,147,0.04)'),
            border: `1px solid ${hasPerson 
              ? (isLightMode ? 'rgba(10,126,140,0.15)' : 'rgba(10,126,140,0.2)') 
              : (isLightMode ? 'rgba(142,142,147,0.15)' : 'rgba(142,142,147,0.1)')}`,
          }}
        >
          {/* Person face or placeholder */}
          {hasPersonFace ? (
            <img
              src={`data:image/jpeg;base64,${alert.personFaceThumbnail}`}
              alt={alert.personName}
              className="rounded-2xl object-cover flex-shrink-0"
              style={{ width: 44, height: 44, border: '2px solid var(--brand-primary)' }}
            />
          ) : (
            <div
              className="rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                width: 44, height: 44,
                background: hasPerson ? 'rgba(10,126,140,0.1)' : 'rgba(142,142,147,0.1)',
                border: `1px solid ${hasPerson ? 'rgba(10,126,140,0.2)' : 'rgba(142,142,147,0.2)'}`,
              }}
            >
              {hasPerson
                ? <span className="text-lg font-black text-brand-primary">{alert.personName!.charAt(0).toUpperCase()}</span>
                : <User size={18} strokeWidth={1.5} className="text-slate-400" />
              }
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
              {hasPerson ? 'Registered Person' : 'Person'}
            </p>
            <p className={`text-sm font-bold truncate ${hasPerson ? 'text-brand-primary' : 'text-slate-400'}`}>
              {alert.personName ?? 'Unregistered / Unknown'}
            </p>
            {alert.reason && (
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{alert.reason}</p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 pb-4 pt-0">
        <button
          onClick={() => { onAcknowledge(alert.id); onDismiss(alert.id) }}
          className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-2xl transition-all flex-shrink-0"
          style={{ color: '#2db55d', background: 'rgba(45,181,93,0.08)', border: '1px solid rgba(45,181,93,0.2)' }}
        >
          <Check size={11} strokeWidth={2.5} />
          Acknowledge
        </button>
        <Link
          href="/admin/alerts"
          className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-2xl transition-all"
          style={{ color: '#d93a3a', background: 'rgba(217,58,58,0.06)', border: '1px solid rgba(217,58,58,0.18)' }}
          onClick={() => onDismiss(alert.id)}
        >
          <ExternalLink size={11} strokeWidth={2.5} />
          View All Alerts
        </Link>
      </div>
    </div>
  )
}

// ─── Main shell ───────────────────────────────────────────────────────────────

const FRESH_WINDOW_MS = 60_000
const POLL_INTERVAL_MS = 5_000

function AppShell({ children }: { children: React.ReactNode }) {
  const { isLightMode } = useTheme()
  const [alertCount, setAlertCount]         = useState(0)
  const [gunAlerts, setGunAlerts]           = useState<GunAlert[]>([])
  const [watchlistCards, setWatchlistCards] = useState<Alert[]>([])   // popup cards
  const [sidebarAlerts, setSidebarAlerts]   = useState<Alert[]>([])   // sidebar drawer
  const shownIdsRef = useRef<Set<string>>(new Set())

  const acknowledgeAlert = useCallback(async (id: string) => {
    try {
      await fetch(`/api/alerts/${id}/acknowledge`, { method: 'PATCH' })
      setSidebarAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a))
    } catch { /* ignore */ }
  }, [])

  const dismissCard = useCallback((id: string) => {
    setWatchlistCards(prev => prev.filter(a => a.id !== id))
  }, [])

  const showAlert = useCallback((alert: Alert) => {
    if (shownIdsRef.current.has(alert.id)) return
    shownIdsRef.current.add(alert.id)

    // Add to sidebar drawer (persistent)
    setSidebarAlerts(prev => {
      if (prev.some(a => a.id === alert.id)) return prev
      return [alert, ...prev].slice(0, 20)
    })

    // Show brief popup card (auto-dismisses after 15s)
    setWatchlistCards(prev => {
      if (prev.some(a => a.id === alert.id)) return prev
      return [...prev, alert].slice(-3) // max 3 stacked
    })
    setTimeout(() => dismissCard(alert.id), 15_000)
  }, [dismissCard])

  // Initial poll + periodic refresh
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/alerts?acknowledged=false')
        const alerts: Alert[] = await res.json()
        if (!Array.isArray(alerts)) return
        setAlertCount(alerts.length)
        const cutoff = Date.now() - FRESH_WINDOW_MS
        alerts
          .filter(a => !a.acknowledged && new Date(a.timestamp).getTime() > cutoff)
          .forEach(showAlert)
        // Also keep sidebar populated with recent alerts (including acknowledged)
        setSidebarAlerts(prev => {
          const ids = new Set(prev.map(a => a.id))
          const newOnes = alerts.filter(a => !ids.has(a.id))
          return [...newOnes, ...prev].slice(0, 20)
        })
      } catch { /* ignore */ }
    }
    poll()
    const id = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [showAlert])

  // SSE real-time
  useSSE<Alert>('/api/alerts/stream', (alert) => {
    if (!alert.acknowledged) { setAlertCount(n => n + 1); showAlert(alert) }
  })

  useSSE<GunAlert>('/api/alpr/gun-alerts', (payload) => {
    setGunAlerts(prev => [...prev, payload])
    setTimeout(() => setGunAlerts(prev => prev.slice(1)), 30_000)
  })

  const [sidebarMinimized, setSidebarMinimized] = useState(false)
  const pathname = usePathname()

  return (
    <div 
      className={`flex min-h-screen transition-colors duration-300 ops-page ${isLightMode ? 'light-mode' : ''}`}
      style={{
        background: 'var(--brand-canvas)',
        color: 'var(--brand-content)',
      }}
    >
      <GunAlertBanner alerts={gunAlerts} onDismiss={() => setGunAlerts([])} />

      {/* Popup cards — stacked bottom-right, non-spammy (max 3) */}
      {watchlistCards.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[998] flex flex-col gap-3 items-end" style={{ maxWidth: 380 }}>
          {watchlistCards.map(a => (
            <WatchlistCard
              key={a.id}
              alert={a}
              onDismiss={dismissCard}
              onAcknowledge={acknowledgeAlert}
            />
          ))}
        </div>
      )}

      <Sidebar 
        alertCount={alertCount} 
        sidebarAlerts={sidebarAlerts} 
        onAcknowledge={acknowledgeAlert} 
        minimized={sidebarMinimized}
        onToggle={() => setSidebarMinimized(m => !m)}
      />
      <div 
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${sidebarMinimized ? 'ml-[80px]' : 'ml-[240px]'} ops-page ${isLightMode ? 'light-mode' : ''}`}
        style={{
          background: 'var(--brand-canvas)',
          color: 'var(--brand-content)',
        }}
      >
        <div key={pathname} className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </ThemeProvider>
  )
}
