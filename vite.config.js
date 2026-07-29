import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { snapshotIndexPlugin } from './vite.snapshot-index.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), snapshotIndexPlugin()],
  server: {
    port: 5174,
    strictPort: true,
  },
})
