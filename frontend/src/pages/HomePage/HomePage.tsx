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
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (view !== 'history') return
    let active = true
    setLoading(true)
    const timer = setTimeout(() => {
      journeyRepository.listJourneys(searchQuery)
        .then((res) => { if (active) setJourneys(res) })
        .finally(() => { if (active) setLoading(false) })
    }, 200)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [view, searchQuery])

  const changeView = (next: 'hero' | 'history') => {
    setView(next)
    window.history.replaceState({}, '', next === 'history' ? '/?view=history' : '/')
  }

  if (view === 'history') return (
    <main className={styles.historyPage}>
      <header className={styles.header}>
        <button className={styles.wordmark} type="button" onClick={() => changeView('hero')}>
          Journey Timeline
        </button>
        <button className={styles.primarySmall} type="button" onClick={() => navigate('/journeys/new')}>
          ＋ 新しく作る
        </button>
      </header>
      <section className={styles.historyContent}>
        <div className={styles.listHeading}>
          <div>
            <p className={styles.eyebrow}>PUBLIC JOURNEYS</p>
            <h1>みんなの旅程</h1>
            <p>次の旅行のヒントを、タイムラインから。</p>
          </div>
          <button className={styles.textButton} type="button" onClick={() => changeView('hero')}>
            ← ホームへ戻る
          </button>
        </div>

        <div className={styles.searchContainer}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon} aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="旅程のタイトルで検索"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {searchQuery && (
              <button
                className={styles.searchClearButton}
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="検索条件をクリア"
              >
                ✕
              </button>
            )}
          </div>
          {searchQuery && (
            <p className={styles.searchSummary}>
              「<strong>{searchQuery}</strong>」の検索結果: {journeys.length}件
            </p>
          )}
        </div>

        {loading ? (
          <div className={styles.loading}>旅程を読み込んでいます…</div>
        ) : (
          <div className={styles.grid}>
            {journeys.map((journey, index) => (
              <article className={styles.card} key={journey.id}>
                <button type="button" onClick={() => navigate(`/journeys/${journey.id}`)}>
                  <span className={styles.cardNumber}>{String(index + 1).padStart(2, '0')}</span>
                  <span className={styles.cardDates}>
                    {formatShortDate(journey.start_date)} — {formatShortDate(journey.end_date)}
                  </span>
                  <strong style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 17px', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {journey.title}
                    </span>
                    <span
                      title={journey.is_protected ? '編集パスワードあり' : undefined}
                      aria-label={journey.is_protected ? '編集パスワードあり' : undefined}
                      aria-hidden={!journey.is_protected}
                      style={{ display: 'inline-flex', width: 17, color: 'var(--ink)', visibility: journey.is_protected ? 'visible' : 'hidden' }}
                    >
                      <LockIcon />
                    </span>
                  </strong>
                  <span className={styles.cardMeta}>
                    {journey.item_count ?? 0}件 · 更新 {formatUpdated(journey.updated_at)}
                  </span>
                  <span className={styles.cardArrow}>旅程を見る →</span>
                </button>
              </article>
            ))}
          </div>
        )}

        {!loading && journeys.length === 0 && (
          <div className={styles.empty}>
            <h2>{searchQuery ? '一致する旅程が見つかりませんでした' : 'まだ旅程がありません'}</h2>
            {searchQuery ? (
              <button type="button" onClick={() => setSearchQuery('')}>
                検索条件をクリア
              </button>
            ) : (
              <button type="button" onClick={() => navigate('/journeys/new')}>
                最初の旅程を作る
              </button>
            )}
          </div>
        )}

        {isMockDataSource && (
          <button
            className={styles.reset}
            type="button"
            onClick={async () => {
              await journeyRepository.reset()
              setJourneys(await journeyRepository.listJourneys())
            }}
          >
            モックデータを初期状態に戻す
          </button>
        )}
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
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>YOUR JOURNEY, IN ONE LINE.</p>
          <h1>旅行計画<small>を</small><br /><em>タイムライン</em><small>に。</small></h1>
          <div className={styles.actions}>
            <button className={styles.primary} type="button" onClick={() => navigate('/journeys/new')}>旅程を作る <span>→</span></button>
            <button className={styles.secondary} type="button" onClick={() => changeView('history')}>みんなの旅程を見る</button>
          </div>
        </div>
      </section>
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

function LockIcon() {
  return <svg aria-hidden="true" viewBox="0 0 18 18" width="17" height="17"><path fill="currentColor" d="M5 7V5a4 4 0 0 1 8 0v2h.5A1.5 1.5 0 0 1 15 8.5v7a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 3 15.5v-7A1.5 1.5 0 0 1 4.5 7H5Zm2 0h4V5a2 2 0 1 0-4 0v2Z" /><circle cx="9" cy="11" r="1.15" fill="var(--surface)" /><path d="M9 12v2" stroke="var(--surface)" strokeWidth="1.5" strokeLinecap="round" /></svg>
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="15" height="15" fill="none">
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 10l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
