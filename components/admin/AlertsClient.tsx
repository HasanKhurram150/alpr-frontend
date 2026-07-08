'use client'
import { useState } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/ui/TopBar'
import { useSSE } from '@/lib/useSSE'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { Alert } from '@/types'
import { Bell, BellOff, Trash2, CheckCheck, ShieldAlert, Clock } from 'lucide-react'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { useTheme } from '@/lib/ThemeContext'
import { AlertTableSkeleton } from '@/components/ui/Skeleton'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function AlertRow({ alert, onAck, onDelete }: {
  alert: Alert; onAck: () => void; onDelete: () => void
}) {
  const { isLightMode } = useTheme()
  
  // Theme styling for row
  const rowBorder = isLightMode ? 'border-b border-slate-100' : 'border-b border-[#181d22]'
  const hoverBgClass = isLightMode ? 'hover:bg-slate-50/50' : 'hover:bg-[#12161a]'
  const fontColor = isLightMode ? 'text-slate-800' : 'text-[#c8d0d8]'
  const secFontColor = isLightMode ? 'text-slate-500' : 'text-[#78899a]'
  const separator = isLightMode ? 'divide-slate-50' : 'divide-[#181d22]'

  return (
    <tr className={`transition-all group ${hoverBgClass} ${rowBorder} ${alert.acknowledged ? 'opacity-40' : ''}`}>
      <td className="px-5 py-3">
        {alert.thumbnailBase64
          ? <img src={`data:image/jpeg;base64,${alert.thumbnailBase64}`} alt={alert.plateText}
              className={`w-16 h-10 object-cover rounded-2xl shadow-sm border ${isLightMode ? 'border-white' : 'border-[#222831]'}`} />
          : <div className={`w-16 h-10 rounded-2xl flex items-center justify-center border ${isLightMode ? 'bg-slate-50 border-slate-100' : 'bg-[#0e1114] border-[#222831]'}`}>
              <ShieldAlert size={14} className={isLightMode ? 'text-slate-200' : 'text-[#3d4f5e]'} />
            </div>}
      </td>
      <td className="px-5 py-3">
        <span className={`plate-badge text-[11px] font-mono tracking-widest ${isLightMode ? 'bg-slate-100 text-slate-800' : 'bg-[#181d22] text-[#c8d0d8] border border-[#222831]'}`}>
          {alert.plateText}
        </span>
      </td>
      <td className={`px-5 py-3 text-xs font-semibold max-w-[200px] truncate ${fontColor}`}>
        {alert.reason ?? '—'}
      </td>
      <td className="px-5 py-3">
        {alert.acknowledged ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter"
            style={isLightMode 
              ? { color: '#8E8E93', background: '#F2F2F7' }
              : { color: '#78899a', background: '#181d22', border: '1px solid #222831' }}>
            Resolved
          </span>
        ) : (
          <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tight flex items-center gap-1.5"
            style={isLightMode
              ? { color: '#FF3B30', background: 'rgba(255,59,48,0.1)' }
              : { color: '#d93a3a', background: 'rgba(217,58,58,0.1)', border: '1px solid rgba(217,58,58,0.2)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#d93a3a] pulse-dot" />
            Critical
          </span>
        )}
      </td>
      <td className="px-5 py-3">
        <div className="flex flex-col">
           <span className={`text-[11px] font-bold ${fontColor}`}>
             {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           </span>
           <span className={`text-[9px] font-bold uppercase ${secFontColor}`}>
             {new Date(alert.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
           </span>
        </div>
      </td>
      <td className="px-5 py-3 text-right">
        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          {!alert.acknowledged && (
            <button onClick={onAck} title="Acknowledge" aria-label="Acknowledge alert"
              className={`p-1.5 rounded-2xl transition-all text-slate-400 hover:text-[#30D158] ${isLightMode ? 'hover:bg-emerald-50' : 'hover:bg-emerald-950/20'}`}>
              <CheckCheck size={16} strokeWidth={2.5} />
            </button>
          )}
          <button onClick={onDelete} title="Delete" aria-label="Delete alert"
            className={`p-1.5 rounded-2xl transition-all text-slate-400 hover:text-[#FF3B30] ${isLightMode ? 'hover:bg-red-50' : 'hover:bg-red-950/20'}`}>
            <Trash2 size={16} strokeWidth={2.5} />
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function AlertsClient() {
  const { isLightMode } = useTheme()
  const { toast } = useToast()
  const [showAcknowledged, setShowAcknowledged] = useState(false)
  const [liveCount, setLiveCount] = useState(0)

  const qs = showAcknowledged ? '' : '?acknowledged=false'
  const { data: alerts = [], isLoading, mutate } = useSWR<Alert[]>(`/api/alerts${qs}`, fetcher)

  const { connected } = useSSE<Alert>('/api/alerts/stream', () => {
    setLiveCount(n => n + 1)
    mutate()
  })

  const ack = async (id: string) => {
    try { 
      await api.acknowledgeAlert(id)
      toast('Alert acknowledged', 'success')
      mutate() 
    } catch (e: any) { 
      toast(e.message, 'error') 
    }
  }

  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })

  const del = async () => {
    if (!confirmState.id) return
    try { 
      await api.deleteAlert(confirmState.id)
      toast('Alert removed', 'info')
      mutate() 
    } catch (e: any) { 
      toast(e.message, 'error') 
    } finally { 
      setConfirmState({ open: false, id: null }) 
    }
  }

  const ackAll = async () => {
    const unacked = alerts.filter(a => !a.acknowledged)
    if (unacked.length === 0) return
    await Promise.all(unacked.map(a => api.acknowledgeAlert(a.id)))
    toast(`Resolved ${unacked.length} pending alert${unacked.length > 1 ? 's' : ''}`, 'success')
    mutate()
  }

  const activeCount = alerts.filter(a => !a.acknowledged).length

  // Shared classes based on theme
  const cardBg = isLightMode ? 'bg-white' : 'bg-[#0e1114]'
  const cardBorder = isLightMode ? 'border border-slate-100' : 'border border-[#222831]'
  const tableHeaderBg = isLightMode ? 'bg-slate-50/50' : 'bg-[#12161a]'
  const tableHeaderBorder = isLightMode ? 'border-b border-slate-100' : 'border-b border-[#222831]'
  const segmentBg = isLightMode 
    ? 'bg-slate-200/50 border border-slate-200/60' 
    : 'bg-[#181d22]/50 border border-[#222831]'
  
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar 
        title="Alerts" 
        connected={connected} 
      />
      
      <main className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6 overflow-y-auto">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4">
          <div className={`relative flex p-1 backdrop-blur-md rounded-2xl shadow-sm ${segmentBg}`}>
            {/* Sliding Pill */}
            <div 
              className={`absolute top-1 bottom-1 rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                isLightMode 
                  ? 'bg-white shadow-sm border border-transparent' 
                  : 'bg-[#222831] border border-[#222831]'
              }`}
              style={{
                width: '150px',
                left: !showAcknowledged ? '4px' : '154px'
              }}
            />
            <button 
              onClick={() => setShowAcknowledged(false)}
              className={`relative z-10 py-2 rounded-2xl text-sm font-bold transition-colors duration-300 flex items-center justify-center gap-2 ${
                !showAcknowledged 
                  ? 'text-[#0A7E8C]' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              style={{ width: '150px' }}
            >
              <BellOff size={14} />
              Unresolved Only
            </button>
            <button 
              onClick={() => setShowAcknowledged(true)}
              className={`relative z-10 py-2 rounded-2xl text-sm font-bold transition-colors duration-300 flex items-center justify-center gap-2 ${
                showAcknowledged 
                  ? 'text-[#0A7E8C]' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              style={{ width: '150px' }}
            >
              <Bell size={14} />
              Showing All
            </button>
          </div>
          
          {activeCount > 0 && (
            <button 
              onClick={ackAll}
              className={`flex items-center gap-2 px-6 h-10 shadow-md font-bold text-xs uppercase tracking-wider rounded-2xl transition-all ${
                isLightMode 
                  ? 'bg-[#30D158] hover:bg-[#28a745] text-white' 
                  : 'bg-[#2db55d] hover:bg-[#28a745] text-[#0a0c0e]'
              }`}
            >
              <CheckCheck size={16} strokeWidth={2.5} />
              Resolve All
            </button>
          )}
        </div>

        {/* Live banner */}
        {liveCount > 0 && (
          <div className={`rounded-2xl px-5 py-4 flex items-center gap-4 animate-in slide-in-from-top-4 duration-500 shadow-sm border ${
            isLightMode 
              ? 'bg-red-50 border-red-100 text-red-900' 
              : 'bg-red-950/20 border-red-900/30 text-red-200'
          }`}>
            <div className="live-ring" />
            <div>
              <p className="text-sm font-bold">{liveCount} Priority Intercepts Detected</p>
              <p className={`text-xs font-medium ${isLightMode ? 'text-red-400' : 'text-red-300/60'}`}>
                Immediate attention required in real-time monitor
              </p>
            </div>
            <button 
              onClick={() => { setLiveCount(0); mutate() }}
              className={`ml-auto text-xs font-black uppercase tracking-widest hover:underline ${
                isLightMode ? 'text-red-600' : 'text-red-400'
              }`}
            >
              Sync Registry
            </button>
          </div>
        )}

        {/* Table */}
        <div className={`rounded-2xl overflow-hidden ${cardBg} ${cardBorder}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className={`${tableHeaderBg} ${tableHeaderBorder}`}>
                {['Detections', 'Result', 'Violation / Reason', 'Severity', 'Intercepted', ''].map(h => (
                  <th key={h} className={`text-left px-5 py-4 text-[10px] font-black tracking-widest uppercase ${isLightMode ? 'text-slate-400' : 'text-[#78899a]'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isLightMode ? 'divide-slate-50' : 'divide-[#181d22]'}`}>
              {isLoading ? (
                <AlertTableSkeleton count={4} />
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
                      isLightMode ? 'bg-slate-50' : 'bg-[#12161a]'
                    }`}>
                       <ShieldAlert size={32} className={isLightMode ? 'text-slate-200' : 'text-[#3d4f5e]'} strokeWidth={1.5} />
                    </div>
                    <p className={`text-lg font-bold ${isLightMode ? 'text-slate-800' : 'text-[#c8d0d8]'}`}>Clear Skies</p>
                    <p className={`text-sm mt-1 ${isLightMode ? 'text-slate-400' : 'text-[#78899a]'}`}>No security alerts currently active.</p>
                  </td>
                </tr>
              ) : (
                alerts.map(a => (
                  <AlertRow 
                    key={a.id} 
                    alert={a} 
                    onAck={() => ack(a.id)} 
                    onDelete={() => setConfirmState({ open: true, id: a.id })} 
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      <ConfirmModal
        open={confirmState.open}
        title="Delete Alert"
        message="Are you sure you want to permanently delete this alert?"
        confirmLabel="Delete"
        onConfirm={del}
        onCancel={() => setConfirmState({ open: false, id: null })}
      />
    </div>
  )
}
