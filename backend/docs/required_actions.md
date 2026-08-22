# Required Actions for Production Deployment (本番環境対応事項一覧)

このドキュメントは、Journey Timeline アプリケーションを本番環境へ安全かつ安定してリリース・運用するために必要な対応項目（Action Items）をまとめたものです。

---

## 1. 今回バックエンド側で実施済みの対応 (Completed in Backend)

バックエンド単体で実施可能な本番対応は完了しています。

- [x] **本番用 Dockerfile の作成 (`backend/Dockerfile`)**:
  - `uv` を活用したマルチステージビルド構成。
  - セキュリティのため `non-root` ユーザー (`appuser`) でコンテナを実行。
- [x] **環境変数・設定管理の強化 (`backend/app/core/config.py`)**:
  - `ENVIRONMENT`（`development` / `production`）の切り替え。
  - 本番環境では Swagger UI (`/docs`, `/redoc`) を自動非公開化。
  - マネージドDB接続用の `DATABASE_URL` 直接上書き対応。
- [x] **動的 CORS 設定 (`backend/app/main.py`)**:
  - 環境変数 `CORS_ORIGINS` に指定された本番ドメインのみを許可するセキュアな構成。
- [x] **レートリミット（過負荷・ブルートフォース対策）の実装 (`slowapi`)**:
  - パスワード検証 API (`POST /verify`): **5回/分** に制限。
  - Transit API プロキシ (`GET /transit/plan`): **30回/分** に制限。
- [x] **ヘルスチェックの強化 (`GET /health`)**:
  - 稼働環境情報を含めたステータス返却。

---

## 2. 今後対応が必要な事項 (Pending Action Items)

チーム全体（フロントエンド、インフラ、CI/CD）で今後対応が必要な項目です。

### 2.1. フロントエンド & デプロイ構成 (Frontend & Web Server)
- [ ] **フロントエンド本番用 Dockerfile の作成**:
  - Vite の静的ビルド (`npm run build`) を実行し、Nginx コンテナで配信するマルチステージビルド。
- [ ] **リバースプロキシ (Nginx / Cloudflare / ALB) の設定**:
  - `/api/*` へのリクエストを FastAPI コンテナへ転送。
  - それ以外の静的リクエストをフロントエンドへルーティング。
  - SSL/TLS（HTTPS）証明書の適用。
- [ ] **フロントエンドの環境変数設定**:
  - `VITE_API_BASE_URL` を本番バックエンドのURLに差し替え。

### 2.2. インフラ & クラウド選定 (Infrastructure & Database)
- [ ] **クラウドプラットフォームの決定**:
  - 候補: Render, Google Cloud Run, Fly.io, AWS (ECS / App Runner)
- [ ] **本番用マネージド PostgreSQL のプロビジョニング**:
  - 候補: Neon, Supabase, AWS RDS, Cloud SQL
  - 定期自動バックアップの設定。
- [ ] **本番用シークレットの安全な注入**:
  - `SECRET_KEY` (強力なランダム文字列)
  - `POSTGRES_PASSWORD` / `DATABASE_URL`
  - `TRANSIT_API_KEY` (本番用APIキー)
  - クラウドの Secret Manager や環境変数管理画面への登録。

### 2.3. CI/CD パイプライン (Automation)
- [ ] **GitHub Actions による自動テスト＆Linter**:
  - Backend: `uv run pytest`, `ruff check`, `mypy`
  - Frontend: `npm run lint`, `tsc --noEmit`
- [ ] **自動マイグレーション & 自動デプロイ**:
  - `main` ブランチマージ時にコンテナイメージをビルド・デプロイ。
  - デプロイ時に `alembic upgrade head` を自動実行するステップの組み込み。

### 2.4. 監視・可観測性 (Monitoring & Observability)
- [ ] **エラートラッキングの導入 (Sentry など)**:
  - 予期せぬ 500 エラーやクラッシュの検知・通知。
- [ ] **ログ収集・アラート設定**:
  - クラウド標準のログ管理（CloudWatch, Cloud Logging, Datadog 等）への集約。
