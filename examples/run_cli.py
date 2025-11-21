#!/usr/bin/env python3
"""
DuckDB CLI モード実行スクリプト
SQLファイルを読み込んで実行
"""

import duckdb
import sys
import re

def run_sql_file(sql_file):
    """SQLファイルを読み込んで実行"""
    print(f"=== {sql_file} を実行中 ===\n")

    # DuckDB接続（インメモリ）
    con = duckdb.connect(':memory:')

    # SQLファイル読み込み
    with open(sql_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # コメント行と空行を除去
    clean_lines = []
    for line in lines:
        stripped = line.strip()
        # 完全なコメント行をスキップ
        if not stripped or stripped.startswith('--'):
            continue
        # 行末のコメントを削除
        if '--' in line:
            line = line[:line.index('--')]
        clean_lines.append(line)

    sql_content = '\n'.join(clean_lines)

    # SQLを実行（セミコロンで分割して1つずつ実行）
    statements = [s.strip() for s in sql_content.split(';') if s.strip()]

    for statement in statements:
        if not statement:
            continue

        try:
            result = con.execute(statement)

            # SELECT文の場合は結果を表示
            if statement.strip().upper().startswith('SELECT'):
                rows = result.fetchall()
                if rows:
                    # カラム名を取得
                    columns = [desc[0] for desc in result.description]

                    # ヘッダー表示
                    print(' | '.join(columns))
                    print('-' * (len(' | '.join(columns))))

                    # データ表示
                    for row in rows:
                        print(' | '.join(str(val) for val in row))
                    print()
        except Exception as e:
            print(f"エラー: {e}")
            print(f"SQL: {statement[:100]}...")
            continue

    con.close()
    print("\n=== 実行完了 ===")

if __name__ == '__main__':
    if len(sys.argv) > 1:
        sql_file = sys.argv[1]
    else:
        sql_file = 'cli_example.sql'

    run_sql_file(sql_file)
