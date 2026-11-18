import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  plugins: [tailwindcss(), vue(), ...(command === 'serve' ? [cloudflare()] : [])],
  build: {
    rollupOptions: {
      input: {
        client: './src/client/main.ts'
      },
      output: {
        dir: 'dist/static',
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/style.css'
      }
    }
  }
}))
