import { useEffect, useState } from 'react'
import { navigate } from '../../app/navigation'
import { isMockDataSource, journeyRepository } from '../../repositories'
import type { JourneySummary } from '../../types/journey'
import { formatShortDate, formatUpdated } from '../../utils/date'
import styles from './HomePage.module.css'

export function HomePage() {
  const [view, setView] = useState(() => new URLSearchParams(window.location.search).get('view') === 'history' ? 'history' : 'hero')
  const [journeys, setJourneys] = useState<JourneySummary[]>([])
  const [loading, setLoading] = useState(view === 'history')

  useEffect(() => {
    if (view !== 'history') return
    journeyRepository.listJourneys().then(setJourneys).finally(() => setLoading(false))
  }, [view])

  const changeView = (next: 'hero' | 'history') => {
    setView(next)
    window.history.replaceState({}, '', next === 'history' ? '/?view=history' : '/')
  }

  if (view === 'history') return (
    <main className={styles.historyPage}>
      <header className={styles.header}><button className={styles.wordmark} type="button" onClick={() => changeView('hero')}>Journey Timeline</button><button className={styles.primarySmall} type="button" onClick={() => navigate('/journeys/new')}>＋ 新しく作る</button></header>
      <section className={styles.historyContent}>
        <div className={styles.listHeading}><div><p className={styles.eyebrow}>PUBLIC JOURNEYS</p><h1>みんなの旅程</h1><p>次の旅行のヒントを、タイムラインから。</p></div><button className={styles.textButton} type="button" onClick={() => changeView('hero')}>← ホームへ戻る</button></div>
        {loading ? <div className={styles.loading}>旅程を読み込んでいます…</div> : <div className={styles.grid}>{journeys.map((journey, index) => (
          <article className={styles.card} key={journey.id}><button type="button" onClick={() => navigate(`/journeys/${journey.id}`)}><span className={styles.cardNumber}>{String(index + 1).padStart(2, '0')}</span><span className={styles.cardDates}>{formatShortDate(journey.start_date)} — {formatShortDate(journey.end_date)}</span><strong>{journey.title}</strong><span className={styles.cardMeta}>{journey.item_count} stops · 更新 {formatUpdated(journey.updated_at)}</span><span className={styles.cardArrow}>旅程を見る →</span></button></article>
        ))}</div>}
        {!loading && journeys.length === 0 && <div className={styles.empty}><h2>まだ旅程がありません</h2><button type="button" onClick={() => navigate('/journeys/new')}>最初の旅程を作る</button></div>}
        {isMockDataSource && <button className={styles.reset} type="button" onClick={async () => { await journeyRepository.reset(); setJourneys(await journeyRepository.listJourneys()) }}>モックデータを初期状態に戻す</button>}
      </section>
    </main>
  )

  return (
    <main className={styles.heroPage}>
      <header className={styles.header}>
        <span className={styles.wordmark}>Journey Timeline</span>
        <button className={styles.ghost} type="button" onClick={() => changeView('history')}>旅程を見る</button>
      </header>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>PLAN LESS. REMEMBER MORE.</p>
        <h1><span>旅行計画</span>を<br /><em>タイムライン</em>に。</h1>
        <p className={styles.lead}>予定と移動を、一本の線につなげよう。<br />迷わず動けて、誰とでもすぐ共有できます。</p>
        <div className={styles.actions}>
          <button className={styles.primary} type="button" onClick={() => navigate('/journeys/new')}>今すぐ作る <span>→</span></button>
          <button className={styles.secondary} type="button" onClick={() => changeView('history')}>これまでの旅程を見る</button>
        </div>
      </section>
      <div className={styles.sun} aria-hidden="true"><span>🧳</span></div>
      <footer className={styles.homeFooter}>
        {isMockDataSource ? (
          <p className={styles.demo}>FRONTEND MOCK · 編集パスワードは “demo”</p>
        ) : <span />}
        <button className={styles.footerLink} type="button" onClick={() => navigate('/terms')}>
          利用規約・データ出典
        </button>
      </footer>
    </main>
  )
}
