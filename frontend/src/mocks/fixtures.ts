import type { Journey, TransitRoute } from '../types/journey'

export const transitRoutes: TransitRoute[] = [
  {
    id: 'route-fast', summary: '最速ルート', departure_time: '2026-08-19T01:43:00.000Z', arrival_time: '2026-08-19T02:18:00.000Z', duration_minutes: 35, transfers_count: 1, total_fare: 520,
    legs: [
      { line_name: 'JR京葉線', platform: '2番線', from_station: '出発駅', to_station: '東京駅', departure_time: '2026-08-19T01:43:00.000Z', arrival_time: '2026-08-19T02:02:00.000Z' },
      { line_name: 'JR山手線', platform: '4番線', from_station: '東京駅', to_station: '到着駅', departure_time: '2026-08-19T02:07:00.000Z', arrival_time: '2026-08-19T02:18:00.000Z' },
    ],
  },
  {
    id: 'route-easy', summary: '乗換なし', departure_time: '2026-08-19T01:46:00.000Z', arrival_time: '2026-08-19T02:31:00.000Z', duration_minutes: 45, transfers_count: 0, total_fare: 410,
    legs: [{ line_name: '地下鉄直通線', platform: '1番線', from_station: '出発駅', to_station: '到着駅', departure_time: '2026-08-19T01:46:00.000Z', arrival_time: '2026-08-19T02:31:00.000Z' }],
  },
  {
    id: 'route-cheap', summary: '料金が安い', departure_time: '2026-08-19T01:50:00.000Z', arrival_time: '2026-08-19T02:44:00.000Z', duration_minutes: 54, transfers_count: 2, total_fare: 280,
    legs: [{ line_name: '都営線・各駅停車', platform: '3番線', from_station: '出発駅', to_station: '到着駅', departure_time: '2026-08-19T01:50:00.000Z', arrival_time: '2026-08-19T02:44:00.000Z' }],
  },
]

export const fixtureJourneys: Journey[] = [
  {
    id: 'tokyo-day-trip', title: '東京1日観光プラン', created_at: '2026-08-15T08:00:00.000Z', updated_at: '2026-08-19T12:30:00.000Z',
    items: [
      { id: 'tokyo-event-1', item_type: 'event', order_index: 0, start_time: '2026-08-19T00:00:00.000Z', end_time: '2026-08-19T00:08:00.000Z', event: { title: 'ホテル出発', duration_minutes: 8, address: '千葉県浦安市舞浜1-1', memo: '忘れ物がないかチェック' }, transit: null },
      { id: 'tokyo-transit-1', item_type: 'transit', order_index: 1, start_time: '2026-08-19T00:08:00.000Z', end_time: '2026-08-19T01:02:00.000Z', event: null, transit: { departure_location: '新浦安駅', arrival_location: '秋葉原駅', transit_data: { ...transitRoutes[2], id: 'tokyo-route', summary: '新浦安から秋葉原', departure_time: '2026-08-19T00:08:00.000Z', arrival_time: '2026-08-19T01:02:00.000Z', legs: [{ line_name: 'JR京葉線・山手線', platform: '2番線', from_station: '新浦安駅', to_station: '秋葉原駅', departure_time: '2026-08-19T00:08:00.000Z', arrival_time: '2026-08-19T01:02:00.000Z' }] } } },
      { id: 'tokyo-event-2', item_type: 'event', order_index: 2, start_time: '2026-08-19T02:00:00.000Z', end_time: '2026-08-19T03:00:00.000Z', event: { title: '国立科学博物館', duration_minutes: 60, address: '東京都台東区上野公園7-20', memo: '特別展を観覧' }, transit: null },
    ],
  },
  {
    id: 'kyoto-two-days', title: '京都、朝と夕暮れを歩く2日間', created_at: '2026-07-02T03:00:00.000Z', updated_at: '2026-08-18T09:15:00.000Z',
    items: [
      { id: 'kyoto-event-1', item_type: 'event', order_index: 0, start_time: '2026-09-12T00:30:00.000Z', end_time: '2026-09-12T02:00:00.000Z', event: { title: '清水寺', duration_minutes: 90, address: '京都市東山区清水1丁目294', memo: '朝のうちに参拝' }, transit: null },
      { id: 'kyoto-event-2', item_type: 'event', order_index: 1, start_time: '2026-09-13T06:00:00.000Z', end_time: '2026-09-13T08:00:00.000Z', event: { title: '嵐山を散策', duration_minutes: 120, address: '京都市右京区嵯峨', memo: '渡月橋から竹林へ' }, transit: null },
    ],
  },
  { id: 'empty-journey', title: 'まだ白紙の週末旅行', created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-10T06:00:00.000Z', items: [] },
  {
    id: 'untimed-journey', title: 'いつか行きたい場所メモ', created_at: '2026-06-01T00:00:00.000Z', updated_at: '2026-08-08T06:00:00.000Z',
    items: [{ id: 'untimed-event', item_type: 'event', order_index: 0, start_time: null, end_time: null, event: { title: '海辺の小さな美術館', duration_minutes: null, address: '住所はあとで調べる', memo: '晴れた日に行きたい' }, transit: null }],
  },
]
