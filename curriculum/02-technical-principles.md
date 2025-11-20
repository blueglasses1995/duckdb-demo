# 02. 技術的原理

このセクションでは、DuckDBの核となる技術的原理を深く理解します。

## 🏛️ 1. 列指向ストレージ（Columnar Storage）

### 行指向 vs 列指向

**行指向（Row-Oriented）- 従来のデータベース**
```
メモリ上のデータ配置:
[ID:1, Name:"Alice", Age:30, Salary:50000]
[ID:2, Name:"Bob", Age:25, Salary:45000]
[ID:3, Name:"Carol", Age:35, Salary:60000]
```

**列指向（Column-Oriented）- DuckDB**
```
メモリ上のデータ配置:
ID列:     [1, 2, 3]
Name列:   ["Alice", "Bob", "Carol"]
Age列:    [30, 25, 35]
Salary列: [50000, 45000, 60000]
```

### なぜ列指向が速いのか

#### 理由1: 必要な列だけ読み込む
```sql
SELECT AVG(salary) FROM employees;
```
- **行指向**: 全ての列（ID, Name, Age, Salary）を読み込む
- **列指向**: Salary列だけを読み込む → **I/Oが大幅削減**

#### 理由2: 圧縮効率が高い
同じデータ型が連続するため、圧縮効率が高い：
```
Age列: [30, 25, 35, 30, 25, ...]
→ Run-Length Encoding, Dictionary Encoding などが効果的
```

#### 理由3: CPU キャッシュ効率
- 同じ型のデータが連続
- CPUのSIMD命令を活用可能
- キャッシュミスが少ない

### 実際の性能差

```python
# 1億行のデータで集計クエリ
# 行指向DB: 10秒
# 列指向DB (DuckDB): 0.5秒
# → 20倍高速！
```

---

## ⚡ 2. ベクトル化実行（Vectorized Execution）

### 従来の行ごと処理（Row-at-a-Time）

```python
# 疑似コード: 従来の処理
for row in table:
    result = process(row)  # 1行ずつ処理
    # 関数呼び出しのオーバーヘッドが大きい
```

### ベクトル化処理（Vectorized Execution）

```python
# 疑似コード: ベクトル化処理
for batch in table.batches(size=1024):  # 1024行単位
    results = process_batch(batch)  # バッチ処理
    # 関数呼び出しが1/1024に削減
```

### ベクトル化のメリット

#### 1. **関数呼び出しオーバーヘッド削減**
```
従来: 100万回の関数呼び出し
ベクトル化: 約1000回の関数呼び出し (バッチサイズ1024の場合)
```

#### 2. **SIMD命令の活用**
CPUのSIMD（Single Instruction, Multiple Data）命令を利用：
```
通常の加算: 1回の命令で1つの計算
SIMD加算: 1回の命令で4〜8個の計算を同時実行
```

#### 3. **パイプライン効率化**
```
CPU Pipeline:
[Fetch] → [Decode] → [Execute] → [Write]

バッチ処理により、パイプラインストールが削減される
```

### DuckDBのベクトルサイズ

DuckDBはデフォルトで**2048要素**のベクトルを使用：
- L1キャッシュに収まるサイズ
- メモリアクセスの最適化
- 並列処理との良いバランス

---

## 🔧 3. クエリ最適化エンジン

### クエリ実行の流れ

```
SQL文字列
   ↓
[Parser] - 構文解析
   ↓
[Binder] - 名前解決・型チェック
   ↓
[Optimizer] - 最適化
   ↓
[Physical Plan] - 実行計画
   ↓
[Execution Engine] - 実行
   ↓
結果
```

### 主要な最適化技術

#### 1. **述語下押し（Predicate Pushdown）**
```sql
SELECT * FROM (SELECT * FROM large_table) WHERE id = 100;
```
最適化後:
```sql
SELECT * FROM large_table WHERE id = 100;
-- フィルタをできるだけ早く適用
```

#### 2. **プロジェクション下押し（Projection Pushdown）**
```sql
SELECT name FROM (SELECT * FROM users) t;
```
最適化後:
```sql
SELECT name FROM users;
-- 必要な列だけ読み込む
```

#### 3. **結合順序の最適化**
```sql
SELECT * FROM a JOIN b JOIN c;
```
DuckDBは自動的に最適な結合順序を選択：
- 小さいテーブルを先に処理
- 選択性の高いフィルタを優先

#### 4. **並列実行**
```
Query Plan:
    Scan Table (4 threads)
        ↓
    Filter (4 threads)
        ↓
    Aggregate (4 threads)
        ↓
    Final Result
```

---

## 💾 4. メモリ管理

### ストリーミング処理

DuckDBはメモリより大きなデータも処理可能：

```python
# 100GBのParquetファイルを8GBのメモリで処理
con.execute("""
    SELECT year, SUM(amount)
    FROM 'huge_file.parquet'
    GROUP BY year
""")
# 自動的にディスクを使用（スピルアウト）
```

### メモリ制限の設定

```python
import duckdb

con = duckdb.connect()
con.execute("SET memory_limit='4GB'")
con.execute("SET temp_directory='/tmp/duckdb'")
```

---

## 📊 5. データ圧縮

### 列指向圧縮技術

#### 1. **Dictionary Encoding**
```
元データ: ["Apple", "Banana", "Apple", "Cherry", "Banana", "Apple"]
辞書: {0: "Apple", 1: "Banana", 2: "Cherry"}
圧縮後: [0, 1, 0, 2, 1, 0]
```

#### 2. **Run-Length Encoding (RLE)**
```
元データ: [5, 5, 5, 5, 3, 3, 7, 7, 7]
圧縮後: [(5, 4), (3, 2), (7, 3)]  # (値, 繰り返し回数)
```

#### 3. **Bit Packing**
```
元データ: [1, 2, 3, 4, 5]  # 最大値が5なので3ビットで表現可能
通常: 32bit × 5 = 160 bits
圧縮後: 3bit × 5 = 15 bits
```

#### 4. **Frame of Reference**
```
元データ: [1000, 1001, 1002, 1003]
基準値: 1000
差分: [0, 1, 2, 3]  # 小さな数値になり圧縮しやすい
```

---

## 🔄 6. トランザクション処理（MVCC）

DuckDBは**MVCC（Multi-Version Concurrency Control）**を採用：

### MVCCの仕組み

```
時刻  |  データの状態
-----|------------------
t0   |  [Row v1]
t1   |  [Row v1] [Row v2]  ← 更新時に新バージョン作成
t2   |  [Row v2] [Row v3]

古いトランザクションはv1を参照
新しいトランザクションはv3を参照
```

### 特徴
- **読み取りがブロックされない**
- **書き込み競合は少ない**（分析用途向け）
- **スナップショット分離レベル**

---

## 🚀 7. 並列処理アーキテクチャ

### スレッドベースの並列化

```
         Main Thread
              ↓
    ┌─────────┴─────────┐
Worker-1  Worker-2  Worker-3  Worker-4
    ↓         ↓         ↓         ↓
[Chunk 1] [Chunk 2] [Chunk 3] [Chunk 4]
```

### 自動並列化

```sql
SELECT category, SUM(sales)
FROM large_table
GROUP BY category;
```

DuckDBは自動的に：
1. テーブルをチャンクに分割
2. 各ワーカーが並列集計
3. 最終結果をマージ

### スレッド数の制御

```python
con = duckdb.connect()
con.execute("SET threads=4")  # 4スレッドに制限
```

---

## 🎯 8. ゼロコピー統合

### Apache Arrowとの統合

DuckDBとArrowは同じメモリレイアウトを使用：

```python
import duckdb
import pyarrow as pa

# Arrow → DuckDB (コピーなし!)
arrow_table = pa.table({'a': [1, 2, 3]})
result = duckdb.query("SELECT * FROM arrow_table")

# DuckDB → Arrow (コピーなし!)
arrow_result = result.arrow()
```

### メリット
- **メモリコピー不要** → 高速
- **メモリ使用量削減**
- **シームレスなデータ交換**

---

## 📈 性能特性まとめ

| 技術 | 効果 | 性能向上 |
|------|------|---------|
| 列指向ストレージ | I/O削減 | 5-100倍 |
| ベクトル化実行 | CPU効率化 | 2-10倍 |
| 並列処理 | マルチコア活用 | コア数に比例 |
| 圧縮 | I/O削減 | 2-5倍 |
| クエリ最適化 | 処理削減 | 2-100倍 |

**総合で従来のDBより10-1000倍高速なケースも**

---

## 🎓 次のステップ

技術的原理を理解したら、実際の機能を一つずつ学んでいきましょう。

次は [03. In-Process Database（組み込み型データベース）](./03-in-process-database.md) から始めます。

---

**キーポイント**:
- **列指向ストレージ**: 分析クエリで圧倒的に高速
- **ベクトル化実行**: CPUを効率的に活用
- **自動最適化**: ユーザーは意識せず最適な性能を得られる
- **ゼロコピー統合**: 他のツールとシームレスに連携
