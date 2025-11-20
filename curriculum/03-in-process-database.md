# 03. In-Process Database（組み込み型データベース）

## 📖 概要

**In-Process Database**（組み込み型データベース）とは、データベースサーバーを別プロセスで起動せず、アプリケーションと同じプロセス内で動作するデータベースのことです。

DuckDBはSQLiteと同様に、ライブラリとしてアプリケーションに組み込まれます。

```
従来のデータベース（PostgreSQLなど）:
[アプリケーション] ←ネットワーク→ [DBサーバー]

組み込み型データベース（DuckDB）:
[アプリケーション + DuckDB] （同一プロセス）
```

---

## ✅ メリット

### 1. **セットアップが簡単**
- サーバーのインストール・設定不要
- ポート設定、ユーザー管理不要
- `pip install duckdb` だけで利用開始

### 2. **ネットワークオーバーヘッドなし**
- プロセス内通信のため超高速
- ネットワーク遅延ゼロ
- シリアライゼーション不要

### 3. **デプロイが容易**
- アプリケーションと一緒に配布可能
- 依存関係が少ない
- ポータブル

### 4. **リソース効率**
- 必要なときだけメモリを使用
- サーバープロセスの常駐不要
- 軽量（ライブラリサイズ約30MB）

### 5. **データローカリティ**
- データファイルをアプリケーション近くに配置
- ファイルシステム経由で直接アクセス
- S3などのリモートストレージも直接読み込み可能

---

## ❌ デメリット

### 1. **同時書き込み制限**
- 1つのプロセスからの書き込みが基本
- 複数プロセスからの同時書き込みは制限される
- Webアプリのバックエンドには不向き

### 2. **ネットワーク経由のアクセス不可**
- 他のマシンから直接接続できない
- API経由でラップする必要がある

### 3. **リソース共有の制約**
- アプリケーションとメモリを共有
- プロセスクラッシュでDBも停止
- メモリ制限がアプリ全体に影響

### 4. **マルチテナント不向き**
- 複数ユーザーの分離が困難
- 接続管理、認証機能が限定的

---

## 🔧 技術的原理

### アーキテクチャ

```
┌────────────────────────────────────┐
│     アプリケーションプロセス          │
│  ┌──────────────────────────────┐  │
│  │   Your Application Code       │  │
│  └──────────┬───────────────────┘  │
│             ↓                       │
│  ┌──────────────────────────────┐  │
│  │   DuckDB Library (C++)        │  │
│  │  - Query Engine               │  │
│  │  - Storage Manager            │  │
│  │  - Transaction Manager        │  │
│  └──────────┬───────────────────┘  │
└─────────────┼───────────────────────┘
              ↓
         [Data File]
```

### メモリ管理

DuckDBは以下のメモリ領域を使用：
1. **バッファプール**: データページをキャッシュ
2. **クエリ実行メモリ**: 中間結果の保存
3. **メタデータ**: スキーマ情報など

```python
# メモリ制限の設定
con = duckdb.connect()
con.execute("SET memory_limit='2GB'")
```

### ファイルベースとインメモリ

**ファイルベース**
```python
con = duckdb.connect('mydata.duckdb')  # ファイルに永続化
```

**インメモリ**
```python
con = duckdb.connect()  # または connect(':memory:')
# プロセス終了でデータ消失
```

---

## 💼 ユースケース

### 1. **データ分析スクリプト**
```python
# Jupyter NotebookやPythonスクリプトで
import duckdb
con = duckdb.connect()

# CSVを即座に分析
result = con.execute("""
    SELECT category, SUM(sales)
    FROM 'sales_data.csv'
    GROUP BY category
""").fetchall()
```

### 2. **ETLパイプライン**
```python
# データ変換処理
def transform_data(input_file, output_file):
    con = duckdb.connect()
    con.execute(f"""
        COPY (
            SELECT
                date,
                user_id,
                SUM(amount) as total
            FROM '{input_file}'
            GROUP BY date, user_id
        ) TO '{output_file}' (FORMAT PARQUET)
    """)
```

### 3. **機械学習の前処理**
```python
import duckdb
import pandas as pd

con = duckdb.connect()

# 大規模データの前処理
df = con.execute("""
    SELECT
        feature1,
        feature2,
        LOG(value + 1) as log_value,
        label
    FROM 'training_data.parquet'
    WHERE is_valid = true
""").df()

# そのまま機械学習へ
from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(...)
```

### 4. **コマンドラインツール**
```python
#!/usr/bin/env python3
import duckdb
import sys

def analyze_logs(log_file):
    con = duckdb.connect()
    result = con.execute(f"""
        SELECT
            status_code,
            COUNT(*) as count
        FROM read_csv_auto('{log_file}')
        GROUP BY status_code
        ORDER BY count DESC
    """).df()
    print(result)

if __name__ == '__main__':
    analyze_logs(sys.argv[1])
```

### 5. **組み込みアプリケーション**
```python
# デスクトップアプリやCLIツールに組み込み
class DataAnalyzer:
    def __init__(self):
        self.con = duckdb.connect('app_data.duckdb')
        self._init_schema()

    def _init_schema(self):
        self.con.execute("""
            CREATE TABLE IF NOT EXISTS results (
                id INTEGER PRIMARY KEY,
                timestamp TIMESTAMP,
                result TEXT
            )
        """)

    def save_result(self, result):
        self.con.execute(
            "INSERT INTO results VALUES (?, NOW(), ?)",
            [self.get_next_id(), result]
        )
```

---

## 💻 実装例

### 例1: 基本的な使い方

```python
import duckdb

# インメモリデータベース
con = duckdb.connect()

# テーブル作成
con.execute("""
    CREATE TABLE products (
        id INTEGER,
        name VARCHAR,
        price DECIMAL(10,2),
        category VARCHAR
    )
""")

# データ挿入
con.execute("""
    INSERT INTO products VALUES
    (1, 'Laptop', 999.99, 'Electronics'),
    (2, 'Mouse', 29.99, 'Electronics'),
    (3, 'Desk', 299.99, 'Furniture'),
    (4, 'Chair', 199.99, 'Furniture')
""")

# クエリ実行
result = con.execute("""
    SELECT category, AVG(price) as avg_price
    FROM products
    GROUP BY category
""").fetchall()

print(result)
# [('Electronics', 514.99), ('Furniture', 249.99)]
```

### 例2: ファイル永続化

```python
import duckdb

# ファイルベースのデータベース
con = duckdb.connect('mydata.duckdb')

# 初回実行時にテーブル作成
con.execute("""
    CREATE TABLE IF NOT EXISTS logs (
        timestamp TIMESTAMP,
        level VARCHAR,
        message VARCHAR
    )
""")

# データ挿入
con.execute("""
    INSERT INTO logs VALUES
    (NOW(), 'INFO', 'Application started'),
    (NOW(), 'DEBUG', 'Processing data')
""")

# ファイルに自動保存される
con.close()

# 別のセッションで再接続
con2 = duckdb.connect('mydata.duckdb')
result = con2.execute("SELECT * FROM logs").fetchall()
print(result)
```

### 例3: Pandas統合

```python
import duckdb
import pandas as pd

# Pandasのデータフレーム
df = pd.DataFrame({
    'user_id': [1, 2, 3, 1, 2],
    'amount': [100, 200, 150, 50, 75]
})

# DuckDBで直接クエリ
result = duckdb.query("""
    SELECT user_id, SUM(amount) as total
    FROM df
    GROUP BY user_id
    ORDER BY total DESC
""").df()

print(result)
#    user_id  total
# 0        2    275
# 1        1    150
# 2        3    150
```

### 例4: 複数ファイルの統合分析

```python
import duckdb

con = duckdb.connect()

# 複数のCSVファイルを一度に分析
result = con.execute("""
    SELECT
        DATE_TRUNC('day', timestamp) as day,
        COUNT(*) as events
    FROM read_csv_auto('logs/*.csv')
    WHERE event_type = 'purchase'
    GROUP BY day
    ORDER BY day
""").df()

print(result)
```

### 例5: パフォーマンス比較（Pandas vs DuckDB）

```python
import duckdb
import pandas as pd
import time

# 大規模データの準備（100万行）
large_df = pd.DataFrame({
    'id': range(1000000),
    'category': ['A', 'B', 'C', 'D'] * 250000,
    'value': range(1000000)
})

# Pandasで集計
start = time.time()
pandas_result = large_df.groupby('category')['value'].sum()
pandas_time = time.time() - start
print(f"Pandas: {pandas_time:.3f}秒")

# DuckDBで集計
start = time.time()
duckdb_result = duckdb.query("""
    SELECT category, SUM(value)
    FROM large_df
    GROUP BY category
""").df()
duckdb_time = time.time() - start
print(f"DuckDB: {duckdb_time:.3f}秒")

print(f"高速化: {pandas_time / duckdb_time:.1f}倍")
# 出力例: DuckDBはPandasより5-10倍高速
```

---

## 🎯 実践的なTips

### 1. **接続の再利用**
```python
# 良い例: 接続を再利用
con = duckdb.connect()
for file in files:
    con.execute(f"SELECT * FROM '{file}'")

# 悪い例: 毎回新しい接続
for file in files:
    con = duckdb.connect()  # オーバーヘッド大
    con.execute(f"SELECT * FROM '{file}'")
```

### 2. **メモリ制限の設定**
```python
con = duckdb.connect()
# 大規模データ処理時はメモリ制限を設定
con.execute("SET memory_limit='4GB'")
con.execute("SET temp_directory='/tmp/duckdb'")
```

### 3. **トランザクション管理**
```python
con = duckdb.connect('mydb.duckdb')

try:
    con.execute("BEGIN TRANSACTION")
    con.execute("INSERT INTO table1 VALUES (...)")
    con.execute("INSERT INTO table2 VALUES (...)")
    con.execute("COMMIT")
except Exception as e:
    con.execute("ROLLBACK")
    raise e
```

---

## 🔍 デバッグとモニタリング

```python
import duckdb

con = duckdb.connect()

# クエリの実行計画を確認
con.execute("EXPLAIN SELECT * FROM table WHERE id > 100")

# 実行時間を測定
con.execute("SELECT * FROM pragma_version()")

# メモリ使用状況
result = con.execute("SELECT * FROM duckdb_memory()").fetchall()
print(result)
```

---

## 📚 次のステップ

In-Process Databaseの概念を理解したら、次は [04. 列指向ストレージ（Columnar Storage）](./04-columnar-storage.md) でDuckDBの高速性の秘密を学びましょう。

---

**キーポイント**:
- サーバー不要で簡単にセットアップ可能
- ネットワークオーバーヘッドなしで高速
- データ分析、ETL、機械学習の前処理に最適
- 同時書き込みが多いシステムには不向き
