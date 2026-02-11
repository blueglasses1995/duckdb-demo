# DuckDB WASM Demo App 設計

## 概要

ブラウザ上で DuckDB WASM を動かすデモアプリ。Vite + vanilla JS 構成。
DuckDB の分析力（ウィンドウ関数、ROLLUP、QUALIFY、Parquet対応）を体験できる。

## 目的

- DuckDB の強みを体験できるデモ
- Vanilla JS / Web Worker / WASM の関係を理解する教材
- npm 経由で @duckdb/duckdb-wasm を組み込むパターンの学習

## 技術スタック

| 技術 | 用途 |
|------|------|
| Vite | ビルドツール |
| vanilla JS | UI。フレームワークなし |
| @duckdb/duckdb-wasm | DuckDB 本体（npm） |
| Chart.js | グラフ描画（最小限、必要になれば追加） |

## アーキテクチャ

```
ブラウザのメインスレッド                   別スレッド
┌─────────────────────┐              ┌──────────────────┐
│  main.js             │   ← async →  │  Web Worker       │
│  duckdb-client.js    │              │  (ライブラリが生成)  │
│  - selectBundle()    │              │                   │
│  - createWorker()  ──┼─── 生成 ───→ │  DuckDB WASM本体   │
│  - instantiate()   ──┼─── fetch ──→ │  (.wasm バイナリ)   │
│  - conn.query()    ──┼─── msg ───→  │  ← ここでSQL実行   │
│                      │              │                   │
│  ui.js               │              └──────────────────┘
│  - DOM操作はここだけ   │
└─────────────────────┘
```

- Worker は自分で書かない。duckdb-wasm のライブラリが内部で生成する
- WASM バイナリのフェッチもライブラリが行う
- 自分が書くのは「初期化」「クエリ送信」「結果の DOM 反映」のみ

## ディレクトリ構成

```
duckdb-wasm-demo/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.js            # エントリポイント。DuckDB初期化 + UIイベント接続
│   ├── duckdb-client.js   # duckdb-wasm の初期化・クエリ実行を薄くラップ
│   ├── ui.js              # DOM操作（結果テーブル描画、ファイルアップロード等）
│   └── style.css
└── public/
    └── sample-sales.csv   # プリロード用サンプルデータ
```

## 機能

### タブ構成

```
[SQLエディタ]  [売上ダッシュボード]
```

### 1. SQLエディタ + 結果表示

- textarea に SQL 入力、実行ボタンまたは Ctrl+Enter で実行
- 結果を table で描画。行数と実行時間を表示
- プリセットボタンでよく使うクエリをワンクリック挿入

### 2. ファイル読み込み（CSV / Parquet）

- input type="file" で選択。ドラッグ&ドロップも対応
- db.registerFileBuffer() で DuckDB に登録し、read_csv_auto() / read_parquet() でテーブル化
- 読み込んだテーブル名を一覧表示

### 3. サンプルデータ

- ボタン1つで public/sample-sales.csv を読み込み
- 売上データ（date, product, category, amount, quantity）100行程度
- プリセットクエリがこのデータに対応

### 4. 売上ダッシュボード（DuckDB の強みを見せる）

DuckDB SQL で算出する分析パネル:

1. 月別売上推移 + 移動平均線
   - `AVG() OVER (ROWS 2 PRECEDING)`
2. カテゴリ別売上（ROLLUP 付き）
   - `GROUP BY ROLLUP(category, month)` で小計・総計
3. 前月比の変化率
   - `LAG()` ウィンドウ関数
4. トップ商品ランキング（QUALIFY 付き）
   - `RANK() OVER (...) QUALIFY rank <= 5`

可視化は table ベース + 数値ハイライト。必要に応じて Chart.js を追加。

## SQLiteとの差別化ポイント

| 機能 | SQLite | DuckDB |
|------|--------|--------|
| Parquet 読み込み | 不可 | read_parquet() |
| ROLLUP / CUBE | なし | あり |
| QUALIFY 句 | なし | あり |
| SAMPLE 句 | なし | あり |
| 列指向集計 | 遅い（行指向） | 高速（列指向） |
| ファイル直接クエリ | 不可 | read_csv_auto() |

## 既存 react-duckdb-app との関係

- 別ディレクトリ（duckdb-wasm-demo/）に新規作成
- react-duckdb-app はハンズオン教材としてそのまま残す
- React / カスタム Web Worker は使わない
