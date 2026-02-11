import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

let db = null;
let conn = null;

const MANUAL_BUNDLES = {
  mvp: {
    mainModule: duckdb_wasm,
    mainWorker: mvp_worker,
  },
  eh: {
    mainModule: duckdb_wasm_eh,
    mainWorker: eh_worker,
  },
};

/** DuckDB-WASMを初期化して接続を作成する */
export async function initDuckDB() {
  if (db !== null && conn !== null) {
    return;
  }

  const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
  const worker = new Worker(bundle.mainWorker);
  const logger = new duckdb.ConsoleLogger();
  db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  conn = await db.connect();
}

/** SQLクエリを実行してJSオブジェクト配列を返す */
export async function query(sql) {
  if (!conn) {
    throw new Error('DuckDB is not initialized. Call initDuckDB() first.');
  }
  const result = await conn.query(sql);
  return arrowToJS(result);
}

/**
 * Arrow Table を plain JS オブジェクト配列に変換
 *
 * DuckDB-WASM が返す Apache Arrow の値を JS primitive に正規化する。
 * Arrow TypeId (apache-arrow/enum.d.ts):
 *   2=Int, 3=Float, 5=Utf8, 7=Decimal, 8=Date, 10=Timestamp
 *
 * 注意点:
 * - Date (typeId=8) は epoch ミリ秒の number で返る (bigint ではない)
 * - SUM() 等の集約は HUGEINT → Arrow Decimal (typeId=7) → object で返る
 * - BigInt は Int64 カラムで返る
 */
function arrowToJS(table) {
  const fields = table.schema.fields;
  const rows = table.toArray();

  return rows.map(row => {
    const obj = {};
    for (const field of fields) {
      const name = field.name;
      let val = row[name];

      // null / undefined はそのまま保持 (Number(null)=0 になるのを防ぐ)
      if (val === null || val === undefined) {
        obj[name] = null;
        continue;
      }

      const typeId = field.type.typeId;

      if (typeId === 8) {
        // Date: epoch ミリ秒 → 日付文字列
        obj[name] = new Date(Number(val)).toISOString().split('T')[0];
      } else if (typeId === 10) {
        // Timestamp: DuckDB は通常マイクロ秒
        obj[name] = new Date(Number(val) / 1000).toISOString().replace('T', ' ').slice(0, 19);
      } else if (typeId === 7) {
        // Decimal (HUGEINT): object として返る → Number に変換
        obj[name] = Number(val);
      } else if (typeof val === 'bigint') {
        obj[name] = Number(val);
      } else if (val instanceof Date) {
        obj[name] = val.toISOString().split('T')[0];
      } else {
        obj[name] = val;
      }
    }
    return obj;
  });
}

/** バイナリファイルをDuckDBに登録する（Parquetなど） */
export async function registerFile(name, buffer) {
  if (!db) {
    throw new Error('DuckDB is not initialized. Call initDuckDB() first.');
  }
  await db.registerFileBuffer(name, new Uint8Array(buffer));
}

/** テキストファイルをDuckDBに登録する（CSV文字列など） */
export async function registerFileText(name, text) {
  if (!db) {
    throw new Error('DuckDB is not initialized. Call initDuckDB() first.');
  }
  await db.registerFileText(name, text);
}

/** 初期化済みかどうかを返す */
export function isInitialized() {
  return db !== null && conn !== null;
}
