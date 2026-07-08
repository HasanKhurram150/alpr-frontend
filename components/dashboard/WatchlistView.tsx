'use client'

import React, { useState } from 'react'
import { WatchlistEntry, Person, Alert } from '@/types'

export function WatchlistView({ watchlist, persons, alerts, C, onOpenJourney }: {
  watchlist: WatchlistEntry[]
  persons: Person[]
  alerts: Alert[]
  C: Record<string, string>
  onOpenJourney: (plate: string) => void
}) {
  const [tab, setTab] = useState<'PLATES' | 'PERSONS' | 'ALERTS'>('PLATES')
  const unacked = alerts.filter(a => !a.acknowledged)

  const watchlistPlates = new Set(watchlist.map(w => w.plateText))
  const personsOnWatchlist = persons.filter(p =>
    p.plateNumbers?.some(pl => watchlistPlates.has(pl))
  )
  const otherPersons = persons.filter(p =>
    !p.plateNumbers?.some(pl => watchlistPlates.has(pl))
  )

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', background: C.bg1, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        {([
          { key: 'PLATES',  label: `⬡ PLATES`,  count: watchlist.length },
          { key: 'PERSONS', label: `◎ PERSONS`, count: persons.length },
          { key: 'ALERTS',  label: `⚠ ALERTS`,  count: unacked.length },
        ] as const).map(({ key, label, count }) => (
          <button
            key={key}
            className={`ops-tab${tab === key ? ' active' : ''}`}
            style={{ flex: 1, padding: '7px 0', position: 'relative' }}
            onClick={() => setTab(key)}
          >
            {label}
            {count > 0 && (
              <span style={{
                marginLeft: 5, fontSize: 7, fontWeight: 800,
                color: key === 'ALERTS' ? C.red : C.amber,
                background: key === 'ALERTS' ? 'rgba(217,58,58,0.15)' : 'rgba(232,160,0,0.12)',
                border: `1px solid ${key === 'ALERTS' ? C.red + '44' : C.amber + '44'}`,
                padding: '0 5px',
              }}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'PLATES' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {watchlist.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: C.txt3, fontSize: 9, letterSpacing: '0.1em' }}>NO ACTIVE PLATE ENTRIES</div>
          ) : watchlist.map(w => {
            const hasAlert = unacked.some(a => a.plateText === w.plateText)
            return (
              <div key={w.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', borderBottom: `1px solid ${C.border}`,
                borderLeft: `3px solid ${hasAlert ? C.red : C.amber}`,
                background: hasAlert ? 'rgba(217,58,58,0.04)' : 'transparent',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: hasAlert ? C.red : C.amber, letterSpacing: '0.12em' }}>{w.plateText}</span>
                    {hasAlert && <span className="ops-badge badge-alert">ALERT</span>}
                    <span className="ops-badge" style={{ color: C.green, borderColor: C.green + '44', background: 'rgba(45,181,93,0.08)', fontSize: 7 }}>ACTIVE</span>
                  </div>
                  {w.reason && (
                    <span style={{ fontSize: 9, color: C.txt3, letterSpacing: '0.04em' }}>{w.reason}</span>
                  )}
                </div>
                <button
                  style={{ background: 'none', border: `1px solid ${C.blue}44`, color: C.blue, cursor: 'pointer', fontSize: 7, fontFamily: 'inherit', fontWeight: 700, padding: '3px 8px', letterSpacing: '0.08em' }}
                  onClick={() => onOpenJourney(w.plateText)}
                >JOURNEY →</button>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'PERSONS' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {persons.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: C.txt3, fontSize: 9, letterSpacing: '0.1em' }}>NO PERSONS ENROLLED</div>
          ) : (
            <>
              {personsOnWatchlist.length > 0 && (
                <>
                  <div style={{ fontSize: 12, color: C.red, letterSpacing: '0.14em', fontWeight: 700, padding: '6px 14px', background: 'rgba(217,58,58,0.06)', borderBottom: `1px solid ${C.border}` }}>
                    ⚠ WATCHLISTED PERSONS
                  </div>
                  {personsOnWatchlist.map(p => <PersonRow key={p.id} p={p} watchlistPlates={watchlistPlates} hasAlert={p.plateNumbers?.some(pl => unacked.some(a => a.plateText === pl)) ?? false} C={C} onOpenJourney={onOpenJourney} />)}
                </>
              )}
              {otherPersons.length > 0 && (
                <>
                  <div style={{ fontSize: 12, color: C.txt3, letterSpacing: '0.14em', fontWeight: 700, padding: '6px 14px', background: C.bg2, borderBottom: `1px solid ${C.border}` }}>
                    ENROLLED PERSONS
                  </div>
                  {otherPersons.map(p => <PersonRow key={p.id} p={p} watchlistPlates={watchlistPlates} hasAlert={false} C={C} onOpenJourney={onOpenJourney} />)}
                </>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'ALERTS' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {unacked.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: C.txt3, fontSize: 9, letterSpacing: '0.1em' }}>NO UNACKNOWLEDGED ALERTS</div>
          ) : unacked.map(a => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px', borderBottom: `1px solid ${C.border}`,
              borderLeft: `3px solid ${C.red}`,
            }}>
              {a.thumbnailBase64 && (
                <img src={`data:image/jpeg;base64,${a.thumbnailBase64}`} alt="" style={{ width: 52, height: 36, objectFit: 'cover', flexShrink: 0, border: `1px solid ${C.red}44` }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.red, letterSpacing: '0.12em' }}>{a.plateText}</span>
                  <span className="ops-badge badge-alert">UNACKED</span>
                </div>
                <span style={{ fontSize: 9, color: C.txt3 }}>{a.reason ?? '—'} · {new Date(a.timestamp).toLocaleTimeString('en-PK', { hour12: false })}</span>
              </div>
              <button
                style={{ background: 'none', border: `1px solid ${C.blue}44`, color: C.blue, cursor: 'pointer', fontSize: 7, fontFamily: 'inherit', fontWeight: 700, padding: '3px 8px', letterSpacing: '0.08em' }}
                onClick={() => onOpenJourney(a.plateText)}
              >JOURNEY →</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PersonRow({ p, watchlistPlates, hasAlert, C, onOpenJourney }: {
  p: Person
  watchlistPlates: Set<string>
  hasAlert: boolean
  C: Record<string, string>
  onOpenJourney: (plate: string) => void
}) {
  const flaggedPlates = (p.plateNumbers ?? []).filter(pl => watchlistPlates.has(pl))
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 16px', borderBottom: `1px solid ${C.border}`,
      borderLeft: `3px solid ${hasAlert ? C.red : flaggedPlates.length > 0 ? C.amber : C.blue}`,
      background: hasAlert ? 'rgba(217,58,58,0.04)' : 'transparent',
    }}>
      <div style={{ width: 44, height: 44, flexShrink: 0, border: `1px solid ${hasAlert ? C.red : C.blue}55`, overflow: 'hidden', position: 'relative' }}>
        {p.faceThumbnail ? (
          <img
            src={`data:image/jpeg;base64,${p.faceThumbnail}`}
            alt={p.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: C.bg3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 14, color: hasAlert ? C.red : C.blue, fontWeight: 700 }}>{p.name.charAt(0).toUpperCase()}</span>
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: hasAlert ? C.red : C.txt, letterSpacing: '0.06em' }}>{p.name.toUpperCase()}</span>
          {hasAlert && <span className="ops-badge badge-alert">ALERT</span>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {(p.plateNumbers ?? []).map(pl => (
            <span key={pl} style={{
              fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
              color: watchlistPlates.has(pl) ? C.red : C.txt3,
              background: watchlistPlates.has(pl) ? 'rgba(217,58,58,0.1)' : C.bg3,
              border: `1px solid ${watchlistPlates.has(pl) ? C.red + '44' : C.border}`,
              padding: '1px 5px',
              cursor: 'pointer',
            }}
            onClick={() => onOpenJourney(pl)}
            >{pl}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
