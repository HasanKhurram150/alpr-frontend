'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { Camera, Journey, JourneySighting } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function PlateJourneyView({ plateText, cameras, C, onBack }: {
  plateText: string
  cameras: Camera[]
  C: Record<string, string>
  onBack: () => void
}) {
  const { data, isLoading } = useSWR<{ data: Journey[]; total: number }>(
    `/api/journeys?plate=${encodeURIComponent(plateText)}&limit=10`,
    fetcher,
    { refreshInterval: 10000 },
  )
  const journeys: Journey[] = data?.data ?? []
  const [journeyIdx, setJourneyIdx] = useState(0)
  const journey = journeys[journeyIdx] ?? null
  const sightings: JourneySighting[] = [...(journey?.sightings ?? [])].sort(
    (a, b) => new Date(b.seenAt).getTime() - new Date(a.seenAt).getTime(),
  )
  const uniqueCams = [...new Set(sightings.map(s => s.cameraName).filter(Boolean))]
  const durationLabel = (() => {
    if (!journey) return '—'
    const diff = Math.round((new Date(journey.lastSeenAt).getTime() - new Date(journey.startedAt).getTime()) / 60000)
    return diff < 1 ? '<1m' : diff < 60 ? `${diff}m` : `${Math.round(diff / 60)}h`
  })()

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: C.bg2, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.amber, cursor: 'pointer', fontSize: 9, fontWeight: 800, fontFamily: 'inherit', padding: 0, letterSpacing: '0.1em' }}>← BACK</button>
        <div style={{ width: 1, height: 14, background: C.border }} />
        <span style={{ fontSize: 15, fontWeight: 800, color: C.amber, letterSpacing: '0.14em', flex: 1 }}>{plateText}</span>
        <span style={{ fontSize: 8, color: journey?.status === 'active' ? C.green : C.txt3, letterSpacing: '0.1em', fontWeight: 700 }}>
          {journey?.status === 'active' ? '● ACTIVE' : '○ CLOSED'}
        </span>
      </div>

      {/* Journey selector — when multiple journeys exist */}
      {journeys.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: C.bg2, borderBottom: `1px solid ${C.border}`, flexShrink: 0, overflowX: 'auto' }}>
          <span style={{ fontSize: 7, color: C.txt3, letterSpacing: '0.1em', flexShrink: 0 }}>TRIP</span>
          {journeys.map((j, i) => (
            <button key={j.id} onClick={() => setJourneyIdx(i)}
              style={{
                background: i === journeyIdx ? C.amber : 'none',
                border: `1px solid ${i === journeyIdx ? C.amber : C.border}`,
                color: i === journeyIdx ? C.bg1 : C.txt3,
                padding: '2px 8px', fontSize: 9, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', letterSpacing: '0.08em', flexShrink: 0,
              }}>
              {new Date(j.startedAt).toLocaleTimeString('en-PK', { hour12: false, hour: '2-digit', minute: '2-digit' })}
            </button>
          ))}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', background: C.bg2, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        {[
          { label: 'SIGHTINGS', val: sightings.length, color: C.amber },
          { label: 'CAMERAS',   val: uniqueCams.length, color: C.blue },
          { label: 'DURATION',  val: durationLabel, color: C.txt2 },
        ].map(s => (
          <div key={s.label} className="ops-stat-cell" style={{ padding: '8px 6px' }}>
            <div className="ops-stat-val" style={{ color: s.color, fontSize: 12 }}>{s.val}</div>
            <div className="ops-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Route */}
      {uniqueCams.length > 0 && (
        <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 7, color: C.txt3, letterSpacing: '0.12em', marginBottom: 6 }}>ROUTE</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {uniqueCams.map((cam, i) => (
              <span key={i} style={{
                fontSize: 12, fontWeight: 700, color: C.blue, letterSpacing: '0.06em',
                background: 'rgba(47,127,193,0.1)', border: `1px solid ${C.blue}33`,
                padding: '2px 7px',
              }}>{String(cam).toUpperCase()}</span>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 7, color: C.txt3, letterSpacing: '0.12em', padding: '6px 12px 4px' }}>TIMELINE — MOST RECENT FIRST</div>
        {isLoading || data === undefined ? (
          <div style={{ padding: '20px 12px', textAlign: 'center', color: C.txt3, fontSize: 9 }}>LOADING…</div>
        ) : journeys.length === 0 ? (
          <div style={{ padding: '20px 12px', textAlign: 'center', color: C.txt3, fontSize: 9 }}>NO JOURNEYS FOUND</div>
        ) : sightings.map((s, i) => (
          <div key={s.id ?? i} style={{
            display: 'flex', alignItems: 'stretch',
            borderBottom: `1px solid ${C.border}`,
            borderLeft: `2px solid ${i === 0 ? C.amber : C.border}`,
          }}>
            {s.thumbnailBase64 && (
              <img src={`data:image/jpeg;base64,${s.thumbnailBase64}`} alt=""
                style={{ width: 54, height: 38, objectFit: 'cover', flexShrink: 0, borderRight: `1px solid ${C.border}` }} />
            )}
            <div style={{ flex: 1, padding: '5px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: i === 0 ? C.txt : C.txt2, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {s.cameraName ?? s.zone ?? '—'}
                </span>
                <span style={{ fontSize: 12, color: C.txt3, flexShrink: 0 }}>{Math.round(s.confidence * 100)}%</span>
              </div>
              <span style={{ fontSize: 12, color: C.txt3 }}>
                {new Date(s.seenAt).toLocaleTimeString('en-PK', { hour12: false })}
                {' · '}
                {new Date(s.seenAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
