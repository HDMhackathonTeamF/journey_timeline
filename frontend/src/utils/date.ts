import type { TimelineGroup, TimelineItem } from '../types/journey'

export const formatTime = (value: string | null) => value ? new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tokyo' }).format(new Date(value)) : '--:--'
export const formatDate = (value: string) => new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'Asia/Tokyo' }).format(new Date(value))
export const formatShortDate = (value: string | null) => value ? new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Tokyo' }).format(new Date(value)) : '日付未定'
export const formatUpdated = (value: string) => new Intl.DateTimeFormat('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }).format(new Date(value))
export const toInputDateTime = (value: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
export const fromInputDateTime = (value: string) => value ? new Date(value).toISOString() : null

export function addMinutesToInputDateTime(value: string, minutes: number): string {
  if (!value || Number.isNaN(minutes)) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const shifted = new Date(date.getTime() + minutes * 60_000)
  return toInputDateTime(shifted.toISOString())
}

export function subtractMinutesFromInputDateTime(value: string, minutes: number): string {
  return addMinutesToInputDateTime(value, -minutes)
}

export function getDiffMinutes(startValue: string, endValue: string): number | null {
  if (!startValue || !endValue) return null
  const startDate = new Date(startValue)
  const endDate = new Date(endValue)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null
  const diffMs = endDate.getTime() - startDate.getTime()
  if (diffMs < 0) return null
  return Math.round(diffMs / 60_000)
}


export function groupTimeline(items: TimelineItem[]): TimelineGroup[] {
  const dated = new Map<string, TimelineItem[]>()
  const untimed: TimelineItem[] = []
  items.slice().sort((a, b) => a.order_index - b.order_index).forEach((item) => {
    if (!item.start_time) { untimed.push(item); return }
    const key = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Tokyo' }).format(new Date(item.start_time))
    dated.set(key, [...(dated.get(key) ?? []), item])
  })
  const groups = [...dated.entries()].map(([key, groupItems], index) => ({ key, label: `Day ${index + 1} — ${formatDate(groupItems[0].start_time!)}`, items: groupItems }))
  if (untimed.length) groups.push({ key: 'untimed', label: '時刻未設定', items: untimed })
  return groups
}
