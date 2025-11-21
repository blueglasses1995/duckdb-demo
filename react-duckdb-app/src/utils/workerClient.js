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
