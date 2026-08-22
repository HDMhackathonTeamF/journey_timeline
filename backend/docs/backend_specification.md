# 旅程タイムライン作成Webアプリ (journey_timeline) バックエンド仕様書

## 1. プロジェクト概要と技術スタック
旅行の「予定（観光など）」と「移動（公共交通機関など）」を時系列のタイムラインとして視覚化し、URLを通じて他のユーザーと共有できるWebアプリケーションです。

* **フロントエンド構成**: Reactを用いたUI構築、Viteによるビルド、CSS Modulesによるスタイリングを採用し、Figmaデザインに基づく直感的な操作を提供します。
* **バックエンド構成**: FastAPI (Python) と PostgreSQL を採用し、Docker環境で構築します。ORMにはSQLAlchemy (asyncio対応) を使用します。
* **開発環境ツール**: パッケージ管理には `uv`、環境構築には `mise` を使用します。
* **外部連携**: 経路検索や時間計算には Transit API を利用しますが、フロントエンドからの直接呼び出しは行いません。バックエンドプロキシ経由でアクセスします。

## 2. ディレクトリ構成 (Backend)
関心事の分離に基づき、以下の構成で実装します。

```text
backend/
├── app/
│   ├── main.py                  # FastAPIエントリポイント・CORS設定・ルーター統合
│   ├── api/
│   │   └── v1/
│   │       ├── journeys.py      # 旅程関連エンドポイント
│   │       ├── items.py         # タイムラインアイテムCRUDエンドポイント
│   │       └── transit.py       # Transit APIプロキシ・成型エンドポイント
│   ├── core/
│   │   ├── config.py            # 環境変数・設定管理
│   │   └── database.py          # 非同期DBセッション管理
│   ├── models/                  # SQLAlchemyモデル (journey, timeline_item, event, transit)
│   ├── schemas/                 # Pydanticスキーマ (リクエスト/レスポンス型定義)
│   └── services/                # Transit APIへのHTTP通信とデータ成型ロジック
├── alembic/                     # マイグレーションファイル
└── pyproject.toml
```

## 3. データベース設計 (テーブル定義)
時系列でのデータ取得と将来的な拡張性を担保するため、共通要素と詳細要素を分離した複数テーブル構成を採用しています。
主キーにはすべてUUID（推測困難なID）を使用します。

### 3.1. journeys (旅程テーブル)
| カラム名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, default=uuid4 | 旅程ID（共有URLに使用） |
| `title` | String(255) | NOT NULL | 旅程のタイトル |
| `edit_token` | String(255) | NULLable | 編集権限用の認証トークン |
| `created_at` | DateTime(timezone=True) | default=now() | 作成日時 |
| `updated_at` | DateTime(timezone=True) | default=now(), onupdate=now() | 更新日時 |

### 3.2. timeline_items (タイムライン共通テーブル)
| カラム名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, default=uuid4 | アイテムID |
| `journey_id` | UUID | FK(journeys.id, CASCADE), NOT NULL | 紐づく旅程ID |
| `item_type` | Enum('event', 'transit') | NOT NULL | アイテム種別 |
| `order_index` | Integer | NOT NULL | タイムラインの表示順序 |
| `start_time` | DateTime(timezone=True) | NULLable | 開始時刻 |
| `end_time` | DateTime(timezone=True) | NULLable | 終了時刻 |

### 3.3. events (予定詳細テーブル)
| カラム名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, FK(timeline_items.id, CASCADE) | アイテムIDと共通 |
| `title` | String(255) | NOT NULL | 予定名・スポット名 |
| `duration_minutes` | Integer | NULLable | 滞在・所要時間（分） |
| `address` | String(255) | NULLable | 住所・場所 |
| `memo` | Text | NULLable | 備考・メモ |

### 3.4. transits (移動詳細テーブル)
| カラム名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, FK(timeline_items.id, CASCADE) | アイテムIDと共通 |
| `departure_location` | String(255) | NOT NULL | 出発地（駅名等） |
| `arrival_location` | String(255) | NOT NULL | 到着地（駅名等） |
| `transit_data` | JSONB | NULLable | Transit APIから取得した詳細データ成型用 |

## 4. APIエンドポイント詳細仕様

### 4.1. 旅程 (Journeys)

**① 旅程の新規作成**
* Endpoint: `POST /api/v1/journeys`
* Request Body:
```json
{
  "title": "東京1日観光プラン",
  "edit_token": "secret_pass_123"
}
```
* Response (201 Created):
```json
{
  "id": "c3b9d4e2-8f1a-4e2b-9c3d-1a2b3c4d5e6f",
  "title": "東京1日観光プラン",
  "created_at": "2026-08-19T09:00:00Z",
  "updated_at": "2026-08-19T09:00:00Z"
}
```

**② 旅程詳細とタイムラインの取得（共有・閲覧用）**
* Endpoint: `GET /api/v1/journeys/{journey_id}`
* Response (200 OK):
  `order_index` 順にソートされたタイムラインアイテム一覧を返却します。`timeline_items` を取得する際は、`events` と `transits` の情報を結合し、フロントエンドが扱いやすいネストされたJSON形式で返却します。
```json
{
  "id": "c3b9d4e2-8f1a-4e2b-9c3d-1a2b3c4d5e6f",
  "title": "東京1日観光プラン",
  "created_at": "2026-08-19T09:00:00Z",
  "updated_at": "2026-08-19T09:00:00Z",
  "items": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "item_type": "event",
      "order_index": 0,
      "start_time": "2026-08-19T09:00:00Z",
      "end_time": "2026-08-19T09:08:00Z",
      "event": {
        "title": "ホテル出発",
        "duration_minutes": 8,
        "address": "千葉県浦安市...",
        "memo": "歩き 5分 (3分)"
      },
      "transit": null
    },
    {
      "id": "22222222-2222-2222-2222-222222222222",
      "item_type": "transit",
      "order_index": 1,
      "start_time": "2026-08-19T09:08:00Z",
      "end_time": "2026-08-19T10:02:00Z",
      "event": null,
      "transit": {
        "departure_location": "新浦安駅",
        "arrival_location": "秋葉原駅",
        "transit_data": {
          "total_fare": 390,
          "transfers_count": 2,
          "legs": [
            {
              "line_name": "JR武蔵野線",
              "platform": "3,4番線",
              "from_station": "新浦安駅",
              "to_station": "葛西臨海公園駅"
            }
          ]
        }
      }
    }
  ]
}
```

### 4.2. タイムラインアイテム (Timeline Items)

**① アイテムの追加**
* Endpoint: `POST /api/v1/journeys/{journey_id}/items`
* 処理: `item_type` に応じて `events` か `transits` にも登録します。
* Request Body (Event追加の場合):
```json
{
  "item_type": "event",
  "order_index": 2,
  "start_time": "2026-08-19T11:00:00Z",
  "end_time": "2026-08-19T12:00:00Z",
  "event": {
    "title": "国立科学博物館",
    "duration_minutes": 60,
    "address": "東京都台東区上野公園7-20",
    "memo": "特別展を観覧"
  }
}
```
* Response (201 Created): 作成されたアイテムオブジェクト（単体）を返却。

**② アイテムの更新**
* Endpoint: `PUT /api/v1/items/{item_id}`
* Request Body: 更新対象のフィールドを送信（`start_time`, `order_index`, および `event` または `transit` の中身）。
* Response (200 OK): 更新後のアイテムオブジェクトを返却。

**③ アイテムの削除**
* Endpoint: `DELETE /api/v1/items/{item_id}`
* Response (204 No Content)

### 4.3. Transit API プロキシ・データ成型

**① 経路検索プロキシ**
* Endpoint: `GET /api/v1/transit/plan`
* Query Parameters:
  * `from_location` (string, 必須): 出発地（駅名または座標 geo:lat,lng）
  * `to_location` (string, 必須): 目的地（駅名または座標 geo:lat,lng）
  * `time` (string, 任意): 出発・到着希望時刻 (ISO 8601形式等)
* 処理ロジック:
  設定ファイル（`.env` 等の環境変数 `TRANSIT_API_BASE_URL`, `TRANSIT_API_KEY`）に基づき外部の Transit API に対しHTTPリクエストを送信します。
  外部APIからの生レスポンスをそのまま返すのではなく、フロントエンドの表示に必要な情報（出発時間、到着時間、所要時間、乗り換え回数、総運賃、使用する路線名のリストなど）のみを抽出・整形したJSONレスポンスを構築して返します。
  API通信エラーや不正なレスポンスに対しては堅牢なエラーハンドリング（502 Bad Gateway）を行い、フロントエンドに統一されたエラーを返します。
* Response (200 OK):
```json
{
  "routes": [
    {
      "summary": "JR山手線内回り",
      "departure_time": "2026-08-19T10:43:00Z",
      "arrival_time": "2026-08-19T10:46:00Z",
      "duration_minutes": 3,
      "transfers_count": 0,
      "total_fare": 150,
      "legs": [
        {
          "line_name": "JR山手線内回り",
          "platform": "2番線",
          "from_station": "秋葉原駅",
          "to_station": "上野駅",
          "departure_time": "2026-08-19T10:43:00Z",
          "arrival_time": "2026-08-19T10:46:00Z"
        }
      ]
    }
  ]
}
```

## 5. 実装上の追加指示
* **Pydantic Validation**: 入出力モデルは Pydantic v2 に準拠させ、厳密な型定義とバリデーションを設けてください。
* **CORS設定**: フロントエンドからのリクエストを許可する `CORSMiddleware` を `app/main.py` に含めてください。
* **エラーハンドリング**: 対象リソースが存在しない場合は 404 Not Found、Transit APIとの通信失敗時には適切な 502 Bad Gateway を返却するようハンドリングしてください。
