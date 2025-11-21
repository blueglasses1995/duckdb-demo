# Step 3: IndexedDBとの統合

## 🎯 このステップのゴール

- IndexedDBの基本を理解
- DuckDBのデータをIndexedDBに保存
- ページリロード後もデータを保持

## 📖 IndexedDBとは

ブラウザ内の大容量ストレージ。リロードしてもデータが残ります。

## 📝 実装

### IndexedDBヘルパーの作成

`src/utils/indexedDB.js`:

```javascript
const DB_NAME = 'DuckDBStorage'
const STORE_NAME = 'tables'
const DB_VERSION = 1

class IndexedDBHelper {
  constructor() {
    this.db = null
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'tableName' })
        }
      }
    })
  }

  async saveTable(tableName, data) {
    const transaction = this.db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    await store.put({
      tableName,
      data,
      timestamp: Date.now()
    })
  }

  async getTable(tableName) {
    const transaction = this.db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.get(tableName)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async listTables() {
    const transaction = this.db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.getAllKeys()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async deleteTable(tableName) {
    const transaction = this.db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    await store.delete(tableName)
  }
}

export const indexedDB = new IndexedDBHelper()
```

## 🧪 動作確認

1. データをIndexedDBに保存
2. ページリロード
3. データが復元される

## ➡️ 次のステップ

[Step 4: Reactコンポーネントの作成](./step4-react-components.md)
