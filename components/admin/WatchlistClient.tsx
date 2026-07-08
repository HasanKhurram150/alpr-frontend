'use client'
import { useState } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/ui/TopBar'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { WatchlistEntry } from '@/types'
import { Plus, Trash2, ShieldAlert, ToggleLeft, ToggleRight, Clock, ShieldCheck } from 'lucide-react'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { useTheme } from '@/lib/ThemeContext'
import { WatchlistListSkeleton } from '@/components/ui/Skeleton'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function WatchlistForm({ onSave, onCancel }: { onSave: (data: any) => void; onCancel: () => void }) {
  const { isLightMode } = useTheme()
  const [plate, setPlate] = useState('')
  const [reason, setReason] = useState('')

  const submit = () => {
    if (!plate.trim()) return
    onSave({ plateText: plate.trim().toUpperCase(), reason: reason.trim() || undefined })
  }

  const labelStyle = { 
    display: 'block', 
    fontSize: '11px', 
    fontWeight: 700, 
    color: isLightMode ? '#8E8E93' : '#78899a', 
    marginBottom: 6, 
    marginLeft: 4, 
    letterSpacing: '0.04em', 
    textTransform: 'uppercase' as const 
  }

  const inputStyle = isLightMode
    ? 'w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-800 outline-none focus:ring-2 focus:ring-[#0A7E8C]/10 focus:border-[#0A7E8C] transition-all text-sm font-medium'
    : 'w-full px-4 py-2.5 rounded-2xl border border-[#222831] bg-[#0e1114] text-[#c8d0d8] outline-none focus:ring-2 focus:ring-[#0A7E8C]/10 focus:border-[#0A7E8C] transition-all text-sm font-medium'

  const cancelBtnColor = isLightMode ? 'text-slate-400 hover:bg-slate-100' : 'text-[#78899a] hover:bg-[#181d22]'

  return (
    <div className="space-y-5">
      <div>
        <label style={labelStyle}>Target License Plate</label>
        <input value={plate} onChange={e => setPlate(e.target.value.toUpperCase())}
          style={{ fontFamily: 'SF Mono, monospace', letterSpacing: '0.1em', fontWeight: 700 }}
          className={inputStyle}
          placeholder="MH20EE7602" />
      </div>
      <div>
        <label style={labelStyle}>Priority / Reason</label>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
          style={{ resize: 'none' }}
          className={inputStyle}
          placeholder="Stolen vehicle, suspect vehicle, etc." />
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={submit} className="btn-apple flex-1">
          Add to Watchlist
        </button>
        <button onClick={onCancel} className={`px-6 py-2.5 rounded-2xl text-sm font-semibold transition-all ${cancelBtnColor}`}>
          Cancel
        </button>
      </div>
    </div>
  )
}

function WatchlistCard({ entry, onToggle, onDelete }: {
  entry: WatchlistEntry; onToggle: () => void; onDelete: () => void
}) {
  const { isLightMode } = useTheme()
  const isActive = entry.active

  const cardBg = isLightMode ? 'bg-white border-slate-100' : 'bg-[#0e1114] border-[#222831]'
  const titleColor = isLightMode ? 'text-[#1D1D1F]' : 'text-[#c8d0d8]'
  const reasonColor = isLightMode ? 'text-[#6E6E73]' : 'text-[#78899a]'
  const dividerBorder = isLightMode ? 'rgba(60,60,67,0.06)' : '#181d22'
  const shieldIconBg = isActive 
    ? (isLightMode ? 'bg-orange-50 text-orange-500' : 'bg-orange-950/20 text-[#e8a000]') 
    : (isLightMode ? 'bg-slate-100 text-slate-400' : 'bg-[#181d22] text-[#78899a]')

  return (
    <div className={`p-5 flex flex-col group hover:scale-[1.01] transition-all duration-200 border rounded-2xl shadow-sm ${cardBg} ${!isActive ? 'opacity-50 grayscale-[0.5]' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${shieldIconBg}`}>
            <ShieldAlert size={18} />
          </div>
          <span className={`plate-badge text-sm ${
            isLightMode ? '' : 'bg-[#0a0c0e] border border-[#222831] text-[#c8d0d8]'
          }`}>{entry.plateText}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onToggle} title={entry.active ? 'Deactivate' : 'Activate'} aria-label="Toggle active status"
            className="p-1.5 rounded-2xl transition-all"
            style={{ color: isActive ? '#FF9500' : '#8E8E93' }}>
            {isActive ? <ToggleRight size={22} strokeWidth={2.5} /> : <ToggleLeft size={22} strokeWidth={2.5} />}
          </button>
          <button onClick={onDelete} aria-label="Delete watchlist entry"
            className={`p-1.5 rounded-2xl transition-all opacity-0 group-hover:opacity-100 ${
              isLightMode ? 'text-slate-300 hover:text-[#FF3B30] hover:bg-red-50' : 'text-[#3d4f5e] hover:text-[#d93a3a] hover:bg-[#d93a3a]/15'
            }`}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {entry.reason && (
        <p className={`text-xs font-semibold mb-4 leading-relaxed line-clamp-2 ${reasonColor}`}>{entry.reason}</p>
      )}

      <div className="flex items-center justify-between pt-4 mt-auto" style={{ borderTop: `1px solid ${dividerBorder}` }}>
        <span className="text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-tight"
          style={isActive
            ? { color: '#FF9500', background: 'rgba(255,149,0,0.1)' }
            : { color: isLightMode ? '#8E8E93' : '#78899a', background: isLightMode ? '#F2F2F7' : '#181d22' }}>
          {isActive ? 'Monitoring' : 'Suspended'}
        </span>
        <p className={`text-[10px] font-bold flex items-center gap-1 ${reasonColor}`}>
          <Clock size={10} />
          {new Date(entry.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}

export default function WatchlistClient() {
  const { isLightMode } = useTheme()
  const { toast } = useToast()
  const [activeOnly, setActiveOnly] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const qs = activeOnly ? '?activeOnly=true' : ''
  const { data: entries = [], isLoading, mutate } = useSWR<WatchlistEntry[]>(`/api/watchlist${qs}`, fetcher)

  const create = async (data: any) => {
    try { await api.createWatchlist(data); toast('Vehicle added to secure watchlist', 'success'); mutate(); setAddOpen(false) }
    catch (e: any) { toast(e.message, 'error') }
  }

  const toggle = async (entry: WatchlistEntry) => {
    try { await api.updateWatchlist(entry.id, { active: !entry.active }); toast(entry.active ? 'Monitoring suspended' : 'Monitoring resumed', 'info'); mutate() }
    catch (e: any) { toast(e.message, 'error') }
  }

  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })

  const remove = async () => {
    if (!confirmState.id) return
    try { await api.deleteWatchlist(confirmState.id); toast('Target removed', 'info'); mutate() }
    catch (e: any) { toast(e.message, 'error') }
    finally { setConfirmState({ open: false, id: null }) }
  }

  const activeCount = entries.filter(e => e.active).length

  // Styles
  const cardStyle = isLightMode ? 'bg-white border border-slate-100' : 'bg-[#0e1114] border border-[#222831]'
  const segmentBg = isLightMode ? 'bg-slate-200/50 border border-slate-200/60' : 'bg-[#181d22]/50 border border-[#222831]'
  const subTextColor = isLightMode ? 'text-slate-400' : 'text-[#78899a]'

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar title="Watchlist" connected={false} />
      
      <main className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6 overflow-y-auto">
        
        {/* Header Actions */}
        <div className="flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className={`relative flex p-1 backdrop-blur-md rounded-2xl shadow-sm ${segmentBg}`}>
             {/* Sliding Pill */}
             <div 
               className={`absolute top-1 bottom-1 rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                 isLightMode 
                   ? 'bg-white shadow-sm border border-transparent' 
                   : 'bg-[#222831] border border-[#222831]'
               }`}
               style={{
                 width: '120px',
                 left: !activeOnly ? '4px' : '124px'
               }}
             />
             <button onClick={() => setActiveOnly(false)}
               className={`relative z-10 py-2 rounded-2xl text-sm font-bold transition-colors duration-300 flex items-center justify-center ${
                 !activeOnly 
                   ? 'text-[#0A7E8C]' 
                   : 'text-slate-400 hover:text-slate-600'
               }`}
               style={{ width: '120px' }}>
               All Targets
             </button>
             <button onClick={() => setActiveOnly(true)}
               className={`relative z-10 py-2 rounded-2xl text-sm font-bold transition-colors duration-300 flex items-center justify-center ${
                 activeOnly 
                   ? 'text-[#0A7E8C]' 
                   : 'text-slate-400 hover:text-slate-600'
               }`}
               style={{ width: '120px' }}>
               Active Only
             </button>
          </div>

          <button onClick={() => setAddOpen(true)} className="btn-apple h-10 px-6 flex items-center gap-2 shadow-md">
            <Plus size={18} strokeWidth={2.5} />
            Target Vehicle
          </button>
        </div>

        {isLoading ? (
          <WatchlistListSkeleton count={3} />
        ) : entries.length === 0 ? (
          <div className={`py-32 text-center rounded-2xl shadow-sm animate-in zoom-in-95 duration-500 border ${cardStyle}`}>
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
              isLightMode ? 'bg-slate-50' : 'bg-[#12161a]'
            }`}>
               <ShieldCheck size={32} className={isLightMode ? 'text-slate-200' : 'text-[#3d4f5e]'} strokeWidth={1.5} />
            </div>
            <p className={`text-lg font-bold ${isLightMode ? 'text-slate-800' : 'text-[#c8d0d8]'}`}>Clear Watchlist</p>
            <p className={`text-sm mt-1 ${subTextColor}`}>No vehicles are currently marked for interception.</p>
            <button onClick={() => setAddOpen(true)} className="mt-6 text-sm font-bold text-[#0A7E8C] hover:underline">
              Add first target vehicle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {entries.map(e => (
              <WatchlistCard key={e.id} entry={e} onToggle={() => toggle(e)} onDelete={() => setConfirmState({ open: true, id: e.id })} />
            ))}
          </div>
        )}
      </main>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Target Vehicle Registration">
        <WatchlistForm onSave={create} onCancel={() => setAddOpen(false)} />
      </Modal>

      <ConfirmModal
        open={confirmState.open}
        title="Remove Watchlist Target"
        message="Remove this vehicle from the watchlist?"
        confirmLabel="Remove"
        onConfirm={remove}
        onCancel={() => setConfirmState({ open: false, id: null })}
      />
    </div>
  )
}
