import type { EventInput, Journey, JourneySummary, TimelineItem, TransitInput, TransitRoute } from '../types/journey'

export interface JourneyRepository {
  listJourneys(): Promise<JourneySummary[]>
  getJourney(id: string): Promise<Journey>
  createJourney(title: string, password: string): Promise<Journey>
  updateJourney(id: string, title: string): Promise<Journey>
  deleteJourney(id: string): Promise<void>
  createEvent(journeyId: string, input: EventInput, index?: number): Promise<TimelineItem>
  createTransit(journeyId: string, input: TransitInput, index?: number): Promise<TimelineItem>
  updateEvent(journeyId: string, itemId: string, input: EventInput): Promise<TimelineItem>
  updateTransit(journeyId: string, itemId: string, input: TransitInput): Promise<TimelineItem>
  deleteItem(journeyId: string, itemId: string): Promise<void>
  moveItem(journeyId: string, itemId: string, direction: -1 | 1): Promise<void>
  searchTransit(from: string, to: string, time: string, timeType?: 'departure' | 'arrival'): Promise<TransitRoute[]>
  startEditSession(journeyId: string, password: string): Promise<void>
  reset(): Promise<void>
}
