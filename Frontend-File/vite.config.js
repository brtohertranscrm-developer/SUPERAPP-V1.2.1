import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Vite env default hanya expose VITE_* kalau prefix-nya 'VITE_'
  // Kita load tanpa prefix filter agar bisa pakai juga ENV non-VITE_ bila perlu.
  const env = loadEnv(mode, process.cwd(), '')

  // Dev proxy cuma kepakai saat `npm run dev`.
  // Jangan hardcode di file ini lagi; cukup set env di mesin kalau butuh override.
  const proxyTarget =
    (env.VITE_DEV_PROXY_TARGET || env.VITE_API_URL || '').trim() || 'http://localhost:5001'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
    },
  }
})
