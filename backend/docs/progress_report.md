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

### Phase 7: Transit API 連携強化とクライアント生成準備
- [x] Transit API接続の堅牢化（設定ファイル化、タイムアウト設定、エラーハンドリング強化）
- [x] フロントエンド向け OpenAPI クライアント自動生成ガイド (`openapi_client_guide.md`) の作成

## 動作確認結果
- PostgreSQLコンテナが正常に起動し、テーブル構造が構築されていることを確認しました。
- `fastapi dev` (または `uvicorn`) によるバックエンドサーバーの起動に成功しました。
- ヘルスチェックエンドポイント (`/health`) で `{"status": "ok"}` が返却されることを確認済みです。
- 新規追加したJWT・パスワード保護APIが正常に動作し、Alembicマイグレーションも適用完了しています。
- [Swagger UI (http://localhost:8000/docs)](http://localhost:8000/docs) が利用可能になっています。

## 次のステップ (Next Steps)
バックエンドのベース機能および外部連携の仕組みが整いました。今後は以下の対応が想定されます：
- フロントエンド（Vue.js / React）側での OpenAPI クライアント自動生成スクリプトの実行と導入
- パスワード保護ロジック（モーダル表示・トークン保存）の組み込み
- 本番環境を見据えた設計（デプロイメント構成、CI/CDなど）
