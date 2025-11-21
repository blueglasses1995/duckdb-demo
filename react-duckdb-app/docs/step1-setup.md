# Step 1: プロジェクトセットアップ

## 🎯 このステップのゴール

- Vite + Reactプロジェクトを作成
- DuckDB WASMをインストール
- 開発環境を構築

## 📝 手順

### 1. Viteプロジェクトの作成

```bash
# プロジェクト作成
npm create vite@latest react-duckdb-app -- --template react

# ディレクトリ移動
cd react-duckdb-app

# 依存関係のインストール
npm install
```

### 2. DuckDB WASMのインストール

```bash
npm install @duckdb/duckdb-wasm
```

### 3. 必要なライブラリのインストール

```bash
# データ可視化
npm install recharts

# ファイル処理
npm install papaparse

# ユーティリティ
npm install clsx
```

### 4. Vite設定の更新

`vite.config.js` を以下のように更新：

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // Web Worker用の設定
  worker: {
    format: 'es'
  },

  // DuckDB WASM用の最適化
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm'],
    esbuildOptions: {
      target: 'esnext'
    }
  },

  // CORS対応
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
})
```

### 5. プロジェクト構造の作成

```bash
# ディレクトリ作成
mkdir -p src/workers
mkdir -p src/hooks
mkdir -p src/components
mkdir -p src/utils
mkdir -p public/sample-data
```

### 6. package.jsonの確認

最終的な`package.json`は以下のようになります：

```json
{
  "name": "react-duckdb-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@duckdb/duckdb-wasm": "^1.28.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.10.0",
    "papaparse": "^5.4.1",
    "clsx": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0"
  }
}
```

### 7. サンプルデータの作成

`public/sample-data/sales.csv`を作成：

```csv
date,product,category,amount,quantity
2024-01-01,Product A,Electronics,1500,3
2024-01-01,Product B,Furniture,2500,1
2024-01-02,Product C,Electronics,800,2
2024-01-02,Product A,Electronics,1500,3
2024-01-03,Product D,Clothing,450,5
2024-01-03,Product B,Furniture,2500,1
2024-01-04,Product E,Electronics,3200,2
2024-01-04,Product C,Electronics,800,2
2024-01-05,Product A,Electronics,1500,3
2024-01-05,Product D,Clothing,450,5
```

## 🧪 動作確認

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:5173 を開いて、Reactのデフォルト画面が表示されることを確認。

### DuckDB WASMの動作確認

`src/App.jsx`を以下のように更新して動作確認：

```jsx
import { useState, useEffect } from 'react'
import * as duckdb from '@duckdb/duckdb-wasm'
import './App.css'

function App() {
  const [status, setStatus] = useState('初期化中...')
  const [result, setResult] = useState(null)

  useEffect(() => {
    initDuckDB()
  }, [])

  async function initDuckDB() {
    try {
      setStatus('DuckDB WASM を読み込み中...')

      // DuckDBの初期化
      const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles()
      const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES)
      const worker = await duckdb.createWorker(bundle.mainWorker)
      const logger = new duckdb.ConsoleLogger()
      const db = new duckdb.AsyncDuckDB(logger, worker)
      await db.instantiate(bundle.mainModule)

      setStatus('DuckDB 初期化完了！')

      // 接続してクエリ実行
      const conn = await db.connect()

      // テストクエリ
      const testResult = await conn.query(`
        SELECT 'Hello from DuckDB!' as message,
               42 as answer,
               NOW() as current_time
      `)

      setResult(testResult.toArray())
      await conn.close()

    } catch (error) {
      setStatus(`エラー: ${error.message}`)
      console.error(error)
    }
  }

  return (
    <div className="App">
      <h1>DuckDB + React ハンズオン</h1>
      <h2>Step 1: セットアップ確認</h2>

      <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px 0' }}>
        <h3>ステータス</h3>
        <p>{status}</p>
      </div>

      {result && (
        <div style={{ padding: '20px', border: '1px solid #4CAF50', margin: '20px 0' }}>
          <h3>クエリ結果</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <div style={{ padding: '20px', backgroundColor: '#f0f0f0', margin: '20px 0' }}>
        <h3>✅ 確認事項</h3>
        <ul style={{ textAlign: 'left' }}>
          <li>DuckDB WASMが正常に初期化されている</li>
          <li>クエリが実行できている</li>
          <li>結果が表示されている</li>
        </ul>
      </div>
    </div>
  )
}

export default App
```

`src/App.css`を更新：

```css
#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.App {
  padding: 20px;
}

h1 {
  color: #333;
}

h2 {
  color: #666;
}

pre {
  text-align: left;
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
}

ul {
  max-width: 600px;
  margin: 0 auto;
}
```

### 期待される結果

ブラウザに以下が表示されます：

1. **ステータス**: "DuckDB 初期化完了！"
2. **クエリ結果**:
```json
[
  {
    "message": "Hello from DuckDB!",
    "answer": 42,
    "current_time": "2024-01-15T12:34:56.789Z"
  }
]
```

## 🎉 ステップ1完了！

以下が確認できたら次のステップへ：

- ✅ Vite + Reactプロジェクトが動作している
- ✅ DuckDB WASMがインストールされている
- ✅ DuckDBの初期化とクエリ実行ができている

## 🐛 トラブルシューティング

### エラー: "Failed to fetch module"

**原因**: CORSポリシーまたはネットワークの問題

**解決策**:
```bash
# 開発サーバーを再起動
npm run dev
```

### エラー: "Cannot find module '@duckdb/duckdb-wasm'"

**原因**: パッケージが正しくインストールされていない

**解決策**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### ページが真っ白

**原因**: ブラウザのコンソールエラーを確認

**解決策**:
- F12で開発者ツールを開く
- Consoleタブでエラーメッセージを確認
- エラーメッセージに応じて対処

## 📚 学んだこと

- ✅ Vite + Reactプロジェクトのセットアップ
- ✅ DuckDB WASMのインストールと設定
- ✅ DuckDBの初期化と基本的なクエリ実行
- ✅ 非同期処理（async/await）の使い方

## ➡️ 次のステップ

[Step 2: Web Workerの作成](./step2-web-worker.md)

メインスレッドをブロックせずにDuckDBを動かす方法を学びます。
