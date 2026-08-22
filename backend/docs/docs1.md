# 旅程タイムライン作成Webアプリ (journey_timeline) バックエンド完全仕様・実装指示書

あなたは優秀なバックエンドエンジニアです。以下の詳細な要件定義およびAPI仕様に従って、FastAPIとSQLAlchemyを用いたバックエンドシステムのベースコードを生成してください。

## 1. プロジェクト概要と技術スタック
旅行の「予定」と「移動」を時系列のタイムラインとして視覚化し、URLを通じて他のユーザーと共有できるWebアプリケーションのバックエンドを構築します[cite: 1]。

* **フレームワーク**: FastAPI (Python)[cite: 1]
* **データベース**: PostgreSQL (Docker環境)[cite: 1]
* **ORM**: SQLAlchemy (asyncioを用いた非同期処理対応)
* **外部連携**: Transit API (バックエンドプロキシ経由)[cite: 1]
* **セキュリティ**: パスワードハッシュ化 (passlib/bcrypt等)

## 2. ディレクトリ構成
関心事の分離に基づき、以下の構成で実装してください。

```text
backend/
├── app/
│   ├── main.py                  # FastAPIエントリポイント・CORS設定
│   ├── api/
│   │   └── v1/
│   │       ├── journeys.py      # 旅程本体のCRUD
│   │       ├── items.py         # アイテムCRUD・並び替え
│   │       └── transit.py       # Transit APIプロキシ
│   ├── core/
│   │   ├── config.py            # 環境変数管理
│   │   ├── database.py          # 非同期DBセッション
│   │   └── security.py          # edit_tokenのハッシュ化・検証ロジック
│   ├── models/                  # SQLAlchemyモデル
│   ├── schemas/                 # Pydanticスキーマ
│   └── services/                # Transit API連携等
├── alembic/                     # マイグレーション
└── pyproject.toml
```

## 3. データベース設計 (テーブル定義)
主キーはすべてUUIDを使用します。ユーザー管理は行わず、旅程単位のパスワードで編集権限を管理します。

### 3.1. journeys (旅程テーブル)
* `id` (UUID, PK): 旅程ID（共有URLに使用）
* `title` (String): 旅程のタイトル
* `edit_token_hash` (String, nullable): 編集権限用のパスワードハッシュ（平文保存禁止）
* `created_at` (DateTime)
* `updated_at` (DateTime)

### 3.2. timeline_items (タイムライン共通テーブル)
* `id` (UUID, PK)
* `journey_id` (UUID, FK -> journeys.id, CASCADE)
* `item_type` (Enum: 'event', 'transit')
* `order_index` (Integer): タイムラインの表示順序
* `start_time` (DateTime, nullable)
* `end_time` (DateTime, nullable)

### 3.3. events (予定詳細テーブル)
* `id` (UUID, PK, FK -> timeline_items.id, CASCADE)
* `title` (String): 予定名
* `duration_minutes` (Integer, nullable): 滞在・所要時間（分）
* `address` (String, nullable): 住所
* `memo` (Text, nullable): 備考

### 3.4. transits (移動詳細テーブル)
* `id` (UUID, PK, FK -> timeline_items.id, CASCADE)
* `departure_location` (String): 出発地
* `arrival_location` (String): 到着地
* `transit_data` (JSONB, nullable): Transit APIの成型後データ

## 4. APIエンドポイント詳細仕様

**【重要: セキュリティと認証仕様】**
* **ハッシュ化保存**: 旅程作成時にリクエストボディで受け取った `edit_token` (平文) は、Bcrypt等でハッシュ化し `edit_token_hash` としてDBに保存します。
* **ヘッダー認証**: 旅程の新規作成・閲覧を除く、すべての更新・削除APIにおいて、HTTPリクエストヘッダー `X-Edit-Token` を要求します。DBのハッシュ値と照合し、不一致の場合は `403 Forbidden` を返してください。

### 4.1. 旅程 (Journeys)
* **`POST /api/v1/journeys`**: 旅程の新規作成 (title, edit_tokenを受け取る)
* **`GET /api/v1/journeys/{journey_id}`**: 旅程詳細とアイテム一覧を取得。
  * **要件**: アイテムは `order_index` 順のフラットな配列で返却します。複数日程（Day1, Day2...）のグルーピングはフロントエンド側で `start_time` を元に行うため、バックエンドでの分割処理は不要です。
* **`PUT /api/v1/journeys/{journey_id}`**: 旅程本体（タイトルなど）の更新
* **`DELETE /api/v1/journeys/{journey_id}`**: 旅程全体の削除

### 4.2. タイムラインアイテム (Timeline Items)
* **`POST /api/v1/journeys/{journey_id}/items`**: アイテムの追加
  * **要件**: 指定された `order_index` にアイテムを挿入し、同じかそれ以降の `order_index` を持つ既存アイテムの値を自動で `+1` してずらす処理（インクリメント）をDBトランザクション内で実行してください。
* **`PUT /api/v1/items/{item_id}`**: アイテム情報（時間、予定内容など）の更新
* **`DELETE /api/v1/items/{item_id}`**: アイテムの削除
* **`PUT /api/v1/journeys/{journey_id}/reorder`**: 順序の一括更新
  * **要件**: ドラッグ＆ドロップ対応用。Request Bodyとして `[{"id": "uuid1", "order_index": 0}, {"id": "uuid2", "order_index": 1}, ...]` の配列を受け取り、一括で順序を更新します。

### 4.3. Transit API プロキシ
* **`GET /api/v1/transit/plan`**: 経路検索
  * Query Parameters: `from_location`, `to_location`, `time`
  * **処理**: `httpx` で外部APIを呼び出し、必要な要素（発着時刻、運賃、乗換回数、路線名など）のみを抽出・整形してフロントエンドへ返却します。

## 5. 実装上の追加指示
* **Pydantic Validation**: 入出力モデルは Pydantic v2 に準拠させ、パスワードの最小文字数などのバリデーションも設定してください。
* **CORS設定**: フロントエンドからのリクエストを許可する `CORSMiddleware` を設定してください。
* **トランザクション**: 複数テーブルの更新（アイテム追加時の `order_index` 変更など）は、データの一貫性を保つため適切なトランザクション内で処理してください。