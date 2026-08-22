import { useEffect, useState, type FormEvent } from 'react'
import { navigate } from '../../app/navigation'
import { isMockDataSource, journeyRepository } from '../../repositories'
import type { EventInput, Journey, TimelineItem, TransitRoute } from '../../types/journey'
import { formatTime, fromInputDateTime, groupTimeline, toInputDateTime } from '../../utils/date'
import styles from './JourneyPage.module.css'
import transitStyles from './TransitTimeline.module.css'
import panelStyles from './PanelLayout.module.css'

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

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button className={styles.brand} type="button" onClick={() => navigate('/')}>Journey Timeline</button>
        <div className={styles.titleArea}><span className={isEditing ? styles.editBadge : styles.viewBadge}>{isEditing ? '編集中' : '閲覧モード'}</span><strong>{journey.title}</strong></div>
        <div className={styles.headerActions}>
          {!isEditing && <button type="button" onClick={() => setAuthOpen(true)}>編集する</button>}
          <button type="button" onClick={share}>↗ 共有</button>
          <button type="button" onClick={() => navigate('/journeys/new')}>＋ 新しく作る</button>
        </div>
      </header>

      <div className={`${styles.workspace} ${!isEditing ? styles.viewWorkspace : ''} ${!editor ? (isEditing ? panelStyles.noDetailWorkspace : panelStyles.viewNoDetailWorkspace) : ''}`}>
        {isEditing && <aside className={styles.tools}><p className={styles.sectionLabel}>ADD TO PLAN</p><button type="button" onClick={() => setEditor({ type: 'event' })}><span>●</span> 予定を追加</button><button type="button" onClick={() => setEditor({ type: 'transit' })}><span>⇄</span> 移動を追加</button><div className={styles.toolBottom}><button type="button" onClick={() => setEditor({ type: 'journey' })}>旅程を編集</button><button className={styles.dangerText} type="button" onClick={deleteJourney}>旅程を削除</button></div></aside>}

        <section className={styles.timelinePane}>
          <div className={styles.paneHeading}><div><p className={styles.sectionLabel}>ITINERARY</p><h1><button className={panelStyles.journeyTitleButton} type="button" onClick={() => setEditor({ type: 'journey' })}>{journey.title}</button></h1></div><span>{journey.items.length} stops</span></div>
          {groups.length === 0 ? <div className={styles.emptyTimeline}><span>○</span><h2>まだ予定がありません</h2><p>旅の最初の目的地を追加しましょう。</p>{isEditing && <button type="button" onClick={() => setEditor({ type: 'event' })}>予定を追加する</button>}</div> : groups.map((group) => (
            <section className={styles.day} key={group.key}><h2>{group.label}</h2><div className={styles.timelineLine}>{group.items.map((item) => (
              <div className={styles.itemWrap} key={item.id}>
                <TimelineCard item={item} selected={selectedItem?.id === item.id} onClick={() => setEditor(isEditing ? { type: item.item_type, itemId: item.id } : { type: 'detail', itemId: item.id })} />
                {isEditing && <div className={styles.itemControls}><button type="button" aria-label="上へ移動" disabled={item.order_index === 0 || busy} onClick={async () => { setBusy(true); await journeyRepository.moveItem(journey.id, item.id, -1); await refresh(); setBusy(false) }}>↑</button><button type="button" aria-label="下へ移動" disabled={item.order_index === journey.items.length - 1 || busy} onClick={async () => { setBusy(true); await journeyRepository.moveItem(journey.id, item.id, 1); await refresh(); setBusy(false) }}>↓</button><button type="button" aria-label="この後に追加" onClick={() => setEditor({ type: 'event', index: item.order_index + 1 })}>＋</button></div>}
              </div>
            ))}</div></section>
          ))}
        </section>

        {editor && <aside className={styles.detailPane}>
          {editor.type === 'journey' && <JourneyEditor journey={journey} editable={isEditing} onClose={() => setEditor(null)} onSaved={(updated) => { setJourney(updated); showNotice('旅程名を保存しました') }} />}
          {editor?.type === 'event' && <EventEditor item={selectedItem?.item_type === 'event' ? selectedItem : undefined} onCancel={() => setEditor(null)} onSave={async (input) => { setBusy(true); if (editor.itemId) await journeyRepository.updateEvent(journey.id, editor.itemId, input); else await journeyRepository.createEvent(journey.id, input, editor.index); await refresh(); setEditor(null); setBusy(false); showNotice('予定を保存しました') }} onDelete={editor.itemId ? async () => { if (!window.confirm('この予定を削除しますか？')) return; await journeyRepository.deleteItem(journey.id, editor.itemId!); await refresh(); setEditor(null) } : undefined} busy={busy} />}
          {editor?.type === 'transit' && <TransitEditor item={selectedItem?.item_type === 'transit' ? selectedItem : undefined} onCancel={() => setEditor(null)} onSave={async (route, from, to) => { setBusy(true); if (editor.itemId) await journeyRepository.updateTransit(journey.id, editor.itemId, { route, departure_location: from, arrival_location: to }); else await journeyRepository.createTransit(journey.id, { route, departure_location: from, arrival_location: to }, editor.index); await refresh(); setEditor(null); setBusy(false); showNotice(editor.itemId ? '移動を更新しました' : '移動を追加しました') }} onDelete={editor.itemId ? async () => { if (!window.confirm('この移動を削除しますか？')) return; await journeyRepository.deleteItem(journey.id, editor.itemId!); await refresh(); setEditor(null) } : undefined} busy={busy} />}
          {editor?.type === 'detail' && selectedItem && <ItemDetail item={selectedItem} onClose={() => setEditor(null)} />}
        </aside>}
      </div>
      {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} onSuccess={() => { setAuthOpen(false); setIsEditing(true); showNotice('編集モードに切り替えました') }} />}
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
  if (item.item_type === 'event') return <button type="button" className={`${styles.timelineCard} ${styles.eventCard} ${selected ? styles.selected : ''}`} onClick={onClick}><time>{formatTime(item.start_time)}</time><span className={styles.cardIcon}>●</span><span className={styles.cardBody}><strong>{item.event.title}</strong><small>{item.event.duration_minutes ? `${item.event.duration_minutes}分` : '所要時間未定'}{item.event.address ? ` · ${item.event.address}` : ''}</small></span><span className={styles.chevron}>›</span></button>
  const route = item.transit.transit_data
  return (
    <button type="button" className={`${styles.timelineCard} ${styles.transitCard} ${transitStyles.expandedTransitCard} ${selected ? styles.selected : ''}`} onClick={onClick}>
      <time>{formatTime(item.start_time)}</time>
      <span className={styles.cardIcon}>⇄</span>
      <span className={styles.cardBody}>
        <strong>{item.transit.departure_location} → {item.transit.arrival_location}</strong>
        <small>{route.duration_minutes}分 · ¥{route.total_fare} · 乗換{route.transfers_count}回</small>
        <span className={transitStyles.transitLegs}>
          {route.legs.map((leg, index) => {
            const nextLeg = route.legs[index + 1]
            const waitMinutes = nextLeg ? Math.max(0, Math.round((new Date(nextLeg.departure_time).getTime() - new Date(leg.arrival_time).getTime()) / 60_000)) : 0
            return (
              <span className={transitStyles.transitLegGroup} key={`${leg.line_name}-${leg.from_station}-${index}`}>
                <span className={transitStyles.transitLeg}>
                  <span className={transitStyles.legTimes}>{formatTime(leg.departure_time)}<i />{formatTime(leg.arrival_time)}</span>
                  <span className={transitStyles.legRoute}><b>{leg.line_name}</b><span>{leg.from_station} → {leg.to_station}</span>{leg.platform && <small>{leg.platform}</small>}</span>
                </span>
                {nextLeg && <span className={transitStyles.transferRow}><b>乗換</b><span>{leg.to_station}で乗り換え</span><small>{waitMinutes}分</small></span>}
              </span>
            )
          })}
        </span>
      </span>
      <span className={styles.chevron}>›</span>
    </button>
  )
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
  const submit = (event: FormEvent) => { event.preventDefault(); onSave({ title: title.trim(), start_time: fromInputDateTime(start), end_time: fromInputDateTime(end), duration_minutes: duration ? Number(duration) : null, address: address.trim() || null, memo: memo.trim() || null }) }
  return <form className={styles.editor} onSubmit={submit}><div className={styles.editorTop}><div><p className={styles.sectionLabel}>EVENT</p><h2>{item ? '予定を編集' : '予定を追加'}</h2></div><button className={styles.close} type="button" onClick={onCancel}>×</button></div><label>予定名<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="行きたい場所、やりたいこと" required /></label><div className={styles.fieldRow}><label>開始<input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} /></label><label>終了<input type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} /></label></div><label>滞在時間（分）<input type="number" min="0" value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="60" /></label><label>住所<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="東京都…" /></label><label>メモ<textarea value={memo} onChange={(event) => setMemo(event.target.value)} rows={4} placeholder="予約情報や持ち物など" /></label><div className={styles.formActions}>{onDelete && <button className={styles.deleteButton} type="button" onClick={onDelete}>削除</button>}<button className={styles.saveButton} type="submit" disabled={busy || !title.trim()}>{busy ? '保存中…' : '保存する'}</button></div></form>
}

function TransitEditor({ item, onCancel, onSave, onDelete, busy }: { item?: Extract<TimelineItem, { item_type: 'transit' }>; onCancel: () => void; onSave: (route: TransitRoute, from: string, to: string) => void; onDelete?: () => void; busy: boolean }) {
  const [from, setFrom] = useState(item?.transit.departure_location ?? ''); const [to, setTo] = useState(item?.transit.arrival_location ?? ''); const [time, setTime] = useState(toInputDateTime(item?.start_time ?? null)); const [routes, setRoutes] = useState<TransitRoute[]>(item ? [item.transit.transit_data] : []); const [searching, setSearching] = useState(false)
  const search = async (event: FormEvent) => { event.preventDefault(); setSearching(true); setRoutes(await journeyRepository.searchTransit(from, to, time)); setSearching(false) }
  return <div className={styles.editor}><div className={styles.editorTop}><div><p className={styles.sectionLabel}>TRANSIT</p><h2>{item ? '移動を編集' : '移動を追加'}</h2></div><button className={styles.close} type="button" onClick={onCancel}>×</button></div><form onSubmit={search}><label>出発地<input autoFocus value={from} onChange={(event) => setFrom(event.target.value)} placeholder="新浦安駅" required /></label><label>到着地<input value={to} onChange={(event) => setTo(event.target.value)} placeholder="秋葉原駅" required /></label><label>出発日時<input type="datetime-local" value={time} onChange={(event) => setTime(event.target.value)} /></label><div className={styles.formActions}>{onDelete && <button className={styles.deleteButton} type="button" onClick={onDelete}>削除</button>}<button className={styles.searchButton} type="submit" disabled={searching || !from.trim() || !to.trim()}>{searching ? '検索中…' : '経路を再検索'}</button></div></form>{routes.length > 0 && <div className={styles.routes}><p className={styles.sectionLabel}>{item ? 'SELECT ROUTE TO SAVE' : 'ROUTE OPTIONS'}</p>{routes.map((route) => <button type="button" key={route.id} disabled={busy} onClick={() => onSave(route, from, to)}><span><strong>{route.summary}</strong><small>{formatTime(route.departure_time)} → {formatTime(route.arrival_time)}</small></span><span><strong>{route.duration_minutes}分</strong><small>¥{route.total_fare} · 乗換{route.transfers_count}回</small></span></button>)}</div>}</div>
}

function ItemDetail({ item, onClose }: { item: TimelineItem; onClose: () => void }) {
  return <div className={styles.editor}><div className={styles.editorTop}><p className={styles.sectionLabel}>DETAIL</p><button className={styles.close} type="button" onClick={onClose}>×</button></div>{item.item_type === 'event' ? <><div className={styles.detailIcon}>●</div><h2>{item.event.title}</h2><dl><dt>時間</dt><dd>{formatTime(item.start_time)} — {formatTime(item.end_time)}</dd><dt>住所</dt><dd>{item.event.address ?? '未設定'}</dd><dt>メモ</dt><dd>{item.event.memo ?? 'なし'}</dd></dl></> : <><div className={`${styles.detailIcon} ${styles.blue}`}>⇄</div><h2>{item.transit.departure_location}<br />→ {item.transit.arrival_location}</h2><div className={styles.routeSummary}><strong>{item.transit.transit_data.duration_minutes}分</strong><span>¥{item.transit.transit_data.total_fare}</span><span>乗換 {item.transit.transit_data.transfers_count}回</span></div></>}</div>
}

function AuthDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [password, setPassword] = useState(''); const [error, setError] = useState('')
  const submit = async (event: FormEvent) => { event.preventDefault(); try { const id = window.location.pathname.split('/').at(-1); if (!id) return; await journeyRepository.startEditSession(id, password); onSuccess() } catch (caught) { setError(caught instanceof Error ? caught.message : '認証に失敗しました。') } }
  return <div className={styles.backdrop} onMouseDown={onClose}><form className={styles.dialog} onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><p className={styles.sectionLabel}>EDIT JOURNEY</p><h2>編集パスワード</h2><p>この旅程を変更するにはパスワードを入力してください。</p><label>パスワード<input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className={styles.formError}>{error}</p>}<div className={styles.formActions}><button type="button" onClick={onClose}>キャンセル</button><button className={styles.saveButton} type="submit">編集を始める</button></div></form></div>
}
