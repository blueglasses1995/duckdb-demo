# 07. DataFrameインテグレーション

## 📖 概要

DuckDBはPandas、Polars、Apache Arrowなどの主要なDataFrameライブラリとシームレスに統合できます。**ゼロコピー**でデータを交換し、メモリ効率的に処理できます。

---

## ✅ メリット

### 1. **ゼロコピーデータ交換**
- メモリコピー不要で高速
- Apache Arrowフォーマットを活用
- メモリ使用量を大幅削減

### 2. **SQLとDataFrameの組み合わせ**
- DataFrameをSQLで直接クエリ
- SQLの結果をDataFrameで取得
- それぞれの強みを活用

### 3. **大規模データの処理**
- Pandasが苦手な大規模データをDuckDBで処理
- メモリ制限を回避
- 高速な集計処理

### 4. **既存コードとの統合**
- 既存のPandasコードに簡単に組み込める
- 段階的な移行が可能
- 学習曲線が緩やか

---

## ❌ デメリット

### 1. **データ型の違い**
- DataFrameとSQLで型が異なる場合がある
- 型変換のコスト

### 2. **インプレース操作の制限**
- ゼロコピーのため、一部の操作で制約
- コピーが必要な場合もある

### 3. **互換性の考慮**
- バージョン間の互換性
- ライブラリの依存関係

---

## 🔧 技術的原理

### Apache Arrowフォーマット

DuckDBとDataFrameライブラリは**Apache Arrow**という共通のメモリフォーマットを使用：

```
Traditional Approach（従来の方法）:
Pandas DataFrame → Serialize → DuckDB → Deserialize
[メモリコピー発生]

Zero-Copy Approach（ゼロコピー）:
Pandas DataFrame ←→ Arrow ←→ DuckDB
[同じメモリ領域を共有]
```

### メモリレイアウトの互換性

```
Arrow Columnar Format:
┌─────────────────────────────┐
│  Column 1: [values]          │  ← DuckDBが直接読める
│  Column 2: [values]          │
│  Column 3: [values]          │
└─────────────────────────────┘
```

### パフォーマンス比較

```python
# 従来: 100万行のデータフレームをコピー
df.copy()  # 約100ms

# ゼロコピー: Arrow経由でDuckDBに渡す
duckdb.query("SELECT * FROM df")  # 約1ms
# 100倍高速！
```

---

## 💼 ユースケース

### 1. **Pandasの処理を高速化**
```python
import pandas as pd
import duckdb

# 大規模データフレーム
df = pd.read_csv('large_data.csv')

# DuckDBで高速集計
result = duckdb.query("""
    SELECT category, SUM(amount) as total
    FROM df
    GROUP BY category
    ORDER BY total DESC
""").df()
```

### 2. **複雑なクエリの実行**
```python
# Pandasでは複雑なクエリをSQLで簡潔に
result = duckdb.query("""
    SELECT
        user_id,
        DATE_TRUNC('month', purchase_date) as month,
        SUM(amount) as total,
        COUNT(*) as transactions
    FROM purchases_df
    WHERE status = 'completed'
    GROUP BY user_id, month
    HAVING SUM(amount) > 1000
""").df()
```

### 3. **機械学習の前処理**
```python
import duckdb
import pandas as pd

# 特徴量エンジニアリング
features = duckdb.query("""
    SELECT
        user_id,
        AVG(purchase_amount) as avg_purchase,
        COUNT(*) as purchase_count,
        MAX(purchase_date) as last_purchase,
        STDDEV(purchase_amount) as purchase_stddev
    FROM transactions_df
    GROUP BY user_id
""").df()

# そのまま機械学習へ
from sklearn.model_selection import train_test_split
X_train, X_test = train_test_split(features)
```

### 4. **データパイプライン**
```python
# 複数のDataFrameを結合
result = duckdb.query("""
    SELECT
        u.user_id,
        u.name,
        SUM(t.amount) as total_spent
    FROM users_df u
    JOIN transactions_df t ON u.user_id = t.user_id
    WHERE t.date >= '2024-01-01'
    GROUP BY u.user_id, u.name
""").df()
```

---

## 💻 実装例

### 例1: 基本的なPandas統合

```python
import duckdb
import pandas as pd

# Pandasデータフレーム作成
df = pd.DataFrame({
    'id': [1, 2, 3, 4, 5],
    'name': ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'],
    'age': [25, 30, 35, 28, 32],
    'salary': [50000, 60000, 75000, 55000, 65000]
})

# DuckDBで直接クエリ
result = duckdb.query("""
    SELECT name, age, salary
    FROM df
    WHERE salary > 55000
    ORDER BY salary DESC
""").df()

print(result)
#     name  age  salary
# 0  Carol   35   75000
# 1    Eve   32   65000
# 2    Bob   30   60000
```

### 例2: パフォーマンス比較

```python
import duckdb
import pandas as pd
import numpy as np
import time

# 大規模データ（500万行）
df = pd.DataFrame({
    'category': np.random.choice(['A', 'B', 'C', 'D'], 5_000_000),
    'value': np.random.random(5_000_000) * 1000
})

# Pandasで集計
start = time.time()
pandas_result = df.groupby('category')['value'].agg(['sum', 'mean', 'count'])
pandas_time = time.time() - start

# DuckDBで集計
start = time.time()
duckdb_result = duckdb.query("""
    SELECT
        category,
        SUM(value) as sum,
        AVG(value) as mean,
        COUNT(*) as count
    FROM df
    GROUP BY category
""").df()
duckdb_time = time.time() - start

print(f"Pandas: {pandas_time:.3f}秒")
print(f"DuckDB: {duckdb_time:.3f}秒")
print(f"高速化: {pandas_time / duckdb_time:.1f}倍")
# DuckDBは3-10倍高速
```

### 例3: Polars統合

```python
import duckdb
import polars as pl

# Polarsデータフレーム
df_polars = pl.DataFrame({
    'id': [1, 2, 3, 4, 5],
    'value': [100, 200, 300, 400, 500]
})

# DuckDBでクエリ
result = duckdb.query("""
    SELECT id, value * 2 as doubled
    FROM df_polars
    WHERE value > 200
""").pl()  # .pl()でPolarsデータフレームとして取得

print(result)
# shape: (3, 2)
# ┌─────┬─────────┐
# │ id  ┆ doubled │
# │ --- ┆ ---     │
# │ i64 ┆ i64     │
# ╞═════╪═════════╡
# │ 3   ┆ 600     │
# │ 4   ┆ 800     │
# │ 5   ┆ 1000    │
# └─────┴─────────┘
```

### 例4: Apache Arrow統合

```python
import duckdb
import pyarrow as pa

# Arrowテーブル
arrow_table = pa.table({
    'name': ['Alice', 'Bob', 'Carol'],
    'score': [85, 92, 78]
})

# DuckDBでクエリ（ゼロコピー）
result = duckdb.query("""
    SELECT name, score
    FROM arrow_table
    WHERE score >= 80
""").arrow()  # .arrow()でArrowテーブルとして取得

print(result)
# pyarrow.Table
# name: string
# score: int64
```

### 例5: 複数DataFrameの結合

```python
import duckdb
import pandas as pd

# 複数のDataFrame
users = pd.DataFrame({
    'user_id': [1, 2, 3],
    'name': ['Alice', 'Bob', 'Carol']
})

purchases = pd.DataFrame({
    'user_id': [1, 1, 2, 3, 3, 3],
    'amount': [100, 200, 150, 300, 250, 100]
})

products = pd.DataFrame({
    'product_id': [101, 102, 103],
    'category': ['Electronics', 'Books', 'Clothing']
})

# 複雑な結合をSQLで簡潔に
result = duckdb.query("""
    SELECT
        u.name,
        COUNT(*) as purchase_count,
        SUM(p.amount) as total_spent,
        AVG(p.amount) as avg_purchase
    FROM users u
    JOIN purchases p ON u.user_id = p.user_id
    GROUP BY u.name
    ORDER BY total_spent DESC
""").df()

print(result)
#     name  purchase_count  total_spent  avg_purchase
# 0  Carol               3          650     216.666667
# 1  Alice               2          300     150.000000
# 2    Bob               1          150     150.000000
```

### 例6: ウィンドウ関数とDataFrame

```python
import duckdb
import pandas as pd
import numpy as np

# 時系列データ
df = pd.DataFrame({
    'date': pd.date_range('2024-01-01', periods=100),
    'value': np.random.random(100) * 100
})

# ウィンドウ関数で移動平均を計算
result = duckdb.query("""
    SELECT
        date,
        value,
        AVG(value) OVER (
            ORDER BY date
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) as moving_avg_7d,
        value - LAG(value) OVER (ORDER BY date) as daily_change
    FROM df
    ORDER BY date
""").df()

print(result.head(10))
```

### 例7: メモリ効率的な処理

```python
import duckdb
import pandas as pd

# 大規模データ（Pandasではメモリ不足の可能性）
# DuckDBの接続を使って効率的に処理

con = duckdb.connect()

# チャンクで読み込み、DuckDBで処理
chunks = pd.read_csv('huge_file.csv', chunksize=100000)

# 一時テーブルに蓄積
con.execute("CREATE TABLE temp_data AS SELECT * FROM chunks LIMIT 0")

for chunk in chunks:
    con.execute("INSERT INTO temp_data SELECT * FROM chunk")

# 集計
result = con.execute("""
    SELECT category, SUM(amount), AVG(amount)
    FROM temp_data
    GROUP BY category
""").df()

print(result)
```

### 例8: 双方向のデータフロー

```python
import duckdb
import pandas as pd

con = duckdb.connect()

# 1. PandasからDuckDBへ
df_pandas = pd.DataFrame({
    'id': range(1000),
    'value': range(1000)
})

# DuckDBのテーブルとして登録
con.register('my_table', df_pandas)

# 2. DuckDBで処理
con.execute("""
    CREATE TABLE processed AS
    SELECT id, value * 2 as doubled
    FROM my_table
    WHERE value > 500
""")

# 3. DuckDBからPandasへ
result_df = con.execute("SELECT * FROM processed").df()

# 4. Pandasで更なる処理
result_df['tripled'] = result_df['doubled'] * 1.5

print(result_df.head())
```

### 例9: 型変換の扱い

```python
import duckdb
import pandas as pd

# Pandasのdatetime型
df = pd.DataFrame({
    'date': pd.to_datetime(['2024-01-01', '2024-01-02', '2024-01-03']),
    'amount': [100, 200, 300]
})

# DuckDBで日付操作
result = duckdb.query("""
    SELECT
        date,
        amount,
        EXTRACT(year FROM date) as year,
        EXTRACT(month FROM date) as month,
        DATE_TRUNC('month', date) as month_start
    FROM df
""").df()

print(result)
print(result.dtypes)
```

### 例10: カスタム関数の使用

```python
import duckdb
import pandas as pd

con = duckdb.connect()

# Pythonの関数を登録
def custom_transform(x):
    return x * 2 + 10

con.create_function("custom_func", custom_transform)

# DataFrameに適用
df = pd.DataFrame({
    'value': [1, 2, 3, 4, 5]
})

result = con.execute("""
    SELECT value, custom_func(value) as transformed
    FROM df
""").df()

print(result)
#    value  transformed
# 0      1           12
# 1      2           14
# 2      3           16
# 3      4           18
# 4      5           20
```

### 例11: エクスポート形式の選択

```python
import duckdb
import pandas as pd

con = duckdb.connect()

query = """
    SELECT category, SUM(amount) as total
    FROM sales_data
    GROUP BY category
"""

# Pandasとして取得
df = con.execute(query).df()

# Polarsとして取得
pl_df = con.execute(query).pl()

# Arrowとして取得
arrow_table = con.execute(query).arrow()

# NumPy配列として取得
numpy_array = con.execute(query).fetchnumpy()

# 辞書として取得
dict_result = con.execute(query).fetchdf().to_dict()

# リストとして取得
list_result = con.execute(query).fetchall()
```

### 例12: 実践的なETL

```python
import duckdb
import pandas as pd

def etl_pipeline(input_file, output_file):
    """
    PandasとDuckDBを組み合わせたETLパイプライン
    """
    con = duckdb.connect()

    # 1. Pandasで読み込み（前処理）
    df = pd.read_csv(input_file)

    # 2. 基本的なクレンジング（Pandas）
    df = df.dropna()
    df['date'] = pd.to_datetime(df['date'])

    # 3. 複雑な変換（DuckDB）
    transformed = con.execute("""
        SELECT
            user_id,
            DATE_TRUNC('month', date) as month,
            category,
            SUM(amount) as monthly_total,
            COUNT(*) as transaction_count,
            AVG(amount) as avg_transaction
        FROM df
        WHERE amount > 0
        GROUP BY user_id, month, category
        HAVING COUNT(*) >= 3
    """).df()

    # 4. 後処理（Pandas）
    transformed['amount_category'] = pd.cut(
        transformed['monthly_total'],
        bins=[0, 1000, 5000, float('inf')],
        labels=['Small', 'Medium', 'Large']
    )

    # 5. 保存
    con.execute("""
        COPY transformed TO ?
        (FORMAT PARQUET, COMPRESSION 'ZSTD')
    """, [output_file])

    return transformed

# 実行
result = etl_pipeline('raw_data.csv', 'processed_data.parquet')
print(f"処理完了: {len(result)}行")
```

---

## 🎯 最適化のTips

### 1. **適切なデータ形式の選択**
```python
# Pandasが速い場合
- 小規模データ（<100万行）
- 複雑なインデックス操作
- 時系列の高度な処理

# DuckDBが速い場合
- 大規模データ（>100万行）
- 集計処理
- SQLクエリが複雑
```

### 2. **メモリ管理**
```python
# 大規模データはDuckDBで処理してから小さくする
result = duckdb.query("""
    SELECT category, SUM(amount)  -- 大幅に行数削減
    FROM large_df  -- 1億行
    GROUP BY category  -- 10行に集約
""").df()  -- Pandasで扱いやすいサイズ
```

### 3. **型の明示**
```python
# 型を明示して効率化
con.execute("""
    SELECT
        CAST(id AS INTEGER) as id,
        CAST(amount AS DECIMAL(10,2)) as amount
    FROM df
""")
```

---

## 📚 次のステップ

DataFrameインテグレーションをマスターしたら、次は [08. ウィンドウ関数](./08-window-functions.md) で高度な分析クエリを学びましょう。

---

**キーポイント**:
- ゼロコピーで高速なデータ交換
- Pandas/Polars/Arrowとシームレスに統合
- SQLとDataFrameの強みを組み合わせ
- 大規模データを効率的に処理
- 既存のPandasコードに簡単に統合可能
