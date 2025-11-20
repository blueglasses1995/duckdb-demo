# 06. Parquet/CSV読み込み

## 📖 概要

DuckDBの大きな特徴の一つは、**データベースにデータをロードせずに、ファイルを直接クエリできる**ことです。Parquet、CSV、JSONなどのファイルを、まるでテーブルのように扱えます。

---

## ✅ メリット

### 1. **データのインポート不要**
- ファイルを直接クエリできる
- ETL処理の削減
- ストレージの二重化を回避

### 2. **超高速な読み込み**
- Parquetの列指向構造を直接活用
- 必要な列だけ読み込む（Projection Pushdown）
- 必要な行だけ読み込む（Predicate Pushdown）

### 3. **ゼロコピー最適化**
- メモリコピーを最小化
- Apache Arrowフォーマットとの互換性

### 4. **並列読み込み**
- 複数ファイルを並列処理
- マルチスレッドで高速化

### 5. **圧縮サポート**
- gzip、snappy、zstdなどを自動認識
- 圧縮ファイルを直接読み込み

---

## ❌ デメリット

### 1. **ファイルアクセスのオーバーヘッド**
- メモリ上のテーブルより遅い
- ネットワークストレージでは顕著

### 2. **型推論の限界**
- CSVの型推論は完璧ではない
- 明示的な型指定が必要な場合も

### 3. **インデックスなし**
- ファイルには索引がない
- 主キー検索には不向き

### 4. **更新・削除の制限**
- ファイルの直接更新は不可
- 書き戻しが必要

---

## 🔧 技術的原理

### Parquetフォーマット

**Parquet**は列指向のバイナリフォーマット：

```
Parquetファイルの構造:
┌─────────────────────────────────┐
│  Header (Magic Number: PAR1)     │
├─────────────────────────────────┤
│  Row Group 1                     │
│    ├─ Column Chunk 1             │
│    │   ├─ Page 1 (compressed)    │
│    │   ├─ Page 2 (compressed)    │
│    │   └─ ...                    │
│    ├─ Column Chunk 2             │
│    └─ ...                        │
├─────────────────────────────────┤
│  Row Group 2                     │
│    └─ ...                        │
├─────────────────────────────────┤
│  Footer (Metadata)               │
│    - Schema                      │
│    - Row Group Metadata          │
│    - Column Statistics (min/max) │
└─────────────────────────────────┘
```

### Predicate Pushdown（述語下押し）

```sql
SELECT * FROM 'data.parquet' WHERE age > 30;
```

**最適化の流れ**:
1. Parquetのメタデータを読む
2. 列統計情報（min/max）を確認
3. 条件に合わない行グループをスキップ
4. 該当する行グループだけ読み込み

```
例: 100個の行グループがある場合
  Row Group 1: age [18-25] → スキップ
  Row Group 2: age [26-35] → 読み込み ✓
  Row Group 3: age [18-28] → スキップ
  ...
結果: 10個の行グループだけ読む → 10倍高速!
```

### Projection Pushdown（射影下押し）

```sql
SELECT name, email FROM 'users.parquet';
```

DuckDBは自動的に：
- name列とemail列だけ読み込む
- id, age, addressなどは読まない

### 並列読み込み

```python
# 複数ファイルを並列読み込み
result = con.execute("""
    SELECT * FROM 'data/*.parquet'
""")
```

**内部動作**:
```
Main Thread
    ↓
┌────┬────┬────┬────┐
│ T1 │ T2 │ T3 │ T4 │  (Worker Threads)
├────┼────┼────┼────┤
│F1  │F2  │F3  │F4  │  (Files)
└────┴────┴────┴────┘
    ↓
  Merge
```

---

## 💼 ユースケース

### 1. **データレイクのクエリ**
```python
import duckdb

con = duckdb.connect()

# S3上の大規模データを直接クエリ
result = con.execute("""
    SELECT year, SUM(sales)
    FROM 's3://mybucket/sales/*.parquet'
    WHERE year >= 2023
    GROUP BY year
""").fetchall()
```

### 2. **ログ分析**
```python
# 日次ログファイルを横断検索
result = con.execute("""
    SELECT
        DATE_TRUNC('hour', timestamp) as hour,
        COUNT(*) as event_count,
        COUNT(DISTINCT user_id) as unique_users
    FROM 'logs/2024-01-*.parquet'
    WHERE event_type = 'error'
    GROUP BY hour
    ORDER BY hour
""").df()
```

### 3. **ETLパイプライン**
```python
# CSVを読み込み、変換してParquetに保存
con.execute("""
    COPY (
        SELECT
            id,
            UPPER(name) as name,
            CAST(amount AS DECIMAL(10,2)) as amount,
            DATE_TRUNC('day', timestamp) as date
        FROM read_csv_auto('raw_data/*.csv')
        WHERE amount > 0
    ) TO 'processed_data.parquet' (FORMAT PARQUET)
""")
```

### 4. **探索的データ分析**
```python
# Jupyter Notebookで手軽にデータ探索
import duckdb

con = duckdb.connect()

# すぐに統計情報を取得
stats = con.execute("""
    SELECT
        COUNT(*) as total_rows,
        COUNT(DISTINCT user_id) as unique_users,
        MIN(created_at) as earliest,
        MAX(created_at) as latest
    FROM 'data/*.parquet'
""").fetchone()

print(f"Total: {stats[0]:,} rows")
print(f"Users: {stats[1]:,}")
```

---

## 💻 実装例

### 例1: Parquetファイルの読み込み

```python
import duckdb

con = duckdb.connect()

# 基本的な読み込み
result = con.execute("""
    SELECT * FROM 'data.parquet'
    LIMIT 10
""").fetchall()

# 条件付き読み込み
result = con.execute("""
    SELECT name, age, city
    FROM 'users.parquet'
    WHERE age >= 18 AND city = 'Tokyo'
""").df()

# 集計
result = con.execute("""
    SELECT
        category,
        COUNT(*) as count,
        SUM(amount) as total
    FROM 'transactions.parquet'
    GROUP BY category
""").fetchall()
```

### 例2: CSV読み込み

```python
import duckdb

con = duckdb.connect()

# 自動型推論
result = con.execute("""
    SELECT * FROM read_csv_auto('data.csv')
    LIMIT 10
""").df()

# 手動設定
result = con.execute("""
    SELECT * FROM read_csv(
        'data.csv',
        delim=',',
        header=True,
        columns={
            'id': 'INTEGER',
            'name': 'VARCHAR',
            'amount': 'DECIMAL(10,2)',
            'date': 'DATE'
        }
    )
""").fetchall()

# 複数ファイル
result = con.execute("""
    SELECT * FROM read_csv_auto('data/*.csv')
    WHERE amount > 100
""").df()
```

### 例3: パフォーマンス比較（Pandas vs DuckDB）

```python
import duckdb
import pandas as pd
import time

# 大きなCSVファイル（100MB）

# Pandasで読み込み
start = time.time()
df_pandas = pd.read_csv('large_data.csv')
result_pandas = df_pandas.groupby('category')['amount'].sum()
pandas_time = time.time() - start

# DuckDBで読み込み
con = duckdb.connect()
start = time.time()
result_duckdb = con.execute("""
    SELECT category, SUM(amount)
    FROM read_csv_auto('large_data.csv')
    GROUP BY category
""").fetchall()
duckdb_time = time.time() - start

print(f"Pandas: {pandas_time:.3f}秒")
print(f"DuckDB: {duckdb_time:.3f}秒")
print(f"高速化: {pandas_time / duckdb_time:.1f}倍")
# DuckDBは5-20倍高速
```

### 例4: Parquet変換とベンチマーク

```python
import duckdb
import pandas as pd
import time

# サンプルデータ生成
df = pd.DataFrame({
    'id': range(5_000_000),
    'category': ['A', 'B', 'C', 'D'] * 1_250_000,
    'value': range(5_000_000)
})

# CSVとして保存
df.to_csv('data.csv', index=False)

# Parquetとして保存
con = duckdb.connect()
con.execute("""
    COPY df TO 'data.parquet' (FORMAT PARQUET)
""")

# ファイルサイズ比較
import os
csv_size = os.path.getsize('data.csv')
parquet_size = os.path.getsize('data.parquet')
print(f"CSV: {csv_size / 1024 / 1024:.2f} MB")
print(f"Parquet: {parquet_size / 1024 / 1024:.2f} MB")
print(f"圧縮率: {csv_size / parquet_size:.1f}x\n")

# 読み込み速度比較
# CSV
start = time.time()
result1 = con.execute("""
    SELECT category, SUM(value)
    FROM read_csv_auto('data.csv')
    GROUP BY category
""").fetchall()
csv_time = time.time() - start

# Parquet
start = time.time()
result2 = con.execute("""
    SELECT category, SUM(value)
    FROM 'data.parquet'
    GROUP BY category
""").fetchall()
parquet_time = time.time() - start

print(f"CSV読み込み: {csv_time:.3f}秒")
print(f"Parquet読み込み: {parquet_time:.3f}秒")
print(f"高速化: {csv_time / parquet_time:.1f}倍")
```

### 例5: 複数ファイルの集約

```python
import duckdb
import pandas as pd
from datetime import datetime, timedelta

con = duckdb.connect()

# 複数日のログファイルを生成
for i in range(7):
    date = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
    df = pd.DataFrame({
        'timestamp': pd.date_range(f'{date} 00:00', periods=1000, freq='1min'),
        'user_id': range(1000),
        'event': ['click'] * 500 + ['view'] * 500
    })
    con.execute(f"""
        COPY df TO 'logs/log_{date}.parquet' (FORMAT PARQUET)
    """)

# 全ファイルを横断して集計
result = con.execute("""
    SELECT
        DATE_TRUNC('day', timestamp) as day,
        event,
        COUNT(*) as count
    FROM 'logs/*.parquet'
    GROUP BY day, event
    ORDER BY day, event
""").df()

print(result)
```

### 例6: S3からの読み込み（HTTPFSエクステンション）

```python
import duckdb

con = duckdb.connect()

# HTTPFSエクステンションをインストール
con.execute("INSTALL httpfs")
con.execute("LOAD httpfs")

# S3の設定
con.execute("""
    SET s3_region='us-east-1';
    SET s3_access_key_id='YOUR_ACCESS_KEY';
    SET s3_secret_access_key='YOUR_SECRET_KEY';
""")

# S3から直接読み込み
result = con.execute("""
    SELECT *
    FROM 's3://my-bucket/data/*.parquet'
    WHERE date >= '2024-01-01'
    LIMIT 1000
""").df()

print(result.head())
```

### 例7: JSONファイルの読み込み

```python
import duckdb

con = duckdb.connect()

# JSON Lines形式
result = con.execute("""
    SELECT *
    FROM read_json_auto('data.jsonl')
    LIMIT 10
""").df()

# ネストされたJSONの処理
result = con.execute("""
    SELECT
        id,
        name,
        address.city as city,
        address.zipcode as zipcode
    FROM read_json_auto('users.json')
""").fetchall()

# JSON配列の展開
result = con.execute("""
    SELECT
        user_id,
        UNNEST(tags) as tag
    FROM read_json_auto('user_tags.json')
""").df()
```

### 例8: メタデータの確認

```python
import duckdb

con = duckdb.connect()

# Parquetファイルの構造を確認
schema = con.execute("""
    SELECT *
    FROM parquet_schema('data.parquet')
""").fetchall()

print("列の情報:")
for col in schema:
    print(f"{col[0]}: {col[1]}")

# メタデータ詳細
metadata = con.execute("""
    SELECT *
    FROM parquet_metadata('data.parquet')
""").fetchall()

print("\nメタデータ:")
for row in metadata:
    print(row)

# 行グループの統計情報
stats = con.execute("""
    SELECT
        row_group_id,
        column_name,
        min_value,
        max_value,
        null_count
    FROM parquet_file_metadata('data.parquet')
""").df()

print("\n統計情報:")
print(stats)
```

### 例9: 増分処理

```python
import duckdb
from datetime import datetime

con = duckdb.connect('state.duckdb')

# 最後に処理した時刻を記録
con.execute("""
    CREATE TABLE IF NOT EXISTS processing_state (
        last_processed TIMESTAMP
    )
""")

# 最後の処理時刻を取得
last_processed = con.execute("""
    SELECT last_processed
    FROM processing_state
    ORDER BY last_processed DESC
    LIMIT 1
""").fetchone()

if last_processed:
    last_time = last_processed[0]
else:
    last_time = '2000-01-01'

# 新しいデータだけ処理
result = con.execute(f"""
    SELECT *
    FROM 'data/*.parquet'
    WHERE created_at > '{last_time}'
""").df()

print(f"新規レコード: {len(result)}件")

# 処理時刻を更新
con.execute(f"""
    INSERT INTO processing_state VALUES ('{datetime.now()}')
""")
```

### 例10: パーティション化されたデータ

```python
import duckdb
import pandas as pd

con = duckdb.connect()

# データ生成
df = pd.DataFrame({
    'date': pd.date_range('2024-01-01', periods=10000, freq='H'),
    'category': ['A', 'B', 'C'] * 3333 + ['A'],
    'value': range(10000)
})

# パーティション化して保存
con.execute("""
    COPY df TO 'partitioned_data'
    (FORMAT PARQUET, PARTITION_BY (year(date), month(date), category))
""")

# 特定のパーティションだけ読み込み
result = con.execute("""
    SELECT *
    FROM 'partitioned_data/2024/1/A/*.parquet'
""").df()

print(f"読み込んだ行数: {len(result)}")
print("パーティションプルーニングにより高速!")
```

---

## 🎯 最適化のTips

### 1. **Parquetを優先**
```python
# CSV → Parquet変換
con.execute("""
    COPY (SELECT * FROM read_csv_auto('data.csv'))
    TO 'data.parquet' (FORMAT PARQUET)
""")
# 以降はParquetを使用（5-20倍高速）
```

### 2. **圧縮形式の選択**
```python
# ZSTD: バランス型（推奨）
con.execute("""
    COPY df TO 'data.parquet'
    (FORMAT PARQUET, COMPRESSION 'ZSTD')
""")

# SNAPPY: 高速、低圧縮率
# GZIP: 低速、高圧縮率
```

### 3. **適切なパーティショニング**
```python
# 日付でパーティション
con.execute("""
    COPY data TO 'output'
    (FORMAT PARQUET, PARTITION_BY (year, month, day))
""")
```

---

## 📚 次のステップ

Parquet/CSV読み込みをマスターしたら、次は [07. DataFrameインテグレーション](./07-dataframe-integration.md) でPandasやPolarsとの連携を学びましょう。

---

**キーポイント**:
- ファイルを直接クエリ可能（インポート不要）
- Parquetは列指向で超高速
- 述語・射影の下押しで最適化
- 複数ファイルを並列処理
- S3などのリモートストレージにも対応
