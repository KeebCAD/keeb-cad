import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  root: fileURLToPath(new URL('./', import.meta.url)),
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: fileURLToPath(new URL('../dist/workbench', import.meta.url)),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('index.html', import.meta.url)),
        frame: fileURLToPath(new URL('frame.html', import.meta.url)),
      },
    },
  },
})
