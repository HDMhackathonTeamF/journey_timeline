# フロントエンド実装ロジック仕様書 (Frontend Domain Logic Specification)

本ドキュメントは、Journey Timeline のフロントエンド側（`frontend/src/`）に実装されている主要な**ドメインロジック、ビジネスロジック、データ変換・計算ロジック**を整理・体系化したものです。
バックエンド側でのバリデーション実装、将来的なロジック集約、API設計の参照資料としてご活用いただけます。

---

## 1. 予定時間・滞在時間の相互連動計算ロジック

### 概要
予定（Event）の作成・編集において、ユーザーは「開始時刻」「終了時刻」「滞在時間（分）」のいずれかを自由に入力できます。
このとき、**「任意の2項目が定まれば残り1項目が自動的に一意に定まる」** という関係性を満たすため、フロントエンドではリアルタイムな双方向連動計算を行っています。

* **実装箇所**: `frontend/src/pages/JourneyPage/useEventTimeCalculator.ts`

### 計算規則・ステートマシン
1. **開始時刻 ($T_{start}$) + 滞在時間 ($D_{min}$) が変更された場合**:
   $$T_{end} = T_{start} + D_{min}$$
2. **終了時刻 ($T_{end}$) + 滞在時間 ($D_{min}$) が変更された場合**:
   $$T_{start} = T_{end} - D_{min}$$
3. **開始時刻 ($T_{start}$) + 終了時刻 ($T_{end}$) が変更された場合**:
   $$D_{min} = \frac{T_{end} - T_{start}}{60 \times 1000} \quad (\text{分換算})$$
   * ※ $T_{end} < T_{start}$ の場合は翌日跨ぎまたはバリデーションエラーとして扱う。

### 編集フォーカスの競合制御
ユーザーが直前に編集した項目（`lastEdited`）を記録し、「ユーザーが今まさに手入力している項目」を自動計算で勝手に上書きしないよう優先順位制御を行っています。

---

## 2. タイムライン・アイテムの順序管理・並べ替えロジック

### 概要
1つの旅程（Journey）には複数のアイテム（予定 `event` または移動 `transit`）が時系列または任意の順序で配置されます。

* **実装箇所**: 
  - `frontend/src/repositories/apiJourneyRepository.ts` (`moveItem`)
  - `frontend/src/repositories/mockJourneyRepository.ts` (`normalize`)

### 並び替えアルゴリズム (`moveItem(journeyId, itemId, direction: -1 | 1)`)
1. 旅程内の全アイテムを取得し、現在の `order_index` 昇順でソート。
2. 対象アイテムの現在のインデックス $i$ を特定。
3. 交換対象インデックス $j = i + \text{direction}$ を算出（$0 \le j < N$ の範囲内であることを検証）。
4. アイテム $i$ とアイテム $j$ の `order_index` を入れ替える。
5. **正規化（Normalize）**:
   歯抜けや重複を防ぐため、常に全アイテムの `order_index` を `0, 1, 2, ..., N-1` に連番再付与して保存。

---

## 3. 移動経路（Transit）データ構造と乗り換え待ち時間計算

### 概要
経路検索で取得した `TransitRoute` は、複数の移動区間（`legs`）で構成されます。タイムライン上および詳細画面で、各乗り換え地点での「待ち時間」を動的に算出・表示しています。

* **実装箇所**: `frontend/src/pages/JourneyPage/JourneyPage.tsx` (`TransitLegDetails`, `TimelineCard`)

### 乗り換え待ち時間の算出
連続する2つの区間 $\text{Leg}_k$ と $\text{Leg}_{k+1}$ について：
$$\text{waitMinutes} = \max\left(0, \, \left\lfloor \frac{\text{departureTime}(\text{Leg}_{k+1}) - \text{arrivalTime}(\text{Leg}_k)}{60 \times 1000} \right\rfloor \right)$$

* `waitMinutes > 0` の場合、UI上に「乗換 ○○分待ち」を明示。
* 路線名の日本語化マッピング: `'walk' \to '徒歩'`, `'transit' \to '電車'`。

---

## 4. 旅程（Journey）の日程・要約集約ロジック

### 概要
旅程一覧（`HomePage`）で表示する「旅行期間（開始日〜終了日）」および「アイテム数」は、旅程に紐づくアイテム群から導出されます。

* **実装箇所**: 
  - `backend/app/api/v1/journeys.py` (`list_journeys`)
  - `frontend/src/repositories/mockJourneyRepository.ts`

### 算出ルール
* **`start_date`**: 全アイテムの中で最も早い `start_time`
* **`end_date`**: 全アイテムの中で最も遅い `end_time`（または `start_time`）
* **`item_count`**: 紐づくタイムラインアイテムの総件数
* **`is_protected`**: 編集パスワード（`password_hash`）が設定されているかどうかの真偽値

---

## 5. 旅程のタイトル検索（サーバーサイド / リポジトリ連携）

### 概要
みんなの旅程一覧において、旅程タイトルによる部分一致検索を提供しています。

* **フロントエンド実装**: `frontend/src/pages/HomePage/HomePage.tsx`
* **バックエンド実装**: `backend/app/api/v1/journeys.py` (`q: Optional[str] = Query(...)`)

### 検索・非同期制御フロー
1. ユーザーがタイトル検索窓に入力（`searchQuery`）。
2. **200ms デバウンス**により過度なAPIリクエストを抑制。
3. `journeyRepository.listJourneys(searchQuery)` を呼び出し、バックエンドの `GET /api/v1/journeys?q={query}` にリクエスト。
4. バックエンド側で SQLAlchemy の `Journey.title.ilike(f"%{q}%")` を用いて大文字小文字を区別せず部分一致抽出。
5. 検索結果件数を「`「検索文字列」の検索結果: N件`」としてUIに即時反映。

---

## 6. パスワード保護と編集認証セッション管理

### 概要
旅程作成時にパスワードを設定した場合、閲覧は全員可能ですが、旅程の変更・アイテムの追加・削除には認証が必要です。

* **実装箇所**: 
  - `frontend/src/api/client.ts` (`getJourneyAccessToken`, `setJourneyAccessToken`)
  - `frontend/src/repositories/apiJourneyRepository.ts` (`verifyJourney`, `authHeaders`)
  - `backend/app/api/v1/journeys.py` (`verify_journey`)

### 認証フロー
1. 編集モード切替時、パスワード入力ダイアログ（`AuthDialog`）を表示。
2. `POST /api/v1/journeys/{id}/verify` に `{ password }` を送信。
3. バックエンドで bcrypt 検証を行い、成功時に JWT（`access_token`）を発行。
4. フロントエンドは旅程IDごとにトークンを保持し、以降の変更リクエストの `Authorization: Bearer <token>` ヘッダーに自動付与。

---

## 7. 移動経路検索（Transit API BFF連携）パラメータ整形

### 概要
ユーザーが入力した出発地・目的地・日時（出発指定 / 到着指定）を受け取り、Transit API の仕様に適合するパラメータへ正規化してバックエンドに送信します。

* **実装箇所**: `frontend/src/repositories/apiJourneyRepository.ts`, `backend/app/services/transit.py`

### マッピング仕様
* **時間種別**:
  - 出発日時指定時: `timeType: 'departure'`（デフォルト）
  - 到着日時指定時: `timeType: 'arrival'` $\to$ Transit API の `type: 'arrival'`
* **取得戦略 (Strategy)**:
  - `fastest`: 最速ルート (`tags: ['fastest']`)
  - `fewestTransfers`: 乗換最少ルート (`tags: ['fewest_transfers']`)
* **重複経路のタグマージ**:
  同一経路（発着時刻・乗車区間が完全一致）が両方の戦略で返ってきた場合、タグを `['fastest', 'fewest_transfers']` に統合。

---

## 8. 今後のバックエンド集約・改善推奨項目

1. **アイテム並び替えのトランザクション保証**:
   - 現在フロントエンド側で行っている順序正規化（`order_index` 連番付与）を、バックエンドの一括更新エンドポイント（例: `POST /api/v1/journeys/{id}/reorder`）として実装することを推奨。
2. **滞在時間・終了時刻のバックエンド自動検証**:
   - `Event` 作成・更新時に `start_time + duration_minutes == end_time` の整合性チェックをバックエンドスキーマ（Pydantic Validator）に追加。
