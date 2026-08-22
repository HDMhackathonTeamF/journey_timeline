# OpenAPI クライアント自動生成ガイド（フロントエンド向け）

このドキュメントは、バックエンド（FastAPI）が提供するAPI仕様（OpenAPI）を利用して、フロントエンド（React/Vue等）側のAPI呼び出しコードを自動生成するためのガイドラインです。

## 1. なぜ自動生成するのか？（メリット）

通常、フロントエンドからAPIを呼び出す際は `fetch` メソッドや型定義を手動で記述する必要がありますが、自動生成を導入することで以下の恩恵を受けられます。

* **型安全（Type Safety）**: バックエンドの変更（レスポンスの型やエンドポイントの追加）に即座に追従でき、コンパイルエラーとして検知可能です。手書きによるスペルミスや型の不一致を防げます。
* **開発効率の向上**: `interface` やAPI呼び出し用の関数を手動で定義・保守する手間が省けます。
* **ドキュメントとの同期**: FastAPIが自動生成する `/openapi.json` がそのままコードのベースになるため、常にドキュメントと実装が一致します。

## 2. 導入するツールの候補

プロジェクトの要件に合わせて以下のいずれかを選定します。現在は軽量で型安全な **`openapi-fetch` + `openapi-typescript`** の組み合わせがモダンな標準として推奨されます。

1. **[openapi-fetch](https://openapi-ts.dev/openapi-fetch/) (推奨)**
   - 非常に軽量（2kb）で、標準の `fetch` をラップしただけのシンプルなクライアント。
   - `openapi-typescript` と組み合わせて、型定義のみを自動生成し、実行時コードを最小限に抑えます。
2. **[Orval](https://orval.dev/)**
   - React Query (TanStack Query) や SWR などのデータフェッチングライブラリ用のカスタムフックを直接自動生成してくれる高機能ツール。
3. **OpenAPI Generator (Axios等)**
   - 昔からある重厚なジェネレーター。Axiosベースのクライアント等を生成。

## 3. 具体的な導入手順（openapi-fetch の場合）

### Step 1: パッケージのインストール
フロントエンドのディレクトリで以下のコマンドを実行します。
```bash
npm install openapi-fetch
npm install -D openapi-typescript
```

### Step 2: 自動生成スクリプトの設定
`package.json` に、バックエンド（起動中）から `openapi.json` を取得して型を生成するコマンドを追加します。
```json
{
  "scripts": {
    "gen:api": "openapi-typescript http://localhost:8000/openapi.json -o ./src/api/schema.d.ts"
  }
}
```

### Step 3: APIクライアントのインスタンス化
フロントエンド側で、API呼び出し用の共通クライアントファイル（例: `src/api/client.ts`）を作成します。
ここで、**JWTトークンの自動付与（Interceptor）**などの設定を行います。

```typescript
import createClient from "openapi-fetch";
import type { paths } from "./schema"; // 自動生成された型定義

const client = createClient<paths>({ 
  baseUrl: "http://localhost:8000/",
});

// リクエスト時の共通処理（例：JWTトークンの付与）
client.use({
  onRequest(req) {
    const token = localStorage.getItem("access_token");
    if (token) {
      req.headers.set("Authorization", `Bearer ${token}`);
    }
    return req;
  }
});

export default client;
```

## 4. フロントエンド側でのAPI呼び出し例

自動生成されたクライアントを使うと、パスやメソッド、パラメータが自動補完されるようになります。

### 例1: 旅程詳細の取得（パスワード保護対応）
```typescript
import client from "./api/client";

async function fetchJourney(id: string) {
  const { data, error } = await client.GET("/api/v1/journeys/{journey_id}", {
    params: {
      path: { journey_id: id }
    }
  });

  if (error) {
    console.error("APIエラー:", error);
    return;
  }

  // data は自動的に JourneyWithItemsResponse 型になります
  if (data.is_protected && data.items.length === 0) {
    // パスワード入力モーダルを表示する処理
    console.log("パスワード保護されています");
  } else {
    // タイムラインを表示
    console.log("旅程データ:", data.title, data.items);
  }
}
```

### 例2: 外部連携（Transit API）の呼び出し
フロントエンドは外部APIを直接叩かず、バックエンドのプロキシAPIを呼び出します。
```typescript
async function fetchTransitRoute(from: string, to: string) {
  const { data, error } = await client.GET("/api/v1/transit/plan", {
    params: {
      query: {
        from_location: from,
        to_location: to
      }
    }
  });

  if (data) {
    // バックエンド側で使いやすく成型されたデータ（TransitPlanResponse型）が返る
    console.log("経路候補:", data.routes);
  }
}
```

## 5. まとめ・フロントエンド担当者へのタスク

1. 上記のいずれかのツールを選定・インストール。
2. `package.json` へのスクリプト追加と、`schema.d.ts` の生成（バックエンド起動状態で行う）。
3. JWTトークンの管理（保存/取得）とインターセプターの実装。
4. UIコンポーネントから、型安全なクライアント経由でAPI（`/api/v1/journeys` や `/api/v1/transit/plan` など）を呼び出す処理への書き換え。
