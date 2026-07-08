'use client'
import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/ui/TopBar'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { Camera } from '@/types'
import { saveVideo, getVideo, removeVideo, getAllVideos } from '@/lib/cameraVideoStore'
import {
  Video, Plus, Trash2, Power, Edit3, Wifi, WifiOff,
  MapPin, Film, X, Crop, MapPin as PinIcon
} from 'lucide-react'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { useTheme } from '@/lib/ThemeContext'
import { CameraListSkeleton } from '@/components/ui/Skeleton'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const REGIONS = ['NORTH_AMERICAN', 'EUROPEAN', 'MIDDLE_EASTERN', 'ASIAN', 'PACIFIC', 'AFRICAN', 'SOUTH_AMERICAN']
const REGION_LABELS: Record<string, string> = {
  NORTH_AMERICAN: 'North American / Pakistan ★',
  EUROPEAN: 'European',
  PACIFIC: 'Pacific',
  ASIAN: 'Asian (East Asia)',
  MIDDLE_EASTERN: 'Middle Eastern',
  AFRICAN: 'African',
  SOUTH_AMERICAN: 'South American',
}

function StatusDot({ active, streaming }: { active: boolean; streaming?: boolean }) {
  if (!active) return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
      <span className="w-2 h-2 rounded-full bg-slate-300" /> Inactive
    </span>
  )
  if (streaming) return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#30D158] uppercase tracking-wider">
      <span className="w-2 h-2 rounded-full bg-[#30D158] pulse-dot" /> Live
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#FF9500] uppercase tracking-wider">
      <span className="w-2 h-2 rounded-full bg-[#FF9500]" /> Connecting
    </span>
  )
}

// ── Zone Editor Modal ─────────────────────────────────────────────────────────────

type ZoneRect = { x: number; y: number; w: number; h: number }

function ZoneEditorModal({ camera, onClose, mutate }: { camera: Camera; onClose: () => void; mutate: any }) {
  const { isLightMode } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [zones, setZones] = useState<ZoneRect[]>([])
  const [drawing, setDrawing] = useState(false)
  const [startPt, setStartPt] = useState({ x: 0, y: 0 })
  const [dragRect, setDragRect] = useState<ZoneRect | null>(null)
  const [saving, setSaving] = useState(false)
  const urlRef = useRef<string | null>(null)
  const { toast } = useToast()

  const CW = 640, CH = 360

  useEffect(() => {
    getVideo(camera.id).then(entry => {
      if (entry) {
        const url = URL.createObjectURL(entry.blob)
        urlRef.current = url
        setVideoUrl(url)
      }
    })
    return () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current) }
  }, [camera.id])

  useEffect(() => {
    if (camera.roiInclude?.length) {
      setZones(camera.roiInclude.map(z => ({
        x: z.x * CW, y: z.y * CH,
        w: z.width * CW, h: z.height * CH,
      })))
    }
  }, [camera.roiInclude])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, CW, CH)

    zones.forEach((z, i) => {
      ctx.save()
      ctx.strokeStyle = '#FF9500'
      ctx.lineWidth = 2
      ctx.setLineDash([7, 4])
      ctx.strokeRect(z.x, z.y, z.w, z.h)
      ctx.fillStyle = 'rgba(255,149,0,0.07)'
      ctx.fillRect(z.x, z.y, z.w, z.h)
      // Corner marks
      ctx.setLineDash([])
      ctx.strokeStyle = '#FF9500'
      ctx.lineWidth = 2.5;
      [[z.x, z.y, 1, 1], [z.x + z.w, z.y, -1, 1], [z.x, z.y + z.h, 1, -1], [z.x + z.w, z.y + z.h, -1, -1]].forEach(([cx, cy, dx, dy]) => {
        ctx.beginPath(); ctx.moveTo(cx as number, cy as number); ctx.lineTo((cx as number) + (dx as number) * 10, cy as number); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(cx as number, cy as number); ctx.lineTo(cx as number, (cy as number) + (dy as number) * 10); ctx.stroke()
      })
      // Label pill
      ctx.fillStyle = 'rgba(255,149,0,0.9)'
      ctx.beginPath(); ctx.roundRect(z.x + 4, z.y + 4, 56, 18, 3); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 10px monospace'
      ctx.fillText(`ZONE ${i + 1}`, z.x + 8, z.y + 16)
      ctx.restore()
    })

    if (dragRect && dragRect.w > 2 && dragRect.h > 2) {
      ctx.strokeStyle = '#0A7E8C'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 3])
      ctx.strokeRect(dragRect.x, dragRect.y, dragRect.w, dragRect.h)
      ctx.fillStyle = 'rgba(10, 126, 140, 0.12)'
      ctx.fillRect(dragRect.x, dragRect.y, dragRect.w, dragRect.h)
      ctx.setLineDash([])
      const wPct = Math.round((dragRect.w / CW) * 100)
      const hPct = Math.round((dragRect.h / CH) * 100)
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.beginPath(); ctx.roundRect(dragRect.x + dragRect.w / 2 - 28, dragRect.y + dragRect.h / 2 - 9, 56, 18, 3); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`${wPct}% × ${hPct}%`, dragRect.x + dragRect.w / 2, dragRect.y + dragRect.h / 2 + 4)
      ctx.textAlign = 'left'
    }
  }, [zones, dragRect, isLightMode])

  function getPos(e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } {
    const r = canvasRef.current!.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(CW, ((e.clientX - r.left) / r.width) * CW)),
      y: Math.max(0, Math.min(CH, ((e.clientY - r.top) / r.height) * CH)),
    }
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const pt = getPos(e)
    setStartPt(pt)
    setDrawing(true)
    setDragRect({ x: pt.x, y: pt.y, w: 0, h: 0 })
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing) return
    const pt = getPos(e)
    setDragRect({
      x: Math.min(startPt.x, pt.x),
      y: Math.min(startPt.y, pt.y),
      w: Math.abs(pt.x - startPt.x),
      h: Math.abs(pt.y - startPt.y),
    })
  }

  function onMouseUp() {
    if (!drawing || !dragRect) return
    setDrawing(false)
    if (dragRect.w > 10 && dragRect.h > 10) {
      setZones(prev => [...prev, { ...dragRect }])
    }
    setDragRect(null)
  }

  async function save() {
    const roiInclude = zones.map(z => ({
      x: +(z.x / CW).toFixed(4),
      y: +(z.y / CH).toFixed(4),
      width: +(z.w / CW).toFixed(4),
      height: +(z.h / CH).toFixed(4),
    }))
    setSaving(true)
    try {
      await api.updateCamera(camera.id, { roiInclude })
      mutate()
      toast(zones.length ? `${zones.length} detection zone(s) saved for "${camera.name}"` : `Zones cleared — full frame detection active`)
      onClose()
    } catch (e: any) {
      toast(e.message ?? 'Failed to save zones', 'error')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={`Detection Zone — ${camera.name}`} width="max-w-2xl">
      <div style={{ userSelect: 'none' }}>
        {/* Instruction banner */}
        <div className="mb-4 px-4 py-3 rounded-2xl flex items-start gap-3"
          style={{ background: 'rgba(10, 126, 140, 0.08)', border: '1px solid rgba(10, 126, 140, 0.18)' }}>
          <Crop size={16} className="text-[#0A7E8C] mt-0.5 flex-shrink-0" />
          <p className={`text-[11px] ${isLightMode ? 'text-[#0A7E8C]' : 'text-[#a5cdeb]'} font-medium leading-relaxed`}>
            <strong>Click and drag</strong> on the preview below to define a detection zone.
            Only plates entering this region will be processed — reducing false positives and focusing on high-traffic entry points.
            Draw multiple zones if needed.
          </p>
        </div>

        {/* Canvas / video area */}
        <div className={`relative w-full rounded-2xl overflow-hidden ${isLightMode ? 'bg-slate-900' : 'bg-black'}`}
          style={{ aspectRatio: '16/9' }}>

          {videoUrl ? (
            <video ref={videoRef} src={videoUrl} autoPlay loop muted playsInline
              className="absolute inset-0 w-full h-full"
              style={{ objectFit: 'contain' }} />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Video size={36} className={isLightMode ? 'text-slate-600' : 'text-[#3d4f5e]'} />
              <p className={`text-xs font-medium ${isLightMode ? 'text-slate-500' : 'text-[#78899a]'}`}>No preview available</p>
              <p className="text-[#3d4f5e] text-[10px]">Assign a test video to see the camera feed here</p>
              <p className="text-[#3d4f5e] text-[10px]">Zones will still be applied to the live stream</p>
            </div>
          )}

          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            className="absolute inset-0 w-full h-full"
            style={{ cursor: 'crosshair', zIndex: 10 }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          />

          {zones.length > 0 && (
            <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-black text-white"
              style={{ background: '#FF9500', letterSpacing: '0.1em', pointerEvents: 'none', zIndex: 20 }}>
              {zones.length} ZONE{zones.length > 1 ? 'S' : ''}
            </div>
          )}

          {zones.length === 0 && !drawing && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded"
              style={{ background: 'rgba(0,0,0,0.65)', pointerEvents: 'none', zIndex: 20 }}>
              <p className="text-white text-[10px] font-bold tracking-wider">CLICK + DRAG TO DRAW ZONE</p>
            </div>
          )}
        </div>

        {/* Zone list */}
        {zones.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className={`text-[10px] font-black uppercase tracking-widest px-1 ${isLightMode ? 'text-slate-400' : 'text-[#78899a]'}`}>Active Zones</p>
            {zones.map((z, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-2xl"
                style={isLightMode
                  ? { background: 'rgba(255,149,0,0.06)', border: '1px solid rgba(255,149,0,0.15)' }
                  : { background: 'rgba(255,149,0,0.04)', border: '1px solid rgba(255,149,0,0.2)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded border-2" style={{ borderColor: '#FF9500' }} />
                  <span className={`text-xs font-bold ${isLightMode ? 'text-slate-700' : 'text-[#c8d0d8]'}`}>Zone {i + 1}</span>
                  <span className={`text-[10px] font-mono ${isLightMode ? 'text-slate-400' : 'text-[#78899a]'}`}>
                    {Math.round((z.w / CW) * 100)}% × {Math.round((z.h / CH) * 100)}%
                    &nbsp;@ ({Math.round((z.x / CW) * 100)}%, {Math.round((z.y / CH) * 100)}%)
                  </span>
                </div>
                <button onClick={() => setZones(prev => prev.filter((_, j) => j !== i))}
                  className={`w-6 h-6 rounded flex items-center justify-center transition-all ${isLightMode ? 'hover:bg-red-50' : 'hover:bg-red-950/20'}`}>
                  <X size={12} className={isLightMode ? 'text-slate-300 hover:text-[#FF3B30]' : 'text-[#3d4f5e] hover:text-[#d93a3a]'} strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className={`flex items-center justify-between mt-5 pt-4 border-t ${isLightMode ? 'border-slate-100' : 'border-[#222831]'}`}>
          <button
            onClick={() => setZones([])}
            className="px-4 py-2 rounded-2xl text-sm font-bold transition-all"
            style={{ 
              color: zones.length ? '#d93a3a' : (isLightMode ? '#8E8E93' : '#78899a'), 
              background: zones.length ? (isLightMode ? 'rgba(255,59,48,0.06)' : 'rgba(217,58,58,0.08)') : 'transparent' 
            }}
          >
            {zones.length ? 'Clear All' : 'No zones (full frame)'}
          </button>
          <div className="flex gap-2">
            <button onClick={onClose}
              className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                isLightMode ? 'text-slate-600 bg-slate-100 hover:bg-slate-200' : 'text-[#c8d0d8] bg-[#181d22] hover:bg-[#222831]'
              }`}>
              Cancel
            </button>
            <button onClick={save} disabled={saving}
              className="px-5 py-2.5 rounded-2xl text-sm font-bold text-white transition-all bg-[#0A7E8C] hover:bg-[#126180] disabled:opacity-50">
              {saving ? 'Saving…' : zones.length === 0 ? 'Clear & Save' : `Save ${zones.length} Zone${zones.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── Camera Form / Page Component ─────────────────────────────────────────────

const blank = { name: '', url: '', region: 'NORTH_AMERICAN', frameStep: 5, notes: '', zone: '', lat: '', lng: '' }

export default function CamerasClient() {
  const { isLightMode } = useTheme()
  const { data: cameras = [], isLoading, mutate } = useSWR<Camera[]>('/api/cameras', fetcher, { refreshInterval: 5000 })
  const [showAdd, setShowAdd] = useState(false)
  const [editCamera, setEditCamera] = useState<Camera | null>(null)
  const [zoneCamera, setZoneCamera] = useState<Camera | null>(null)
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set())
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingCameraRef = useRef<Camera | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    getAllVideos().then(videos => {
      setAssignedIds(new Set(videos.map(v => v.cameraId)))
    })
  }, [])

  async function assignVideo(camera: Camera) {
    pendingCameraRef.current = camera
    fileInputRef.current?.click()
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const camera = pendingCameraRef.current
    if (!file || !camera) return
    e.target.value = ''

    setAssigningId(camera.id)
    try {
      const fd = new FormData()
      fd.append('video', file)
      await fetch(`/api/cameras/${camera.id}/assign-test-video`, { method: 'POST', body: fd })

      await saveVideo({
        blob: file,
        filename: file.name,
        cameraId: camera.id,
        cameraName: camera.name,
        region: camera.region,
        frameStep: camera.frameStep,
        assignedAt: new Date().toISOString(),
      })
      setAssignedIds(prev => new Set([...prev, camera.id]))
      window.dispatchEvent(new Event('camera-video-updated'))
      mutate()
      toast(`Test video assigned to ${camera.name}`)
    } catch {
      toast('Failed to save video', 'error')
    } finally {
      setAssigningId(null)
    }
  }

  async function unassignVideo(camera: Camera) {
    await fetch(`/api/cameras/${camera.id}/assign-test-video`, { method: 'DELETE' }).catch(() => {})
    await removeVideo(camera.id)
    setAssignedIds(prev => { const s = new Set(prev); s.delete(camera.id); return s })
    window.dispatchEvent(new Event('camera-video-updated'))
    mutate()
    toast(`Test video removed from ${camera.name}`)
  }

  function openAdd() { setForm(blank); setShowAdd(true) }
  function openEdit(c: Camera) {
    setForm({
      name: c.name, url: c.url, region: c.region,
      frameStep: c.frameStep, notes: c.notes ?? '',
      zone: c.zone ?? '', lat: c.lat?.toString() ?? '', lng: c.lng?.toString() ?? '',
    })
    setEditCamera(c)
  }
  function closeModal() { setShowAdd(false); setEditCamera(null) }

  async function save() {
    if (!form.name.trim() || !form.url.trim()) return toast('Name and URL are required', 'error')
    setSaving(true)
    try {
      const payload: any = {
        name: form.name, url: form.url, region: form.region,
        frameStep: form.frameStep, notes: form.notes || undefined,
        zone: form.zone || undefined,
        lat: form.lat ? parseFloat(form.lat) : undefined,
        lng: form.lng ? parseFloat(form.lng) : undefined,
      }
      if (editCamera) {
        await api.updateCamera(editCamera.id, payload)
        toast('Camera updated')
      } else {
        await api.createCamera({ ...payload, active: true })
        toast('Camera added and stream started')
      }
      mutate()
      closeModal()
    } catch (e: any) {
      toast(e.message ?? 'Failed to save camera', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(camera: Camera) {
    try {
      await api.updateCamera(camera.id, { active: !camera.active })
      mutate()
      toast(camera.active ? 'Camera paused' : 'Camera resumed')
    } catch (e: any) {
      toast(e.message ?? 'Failed to update camera', 'error')
    }
  }

  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string | null; name: string }>({ open: false, id: null, name: '' })

  async function remove() {
    if (!confirmState.id) return
    try {
      await api.deleteCamera(confirmState.id)
      mutate()
      toast('Camera removed')
    } catch (e: any) {
      toast(e.message ?? 'Failed to remove camera', 'error')
    } finally {
      setConfirmState({ open: false, id: null, name: '' })
    }
  }

  const active = cameras.filter(c => c.active).length
  const streaming = cameras.filter(c => c.streaming).length

  // Theme-aware styles
  const cardBg = isLightMode ? 'bg-white' : 'bg-[#0e1114]'
  const cardBorder = isLightMode ? 'border border-slate-100' : 'border border-[#222831]'
  const headingColor = isLightMode ? 'text-slate-800' : 'text-[#c8d0d8]'
  const secTextColor = isLightMode ? 'text-slate-400' : 'text-[#78899a]'
  const separatorColor = isLightMode ? 'text-slate-200' : 'text-[#222831]'
  const inputBg = isLightMode ? 'bg-white text-slate-800 border-slate-200' : 'bg-[#0e1114] text-[#c8d0d8] border-[#222831]'

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileSelected}
      />
      <TopBar title="Cameras" connected={streaming > 0} />

      <main className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6 overflow-y-auto">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4">
          {[
            { label: 'Total Cameras', value: cameras.length, color: '#0A7E8C' },
            { label: 'Active', value: active, color: isLightMode ? '#30D158' : '#2db55d' },
            { label: 'Streaming', value: streaming, color: '#FF9500' },
          ].map(s => (
            <div key={s.label} className={`p-5 flex flex-col gap-1 rounded-2xl ${cardBg} ${cardBorder}`}>
              <p className={`text-[10px] font-black uppercase tracking-widest ${secTextColor}`}>{s.label}</p>
              <p className="text-3xl font-black tracking-tighter" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className={`text-base font-black tracking-tight ${headingColor}`}>Registered Streams</h2>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white transition-all bg-[#0A7E8C] hover:bg-[#126180] active:scale-[0.97]">
            <Plus size={16} strokeWidth={2.5} />
            Add Camera
          </button>
        </div>

        {/* Camera list */}
        {isLoading ? (
          <CameraListSkeleton count={3} />
        ) : cameras.length === 0 ? (
          <div className={`p-16 text-center rounded-2xl ${cardBg} ${cardBorder}`}>
            <Video size={40} className={`mx-auto mb-4 ${isLightMode ? 'text-slate-200' : 'text-[#3d4f5e]'}`} />
            <p className={`font-semibold text-sm ${isLightMode ? 'text-slate-400' : 'text-[#c8d0d8]'}`}>No cameras registered</p>
            <p className={`text-xs mt-1 ${secTextColor}`}>Add an RTSP or HTTP stream to start monitoring</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cameras.map(camera => {
              const borderLeftStyle = camera.streaming 
                ? (isLightMode ? '3px solid #30D158' : '3px solid #2db55d') 
                : camera.active ? '3px solid #FF9500' : (isLightMode ? '3px solid #E5E5EA' : '3px solid #222831')

              return (
                <div 
                  key={camera.id} 
                  className={`px-5 pt-4 pb-4 animate-in fade-in rounded-2xl transition-all ${cardBg} ${cardBorder}`}
                  style={{ borderLeft: borderLeftStyle }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ 
                        background: camera.streaming 
                          ? (isLightMode ? 'rgba(48,209,88,0.1)' : 'rgba(45,181,93,0.1)') 
                          : (isLightMode ? 'rgba(142,142,147,0.1)' : 'rgba(142,142,147,0.05)') 
                      }}>
                      {camera.streaming
                        ? <Wifi size={18} className={isLightMode ? 'text-[#30D158]' : 'text-[#2db55d]'} />
                        : <WifiOff size={18} className={secTextColor} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className={`text-sm font-bold truncate ${isLightMode ? 'text-slate-800' : 'text-[#c8d0d8]'}`}>{camera.name}</p>
                        <StatusDot active={camera.active} streaming={camera.streaming} />
                        {camera.zone && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded text-[#0A7E8C] bg-[#0A7E8C]/8">
                            <PinIcon size={8} />{camera.zone}
                          </span>
                        )}
                        {camera.roiInclude?.length ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded"
                            style={{ color: '#FF9500', background: 'rgba(255,149,0,0.1)' }}>
                            <Crop size={8} />{camera.roiInclude.length} zone{camera.roiInclude.length > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                            isLightMode ? 'text-slate-500 bg-slate-100' : 'text-[#78899a] bg-[#181d22]'
                          }`}>
                            <Crop size={8} />full frame
                          </span>
                        )}
                      </div>
                      <p className={`text-xs font-mono truncate ${secTextColor}`}>{camera.url}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${secTextColor}`}>{REGION_LABELS[camera.region] ?? camera.region}</span>
                        <span className={`text-[10px] ${separatorColor}`}>·</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${secTextColor}`}>Every {camera.frameStep} frames</span>
                        {camera.lat != null && (
                          <>
                            <span className={`text-[10px] ${separatorColor}`}>·</span>
                            <span className={`text-[10px] font-mono ${secTextColor}`}>{camera.lat.toFixed(4)}, {camera.lng?.toFixed(4)}</span>
                          </>
                        )}
                        {camera.notes && (
                          <>
                            <span className={`text-[10px] ${separatorColor}`}>·</span>
                            <span className={`text-[10px] truncate max-w-[160px] ${secTextColor}`}>{camera.notes}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {assignedIds.has(camera.id) && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded mr-1 bg-[#0A7E8C]/8">
                          <Film size={11} className="text-[#0A7E8C]" strokeWidth={2.5} />
                          <span className={`text-[10px] font-bold ${isLightMode ? 'text-[#0A7E8C]' : 'text-[#a5cdeb]'}`}>TEST VIDEO</span>
                          <button
                            onClick={() => unassignVideo(camera)}
                            className={`ml-1 w-4 h-4 rounded flex items-center justify-center transition-all ${
                              isLightMode ? 'hover:bg-red-50' : 'hover:bg-red-950/20'
                            }`}
                          >
                            <X size={9} className={`hover:text-[#d93a3a] ${secTextColor}`} strokeWidth={2.5} />
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => assignVideo(camera)}
                        disabled={assigningId === camera.id}
                        title="Assign looping test video"
                        className={`flex items-center gap-1.5 px-3 h-9 rounded-2xl text-[11px] font-bold transition-all disabled:opacity-50 ${
                          isLightMode ? 'hover:bg-slate-100' : 'hover:bg-[#181d22]'
                        }`}
                        style={{ color: assignedIds.has(camera.id) ? '#0A7E8C' : (isLightMode ? '#8E8E93' : '#78899a') }}
                      >
                        <Film size={14} strokeWidth={2} />
                        {assigningId === camera.id ? 'Saving…' : assignedIds.has(camera.id) ? 'Replace' : 'Test Video'}
                      </button>

                      <button
                        onClick={() => setZoneCamera(camera)}
                        title="Configure detection zone" aria-label="Edit ROI zones"
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${
                          isLightMode ? 'hover:bg-orange-50' : 'hover:bg-[#ff9500]/10'
                        }`}>
                        <Crop size={15} className={camera.roiInclude?.length ? 'text-[#FF9500]' : secTextColor} />
                      </button>

                      <button onClick={() => openEdit(camera)} aria-label="Edit camera"
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${
                          isLightMode ? 'hover:bg-slate-100' : 'hover:bg-[#181d22]'
                        }`}>
                        <Edit3 size={15} className={secTextColor} />
                      </button>
                      <button onClick={() => toggleActive(camera)} aria-label="Toggle camera active"
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${
                          isLightMode ? 'hover:bg-slate-100' : 'hover:bg-[#181d22]'
                        }`}>
                        <Power size={15} className={camera.active ? (isLightMode ? 'text-[#30D158]' : 'text-[#2db55d]') : (isLightMode ? 'text-slate-300' : 'text-[#3d4f5e]')} />
                      </button>
                      <button onClick={() => setConfirmState({ open: true, id: camera.id, name: camera.name })} aria-label="Delete camera"
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${
                          isLightMode ? 'hover:bg-red-50' : 'hover:bg-red-950/20'
                        }`}>
                        <Trash2 size={15} className={`${secTextColor} hover:text-[#d93a3a]`} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {zoneCamera && (
        <ZoneEditorModal
          camera={zoneCamera}
          onClose={() => setZoneCamera(null)}
          mutate={mutate}
        />
      )}

      {/* Add / Edit Modal */}
      <Modal open={showAdd || editCamera !== null} onClose={closeModal}
        title={editCamera ? `Edit: ${editCamera.name}` : 'Add Camera Stream'}>
        <div className="space-y-4">
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${secTextColor}`}>Camera Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0A7E8C]/30 ${inputBg}`}
              placeholder="Entrance Gate 1" />
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${secTextColor}`}>Stream URL</label>
            <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              className={`w-full px-4 py-3 rounded-2xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0A7E8C]/30 ${inputBg}`}
              placeholder="rtsp://admin:pass@192.168.1.100:554/stream1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${secTextColor}`}>Region</label>
              <select value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0A7E8C]/30 ${inputBg}`}>
                {REGIONS.map(r => <option key={r} value={r} className={isLightMode ? 'text-slate-800' : 'text-[#c8d0d8] bg-[#0e1114]'}>{REGION_LABELS[r]}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${secTextColor}`}>Frame Step</label>
              <input type="number" min={1} max={30} value={form.frameStep}
                onChange={e => setForm(f => ({ ...f, frameStep: parseInt(e.target.value) || 5 }))}
                className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0A7E8C]/30 ${inputBg}`}
                placeholder="5" />
              <p className={`text-[10px] mt-1 ${secTextColor}`}>Process every Nth frame (1–30)</p>
            </div>
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${secTextColor}`}>
              Zone / Location Name <span className="normal-case font-medium opacity-60">(for journey tracking)</span>
            </label>
            <input value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}
              className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0A7E8C]/30 ${inputBg}`}
              placeholder="e.g. Main Gate, Sector 7, North Checkpoint" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${secTextColor}`}>Latitude</label>
              <input type="number" step="any" value={form.lat}
                onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
                className={`w-full px-4 py-3 rounded-2xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0A7E8C]/30 ${inputBg}`}
                placeholder="31.5204" />
            </div>
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${secTextColor}`}>Longitude</label>
              <input type="number" step="any" value={form.lng}
                onChange={e => setForm(f => ({ ...f, lng: e.target.value }))}
                className={`w-full px-4 py-3 rounded-2xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0A7E8C]/30 ${inputBg}`}
                placeholder="74.3587" />
            </div>
          </div>
          <p className={`text-[10px] -mt-2 ${secTextColor}`}>
            Right-click any spot on Google Maps → copy the coordinates. First number = lat, second = lng.
          </p>

          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${secTextColor}`}>Notes (optional)</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0A7E8C]/30 ${inputBg}`}
              placeholder="Mounting angle, coverage area, etc." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={closeModal}
              className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                isLightMode ? 'text-slate-600 bg-slate-100 hover:bg-slate-200' : 'text-[#c8d0d8] bg-[#181d22] hover:bg-[#222831]'
              }`}>
              Cancel
            </button>
            <button onClick={save} disabled={saving}
              className="px-5 py-2.5 rounded-2xl text-sm font-bold text-white transition-all bg-[#0A7E8C] hover:bg-[#126180] disabled:opacity-50">
              {saving ? 'Saving…' : editCamera ? 'Save Changes' : 'Add & Start Stream'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={confirmState.open}
        title="Remove Camera"
        message={`Remove camera "${confirmState.name}"? This stops the stream permanently.`}
        confirmLabel="Remove"
        onConfirm={remove}
        onCancel={() => setConfirmState({ open: false, id: null, name: '' })}
      />
    </div>
  )
}
