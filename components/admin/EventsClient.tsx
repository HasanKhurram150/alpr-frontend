'use client'
import { useState } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/ui/TopBar'
import { useSSE } from '@/lib/useSSE'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { DetectionEvent } from '@/types'
import {
  Search, Trash2, ChevronLeft, ChevronRight, Car, X, Clock,
  Video, Camera, User, Wifi, Image, AlertTriangle, ArrowLeft,
  ArrowRight, Minus
} from 'lucide-react'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { useTheme } from '@/lib/ThemeContext'
import { EventTableSkeleton } from '@/components/ui/Skeleton'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const SOURCE_META: Record<string, { label: string; icon: any; color: string; darkColor: string }> = {
  image:  { label: 'Image',  icon: Image,  color: '#5856D6', darkColor: '#8a88f7' },
  video:  { label: 'Video',  icon: Video,  color: '#FF9500', darkColor: '#ffb340' },
  stream: { label: 'Stream', icon: Wifi,   color: '#0A7E8C', darkColor: '#0A7E8C' },
  camera: { label: 'Camera', icon: Camera, color: '#30D158', darkColor: '#2db55d' },
}

function ConfBadge({ v }: { v: number }) {
  const pct = Math.round(v * 100)
  const [color, bg] = pct >= 90
    ? ['#30D158', 'rgba(48,209,88,0.1)']
    : pct >= 70
      ? ['#FF9500', 'rgba(255,149,0,0.1)']
      : ['#FF3B30', 'rgba(255,59,48,0.1)']
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums"
      style={{ color, background: bg }}>
      {pct}%
    </span>
  )
}

function DirectionIcon({ dir }: { dir?: string }) {
  const { isLightMode } = useTheme()
  if (dir === 'left')  return <ArrowLeft  size={12} className="text-[#0A7E8C]" />
  if (dir === 'right') return <ArrowRight size={12} className={isLightMode ? 'text-[#30D158]' : 'text-[#2db55d]'} />
  return <Minus size={12} className={isLightMode ? 'text-slate-300' : 'text-[#3d4f5e]'} />
}

function SourceBadge({ source }: { source: string }) {
  const { isLightMode } = useTheme()
  const meta = SOURCE_META[source] ?? SOURCE_META.image
  const Icon = meta.icon
  const color = isLightMode ? meta.color : meta.darkColor
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={12} style={{ color }} />
      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>
        {meta.label}
      </span>
    </div>
  )
}

export default function EventsClient() {
  const { isLightMode } = useTheme()
  const { toast } = useToast()
  const [plate, setPlate] = useState('')
  const [source, setSource] = useState('')
  const [page, setPage] = useState(0)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [newCount, setNewCount] = useState(0)
  const limit = 25

  const qs = new URLSearchParams({
    limit: String(limit),
    offset: String(page * limit),
    ...(plate && { plate }),
    ...(source && { source }),
    ...(startDate && { start: startDate }),
    ...(endDate && { end: endDate }),
  }).toString()
  const { data, isLoading, mutate } = useSWR(`/api/events?${qs}`, fetcher, { refreshInterval: 0 })

  const { connected } = useSSE<DetectionEvent>('/api/events/stream', () => {
    setNewCount(n => n + 1)
  })

  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })

  const del = async () => {
    if (!confirmState.id) return
    try {
      await api.deleteEvent(confirmState.id)
      toast('Event record deleted', 'info')
      mutate()
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setConfirmState({ open: false, id: null })
    }
  }

  const total = data?.total ?? 0
  const events: DetectionEvent[] = data?.data ?? []
  const totalPages = Math.ceil(total / limit)

  // Styling helpers
  const cardBg = isLightMode ? 'bg-white' : 'bg-[#0e1114]'
  const cardBorder = isLightMode ? 'border border-slate-100' : 'border border-[#222831]'
  const pageBg = isLightMode ? 'bg-[#F2F2F7]' : 'bg-[#0a0c0e]'
  const headingColor = isLightMode ? 'text-slate-800' : 'text-[#c8d0d8]'
  const secTextColor = isLightMode ? 'text-slate-400' : 'text-[#78899a]'
  const tableHeaderBg = isLightMode ? 'bg-slate-50/50' : 'bg-[#12161a]'
  const borderBottom = isLightMode ? 'border-b border-slate-100' : 'border-b border-[#222831]'
  const inputBg = isLightMode 
    ? 'bg-[#F2F2F7] text-[#1D1D1F] border-transparent focus-within:border-slate-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-slate-100/50' 
    : 'bg-[#181d22] text-[#c8d0d8] border-[#222831] focus-within:border-[#2f3844] focus-within:bg-[#0e1114] focus-within:ring-4 focus-within:ring-blue-500/5'
  const dateInputBg = isLightMode
    ? 'bg-[#F2F2F7] text-[#1D1D1F] border border-transparent focus:bg-white focus:border-slate-200 focus:ring-4 focus:ring-slate-100/50'
    : 'bg-[#181d22] text-[#c8d0d8] border border-[#222831] focus:bg-[#0e1114] focus:border-[#2f3844] focus:ring-4 focus:ring-blue-500/5'
  const segmentBg = isLightMode ? 'bg-[#F2F2F7]' : 'bg-[#181d22]'
  const tableBorder = isLightMode ? 'divide-slate-50' : 'divide-[#181d22]'

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar title="Events" connected={connected} />

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6 overflow-y-auto">

        {/* Filter Bar */}
        <div className={`px-5 py-3 flex flex-wrap items-center gap-4 rounded-2xl ${cardBg} ${cardBorder}`}>
          <div className={`flex items-center gap-3 rounded-2xl px-4 py-2 flex-1 min-w-[200px] border transition-all ${inputBg}`}>
            <Search size={15} className={isLightMode ? 'text-slate-400' : 'text-[#78899a]'} />
            <input value={plate} onChange={e => { setPlate(e.target.value); setPage(0) }}
              placeholder="Filter by plate number…"
              className="text-sm font-medium outline-none flex-1 bg-transparent placeholder-slate-500" />
          </div>

          <div className="flex items-center gap-2">
            <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(0) }}
              className={`text-sm font-medium outline-none px-3 py-1.5 rounded-2xl border transition-all ${dateInputBg}`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${secTextColor}`}>TO</span>
            <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(0) }}
              className={`text-sm font-medium outline-none px-3 py-1.5 rounded-2xl border transition-all ${dateInputBg}`} />
          </div>

          <div className={`relative flex p-1 rounded-2xl ${segmentBg}`}>
            {/* Sliding Pill */}
            <div 
              className={`absolute top-1 bottom-1 rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                isLightMode 
                  ? 'bg-white shadow-sm border border-transparent' 
                  : 'bg-[#222831] border border-[#222831]'
              }`}
              style={{
                width: '80px',
                left: source === '' ? '4px' : source === 'camera' ? '84px' : source === 'stream' ? '164px' : source === 'video' ? '244px' : '324px'
              }}
            />
            {[
              { key: '', label: 'All' },
              { key: 'camera', label: 'Camera' },
              { key: 'stream', label: 'Stream' },
              { key: 'video', label: 'Video' },
              { key: 'image', label: 'Image' },
            ].map(s => {
              const active = source === s.key
              const activeColor = 'text-[#0A7E8C]'
              const inactiveColor = isLightMode ? 'text-slate-400 hover:text-slate-600' : 'text-[#78899a] hover:text-[#c8d0d8]'
              return (
                <button key={s.key} onClick={() => { setSource(s.key); setPage(0) }}
                  className={`relative z-10 py-1.5 rounded-2xl text-xs font-bold transition-colors duration-300 flex items-center justify-center`}
                  style={{ width: '80px' }}>
                  {s.label}
                </button>
              )
            })}
          </div>

          {(plate || source || startDate || endDate) && (
            <button onClick={() => { setPlate(''); setSource(''); setStartDate(''); setEndDate(''); setPage(0) }}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-2xl transition-all ${
                isLightMode ? 'text-[#FF3B30] hover:bg-red-50' : 'text-[#d93a3a] hover:bg-[#d93a3a]/10'
              }`}>
              <X size={14} strokeWidth={2.5} /> Reset
            </button>
          )}

          <div className={`ml-auto flex items-center gap-2 text-[11px] font-black uppercase tracking-widest ${secTextColor}`}>
            <span>{total} Total</span>
          </div>
        </div>

        {/* Live Notification Banner */}
        {newCount > 0 && (
          <div className={`rounded-2xl px-5 py-3 flex items-center gap-4 animate-in slide-in-from-top-4 duration-500 border ${
            isLightMode 
              ? 'bg-[#0A7E8C]/8 border-[#0A7E8C]/15 text-[#003153]' 
              : 'bg-[#0A7E8C]/10 border-[#0A7E8C]/20 text-[#a5cdeb]'
          }`}>
            <div className="live-ring" style={{ width: 10, height: 10 }} />
            <span className="text-sm font-bold tracking-tight">
              {newCount} new detection{newCount > 1 ? 's' : ''} available
            </span>
            <button onClick={() => { setNewCount(0); mutate() }}
              className="ml-auto text-xs font-black uppercase tracking-wider hover:underline text-[#0A7E8C]">
              Refresh View
            </button>
          </div>
        )}

        {/* Data Table */}
        <div className={`rounded-2xl overflow-hidden ${cardBg} ${cardBorder}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className={`${tableHeaderBg} ${borderBottom}`}>
                {['Thumbnail', 'Plate', 'Confidence', 'Vehicle', 'Identity', 'Direction', 'Source', 'Logged At', ''].map(h => (
                  <th key={h} className={`text-left px-4 py-4 text-[10px] font-black tracking-widest uppercase ${secTextColor}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${tableBorder}`}>
              {isLoading ? (
                <EventTableSkeleton count={5} />
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-24 text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                      isLightMode ? 'bg-slate-50' : 'bg-[#12161a]'
                    }`}>
                      <Clock size={28} className={isLightMode ? 'text-slate-200' : 'text-[#3d4f5e]'} strokeWidth={1.5} />
                    </div>
                    <p className={`font-bold ${isLightMode ? 'text-slate-400' : 'text-[#78899a]'}`}>No historical data found</p>
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                <tr key={ev.id} className={`transition-colors group ${isLightMode ? 'hover:bg-slate-50/50' : 'hover:bg-[#12161a]'}`}>
                  {/* Thumbnail */}
                  <td className="px-4 py-3">
                    <div className="relative inline-block">
                      {ev.thumbnailBase64
                        ? <img src={`data:image/jpeg;base64,${ev.thumbnailBase64}`} alt={ev.plateText}
                          className={`w-20 h-11 object-cover rounded-2xl shadow-sm border ${
                            isLightMode ? 'border-white' : 'border-[#222831]'
                          }`} />
                        : <div className={`w-20 h-11 rounded-2xl flex items-center justify-center border ${
                            isLightMode ? 'bg-slate-50 border-slate-100' : 'bg-[#181d22] border-[#222831]'
                          }`}>
                          <Car size={16} className={isLightMode ? 'text-slate-200' : 'text-[#3d4f5e]'} />
                        </div>}
                      {ev.gunDetected && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF3B30] rounded-full flex items-center justify-center">
                          <AlertTriangle size={8} className="text-white" strokeWidth={3} />
                        </span>
                      )}
                    </div>
                  </td>
                  {/* Plate */}
                  <td className="px-4 py-3">
                    <span className={`plate-badge text-[11px] font-bold ${
                      isLightMode ? '' : 'bg-[#0a0c0e] border border-[#222831] text-[#c8d0d8]'
                    }`}>{ev.plateText}</span>
                  </td>
                  {/* Confidence */}
                  <td className="px-4 py-3">
                    <ConfBadge v={ev.confidence} />
                  </td>
                  {/* Vehicle */}
                  <td className="px-4 py-3">
                    {ev.vehicleMake ? (
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-xs font-bold capitalize ${isLightMode ? 'text-slate-700' : 'text-[#c8d0d8]'}`}>
                          {[ev.vehicleMake, ev.vehicleModel].filter(Boolean).join(' ')}
                        </span>
                        {ev.vehicleColor && (
                          <span className={`text-[10px] font-bold uppercase tracking-tight ${secTextColor}`}>{ev.vehicleColor}</span>
                        )}
                      </div>
                    ) : (
                      <span className={`text-[10px] ${isLightMode ? 'text-slate-300' : 'text-[#3d4f5e]'}`}>—</span>
                    )}
                  </td>
                  {/* Identity */}
                  <td className="px-4 py-3">
                    {ev.personName ? (
                      <div className="flex items-center gap-2 font-bold text-xs text-[#0A7E8C]">
                        <User size={13} fill="currentColor" className="opacity-20" />
                        {ev.personName}
                      </div>
                    ) : (
                      <span className={`text-[11px] font-bold uppercase tracking-tighter ${isLightMode ? 'text-slate-300' : 'text-[#3d4f5e]'}`}>Unknown</span>
                    )}
                  </td>
                  {/* Direction */}
                  <td className="px-4 py-3">
                    <DirectionIcon dir={ev.direction} />
                  </td>
                  {/* Source */}
                  <td className="px-4 py-3">
                    <SourceBadge source={ev.source} />
                    {ev.cameraName && (
                      <p className={`text-[9px] mt-0.5 truncate max-w-[120px] ${secTextColor}`}>{ev.cameraName}</p>
                    )}
                  </td>
                  {/* Timestamp */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className={`text-[11px] font-bold ${isLightMode ? 'text-slate-800' : 'text-[#c8d0d8]'}`}>
                        {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-tight ${secTextColor}`}>
                        {new Date(ev.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </td>
                  {/* Delete */}
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setConfirmState({ open: true, id: ev.id })} aria-label="Delete event"
                      className={`p-2 rounded-2xl transition-all opacity-0 group-hover:opacity-100 ${
                        isLightMode ? 'text-slate-300 hover:text-[#FF3B30] hover:bg-red-50' : 'text-[#3d4f5e] hover:text-[#d93a3a] hover:bg-red-950/20'
                      }`}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2">
            <p className={`text-[11px] font-bold uppercase tracking-widest ${secTextColor}`}>
              Record {page * limit + 1} – {Math.min((page + 1) * limit, total)} <span className="mx-2">/</span> {total}
            </p>
            <div className={`flex items-center gap-1 rounded-full p-1 border shadow-sm ${
              isLightMode ? 'bg-white border-slate-100' : 'bg-[#0e1114] border-[#222831]'
            }`}>
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all disabled:opacity-20 ${
                  isLightMode ? 'text-slate-400 hover:bg-slate-50' : 'text-[#78899a] hover:bg-[#181d22]'
                }`}>
                <ChevronLeft size={18} strokeWidth={2.5} />
              </button>
              <div className={`px-3 text-xs font-black ${isLightMode ? 'text-slate-800' : 'text-[#c8d0d8]'}`}>{page + 1}</div>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all disabled:opacity-20 ${
                  isLightMode ? 'text-slate-400 hover:bg-slate-50' : 'text-[#78899a] hover:bg-[#181d22]'
                }`}>
                <ChevronRight size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
      </main>

      <ConfirmModal
        open={confirmState.open}
        title="Delete Event"
        message="Are you sure you want to permanently delete this event record?"
        confirmLabel="Delete"
        onConfirm={del}
        onCancel={() => setConfirmState({ open: false, id: null })}
      />
    </div>
  )
}
