import { useEffect, useState, type FormEvent } from 'react'
import { navigate } from '../../app/navigation'
import { isMockDataSource, journeyRepository } from '../../repositories'
import type { EventInput, Journey, TimelineItem, TransitRoute } from '../../types/journey'
import { addMinutesToInputDateTime, formatTime, fromInputDateTime, getDiffMinutes, groupTimeline, subtractMinutesFromInputDateTime, toInputDateTime } from '../../utils/date'
import styles from './JourneyPage.module.css'
import panelStyles from './PanelLayout.module.css'
import timelineStyles from './TimelineLayout.module.css'
import transitStyles from './TransitTimeline.module.css'

type Editor = { type: 'journey' } | { type: 'event'; itemId?: string; index?: number } | { type: 'transit'; itemId?: string; index?: number } | { type: 'detail'; itemId: string } | null

export function JourneyPage({ journeyId }: { journeyId: string | null }) {
  const [journey, setJourney] = useState<Journey | null>(null)
  const [loading, setLoading] = useState(Boolean(journeyId))
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(!journeyId)
  const [authOpen, setAuthOpen] = useState(false)
  const [editor, setEditor] = useState<Editor>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!journeyId) return
    let active = true
    journeyRepository.getJourney(journeyId)
      .then((loaded) => { if (active) { setJourney(loaded); setError('') } })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : '読み込みに失敗しました。') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [journeyId])

  useEffect(() => {
    setEditor(null)
  }, [isEditing])

  const refresh = async () => {
    if (journey) setJourney(await journeyRepository.getJourney(journey.id))
  }

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2200)
  }

  if (!journeyId && !journey) return <CreateJourney onCreated={(created) => { setJourney(created); setIsEditing(true); navigate(`/journeys/${created.id}`, true) }} />
  if (loading) return <div className={styles.centerState}><span className={styles.spinner} />旅程を読み込んでいます</div>
  if (error || !journey) return <div className={styles.centerState}><h1>旅程を開けませんでした</h1><p>{error}</p><button type="button" onClick={() => navigate('/')}>ホームへ戻る</button></div>

  const selectedItem = editor && 'itemId' in editor ? journey.items.find((item) => item.id === editor.itemId) : undefined
  const groups = groupTimeline(journey.items)

  const deleteJourney = async () => {
    if (!window.confirm(`「${journey.title}」を削除しますか？`)) return
    setBusy(true); await journeyRepository.deleteJourney(journey.id); navigate('/?view=history')
  }

  const share = async () => {
    const url = `${window.location.origin}/journeys/${journey.id}`
    try { await navigator.clipboard.writeText(url); showNotice('共有URLをコピーしました') }
    catch { window.prompt('このURLをコピーしてください', url) }
  }

  const exportPdf = () => {
    const originalTitle = document.title
    document.title = `${journey.title} - 旅程タイムライン`
    window.print()
    document.title = originalTitle
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button className={styles.brand} type="button" onClick={() => navigate('/')}>Journey Timeline</button>
        <div className={styles.titleArea}><span className={isEditing ? styles.editBadge : styles.viewBadge} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', width: 68 }}>{isEditing ? '編集モード' : '閲覧モード'}</span><strong>{journey.title}</strong></div>
        <div className={styles.headerActions}>
          {!isEditing && <button type="button" onClick={() => setAuthOpen(true)}>編集する</button>}
          <button type="button" onClick={share}>↗ 共有</button>
          <button type="button" onClick={exportPdf} title="PDFとして保存・印刷">＋ 書き出し</button>
        </div>
      </header>

      <div className={styles.workspace}>
        {!isEditing && <aside className={styles.tools} aria-hidden="true" />}
        {isEditing && <aside className={`${styles.tools} ${timelineStyles.addTools}`}><p className={styles.sectionLabel}>ADD TO PLAN</p><button type="button" onClick={() => setEditor({ type: 'event' })}><span className={`${timelineStyles.toolIcon} ${timelineStyles.eventMarker}`}><EventPinIcon /></span>予定を追加</button><button type="button" onClick={() => setEditor({ type: 'transit' })}><span className={`${timelineStyles.toolIcon} ${timelineStyles.transitMarker}`}><TrainIcon /></span>移動を追加</button><div className={styles.toolBottom}><button type="button" onClick={() => { setEditor(null); setIsEditing(false) }}>編集を終了</button><button className={styles.dangerText} type="button" onClick={deleteJourney}>旅程を削除</button></div></aside>}

        <section className={styles.timelinePane}>
          <div className={styles.printHeader}>
            <span className={styles.printBrand}>Journey Timeline</span>
            <span className={styles.printDate}>{new Date().toLocaleDateString('ja-JP')} 出力</span>
          </div>
          <div className={styles.paneHeading}><div><p className={styles.sectionLabel}>ITINERARY</p><h1><button className={panelStyles.journeyTitleButton} type="button" onClick={() => setEditor({ type: 'journey' })}>{journey.title}</button></h1></div><span>{journey.items.length} stops</span></div>
          {groups.length === 0 ? <div className={styles.emptyTimeline}><span>○</span><h2>まだ予定がありません</h2><p>旅の最初の目的地を追加しましょう。</p>{isEditing && <button type="button" onClick={() => setEditor({ type: 'event' })}>予定を追加する</button>}</div> : groups.map((group) => (
            <section className={styles.day} key={group.key}><h2>{group.label}</h2><div className={`${styles.timelineLine} ${timelineStyles.timelineLine} ${isEditing ? timelineStyles.editingTimeline : timelineStyles.viewingTimeline}`}>{group.items.map((item) => (
              <div className={`${styles.itemWrap} ${timelineStyles.itemWrap}`} key={item.id}>
                <TimelineCard item={item} selected={selectedItem?.id === item.id} onClick={() => setEditor(isEditing ? { type: item.item_type, itemId: item.id } : { type: 'detail', itemId: item.id })} />
                {isEditing && <div className={styles.itemControls}><button type="button" aria-label="上へ移動" disabled={item.order_index === 0 || busy} onClick={async () => { setBusy(true); await journeyRepository.moveItem(journey.id, item.id, -1); await refresh(); setBusy(false) }}>↑</button><button type="button" aria-label="下へ移動" disabled={item.order_index === journey.items.length - 1 || busy} onClick={async () => { setBusy(true); await journeyRepository.moveItem(journey.id, item.id, 1); await refresh(); setBusy(false) }}>↓</button><button type="button" aria-label="この後に追加" onClick={() => setEditor({ type: 'event', index: item.order_index + 1 })}>＋</button></div>}
              </div>
            ))}</div></section>
          ))}
        </section>

        {editor && <aside className={styles.detailPane}>
          {editor.type === 'journey' && <JourneyEditor key={`journey-${journey.id}`} journey={journey} editable={isEditing} onClose={() => setEditor(null)} onSaved={(updated) => { setJourney(updated); showNotice('旅程名を保存しました') }} />}
          {editor?.type === 'event' && <EventEditor key={editor.itemId ? `event-${editor.itemId}` : `new-event-${editor.index ?? 'end'}`} item={selectedItem?.item_type === 'event' ? selectedItem : undefined} onCancel={() => setEditor(null)} onSave={async (input) => { setBusy(true); if (editor.itemId) await journeyRepository.updateEvent(journey.id, editor.itemId, input); else await journeyRepository.createEvent(journey.id, input, editor.index ?? journey.items.length); await refresh(); setEditor(null); setBusy(false); showNotice('予定を保存しました') }} onDelete={editor.itemId ? async () => { if (!window.confirm('この予定を削除しますか？')) return; await journeyRepository.deleteItem(journey.id, editor.itemId!); await refresh(); setEditor(null) } : undefined} busy={busy} />}
          {editor?.type === 'transit' && <TransitEditor key={editor.itemId ? `transit-${editor.itemId}` : `new-transit-${editor.index ?? 'end'}`} item={selectedItem?.item_type === 'transit' ? selectedItem : undefined} onCancel={() => setEditor(null)} onSave={async (route, from, to) => { setBusy(true); if (editor.itemId) await journeyRepository.updateTransit(journey.id, editor.itemId, { route, departure_location: from, arrival_location: to }); else await journeyRepository.createTransit(journey.id, { route, departure_location: from, arrival_location: to }, editor.index ?? journey.items.length); await refresh(); setEditor(null); setBusy(false); showNotice(editor.itemId ? '移動を更新しました' : '移動を追加しました') }} onDelete={editor.itemId ? async () => { if (!window.confirm('この移動を削除しますか？')) return; await journeyRepository.deleteItem(journey.id, editor.itemId!); await refresh(); setEditor(null) } : undefined} busy={busy} />}
          {editor?.type === 'detail' && selectedItem && <ItemDetail key={`detail-${selectedItem.id}`} item={selectedItem} onClose={() => setEditor(null)} />}
        </aside>}
      </div>
      {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} onSuccess={() => { setAuthOpen(false); setIsEditing(true); void refresh(); showNotice('編集モードに切り替えました') }} />}
      {notice && <div className={styles.toast} role="status">✓ {notice}</div>}
    </main>
  )
}

function CreateJourney({ onCreated }: { onCreated: (journey: Journey) => void }) {
  const [title, setTitle] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !password) return
    setBusy(true); setError('')
    try { onCreated(await journeyRepository.createJourney(title.trim(), password)) }
    catch (caught) { setError(caught instanceof Error ? caught.message : '旅程を作成できませんでした。') }
    finally { setBusy(false) }
  }
  return <main className={styles.createPage}><header className={styles.header}><button className={styles.brand} type="button" onClick={() => navigate('/')}>Journey Timeline</button></header><section className={styles.createCard}><p className={styles.sectionLabel}>NEW JOURNEY</p><h1>新しい旅を<br />はじめよう。</h1><p>タイトルを決めたら、予定と移動をタイムラインに並べていきます。</p><form onSubmit={submit}><label>旅程のタイトル<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例：東京1日観光プラン" required /></label><label>編集用パスワード<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isMockDataSource ? 'モックでは保存されません' : '編集時に必要です'} required /></label>{error && <p className={styles.formError} role="alert">{error}</p>}<button type="submit" disabled={busy || !title.trim() || !password}>{busy ? '作成しています…' : '旅程を作成する →'}</button></form><button className={styles.backLink} type="button" onClick={() => navigate('/')}>← ホームへ戻る</button></section></main>
}

function TimelineCard({ item, selected, onClick }: { item: TimelineItem; selected: boolean; onClick: () => void }) {
  if (item.item_type === 'event') return (
    <button type="button" className={`${styles.timelineCard} ${styles.eventCard} ${timelineStyles.referenceCard} ${selected ? styles.selected : ''}`} onClick={onClick}>
      <span className={timelineStyles.timelineRow}>
        <span className={timelineStyles.timeAndMarker}><time>{formatTime(item.start_time)}</time><span className={timelineStyles.eventMarker}><EventPinIcon /></span></span>
        <span className={timelineStyles.rowBody}><strong>{item.event.title}</strong><small>{item.event.address ?? '場所未設定'}</small></span>
      </span>
      <span className={timelineStyles.durationRow}><span /><i /><small>{item.event.duration_minutes ? `滞在 ${item.event.duration_minutes}分` : '所要時間未定'}</small></span>
      {item.end_time && <span className={timelineStyles.timelineRow}><span className={timelineStyles.timeAndMarker}><time>{formatTime(item.end_time)}</time><span className={timelineStyles.eventMarker}><EventPinIcon /></span></span><span className={timelineStyles.rowBody}><strong>{item.event.title}</strong><small>終了</small></span></span>}
    </button>
  )
  const route = item.transit.transit_data
  const firstLeg = route.legs[0]
  return (
    <button type="button" className={`${styles.timelineCard} ${styles.transitCard} ${timelineStyles.referenceCard} ${selected ? styles.selected : ''}`} onClick={onClick}>
      <span className={timelineStyles.timelineRow}>
        <span className={timelineStyles.timeAndMarker}><time>{formatTime(firstLeg?.departure_time ?? item.start_time)}</time><span className={timelineStyles.transitMarker}><TrainIcon /></span></span>
        <span className={timelineStyles.rowBody}><strong>{firstLeg?.from_station ?? item.transit.departure_location}</strong><small>{route.duration_minutes}分 · 乗換{route.transfers_count}回</small></span>
      </span>
      {route.legs.map((leg, index) => {
        const nextLeg = route.legs[index + 1]
        const waitMinutes = nextLeg ? Math.max(0, Math.round((new Date(nextLeg.departure_time).getTime() - new Date(leg.arrival_time).getTime()) / 60_000)) : 0
        return <span className={timelineStyles.legBlock} key={`${leg.line_name}-${leg.from_station}-${index}`}>
          <span className={timelineStyles.rideRow}><span /><i /><span><b>{formatTransitLineName(leg.line_name)}</b><small>{leg.from_station} → {leg.to_station}{leg.platform ? ` · ${leg.platform}` : ''}</small></span></span>
          <span className={timelineStyles.timelineRow}>
            <span className={timelineStyles.timeAndMarker}><time className={nextLeg ? timelineStyles.transferTimes : ''}><span>{formatTime(leg.arrival_time)}</span>{nextLeg && <span>{formatTime(nextLeg.departure_time)}</span>}</time><span className={timelineStyles.transitMarker}><TrainIcon /></span></span>
            <span className={timelineStyles.rowBody}><strong>{leg.to_station}{nextLeg ? 'で乗り換え' : ''}</strong><small>{nextLeg ? `乗換 ${waitMinutes}分` : '到着'}</small></span>
          </span>
        </span>
      })}
    </button>
  )
}

function EventPinIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 22s7-6.1 7-13a7 7 0 1 0-14 0c0 6.9 7 13 7 13Z" /><circle cx="12" cy="9" r="2.7" /></svg>
}

function TrainIcon() {
  return <svg aria-hidden="true" viewBox="0 0 28 24"><path d="M3.5 3.5h10.8c5.7 0 10.3 3.4 11.7 8.7.4 1.5-.7 3-2.3 3H3.5V3.5Z" /><path d="M9.5 4v7.5M15.5 4v7.5M3.5 11.5h22M3 20.5h22.5" /></svg>
}

function JourneyEditor({ journey, editable, onClose, onSaved }: { journey: Journey; editable: boolean; onClose: () => void; onSaved: (journey: Journey) => void }) {
  const [title, setTitle] = useState(journey.title)
  return <div className={styles.editor}><div className={styles.editorTop}><p className={styles.sectionLabel}>JOURNEY</p><button className={styles.close} type="button" onClick={onClose}>×</button></div><h2>{editable ? '旅程の設定' : '旅程について'}</h2><label>タイトル<input value={title} disabled={!editable} onChange={(event) => setTitle(event.target.value)} /></label>{editable && <button className={styles.saveButton} type="button" disabled={!title.trim() || title === journey.title} onClick={async () => onSaved(await journeyRepository.updateJourney(journey.id, title.trim()))}>変更を保存</button>}<div className={styles.editorNote}><span>⌁</span><p><strong>{isMockDataSource ? 'モックモード' : 'APIモード'}</strong><br />{isMockDataSource ? '変更内容はこのブラウザに保存されます。' : '変更内容はサーバーに保存されます。'}</p></div></div>
}

function EventEditor({ item, onCancel, onSave, onDelete, busy }: { item?: Extract<TimelineItem, { item_type: 'event' }>; onCancel: () => void; onSave: (input: EventInput) => void; onDelete?: () => void; busy: boolean }) {
  const [title, setTitle] = useState(item?.event.title ?? '')
  const [start, setStart] = useState(toInputDateTime(item?.start_time ?? null))
  const [end, setEnd] = useState(toInputDateTime(item?.end_time ?? null))
  const [duration, setDuration] = useState(item?.event.duration_minutes?.toString() ?? '')
  const [address, setAddress] = useState(item?.event.address ?? '')
  const [memo, setMemo] = useState(item?.event.memo ?? '')

  const handleStartChange = (newStart: string) => {
    setStart(newStart)
    if (newStart) {
      const dur = Number(duration)
      if (!Number.isNaN(dur) && dur > 0) {
        setEnd(addMinutesToInputDateTime(newStart, dur))
      } else if (end) {
        const diff = getDiffMinutes(newStart, end)
        if (diff !== null && diff >= 0) setDuration(diff.toString())
      }
    }
  }

  const handleEndChange = (newEnd: string) => {
    setEnd(newEnd)
    if (newEnd) {
      if (start) {
        const diff = getDiffMinutes(start, newEnd)
        if (diff !== null && diff >= 0) setDuration(diff.toString())
      } else {
        const dur = Number(duration)
        if (!Number.isNaN(dur) && dur > 0) {
          setStart(subtractMinutesFromInputDateTime(newEnd, dur))
        }
      }
    }
  }

  const handleDurationChange = (newDuration: string) => {
    setDuration(newDuration)
    const dur = Number(newDuration)
    if (!Number.isNaN(dur) && dur > 0) {
      if (start) {
        setEnd(addMinutesToInputDateTime(start, dur))
      } else if (end) {
        setStart(subtractMinutesFromInputDateTime(end, dur))
      }
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSave({
      title: title.trim(),
      start_time: fromInputDateTime(start),
      end_time: fromInputDateTime(end),
      duration_minutes: duration ? Number(duration) : null,
      address: address.trim() || null,
      memo: memo.trim() || null,
    })
  }

  return (
    <form className={styles.editor} onSubmit={submit}>
      <div className={styles.editorTop}>
        <div><p className={styles.sectionLabel}>EVENT</p><div className={timelineStyles.detailHeading}><span className={`${timelineStyles.detailHeadingIcon} ${timelineStyles.eventMarker}`}><EventPinIcon /></span><h2>{item ? '予定を編集' : '予定を追加'}</h2></div></div>
        <button className={styles.close} type="button" onClick={onCancel}>×</button>
      </div>
      <label>予定名<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="行きたい場所、やりたいこと" required /></label>
      <div className={styles.fieldRow}>
        <label>開始<input type="datetime-local" value={start} onChange={(event) => handleStartChange(event.target.value)} /></label>
        <label>終了<input type="datetime-local" value={end} onChange={(event) => handleEndChange(event.target.value)} /></label>
      </div>
      <label>滞在時間（分）<input type="number" min="0" value={duration} onChange={(event) => handleDurationChange(event.target.value)} placeholder="60" /></label>
      <label>住所<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="東京都…" /></label>
      <label>メモ<textarea value={memo} onChange={(event) => setMemo(event.target.value)} rows={4} placeholder="予約情報や持ち物など" /></label>
      <div className={styles.formActions}>
        {onDelete && <button className={styles.deleteButton} type="button" onClick={onDelete}>削除</button>}
        <button className={styles.saveButton} type="submit" disabled={busy || !title.trim()}>{busy ? '保存中…' : '保存する'}</button>
      </div>
    </form>
  )
}

function TransitEditor({ item, onCancel, onSave, onDelete, busy }: { item?: Extract<TimelineItem, { item_type: 'transit' }>; onCancel: () => void; onSave: (route: TransitRoute, from: string, to: string) => void; onDelete?: () => void; busy: boolean }) {
  const [from, setFrom] = useState(item?.transit.departure_location ?? '')
  const [to, setTo] = useState(item?.transit.arrival_location ?? '')
  const [searchType, setSearchType] = useState<'departure' | 'arrival'>('departure')
  const [time, setTime] = useState(toInputDateTime(item?.start_time ?? item?.end_time ?? null))
  const [routes, setRoutes] = useState<TransitRoute[]>(item ? [item.transit.transit_data] : [])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async (targetType?: 'departure' | 'arrival') => {
    const type = targetType ?? searchType
    if (!from.trim() || !to.trim()) return

    setSearchType(type)
    setSearching(true)
    setError('')
    try {
      const results = await journeyRepository.searchTransit(from.trim(), to.trim(), time, type)
      setRoutes(results)
      if (results.length === 0) {
        setError('該当する経路が見つかりませんでした。')
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '経路の検索に失敗しました。')
    } finally {
      setSearching(false)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void handleSearch()
  }

  return (
    <div className={styles.editor}>
      <div className={styles.editorTop}>
         <div><p className={styles.sectionLabel}>TRANSIT</p><div className={timelineStyles.detailHeading}><span className={`${timelineStyles.detailHeadingIcon} ${timelineStyles.transitMarker}`}><TrainIcon /></span><h2>{item ? '移動を編集' : '移動を追加'}</h2></div></div>
        <button className={styles.close} type="button" onClick={onCancel}>×</button>
      </div>
      <form onSubmit={submit}>
        <label>出発地<input autoFocus value={from} onChange={(event) => setFrom(event.target.value)} placeholder="新浦安駅" required /></label>
        <label>到着地<input value={to} onChange={(event) => setTo(event.target.value)} placeholder="秋葉原駅" required /></label>

        <div className={styles.dateTimeField}>
          <div className={styles.timeTypeRow}>
            <span className={styles.fieldLabel}>日時</span>
            <div className={styles.timeTypeTabs}>
              <button
                type="button"
                className={`${styles.timeTypeTab} ${searchType === 'departure' ? styles.timeTypeTabActive : ''}`}
                onClick={() => setSearchType('departure')}
              >
                出発
              </button>
              <button
                type="button"
                className={`${styles.timeTypeTab} ${searchType === 'arrival' ? styles.timeTypeTabActive : ''}`}
                onClick={() => setSearchType('arrival')}
              >
                到着
              </button>
            </div>
          </div>
          <div className={styles.timeInputWrap}>
            <input
              type="datetime-local"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
            <button
              type="button"
              className={styles.clearTimeButton}
              onClick={() => setTime('')}
              title="日時指定をクリア"
              disabled={!time}
            >
              クリア
            </button>
          </div>
        </div>

        {error && <p className={styles.formError} role="alert">{error}</p>}

        <div className={styles.formActions}>
          {onDelete && <button className={styles.deleteButton} type="button" onClick={onDelete}>削除</button>}
          <button className={styles.saveButton} type="submit" disabled={searching || !from.trim() || !to.trim()}>
            {searching ? '検索中…' : `${searchType === 'arrival' ? '到着日時' : '出発日時'}で経路を検索`}
          </button>
        </div>
      </form>

      {routes.length > 0 && (
        <div className={styles.routes}>
          <p className={styles.sectionLabel}>{item ? 'SELECT ROUTE TO SAVE' : 'ROUTE OPTIONS'}</p>
          {routes.map((route) => {
            const badges = getRouteBadges(route)
            return (
              <button
                className={transitStyles.routeOptionCard}
                type="button"
                key={route.id}
                disabled={busy}
                onClick={() => onSave(route, from, to)}
              >
                <div className={transitStyles.cardHeader}>
                  <div className={transitStyles.badgeRow}>
                    {badges.map((b, index) => (
                      <span key={index} className={`${transitStyles.strategyBadge} ${b.className}`}>
                        {b.label}
                      </span>
                    ))}
                  </div>
                  <span className={transitStyles.timeRange}>
                    {formatTime(route.departure_time)} → {formatTime(route.arrival_time)}
                  </span>
                </div>

                <div className={transitStyles.metricsRow}>
                  <div className={transitStyles.metricItem}>
                    <span className={transitStyles.metricLabel}>所要時間</span>
                    <strong className={transitStyles.metricValue}>{route.duration_minutes}分</strong>
                  </div>
                  <div className={transitStyles.metricItem}>
                    <span className={transitStyles.metricLabel}>乗換</span>
                    <strong className={transitStyles.metricValue}>
                      {route.transfers_count === 0 ? 'なし (直通)' : `${route.transfers_count}回`}
                    </strong>
                  </div>
                </div>

                <TransitLegDetails route={route} />
              </button>
            )
          })}
        </div>
      )}

      <div className={transitStyles.termsNotice}>
        <span>※ 経路情報は非公式データです。実際の運行状況は各交通事業者の公式情報をご確認ください。</span>
        <button type="button" onClick={() => navigate('/terms')} className={transitStyles.termsLink}>
          注意事項とデータ出典 →
        </button>
      </div>
    </div>
  )
}

function TransitLegDetails({ route }: { route: TransitRoute }) {
  return <span className={transitStyles.transitLegs}>{route.legs.map((leg, index) => {
    const nextLeg = route.legs[index + 1]
    const waitMinutes = nextLeg ? Math.max(0, Math.round((new Date(nextLeg.departure_time).getTime() - new Date(leg.arrival_time).getTime()) / 60_000)) : 0
    return <span className={transitStyles.transitLegGroup} key={`${leg.line_name}-${leg.from_station}-${index}`}><span className={transitStyles.transitLeg}><span className={transitStyles.legTimes}>{formatTime(leg.departure_time)}<i />{formatTime(leg.arrival_time)}</span><span className={transitStyles.legRoute}><b>{formatTransitLineName(leg.line_name)}</b><span>{leg.from_station} → {leg.to_station}</span>{leg.platform && <small>{leg.platform}</small>}</span></span>{nextLeg && waitMinutes > 0 && <span className={transitStyles.transferRow}><b>待ち時間</b><span>{leg.to_station}</span><small>{waitMinutes}分</small></span>}</span>
  })}</span>
}

const formatTransitLineName = (lineName: string) => lineName === 'walk' ? '徒歩' : lineName === 'transit' ? '電車' : lineName

function getRouteBadges(route: TransitRoute): { label: string; className: string }[] {
  const badges: { label: string; className: string }[] = []
  const tags = route.tags ?? []
  if (tags.includes('fastest') || route.summary.includes('最速')) {
    badges.push({ label: '⏱ 最速', className: transitStyles.fastest })
  }
  if (tags.includes('fewest_transfers') || route.summary.includes('乗換') || route.summary.includes('直通')) {
    badges.push({ label: '🔄 乗換最少', className: transitStyles.fewest_transfers })
  }
  if (badges.length === 0) {
    badges.push({ label: 'おすすめ', className: transitStyles.fastest })
  }
  return badges
}

function ItemDetail({ item, onClose }: { item: TimelineItem; onClose: () => void }) {
  return <div className={styles.editor}><div className={styles.editorTop}><p className={styles.sectionLabel}>DETAIL</p><button className={styles.close} type="button" onClick={onClose}>×</button></div>{item.item_type === 'event' ? <><div className={timelineStyles.detailHeading}><span className={`${timelineStyles.detailHeadingIcon} ${timelineStyles.eventMarker}`}><EventPinIcon /></span><h2>{item.event.title}</h2></div><dl><dt>時間</dt><dd>{formatTime(item.start_time)} — {formatTime(item.end_time)}</dd><dt>住所</dt><dd>{item.event.address ?? '未設定'}</dd><dt>メモ</dt><dd>{item.event.memo ?? 'なし'}</dd></dl></> : <><div className={timelineStyles.detailHeading}><span className={`${timelineStyles.detailHeadingIcon} ${timelineStyles.transitMarker}`}><TrainIcon /></span><h2>{item.transit.departure_location} → {item.transit.arrival_location}</h2></div><div className={styles.routeSummary}><strong>{item.transit.transit_data.duration_minutes}分</strong><span>乗換 {item.transit.transit_data.transfers_count}回</span></div></>}</div>
}

function AuthDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [password, setPassword] = useState(''); const [error, setError] = useState('')
  const submit = async (event: FormEvent) => { event.preventDefault(); try { const id = window.location.pathname.split('/').at(-1); if (!id) return; await journeyRepository.startEditSession(id, password); onSuccess() } catch (caught) { setError(caught instanceof Error ? caught.message : '認証に失敗しました。') } }
  return <div className={styles.backdrop} onMouseDown={onClose}><form className={styles.dialog} onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><p className={styles.sectionLabel}>EDIT JOURNEY</p><h2>編集パスワード</h2><p>この旅程を変更するにはパスワードを入力してください。</p><label>パスワード<input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className={styles.formError}>{error}</p>}<div className={styles.formActions}><button type="button" onClick={onClose}>キャンセル</button><button className={styles.saveButton} type="submit">編集を始める</button></div></form></div>
}
