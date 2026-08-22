import { getJourneyAccessToken, request, setJourneyAccessToken } from '../api/client'
import type { EventInput, Journey, JourneySummary, TimelineItem, TransitInput, TransitRoute } from '../types/journey'
import type { JourneyRepository } from './journeyRepository'

const itemPayload = (input: EventInput) => ({ item_type: 'event', start_time: input.start_time, end_time: input.end_time, event: { title: input.title, duration_minutes: input.duration_minutes, address: input.address, memo: input.memo } })
const transitPayload = (input: TransitInput) => ({ item_type: 'transit', start_time: input.route.departure_time, end_time: input.route.arrival_time, transit: { departure_location: input.departure_location, arrival_location: input.arrival_location, transit_data: input.route } })
type JourneyCreateResponse = Omit<Journey, 'items'> & { items?: TimelineItem[] }
type TokenResponse = { access_token: string; token_type: string }

const authHeaders = (journeyId: string): HeadersInit => {
  const token = getJourneyAccessToken(journeyId)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const verifyJourney = async (journeyId: string, password: string) => {
  const result = await request<TokenResponse>(`/journeys/${journeyId}/verify`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
  setJourneyAccessToken(journeyId, result.access_token)
}

export const apiJourneyRepository: JourneyRepository = {
  listJourneys: () => request<JourneySummary[]>('/journeys'),
  getJourney: (id) => request<Journey>(`/journeys/${id}`, { headers: authHeaders(id) }),
  createJourney: async (title, password) => {
    const created = await request<JourneyCreateResponse>('/journeys', { method: 'POST', body: JSON.stringify({ title, password }) })
    if (password) await verifyJourney(created.id, password)
    return { ...created, items: created.items ?? [] }
  },
  updateJourney: (id, title) => request<Journey>(`/journeys/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) }),
  deleteJourney: (id) => request<void>(`/journeys/${id}`, { method: 'DELETE' }),
  createEvent: (journeyId, input, index) => request<TimelineItem>(`/journeys/${journeyId}/items`, { method: 'POST', body: JSON.stringify({ ...itemPayload(input), order_index: index }) }),
  createTransit: (journeyId, input, index) => request<TimelineItem>(`/journeys/${journeyId}/items`, { method: 'POST', body: JSON.stringify({ ...transitPayload(input), order_index: index }) }),
  updateEvent: (_journeyId, itemId, input) => request<TimelineItem>(`/items/${itemId}`, { method: 'PUT', body: JSON.stringify(itemPayload(input)) }),
  updateTransit: (_journeyId, itemId, input) => request<TimelineItem>(`/items/${itemId}`, { method: 'PUT', body: JSON.stringify(transitPayload(input)) }),
  deleteItem: (_journeyId, itemId) => request<void>(`/items/${itemId}`, { method: 'DELETE' }),
  async moveItem(journeyId, itemId, direction) {
    const journey = await request<Journey>(`/journeys/${journeyId}`, { headers: authHeaders(journeyId) })
    const ids = journey.items.sort((a, b) => a.order_index - b.order_index).map((item) => item.id)
    const index = ids.indexOf(itemId); const target = index + direction
    if (index < 0 || target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    await request(`/journeys/${journeyId}/items/reorder`, { method: 'PATCH', body: JSON.stringify({ item_ids: ids }) })
  },
  searchTransit: (from, to, time) => {
    const params = new URLSearchParams({ from_location: from, to_location: to })
    if (time) params.set('time', new Date(time).toISOString())
    return request<{ routes: TransitRoute[] }>(`/transit/plan?${params}`).then((result) => result.routes)
  },
  startEditSession: (journeyId, password) => verifyJourney(journeyId, password),
  reset: async () => undefined,
}
