import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.VITE_WEB_BASE || '/',
  plugins: [react()],
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  build: { outDir: 'dist-web', emptyOutDir: true },
})
