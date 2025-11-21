import { useState, useEffect, useCallback } from 'react'
import { getWorkerClient } from '../utils/workerClient'

export function useDuckDB() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // 初期化
  useEffect(() => {
    let mounted = true

    async function init() {
      try {
        const client = getWorkerClient()
        await client.init()
        if (mounted) {
          setIsInitialized(true)
        }
      } catch (err) {
        if (mounted) {
          setError(err.message)
          console.error('DuckDB initialization error:', err)
        }
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [])

  // クエリ実行
  const query = useCallback(async (sql) => {
    setIsLoading(true)
    setError(null)

    try {
      const client = getWorkerClient()
      const result = await client.query(sql)
      return result
    } catch (err) {
      setError(err.message)
      console.error('Query error:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // CSVからテーブル作成
  const createTableFromCSV = useCallback(async (tableName, csvContent) => {
    setIsLoading(true)
    setError(null)

    try {
      const client = getWorkerClient()
      await client.createTableFromCSV(tableName, csvContent)
    } catch (err) {
      setError(err.message)
      console.error('Create table error:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // テーブル一覧取得
  const listTables = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const client = getWorkerClient()
      const tables = await client.listTables()
      return tables
    } catch (err) {
      setError(err.message)
      console.error('List tables error:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isInitialized,
    isLoading,
    error,
    query,
    createTableFromCSV,
    listTables
  }
}
