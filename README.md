# DuckDB デモプロジェクト

DuckDBを学ぶための包括的なリソース集です。カリキュラムと実践的なサンプルコードが含まれています。

## 📚 プロジェクト構成

```
duckdb-demo/
├── curriculum/          # 学習用カリキュラム（日本語）
│   ├── README.md       # カリキュラム目次
│   ├── 01-overview.md  # 機能全体像
│   ├── 02-technical-principles.md  # 技術的原理
│   └── ...（全12章）
│
└── examples/           # 実践的なサンプルコード
    ├── README.md       # サンプルの使い方
    ├── cli_example.sql # SQL実行サンプル
    ├── run_cli.py      # CLI実行スクリプト
    ├── python_basic.py # Python基本サンプル
    └── python_advanced.py  # Python応用サンプル
```

## 🚀 クイックスタート

### 1. 環境構築

```bash
# DuckDB Python版をインストール
pip install duckdb pandas

# バージョン確認
python -c "import duckdb; print(f'DuckDB version: {duckdb.__version__}')"
```

### 2. サンプルを実行

```bash
# ディレクトリ移動
cd examples/

# CLIサンプル実行
python run_cli.py cli_example.sql

# Python基本サンプル実行
python python_basic.py

# Python応用サンプル実行
python python_advanced.py
```

### 3. カリキュラムで学習

```bash
# カリキュラムを開く
cd curriculum/

# 01から順に学習
cat 01-overview.md
cat 02-technical-principles.md
# ...
```

## 📖 学習の進め方

### 初心者向け

1. **[カリキュラム目次](./curriculum/README.md)** を確認
2. **[01. 機能全体像](./curriculum/01-overview.md)** でDuckDBの概要を理解
3. **[examples/python_basic.py](./examples/python_basic.py)** を実行して基本を体験
4. カリキュラムを順番に学習（01→02→03...）

### 中級者向け

1. **[02. 技術的原理](./curriculum/02-technical-principles.md)** で内部動作を理解
2. **[examples/python_advanced.py](./examples/python_advanced.py)** で実践的なユースケースを学習
3. 興味のある章を深掘り（ウィンドウ関数、パフォーマンスチューニングなど）

### 上級者向け

1. **[11. パフォーマンスチューニング](./curriculum/11-performance-tuning.md)** で最適化技術を習得
2. **[12. 実践的ユースケース](./curriculum/12-practical-use-cases.md)** で実案件への適用を検討
3. 自分のプロジェクトに導入

## 🎯 DuckDBとは

**DuckDB**は分析処理（OLAP）に特化した組み込み型SQLデータベースです。

### 主な特徴

- ✅ **サーバー不要** - ライブラリとして動作、簡単にセットアップ
- ✅ **超高速** - 列指向ストレージとベクトル化実行で従来のDBより10-1000倍高速
- ✅ **ファイル直接クエリ** - Parquet、CSVを直接クエリ可能（インポート不要）
- ✅ **Pandas統合** - ゼロコピーでDataFrameと連携
- ✅ **SQL準拠** - 標準SQLと豊富な分析関数

### 適用分野

- データ分析、探索的データ分析（EDA）
- ログ解析、レポート生成
- ETLパイプライン
- 機械学習の前処理
- データサイエンス全般

## 📝 カリキュラム内容

### 第1部：基礎知識
- [01. DuckDB 機能全体像](./curriculum/01-overview.md)
- [02. 技術的原理](./curriculum/02-technical-principles.md)

### 第2部：基本機能（ステップバイステップ）
- [03. In-Process Database](./curriculum/03-in-process-database.md) - 組み込み型データベース
- [04. 列指向ストレージ](./curriculum/04-columnar-storage.md) - 高速性の秘密
- [05. ベクトル化実行](./curriculum/05-vectorized-execution.md) - CPU効率化
- [06. Parquet/CSV読み込み](./curriculum/06-parquet-csv.md) - ファイル直接クエリ
- [07. DataFrameインテグレーション](./curriculum/07-dataframe-integration.md) - Pandas/Polars連携
- [08. ウィンドウ関数](./curriculum/08-window-functions.md) - 高度な分析
- [09. 集約処理とグループ化](./curriculum/09-aggregations.md) - データ集計
- [10. 拡張機能](./curriculum/10-extensions.md) - HTTPfs、JSON、全文検索など

### 第3部：実践
- [11. パフォーマンスチューニング](./curriculum/11-performance-tuning.md)
- [12. 実践的ユースケース](./curriculum/12-practical-use-cases.md)

## 💻 サンプルコード

### CLI実行例

```bash
python run_cli.py cli_example.sql
```

出力:
```
=== cli_example.sql を実行中 ===

info | value
------------
DuckDB バージョン: | v1.4.2

=== 全製品リスト ===
id | name | price | category | stock
------------------------------------
1 | ノートPC | 89800.00 | Electronics | 15
2 | マウス | 2980.00 | Electronics | 50
...
```

### Pythonコード例

```python
import duckdb
import pandas as pd

# DataFrameを作成
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
#     name  score
# 0    Bob     92
# 1  Alice     85
```

## 🔧 環境情報

- **DuckDB version**: 1.4.2
- **Python**: 3.11+
- **依存ライブラリ**: pandas, numpy

## 📚 参考資料

- [DuckDB公式サイト](https://duckdb.org/)
- [DuckDB公式ドキュメント](https://duckdb.org/docs/)
- [DuckDB Python API](https://duckdb.org/docs/api/python/overview)
- [DuckDB GitHub](https://github.com/duckdb/duckdb)

## 🤝 貢献

このプロジェクトは学習目的で作成されています。

## 📄 ライセンス

このプロジェクトは教育・学習目的で自由に使用できます。

---

**Happy Data Analysis with DuckDB! 🦆**
