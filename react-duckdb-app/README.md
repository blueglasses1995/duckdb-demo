# DuckDB + React Web Worker ハンズオン

DuckDB WASMをWeb Worker、IndexedDBと組み合わせて動かすReactアプリを作成するハンズオン教材です。

## 🎯 学習目標

このハンズオンを通じて以下を習得します：

- ✅ DuckDB WASMの基本的な使い方
- ✅ Web Workerでのバックグラウンド処理
- ✅ IndexedDBへのデータ永続化
- ✅ Reactとの統合
- ✅ 実践的なデータ分析ダッシュボードの構築

## 📚 前提知識

- JavaScript/TypeScriptの基礎
- Reactの基本（useState、useEffectなど）
- 非同期処理（Promise、async/await）

## 🏗️ 完成イメージ

ブラウザ上で動作する高速データ分析ダッシュボード：

- 大規模CSVファイルの読み込みと分析
- メインスレッドをブロックしないバックグラウンド処理
- IndexedDBによるデータの永続化
- リアルタイムなクエリ実行と可視化

## 📖 ハンズオンの流れ

### [Step 1: プロジェクトセットアップ](./docs/step1-setup.md)
- Vite + Reactプロジェクトの作成
- DuckDB WASMのインストール
- 開発環境の構築

### [Step 2: Web Workerの作成](./docs/step2-web-worker.md)
- Web Workerの基礎
- DuckDB WASMの初期化
- メッセージングパターンの実装

### [Step 3: IndexedDBとの統合](./docs/step3-indexeddb.md)
- IndexedDBの基本
- DuckDBとIndexedDBの連携
- データの永続化と読み込み

### [Step 4: Reactコンポーネントの作成](./docs/step4-react-components.md)
- カスタムフックの作成
- クエリ実行UIの実装
- 結果表示コンポーネント

### [Step 5: データ分析ダッシュボード](./docs/step5-dashboard.md)
- CSVファイルのアップロード
- データ可視化（チャート）
- 実践的なクエリ例

### [Step 6: パフォーマンス最適化](./docs/step6-optimization.md)
- ストリーミング読み込み
- クエリキャッシング
- メモリ管理

## 🚀 クイックスタート

```bash
# プロジェクト作成（ハンズオン完成版）
cd react-duckdb-app

# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev
```

ブラウザで http://localhost:5173 を開く

## 📁 プロジェクト構造

```
react-duckdb-app/
├── docs/                  # ハンズオンドキュメント
│   ├── step1-setup.md
│   ├── step2-web-worker.md
│   ├── step3-indexeddb.md
│   ├── step4-react-components.md
│   ├── step5-dashboard.md
│   └── step6-optimization.md
│
├── src/
│   ├── workers/           # Web Worker
│   │   └── duckdb.worker.js
│   │
│   ├── hooks/             # カスタムフック
│   │   └── useDuckDB.js
│   │
│   ├── components/        # Reactコンポーネント
│   │   ├── QueryEditor.jsx
│   │   ├── ResultsTable.jsx
│   │   ├── DataUploader.jsx
│   │   └── Dashboard.jsx
│   │
│   ├── utils/             # ユーティリティ
│   │   ├── indexedDB.js
│   │   └── workerClient.js
│   │
│   ├── App.jsx
│   └── main.jsx
│
├── public/
│   └── sample-data/       # サンプルデータ
│
├── package.json
├── vite.config.js
└── README.md
```

## 🔧 技術スタック

| 技術 | 用途 |
|------|------|
| React | UI フレームワーク |
| Vite | ビルドツール |
| DuckDB WASM | データベースエンジン |
| Web Worker | バックグラウンド処理 |
| IndexedDB | ブラウザストレージ |
| Chart.js | データ可視化 |

## 💡 主要な概念

### DuckDB WASM

WebAssembly版のDuckDB。ブラウザ上で高速なSQL処理が可能。

```javascript
import * as duckdb from '@duckdb/duckdb-wasm';

const db = await duckdb.AsyncDuckDB.create();
const conn = await db.connect();
const result = await conn.query('SELECT * FROM data');
```

### Web Worker

メインスレッドとは別のスレッドで処理を実行。

```javascript
// worker.js
self.onmessage = async (event) => {
  const result = await processData(event.data);
  self.postMessage(result);
};

// main.js
const worker = new Worker('worker.js');
worker.postMessage({ query: 'SELECT * FROM table' });
worker.onmessage = (event) => console.log(event.data);
```

### IndexedDB

ブラウザ内のデータベース。大量データの保存が可能。

```javascript
// データ保存
await db.put('myStore', data, 'key1');

// データ取得
const data = await db.get('myStore', 'key1');
```

## 🎓 ハンズオンの進め方

### 1. 順番に学習

Step 1から順番に進めてください。各ステップは前のステップの知識を前提としています。

### 2. 実際にコードを書く

コピー＆ペーストだけでなく、自分でコードを書いて理解を深めましょう。

### 3. 動作確認

各ステップで実際にアプリを動かして動作を確認しましょう。

### 4. カスタマイズ

基本を理解したら、独自の機能を追加してみましょう。

## 📝 学習チェックリスト

- [ ] Step 1: プロジェクトをセットアップできた
- [ ] Step 2: Web Workerを作成し、メッセージのやり取りができた
- [ ] Step 3: IndexedDBにデータを保存・取得できた
- [ ] Step 4: Reactコンポーネントからクエリを実行できた
- [ ] Step 5: データ分析ダッシュボードを完成させた
- [ ] Step 6: パフォーマンス最適化を理解した

## 🔗 参考資料

- [DuckDB WASM公式ドキュメント](https://duckdb.org/docs/api/wasm/overview.html)
- [Web Workers API](https://developer.mozilla.org/ja/docs/Web/API/Web_Workers_API)
- [IndexedDB API](https://developer.mozilla.org/ja/docs/Web/API/IndexedDB_API)
- [React公式ドキュメント](https://ja.react.dev/)

## 🤝 トラブルシューティング

### DuckDBが初期化できない

```bash
# CORSエラーの場合
npm run dev -- --host
```

### Web Workerが動かない

- ブラウザの開発者ツールでエラーを確認
- `type: 'module'` が指定されているか確認

### IndexedDBにデータが保存されない

- ブラウザのストレージ容量を確認
- プライベートモード/シークレットモードでは制限あり

## 📧 フィードバック

改善提案やバグ報告は Issue でお願いします。

---

**Let's build amazing data analytics apps in the browser! 🚀**
