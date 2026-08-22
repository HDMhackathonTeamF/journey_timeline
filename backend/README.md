## Journey Timeline API

PostgreSQLを起動し、リポジトリ直下の `.env` に `DATABASE_URL` を設定してから起動します。

```powershell
uv sync
uv run alembic upgrade head
uv run fastapi dev app/main.py
```

APIドキュメントは `http://localhost:8000/docs` で確認できます。

フロントエンドから接続する場合は `frontend/.env` を次のように設定します。

```env
VITE_DATA_SOURCE=api
VITE_API_BASE_URL=http://localhost:8000/api/v1
```
