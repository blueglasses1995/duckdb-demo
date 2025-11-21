#!/usr/bin/env python3
"""
DuckDB Python API 応用サンプル
実践的なユースケース
"""

import duckdb
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def example_sales_analysis():
    """例1: 売上分析システム"""
    print("=== 例1: 売上分析システム ===\n")

    con = duckdb.connect('sales_analysis.duckdb')

    # サンプル売上データ生成
    np.random.seed(42)
    dates = pd.date_range('2024-01-01', periods=365, freq='D')
    n_products = 5
    products = ['商品A', '商品B', '商品C', '商品D', '商品E']

    sales_data = []
    for date in dates:
        for product in products:
            quantity = np.random.randint(10, 100)
            price = np.random.randint(1000, 5000)
            sales_data.append({
                'date': date,
                'product': product,
                'quantity': quantity,
                'amount': quantity * price
            })

    df = pd.DataFrame(sales_data)

    # データをテーブルとして登録
    con.execute("CREATE OR REPLACE TABLE sales AS SELECT * FROM df")

    # 月次売上サマリー
    monthly_summary = con.execute("""
        SELECT
            DATE_TRUNC('month', date) as month,
            SUM(amount) as total_sales,
            SUM(quantity) as total_quantity,
            COUNT(DISTINCT product) as products_sold
        FROM sales
        GROUP BY month
        ORDER BY month
        LIMIT 12
    """).df()

    print("月次売上サマリー:")
    print(monthly_summary.to_string(index=False))

    # 商品別パフォーマンス
    product_performance = con.execute("""
        SELECT
            product,
            SUM(amount) as total_revenue,
            SUM(quantity) as total_units,
            AVG(amount / quantity) as avg_price
        FROM sales
        GROUP BY product
        ORDER BY total_revenue DESC
    """).df()

    print("\n商品別パフォーマンス:")
    print(product_performance.to_string(index=False))

    con.close()
    print()


def example_log_analysis():
    """例2: ログ分析"""
    print("=== 例2: ログ分析 ===\n")

    con = duckdb.connect()

    # サンプルログデータ
    log_data = pd.DataFrame({
        'timestamp': pd.date_range('2024-01-01', periods=1000, freq='1min'),
        'level': np.random.choice(['INFO', 'WARNING', 'ERROR'], 1000, p=[0.7, 0.2, 0.1]),
        'user_id': np.random.randint(1, 100, 1000),
        'response_time': np.random.exponential(100, 1000)
    })

    # 時間帯別のログレベル分布
    hourly_distribution = con.execute("""
        SELECT
            DATE_TRUNC('hour', timestamp) as hour,
            level,
            COUNT(*) as count
        FROM log_data
        GROUP BY hour, level
        ORDER BY hour, level
        LIMIT 24
    """).df()

    print("時間帯別ログレベル分布（最初の24時間）:")
    print(hourly_distribution.head(24).to_string(index=False))

    # エラー発生ユーザーの分析
    error_users = con.execute("""
        SELECT
            user_id,
            COUNT(*) as error_count,
            AVG(response_time) as avg_response_time
        FROM log_data
        WHERE level = 'ERROR'
        GROUP BY user_id
        HAVING COUNT(*) >= 3
        ORDER BY error_count DESC
    """).df()

    print(f"\nエラー頻発ユーザー（3回以上）: {len(error_users)}人")
    print(error_users.head(10).to_string(index=False))
    print()


def example_data_pipeline():
    """例3: ETLパイプライン"""
    print("=== 例3: ETLパイプライン ===\n")

    con = duckdb.connect()

    # Extract: 生データ
    raw_data = pd.DataFrame({
        'id': range(1, 101),
        'name': [f'User {i}' for i in range(1, 101)],
        'age': np.random.randint(18, 70, 100),
        'income': np.random.randint(3000000, 10000000, 100),
        'region': np.random.choice(['東京', '大阪', '名古屋', '福岡'], 100)
    })

    print("1. Extract（抽出）:")
    print(f"   元データ: {len(raw_data)}行")

    # Transform: データ変換・クレンジング
    transformed = con.execute("""
        SELECT
            id,
            name,
            age,
            income,
            region,
            CASE
                WHEN age < 30 THEN '20代以下'
                WHEN age < 40 THEN '30代'
                WHEN age < 50 THEN '40代'
                ELSE '50代以上'
            END as age_group,
            CASE
                WHEN income < 5000000 THEN '低所得'
                WHEN income < 7000000 THEN '中所得'
                ELSE '高所得'
            END as income_group
        FROM raw_data
        WHERE age >= 20  -- 20歳未満を除外
    """).df()

    print(f"2. Transform（変換）:")
    print(f"   変換後データ: {len(transformed)}行")

    # Load: 集計してロード
    summary = con.execute("""
        SELECT
            region,
            age_group,
            income_group,
            COUNT(*) as count,
            AVG(income) as avg_income
        FROM transformed
        GROUP BY region, age_group, income_group
        ORDER BY region, age_group, income_group
    """).df()

    print("3. Load（ロード）:")
    print("   地域・年齢・収入グループ別集計:")
    print(summary.head(20).to_string(index=False))

    # Parquetで保存
    con.execute("""
        COPY summary TO 'etl_output.parquet' (FORMAT PARQUET)
    """)
    print("\n   出力: etl_output.parquet")
    print()


def example_time_series_analysis():
    """例4: 時系列分析"""
    print("=== 例4: 時系列分析 ===\n")

    con = duckdb.connect()

    # 時系列データ生成
    dates = pd.date_range('2024-01-01', periods=90, freq='D')
    base_value = 1000
    trend = np.linspace(0, 200, 90)
    seasonality = 50 * np.sin(np.linspace(0, 4 * np.pi, 90))
    noise = np.random.normal(0, 20, 90)

    time_series = pd.DataFrame({
        'date': dates,
        'value': base_value + trend + seasonality + noise
    })

    # 移動平均と前日比
    analysis = con.execute("""
        SELECT
            date,
            value,
            AVG(value) OVER (
                ORDER BY date
                ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
            ) as moving_avg_7d,
            value - LAG(value) OVER (ORDER BY date) as daily_change,
            ROUND((value / LAG(value) OVER (ORDER BY date) - 1) * 100, 2) as daily_change_pct
        FROM time_series
        ORDER BY date
    """).df()

    print("時系列分析（最初の10日間）:")
    print(analysis.head(10).to_string(index=False))

    # 週次集計
    weekly = con.execute("""
        SELECT
            DATE_TRUNC('week', date) as week,
            MIN(value) as min_value,
            MAX(value) as max_value,
            AVG(value) as avg_value,
            STDDEV(value) as std_value
        FROM time_series
        GROUP BY week
        ORDER BY week
    """).df()

    print(f"\n週次統計（全{len(weekly)}週）:")
    print(weekly.head(10).to_string(index=False))
    print()


def example_customer_segmentation():
    """例5: 顧客セグメンテーション（RFM分析）"""
    print("=== 例5: 顧客セグメンテーション（RFM分析）===\n")

    con = duckdb.connect()

    # 顧客購入データ生成
    n_customers = 1000
    transactions = []

    for customer_id in range(1, n_customers + 1):
        n_purchases = np.random.randint(1, 20)
        for _ in range(n_purchases):
            days_ago = np.random.randint(0, 365)
            amount = np.random.randint(1000, 50000)
            transactions.append({
                'customer_id': customer_id,
                'purchase_date': datetime.now() - timedelta(days=days_ago),
                'amount': amount
            })

    purchases = pd.DataFrame(transactions)

    # RFM分析
    rfm_analysis = con.execute("""
        WITH customer_metrics AS (
            SELECT
                customer_id,
                DATE_DIFF('day', MAX(purchase_date), CURRENT_DATE) as recency,
                COUNT(*) as frequency,
                SUM(amount) as monetary
            FROM purchases
            GROUP BY customer_id
        )
        SELECT
            customer_id,
            recency,
            frequency,
            monetary,
            NTILE(5) OVER (ORDER BY recency) as r_score,
            NTILE(5) OVER (ORDER BY frequency DESC) as f_score,
            NTILE(5) OVER (ORDER BY monetary DESC) as m_score
        FROM customer_metrics
    """).df()

    # セグメント分類
    rfm_analysis['segment'] = rfm_analysis.apply(
        lambda row: 'VIP' if row['r_score'] >= 4 and row['f_score'] >= 4 and row['m_score'] >= 4
        else '優良' if row['r_score'] >= 3 and row['f_score'] >= 3
        else '要注意' if row['r_score'] <= 2
        else '一般',
        axis=1
    )

    # セグメント別サマリー
    segment_summary = rfm_analysis.groupby('segment').agg({
        'customer_id': 'count',
        'recency': 'mean',
        'frequency': 'mean',
        'monetary': 'mean'
    }).round(2)

    print("顧客セグメント別サマリー:")
    print(segment_summary)

    print(f"\n全顧客数: {len(rfm_analysis)}")
    print("\nセグメント分布:")
    print(rfm_analysis['segment'].value_counts())
    print()


if __name__ == '__main__':
    print("DuckDB Python API 応用サンプル集\n")

    example_sales_analysis()
    example_log_analysis()
    example_data_pipeline()
    example_time_series_analysis()
    example_customer_segmentation()

    print("=== 全てのサンプルが完了しました ===")
