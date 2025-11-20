# 10. 拡張機能（Extensions）

## 📖 概要

DuckDBは**拡張機能（Extensions）**により、機能を動的に追加できます。必要な機能だけをインストールし、コアを軽量に保てます。

---

## ✅ メリット

### 1. **軽量なコア**
- 基本機能のみでコンパクト
- 必要な機能だけ追加

### 2. **豊富なエコシステム**
- HTTPfs: S3、HTTPからファイル読み込み
- JSON: JSON処理
- Spatial: 地理空間データ（PostGIS互換）
- FTS: 全文検索

### 3. **簡単なインストール**
- SQLコマンドで即座にインストール
- 自動ダウンロード

---

## ❌ デメリット

### 1. **依存関係の管理**
- エクステンションのバージョン管理

### 2. **ネットワーク接続必要**
- 初回インストール時

---

## 💻 実装例

### 例1: HTTPfs（S3/HTTP読み込み）

```python
import duckdb

con = duckdb.connect()

# エクステンションのインストール
con.execute("INSTALL httpfs")
con.execute("LOAD httpfs")

# S3から読み込み
con.execute("""
    SET s3_region='us-east-1';
""")

result = con.execute("""
    SELECT *
    FROM 's3://bucket/data.parquet'
    LIMIT 10
""").df()
```

### 例2: JSON処理

```python
con.execute("INSTALL json")
con.execute("LOAD json")

# JSON読み込み
result = con.execute("""
    SELECT *
    FROM read_json_auto('data.json')
""").df()

# ネストされたJSON
result = con.execute("""
    SELECT
        id,
        data->'$.name' as name,
        data->'$.address.city' as city
    FROM json_table
""").df()
```

### 例3: 全文検索（FTS）

```python
con.execute("INSTALL fts")
con.execute("LOAD fts")

# 全文検索インデックス作成
con.execute("""
    PRAGMA create_fts_index(
        'documents',
        'id',
        'content'
    )
""")

# 検索
result = con.execute("""
    SELECT *
    FROM (
        SELECT * FROM documents
        WHERE fts_main_documents.match_bm25(id, 'search term')
    )
    ORDER BY score DESC
""").df()
```

### 例4: 空間データ（Spatial）

```python
con.execute("INSTALL spatial")
con.execute("LOAD spatial")

# ジオメトリの作成
result = con.execute("""
    SELECT
        ST_AsText(
            ST_Point(139.6917, 35.6895)
        ) as tokyo_location
""").fetchone()

# 距離計算
result = con.execute("""
    SELECT
        ST_Distance(
            ST_Point(139.6917, 35.6895),  -- 東京
            ST_Point(135.5023, 34.6937)   -- 大阪
        ) as distance_meters
""").fetchone()
```

### 例5: Excel読み込み

```python
con.execute("INSTALL spatial")  # Excelサポート含む

# Excelファイル読み込み
result = con.execute("""
    SELECT *
    FROM read_excel('data.xlsx', sheet='Sheet1')
""").df()
```

---

## 🎯 主要なエクステンション

| エクステンション | 機能 |
|-----------------|------|
| httpfs | S3、HTTP、HTTPSアクセス |
| json | JSON処理 |
| parquet | Parquet最適化 |
| icu | 国際化（Unicode） |
| fts | 全文検索 |
| spatial | 地理空間データ |
| postgres_scanner | PostgreSQL接続 |
| sqlite_scanner | SQLite読み込み |

---

## 📚 次のステップ

拡張機能を理解したら、次は [11. パフォーマンスチューニング](./11-performance-tuning.md) で最適化テクニックを学びましょう。

---

**キーポイント**:
- 必要な機能だけ追加可能
- SQLコマンドで簡単インストール
- S3、JSON、全文検索、空間データなど多様
- 軽量なコアを維持
