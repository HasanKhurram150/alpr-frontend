'use client'
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import useSWR from 'swr'
import { useSSE } from '@/lib/useSSE'
import { getVideo, CameraVideoEntry } from '@/lib/cameraVideoStore'
import { Camera, Journey, JourneySighting, Alert, WatchlistEntry, DetectionEvent, Person } from '@/types'
import { useAlertFeed } from '@/lib/useAlertFeed'
import type { PlateTrailPoint } from '@/components/ui/OpsMap'

const OpsMap = dynamic(() => import('@/components/ui/OpsMap'), { ssr: false })

const fetcher = (url: string) => fetch(url).then(r => r.json())


import { CameraGrid, Brackets, confClass, led } from '@/components/dashboard/CameraGrid'
import { WatchlistView } from '@/components/dashboard/WatchlistView'
import { IncidentsView } from '@/components/dashboard/IncidentsView'
import { CameraOverviewPanel } from '@/components/dashboard/CameraOverviewPanel'
import { LiveTrackingPanel } from '@/components/dashboard/LiveTrackingPanel'
// import { PlateJourneyView } from '@/components/dashboard/PlateJourneyView'
import { PersonFaceJourneyView } from '@/components/dashboard/PersonFaceJourneyView'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { PlateJourneyView } from '@/components/dashboard/PlateJourneyView'
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react'

function eventStatus(ev: DetectionEvent, alerts: Alert[]) {
  if (alerts.some(a => a.plateText === ev.plateText && !a.acknowledged)) return 'alert'
  return 'clear'
}

// ─── Digital Clock ────────────────────────────────────────────────────────────

function Clock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-PK', { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span style={{ color: '#e8a000', fontSize: 15, fontWeight: 700, letterSpacing: '0.08em', minWidth: 80 }}>
      {time} PKT
    </span>
  )
}



// ─── Resize handle ───────────────────────────────────────────────────────────

const PANEL_MIN = 200
const PANEL_MAX = 640
const PANEL_DEFAULT = 380

function ResizeHandle({ onDrag }: { onDrag: (delta: number) => void }) {
  const dragging = useRef(false)
  const [active, setActive] = useState(false)

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    setActive(true)
    let lastX = e.clientX

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      onDrag(ev.clientX - lastX)
      lastX = ev.clientX
    }
    const onUp = () => {
      dragging.current = false
      setActive(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        width: 5, flexShrink: 0, cursor: 'col-resize', zIndex: 20, position: 'relative',
        background: active ? 'rgba(232,160,0,0.5)' : 'transparent',
        transition: 'background 0.1s',
        userSelect: 'none',
      }}
      onMouseEnter={e => { if (!dragging.current) e.currentTarget.style.background = 'rgba(232,160,0,0.2)' }}
      onMouseLeave={e => { if (!dragging.current) e.currentTarget.style.background = 'transparent' }}
    >
      {/* Grip dots */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex', flexDirection: 'column', gap: 3,
        pointerEvents: 'none',
      }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: 2, height: 2, borderRadius: '50%', background: active ? '#e8a000' : '#3d4f5e' }} />
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OpsDashboard() {
  // ── State
  const [isLightMode, setIsLightMode] = useState<boolean>(false)
  const [mounted, setMounted] = useState<boolean>(false)

  useEffect(() => {
    const stored = localStorage.getItem('ops-light-mode')
    setTimeout(() => {
      if (stored === 'true') {
        setIsLightMode(true)
      }
      setMounted(true)
    }, 0)
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('ops-light-mode', String(isLightMode))
    }
  }, [isLightMode, mounted])

  const [feedFilter, setFeedFilter]     = useState<'ALL' | 'ALERT' | 'WATCH' | 'CLEAR'>('ALL')
  const [selectedEvent, setSelectedEvent] = useState<DetectionEvent | null>(null)
  const [centerView, setCenterView]     = useState<'MAP' | 'CAMERAS' | 'WATCHLIST'>('MAP')
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null)
  const [selectedPlate, setSelectedPlate]   = useState<string | null>(null)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [expandedCameraId, setExpandedCameraId] = useState<string | null>(null)
  // ── Resizable panels — persist to localStorage
  const [leftWidth, setLeftWidth]   = useState<number>(PANEL_DEFAULT)
  const [rightWidth, setRightWidth] = useState<number>(PANEL_DEFAULT)
  const [leftMinimized, setLeftMinimized] = useState<boolean>(false)
  const [rightMinimized, setRightMinimized] = useState<boolean>(false)
  useEffect(() => {
    const l = Number(localStorage.getItem('ops-left-w'))
    const r = Number(localStorage.getItem('ops-right-w'))
    if (l) setLeftWidth(Math.min(PANEL_MAX, Math.max(PANEL_MIN, l)))
    if (r) setRightWidth(Math.min(PANEL_MAX, Math.max(PANEL_MIN, r)))
  }, [])
  useEffect(() => { localStorage.setItem('ops-left-w',  String(leftWidth))  }, [leftWidth])
  useEffect(() => { localStorage.setItem('ops-right-w', String(rightWidth)) }, [rightWidth])

  const openJourney = (plate: string) => { setSelectedPlate(plate); setCenterView('MAP') }

  // ── Data
  const {
    cameras,
    allAlerts,
    watchlistData,
    journeys,
    recentEvents,
    personsData,
    plateEventsData,
    faceEvents,
    liveFaceEvents,
    setLiveEvents,
  } = useAlertFeed(selectedPlate)

  // Build map trail for selected plate — group sightings by camera, ordered chronologically
  const plateTrail: PlateTrailPoint[] = (() => {
    if (!selectedPlate) return []
    const sightings: DetectionEvent[] = plateEventsData?.data ?? []
    const camMap = new Map<string, PlateTrailPoint>()
    for (const ev of [...sightings].reverse()) { // reverse → chronological order
      if (!ev.cameraId) continue
      const cam = cameras.find(c => c.id === ev.cameraId)
      if (!cam || cam.lat == null || cam.lng == null) continue
      if (!camMap.has(ev.cameraId)) {
        camMap.set(ev.cameraId, { lat: cam.lat, lng: cam.lng, cameraName: cam.name, timestamp: ev.timestamp, count: 1 })
      } else {
        camMap.get(ev.cameraId)!.count++
      }
    }
    return Array.from(camMap.values())
  })()

  // ── Derived stats
  const today = new Date().toDateString()
  const todayCount    = recentEvents.filter(e => new Date(e.timestamp).toDateString() === today).length
  const streamingCount = cameras.filter(c => c.streaming).length
  const offlineCount   = cameras.filter(c => !c.streaming).length
  const alertCount     = allAlerts.filter(a => !a.acknowledged).length

  // ── Feed filtering
  const filteredEvents = recentEvents.filter(ev => {
    if (feedFilter === 'ALL')   return true
    if (feedFilter === 'ALERT') return allAlerts.some(a => a.plateText === ev.plateText && !a.acknowledged)
    if (feedFilter === 'CLEAR') return !allAlerts.some(a => a.plateText === ev.plateText)
    return false
  })

  // ── Ticker content
  const tickerItems = [
    ...recentEvents.slice(0, 6).map(e =>
      `${e.plateText}  ${Math.round(e.confidence * 100)}% · ${e.cameraName ?? e.source?.toUpperCase() ?? 'MANUAL'}  |  `
    ),
    ...allAlerts.slice(0, 3).map(a =>
      `⚠  ${a.plateText} WATCHLIST HIT ${a.reason ? '— ' + a.reason : ''}  |  `
    ),
    `MITS ALPR: ${todayCount} reads today  |  `,
    `CAMERAS: ${streamingCount} LIVE · ${offlineCount} OFFLINE  |  `,
  ]

  const darkC = { bg0: '#003153', bg1: '#00223b', bg2: '#001c30', bg3: '#00223b', amber: '#0A7E8C', green: '#2db55d', red: '#d93a3a', blue: '#126180', txt: '#F0FFF0', txt2: '#8DD9CC', txt3: '#126180', border: 'rgba(141, 217, 204, 0.2)' }
  const lightC = { bg0: '#F0FFF0', bg1: '#ffffff', bg2: '#e8f7f2', bg3: '#F0FFF0', amber: '#0A7E8C', green: '#28a745', red: '#d93a3a', blue: '#126180', txt: '#003153', txt2: '#126180', txt3: '#8DD9CC', border: 'rgba(10, 126, 140, 0.15)' }
  const activeLightMode = mounted && isLightMode
  const C = activeLightMode ? lightC : darkC

  return (
    <div
      className={`ops-page ${activeLightMode ? 'light-mode' : ''}`}
      style={{
        height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        background: C.bg0, color: C.txt,
      }}
    >
      {/* ─── TOP BAR ────────────────────────────────────────────────────────── */}
      <div style={{ height: 52, background: C.bg1, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'stretch', flexShrink: 0, zIndex: 100 }}>

        {/* Left: brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingLeft: 18, paddingRight: 24, borderRight: `1px solid ${C.border}`, flexShrink: 0 }}>
          <img src="/Logo.png" alt="MITS" style={{ height: 38, width: 'auto', objectFit: 'contain', flexShrink: 0, filter: activeLightMode ? 'invert(1)' : 'none' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
            <img src="/M.I.T.S.png" alt="M.I.T.S." style={{ height: 18, width: 'auto', objectFit: 'contain', filter: activeLightMode ? 'invert(1)' : 'none' }} />
            <div style={{ fontSize: 11, color: '#5B8FB9', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Multiple Identity Tracking System</div>
          </div>
        </div>

        {/* Center: spacer */}
        <div style={{ flex: 1 }} />

        {/* Right: cameras status + clock + admin */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingRight: 16, paddingLeft: 16, borderLeft: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button 
            onClick={() => setIsLightMode(!isLightMode)}
            className="ops-btn" style={{ borderColor: C.border, color: C.txt }}
          >
            {activeLightMode ? 'DARK MODE' : 'LIGHT MODE'}
          </button>
          <Link href="/admin/cameras" style={{ textDecoration: 'none' }}>
            <button className="ops-btn ops-btn-amber">→ ADMIN PANEL</button>
          </Link>
          <Clock />
        </div>
      </div>

      {/* ─── MAIN 3-COLUMN FLEX ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ══════════ LEFT PANEL — ALPR (dynamic) ══════════ */}
        <div style={{ width: leftMinimized ? 44 : leftWidth, minWidth: leftMinimized ? 44 : PANEL_MIN, flexShrink: 0, background: C.bg1, display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'width 0.3s ease, min-width 0.3s ease' }}>

          {/* Panel header — title changes based on context */}
          <div className="ops-panel-hdr" style={{ justifyContent: leftMinimized ? 'center' : 'space-between', paddingLeft: leftMinimized ? 0 : 12 }}>
            {!leftMinimized && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>
                  {selectedPlate
                    ? `JOURNEY · ${selectedPlate}`
                    : selectedCamera && centerView === 'CAMERAS'
                      ? `TRACKING · ${selectedCamera.name.toUpperCase()}`
                      : centerView === 'MAP'
                        ? 'CAMERA OVERVIEW'
                        : 'ALPR'}
                </span>
              </div>
            )}
            <button
              onClick={() => setLeftMinimized(m => !m)}
              title={leftMinimized ? "Expand left panel" : "Minimize left panel"}
              style={{ background: 'none', border: 'none', color: C.txt3, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px 8px' }}
            >
              {leftMinimized ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>

          {!leftMinimized && (
            <>
              {/* Stats row — always visible */}
          <div style={{ fontSize:10, display: 'flex', background: C.bg2, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            {[
              { label: 'DETECTION TODAY', val: todayCount, color: C.amber },
              { label: 'ALERTS', val: alertCount, color: alertCount > 0 ? C.red : C.txt2 },
              { label: 'WATCHLIST', val: watchlistData.length, color: C.amber },
            ].map(s => (
              <div key={s.label} className="ops-stat-cell">
                <div className="ops-stat-val" style={{ color: s.color }}>{s.val}</div>
                <div className="ops-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Dynamic content area */}
          {selectedPlate ? (
            /* ── Plate journey view ── */
            <ErrorBoundary>
              <PlateJourneyView
                plateText={selectedPlate}
                cameras={cameras}
                C={C}
                onBack={() => setSelectedPlate(null)}
              />
            </ErrorBoundary>
          ) : selectedCamera && centerView === 'CAMERAS' ? (
            /* ── Live tracking for selected camera ── */
            <ErrorBoundary>
              <LiveTrackingPanel
                cam={selectedCamera}
                allAlerts={allAlerts}
                watchlistData={watchlistData}
                recentEvents={recentEvents}
                C={C}
                onSelectPlate={openJourney}
                onBack={() => setSelectedCamera(null)}
              />
            </ErrorBoundary>
          ) : centerView === 'MAP' ? (
            /* ── Camera overview (MAP view) ── */
            <ErrorBoundary>
              <CameraOverviewPanel
                cameras={cameras}
                recentEvents={recentEvents}
                allAlerts={allAlerts}
                watchlistData={watchlistData}
                C={C}
                expandedId={expandedCameraId}
                onExpand={setExpandedCameraId}
              />
            </ErrorBoundary>
          ) : (
            /* ── Default: live plate reads feed ── */
            <>

              <div style={{ display: 'flex', background: C.bg2, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                {(['ALL', 'ALERT', 'WATCH', 'CLEAR'] as const).map(f => (
                  <button key={f} className={`ops-tab${feedFilter === f ? ' active' : ''}`} style={{ flex: 1, padding: '5px 0' }} onClick={() => setFeedFilter(f)}>{f}</button>
                ))}
                <button className="ops-tab" style={{ padding: '5px 10px', color: C.red }} onClick={() => { setLiveEvents([]); setSelectedEvent(null) }}>CLR</button>
              </div>

              <div style={{ flex: selectedEvent ? '0 0 auto' : 1, overflowY: 'auto', maxHeight: selectedEvent ? 220 : undefined }}>
                {filteredEvents.length === 0 ? (
                  <div style={{ padding: '20px 10px', textAlign: 'center', color: C.txt3, fontSize: 9 }}>NO RECORDS</div>
                ) : filteredEvents.map((ev, i) => {
                  const status = eventStatus(ev, allAlerts)
                  return (
                    <div
                      key={ev.id ?? i}
                      className={`ops-feed-row ${status}-row${selectedEvent?.id === ev.id ? ' selected' : ''}`}
                      onClick={() => setSelectedEvent(prev => prev?.id === ev.id ? null : ev)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span className={`ops-plate plate-${status}`}>{ev.plateText}</span>
                        <span style={{ fontSize: 10, color: C.txt2 }}>{Math.round(ev.confidence * 100)}%</span>
                        <span className={`ops-badge badge-${status}`}>{status.toUpperCase()}</span>
                      </div>
                      <div style={{ marginTop: 3, display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: C.txt3, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.cameraName ?? ev.source?.toUpperCase() ?? '—'}
                        </span>
                        <span style={{ fontSize: 10, color: C.txt3, flexShrink: 0 }}>
                          {new Date(ev.timestamp).toLocaleTimeString('en-PK', { hour12: false })}
                        </span>
                        <span
                          style={{ fontSize: 12, color: C.blue, flexShrink: 0, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer' }}
                          onClick={e => { e.stopPropagation(); openJourney(ev.plateText) }}
                        >JOURNEY →</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {selectedEvent && (
                <div style={{ background: C.bg2, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
                  <div className="ops-section-title" style={{ justifyContent: 'space-between' }}>
                    VEHICLE DETAIL
                    <button style={{ background: 'none', border: 'none', color: C.txt3, cursor: 'pointer', fontSize: 10 }} onClick={() => setSelectedEvent(null)}>✕</button>
                  </div>
                  {selectedEvent.thumbnailBase64 && (
                    <div style={{ padding: '8px 12px 4px' }}>
                      <img
                        src={`data:image/jpeg;base64,${selectedEvent.thumbnailBase64}`}
                        alt={selectedEvent.plateText}
                        style={{ width: '100%', maxHeight: 120, objectFit: 'contain', border: `1px solid ${C.amber}44`, background: '#000' }}
                      />
                    </div>
                  )}
                  <div style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: 10 }}>
                    {([
                      ['PLATE',  selectedEvent.plateText],
                      ['CONF',   `${Math.round(selectedEvent.confidence * 100)}%`],
                      ['SOURCE', selectedEvent.source?.toUpperCase()],
                      ['CAMERA', selectedEvent.cameraName ?? '—'],
                      ['PERSON', selectedEvent.personName ?? '—'],
                      ['TIME',   new Date(selectedEvent.timestamp).toLocaleTimeString('en-PK', { hour12: false })],
                    ] as [string, string | undefined][]).map(([k, v]) => (
                      <div key={k}>
                        <div style={{ color: C.txt3, fontSize: 12, letterSpacing: '0.1em', marginBottom: 2 }}>{k}</div>
                        <div style={{ color: k === 'PLATE' ? C.amber : C.txt, fontWeight: k === 'PLATE' ? 700 : 500 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6, padding: '6px 10px', borderTop: `1px solid ${C.border}` }}>
                    <button
                      className="ops-btn ops-btn-amber"
                      style={{ fontSize: 12 }}
                      onClick={() => openJourney(selectedEvent.plateText)}
                    >
                      JOURNEY →
                    </button>
                    <Link href="/admin/watchlist" style={{ textDecoration: 'none' }}>
                      <button className="ops-btn ops-btn-red" style={{ fontSize: 12 }}>WATCHLIST</button>
                    </Link>
                  </div>
                </div>
              )}

              <div style={{ flexShrink: 0 }}>
                <div className="ops-section-title">
                  ALPR CAMERAS
                  <span style={{ marginLeft: 'auto', fontSize: 12 }}>
                    <span style={{ color: C.green }}>{streamingCount} LIVE</span>
                    {offlineCount > 0 && <span style={{ color: C.red, marginLeft: 4 }}>{offlineCount} OFFLN</span>}
                  </span>
                </div>
                <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                  {cameras.length === 0 ? (
                    <div style={{ padding: '10px', textAlign: 'center', color: C.txt3, fontSize: 9 }}>NO CAMERAS CONFIGURED</div>
                  ) : cameras.slice(0, 10).map(cam => (
                    <div key={cam.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ color: C.amber, fontSize: 10, fontWeight: 700, flexShrink: 0, minWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cam.id.slice(-6).toUpperCase()}
                      </span>
                      <span style={{ flex: 1, color: C.txt2, fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cam.name}</span>
                      <span className={`ops-badge ${cam.streaming ? 'badge-live' : 'badge-offln'}`}>{cam.streaming ? 'LIVE' : 'OFFLN'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
            </>
          )}
        </div>

        {/* Left resize handle */}
        {!leftMinimized && <ResizeHandle onDrag={d => setLeftWidth(w => Math.min(PANEL_MAX, Math.max(PANEL_MIN, w + d)))} />}

        {/* ══════════ CENTER ══════════ */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.bg0 }}>

          {/* Toolbar — 3 view tabs */}
          <div style={{ display: 'flex', alignItems: 'stretch', background: C.bg1, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            {(['MAP', 'CAMERAS', 'WATCHLIST'] as const).map(v => (
              <button key={v} className={`ops-tab${centerView === v ? ' active' : ''}`} onClick={() => setCenterView(v)}>
                {v === 'MAP' ? 'MAP' : v === 'CAMERAS' ? 'CAMERAS' : 'WATCHLIST'}
              </button>
            ))}
          </div>

          {/* Content area — switches per tab */}
          <div style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}>

            {/* MAP VIEW */}
            {centerView === 'MAP' && (
              <ErrorBoundary>
                <OpsMap cameras={cameras} journeys={journeys} plateTrail={plateTrail} isLightMode={isLightMode} />
              </ErrorBoundary>
            )}

            {/* CAMERAS VIEW */}
            {centerView === 'CAMERAS' && (
              <ErrorBoundary>
                <CameraGrid
                  cameras={cameras}
                  recentEvents={recentEvents}
                  C={C}
                  onSelectCamera={cam => { setSelectedCamera(cam); setSelectedPlate(null) }}
                />
              </ErrorBoundary>
            )}

            {/* WATCHLIST VIEW */}
            {centerView === 'WATCHLIST' && (
              <ErrorBoundary>
                <WatchlistView watchlist={watchlistData} persons={personsData} alerts={allAlerts} C={C} onOpenJourney={openJourney} />
              </ErrorBoundary>
            )}

          </div>


          {/* Status bar */}
          <div style={{
            height: 26, background: C.bg1, borderTop: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', gap: 18, paddingLeft: 12, paddingRight: 12,
            flexShrink: 0, overflowX: 'auto',
          }}>
            {[
              ['REGION', 'ISB/RWP'],
              ['CAMERAS', String(cameras.length)],
              ['ONLINE', String(streamingCount)],
              ['OFFLINE', String(offlineCount)],
              ['JOURNEYS', String(journeys.length)],
              ['ALERTS', String(alertCount)],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 9, color: C.txt3, letterSpacing: '0.1em' }}>{k}</span>
                <span style={{ fontSize: 10, color: C.amber, fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right resize handle */}
        {!rightMinimized && <ResizeHandle onDrag={d => setRightWidth(w => Math.min(PANEL_MAX, Math.max(PANEL_MIN, w - d)))} />}

        {/* ══════════ RIGHT PANEL — FACE ID ══════════ */}
        <div style={{ width: rightMinimized ? 44 : rightWidth, minWidth: rightMinimized ? 44 : PANEL_MIN, flexShrink: 0, background: C.bg1, display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'width 0.3s ease, min-width 0.3s ease' }}>

          {/* Panel header */}
          <div className="ops-panel-hdr" style={{ justifyContent: rightMinimized ? 'center' : 'space-between', paddingLeft: rightMinimized ? 0 : 12 }}>
            {rightMinimized ? (
              <button
                onClick={() => setRightMinimized(false)}
                title="Expand right panel"
                style={{ background: 'none', border: 'none', color: C.txt3, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px 8px' }}
              >
                <PanelRightOpen size={16} />
              </button>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => setRightMinimized(true)}
                    title="Minimize right panel"
                    style={{ background: 'none', border: 'none', color: C.txt3, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px 0', marginRight: 4 }}
                  >
                    <PanelRightClose size={16} />
                  </button>
                  <span>{selectedPersonId ? 'PERSON JOURNEY' : 'FACIAL RECOGNITION'}</span>
                </div>
                {selectedPersonId && (
                  <button
                    onClick={() => setSelectedPersonId(null)}
                    style={{ background: 'none', border: 'none', color: C.amber, cursor: 'pointer', fontSize: 9, fontFamily: 'inherit', fontWeight: 800, letterSpacing: '0.1em', padding: 0 }}
                  >← BACK</button>
                )}
              </>
            )}
          </div>

          {!rightMinimized && (
            <>
              {selectedPersonId ? (
                /* ── Person Face Journey ── */
            <ErrorBoundary>
              <PersonFaceJourneyView personId={selectedPersonId} persons={personsData} cameras={cameras} C={C} />
            </ErrorBoundary>
          ) : (
            <>
              {/* Stats row */}
              <div style={{ display: 'flex', background: C.bg2, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                {[
                  { label: 'DETECTED', val: faceEvents.length, color: C.green },
                  { label: 'IDENTIFIED', val: faceEvents.filter((f: any) => !!f.personId).length, color: C.blue },
                ].map(s => (
                  <div key={s.label} className="ops-stat-cell">
                    <div className="ops-stat-val" style={{ color: s.color }}>{s.val}</div>
                    <div className="ops-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Live face detections */}
              <div className="ops-section-title" style={{ flexShrink: 0 }}>
                LIVE DETECTIONS
                {liveFaceEvents.length > 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: 7, color: C.green, fontWeight: 800, letterSpacing: '0.1em' }}>
                    LIVE · {liveFaceEvents.length} NEW
                  </span>
                )}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
                {faceEvents.length === 0 ? (
                  <div style={{ padding: '20px 10px', textAlign: 'center', color: C.txt3, fontSize: 9 }}>NO FACE DETECTIONS</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {faceEvents.map((f: any, i: number) => {
                      const spoof = f.spoofDetected
                      const matched = !!f.personId
                      const person = matched ? personsData.find((p: Person) => p.id === f.personId) : null
                      const accentColor = spoof ? C.red : matched ? C.green : C.txt2

                      return (
                        <div
                          key={f.id ?? i}
                          style={{
                            display: 'flex', alignItems: 'stretch', gap: 0,
                            border: `1px solid ${accentColor}33`,
                            background: matched ? `${accentColor}08` : C.bg2,
                            animation: i === 0 ? 'row-flash 0.8s ease-out' : 'none',
                            overflow: 'hidden',
                          }}
                        >
                          {/* Face image */}
                          <div style={{
                            width: 68, flexShrink: 0, position: 'relative',
                            borderRight: `1px solid ${accentColor}33`,
                            background: C.bg3,
                          }}>
                            {f.thumbnailBase64 ? (
                              <img
                                src={`data:image/jpeg;base64,${f.thumbnailBase64}`}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', minHeight: 72 }}
                              />
                            ) : (
                              <div style={{ width: '100%', minHeight: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.5">
                                  <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                                </svg>
                              </div>
                            )}
                            {/* Corner brackets */}
                            <Brackets color={accentColor} size={5} />
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, padding: '7px 9px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
                            <div>
                              {/* Name or Unknown */}
                              <div style={{ fontSize: 12, fontWeight: 800, color: accentColor, letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {person?.name?.toUpperCase() ?? f.personName?.toUpperCase() ?? 'UNKNOWN'}
                              </div>
                              {/* Camera */}
                              <div style={{ fontSize: 9, color: C.txt3, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {f.cameraName ?? 'MANUAL'} · {new Date(f.timestamp).toLocaleTimeString('en-PK', { hour12: false })}
                              </div>
                              {/* Badges */}
                              <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 8, fontWeight: 700, color: accentColor, background: `${accentColor}15`, border: `1px solid ${accentColor}44`, padding: '1px 5px', letterSpacing: '0.08em' }}>
                                  {Math.round(f.confidence * 100)}%
                                </span>
                                {spoof && <span style={{ fontSize: 8, fontWeight: 700, color: C.red, background: 'rgba(217,58,58,0.12)', border: `1px solid ${C.red}44`, padding: '1px 5px', letterSpacing: '0.08em' }}>SPOOF</span>}
                                {matched && !spoof && <span style={{ fontSize: 8, fontWeight: 700, color: C.green, background: 'rgba(45,181,93,0.1)', border: `1px solid ${C.green}44`, padding: '1px 5px', letterSpacing: '0.08em' }}>MATCH</span>}
                              </div>
                            </div>

                            {/* Journey button for identified persons */}
                            {matched && (
                              <button
                                onClick={() => setSelectedPersonId(f.personId)}
                                style={{
                                  marginTop: 6, background: 'none',
                                  border: `1px solid ${C.blue}44`, color: C.blue,
                                  cursor: 'pointer', fontSize: 8, fontFamily: 'inherit',
                                  fontWeight: 800, padding: '3px 8px', letterSpacing: '0.1em',
                                  alignSelf: 'flex-start',
                                }}
                              >JOURNEY →</button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}


