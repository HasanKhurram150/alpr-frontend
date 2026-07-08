'use client'

import React from 'react'
import useSWR from 'swr'
import { Camera, Person } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function PersonFaceJourneyView({ personId, persons, cameras, C }: {
  personId: string
  persons: Person[]
  cameras: Camera[]
  C: Record<string, string>
}) {
  const person = persons.find(p => p.id === personId)
  const { data } = useSWR<any>(`/api/face-events?personId=${personId}&limit=100`, fetcher, { refreshInterval: 10000 })
  const sightings: any[] = data?.data ?? []

  const uniqueCams = [...new Set(sightings.map(s => s.cameraName).filter(Boolean))]
  const first = sightings[sightings.length - 1]
  const last = sightings[0]
  const durationLabel = (() => {
    if (!first || !last || first === last) return '—'
    const diff = Math.round((new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / 60000)
    return diff < 60 ? `${diff}m` : `${Math.round(diff / 60)}h ${diff % 60}m`
  })()

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Person identity header */}
      <div style={{ padding: '10px 12px', background: C.bg2, borderBottom: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', gap: 10, alignItems: 'center' }}>
        {person?.faceThumbnail ? (
          <img
            src={`data:image/jpeg;base64,${person.faceThumbnail}`}
            alt={person?.name}
            style={{ width: 52, height: 52, objectFit: 'cover', border: `2px solid ${C.blue}55`, flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: 52, height: 52, background: C.bg3, border: `2px solid ${C.blue}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 22, color: C.blue, fontWeight: 700 }}>{person?.name?.charAt(0).toUpperCase() ?? '?'}</span>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.txt, letterSpacing: '0.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {person?.name?.toUpperCase() ?? `PERSON ${personId.slice(-6).toUpperCase()}`}
          </div>
          {person?.notes && (
            <div style={{ fontSize: 9, color: C.txt3, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.notes}</div>
          )}
          {person?.plateNumbers && person.plateNumbers.length > 0 && (
            <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
              {person.plateNumbers.map(pl => (
                <span key={pl} style={{ fontSize: 8, fontWeight: 700, color: C.amber, background: 'rgba(232,160,0,0.1)', border: `1px solid ${C.amber}44`, padding: '1px 5px', letterSpacing: '0.08em' }}>{pl}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', background: C.bg2, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        {[
          { label: 'SIGHTINGS', val: sightings.length, color: C.amber },
          { label: 'CAMERAS', val: uniqueCams.length, color: C.blue },
          { label: 'SPAN', val: durationLabel, color: C.txt2 },
        ].map(s => (
          <div key={s.label} className="ops-stat-cell" style={{ padding: '7px 4px' }}>
            <div className="ops-stat-val" style={{ color: s.color, fontSize: 14 }}>{s.val}</div>
            <div className="ops-stat-label" style={{ fontSize: 8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Camera route */}
      {uniqueCams.length > 1 && (
        <div style={{ padding: '7px 12px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 7, color: C.txt3, letterSpacing: '0.12em', marginBottom: 5 }}>ROUTE ACROSS CAMERAS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {uniqueCams.map((cam, i) => (
              <span key={i} style={{ fontSize: 8, fontWeight: 700, color: C.blue, background: 'rgba(47,127,193,0.1)', border: `1px solid ${C.blue}33`, padding: '2px 7px' }}>
                {String(cam).toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sighting timeline */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 7, color: C.txt3, letterSpacing: '0.12em', padding: '6px 12px 4px' }}>FACE DETECTION TIMELINE</div>
        {sightings.length === 0 ? (
          <div style={{ padding: '20px 12px', textAlign: 'center', color: C.txt3, fontSize: 9 }}>
            {data === undefined ? 'LOADING…' : 'NO SIGHTINGS RECORDED'}
          </div>
        ) : sightings.map((s: any, i: number) => (
          <div key={s.id ?? i} style={{
            display: 'flex', alignItems: 'stretch',
            borderBottom: `1px solid ${C.border}`,
            borderLeft: `2px solid ${i === 0 ? C.green : C.border}`,
          }}>
            {s.thumbnailBase64 ? (
              <img
                src={`data:image/jpeg;base64,${s.thumbnailBase64}`}
                alt=""
                style={{ width: 58, objectFit: 'contain', flexShrink: 0, borderRight: `1px solid ${C.border}`, background: C.bg3 }}
              />
            ) : (
              <div style={{ width: 58, background: C.bg2, flexShrink: 0, borderRight: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.txt3} strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              </div>
            )}
            <div style={{ flex: 1, padding: '6px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: i === 0 ? C.txt : C.txt2, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {s.cameraName ?? 'MANUAL'}
                </span>
                {s.spoofDetected && <span style={{ fontSize: 7, color: C.red, fontWeight: 800, letterSpacing: '0.08em' }}>SPOOF</span>}
                <span style={{ fontSize: 9, color: s.confidence > 0.9 ? C.green : C.amber, flexShrink: 0, fontWeight: 700 }}>{Math.round(s.confidence * 100)}%</span>
              </div>
              <span style={{ fontSize: 9, color: C.txt3 }}>
                {new Date(s.timestamp).toLocaleTimeString('en-PK', { hour12: false })} · {new Date(s.timestamp).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
