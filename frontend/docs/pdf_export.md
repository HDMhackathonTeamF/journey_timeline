# 旅程 PDF 書き出し・印刷機能 仕様書

## 1. 概要
旅程詳細画面において、ユーザーが作成した旅程を共有・保存・印刷できるようにするための PDF 出力機能です。
外部ライブラリを導入せず、ブラウザ標準の印刷機能（`window.print()`）と `@media print` CSS ルールを活用して軽量かつ高品質に実装しています。

## 2. ユーザー操作フロー
1. 旅程詳細画面のヘッダーにある **「＋ 書き出し」** ボタンをクリック。
2. ブラウザの標準印刷・PDF保存ダイアログが起動。
3. プレビュー上で不要なボタンやサイドバーが自動的に除外され、A4 縦向きに最適化されたタイムラインが表示。
4. 「PDF として保存」を選択することで、旅程タイトルをデフォルトファイル名とした PDF ファイルが保存される。

## 3. 実装詳細

### 3.1. イベントハンドラー (JourneyPage.tsx)
- `exportPdf` 関数:
  ```typescript
  const exportPdf = () => {
    const originalTitle = document.title
    document.title = `${journey.title} - 旅程タイムライン`
    window.print()
    document.title = originalTitle
  }
  ```
  - PDF 保存時のファイル名がブラウザによって `document.title` から自動設定されるため、一時的に旅程タイトルをタイトルバーにセットして印刷を呼び出します。

### 3.2. 印刷時専用ヘッダー
- 画面上部には通常非表示で、印刷時のみ表示されるプリントヘッダーを配置:
  ```html
  <div class="printHeader">
    <span class="printBrand">Journey Timeline</span>
    <span class="printDate">2026/8/22 出力</span>
  </div>
  ```

### 3.3. 印刷用スタイル (JourneyPage.module.css / TimelineLayout.module.css)
- **非表示要素**:
  - ナビゲーションヘッダー (`.header`)
  - ツールバー (`.tools`: 予定追加・移動追加・編集終了・削除ボタン)
  - 編集/詳細パネル (`.detailPane`)
  - アイテム操作ボタン (`.itemControls`: ↑, ↓, ＋)
  - トースト通知 (`.toast`)
  - ダイアログ・モーダル (`.dialog`, `.backdrop`)
- **ページ設定**:
  - `@page { size: A4 portrait; margin: 12mm 14mm; }` で A4 縦向き余白を設定。
- **改ページ・レイアウト最適化**:
  - `break-inside: avoid-page` / `page-break-inside: avoid` をカード要素 (`.itemWrap`, `.timelineCard`) に指定し、カード途中での不自然な改ページを防止。
  - 日付見出し直後での改ページを防止 (`break-after: avoid-page`)。
  - `-webkit-print-color-adjust: exact; print-color-adjust: exact;` を指定し、時刻バッジ（青色背景）やアイコンカラーが印刷時にも鮮明に出力されるよう調整。
