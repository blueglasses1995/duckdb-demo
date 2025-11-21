# Step 5: データ分析ダッシュボード

## 🎯 このステップのゴール

- 完全なダッシュボードアプリの完成
- データ可視化の実装
- 実践的なクエリ例

## 📝 実装

### Dashboard コンポーネント

`src/components/Dashboard.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { useDuckDB } from '../hooks/useDuckDB'
import { QueryEditor } from './QueryEditor'
import { ResultsTable } from './ResultsTable'
import { DataUploader } from './DataUploader'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

export function Dashboard() {
  const { isInitialized, isLoading, query, createTableFromCSV } = useDuckDB()
  const [result, setResult] = useState(null)
  const [chartData, setChartData] = useState(null)

  async function handleExecute(sql) {
    const data = await query(sql)
    setResult(data)

    // チャート用データ変換
    if (data.length > 0 && data.length < 50) {
      setChartData(data)
    }
  }

  async function handleUpload(tableName, csvContent) {
    await createTableFromCSV(tableName, csvContent)
    alert(`テーブル "${tableName}" を作成しました！`)
  }

  if (!isInitialized) {
    return <div>初期化中...</div>
  }

  return (
    <div className="dashboard">
      <h1>🦆 DuckDB データ分析ダッシュボード</h1>

      <DataUploader onUpload={handleUpload} />

      <QueryEditor onExecute={handleExecute} isLoading={isLoading} />

      {chartData && chartData.length > 0 && (
        <div className="chart-container">
          <h3>可視化</h3>
          <BarChart width={600} height={300} data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={Object.keys(chartData[0])[0]} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={Object.keys(chartData[0])[1]} fill="#8884d8" />
          </BarChart>
        </div>
      )}

      {result && <ResultsTable data={result} />}
    </div>
  )
}
```

## 🎉 完成！

実践的なデータ分析ダッシュボードが完成しました！

## ➡️ 次のステップ

[Step 6: パフォーマンス最適化](./step6-optimization.md)
