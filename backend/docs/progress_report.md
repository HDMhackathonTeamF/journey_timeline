# バックエンド開発 進捗状況レポート

**最終更新日時**: 2026-08-22

現在までのバックエンド開発（Journey Timeline）の進捗状況です。初期ベース構築の全フェーズが完了しています。

## 完了したタスク一覧

### Phase 1: 環境構築・プロジェクト構造
- [x] `uv` を用いたPythonプロジェクトの初期化（`pyproject.toml`の設定）
- [x] `compose.yaml` の更新（PostgreSQL 17-alpineの導入と `5432` ポートの公開）
- [x] `.env` ファイルの作成（DB接続情報の定義）
- [x] FastAPIディレクトリ構成の構築（`app/core`, `app/api`, `app/models`, `app/schemas`, `app/services`）
- [x] `app/core/config.py` および `app/core/database.py` の設定（非同期SQLAlchemy対応）

### Phase 2: データベースモデルとマイグレーション
- [x] SQLAlchemyモデルの定義 (`Journey`, `TimelineItem`, `Event`, `Transit`)
- [x] Alembicの初期化と環境設定（`alembic/env.py` の更新）
- [x] 初回マイグレーションスクリプトの自動生成とDBへの適用（テーブル作成完了）

### Phase 3: Pydantic スキーマの定義
- [x] JourneyのCRUD用スキーマ作成
- [x] TimelineItem（Event, Transit含む）のCRUD用スキーマ作成
- [x] Transit APIプロキシ用レスポンススキーマ作成

### Phase 4: サービス (Transit API Proxy)
- [x] `httpx` を利用した非同期HTTPクライアント（外部Transit APIへの通信）の実装
- [x] フロントエンド表示用に最適化するデータ成型ロジックのベース実装

### Phase 5: API エンドポイント (Routers)
- [x] `journeys.py` の実装 (旅程の作成・取得)
- [x] `items.py` の実装 (タイムラインアイテムの追加・更新・削除)
- [x] `transit.py` の実装 (経路検索プロキシAPI)
- [x] `main.py` へのルーター統合と CORS（フロントエンドからのアクセス許可）設定

### Phase 6: 旅程のパスワード保護（公開/限定共有機能）
- [x] パスワードのハッシュ化およびJWTトークン処理の実装 (`app/core/security.py`)
- [x] `Journey` モデルへの `password_hash` カラムの追加とAlembicマイグレーション適用
- [x] `JourneyCreate`, `JourneyResponse`, `JourneyVerifyRequest`, `TokenResponse` 等のPydanticスキーマ更新
- [x] `journeys.py` APIの更新：
  - 作成時のパスワードハッシュ化
  - 取得時のJWT検証と、未認証時のデータ隠蔽（メタデータのみ返却）
  - パスワード検証およびJWT発行用エンドポイント (`POST /api/v1/journeys/{id}/verify`) の追加

### Phase 8: 本番環境対応（バックエンド単体対応）
- [x] 本番用マルチステージ Dockerfile の作成 (`backend/Dockerfile`)
- [x] レートリミッター (`slowapi`) の導入によるパスワード総当たり＆API過負荷防止
- [x] 環境変数ベースの動的 CORS 設定および本番環境（`production`）切り替え対応
- [x] 本番デプロイ対応事項一覧 (`backend/docs/required_actions.md`) の作成

### Phase 9: 並べ替え（Reorder）および旅程CRUD拡張・認可強化
- [x] タイムラインアイテム順序一括更新 API (`PATCH/PUT /api/v1/journeys/{journey_id}/items/reorder`, `/journeys/{journey_id}/reorder`) の実装
- [x] 並べ替え用 Pydantic スキーマ (`ItemReorderRequest`, `ItemReorderItem`) の定義
- [x] 旅程タイトル等の更新 API (`PATCH/PUT /api/v1/journeys/{journey_id}`) および旅程削除 API (`DELETE /api/v1/journeys/{journey_id}`) の実装
- [x] 旅程更新用 Pydantic スキーマ (`JourneyUpdate`) の定義
- [x] アイテム新規追加時の `order_index` 自動インクリメント・シフト処理の実装
- [x] パスワード保護された旅程に対する全更新・削除・並べ替えエンドポイントでの JWT トークン認可検証の実装
- [x] フロントエンド側リポジトリ (`apiJourneyRepository.ts`) での認証ヘッダー付与および並べ替え連携対応

## 動作確認結果
- PostgreSQLコンテナが正常に起動し、テーブル構造が構築されていることを確認しました。
- `fastapi dev` (または `uvicorn`) によるバックエンドサーバーの起動に成功しました。
- ヘルスチェックエンドポイント (`/health`) で `{"status": "ok", "environment": "development"}` が返却されることを確認済みです。
- 新規追加したJWT・パスワード保護APIおよびレートリミッターが正常に稼働しています。
- [Swagger UI (http://localhost:8000/docs)](http://localhost:8000/docs) が利用可能になっています。
- バックエンド統合テストにおいて、旅程作成 → 複数アイテム追加 → 並べ替え（`reorder` API） → 永続化確認 → 旅程削除の一連のライフサイクルが正常に動作することを確認しました。

## 次のステップ (Next Steps)
バックエンド側のベース機能、外部連携、旅程・アイテムの全CRUDおよび並べ替え機能が完了しました。今後は以下に進みます：
- フロントエンド（React）側との連携：OpenAPI クライアント自動生成の実行とコンポーネント実装
- クラウド選定およびインフラ・CI/CD環境のセットアップ（詳細は `required_actions.md` を参照）


