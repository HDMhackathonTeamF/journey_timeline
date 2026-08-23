export type TransitLeg = {
  line_name: string
  platform: string | null
  from_station: string
  to_station: string
  departure_time: string
  arrival_time: string
}

export type TransitRoute = {
  id: string
  summary: string
  departure_time: string
  arrival_time: string
  duration_minutes: number
  transfers_count: number
  total_fare: number
  legs: TransitLeg[]
}

type TimelineItemBase = {
  id: string
  order_index: number
  start_time: string | null
  end_time: string | null
}

export type EventItem = TimelineItemBase & {
  item_type: 'event'
  event: {
    title: string
    duration_minutes: number | null
    address: string | null
    memo: string | null
  }
  transit: null
}

export type TransitItem = TimelineItemBase & {
  item_type: 'transit'
  event: null
  transit: {
    departure_location: string
    arrival_location: string
    transit_data: TransitRoute
  }
}

export type TimelineItem = EventItem | TransitItem

export type Journey = {
  id: string
  title: string
  created_at: string
  updated_at: string
  is_protected?: boolean
  items: TimelineItem[]
}

export type JourneySummary = {
  id: string
  title: string
  is_protected?: boolean
  start_date: string | null
  end_date: string | null
  updated_at: string
  item_count: number
}

export type EventInput = {
  title: string
  start_time: string | null
  end_time: string | null
  duration_minutes: number | null
  address: string | null
  memo: string | null
}

export type TransitInput = {
  route: TransitRoute
  departure_location: string
  arrival_location: string
}

export type TimelineGroup = {
  key: string
  label: string
  items: TimelineItem[]
}
