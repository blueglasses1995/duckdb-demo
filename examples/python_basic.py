#!/usr/bin/env python3
"""
DuckDB Python API 基本サンプル
"""

import duckdb
import pandas as pd

def example_1_basic_usage():
    """例1: 基本的な使い方"""
    print("=== 例1: 基本的な使い方 ===")

    # インメモリデータベースに接続
    con = duckdb.connect(':memory:')

    # テーブル作成とデータ挿入
    con.execute("""
        CREATE TABLE employees (
            id INTEGER,
            name VARCHAR,
            department VARCHAR,
            salary INTEGER
        )
    """)

    con.execute("""
        INSERT INTO employees VALUES
        (1, '田中太郎', '営業部', 450000),
        (2, '佐藤花子', '開発部', 520000),
        (3, '鈴木一郎', '営業部', 480000),
        (4, '高橋美咲', '開発部', 550000),
        (5, '伊藤健太', '総務部', 380000)
    """)

    # クエリ実行
    result = con.execute("SELECT * FROM employees ORDER BY salary DESC").fetchall()

    print("全従業員（給与順）:")
    for row in result:
        print(f"  {row[1]} - {row[2]} - ¥{row[3]:,}")

    con.close()
    print()


def example_2_dataframe_integration():
    """例2: Pandas DataFrameとの統合"""
    print("=== 例2: Pandas DataFrameとの統合 ===")

    # Pandasデータフレーム作成
    df = pd.DataFrame({
        'product': ['りんご', 'バナナ', 'オレンジ', 'ぶどう', 'いちご'],
        'price': [150, 80, 120, 300, 250],
        'quantity': [10, 15, 8, 5, 12]
    })

    print("元のDataFrame:")
    print(df)
    print()

    # DuckDBで直接クエリ
    result = duckdb.query("""
        SELECT
            product,
            price,
            quantity,
            price * quantity as total_value
        FROM df
        WHERE price >= 100
        ORDER BY total_value DESC
    """).df()

    print("¥100以上の商品（合計金額順）:")
    print(result)
    print()


def example_3_aggregation():
    """例3: 集計処理"""
    print("=== 例3: 集計処理 ===")

    con = duckdb.connect()

    # サンプルデータ
    df = pd.DataFrame({
        'category': ['食品', '電化製品', '食品', '衣料品', '電化製品', '食品'],
        'amount': [1500, 25000, 800, 3500, 18000, 1200]
    })

    # カテゴリ別集計
    result = con.execute("""
        SELECT
            category,
            COUNT(*) as count,
            SUM(amount) as total,
            AVG(amount) as average,
            MIN(amount) as minimum,
            MAX(amount) as maximum
        FROM df
        GROUP BY category
        ORDER BY total DESC
    """).df()

    print("カテゴリ別集計:")
    print(result.to_string(index=False))
    print()


def example_4_csv_operations():
    """例4: CSVファイルの読み書き"""
    print("=== 例4: CSVファイルの読み書き ===")

    con = duckdb.connect()

    # サンプルデータ作成
    df = pd.DataFrame({
        'id': range(1, 6),
        'name': ['商品A', '商品B', '商品C', '商品D', '商品E'],
        'sales': [12000, 8500, 15000, 9800, 11200]
    })

    # CSVとして保存
    csv_file = 'sample_data.csv'
    con.execute(f"""
        COPY df TO '{csv_file}' (HEADER, DELIMITER ',')
    """)
    print(f"CSVファイル作成: {csv_file}")

    # CSVから読み込み
    result = con.execute(f"""
        SELECT * FROM read_csv_auto('{csv_file}')
        WHERE sales > 10000
    """).df()

    print(f"\n{csv_file}から読み込み（売上 > 10,000）:")
    print(result.to_string(index=False))
    print()


def example_5_parquet_operations():
    """例5: Parquetファイルの読み書き"""
    print("=== 例5: Parquetファイルの読み書き ===")

    con = duckdb.connect()

    # サンプルデータ
    df = pd.DataFrame({
        'date': pd.date_range('2024-01-01', periods=5),
        'value': [100, 120, 115, 130, 125]
    })

    # Parquet形式で保存
    parquet_file = 'sample_data.parquet'
    con.execute(f"""
        COPY df TO '{parquet_file}' (FORMAT PARQUET)
    """)
    print(f"Parquetファイル作成: {parquet_file}")

    # Parquetから読み込み
    result = con.execute(f"""
        SELECT
            date,
            value,
            AVG(value) OVER (ORDER BY date) as running_avg
        FROM '{parquet_file}'
    """).df()

    print(f"\n{parquet_file}から読み込み（移動平均付き）:")
    print(result.to_string(index=False))
    print()


def example_6_window_functions():
    """例6: ウィンドウ関数"""
    print("=== 例6: ウィンドウ関数 ===")

    con = duckdb.connect()

    # 売上データ
    df = pd.DataFrame({
        'salesperson': ['田中', '佐藤', '鈴木', '田中', '佐藤', '鈴木'],
        'month': ['1月', '1月', '1月', '2月', '2月', '2月'],
        'sales': [100, 150, 120, 110, 140, 130]
    })

    # ランキングと累積売上
    result = con.execute("""
        SELECT
            salesperson,
            month,
            sales,
            RANK() OVER (PARTITION BY month ORDER BY sales DESC) as monthly_rank,
            SUM(sales) OVER (PARTITION BY salesperson ORDER BY month) as cumulative_sales
        FROM df
        ORDER BY month, sales DESC
    """).df()

    print("営業担当別ランキングと累積売上:")
    print(result.to_string(index=False))
    print()


def example_7_performance_comparison():
    """例7: パフォーマンス比較（Pandas vs DuckDB）"""
    print("=== 例7: パフォーマンス比較 ===")

    import time
    import numpy as np

    # 大規模データ生成（100万行）
    size = 1_000_000
    df = pd.DataFrame({
        'category': np.random.choice(['A', 'B', 'C', 'D'], size),
        'value': np.random.random(size) * 1000
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

    print(f"データサイズ: {size:,}行")
    print(f"Pandas処理時間: {pandas_time:.3f}秒")
    print(f"DuckDB処理時間: {duckdb_time:.3f}秒")
    print(f"高速化: {pandas_time / duckdb_time:.1f}倍")
    print()


if __name__ == '__main__':
    print("DuckDB Python API サンプル集\n")

    example_1_basic_usage()
    example_2_dataframe_integration()
    example_3_aggregation()
    example_4_csv_operations()
    example_5_parquet_operations()
    example_6_window_functions()
    example_7_performance_comparison()

    print("=== 全てのサンプルが完了しました ===")
