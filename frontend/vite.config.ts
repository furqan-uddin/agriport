import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // The DataGrid and Recharts vendor chunks legitimately exceed 500 kB; raise the
    // advisory limit so the (harmless) warning doesn't clutter the build output.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Split heavy third-party libraries into their own cacheable vendor chunks.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@mui/x-data-grid') || id.includes('@mui/x-date-pickers')) return 'mui-x'
          if (id.includes('@mui/') || id.includes('@emotion/')) return 'mui'
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-')) return 'charts'
          if (id.includes('@reduxjs') || id.includes('react-redux')) return 'redux'
          if (id.includes('react-router') || id.includes('/react-dom/') || id.includes('/react/')) return 'react-vendor'
        },
      },
    },
  },
})
