import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const enableHMR = process.env.VITE_ENABLE_HMR === 'true'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: './',
  server: {
    hmr: enableHMR // 
  }
})
