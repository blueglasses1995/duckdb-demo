# 08. ウィンドウ関数

## 📖 概要

**ウィンドウ関数**（Window Functions）は、行のグループに対して計算を行いながら、個々の行を保持する強力な機能です。GROUP BYと異なり、結果の行数は変わりません。

---

## ✅ メリット

### 1. **複雑な分析が簡潔に**
- ランキング、移動平均、累積合計を簡単に計算
- サブクエリやJOINを削減

### 2. **行を失わない**
- GROUP BYは行をまとめるが、ウィンドウ関数は全行を保持
- 詳細と集計を同時に表示

### 3. **パフォーマンス**
- DuckDBのベクトル化で高速
- 複数のウィンドウ関数を同時に効率的に処理

### 4. **時系列分析に最適**
- 移動平均、累積和
- 前日比、前年比

---

## ❌ デメリット

### 1. **学習曲線**
- 概念の理解に時間がかかる
- PARTITION BY、ORDER BYの使い分け

### 2. **大規模データでのメモリ使用**
- パーティション全体をメモリに保持する場合がある

### 3. **可読性**
- 複雑なウィンドウ関数は読みにくくなりがち

---

## 🔧 技術的原理

### 基本構文

```sql
SELECT
    column1,
    column2,
    WINDOW_FUNCTION() OVER (
        PARTITION BY partition_column
        ORDER BY order_column
        ROWS BETWEEN start AND end
    ) as result
FROM table
```

### 構成要素

#### 1. **PARTITION BY**
データをグループに分割（GROUP BYと似ているが、行は保持）

```sql
SELECT
    user_id,
    amount,
    SUM(amount) OVER (PARTITION BY user_id) as user_total
FROM transactions
```

#### 2. **ORDER BY**
パーティション内での順序を指定

```sql
SELECT
    date,
    sales,
    ROW_NUMBER() OVER (ORDER BY sales DESC) as rank
FROM daily_sales
```

#### 3. **FRAME句（ROWS/RANGE）**
計算対象の行範囲を指定

```sql
-- 直前6行+現在行（7日移動平均）
AVG(value) OVER (
    ORDER BY date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
)

-- パーティション全体
SUM(value) OVER (
    PARTITION BY category
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
```

### 主要なウィンドウ関数

#### ランキング関数
- **ROW_NUMBER()**: 連番（同値でも異なる番号）
- **RANK()**: ランキング（同値は同じ番号、次は飛ぶ）
- **DENSE_RANK()**: 密なランキング（同値は同じ番号、次は連続）
- **NTILE(n)**: n個のグループに分割

#### 集計関数
- **SUM()**, **AVG()**, **COUNT()**, **MIN()**, **MAX()**
- ウィンドウ内での集計

#### オフセット関数
- **LAG(col, n)**: n行前の値
- **LEAD(col, n)**: n行後の値
- **FIRST_VALUE()**: 最初の値
- **LAST_VALUE()**: 最後の値

---

## 💼 ユースケース

### 1. **売上のランキング**
```python
import duckdb

con = duckdb.connect()

result = con.execute("""
    SELECT
        product_name,
        sales,
        RANK() OVER (ORDER BY sales DESC) as sales_rank
    FROM products
""").df()
```

### 2. **移動平均**
```python
# 7日移動平均
result = con.execute("""
    SELECT
        date,
        value,
        AVG(value) OVER (
            ORDER BY date
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) as moving_avg_7d
    FROM time_series
""").df()
```

### 3. **累積合計**
```python
# 売上の累積合計
result = con.execute("""
    SELECT
        date,
        daily_sales,
        SUM(daily_sales) OVER (
            ORDER BY date
        ) as cumulative_sales
    FROM sales
""").df()
```

### 4. **前期比較**
```python
# 前日比
result = con.execute("""
    SELECT
        date,
        value,
        LAG(value) OVER (ORDER BY date) as prev_value,
        value - LAG(value) OVER (ORDER BY date) as daily_change,
        (value / LAG(value) OVER (ORDER BY date) - 1) * 100 as pct_change
    FROM daily_data
""").df()
```

---

## 💻 実装例

### 例1: 基本的なランキング

```python
import duckdb
import pandas as pd

# サンプルデータ
df = pd.DataFrame({
    'student': ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'],
    'score': [95, 87, 95, 82, 90]
})

con = duckdb.connect()

# 3種類のランキング比較
result = con.execute("""
    SELECT
        student,
        score,
        ROW_NUMBER() OVER (ORDER BY score DESC) as row_num,
        RANK() OVER (ORDER BY score DESC) as rank,
        DENSE_RANK() OVER (ORDER BY score DESC) as dense_rank
    FROM df
    ORDER BY score DESC
""").df()

print(result)
#   student  score  row_num  rank  dense_rank
# 0   Alice     95        1     1           1
# 1   Carol     95        2     1           1  ← 同じscoreは同じrank
# 2     Eve     90        3     3           2  ← dense_rankは連続
# 3     Bob     87        4     4           3
# 4    Dave     82        5     5           4
```

### 例2: パーティション別ランキング

```python
import duckdb
import pandas as pd

# 部門別の売上データ
df = pd.DataFrame({
    'department': ['Sales', 'Sales', 'Sales', 'Engineering', 'Engineering', 'Marketing'],
    'employee': ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank'],
    'sales': [100, 150, 120, 80, 95, 110]
})

con = duckdb.connect()

# 部門別にランキング
result = con.execute("""
    SELECT
        department,
        employee,
        sales,
        RANK() OVER (
            PARTITION BY department
            ORDER BY sales DESC
        ) as dept_rank
    FROM df
    ORDER BY department, dept_rank
""").df()

print(result)
#     department employee  sales  dept_rank
# 0  Engineering     Eve     95          1
# 1  Engineering    Dave     80          2
# 2    Marketing   Frank    110          1
# 3        Sales     Bob    150          1
# 4        Sales   Carol    120          2
# 5        Sales   Alice    100          3
```

### 例3: 移動平均

```python
import duckdb
import pandas as pd
import numpy as np

# 時系列データ
df = pd.DataFrame({
    'date': pd.date_range('2024-01-01', periods=30),
    'value': np.random.random(30) * 100
})

con = duckdb.connect()

# 複数の移動平均
result = con.execute("""
    SELECT
        date,
        value,
        AVG(value) OVER (
            ORDER BY date
            ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
        ) as ma_3d,
        AVG(value) OVER (
            ORDER BY date
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) as ma_7d,
        AVG(value) OVER (
            ORDER BY date
            ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
        ) as ma_30d
    FROM df
    ORDER BY date
""").df()

print(result.head(10))
```

### 例4: LAG/LEAD（前後の値）

```python
import duckdb
import pandas as pd

# 株価データ
df = pd.DataFrame({
    'date': pd.date_range('2024-01-01', periods=10),
    'price': [100, 102, 98, 105, 107, 103, 108, 110, 106, 112]
})

con = duckdb.connect()

# 前日・翌日との比較
result = con.execute("""
    SELECT
        date,
        price,
        LAG(price, 1) OVER (ORDER BY date) as prev_day,
        LEAD(price, 1) OVER (ORDER BY date) as next_day,
        price - LAG(price, 1) OVER (ORDER BY date) as daily_change,
        ROUND((price / LAG(price, 1) OVER (ORDER BY date) - 1) * 100, 2) as pct_change
    FROM df
    ORDER BY date
""").df()

print(result)
```

### 例5: 累積合計

```python
import duckdb
import pandas as pd

# 月次売上
df = pd.DataFrame({
    'month': pd.date_range('2024-01', periods=12, freq='MS'),
    'sales': [100, 120, 115, 130, 125, 140, 135, 150, 145, 160, 155, 170]
})

con = duckdb.connect()

# 累積売上と目標達成率
result = con.execute("""
    SELECT
        month,
        sales,
        SUM(sales) OVER (ORDER BY month) as cumulative_sales,
        ROUND(SUM(sales) OVER (ORDER BY month) * 100.0 / 1500, 2) as pct_of_target
    FROM df
    ORDER BY month
""").df()

print(result)
```

### 例6: NTILE（パーセンタイル分割）

```python
import duckdb
import pandas as pd
import numpy as np

# 顧客の購入額
df = pd.DataFrame({
    'customer_id': range(1, 101),
    'total_purchase': np.random.random(100) * 10000
})

con = duckdb.connect()

# 4分位（四分位数）に分割
result = con.execute("""
    SELECT
        customer_id,
        total_purchase,
        NTILE(4) OVER (ORDER BY total_purchase DESC) as quartile
    FROM df
    ORDER BY total_purchase DESC
""").df()

# 各四分位の統計
summary = con.execute("""
    WITH quartiles AS (
        SELECT
            customer_id,
            total_purchase,
            NTILE(4) OVER (ORDER BY total_purchase DESC) as quartile
        FROM df
    )
    SELECT
        quartile,
        COUNT(*) as customer_count,
        AVG(total_purchase) as avg_purchase,
        SUM(total_purchase) as total
    FROM quartiles
    GROUP BY quartile
    ORDER BY quartile
""").df()

print(summary)
```

### 例7: FIRST_VALUE / LAST_VALUE

```python
import duckdb
import pandas as pd

# センサーデータ
df = pd.DataFrame({
    'sensor_id': [1, 1, 1, 2, 2, 2],
    'timestamp': pd.date_range('2024-01-01', periods=6, freq='H'),
    'value': [20.5, 21.0, 20.8, 19.5, 19.8, 20.0]
})

con = duckdb.connect()

# センサー別の最初と最後の値
result = con.execute("""
    SELECT
        sensor_id,
        timestamp,
        value,
        FIRST_VALUE(value) OVER (
            PARTITION BY sensor_id
            ORDER BY timestamp
        ) as first_value,
        LAST_VALUE(value) OVER (
            PARTITION BY sensor_id
            ORDER BY timestamp
            ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        ) as last_value,
        value - FIRST_VALUE(value) OVER (
            PARTITION BY sensor_id
            ORDER BY timestamp
        ) as change_from_start
    FROM df
    ORDER BY sensor_id, timestamp
""").df()

print(result)
```

### 例8: 複雑なビジネスロジック

```python
import duckdb
import pandas as pd
import numpy as np

# ユーザーの購入履歴
df = pd.DataFrame({
    'user_id': [1, 1, 1, 2, 2, 3, 3, 3, 3],
    'purchase_date': pd.to_datetime([
        '2024-01-01', '2024-01-15', '2024-02-01',
        '2024-01-05', '2024-01-20',
        '2024-01-10', '2024-01-25', '2024-02-05', '2024-02-20'
    ]),
    'amount': [100, 150, 200, 80, 120, 90, 110, 95, 130]
})

con = duckdb.connect()

# 高度な顧客分析
result = con.execute("""
    SELECT
        user_id,
        purchase_date,
        amount,
        -- ユーザー別の購入回数
        ROW_NUMBER() OVER (
            PARTITION BY user_id
            ORDER BY purchase_date
        ) as purchase_number,
        -- ユーザー別の累積購入額
        SUM(amount) OVER (
            PARTITION BY user_id
            ORDER BY purchase_date
        ) as lifetime_value,
        -- 前回購入からの日数
        DATE_DIFF('day',
            LAG(purchase_date) OVER (PARTITION BY user_id ORDER BY purchase_date),
            purchase_date
        ) as days_since_last_purchase,
        -- ユーザー別の平均購入額
        AVG(amount) OVER (
            PARTITION BY user_id
        ) as user_avg_amount
    FROM df
    ORDER BY user_id, purchase_date
""").df()

print(result)
```

### 例9: ランニングトップN

```python
import duckdb
import pandas as pd

# 商品の日次売上
df = pd.DataFrame({
    'date': ['2024-01-01'] * 5 + ['2024-01-02'] * 5,
    'product': ['A', 'B', 'C', 'D', 'E', 'A', 'B', 'C', 'D', 'E'],
    'sales': [100, 150, 120, 80, 110, 110, 140, 115, 95, 120]
})

con = duckdb.connect()

# 日別のトップ3商品
result = con.execute("""
    WITH ranked AS (
        SELECT
            date,
            product,
            sales,
            RANK() OVER (PARTITION BY date ORDER BY sales DESC) as rank
        FROM df
    )
    SELECT *
    FROM ranked
    WHERE rank <= 3
    ORDER BY date, rank
""").df()

print(result)
```

### 例10: 時系列の異常検知

```python
import duckdb
import pandas as pd
import numpy as np

# 時系列データ（異常値を含む）
np.random.seed(42)
values = np.random.normal(100, 10, 100).tolist()
values[50] = 200  # 異常値

df = pd.DataFrame({
    'timestamp': pd.date_range('2024-01-01', periods=100, freq='H'),
    'value': values
})

con = duckdb.connect()

# 移動平均と標準偏差で異常検知
result = con.execute("""
    SELECT
        timestamp,
        value,
        AVG(value) OVER (
            ORDER BY timestamp
            ROWS BETWEEN 23 PRECEDING AND CURRENT ROW
        ) as moving_avg_24h,
        STDDEV(value) OVER (
            ORDER BY timestamp
            ROWS BETWEEN 23 PRECEDING AND CURRENT ROW
        ) as moving_stddev_24h,
        CASE
            WHEN ABS(value - AVG(value) OVER (
                ORDER BY timestamp
                ROWS BETWEEN 23 PRECEDING AND CURRENT ROW
            )) > 2 * STDDEV(value) OVER (
                ORDER BY timestamp
                ROWS BETWEEN 23 PRECEDING AND CURRENT ROW
            )
            THEN true
            ELSE false
        END as is_anomaly
    FROM df
    ORDER BY timestamp
""").df()

# 異常値を表示
anomalies = result[result['is_anomaly']]
print(f"検出された異常値: {len(anomalies)}件")
print(anomalies)
```

---

## 🎯 パフォーマンスのTips

### 1. **パーティションサイズの考慮**
```sql
-- 良い: パーティションが適度なサイズ
SELECT AVG(value) OVER (PARTITION BY user_id) FROM data

-- 悪い: パーティションが巨大
SELECT AVG(value) OVER (PARTITION BY country) FROM data
-- countryが少ないと1つのパーティションが巨大に
```

### 2. **インデックスの活用**
```sql
-- ORDER BYの列にインデックスがあると高速
CREATE INDEX idx_date ON sales(date);

SELECT
    ROW_NUMBER() OVER (ORDER BY date)
FROM sales;
```

### 3. **複数のウィンドウ関数**
```sql
-- 同じWINDOW句を再利用
SELECT
    date,
    value,
    AVG(value) OVER w as avg_val,
    SUM(value) OVER w as sum_val,
    COUNT(*) OVER w as count_val
FROM data
WINDOW w AS (PARTITION BY category ORDER BY date)
```

---

## 📚 次のステップ

ウィンドウ関数をマスターしたら、次は [09. 集約処理とグループ化](./09-aggregations.md) でデータの集計技術を深く学びましょう。

---

**キーポイント**:
- 行を失わずにグループ計算が可能
- ランキング、移動平均、累積合計が簡単
- PARTITION BY、ORDER BY、FRAME句で柔軟な制御
- 時系列分析に最適
- DuckDBのベクトル化で高速処理
