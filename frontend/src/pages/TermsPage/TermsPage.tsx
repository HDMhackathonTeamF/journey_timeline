import { navigate } from '../../app/navigation'
import styles from './TermsPage.module.css'

export function TermsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button className={styles.brand} type="button" onClick={() => navigate('/')}>
          Journey Timeline
        </button>
      </header>

      <article className={styles.content}>
        <p className={styles.eyebrow}>TERMS & DATA ATTRIBUTION</p>
        <h1 className={styles.title}>利用規約・交通データに関する注意事項</h1>
        <p className={styles.lead}>
          Journey Timeline（以下「本サービス」）をご利用いただくにあたっての条件、交通データの取り扱い、および免責事項を説明するものです。
        </p>

        <div className={styles.noticeBox} role="alert">
          <strong>⚠️ 交通データの利用に関する重要なお知らせ</strong>
          <p>
            本サービスおよび連携する経路探索APIは、<strong>各交通事業者の公式サービスではありません</strong>。
            実際の乗車・旅行・業務利用などの重要な判断にあたっては、<strong>必ず各交通事業者の公式運行情報や発車標等をご確認ください</strong>。
          </p>
        </div>

        <section className={styles.section}>
          <h2>1. 本サービスについて</h2>
          <p>
            本サービスは、旅行の「予定」と「移動」をタイムライン形式で直感的に可視化・共有するための非営利・独立したWebアプリケーションです。
            鉄道・バス・航空等の各運行会社や交通事業者とは一切関係ありません。
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. 経路・時刻・運行情報の正確性と免責事項</h2>
          <p>
            本サービス上で提供・計算される経路、時刻表、所要時間、乗換案内等の情報について、当方はその<strong>正確性、完全性、最新性、有用性、特定目的への適合性を一切保証いたしません</strong>。
          </p>
          <ul>
            <li>臨時ダイヤ、列車の運休・遅延、工事、交通規制、ダイヤ改正等により、実際の運行状況と異なる場合があります。</li>
            <li>探索結果は機械的に算出した候補ルートであり、最短・最適・確実な乗車・乗換を保証するものではありません。</li>
            <li>表示された経路に従って移動するかどうかは、利用者ご自身の判断と責任で行ってください。</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. 交通データの出典とライセンス</h2>
          <p>
            本サービスの移動経路探索機能は、公開オープンデータおよび外部の経路探索基盤を活用しています。
          </p>
          <ul>
            <li>
              <strong>Transit API</strong>: 日本の公共交通に対応したオープンな経路探索基盤（
              <a href="https://transit.ls8h.com" target="_blank" rel="noreferrer noopener">
                transit.ls8h.com
              </a>
              ）を利用しています。
            </li>
            <li>
              <strong>公共交通オープンデータ協議会 (ODPT)</strong>: 公共交通オープンデータセンターが公開するデータを利用している場合があります。
            </li>
            <li>
              <strong>交通事業者オープンデータ (GTFS)</strong>: 各交通事業者、自治体、国土交通省等が公開するオープンデータ（GTFS-JP / GTFS Realtime）に基づいています。
            </li>
            <li>
              <strong>OpenStreetMap (OSM)</strong>: 地理データ・徒歩経路の算出等に OpenStreetMap データを活用しています（© OpenStreetMap contributors）。
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>4. 外部 API の利用規約・ステートメントへの準拠</h2>
          <p>
            本サービスは、Transit API が定める利用規約およびデータ取得方針を尊重し、適正な範囲で利用しています。詳細については下記をご参照ください。
          </p>
          <ul className={styles.linkList}>
            <li>
              <a href="https://transit.ls8h.com/terms" target="_blank" rel="noreferrer noopener">
                Transit API 利用規約・免責事項 ↗
              </a>
              <small>無償提供、非公式性、データ保証範囲、API利用条件に関する公式規定</small>
            </li>
            <li>
              <a href="https://transit.ls8h.com/jr-data-statement" target="_blank" rel="noreferrer noopener">
                JR時刻表データの取得に関するステートメント ↗
              </a>
              <small>公開運行情報の標準形式（GTFS）への変換・再利用に関する立場と運用方針</small>
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>5. 責任制限</h2>
          <p>
            本サービスの利用、または利用できなかったことによって生じた利用者のいかなる損害（遅刻、乗り遅れ、代替交通費、旅程の変更、機会損失、その他の不利益等）について、当方は一切の責任を負いかねます。
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. お問い合わせ・ご指摘</h2>
          <p>
            本サービスに関するご質問、データの不備や権利に関するご指摘などがございましたら、リポジトリの Issue または開発チームまでご連絡ください。
          </p>
        </section>

        <div className={styles.footer}>
          <button className={styles.bottomBack} type="button" onClick={() => navigate('/')}>
            ← ホームへ戻る
          </button>
        </div>
      </article>
    </main>
  )
}
