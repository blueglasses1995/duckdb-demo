# 12. 実践的ユースケース

## 📖 概要

これまで学んだDuckDBの機能を組み合わせて、実際のビジネス課題を解決する方法を学びます。

---

## 💼 ユースケース集

### 1. ログ分析システム

```python
import duckdb
from datetime import datetime

def analyze_logs(log_dir):
    """
    複数のログファイルを横断的に分析
    """
    con = duckdb.connect()

    # 全ログファイルを集計
    result = con.execute(f"""
        SELECT
            DATE_TRUNC('hour', timestamp) as hour,
            status_code,
            COUNT(*) as request_count,
            AVG(response_time) as avg_response_time,
            APPROX_QUANTILE(response_time, 0.95) as p95_response_time
        FROM read_parquet('{log_dir}/*.parquet')
        WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY hour, status_code
        ORDER BY hour DESC, request_count DESC
    """).df()

    return result

# 実行
summary = analyze_logs('/var/logs/access')
print(summary.head(20))
```

### 2. 売上分析ダッシュボード

```python
import duckdb
import pandas as pd

class SalesAnalytics:
    def __init__(self, db_path='sales.duckdb'):
        self.con = duckdb.connect(db_path)

    def daily_summary(self, start_date, end_date):
        """日次売上サマリー"""
        return self.con.execute("""
            SELECT
                DATE_TRUNC('day', order_date) as date,
                COUNT(*) as order_count,
                SUM(amount) as total_sales,
                AVG(amount) as avg_order_value,
                COUNT(DISTINCT customer_id) as unique_customers
            FROM orders
            WHERE order_date BETWEEN ? AND ?
            GROUP BY date
            ORDER BY date
        """, [start_date, end_date]).df()

    def top_products(self, limit=10):
        """売れ筋商品TOP10"""
        return self.con.execute("""
            SELECT
                product_name,
                SUM(quantity) as total_quantity,
                SUM(amount) as total_revenue,
                AVG(amount / quantity) as avg_price
            FROM order_items
            JOIN products ON order_items.product_id = products.id
            GROUP BY product_name
            ORDER BY total_revenue DESC
            LIMIT ?
        """, [limit]).df()

    def customer_segmentation(self):
        """顧客セグメンテーション（RFM分析）"""
        return self.con.execute("""
            WITH customer_metrics AS (
                SELECT
                    customer_id,
                    MAX(order_date) as last_order_date,
                    COUNT(*) as frequency,
                    SUM(amount) as monetary
                FROM orders
                GROUP BY customer_id
            )
            SELECT
                customer_id,
                DATE_DIFF('day', last_order_date, CURRENT_DATE) as recency,
                frequency,
                monetary,
                NTILE(5) OVER (ORDER BY DATE_DIFF('day', last_order_date, CURRENT_DATE)) as r_score,
                NTILE(5) OVER (ORDER BY frequency DESC) as f_score,
                NTILE(5) OVER (ORDER BY monetary DESC) as m_score
            FROM customer_metrics
        """).df()

# 使用例
analytics = SalesAnalytics()
summary = analytics.daily_summary('2024-01-01', '2024-01-31')
top_products = analytics.top_products(10)
```

### 3. ETLパイプライン

```python
import duckdb
from datetime import datetime

def etl_pipeline(input_dir, output_file):
    """
    ETLパイプライン: 抽出、変換、ロード
    """
    con = duckdb.connect()

    print("1. 抽出（Extract）")
    # 複数のCSVファイルを読み込み
    con.execute(f"""
        CREATE TABLE raw_data AS
        SELECT * FROM read_csv_auto('{input_dir}/*.csv')
    """)

    print("2. 変換（Transform）")
    # データクレンジングと変換
    con.execute("""
        CREATE TABLE cleaned_data AS
        SELECT
            id,
            UPPER(TRIM(name)) as name,
            CAST(amount AS DECIMAL(10,2)) as amount,
            CAST(date AS DATE) as date,
            category
        FROM raw_data
        WHERE amount > 0
          AND date IS NOT NULL
    """)

    # 集計
    con.execute("""
        CREATE TABLE aggregated_data AS
        SELECT
            DATE_TRUNC('month', date) as month,
            category,
            SUM(amount) as total_amount,
            COUNT(*) as transaction_count,
            AVG(amount) as avg_amount
        FROM cleaned_data
        GROUP BY month, category
    """)

    print("3. ロード（Load）")
    # Parquet形式で保存
    con.execute(f"""
        COPY aggregated_data
        TO '{output_file}'
        (FORMAT PARQUET, COMPRESSION 'ZSTD')
    """)

    print(f"完了: {output_file}")

    # 統計情報を返す
    stats = con.execute("""
        SELECT
            (SELECT COUNT(*) FROM raw_data) as raw_count,
            (SELECT COUNT(*) FROM cleaned_data) as cleaned_count,
            (SELECT COUNT(*) FROM aggregated_data) as aggregated_count
    """).fetchone()

    return stats

# 実行
stats = etl_pipeline('/data/raw', '/data/processed/summary.parquet')
print(f"元データ: {stats[0]:,}行")
print(f"クレンジング後: {stats[1]:,}行")
print(f"集計後: {stats[2]:,}行")
```

### 4. 機械学習の前処理

```python
import duckdb
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier

def ml_preprocessing(data_file):
    """
    機械学習向けデータ前処理
    """
    con = duckdb.connect()

    # 特徴量エンジニアリング
    features = con.execute(f"""
        WITH user_features AS (
            SELECT
                user_id,
                COUNT(*) as purchase_count,
                SUM(amount) as total_spent,
                AVG(amount) as avg_purchase,
                STDDEV(amount) as purchase_variance,
                MAX(purchase_date) as last_purchase,
                MIN(purchase_date) as first_purchase,
                DATE_DIFF('day', MIN(purchase_date), MAX(purchase_date)) as customer_lifetime_days,
                COUNT(DISTINCT category) as category_diversity
            FROM purchases
            GROUP BY user_id
        )
        SELECT
            user_id,
            purchase_count,
            total_spent,
            avg_purchase,
            purchase_variance,
            DATE_DIFF('day', last_purchase, CURRENT_DATE) as days_since_last_purchase,
            customer_lifetime_days,
            category_diversity,
            CASE
                WHEN total_spent > 1000 THEN 1
                ELSE 0
            END as is_high_value
        FROM user_features
        WHERE purchase_count >= 3
    """).df()

    return features

# 前処理してモデル学習
df = ml_preprocessing('purchases.parquet')
X = df.drop(['user_id', 'is_high_value'], axis=1)
y = df['is_high_value']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
model = RandomForestClassifier()
model.fit(X_train, y_train)
print(f"精度: {model.score(X_test, y_test):.2%}")
```

### 5. リアルタイムダッシュボード用データ準備

```python
import duckdb
from datetime import datetime, timedelta

def prepare_dashboard_data():
    """
    ダッシュボード用のサマリーデータを準備
    """
    con = duckdb.connect('analytics.duckdb')

    # 最新データを増分更新
    last_update = con.execute("""
        SELECT MAX(timestamp) FROM dashboard_summary
    """).fetchone()[0] or '2000-01-01'

    # 新しいデータだけ処理
    con.execute(f"""
        INSERT INTO dashboard_summary
        SELECT
            DATE_TRUNC('minute', timestamp) as minute,
            COUNT(*) as event_count,
            COUNT(DISTINCT user_id) as unique_users,
            AVG(response_time) as avg_response_time
        FROM events
        WHERE timestamp > '{last_update}'
        GROUP BY minute
    """)

    # ダッシュボード用クエリ（高速）
    last_hour = con.execute("""
        SELECT * FROM dashboard_summary
        WHERE minute >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
        ORDER BY minute DESC
    """).df()

    return last_hour

# 定期実行（例: 1分ごと）
dashboard_data = prepare_dashboard_data()
```

### 6. データ品質チェック

```python
import duckdb

def data_quality_check(table_name):
    """
    データ品質チェック
    """
    con = duckdb.connect('data.duckdb')

    report = {}

    # 行数
    report['total_rows'] = con.execute(f"""
        SELECT COUNT(*) FROM {table_name}
    """).fetchone()[0]

    # NULL値チェック
    columns = con.execute(f"""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = '{table_name}'
    """).fetchall()

    for (col,) in columns:
        null_count = con.execute(f"""
            SELECT COUNT(*)
            FROM {table_name}
            WHERE {col} IS NULL
        """).fetchone()[0]

        if null_count > 0:
            report[f'{col}_nulls'] = null_count

    # 重複チェック
    report['duplicates'] = con.execute(f"""
        SELECT COUNT(*) - COUNT(DISTINCT *)
        FROM {table_name}
    """).fetchone()[0]

    return report

# 実行
quality_report = data_quality_check('users')
print(quality_report)
```

---

## 🎯 ベストプラクティス

### 1. **段階的な処理**
```python
# データを段階的に絞り込む
# 1. 大まかなフィルタ
# 2. データ変換
# 3. 詳細な集計
```

### 2. **中間テーブルの活用**
```python
# 複雑なクエリは中間テーブルに分割
CREATE TABLE intermediate AS SELECT ...;
SELECT * FROM intermediate WHERE ...;
```

### 3. **エラーハンドリング**
```python
try:
    result = con.execute(query)
except duckdb.Error as e:
    print(f"エラー: {e}")
    # リトライやログ記録
```

---

## 🎓 まとめ

おめでとうございます！DuckDBカリキュラムを完了しました。

### 学んだこと
1. DuckDBの基礎（組み込み型、列指向、ベクトル化）
2. ファイル処理（Parquet、CSV）
3. DataFrameとの統合
4. 高度なSQL（ウィンドウ関数、集約）
5. 拡張機能
6. パフォーマンスチューニング
7. 実践的なユースケース

### 次のステップ
- 実際のプロジェクトでDuckDBを活用
- コミュニティに参加
- 公式ドキュメントで更なる機能を学習

---

**Happy Data Analysis with DuckDB! 🦆**
