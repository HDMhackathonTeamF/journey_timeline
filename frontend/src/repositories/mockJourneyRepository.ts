import { fixtureJourneys, transitRoutes } from '../mocks/fixtures'
import type { JourneyRepository } from './journeyRepository'
import type { Journey, TimelineItem } from '../types/journey'

const STORAGE_KEY = 'journey-timeline:mock-db:v1'
const wait = () => new Promise((resolve) => window.setTimeout(resolve, 180))
const clone = <T,>(value: T): T => structuredClone(value)

function load(): Journey[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return clone(fixtureJourneys)
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : clone(fixtureJourneys)
  } catch {
    return clone(fixtureJourneys)
  }
}

function save(journeys: Journey[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(journeys))
}

function findJourney(journeys: Journey[], id: string) {
  const journey = journeys.find((entry) => entry.id === id)
  if (!journey) throw new Error('旅程が見つかりませんでした。')
  return journey
}

function normalize(journey: Journey) {
  journey.items.sort((a, b) => a.order_index - b.order_index)
  journey.items.forEach((item, index) => { item.order_index = index })
  journey.updated_at = new Date().toISOString()
}

export const mockJourneyRepository: JourneyRepository = {
  async listJourneys() {
    await wait()
    return load().sort((a, b) => b.updated_at.localeCompare(a.updated_at)).map((journey) => {
      const dates = journey.items.map((item) => item.start_time).filter((value): value is string => Boolean(value)).sort()
      return { id: journey.id, title: journey.title, start_date: dates.at(0) ?? null, end_date: dates.at(-1) ?? null, updated_at: journey.updated_at, item_count: journey.items.length }
    })
  },
  async getJourney(id) { await wait(); return clone(findJourney(load(), id)) },
  async createJourney(title) {
    await wait()
    const journeys = load()
    const now = new Date().toISOString()
    const journey = { id: crypto.randomUUID(), title, created_at: now, updated_at: now, items: [] }
    journeys.unshift(journey); save(journeys); return clone(journey)
  },
  async updateJourney(id, title) {
    await wait(); const journeys = load(); const journey = findJourney(journeys, id); journey.title = title; normalize(journey); save(journeys); return clone(journey)
  },
  async deleteJourney(id) { await wait(); save(load().filter((journey) => journey.id !== id)) },
  async createEvent(journeyId, input, index) {
    await wait(); const journeys = load(); const journey = findJourney(journeys, journeyId)
    const item: TimelineItem = { id: crypto.randomUUID(), item_type: 'event', order_index: index ?? journey.items.length, start_time: input.start_time, end_time: input.end_time, event: { title: input.title, duration_minutes: input.duration_minutes, address: input.address, memo: input.memo }, transit: null }
    journey.items.splice(index ?? journey.items.length, 0, item); normalize(journey); save(journeys); return clone(item)
  },
  async createTransit(journeyId, input, index) {
    await wait(); const journeys = load(); const journey = findJourney(journeys, journeyId)
    const item: TimelineItem = { id: crypto.randomUUID(), item_type: 'transit', order_index: index ?? journey.items.length, start_time: input.route.departure_time, end_time: input.route.arrival_time, event: null, transit: { departure_location: input.departure_location, arrival_location: input.arrival_location, transit_data: input.route } }
    journey.items.splice(index ?? journey.items.length, 0, item); normalize(journey); save(journeys); return clone(item)
  },
  async updateEvent(journeyId, itemId, input) {
    await wait(); const journeys = load(); const journey = findJourney(journeys, journeyId); const item = journey.items.find((entry) => entry.id === itemId)
    if (!item || item.item_type !== 'event') throw new Error('予定が見つかりませんでした。')
    item.start_time = input.start_time; item.end_time = input.end_time; item.event = { title: input.title, duration_minutes: input.duration_minutes, address: input.address, memo: input.memo }; normalize(journey); save(journeys); return clone(item)
  },
  async deleteItem(journeyId, itemId) { await wait(); const journeys = load(); const journey = findJourney(journeys, journeyId); journey.items = journey.items.filter((item) => item.id !== itemId); normalize(journey); save(journeys) },
  async moveItem(journeyId, itemId, direction) {
    await wait(); const journeys = load(); const journey = findJourney(journeys, journeyId); const index = journey.items.findIndex((item) => item.id === itemId); const target = index + direction
    if (index >= 0 && target >= 0 && target < journey.items.length) [journey.items[index], journey.items[target]] = [journey.items[target], journey.items[index]]
    normalize(journey); save(journeys)
  },
  async searchTransit(from, to, time) {
    await wait(); const base = time ? new Date(time) : new Date(); if (Number.isNaN(base.getTime())) base.setTime(Date.now())
    return clone(transitRoutes.map((route, routeIndex) => {
      const departure = new Date(base.getTime() + routeIndex * 7 * 60_000)
      const arrival = new Date(departure.getTime() + route.duration_minutes * 60_000)
      return { ...route, departure_time: departure.toISOString(), arrival_time: arrival.toISOString(), legs: route.legs.map((leg) => ({ ...leg, from_station: from, to_station: to, departure_time: departure.toISOString(), arrival_time: arrival.toISOString() })) }
    }))
  },
  async reset() { await wait(); localStorage.removeItem(STORAGE_KEY) },
}

export const journeyRepository = mockJourneyRepository
