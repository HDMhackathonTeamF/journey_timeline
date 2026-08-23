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
mise run dev
```
*(または `cd frontend` して `pnpm dev`)*

#### バックエンドと接続して起動
リポジトリ直下で実行します。
```powershell
Copy-Item .env.example .env
Copy-Item frontend\.env.example frontend\.env
mise run api:db
```

`frontend/.env` の `VITE_DATA_SOURCE` を `api` に変更します。

バックエンドをマイグレーションして起動します：
```powershell
cd backend
uv sync
cd ..
mise run api:migrate
mise run api:dev
```

別のターミナルでフロントエンドを起動します：
```powershell
mise run dev
```

---

### 便利な mise タスク一覧
リポジトリ直下で以下のコマンドが使用できます：
- `mise run dev`: フロントエンド開発サーバーの起動
- `mise run build`: フロントエンドの型チェック＆本番ビルド
- `mise run lint`: ESLint による静的チェック
- `mise run check`: フロントエンド＆バックエンドの一括構文・ビルド検証
- `mise run api:db`: PostgreSQL データベースの起動
- `mise run api:migrate`: DB マイグレーションの実行
- `mise run api:dev`: FastAPI サーバーの起動
