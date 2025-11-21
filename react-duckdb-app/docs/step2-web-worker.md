# Step 2: Web Workerの作成

## 🎯 このステップのゴール

- Web Workerの基礎を理解
- DuckDBをWeb Worker内で動かす
- メインスレッドとWorkerのメッセージング実装

## 📖 Web Workerとは

Web Workerはメインスレッドとは別のスレッドで処理を実行する仕組みです。

### なぜWeb Workerが必要？

**❌ Web Workerなし**
- 重い処理でUIがフリーズ
- ユーザー体験が悪い

**✅ Web Workerあり**
- バックグラウンドで処理
- UIはスムーズに動作

## 📝 手順

### 1. DuckDB Worker の作成

`src/workers/duckdb.worker.js` を作成：

```javascript
import * as duckdb from '@duckdb/duckdb-wasm'

let db = null
let conn = null

// DuckDBの初期化
async function initDuckDB() {
  if (db) return db

  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles()
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES)

  const worker = await duckdb.createWorker(bundle.mainWorker)
  const logger = new duckdb.ConsoleLogger()

  db = new duckdb.AsyncDuckDB(logger, worker)
  await db.instantiate(bundle.mainModule)

  conn = await db.connect()

  return db
}

// メッセージハンドラー
self.onmessage = async (event) => {
  const { type, payload, id } = event.data

  try {
    switch (type) {
      case 'INIT':
        await initDuckDB()
        self.postMessage({
          id,
          type: 'INIT_SUCCESS',
          payload: { message: 'DuckDB initialized' }
        })
        break

      case 'QUERY':
        if (!conn) {
          throw new Error('DuckDB not initialized')
        }

        const result = await conn.query(payload.sql)
        const data = result.toArray()

        self.postMessage({
          id,
          type: 'QUERY_SUCCESS',
          payload: { data, rowCount: data.length }
        })
        break

      case 'INSERT_CSV':
        if (!conn) {
          throw new Error('DuckDB not initialized')
        }

        // CSVデータをテーブルに挿入
        await conn.insertCSVFromPath(payload.path, {
          name: payload.tableName,
          schema: 'main',
          ...payload.options
        })

        self.postMessage({
          id,
          type: 'INSERT_SUCCESS',
          payload: { tableName: payload.tableName }
        })
        break

      case 'CREATE_TABLE_FROM_DATA':
        if (!conn) {
          throw new Error('DuckDB not initialized')
        }

        // JavaScriptオブジェクトからテーブル作成
        await db.registerFileText(
          `${payload.tableName}.csv`,
          payload.csvContent
        )

        await conn.query(`
          CREATE OR REPLACE TABLE ${payload.tableName} AS
          SELECT * FROM read_csv_auto('${payload.tableName}.csv')
        `)

        self.postMessage({
          id,
          type: 'CREATE_TABLE_SUCCESS',
          payload: { tableName: payload.tableName }
        })
        break

      case 'LIST_TABLES':
        if (!conn) {
          throw new Error('DuckDB not initialized')
        }

        const tables = await conn.query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'main'
        `)

        self.postMessage({
          id,
          type: 'LIST_TABLES_SUCCESS',
          payload: { tables: tables.toArray() }
        })
        break

      default:
        throw new Error(`Unknown message type: ${type}`)
    }
  } catch (error) {
    self.postMessage({
      id,
      type: 'ERROR',
      payload: {
        message: error.message,
        stack: error.stack
      }
    })
  }
}

// Workerの初期化完了を通知
self.postMessage({ type: 'WORKER_READY' })
```

### 2. Worker Client の作成

`src/utils/workerClient.js` を作成：

```javascript
class DuckDBWorkerClient {
  constructor() {
    this.worker = null
    this.messageId = 0
    this.pendingMessages = new Map()
    this.isReady = false
    this.readyPromise = null
  }

  // Workerの初期化
  init() {
    if (this.readyPromise) {
      return this.readyPromise
    }

    this.readyPromise = new Promise((resolve, reject) => {
      try {
        // Web Workerを作成
        this.worker = new Worker(
          new URL('../workers/duckdb.worker.js', import.meta.url),
          { type: 'module' }
        )

        // メッセージハンドラー
        this.worker.onmessage = (event) => {
          const { type, id, payload } = event.data

          // Workerの準備完了
          if (type === 'WORKER_READY') {
            this.isReady = true
            return
          }

          // ペンディングメッセージの処理
          const pending = this.pendingMessages.get(id)
          if (!pending) return

          this.pendingMessages.delete(id)

          if (type === 'ERROR') {
            pending.reject(new Error(payload.message))
          } else {
            pending.resolve(payload)
          }
        }

        // エラーハンドラー
        this.worker.onerror = (error) => {
          console.error('Worker error:', error)
          reject(error)
        }

        // DuckDBの初期化
        setTimeout(async () => {
          try {
            await this.sendMessage('INIT', {})
            resolve()
          } catch (error) {
            reject(error)
          }
        }, 100)

      } catch (error) {
        reject(error)
      }
    })

    return this.readyPromise
  }

  // メッセージ送信
  sendMessage(type, payload) {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId

      this.pendingMessages.set(id, { resolve, reject })

      this.worker.postMessage({ type, payload, id })

      // タイムアウト設定（30秒）
      setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          this.pendingMessages.delete(id)
          reject(new Error('Message timeout'))
        }
      }, 30000)
    })
  }

  // クエリ実行
  async query(sql) {
    const result = await this.sendMessage('QUERY', { sql })
    return result.data
  }

  // CSVからテーブル作成
  async createTableFromCSV(tableName, csvContent) {
    await this.sendMessage('CREATE_TABLE_FROM_DATA', {
      tableName,
      csvContent
    })
  }

  // テーブル一覧取得
  async listTables() {
    const result = await this.sendMessage('LIST_TABLES', {})
    return result.tables
  }

  // Workerの終了
  terminate() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
      this.isReady = false
      this.readyPromise = null
    }
  }
}

// シングルトンインスタンス
let workerClient = null

export function getWorkerClient() {
  if (!workerClient) {
    workerClient = new DuckDBWorkerClient()
  }
  return workerClient
}

export function resetWorkerClient() {
  if (workerClient) {
    workerClient.terminate()
    workerClient = null
  }
}
```

### 3. React Hook の作成

`src/hooks/useDuckDB.js` を作成：

```javascript
import { useState, useEffect, useCallback } from 'react'
import { getWorkerClient } from '../utils/workerClient'

export function useDuckDB() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // 初期化
  useEffect(() => {
    let mounted = true

    async function init() {
      try {
        const client = getWorkerClient()
        await client.init()
        if (mounted) {
          setIsInitialized(true)
        }
      } catch (err) {
        if (mounted) {
          setError(err.message)
        }
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [])

  // クエリ実行
  const query = useCallback(async (sql) => {
    setIsLoading(true)
    setError(null)

    try {
      const client = getWorkerClient()
      const result = await client.query(sql)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // CSVからテーブル作成
  const createTableFromCSV = useCallback(async (tableName, csvContent) => {
    setIsLoading(true)
    setError(null)

    try {
      const client = getWorkerClient()
      await client.createTableFromCSV(tableName, csvContent)
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // テーブル一覧取得
  const listTables = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const client = getWorkerClient()
      const tables = await client.listTables()
      return tables
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isInitialized,
    isLoading,
    error,
    query,
    createTableFromCSV,
    listTables
  }
}
```

### 4. App.jsx の更新

`src/App.jsx` を更新してWeb Workerを使用：

```jsx
import { useState } from 'react'
import { useDuckDB } from './hooks/useDuckDB'
import './App.css'

function App() {
  const { isInitialized, isLoading, error, query, createTableFromCSV, listTables } = useDuckDB()
  const [result, setResult] = useState(null)
  const [sqlQuery, setSqlQuery] = useState('SELECT 42 as answer, NOW() as current_time')
  const [tables, setTables] = useState([])

  async function handleQuery() {
    try {
      const data = await query(sqlQuery)
      setResult(data)
    } catch (err) {
      console.error('Query error:', err)
    }
  }

  async function handleLoadSampleData() {
    try {
      // サンプルCSVデータ
      const csvContent = `date,product,amount
2024-01-01,Product A,1500
2024-01-02,Product B,2500
2024-01-03,Product C,800`

      await createTableFromCSV('sales', csvContent)
      alert('テーブル作成完了！')

      // テーブル一覧を更新
      const tableList = await listTables()
      setTables(tableList)
    } catch (err) {
      console.error('Load data error:', err)
    }
  }

  return (
    <div className="App">
      <h1>DuckDB + React + Web Worker</h1>
      <h2>Step 2: Web Worker確認</h2>

      {/* ステータス表示 */}
      <div className="status-box">
        <h3>ステータス</h3>
        <p>
          初期化: {isInitialized ? '✅ 完了' : '⏳ 処理中...'}
        </p>
        <p>
          ローディング: {isLoading ? '⏳ 実行中...' : '✅ 待機中'}
        </p>
        {error && <p style={{ color: 'red' }}>エラー: {error}</p>}
      </div>

      {/* サンプルデータ読み込み */}
      <div className="action-box">
        <h3>1. サンプルデータ読み込み</h3>
        <button onClick={handleLoadSampleData} disabled={!isInitialized || isLoading}>
          サンプルデータを読み込む
        </button>
        {tables.length > 0 && (
          <div>
            <p>テーブル: {tables.map(t => t.table_name).join(', ')}</p>
          </div>
        )}
      </div>

      {/* クエリエディタ */}
      <div className="query-box">
        <h3>2. SQLクエリ実行</h3>
        <textarea
          value={sqlQuery}
          onChange={(e) => setSqlQuery(e.target.value)}
          rows={5}
          style={{ width: '100%', fontFamily: 'monospace' }}
        />
        <button onClick={handleQuery} disabled={!isInitialized || isLoading}>
          クエリ実行
        </button>
      </div>

      {/* 結果表示 */}
      {result && (
        <div className="result-box">
          <h3>クエリ結果 ({result.length}行)</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <div className="info-box">
        <h3>✅ Web Workerの利点</h3>
        <ul>
          <li>メインスレッドをブロックしない</li>
          <li>UIがスムーズに動作</li>
          <li>大量データ処理も快適</li>
        </ul>
      </div>
    </div>
  )
}

export default App
```

`src/App.css` を更新：

```css
.App {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.status-box,
.action-box,
.query-box,
.result-box,
.info-box {
  border: 1px solid #ddd;
  padding: 20px;
  margin: 20px 0;
  border-radius: 8px;
}

.status-box {
  background-color: #f0f8ff;
}

.action-box {
  background-color: #f0fff0;
}

.result-box {
  background-color: #fffef0;
}

.info-box {
  background-color: #f5f5f5;
}

button {
  background-color: #4CAF50;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin: 5px;
}

button:hover:not(:disabled) {
  background-color: #45a049;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

textarea {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

pre {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  text-align: left;
}

ul {
  text-align: left;
}
```

## 🧪 動作確認

### 1. 開発サーバーの起動

```bash
npm run dev
```

### 2. 確認項目

1. **初期化確認**
   - "初期化: ✅ 完了" と表示される

2. **サンプルデータ読み込み**
   - "サンプルデータを読み込む"ボタンをクリック
   - アラート表示後、テーブル名が表示される

3. **クエリ実行**
   - デフォルトのクエリを実行
   - 結果が表示される
   - UIがフリーズしない（これがWeb Workerの利点！）

4. **カスタムクエリ**
   ```sql
   SELECT * FROM sales
   ```
   を実行して、サンプルデータが表示されることを確認

## 🎉 ステップ2完了！

以下が確認できたら次のステップへ：

- ✅ Web Workerが正常に動作
- ✅ DuckDBがWorker内で動作
- ✅ メッセージングでデータのやり取りができる
- ✅ UIがフリーズしない

## 📚 学んだこと

- ✅ Web Workerの作成と使い方
- ✅ メッセージングパターン（postMessage/onmessage）
- ✅ Promiseベースの通信
- ✅ カスタムHookの作成

## ➡️ 次のステップ

[Step 3: IndexedDBとの統合](./step3-indexeddb.md)

データをブラウザに永続化する方法を学びます。
