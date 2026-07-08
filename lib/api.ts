import {
  HealthStatus,
  DetectionResult,
  DetectionEvent,
  Person,
  WatchlistEntry,
  Alert,
  Camera,
  FaceEvent,
  VehicleStats,
  Journey
} from '@/types'

const BASE = '/api'

async function req<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || 'Request failed')
  }
  return res.json()
}

function json(body: unknown): RequestInit {
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

export const api = {
  health: () => req<HealthStatus>('/alpr/health'),

  detect: (formData: FormData, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params) : ''
    return req<DetectionResult>(`/alpr/detect${qs}`, { method: 'POST', body: formData })
  },

  detectUrl: (body: Record<string, unknown>) =>
    req<DetectionResult>('/alpr/detect-url', { method: 'POST', ...json(body) }),

  detectStream: (body: Record<string, unknown>) =>
    fetch(`${BASE}/alpr/detect-stream`, { method: 'POST', ...json(body) }),

  flushSession: (sessionId: string) =>
    fetch(`${BASE}/alpr/sessions/${sessionId}/flush`, { method: 'POST' }),

  // Events & Reporting
  getEvents: (params?: Record<string, string>) =>
    req<{ total: number; data: DetectionEvent[] }>(`/events?${new URLSearchParams(params ?? {})}`),
  getStats: (days = 7) => req<{ time: string; count: number }[]>(`/events/stats?days=${days}`),
  getTopPlates: (limit = 10) => req<{ plate: string; count: string }[]>(`/events/top-plates?limit=${limit}`),
  getTopPersons: (limit = 10) => req<{ name: string; id: string; count: string }[]>(`/events/top-persons?limit=${limit}`),
  getVehicleStats: (days = 30) => req<VehicleStats>(`/events/vehicle-stats?days=${days}`),
  getSourceBreakdown: (days = 7) => req<{ source: string; count: string }[]>(`/events/source-breakdown?days=${days}`),
  deleteEvent: (id: string) => fetch(`${BASE}/events/${id}`, { method: 'DELETE' }),

  // Persons
  getPersons: () => req<Person[]>('/persons'),
  getPerson:  (id: string) => req<Person & { visits: DetectionEvent[] }>(`/persons/${id}`),
  createPerson: (body: unknown) => req<Person>('/persons', { method: 'POST', ...json(body) }),
  updatePerson: (id: string, body: unknown) => req<Person>(`/persons/${id}`, { method: 'PUT', ...json(body) }),
  deletePerson: (id: string) => fetch(`${BASE}/persons/${id}`, { method: 'DELETE' }),
  enrollFace: (id: string, formData: FormData) => req<Person>(`/persons/${id}/enroll-face`, { method: 'POST', body: formData }),

  // Watchlist
  getWatchlist: (params?: Record<string, string>) =>
    req<WatchlistEntry[]>(`/watchlist?${new URLSearchParams(params ?? {})}`),
  createWatchlist: (body: unknown) => req<WatchlistEntry>('/watchlist', { method: 'POST', ...json(body) }),
  updateWatchlist: (id: string, body: unknown) =>
    req<WatchlistEntry>(`/watchlist/${id}`, { method: 'PATCH', ...json(body) }),
  deleteWatchlist: (id: string) => fetch(`${BASE}/watchlist/${id}`, { method: 'DELETE' }),

  // Alerts
  getAlerts: (params?: Record<string, string>) =>
    req<Alert[]>(`/alerts?${new URLSearchParams(params ?? {})}`),
  acknowledgeAlert: (id: string) =>
    req<Alert>(`/alerts/${id}/acknowledge`, { method: 'PATCH' }),
  deleteAlert: (id: string) => fetch(`${BASE}/alerts/${id}`, { method: 'DELETE' }),

  // Cameras
  getCameras: () => req<Camera[]>('/cameras'),
  getCamera: (id: string) => req<Camera>(`/cameras/${id}`),
  createCamera: (body: unknown) => req<Camera>('/cameras', { method: 'POST', ...json(body) }),
  updateCamera: (id: string, body: unknown) => req<Camera>(`/cameras/${id}`, { method: 'PATCH', ...json(body) }),
  deleteCamera: (id: string) => fetch(`${BASE}/cameras/${id}`, { method: 'DELETE' }),
  getTopCameras: (limit = 10, days = 7) => 
    req<{ camera: string; count: string }[]>(`/events/top-cameras?limit=${limit}&days=${days}`),

  // Face Events
  getFaceEvents: (params?: Record<string, string>) =>
    req<{ total: number; data: FaceEvent[] }>(`/face-events?${new URLSearchParams(params ?? {})}`),

  // Journeys
  getJourneys: (params?: Record<string, string>) =>
    req<{ data: Journey[]; total: number }>(`/journeys?${new URLSearchParams(params ?? {})}`),
}
