# コントリビューションのやり方
## 必要なもの
- mise
- docker
- 任意のエディタ
    - VSCodeとか
- git

## 環境のセットアップ
### 1. プロジェクトのクローン
1. Windows Terminalなどを開く
2. プロジェクトを置いておきたいフォルダに`cd`で移動して以下を実行
```sh
git clone git@github.com:HDMhackathonTeamF/journey_timeline.git
```
### 2. 必要なツールをmiseでインストール
プロジェクトのフォルダに入って以下を実行
```sh
cd journey_timeline # プロジェクトのフォルダに入る
mise install
```
### 3. frontendのフォルダでpnpm installを実行して依存関係をインストール
```sh
pnpm install
```
### 4. 起動方法
- このプロジェクトにはバックエンドとフロントエンドがあります
    - バックエンドはサーバ側のプログラム，フロントエンドは主にブラウザ上で見る画面のプログラムがあります

#### フロントエンドだけをモックで起動
```powershell
Copy-Item frontend\.env.example frontend\.env
cd frontend
pnpm dev
```

#### バックエンドと接続して起動
リポジトリ直下で実行します。
```powershell
Copy-Item .env.example .env
Copy-Item frontend\.env.example frontend\.env
docker compose up -d
```

`frontend/.env`の`VITE_DATA_SOURCE`を`api`に変更します。

バックエンドを起動します。
```powershell
cd backend
uv sync
uv run alembic upgrade head
uv run fastapi dev app/main.py
```

別のターミナルでフロントエンドを起動します。
```powershell
cd frontend
pnpm dev
```
