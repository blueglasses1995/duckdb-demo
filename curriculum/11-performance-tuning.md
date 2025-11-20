# 11. パフォーマンスチューニング

## 📖 概要

DuckDBは標準で高速ですが、適切な設定と使い方でさらに性能を引き出せます。

---

## ✅ メリット

### 1. **大幅な高速化**
- 適切な設定で2-10倍高速化
- メモリ使用量の最適化

### 2. **リソースの有効活用**
- CPUコア数の調整
- メモリ制限の設定

---

## 💻 実装例

### 例1: 基本設定

```python
import duckdb

con = duckdb.connect()

# スレッド数の設定
con.execute("SET threads=8")

# メモリ制限
con.execute("SET memory_limit='4GB'")

# 一時ディレクトリ
con.execute("SET temp_directory='/tmp/duckdb'")

# プログレスバー表示
con.execute("SET enable_progress_bar=true")
```

### 例2: Parquet最適化

```python
# Parquet形式で保存（高速読み込み）
con.execute("""
    COPY (SELECT * FROM large_table)
    TO 'data.parquet'
    (FORMAT PARQUET, COMPRESSION 'ZSTD')
""")

# パーティション分割
con.execute("""
    COPY data TO 'partitioned'
    (FORMAT PARQUET, PARTITION_BY (year, month))
""")
```

### 例3: クエリ最適化

```python
# 良い: 必要な列だけ選択
con.execute("""
    SELECT user_id, amount
    FROM transactions
    WHERE date >= '2024-01-01'
""")

# 悪い: SELECT *
con.execute("""
    SELECT *  -- 全列読み込み（遅い）
    FROM transactions
    WHERE date >= '2024-01-01'
""")

# 良い: フィルタを先に
con.execute("""
    SELECT user_id, SUM(amount)
    FROM transactions
    WHERE amount > 0  -- 先にフィルタ
    GROUP BY user_id
""")
```

### 例4: EXPLAIN ANALYZEで分析

```python
# 実行計画を確認
result = con.execute("""
    EXPLAIN ANALYZE
    SELECT category, SUM(sales)
    FROM products
    GROUP BY category
""").fetchall()

for line in result:
    print(line[1])
```

### 例5: バッチ処理

```python
# 良い: バッチINSERT
con.execute("BEGIN TRANSACTION")
for batch in data_batches:
    con.executemany(
        "INSERT INTO table VALUES (?, ?)",
        batch
    )
con.execute("COMMIT")

# 悪い: 1行ずつINSERT
for row in data:
    con.execute("INSERT INTO table VALUES (?, ?)", row)
```

### 例6: マテリアライズドビュー的な使い方

```python
# 集計結果をテーブルとして保存
con.execute("""
    CREATE TABLE daily_summary AS
    SELECT
        DATE_TRUNC('day', timestamp) as date,
        category,
        SUM(amount) as total
    FROM transactions
    GROUP BY date, category
""")

# 高速にクエリ可能
result = con.execute("""
    SELECT * FROM daily_summary
    WHERE date >= '2024-01-01'
""").df()
```

### 例7: 近似クエリ

```python
# 正確だが遅い
exact = con.execute("""
    SELECT COUNT(DISTINCT user_id)
    FROM large_table
""").fetchone()[0]

# 近似で高速
approx = con.execute("""
    SELECT APPROX_COUNT_DISTINCT(user_id)
    FROM large_table
""").fetchone()[0]

# 10-100倍高速、誤差1-2%
```

---

## 🎯 チューニングチェックリスト

### データ設計
- [ ] Parquet形式を使用
- [ ] 適切なパーティショニング
- [ ] 適切なデータ型を選択

### クエリ最適化
- [ ] 必要な列だけSELECT
- [ ] WHERE句で早期フィルタ
- [ ] INDEXの活用（テーブルの場合）

### リソース設定
- [ ] スレッド数を設定
- [ ] メモリ制限を設定
- [ ] 一時ディレクトリを設定

### モニタリング
- [ ] EXPLAIN ANALYZEで分析
- [ ] プログレスバーで進捗確認
- [ ] 処理時間の計測

---

## 📊 ベンチマーク例

```python
import duckdb
import time

con = duckdb.connect()

# ベンチマーク1: デフォルト設定
start = time.time()
result1 = con.execute("""
    SELECT category, SUM(amount)
    FROM large_data
    GROUP BY category
""").fetchall()
time1 = time.time() - start

# ベンチマーク2: 最適化後
con.execute("SET threads=8")
con.execute("SET memory_limit='8GB'")
start = time.time()
result2 = con.execute("""
    SELECT category, SUM(amount)
    FROM large_data
    GROUP BY category
""").fetchall()
time2 = time.time() - start

print(f"デフォルト: {time1:.3f}秒")
print(f"最適化後: {time2:.3f}秒")
print(f"高速化: {time1/time2:.1f}倍")
```

---

## 📚 次のステップ

パフォーマンスチューニングをマスターしたら、最後に [12. 実践的ユースケース](./12-practical-use-cases.md) で総合的な活用方法を学びましょう。

---

**キーポイント**:
- スレッド数とメモリ制限の設定
- Parquet形式とパーティショニング
- 必要な列だけ選択、早期フィルタ
- EXPLAIN ANALYZEで分析
- 近似クエリで高速化
