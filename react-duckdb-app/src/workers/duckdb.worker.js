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
