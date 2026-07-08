import { useState } from 'react'
import useSWR from 'swr'
import { useSSE } from '@/lib/useSSE'
import { Camera, Alert, WatchlistEntry, DetectionEvent, Person, Journey } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useAlertFeed(selectedPlate: string | null) {
  const { data: camerasData = [] }    = useSWR<Camera[]>('/api/cameras', fetcher, { refreshInterval: 5000 })
  const { data: alertsData = [] }     = useSWR<Alert[]>('/api/alerts?acknowledged=false', fetcher, { refreshInterval: 5000 })
  const { data: watchlistData = [] }  = useSWR<WatchlistEntry[]>('/api/watchlist?activeOnly=true', fetcher, { refreshInterval: 10000 })
  const { data: journeysData }        = useSWR<any>('/api/journeys?status=active&limit=20', fetcher, { refreshInterval: 15000 })
  const { data: eventsData }          = useSWR<any>('/api/events?limit=80', fetcher, { refreshInterval: 30000 })
  const { data: faceData }            = useSWR<any>('/api/face-events?limit=18', fetcher, { refreshInterval: 10000 })
  const { data: personsData = [] }   = useSWR<Person[]>('/api/persons', fetcher, { refreshInterval: 30000 })
  const { data: plateEventsData }    = useSWR<any>(
    selectedPlate ? `/api/events?plateText=${encodeURIComponent(selectedPlate)}&limit=50` : null,
    fetcher,
    { refreshInterval: 10000 },
  )

  const [liveEvents, setLiveEvents]     = useState<DetectionEvent[]>([])
  const [liveAlerts, setLiveAlerts]     = useState<Alert[]>([])
  const [liveFaceEvents, setLiveFaceEvents] = useState<any[]>([])

  useSSE<DetectionEvent>('/api/events/stream', ev => {
    setLiveEvents(p => [ev, ...p].slice(0, 100))
    if (ev.cameraId || ev.cameraName) {
      window.dispatchEvent(new CustomEvent('mits-detection', {
        detail: {
          cameraId: ev.cameraId ?? '',
          cameraName: ev.cameraName ?? '',
          plateText: ev.plateText,
          confidence: ev.confidence,
          thumbnailBase64: ev.thumbnailBase64 ?? null,
          timestamp: ev.timestamp,
          boundingBox: (ev.x != null && ev.width != null)
            ? { x: ev.x, y: ev.y, width: ev.width, height: ev.height }
            : null,
        },
      }))
    }
  })
  
  useSSE<Alert>('/api/alerts/stream', alert => {
    if (!alert.acknowledged) setLiveAlerts(p => [alert, ...p].slice(0, 50))
  })
  
  useSSE<any>('/api/face-events/stream', faceEv => {
    setLiveFaceEvents(p => [faceEv, ...p].slice(0, 30))
  })

  const allAlerts: Alert[] = [...liveAlerts, ...(Array.isArray(alertsData) ? alertsData : [])].filter((a, i, arr) => arr.findIndex(x => x.id === a.id) === i)
  const cameras: Camera[] = camerasData
  const journeys: Journey[] = journeysData?.data ?? []
  const recentEvents: DetectionEvent[] = liveEvents.length > 0 ? liveEvents : (eventsData?.data ?? [])

  const faceEvents: any[] = (() => {
    const polled: any[] = faceData?.data ?? []
    const merged = [...liveFaceEvents, ...polled]
    const seen = new Set<string>()
    return merged.filter(f => {
      if (!f.id || seen.has(f.id)) return false
      seen.add(f.id)
      return true
    }).slice(0, 30)
  })()

  return {
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
  }
}
