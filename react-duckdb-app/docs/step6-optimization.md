# Step 6: パフォーマンス最適化

## 🎯 このステップのゴール

- ストリーミング読み込み
- クエリキャッシング
- メモリ管理

## 📖 最適化テクニック

### 1. ストリーミング読み込み

大きなファイルをチャンクで読み込む：

```javascript
async function loadLargeFile(file) {
  const chunkSize = 1024 * 1024 // 1MB
  const chunks = []

  for (let offset = 0; offset < file.size; offset += chunkSize) {
    const chunk = file.slice(offset, offset + chunkSize)
    const text = await chunk.text()
    chunks.push(text)
  }

  return chunks.join('')
}
```

### 2. クエリキャッシング

同じクエリの結果をキャッシュ：

```javascript
const queryCache = new Map()

async function cachedQuery(sql) {
  if (queryCache.has(sql)) {
    return queryCache.get(sql)
  }

  const result = await query(sql)
  queryCache.set(sql, result)

  return result
}
```

### 3. 仮想スクロール

大量のデータを効率的に表示：

```jsx
import { FixedSizeList } from 'react-window'

function VirtualTable({ data }) {
  const Row = ({ index, style }) => (
    <div style={style}>{JSON.stringify(data[index])}</div>
  )

  return (
    <FixedSizeList
      height={400}
      itemCount={data.length}
      itemSize={35}
    >
      {Row}
    </FixedSizeList>
  )
}
```

### 4. メモリ管理

```javascript
// 不要なデータを削除
function cleanup() {
  queryCache.clear()
  // Workerの再起動
  resetWorkerClient()
}
```

## 📊 パフォーマンス計測

```javascript
async function measureQuery(sql) {
  const start = performance.now()
  const result = await query(sql)
  const end = performance.now()

  console.log(`実行時間: ${end - start}ms`)
  console.log(`データ量: ${result.length}行`)

  return result
}
```

## 🎉 ハンズオン完了！

お疲れ様でした！これでDuckDB + React Web Workerアプリの開発をマスターしました。

## 🚀 次のステップ

- 独自の機能を追加
- 他のデータソース（API、データベース）との統合
- プロダクションデプロイ

## 📚 参考資料

- [DuckDB WASM公式](https://duckdb.org/docs/api/wasm)
- [Web Workers詳細](https://developer.mozilla.org/ja/docs/Web/API/Web_Workers_API)
- [IndexedDB詳細](https://developer.mozilla.org/ja/docs/Web/API/IndexedDB_API)
