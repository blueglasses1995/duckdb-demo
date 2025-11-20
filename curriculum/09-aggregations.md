# 09. 集約処理とグループ化

## 📖 概要

**集約処理**（Aggregation）は、複数行のデータを1つの値にまとめる処理です。DuckDBは列指向ストレージとベクトル化により、大規模データの集約を超高速に処理できます。

---

## ✅ メリット

### 1. **超高速な集約**
- 列指向ストレージで必要な列だけ読み込み
- ベクトル化実行で効率的な計算
- 並列処理で更に高速化

### 2. **豊富な集約関数**
- 基本的な関数（SUM、AVG、COUNT）
- 統計関数（STDDEV、VARIANCE）
- 近似関数（APPROX_COUNT_DISTINCT）

### 3. **複雑なグループ化**
- GROUPING SETS
- ROLLUP、CUBE
- HAVING句での高度なフィルタリング

### 4. **メモリ効率**
- ハッシュ集約で効率的
- 大規模データも処理可能

---

## ❌ デメリット

### 1. **詳細情報の損失**
- 集約すると個別行の情報が失われる
- ウィンドウ関数が必要な場合も

### 2. **複雑なクエリの可読性**
- 多重グループ化は読みづらい

---

## 💻 実装例

### 例1: 基本的な集約

```python
import duckdb
import pandas as pd

df = pd.DataFrame({
    'category': ['A', 'B', 'A', 'C', 'B', 'A'],
    'amount': [100, 200, 150, 300, 250, 120]
})

con = duckdb.connect()

# 基本的な集約
result = con.execute("""
    SELECT
        category,
        COUNT(*) as count,
        SUM(amount) as total,
        AVG(amount) as average,
        MIN(amount) as minimum,
        MAX(amount) as maximum,
        STDDEV(amount) as std_dev
    FROM df
    GROUP BY category
    ORDER BY total DESC
""").df()

print(result)
```

### 例2: HAVINGフィルタ

```python
# HAVING句で集約結果をフィルタ
result = con.execute("""
    SELECT
        category,
        COUNT(*) as item_count,
        SUM(amount) as total
    FROM df
    GROUP BY category
    HAVING SUM(amount) > 200
    ORDER BY total DESC
""").df()
```

### 例3: 複数列のグループ化

```python
df = pd.DataFrame({
    'year': [2023, 2023, 2024, 2024, 2023, 2024],
    'category': ['A', 'B', 'A', 'B', 'A', 'A'],
    'sales': [100, 200, 150, 250, 120, 180]
})

result = con.execute("""
    SELECT
        year,
        category,
        SUM(sales) as total_sales,
        AVG(sales) as avg_sales
    FROM df
    GROUP BY year, category
    ORDER BY year, category
""").df()
```

### 例4: GROUPING SETS

```python
# 複数のグループ化を一度に実行
result = con.execute("""
    SELECT
        year,
        category,
        SUM(sales) as total_sales
    FROM df
    GROUP BY GROUPING SETS (
        (year, category),  -- 年×カテゴリ
        (year),            -- 年のみ
        (category),        -- カテゴリのみ
        ()                 -- 全体
    )
    ORDER BY year, category
""").df()
```

### 例5: ROLLUP

```python
# 階層的な集約（小計、総計）
result = con.execute("""
    SELECT
        year,
        category,
        SUM(sales) as total_sales
    FROM df
    GROUP BY ROLLUP (year, category)
    ORDER BY year, category
""").df()
```

### 例6: 近似集約（大規模データ用）

```python
import numpy as np

# 大規模データ
large_df = pd.DataFrame({
    'user_id': np.random.randint(1, 1000000, 10_000_000),
    'value': np.random.random(10_000_000)
})

# 正確なユニーク数（遅い）
exact = con.execute("""
    SELECT COUNT(DISTINCT user_id) as exact_count
    FROM large_df
""").fetchone()[0]

# 近似ユニーク数（速い）
approx = con.execute("""
    SELECT APPROX_COUNT_DISTINCT(user_id) as approx_count
    FROM large_df
""").fetchone()[0]

print(f"正確: {exact:,}, 近似: {approx:,}, 誤差: {abs(exact-approx)/exact*100:.2f}%")
# 近似は10-100倍高速、誤差は1-2%程度
```

---

## 🎯 実践的なTips

### 1. **適切なグループ化列の選択**
```python
# 良い: カーディナリティが適度
GROUP BY user_id, date

# 悪い: カーディナリティが低すぎ
GROUP BY status  # 値が2-3種類のみ
```

### 2. **インデックスの活用**
```python
# GROUP BY列にインデックスがあると高速
CREATE INDEX idx_category ON sales(category)
```

### 3. **DISTINCT vs GROUP BY**
```python
# ユニーク値の取得
SELECT DISTINCT category FROM sales;  # シンプル

SELECT category FROM sales GROUP BY category;  # 柔軟
```

---

## 📚 次のステップ

集約処理をマスターしたら、次は [10. 拡張機能（Extensions）](./10-extensions.md) でDuckDBの機能を拡張しましょう。

---

**キーポイント**:
- 列指向ストレージで超高速な集約
- 豊富な集約関数（基本、統計、近似）
- GROUPING SETS、ROLLUP、CUBEで柔軟な集約
- HAVINGで集約結果をフィルタ
- 大規模データも効率的に処理
