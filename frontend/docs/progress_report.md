# フロントエンド開発 進捗状況レポート

**最終更新日**: 2026-08-22

Journey Timelineのフロントエンドについて、現在までに実装した内容と残課題をまとめます。

## 技術構成

- React 19
- TypeScript
- Vite
- CSS Modules
- ブラウザHistory APIによる簡易ルーティング
- Repositoryパターンによるモック／実APIの切り替え

## 実装済みの内容

### 1. ホーム画面

- [x] サービスのメインビジュアル
- [x] 「今すぐ作る」から新規旅程作成画面への遷移
- [x] 「これまでの旅程を見る」から全旅程一覧への切り替え
- [x] 旅程タイトル、日程、更新日時、アイテム数の一覧表示
- [x] 一覧から旅程閲覧画面への遷移
- [x] モックデータの初期化

### 2. 旅程画面

- [x] 新規作成・閲覧・編集モード
- [x] PC向け3カラムレイアウト
- [x] 予定と移動を縦型タイムラインとして表示
- [x] 日付から`Day 1`、`Day 2`を算出してグループ表示
- [x] 時刻未設定アイテムの表示
- [x] 選択アイテムの詳細表示
- [x] 空の旅程用表示
- [x] 共有URLのコピー
- [x] 旅程のPDF書き出し・印刷対応（「＋ 書き出し」ボタン押下での `window.print()` 連携、A4最適化、不要UIの非表示）


### 3. 旅程・予定・移動の編集

- [x] 旅程の新規作成
- [x] 旅程タイトルの更新
- [x] 旅程の削除
- [x] 予定の追加・編集・削除
- [x] 移動経路の検索・追加
- [x] 移動の編集・削除
- [x] タイムラインアイテムの上下移動
- [x] 指定位置への予定追加
- [x] 編集パスワード入力ダイアログ
- [x] 保存中・検索中の表示
- [x] 新規作成失敗時のエラー表示

### 4. フロントエンド完結モック

- [x] サンプル旅程データの用意
- [x] `localStorage`を擬似DBとして使用
- [x] ページ再読み込み後も作成・更新・削除結果を保持
- [x] 特徴の異なる経路候補を返すモック検索
- [x] モック編集パスワード`demo`
- [x] バックエンドを起動せず`pnpm dev`だけで動作

### 5. FastAPIとの接続

- [x] 共通APIクライアントの実装
- [x] Cookieを含むHTTPリクエスト
- [x] 旅程一覧・詳細・作成・更新・削除APIとの接続
- [x] 予定・移動の追加・更新・削除APIとの接続
- [x] 並び替えAPIとの接続
- [x] 編集セッションAPIとの接続
- [x] Transit APIプロキシとの接続
- [x] APIエラーからメッセージを取得する処理

## モック／実APIの切り替え

`frontend/.env`の`VITE_DATA_SOURCE`で切り替えます。

### モック

```env
VITE_DATA_SOURCE=mock
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### 実API

```env
VITE_DATA_SOURCE=api
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

切り替え処理は`src/repositories/index.ts`にあり、画面側は同じ`JourneyRepository`インターフェースを利用します。

```text
React画面
  └─ JourneyRepository
      ├─ mockJourneyRepository → localStorage
      └─ apiJourneyRepository  → FastAPI
```

## 主なディレクトリ構成

```text
frontend/src/
├── api/                  # 共通APIクライアント
├── app/                  # ナビゲーション処理
├── mocks/                # fixtureとモック経路
├── pages/
│   ├── HomePage/         # ホーム・旅程一覧
│   └── JourneyPage/      # 旅程作成・閲覧・編集
├── repositories/         # モック／実APIのデータアクセス
├── styles/               # デザイントークン
├── types/                # Journey・TimelineItem等の型
└── utils/                # 日付・タイムライン変換
```

## 動作確認結果

- TypeScriptのコンパイル成功
- Viteのproduction build成功
- ESLintエラーなし
- モックモードで旅程・予定・移動のCRUDを確認
- APIモードでFastAPIから旅程一覧を取得できることを確認
- APIモードで新規旅程を作成できることを確認

## 現在の課題

### Transit API連携

外部Transit APIとバックエンドのプロキシ処理には、次の仕様差があります。

- 外部APIは駅名ではなく駅IDまたは`geo:緯度,経度`を要求する
- 駅名をサジェストAPIで検索用IDへ変換する必要がある
- 日時を`date=YYYYMMDD`と`time=HH:MM`へ変換する必要がある
- 外部APIの経路一覧は`journeys`に格納される
- 発着時刻はISO日時ではなく、サービス日午前0時からの秒数で返される

このため、実APIモードの経路検索はバックエンド側の変換処理が完成するまで正常に動作しない場合があります。フロントエンドのモック検索は利用できます。

### その他

- [ ] Transit API検索失敗時の詳細なエラー表示
- [ ] ドラッグ＆ドロップによる並び替え
- [ ] 一覧の検索・ページネーション
- [ ] コンポーネントテスト
- [ ] E2Eテスト
- [ ] Figmaデザインとの最終調整
- [ ] スマートフォン表示の詳細調整

## 関連ファイル

- `AGENTS.md`: フロントエンド設計・実装方針
- `CONTRIBUTING.md`: 環境構築と起動方法
- `frontend/.env.example`: フロントエンド環境変数の例
