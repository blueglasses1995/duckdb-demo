import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // Web Worker用の設定
  worker: {
    format: 'es'
  },

  // DuckDB WASM用の最適化
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm'],
    esbuildOptions: {
      target: 'esnext'
    }
  },

  // CORS対応（DuckDB WASMに必要）
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },

  build: {
    target: 'esnext'
  }
})
