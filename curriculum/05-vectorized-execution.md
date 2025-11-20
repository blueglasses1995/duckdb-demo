# 05. ベクトル化実行（Vectorized Execution）

## 📖 概要

**ベクトル化実行**は、データを1行ずつ処理するのではなく、複数行（ベクトル）をまとめて処理する実行方式です。DuckDBの高速性を支える核心技術の一つです。

従来の「Volcano Model（火山モデル）」では1行ずつ処理しますが、DuckDBは通常2048行のベクトル単位で処理します。

---

## ✅ メリット

### 1. **CPU効率の劇的な向上**
- 関数呼び出しのオーバーヘッドを大幅削減
- 1行処理より5-10倍高速

### 2. **SIMD命令の活用**
- CPU の SIMD（Single Instruction Multiple Data）命令を利用
- 1命令で複数データを同時処理
- 最大4-8倍の並列化

### 3. **CPU パイプラインの効率化**
- 分岐予測の精度向上
- キャッシュミスの削減
- 命令レベルの並列性向上

### 4. **メモリ局所性の向上**
- 連続したメモリアクセス
- キャッシュヒット率の向上
- プリフェッチの効果増大

### 5. **コンパイラ最適化の恩恵**
- ループアンローリング
- 自動ベクトル化
- レジスタ割り当ての最適化

---

## ❌ デメリット

### 1. **実装の複雑さ**
- ベクトル処理を考慮したコード設計が必要
- デバッグが難しい

### 2. **小規模データでのオーバーヘッド**
- 数行〜数十行の処理ではバッチングのコストが上回る場合も

### 3. **可変長データの扱いが複雑**
- 文字列などの可変長データの処理
- メモリアライメントの考慮

### 4. **条件分岐の扱い**
- ベクトル内で異なる処理パスが必要な場合
- マスク処理によるオーバーヘッド

---

## 🔧 技術的原理

### Volcano Model（従来の行ごと処理）

```python
# 疑似コード: Volcano Model
def execute_query():
    for row in scan_table():          # 1行取得
        if filter(row):                # 1行フィルタ
            result = aggregate(row)    # 1行集計
            output(result)

# 問題点:
# - 関数呼び出しが膨大（100万行なら100万回）
# - CPU パイプラインが効率的に使えない
# - キャッシュミスが多い
```

**データフロー**:
```
Scan → Filter → Aggregate → Output
 ↓      ↓         ↓          ↓
row1   row1      row1       row1
row2   row2      row2       row2
row3   row3      row3       row3
...
```

### Vectorized Execution（ベクトル化実行）

```python
# 疑似コード: Vectorized Execution
def execute_query():
    for batch in scan_table_batched(size=2048):  # 2048行取得
        filtered = filter_batch(batch)            # バッチフィルタ
        result = aggregate_batch(filtered)        # バッチ集計
        output_batch(result)

# 利点:
# - 関数呼び出しが1/2048に削減
# - SIMD命令を効果的に活用
# - キャッシュヒット率向上
```

**データフロー**:
```
Scan → Filter → Aggregate → Output
 ↓      ↓         ↓          ↓
Vec1   Vec1      Vec1       Vec1  (2048 rows)
Vec2   Vec2      Vec2       Vec2  (2048 rows)
Vec3   Vec3      Vec3       Vec3  (2048 rows)
...
```

### SIMD（Single Instruction Multiple Data）

#### 通常の処理
```
a = [1, 2, 3, 4]
b = [5, 6, 7, 8]
result = []

for i in range(4):
    result.append(a[i] + b[i])  # 4回のループ
# result = [6, 8, 10, 12]
```

#### SIMD処理
```
a = [1, 2, 3, 4]
b = [5, 6, 7, 8]

# 1命令で4つの加算を同時実行
result = simd_add(a, b)  # 1回の命令
# result = [6, 8, 10, 12]
```

**性能差**: 最大4-8倍高速（CPUのSIMD幅による）

### DuckDBのベクトルサイズ

DuckDBは**2048要素**をデフォルトのベクトルサイズとして使用：

```
なぜ2048？
- L1キャッシュに収まるサイズ（約16KB）
- SIMD命令を効率的に使える
- 並列処理とのバランスが良い
- メモリアライメントに適している
```

### ベクトル処理の例

#### 例1: フィルタ処理

```python
# 疑似コード: ベクトル化されたフィルタ

# 入力ベクトル
ages = [25, 30, 35, 22, 45, ...]  # 2048要素

# 条件: age > 30
# SIMD命令で一度に複数要素を比較
mask = simd_greater_than(ages, 30)
# mask = [0, 0, 1, 0, 1, ...]  # 1 = true, 0 = false

# マスクを使って該当する要素だけ抽出
filtered = simd_compress(ages, mask)
# filtered = [35, 45, ...]
```

#### 例2: 集計処理

```python
# 疑似コード: ベクトル化された合計

values = [100, 200, 150, 300, ...]  # 2048要素

# SIMD命令で効率的に合計計算
# 通常: 2048回のループ
# SIMD: 約256回の命令（8要素ずつ処理）
total = simd_sum(values)
```

### CPUパイプラインの効率化

```
CPU Pipeline:
[Fetch] → [Decode] → [Execute] → [Memory] → [WriteBack]

1行ずつ処理:
Cycle 1: [F1] [D-] [E-] [M-] [W-]
Cycle 2: [F2] [D1] [E-] [M-] [W-]  ← パイプラインストール
Cycle 3: [F3] [D2] [D1] [E-] [M-]

ベクトル処理:
Cycle 1: [F1] [D-] [E-] [M-] [W-]
Cycle 2: [F1] [D1] [E-] [M-] [W-]  ← 同じデータで継続
Cycle 3: [F1] [D1] [E1] [E-] [M-]  ← パイプライン満杯
```

---

## 💼 ユースケース

### 1. **大規模データの集計**
```python
import duckdb

con = duckdb.connect()

# ベクトル化により超高速
result = con.execute("""
    SELECT
        category,
        SUM(amount) as total,
        AVG(amount) as average,
        COUNT(*) as count
    FROM read_parquet('large_data.parquet')
    GROUP BY category
""").fetchall()
```

### 2. **数値計算**
```python
# 複雑な数値計算もベクトル化で高速
result = con.execute("""
    SELECT
        user_id,
        SQRT(value1 * value1 + value2 * value2) as euclidean_dist,
        LN(value3 + 1) as log_value,
        POWER(value4, 2) as squared
    FROM calculations
    WHERE value1 > 0
""").df()
```

### 3. **文字列処理**
```python
# 文字列操作もベクトル化
result = con.execute("""
    SELECT
        UPPER(name) as upper_name,
        LOWER(email) as lower_email,
        SUBSTRING(phone, 1, 3) as area_code,
        LENGTH(address) as address_length
    FROM users
    WHERE name LIKE '%Smith%'
""").fetchall()
```

### 4. **日付・時刻処理**
```python
# 日付計算もベクトル化で効率的
result = con.execute("""
    SELECT
        DATE_TRUNC('month', order_date) as month,
        DATE_DIFF('day', order_date, delivery_date) as delivery_days,
        EXTRACT(year FROM order_date) as year
    FROM orders
    WHERE order_date >= '2024-01-01'
""").df()
```

---

## 💻 実装例

### 例1: ベクトル化の効果を実感

```python
import duckdb
import numpy as np
import time

# 大規模データ生成（1000万行）
size = 10_000_000
data = {
    'a': np.random.randint(0, 100, size),
    'b': np.random.randint(0, 100, size),
    'c': np.random.randint(0, 100, size)
}

con = duckdb.connect()

# ベクトル化された処理（DuckDB）
start = time.time()
result = con.execute("""
    SELECT
        a + b + c as sum_abc,
        a * b * c as product_abc,
        SQRT(a * a + b * b) as hypotenuse
    FROM data
    WHERE a > 50 AND b > 50
""").fetchall()
duckdb_time = time.time() - start

print(f"DuckDB（ベクトル化）: {duckdb_time:.3f}秒")
print(f"処理行数: {len(result):,}行")

# Pure Pythonでの処理（比較）
start = time.time()
result_python = []
for i in range(size):
    if data['a'][i] > 50 and data['b'][i] > 50:
        sum_abc = data['a'][i] + data['b'][i] + data['c'][i]
        product_abc = data['a'][i] * data['b'][i] * data['c'][i]
        hypotenuse = np.sqrt(data['a'][i]**2 + data['b'][i]**2)
        result_python.append((sum_abc, product_abc, hypotenuse))
python_time = time.time() - start

print(f"Python（1行ずつ）: {python_time:.3f}秒")
print(f"高速化: {python_time / duckdb_time:.1f}倍")
# 出力例: 10-50倍高速
```

### 例2: SIMD効果の可視化

```python
import duckdb

con = duckdb.connect()

# ベクトル演算
query = """
    SELECT
        SUM(value) as total,
        AVG(value) as average,
        MAX(value) as maximum,
        MIN(value) as minimum,
        STDDEV(value) as stddev
    FROM generate_series(1, 10000000) as t(value)
"""

# EXPLAINで実行計画を確認
plan = con.execute(f"EXPLAIN {query}").fetchall()
print("実行計画:")
for line in plan:
    print(line[1])

# 実行
import time
start = time.time()
result = con.execute(query).fetchone()
elapsed = time.time() - start

print(f"\n結果: {result}")
print(f"実行時間: {elapsed:.3f}秒")
print(f"処理速度: {10_000_000 / elapsed / 1_000_000:.1f}M行/秒")
```

### 例3: フィルタ処理のベクトル化

```python
import duckdb
import pandas as pd
import time

# テストデータ（500万行）
df = pd.DataFrame({
    'age': np.random.randint(18, 80, 5_000_000),
    'income': np.random.randint(20000, 200000, 5_000_000),
    'score': np.random.random(5_000_000)
})

con = duckdb.connect()

# 複雑なフィルタ条件
query = """
    SELECT *
    FROM df
    WHERE age >= 30
      AND age <= 50
      AND income > 50000
      AND score > 0.5
"""

# DuckDB（ベクトル化）
start = time.time()
result_duckdb = con.execute(query).df()
duckdb_time = time.time() - start

# Pandas（行ごとの処理的）
start = time.time()
result_pandas = df[
    (df['age'] >= 30) &
    (df['age'] <= 50) &
    (df['income'] > 50000) &
    (df['score'] > 0.5)
]
pandas_time = time.time() - start

print(f"DuckDB: {duckdb_time:.3f}秒")
print(f"Pandas: {pandas_time:.3f}秒")
print(f"高速化: {pandas_time / duckdb_time:.1f}倍")
print(f"結果行数: {len(result_duckdb):,}行")
```

### 例4: 文字列処理のベクトル化

```python
import duckdb
import pandas as pd

# 文字列データ
df = pd.DataFrame({
    'email': [f'user{i}@example.com' for i in range(1_000_000)],
    'name': [f'User Name {i}' for i in range(1_000_000)]
})

con = duckdb.connect()

# ベクトル化された文字列処理
result = con.execute("""
    SELECT
        email,
        UPPER(name) as upper_name,
        SUBSTRING(email, 1, POSITION('@' IN email) - 1) as username,
        LENGTH(name) as name_length,
        CONCAT(name, ' (', email, ')') as full_info
    FROM df
    WHERE email LIKE '%example.com'
    LIMIT 10
""").df()

print(result)
```

### 例5: 集計のベクトル化

```python
import duckdb
import numpy as np

con = duckdb.connect()

# 複数の集計関数を同時実行
df = pd.DataFrame({
    'category': np.random.choice(['A', 'B', 'C', 'D'], 10_000_000),
    'value': np.random.random(10_000_000) * 1000
})

result = con.execute("""
    SELECT
        category,
        COUNT(*) as count,
        SUM(value) as total,
        AVG(value) as average,
        STDDEV(value) as stddev,
        MIN(value) as minimum,
        MAX(value) as maximum,
        MEDIAN(value) as median,
        APPROX_QUANTILE(value, 0.95) as percentile_95
    FROM df
    GROUP BY category
    ORDER BY total DESC
""").df()

print(result)
```

### 例6: ウィンドウ関数のベクトル化

```python
import duckdb
import pandas as pd

# 時系列データ
df = pd.DataFrame({
    'date': pd.date_range('2024-01-01', periods=100000, freq='H'),
    'sensor_id': np.random.choice([1, 2, 3, 4, 5], 100000),
    'value': np.random.random(100000) * 100
})

con = duckdb.connect()

# ベクトル化されたウィンドウ関数
result = con.execute("""
    SELECT
        date,
        sensor_id,
        value,
        -- 移動平均
        AVG(value) OVER (
            PARTITION BY sensor_id
            ORDER BY date
            ROWS BETWEEN 23 PRECEDING AND CURRENT ROW
        ) as moving_avg_24h,
        -- ランキング
        ROW_NUMBER() OVER (
            PARTITION BY sensor_id
            ORDER BY value DESC
        ) as rank_in_sensor,
        -- 差分
        value - LAG(value) OVER (
            PARTITION BY sensor_id
            ORDER BY date
        ) as delta
    FROM df
    ORDER BY date, sensor_id
    LIMIT 100
""").df()

print(result.head(20))
```

---

## 🔍 パフォーマンス分析

### ベクトルサイズの影響

```python
import duckdb
import time

con = duckdb.connect()

# 大規模データ
query = """
    SELECT SUM(value), AVG(value), COUNT(*)
    FROM generate_series(1, 50000000) as t(value)
"""

# 異なるベクトルサイズでテスト（実際には変更不可だが概念として）
print("ベクトル化の効果:")
print("- ベクトルサイズ2048（DuckDB標準）が最適")
print("- これよりサイズが小さいとオーバーヘッド増")
print("- これより大きいとキャッシュミス増")

start = time.time()
result = con.execute(query).fetchone()
elapsed = time.time() - start

print(f"\n処理時間: {elapsed:.3f}秒")
print(f"スループット: {50_000_000 / elapsed / 1_000_000:.1f}M行/秒")
```

---

## 🎯 最適化のTips

### 1. **データ型の選択**
```python
# 良い例: 適切なデータ型
con.execute("""
    CREATE TABLE optimized (
        id INTEGER,              -- 4バイト
        amount DECIMAL(10,2),    -- 固定精度
        category VARCHAR(20)     -- 固定長優先
    )
""")

# 悪い例: 非効率なデータ型
con.execute("""
    CREATE TABLE inefficient (
        id VARCHAR,              -- 可変長（遅い）
        amount DOUBLE,           -- 浮動小数点（精度問題）
        category TEXT            -- 長い文字列
    )
""")
```

### 2. **フィルタの順序**
```python
# 良い例: 選択性の高いフィルタを先に
result = con.execute("""
    SELECT *
    FROM large_table
    WHERE rare_condition = true  -- 選択性高い（先に評価）
      AND common_condition = 1   -- 選択性低い
""")
```

### 3. **不要な計算を避ける**
```python
# 良い例
result = con.execute("""
    SELECT user_id, SUM(amount)
    FROM transactions
    WHERE date >= '2024-01-01'
    GROUP BY user_id
""")

# 悪い例: 不要な計算
result = con.execute("""
    SELECT user_id, SUM(SQRT(amount * amount))  -- 無駄な計算
    FROM transactions
    WHERE date >= '2024-01-01'
    GROUP BY user_id
""")
```

---

## 📚 次のステップ

ベクトル化実行を理解したら、次は [06. Parquet/CSV読み込み](./06-parquet-csv.md) でファイルからの高速データ読み込みを学びましょう。

---

**キーポイント**:
- ベクトル化により5-10倍の高速化
- SIMD命令で複数データを同時処理
- 2048行のバッチ処理が最適
- 関数呼び出しオーバーヘッドを大幅削減
- CPUキャッシュとパイプラインを効率的に活用
