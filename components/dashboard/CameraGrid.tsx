'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Camera, DetectionEvent } from '@/types'
import { getVideo, CameraVideoEntry } from '@/lib/cameraVideoStore'

export function led(color: string, cls = '') {
  return (
    <span
      className={cls}
      style={{
        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
        background: color, flexShrink: 0,
        boxShadow: `0 0 6px ${color}bb`,
      }}
    />
  )
}

export function confClass(v: number) {
  if (v >= 0.96) return 'conf-high'
  if (v >= 0.9)  return 'conf-mid'
  return 'conf-low'
}

export function Brackets({ color = '#2db55d', size = 8 }: { color?: string; size?: number }) {
  return (
    <>
      <div style={{ position: 'absolute', top: 4, left: 4, width: size, height: size, borderTop: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}` }} />
      <div style={{ position: 'absolute', top: 4, right: 4, width: size, height: size, borderTop: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}` }} />
      <div style={{ position: 'absolute', bottom: 4, left: 4, width: size, height: size, borderBottom: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}` }} />
      <div style={{ position: 'absolute', bottom: 4, right: 4, width: size, height: size, borderBottom: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}` }} />
    </>
  )
}

interface LocalDetection {
  plateText: string
  confidence: number
  thumbnailBase64: string | null
  timestamp: string
  boundingBox?: { x: number; y: number; width: number; height: number } | null
}

export function CameraFeed({ cam, recentDetections, C }: {
  cam: Camera
  recentDetections: DetectionEvent[]
  C: Record<string, string>
}) {
  const [testVideoUrl, setTestVideoUrl] = useState<string | null>(null)
  const [testFilename, setTestFilename] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)
  const [localDetections, setLocalDetections] = useState<LocalDetection[]>([])
  const [activeBbox, setActiveBbox] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const bboxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const entryRef = useRef<CameraVideoEntry | null>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const { cameraId, cameraName, plateText, confidence, thumbnailBase64, timestamp, boundingBox } = (e as CustomEvent).detail
      if (cameraId !== cam.id && cameraName !== cam.name) return
      setLocalDetections(prev => [{ plateText, confidence, thumbnailBase64, timestamp, boundingBox }, ...prev].slice(0, 50))
      if (boundingBox) {
        if (bboxTimerRef.current) clearTimeout(bboxTimerRef.current)
        setActiveBbox(boundingBox)
        bboxTimerRef.current = setTimeout(() => setActiveBbox(null), 2500)
      }
    }
    window.addEventListener('mits-detection', handler)
    return () => {
      window.removeEventListener('mits-detection', handler)
      if (bboxTimerRef.current) clearTimeout(bboxTimerRef.current)
    }
  }, [cam.id, cam.name])

  useEffect(() => {
    getVideo(cam.id).then(entry => {
      if (entry) {
        entryRef.current = entry
        const url = URL.createObjectURL(entry.blob)
        objectUrlRef.current = url
        setTestVideoUrl(url)
        setTestFilename(entry.filename)
      }
    })
    const onUpdate = () => {
      getVideo(cam.id).then(entry => {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
        entryRef.current = entry ?? null
        if (entry) {
          const url = URL.createObjectURL(entry.blob)
          objectUrlRef.current = url
          setTestVideoUrl(url)
          setTestFilename(entry.filename)
        } else {
          objectUrlRef.current = null
          setTestVideoUrl(null)
          setTestFilename(null)
        }
      })
    }
    window.addEventListener('camera-video-updated', onUpdate)
    return () => {
      window.removeEventListener('camera-video-updated', onUpdate)
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [cam.id])

  useEffect(() => {
    if (!testVideoUrl || cam.streaming) return
    if (!captureCanvasRef.current) captureCanvasRef.current = document.createElement('canvas')
    const canvas = captureCanvasRef.current
    const entry = entryRef.current
    const intervalMs = Math.max(1000, (entry?.frameStep ?? 5) * 200)

    const id = setInterval(async () => {
      const video = videoRef.current
      if (!video || video.readyState < 2 || video.paused) return
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(video, 0, 0)
      canvas.toBlob(async (blob) => {
        if (!blob) return
        const fd = new FormData()
        fd.append('file', blob, 'frame.jpg')
        fd.append('thumbnail', 'true')
        fd.append('region', entryRef.current?.region ?? 'NORTH_AMERICAN')
        fd.append('cameraId', cam.id)
        fd.append('cameraName', cam.name)
        try {
          const res = await fetch('/api/alpr/detect?thumbnail=true', { method: 'POST', body: fd })
          const data = await res.json().catch(() => null)
          if (data?.plates?.length) {
            const now = new Date().toISOString()
            for (const plate of data.plates) {
              window.dispatchEvent(new CustomEvent('mits-detection', {
                detail: {
                  cameraId: cam.id,
                  cameraName: cam.name,
                  plateText: plate.text,
                  confidence: plate.confidence ?? 0,
                  thumbnailBase64: plate.thumbnail ?? null,
                  timestamp: now,
                  boundingBox: plate.boundingBox ?? null,
                },
              }))
            }
          }
        } catch { }
      }, 'image/jpeg', 0.82)
    }, intervalMs)

    return () => clearInterval(id)
  }, [testVideoUrl, cam.id, cam.name, cam.streaming])

  const displayDetections: Array<{ plateText: string; confidence: number; timestamp: string }> =
    localDetections.length > 0 ? localDetections : recentDetections
  const latestPlate = displayDetections[0]
  const isHttpStream = cam.url?.startsWith('http') && !cam.url?.endsWith('.html')
  const canEmbedStream = cam.streaming && isHttpStream && !imgError
  const isOnline = testVideoUrl || cam.streaming
  const accentColor = testVideoUrl ? C.blue : cam.streaming ? C.green : C.red

  function confColor(v: number) {
    if (v >= 0.95) return C.green
    if (v >= 0.80) return C.amber
    return C.red
  }

  return (
    <div style={{
      background: C.bg1,
      border: `1px solid ${isOnline ? '#2a3240' : C.red + '33'}`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      minHeight: 0, boxShadow: isOnline ? 'none' : `inset 0 0 0 1px ${C.red}11`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', background: C.bg2, borderBottom: `1px solid #1c2330`,
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', padding: '2px 7px',
          flexShrink: 0,
          color: testVideoUrl ? C.blue : cam.streaming ? C.green : C.red,
          background: testVideoUrl ? 'rgba(47,127,193,0.12)' : cam.streaming ? 'rgba(45,181,93,0.1)' : 'rgba(217,58,58,0.1)',
          border: `1px solid ${testVideoUrl ? C.blue : cam.streaming ? C.green : C.red}33`,
        }}>
          {testVideoUrl ? 'TEST' : cam.streaming ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      <div style={{ position: 'relative', aspectRatio: '16/9', background: '#05070a', overflow: 'hidden', flexShrink: 0 }}>
        {testVideoUrl ? (
          <video ref={videoRef} src={testVideoUrl} autoPlay loop muted playsInline
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        ) : canEmbedStream ? (
          <img src={cam.url} alt={cam.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={() => setImgError(true)} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={isOnline ? C.txt3 : C.red + '66'} strokeWidth="1">
              <path d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.9L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
              {!isOnline && <line x1="2" y1="2" x2="22" y2="22" stroke={C.red + '66'} strokeWidth="1.5"/>}
            </svg>
            {isOnline ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: C.txt2, letterSpacing: '0.1em', fontWeight: 600 }}>STREAM ACTIVE</div>
                <div style={{ fontSize: 9, color: C.txt3, marginTop: 3 }}>RTSP · No browser preview</div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: C.red, fontWeight: 700, letterSpacing: '0.12em' }}>NO SIGNAL</div>
                <div style={{ fontSize: 9, color: C.txt3, marginTop: 3 }}>Device unreachable</div>
              </div>
            )}
          </div>
        )}

        <Brackets color={isOnline ? accentColor + '55' : C.red + '33'} size={10} />

        {activeBbox && videoRef.current && (() => {
          const video = videoRef.current!
          const vw = video.videoWidth || 640
          const vh = video.videoHeight || 480
          const cw = video.offsetWidth || 640
          const ch = video.offsetHeight || 480
          const scale = Math.min(cw / vw, ch / vh)
          const rw = vw * scale, rh = vh * scale
          const ox = (cw - rw) / 2, oy = (ch - rh) / 2
          const bx = activeBbox.x * scale + ox
          const by = activeBbox.y * scale + oy
          const bw = activeBbox.width * scale
          const bh = activeBbox.height * scale
          return (
            <div style={{
              position: 'absolute',
              left: bx, top: by, width: bw, height: bh,
              border: '2px solid #e8a000',
              boxShadow: '0 0 10px rgba(232,160,0,0.7), inset 0 0 6px rgba(232,160,0,0.15)',
              pointerEvents: 'none',
              zIndex: 10,
              animation: 'bbox-flash 2.5s ease-out forwards',
            }}>
              <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 2 }}>
                <span style={{
                  fontSize: 9, fontWeight: 800, color: '#e8a000',
                  background: 'rgba(0,0,0,0.82)', padding: '1px 5px',
                  letterSpacing: '0.12em', display: 'block',
                }}>
                  {localDetections[0]?.plateText ?? ''}
                </span>
              </div>
              <div style={{ position: 'absolute', top: -1, left: -1, width: 6, height: 6, borderTop: '2px solid #e8a000', borderLeft: '2px solid #e8a000' }} />
              <div style={{ position: 'absolute', top: -1, right: -1, width: 6, height: 6, borderTop: '2px solid #e8a000', borderRight: '2px solid #e8a000' }} />
              <div style={{ position: 'absolute', bottom: -1, left: -1, width: 6, height: 6, borderBottom: '2px solid #e8a000', borderLeft: '2px solid #e8a000' }} />
              <div style={{ position: 'absolute', bottom: -1, right: -1, width: 6, height: 6, borderBottom: '2px solid #e8a000', borderRight: '2px solid #e8a000' }} />
            </div>
          )
        })()}

        {testVideoUrl && cam.roiInclude?.length ? cam.roiInclude.map((z, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${z.x * 100}%`,
            top: `${z.y * 100}%`,
            width: `${z.width * 100}%`,
            height: `${z.height * 100}%`,
            border: '1px dashed rgba(232,160,0,0.45)',
            background: 'rgba(232,160,0,0.03)',
            pointerEvents: 'none',
            zIndex: 6,
          }}>
            <span style={{
              position: 'absolute', top: 2, left: 4,
              fontSize: 12, fontWeight: 800, letterSpacing: '0.1em',
              color: 'rgba(232,160,0,0.6)',
            }}>ZONE {i + 1}</span>
          </div>
        )) : null}

        {latestPlate && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(transparent, rgba(5,7,10,0.92))',
            padding: '18px 10px 8px',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          }}>
            <span style={{
              fontSize: 14, fontWeight: 800, color: C.amber,
              letterSpacing: '0.14em', lineHeight: 1,
              textShadow: `0 0 20px ${C.amber}66`,
            }}>
              {latestPlate.plateText}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
              <span style={{ fontSize: 10, color: confColor(latestPlate.confidence), fontWeight: 700 }}>
                {Math.round(latestPlate.confidence * 100)}%
              </span>
              <span style={{ fontSize: 9, color: C.txt3 }}>
                {new Date(latestPlate.timestamp).toLocaleTimeString('en-PK', { hour12: false })}
              </span>
            </div>
          </div>
        )}

        {testFilename && (
          <div style={{
            position: 'absolute', top: 8, left: 8,
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(47,127,193,0.75)', backdropFilter: 'blur(4px)',
            padding: '2px 7px', fontSize: 12, color: '#fff', fontWeight: 700, letterSpacing: '0.08em',
            maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            ▶ {testFilename}
          </div>
        )}
      </div>
    </div>
  )
}

export function CameraGrid({ cameras, recentEvents, C, onSelectCamera }: {
  cameras: Camera[]
  recentEvents: DetectionEvent[]
  C: Record<string, string>
  onSelectCamera?: (cam: Camera) => void
}) {
  const [search, setSearch]       = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpandedId(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (cameras.length === 0) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.txt3} strokeWidth="1.2">
          <path d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.9L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
        </svg>
        <div style={{ fontSize: 9, color: C.txt3, letterSpacing: '0.1em' }}>NO CAMERAS CONFIGURED</div>
        <Link href="/admin/cameras" style={{ textDecoration: 'none' }}>
          <button style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', padding: '4px 12px', border: `1px solid ${C.amber}55`, color: C.amber, background: 'rgba(232,160,0,0.06)', cursor: 'pointer', fontFamily: 'inherit' }}>+ ADD CAMERAS</button>
        </Link>
      </div>
    )
  }

  const expandedCam = expandedId ? cameras.find(c => c.id === expandedId) ?? null : null
  if (expandedCam) {
    const camEvents = recentEvents.filter(e => e.cameraId === expandedCam.id || e.cameraName === expandedCam.name)
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.bg0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', background: C.bg2, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button
            onClick={() => setExpandedId(null)}
            style={{ background: 'none', border: 'none', color: C.amber, cursor: 'pointer', fontSize: 9, fontWeight: 800, fontFamily: 'inherit', letterSpacing: '0.1em', padding: 0 }}
          >← ALL CAMERAS</button>
          <div style={{ width: 1, height: 14, background: C.border }} />
           <span style={{ fontSize: 12, fontWeight: 800, color: C.txt, letterSpacing: '0.08em', flex: 1 }}>{expandedCam.name.toUpperCase()}</span>
              <button                                                                                                                                             
                onClick={() => onSelectCamera?.(expandedCam)}                                                                                                     
                style={{ background: 'none', border: `1px solid ${C.blue}55`, color: C.blue, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', letterSpacing: '0.08em', padding: '3px 10px' }}                                                                                                            
             >TRACK →</button>                                                                                                                                   
              <span style={{ fontSize: 7, color: C.txt3, letterSpacing: '0.06em' }}>ESC to close</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: C.bg1, borderBottom: `1px solid ${C.border}`, flexShrink: 0, overflowX: 'auto' }}>
          {cameras.map((cam, idx) => (
            <button
              key={cam.id}
              onClick={() => setExpandedId(cam.id)}
              style={{
                background: cam.id === expandedId ? C.amber : 'none',
                border: `1px solid ${cam.id === expandedId ? C.amber : cam.streaming ? C.green + '55' : C.border}`,
                color: cam.id === expandedId ? C.bg0 : cam.streaming ? C.green : C.txt3,
                cursor: 'pointer', fontSize: 7, fontWeight: 700, fontFamily: 'inherit',
                letterSpacing: '0.06em', padding: '2px 8px', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              {String(idx + 1).padStart(2, '0')} · {cam.name.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          <CameraFeed cam={expandedCam} recentDetections={camEvents} C={C} />
        </div>
      </div>
    )
  }

  const q = search.toLowerCase()
  const filtered = q
    ? cameras.filter(c => c.name.toLowerCase().includes(q) || (c.zone ?? '').toLowerCase().includes(q))
    : cameras

  const liveCount    = cameras.filter(c => c.streaming).length
  const offlineCount = cameras.filter(c => !c.streaming).length
  const cols = filtered.length <= 2 ? 2 : filtered.length <= 6 ? 3 : filtered.length <= 12 ? 4 : 5

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: C.bg2, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: C.txt3, pointerEvents: 'none' }}>⊞</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="SEARCH CAMERAS…"
            style={{
              width: '100%', paddingLeft: 22, paddingRight: search ? 22 : 8, paddingTop: 4, paddingBottom: 4,
              background: C.bg3, border: `1px solid ${C.border}`, color: C.txt,
              fontSize: 9, fontFamily: 'inherit', letterSpacing: '0.08em', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.txt3, cursor: 'pointer', fontSize: 10, lineHeight: 1, padding: 0 }}
            >✕</button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginLeft: 'auto', flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: C.txt3, letterSpacing: '0.08em' }}>
            {filtered.length === cameras.length ? cameras.length : `${filtered.length}/${cameras.length}`} CAMERAS
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {led(C.green, 'led-slow')}
            <span style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>{liveCount} LIVE</span>
          </div>
          {offlineCount > 0 && (
            <span style={{ fontSize: 12, color: C.red, fontWeight: 700 }}>{offlineCount} OFFLINE</span>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: C.txt3, fontSize: 9, letterSpacing: '0.1em' }}>
            NO CAMERAS MATCH "{search.toUpperCase()}"
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6 }}>
            {filtered.map(cam => {
              const camEvents = recentEvents.filter(e => e.cameraId === cam.id || e.cameraName === cam.name)
              const lastPlate = camEvents[0]
              return (
                <div
                  key={cam.id}
                  onClick={() => setExpandedId(cam.id)}
                  style={{
                    cursor: 'pointer',
                    border: `1px solid ${cam.streaming ? C.green + '33' : C.border}`,
                    background: C.bg1,
                    display: 'flex', flexDirection: 'column',
                    transition: 'border-color 0.15s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = cam.streaming ? C.green + '88' : C.amber + '66')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = cam.streaming ? C.green + '33' : C.border)}
                >
                  <div style={{ flex: 1 }}>
                    <CameraFeed cam={cam} recentDetections={camEvents} C={C} />
                  </div>

                  <div style={{ padding: '4px 8px', background: C.bg2, borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: cam.streaming ? C.green : C.red, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.06em' }}>
                        {cam.name.toUpperCase()}
                      </span>
                    </div>
                    {lastPlate && (
                      <span style={{ fontSize: 7, color: C.amber, fontWeight: 700, letterSpacing: '0.06em', flexShrink: 0 }}>
                        {lastPlate.plateText}
                      </span>
                    )}
                    {camEvents.length > 0 && (
                      <span style={{ fontSize: 7, color: C.txt3, flexShrink: 0 }}>{camEvents.length}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
