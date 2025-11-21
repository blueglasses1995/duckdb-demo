-- DuckDB CLI サンプル
-- 実行方法: python -c "import duckdb; duckdb.sql(open('cli_example.sql').read())"

-- データベース情報の表示
SELECT 'DuckDB バージョン:' as info, version() as value;

-- サンプルテーブルの作成
CREATE TABLE IF NOT EXISTS products (
    id INTEGER,
    name VARCHAR,
    price DECIMAL(10,2),
    category VARCHAR,
    stock INTEGER
);

-- データ挿入
INSERT INTO products VALUES
    (1, 'ノートPC', 89800, 'Electronics', 15),
    (2, 'マウス', 2980, 'Electronics', 50),
    (3, 'デスク', 29800, 'Furniture', 8),
    (4, 'チェア', 19800, 'Furniture', 12),
    (5, 'モニター', 24800, 'Electronics', 20);

-- 基本的なクエリ
SELECT '=== 全製品リスト ===' as section;
SELECT * FROM products ORDER BY id;

-- 集計クエリ
SELECT '=== カテゴリ別集計 ===' as section;
SELECT
    category,
    COUNT(*) as product_count,
    SUM(price) as total_value,
    AVG(price) as avg_price,
    SUM(stock) as total_stock
FROM products
GROUP BY category
ORDER BY total_value DESC;

-- フィルタとソート
SELECT '=== 高額商品（20,000円以上）===' as section;
SELECT name, price, stock
FROM products
WHERE price >= 20000
ORDER BY price DESC;

-- CSVエクスポート例（コメントアウト）
-- COPY products TO 'products.csv' (HEADER, DELIMITER ',');

-- Parquetエクスポート例（コメントアウト）
-- COPY products TO 'products.parquet' (FORMAT PARQUET);
