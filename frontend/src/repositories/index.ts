import { apiJourneyRepository } from './apiJourneyRepository'
import { mockJourneyRepository } from './mockJourneyRepository'

export const isMockDataSource = import.meta.env.VITE_DATA_SOURCE !== 'api'
export const journeyRepository = isMockDataSource ? mockJourneyRepository : apiJourneyRepository
