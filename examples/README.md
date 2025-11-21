# DuckDB サンプル集

このディレクトリには、DuckDBを単体（CLI）およびPythonから使用するサンプルが含まれています。

## 📦 環境構築

### Python版のインストール

```bash
pip install duckdb pandas
```

### バージョン確認

```bash
python -c "import duckdb; print(f'DuckDB version: {duckdb.__version__}')"
```

現在のバージョン: **1.4.2**

---

## 🚀 使い方

### 1. CLI モード（SQLファイルを実行）

```bash
# SQLファイルを実行
python run_cli.py cli_example.sql
```

**cli_example.sql の内容:**
- テーブル作成とデータ挿入
- 基本的なクエリ（SELECT、WHERE、ORDER BY）
- 集計クエリ（GROUP BY、SUM、AVG）
- CSV/Parquetエクスポート例

### 2. Python API（基本編）

```bash
# 基本サンプルを実行
python python_basic.py
```

**含まれる例:**
1. **基本的な使い方** - テーブル作成、データ挿入、クエリ
2. **Pandas統合** - DataFrameを直接クエリ
3. **集計処理** - GROUP BY、統計関数
4. **CSV操作** - CSVの読み書き
5. **Parquet操作** - Parquetの読み書き
6. **ウィンドウ関数** - ランキング、累積合計
7. **パフォーマンス比較** - Pandas vs DuckDB

### 3. Python API（応用編）

```bash
# 応用サンプルを実行
python python_advanced.py
```

**含まれる例:**
1. **売上分析システム** - 月次・商品別サマリー
2. **ログ分析** - 時間帯別分布、エラー分析
3. **ETLパイプライン** - Extract、Transform、Load
4. **時系列分析** - 移動平均、前日比、週次集計
5. **顧客セグメンテーション** - RFM分析

---

## 📝 サンプルファイル一覧

| ファイル | 説明 | 用途 |
|---------|------|------|
| `cli_example.sql` | SQLサンプル | CLI実行用 |
| `run_cli.py` | SQL実行スクリプト | CLIモード |
| `python_basic.py` | 基本サンプル | 初心者向け |
| `python_advanced.py` | 応用サンプル | 実践的なユースケース |

---

## 💡 使用例

### 例1: インメモリでクエリ実行

```python
import duckdb

# インメモリデータベースに接続
con = duckdb.connect(':memory:')

# クエリ実行
result = con.execute("""
    SELECT 'Hello, DuckDB!' as message
""").fetchone()

print(result[0])  # Hello, DuckDB!
```

### 例2: Pandasとの連携

```python
import duckdb
import pandas as pd

# データフレーム作成
df = pd.DataFrame({
    'name': ['Alice', 'Bob', 'Carol'],
    'score': [85, 92, 78]
})

# DuckDBで直接クエリ
result = duckdb.query("""
    SELECT name, score
    FROM df
    WHERE score >= 80
    ORDER BY score DESC
""").df()

print(result)
```

### 例3: ファイルを直接クエリ

```python
import duckdb

con = duckdb.connect()

# CSVファイルを直接クエリ（インポート不要）
result = con.execute("""
    SELECT *
    FROM read_csv_auto('data.csv')
    WHERE amount > 1000
    LIMIT 10
""").df()

print(result)
```

### 例4: Parquet形式で保存

```python
import duckdb
import pandas as pd

df = pd.DataFrame({
    'id': range(1, 101),
    'value': range(100, 201)
})

con = duckdb.connect()

# Parquet形式で保存（圧縮）
con.execute("""
    COPY df TO 'output.parquet'
    (FORMAT PARQUET, COMPRESSION 'ZSTD')
""")

print("Parquetファイル作成完了")
```

---

## 🎯 実行結果の例

### 基本サンプル（python_basic.py）の出力例

```
DuckDB Python API サンプル集

=== 例1: 基本的な使い方 ===
全従業員（給与順）:
  高橋美咲 - 開発部 - ¥550,000
  佐藤花子 - 開発部 - ¥520,000
  鈴木一郎 - 営業部 - ¥480,000
  田中太郎 - 営業部 - ¥450,000
  伊藤健太 - 総務部 - ¥380,000

=== 例2: Pandas DataFrameとの統合 ===
元のDataFrame:
  product  price  quantity
0    りんご    150        10
1   バナナ     80        15
2  オレンジ    120         8
3    ぶどう    300         5
4   いちご    250        12

¥100以上の商品（合計金額順）:
  product  price  quantity  total_value
0   いちご    250        12         3000
1    りんご    150        10         1500
2    ぶどう    300         5         1500
3  オレンジ    120         8          960

...
```

---

## 🔧 トラブルシューティング

### DuckDBがインストールできない

```bash
# pipのアップグレード
pip install --upgrade pip

# 再インストール
pip install --force-reinstall duckdb
```

### メモリ不足エラー

```python
# メモリ制限を設定
con = duckdb.connect()
con.execute("SET memory_limit='2GB'")
con.execute("SET temp_directory='/tmp/duckdb'")
```

### 型エラー

```python
# 明示的な型変換
con.execute("""
    SELECT CAST(column AS INTEGER) as int_column
    FROM table
""")
```

---

## 📚 参考資料

- [DuckDB公式ドキュメント](https://duckdb.org/docs/)
- [DuckDB Python API](https://duckdb.org/docs/api/python/overview)
- [カリキュラム](../curriculum/README.md) - 詳細な学習資料

---

## 🎓 次のステップ

1. **基本サンプルを実行** - `python_basic.py`で基礎を学習
2. **応用サンプルを実行** - `python_advanced.py`で実践的な使い方を学習
3. **カリキュラムを学習** - [curriculum/](../curriculum/)で詳細を学習
4. **自分のプロジェクトに適用** - 実際のデータで試してみる

---

Happy Data Analysis with DuckDB! 🦆
