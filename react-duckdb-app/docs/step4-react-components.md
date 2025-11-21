# Step 4: Reactコンポーネントの作成

## 🎯 このステップのゴール

- 再利用可能なコンポーネント作成
- クエリエディタの実装
- 結果テーブルの実装

## 📝 実装

### QueryEditor コンポーネント

`src/components/QueryEditor.jsx`:

```jsx
import { useState } from 'react'

export function QueryEditor({ onExecute, isLoading }) {
  const [sql, setSql] = useState('SELECT * FROM sales LIMIT 10')

  const sampleQueries = [
    {
      name: '全データ',
      sql: 'SELECT * FROM sales'
    },
    {
      name: 'カテゴリ別集計',
      sql: 'SELECT category, SUM(amount) as total, COUNT(*) as count FROM sales GROUP BY category'
    },
    {
      name: '日別売上',
      sql: 'SELECT date, SUM(amount) as daily_sales FROM sales GROUP BY date ORDER BY date'
    }
  ]

  return (
    <div className="query-editor">
      <h3>SQLクエリエディタ</h3>

      <div className="sample-queries">
        {sampleQueries.map((q, i) => (
          <button
            key={i}
            onClick={() => setSql(q.sql)}
            disabled={isLoading}
          >
            {q.name}
          </button>
        ))}
      </div>

      <textarea
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        rows={6}
        placeholder="SQLクエリを入力..."
      />

      <button
        onClick={() => onExecute(sql)}
        disabled={isLoading}
        className="execute-btn"
      >
        {isLoading ? '実行中...' : 'クエリ実行'}
      </button>
    </div>
  )
}
```

### ResultsTable コンポーネント

`src/components/ResultsTable.jsx`:

```jsx
export function ResultsTable({ data }) {
  if (!data || data.length === 0) {
    return <div className="no-data">データがありません</div>
  }

  const columns = Object.keys(data[0])

  return (
    <div className="results-table">
      <h3>クエリ結果 ({data.length}行)</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col}>{String(row[col])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

### DataUploader コンポーネント

`src/components/DataUploader.jsx`:

```jsx
import { useState } from 'react'
import Papa from 'papaparse'

export function DataUploader({ onUpload }) {
  const [isDragging, setIsDragging] = useState(false)

  function handleFile(file) {
    Papa.parse(file, {
      complete: (results) => {
        const csvContent = Papa.unparse(results.data)
        const tableName = file.name.replace('.csv', '')
        onUpload(tableName, csvContent)
      },
      header: true
    })
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) {
      handleFile(file)
    }
  }

  return (
    <div
      className={`data-uploader ${isDragging ? 'dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <p>CSVファイルをドラッグ＆ドロップ</p>
      <input
        type="file"
        accept=".csv"
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </div>
  )
}
```

## ➡️ 次のステップ

[Step 5: データ分析ダッシュボード](./step5-dashboard.md)
