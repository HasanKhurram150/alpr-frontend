'use client'

import React, { useState, useEffect } from 'react'
import { Camera, Alert, WatchlistEntry, DetectionEvent } from '@/types'

interface LocalDetection {
  plateText: string
  confidence: number
  thumbnailBase64: string | null
  timestamp: string
  boundingBox?: { x: number; y: number; width: number; height: number } | null
}

export function LiveTrackingPanel({ cam, allAlerts, watchlistData, recentEvents, C, onSelectPlate, onBack }: {
  cam: Camera
  allAlerts: Alert[]
  watchlistData: WatchlistEntry[]
  recentEvents: DetectionEvent[]
  C: Record<string, string>
  onSelectPlate: (plate: string) => void
  onBack: () => void
}) {
  const [localDetections, setLocalDetections] = useState<LocalDetection[]>([])
  const watchlistPlates = new Set(watchlistData.map(w => w.plateText))
  const alertPlates = new Set(allAlerts.filter(a => !a.acknowledged).map(a => a.plateText))

  useEffect(() => {
    const handler = (e: Event) => {
      const { cameraId, cameraName, plateText, confidence, thumbnailBase64, timestamp } = (e as CustomEvent).detail
      if (cameraId !== cam.id && cameraName !== cam.name) return
      setLocalDetections(prev => [{ plateText, confidence, thumbnailBase64, timestamp }, ...prev].slice(0, 100))
    }
    window.addEventListener('mits-detection', handler)
    return () => window.removeEventListener('mits-detection', handler)
  }, [cam.id, cam.name])

  const camBacklog = recentEvents
    .filter(e => e.cameraId === cam.id || e.cameraName === cam.name)
    .slice(0, 30)

  const displayDetections: Array<{ plateText: string; confidence: number; thumbnailBase64?: string | null; timestamp: string }> =
    localDetections.length > 0 ? localDetections : camBacklog

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: C.bg2, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.amber, cursor: 'pointer', fontSize: 9, fontWeight: 800, fontFamily: 'inherit', padding: 0, letterSpacing: '0.1em' }}>← BACK</button>
        <div style={{ width: 1, height: 14, background: C.border }} />
        <span style={{ fontSize: 10, color: C.txt, fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.05em' }}>{cam.name}</span>
        <span className={`ops-badge ${cam.streaming ? 'badge-live' : 'badge-offln'}`}>{cam.streaming ? 'LIVE' : 'OFFLN'}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 12px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: C.txt3, letterSpacing: '0.12em', flex: 1 }}>TRACKING FEED — CLICK PLATE FOR JOURNEY</span>
        <span style={{ fontSize: 12, color: C.amber, fontWeight: 700 }}>{displayDetections.length}</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {displayDetections.length === 0 ? (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: C.txt3, fontSize: 9, letterSpacing: '0.08em' }}>AWAITING DETECTIONS…</div>
        ) : displayDetections.map((det, i) => {
          const isAlert = alertPlates.has(det.plateText)
          const isWatch = watchlistPlates.has(det.plateText)
          const isFirst = i === 0

          return (
            <div
              key={i}
              style={{
                borderBottom: `1px solid ${C.border}`,
                borderLeft: `2px solid ${isAlert ? C.red : isWatch ? C.amber : 'transparent'}`,
                background: isFirst ? 'rgba(232,160,0,0.03)' : 'transparent',
                cursor: 'pointer',
                animation: isFirst ? 'row-flash 0.8s ease-out' : 'none',
                display: 'flex', alignItems: 'stretch',
              }}
              onClick={() => onSelectPlate(det.plateText)}
            >
              {det.thumbnailBase64 ? (
                <img
                  src={`data:image/jpeg;base64,${det.thumbnailBase64}`}
                  alt=""
                  style={{ width: 58, height: 42, objectFit: 'cover', flexShrink: 0, borderRight: `1px solid ${C.border}` }}
                />
              ) : (
                <div style={{ width: 58, height: 42, background: C.bg2, flexShrink: 0, borderRight: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 12, color: C.txt3, letterSpacing: '0.05em' }}>NO IMG</span>
                </div>
              )}
              <div style={{ flex: 1, padding: '5px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 800, lineHeight: 1,
                    color: isAlert ? C.red : isWatch ? C.amber : C.txt,
                    letterSpacing: '0.1em',
                  }}>{det.plateText}</span>
                  {isAlert && <span className="ops-badge badge-alert">ALERT</span>}
                  {!isAlert && isWatch && <span className="ops-badge badge-watch">WATCH</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: C.txt3 }}>
                    {new Date(det.timestamp).toLocaleTimeString('en-PK', { hour12: false })}
                  </span>
                  <span style={{ fontSize: 10, color: C.blue, marginLeft: 'auto', letterSpacing: '0.08em', fontWeight: 700 }}>JOURNEY →</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
