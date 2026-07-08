'use client'

import React from 'react'
import { Alert, DetectionEvent } from '@/types'

export function IncidentsView({ alerts, events, C }: { alerts: Alert[]; events: DetectionEvent[]; C: Record<string, string> }) {
  const unacked = alerts.filter(a => !a.acknowledged)
  const recentWithAlerts = events.filter(e => alerts.some(a => a.plateText === e.plateText))

  if (unacked.length === 0 && recentWithAlerts.length === 0) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 28, opacity: 0.3 }}>✓</span>
        <div style={{ fontSize: 9, color: C.green, letterSpacing: '0.1em', fontWeight: 700 }}>ALL CLEAR — NO ACTIVE INCIDENTS</div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', padding: 8 }}>
      {unacked.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: C.red, fontWeight: 700, letterSpacing: '0.12em', padding: '4px 0', borderBottom: `1px solid ${C.border}`, marginBottom: 6 }}>
            ⚠ ACTIVE ALERTS ({unacked.length})
          </div>
          {unacked.map(a => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px',
              borderBottom: `1px solid ${C.border}`, borderLeft: `2px solid ${C.red}`,
              background: 'rgba(217,58,58,0.05)', marginBottom: 3,
            }}>
              {a.thumbnailBase64 && (
                <img src={`data:image/jpeg;base64,${a.thumbnailBase64}`} alt="" style={{ width: 48, height: 32, objectFit: 'cover', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: C.red, fontWeight: 700, letterSpacing: '0.1em' }}>{a.plateText}</div>
                {a.reason && <div style={{ fontSize: 12, color: C.txt3, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.reason}</div>}
              </div>
              <span style={{ fontSize: 12, color: C.txt3, flexShrink: 0 }}>{new Date(a.timestamp).toLocaleTimeString('en-PK', { hour12: false })}</span>
            </div>
          ))}
        </div>
      )}

      {recentWithAlerts.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: C.amber, fontWeight: 700, letterSpacing: '0.12em', padding: '4px 0', borderBottom: `1px solid ${C.border}`, marginBottom: 6 }}>
            RELATED SIGHTINGS ({recentWithAlerts.length})
          </div>
          {recentWithAlerts.slice(0, 20).map((e, i) => (
            <div key={e.id ?? i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '5px 8px',
              borderBottom: `1px solid ${C.border}`, borderLeft: `2px solid ${C.amber}`,
            }}>
              <span style={{ fontSize: 10, color: C.amber, fontWeight: 700, letterSpacing: '0.1em', flex: 1 }}>{e.plateText}</span>
              <span style={{ fontSize: 12, color: C.txt2 }}>{e.cameraName ?? e.source?.toUpperCase() ?? '—'}</span>
              <span style={{ fontSize: 12, color: C.txt3 }}>{Math.round(e.confidence * 100)}%</span>
              <span style={{ fontSize: 12, color: C.txt3 }}>{new Date(e.timestamp).toLocaleTimeString('en-PK', { hour12: false })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
