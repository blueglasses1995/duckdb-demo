# DuckDB カリキュラム

このカリキュラムは、DuckDBを基礎から実践まで学ぶためのステップバイステップガイドです。

## 📚 カリキュラム構成

### 第1部：基礎知識
- [01. DuckDB 機能全体像](./01-overview.md)
- [02. 技術的原理](./02-technical-principles.md)

### 第2部：基本機能（ステップバイステップ）
- [03. In-Process Database（組み込み型データベース）](./03-in-process-database.md)
- [04. 列指向ストレージ（Columnar Storage）](./04-columnar-storage.md)
- [05. ベクトル化実行（Vectorized Execution）](./05-vectorized-execution.md)
- [06. Parquet/CSV読み込み](./06-parquet-csv.md)
- [07. DataFrameインテグレーション](./07-dataframe-integration.md)
- [08. ウィンドウ関数](./08-window-functions.md)
- [09. 集約処理とグループ化](./09-aggregations.md)
- [10. 拡張機能（Extensions）](./10-extensions.md)

### 第3部：実践
- [11. パフォーマンスチューニング](./11-performance-tuning.md)
- [12. 実践的ユースケース](./12-practical-use-cases.md)

## 🎯 学習の進め方

1. **順番に学習**: 各章は前の章の知識を基に構築されています
2. **実装例を実行**: 各章の実装例を実際に実行してみましょう
3. **比較検証**: 他のデータベースやツールとの違いを理解しましょう
4. **応用**: 各章の知識を組み合わせて実践的な問題に取り組みましょう

## 💡 各章の構成

各機能の章は以下の構成になっています：

- **概要**: 機能の説明
- **メリット**: この機能を使うことで得られる利点
- **デメリット**: 制約や注意点
- **技術的原理**: 内部でどのように動作するか
- **ユースケース**: 実際の使用場面
- **実装例**: 実際に動くコード例

## 🚀 開始方法

```bash
# DuckDBのインストール
pip install duckdb

# Pythonで確認
python -c "import duckdb; print(duckdb.__version__)"
```

それでは、[01. DuckDB 機能全体像](./01-overview.md) から始めましょう！
