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
### 4. それぞれの起動の仕方を覚える
- このプロジェクトにはバックエンドとフロントエンドがあります
    - バックエンドはサーバ側のプログラム，フロントエンドは主にブラウザ上で見る画面のプログラムがあります
#### フロントエンド側の起動
以下を実行して出てくるURLを開くと確認できます
```sh
cd frontend # frontendのフォルダに入る
pnpm run dev # サーバの起動
```
#### バックエンド側の起動
まだ整備中．uvがあるので以下になるかも
```sh
cd backend # backendのフォルダに入る
uv run backend
```
