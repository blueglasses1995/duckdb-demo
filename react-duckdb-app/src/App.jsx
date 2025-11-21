import { useState } from 'react'
import { useDuckDB } from './hooks/useDuckDB'
import './App.css'

function App() {
  const { isInitialized, isLoading, error, query, createTableFromCSV } = useDuckDB()
  const [result, setResult] = useState(null)
  const [sqlQuery, setSqlQuery] = useState('SELECT 42 as answer, NOW() as current_time')

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
      const csvContent = `date,product,category,amount,quantity
2024-01-01,Product A,Electronics,1500,3
2024-01-01,Product B,Furniture,2500,1
2024-01-02,Product C,Electronics,800,2
2024-01-02,Product A,Electronics,1500,3
2024-01-03,Product D,Clothing,450,5`

      await createTableFromCSV('sales', csvContent)
      alert('サンプルデータを読み込みました！\n\nSQLクエリ例:\nSELECT * FROM sales')
    } catch (err) {
      console.error('Load data error:', err)
    }
  }

  return (
    <div className="App">
      <h1>🦆 DuckDB + React + Web Worker</h1>
      <p className="subtitle">ブラウザで動くSQL分析エンジン</p>

      {/* ステータス */}
      <div className="status-box">
        <div className="status-item">
          <span className="label">初期化:</span>
          <span className={isInitialized ? 'status-ok' : 'status-pending'}>
            {isInitialized ? '✅ 完了' : '⏳ 処理中...'}
          </span>
        </div>
        <div className="status-item">
          <span className="label">状態:</span>
          <span className={isLoading ? 'status-pending' : 'status-ok'}>
            {isLoading ? '⏳ 実行中...' : '✅ 待機中'}
          </span>
        </div>
        {error && (
          <div className="error-message">
            ❌ エラー: {error}
          </div>
        )}
      </div>

      {/* アクション */}
      <div className="action-section">
        <h2>1. サンプルデータ読み込み</h2>
        <button
          onClick={handleLoadSampleData}
          disabled={!isInitialized || isLoading}
          className="primary-button"
        >
          📊 サンプルデータを読み込む
        </button>
      </div>

      {/* クエリエディタ */}
      <div className="query-section">
        <h2>2. SQLクエリを実行</h2>
        <div className="sample-queries">
          <button onClick={() => setSqlQuery('SELECT * FROM sales')}>
            全データ表示
          </button>
          <button onClick={() => setSqlQuery('SELECT category, SUM(amount) as total FROM sales GROUP BY category')}>
            カテゴリ別集計
          </button>
          <button onClick={() => setSqlQuery('SELECT date, SUM(amount) as daily_sales FROM sales GROUP BY date ORDER BY date')}>
            日別売上
          </button>
        </div>
        <textarea
          value={sqlQuery}
          onChange={(e) => setSqlQuery(e.target.value)}
          rows={5}
          placeholder="SQLクエリを入力..."
          disabled={!isInitialized}
        />
        <button
          onClick={handleQuery}
          disabled={!isInitialized || isLoading}
          className="execute-button"
        >
          {isLoading ? '⏳ 実行中...' : '▶️ クエリ実行'}
        </button>
      </div>

      {/* 結果表示 */}
      {result && result.length > 0 && (
        <div className="result-section">
          <h2>📋 クエリ結果 ({result.length}行)</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {Object.keys(result[0]).map(col => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.map((row, i) => (
                  <tr key={i}>
                    {Object.keys(result[0]).map(col => (
                      <td key={col}>{String(row[col])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 説明 */}
      <div className="info-box">
        <h3>🎓 このアプリについて</h3>
        <ul>
          <li><strong>DuckDB WASM</strong>: ブラウザで動くSQL分析エンジン</li>
          <li><strong>Web Worker</strong>: バックグラウンドでクエリ実行（UIがフリーズしない）</li>
          <li><strong>React</strong>: モダンなUIフレームワーク</li>
        </ul>
      </div>
    </div>
  )
}

export default App
