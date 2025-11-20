# 04. 列指向ストレージ（Columnar Storage）

## 📖 概要

**列指向ストレージ**は、データを行ではなく列単位で保存する方式です。DuckDBの高速性を支える最も重要な技術の一つです。

従来の行指向データベースでは1行のすべての列をまとめて保存しますが、列指向では同じ列の値を連続して保存します。

---

## ✅ メリット

### 1. **分析クエリで圧倒的に高速**
```sql
SELECT AVG(salary) FROM employees;
```
- **行指向**: 全ての列を読み込む必要がある
- **列指向**: salary列だけを読み込む → **I/Oが10-100分の1**

### 2. **圧縮効率が高い**
- 同じ型のデータが連続するため圧縮しやすい
- **圧縮率5-10倍も珍しくない**
- ストレージコスト削減

### 3. **CPUキャッシュ効率が良い**
- 同じ型のデータが連続
- CPUのキャッシュヒット率向上
- SIMD命令を効果的に活用

### 4. **必要な列だけ読み込む（Projection Pushdown）**
```sql
SELECT name, email FROM users;  -- id, created_atなどは読まない
```

### 5. **メモリ使用量削減**
- 必要な列だけメモリに読み込む
- 大規模データも扱いやすい

---

## ❌ デメリット

### 1. **行の挿入・更新が遅い**
- 複数の列を更新する必要がある
- トランザクション処理には不向き

### 2. **全列取得は遅い**
```sql
SELECT * FROM large_table;  -- 全列を個別に読み込む必要がある
```

### 3. **ランダムアクセスが苦手**
```sql
SELECT * FROM users WHERE id = 123;  -- 単一行の取得
```

### 4. **小規模データではオーバーヘッド**
- 数百行程度のデータでは行指向の方が速い場合も

---

## 🔧 技術的原理

### データレイアウトの比較

#### 行指向ストレージ（Row-Oriented）

```
メモリ/ディスク上の配置:
┌──────────────────────────────────────────┐
│ [1, "Alice", 30, 50000]                   │
│ [2, "Bob",   25, 45000]                   │
│ [3, "Carol", 35, 60000]                   │
└──────────────────────────────────────────┘
  id  name    age  salary
```

**特徴**:
- 1行のデータが連続して配置される
- 行の挿入・更新が高速
- 全列アクセスが高速

#### 列指向ストレージ（Column-Oriented）

```
メモリ/ディスク上の配置:
┌──────────────────────────────────────────┐
│ ID列:     [1, 2, 3]                       │
│ Name列:   ["Alice", "Bob", "Carol"]       │
│ Age列:    [30, 25, 35]                    │
│ Salary列: [50000, 45000, 60000]           │
└──────────────────────────────────────────┘
```

**特徴**:
- 同じ列の値が連続して配置される
- 列単位のアクセスが高速
- 圧縮効率が高い

### なぜ分析クエリで速いのか

#### 例: 給与の平均を計算

```sql
SELECT AVG(salary) FROM employees;  -- 100万行
```

**行指向の場合**:
```
読み込むデータ:
[1, "Alice", 30, 50000]    ← 全列読み込み（16KB）
[2, "Bob",   25, 45000]    ← 全列読み込み（16KB）
...
合計: 100万行 × 16KB = 16GB
```

**列指向の場合**:
```
読み込むデータ:
Salary列: [50000, 45000, 60000, ...]
合計: 100万行 × 4Bytes = 4MB（16GBの1/4000！）
```

### 圧縮技術

列指向は以下の圧縮技術が効果的：

#### 1. **辞書エンコーディング（Dictionary Encoding）**
```
元データ: ["Male", "Female", "Male", "Male", "Female"]
辞書: {0: "Male", 1: "Female"}
圧縮後: [0, 1, 0, 0, 1]

5 strings → 5 integers（大幅にサイズ削減）
```

#### 2. **Run-Length Encoding（RLE）**
```
元データ: [5, 5, 5, 5, 3, 3, 7, 7, 7]
圧縮後: [(5, count=4), (3, count=2), (7, count=3)]
```

#### 3. **ビットパッキング（Bit Packing）**
```
元データ: [1, 2, 3, 4, 5]  # 最大値5 → 3ビットで表現可能
通常: 32bit × 5 = 160 bits
圧縮: 3bit × 5 = 15 bits（約10倍の圧縮）
```

#### 4. **Frame of Reference**
```
元データ: [1000, 1001, 1002, 1003]
基準値(Frame): 1000
差分: [0, 1, 2, 3]  # 小さな値になり圧縮しやすい
```

### DuckDBの列ストレージ実装

DuckDBは**行グループ（Row Groups）**という単位でデータを管理：

```
Table
  ├─ Row Group 1 (122,880行)
  │   ├─ Column 1: [compressed data]
  │   ├─ Column 2: [compressed data]
  │   └─ Column 3: [compressed data]
  │
  ├─ Row Group 2 (122,880行)
  │   ├─ Column 1: [compressed data]
  │   └─ ...
  └─ ...
```

**行グループのサイズ**: デフォルト122,880行
- 並列処理に適したサイズ
- メモリに収まるサイズ
- 圧縮効率とアクセス速度のバランス

---

## 💼 ユースケース

### 1. **集計クエリ**
```python
import duckdb

con = duckdb.connect()

# 大規模な売上データの集計
result = con.execute("""
    SELECT
        product_category,
        SUM(sales_amount) as total_sales,
        AVG(sales_amount) as avg_sales,
        COUNT(*) as transaction_count
    FROM 'sales_data.parquet'
    GROUP BY product_category
    ORDER BY total_sales DESC
""").fetchall()
```
→ 列指向により、必要な列（product_category, sales_amount）だけを高速に読み込み

### 2. **時系列分析**
```python
# ログデータの時系列分析
result = con.execute("""
    SELECT
        DATE_TRUNC('hour', timestamp) as hour,
        COUNT(*) as event_count,
        COUNT(DISTINCT user_id) as unique_users
    FROM 'logs/*.parquet'
    WHERE event_type = 'page_view'
    GROUP BY hour
    ORDER BY hour
""").df()
```

### 3. **列のフィルタリング**
```python
# 特定の条件でフィルタリング
result = con.execute("""
    SELECT user_id, purchase_amount
    FROM 'transactions.parquet'
    WHERE purchase_amount > 1000
      AND purchase_date >= '2024-01-01'
""").fetchall()
```
→ purchase_amount列とpurchase_date列だけを効率的に読み込み

### 4. **大規模データの探索**
```python
# 10億行のデータから統計情報を取得
stats = con.execute("""
    SELECT
        MIN(value) as min_val,
        MAX(value) as max_val,
        AVG(value) as avg_val,
        STDDEV(value) as stddev_val,
        APPROX_COUNT_DISTINCT(user_id) as unique_users
    FROM 'huge_dataset.parquet'
""").fetchone()

print(f"Min: {stats[0]}, Max: {stats[1]}, Avg: {stats[2]}")
```

---

## 💻 実装例

### 例1: 行指向 vs 列指向の性能比較

```python
import duckdb
import time
import pandas as pd

# 大規模データの生成（1000万行）
df = pd.DataFrame({
    'id': range(10_000_000),
    'name': ['User' + str(i) for i in range(10_000_000)],
    'age': [20 + (i % 50) for i in range(10_000_000)],
    'salary': [30000 + (i % 100000) for i in range(10_000_000)],
    'department': ['Dept' + str(i % 10) for i in range(10_000_000)]
})

con = duckdb.connect()

# 列のみの集計（列指向が有利）
start = time.time()
result1 = con.execute("""
    SELECT AVG(salary), MAX(salary), MIN(salary)
    FROM df
""").fetchone()
time1 = time.time() - start
print(f"列のみの集計: {time1:.3f}秒")

# 全列の取得（行指向が有利）
start = time.time()
result2 = con.execute("""
    SELECT *
    FROM df
    LIMIT 100000
""").fetchall()
time2 = time.time() - start
print(f"全列の取得: {time2:.3f}秒")

# 列のみの集計は圧倒的に速い
```

### 例2: 列選択の最適化

```python
import duckdb

con = duckdb.connect()

# Parquetファイルから必要な列だけ読み込む
result = con.execute("""
    SELECT user_id, event_time, event_type
    FROM 'events.parquet'
    WHERE event_type = 'purchase'
""").df()

# DuckDBは自動的にuser_id, event_time, event_typeだけを読み込む
# 他の列（例: user_agent, ip_address, refererなど）は読み込まない

print(f"読み込んだ行数: {len(result)}")
```

### 例3: 圧縮効果の確認

```python
import duckdb
import os

con = duckdb.connect()

# 同じデータを行指向（CSV）と列指向（Parquet）で保存
df = pd.DataFrame({
    'category': ['A'] * 1000000 + ['B'] * 1000000,  # 繰り返しが多い
    'value': range(2000000)
})

# CSVとして保存（行指向的）
df.to_csv('data.csv', index=False)
csv_size = os.path.getsize('data.csv')

# Parquetとして保存（列指向）
con.execute("COPY df TO 'data.parquet' (FORMAT PARQUET)")
parquet_size = os.path.getsize('data.parquet')

print(f"CSV サイズ: {csv_size / 1024 / 1024:.2f} MB")
print(f"Parquet サイズ: {parquet_size / 1024 / 1024:.2f} MB")
print(f"圧縮率: {csv_size / parquet_size:.1f}x")
# 出力例: 5-10倍の圧縮
```

### 例4: メタデータの活用

```python
import duckdb

con = duckdb.connect()

# Parquetファイルのメタデータを表示
metadata = con.execute("""
    SELECT *
    FROM parquet_metadata('large_file.parquet')
""").fetchall()

print("Parquet メタデータ:")
for row in metadata:
    print(row)

# 列の統計情報を取得（スキャン不要）
stats = con.execute("""
    SELECT *
    FROM parquet_schema('large_file.parquet')
""").fetchall()

print("\n列の情報:")
for stat in stats:
    print(stat)
```

### 例5: 実践的なETL処理

```python
import duckdb
from datetime import datetime

def process_daily_logs(date: str):
    """
    日次ログを処理して集計結果をParquetで保存
    列指向の利点を活かした処理
    """
    con = duckdb.connect()

    # 複数のログファイルから必要な列だけ読み込んで集計
    result = con.execute(f"""
        COPY (
            SELECT
                DATE_TRUNC('hour', timestamp) as hour,
                user_id,
                COUNT(*) as event_count,
                COUNT(DISTINCT session_id) as session_count,
                SUM(CASE WHEN event_type = 'purchase' THEN 1 ELSE 0 END) as purchases
            FROM read_parquet('logs/{date}/*.parquet')
            GROUP BY hour, user_id
        ) TO 'aggregated/{date}_summary.parquet' (FORMAT PARQUET)
    """)

    print(f"{date} の処理完了")

# 実行
process_daily_logs('2024-01-01')
```

### 例6: 列指向の利点を活かしたウィンドウ関数

```python
import duckdb

con = duckdb.connect()

# 列指向により効率的なウィンドウ関数処理
result = con.execute("""
    SELECT
        user_id,
        purchase_date,
        amount,
        -- 移動平均（列指向により高速）
        AVG(amount) OVER (
            PARTITION BY user_id
            ORDER BY purchase_date
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) as moving_avg_7day,
        -- 累積合計
        SUM(amount) OVER (
            PARTITION BY user_id
            ORDER BY purchase_date
        ) as cumulative_total
    FROM 'purchases.parquet'
    WHERE user_id IN (SELECT user_id FROM top_customers)
""").df()

print(result.head(10))
```

---

## 🔍 パフォーマンス測定

### ベンチマーク: 行指向 vs 列指向

```python
import duckdb
import sqlite3
import time
import pandas as pd

# テストデータ生成（500万行）
df = pd.DataFrame({
    'id': range(5_000_000),
    'category': ['A', 'B', 'C', 'D', 'E'] * 1_000_000,
    'value1': range(5_000_000),
    'value2': range(5_000_000, 10_000_000),
    'text': ['Text' + str(i) for i in range(5_000_000)]
})

# SQLite（行指向）
sqlite_con = sqlite3.connect('test.db')
df.to_sql('data', sqlite_con, if_exists='replace', index=False)

# DuckDB（列指向）
duckdb_con = duckdb.connect()

# ベンチマーク1: 集計クエリ
query = "SELECT category, SUM(value1), AVG(value2) FROM data GROUP BY category"

start = time.time()
sqlite_con.execute(query).fetchall()
sqlite_time = time.time() - start

start = time.time()
duckdb_con.execute(query.replace('data', 'df')).fetchall()
duckdb_time = time.time() - start

print(f"SQLite (行指向): {sqlite_time:.3f}秒")
print(f"DuckDB (列指向): {duckdb_time:.3f}秒")
print(f"高速化: {sqlite_time / duckdb_time:.1f}倍")
# 出力例: DuckDBが10-50倍高速
```

---

## 🎯 実践的なTips

### 1. **適切な列の選択**
```python
# 良い例: 必要な列だけ選択
result = con.execute("""
    SELECT user_id, amount
    FROM transactions
    WHERE amount > 1000
""")

# 悪い例: SELECT *
result = con.execute("""
    SELECT *  -- 全列を読み込むため遅い
    FROM transactions
    WHERE amount > 1000
""")
```

### 2. **Parquetフォーマットの活用**
```python
# データをParquet形式で保存
con.execute("""
    COPY (SELECT * FROM large_table)
    TO 'output.parquet' (FORMAT PARQUET, COMPRESSION 'ZSTD')
""")

# 後で高速に読み込める
result = con.execute("SELECT * FROM 'output.parquet'")
```

### 3. **パーティショニング**
```python
# 日付でパーティション分割
con.execute("""
    COPY (SELECT * FROM logs)
    TO 'logs_partitioned'
    (FORMAT PARQUET, PARTITION_BY (year, month))
""")

# 必要なパーティションだけ読み込む
result = con.execute("""
    SELECT * FROM 'logs_partitioned/year=2024/month=01/*.parquet'
""")
```

---

## 📚 次のステップ

列指向ストレージを理解したら、次は [05. ベクトル化実行（Vectorized Execution）](./05-vectorized-execution.md) でCPU効率を最大化する技術を学びましょう。

---

**キーポイント**:
- 列指向は分析クエリで圧倒的に高速（10-100倍）
- 必要な列だけ読み込むため I/O が大幅削減
- 圧縮効率が高くストレージコスト削減
- 行の挿入・更新には不向き
- Parquet形式との相性が抜群
