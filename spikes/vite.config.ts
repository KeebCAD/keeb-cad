import { defineConfig } from 'vite'

// Port 4174 so the spike never collides with app/'s preview on 4173.
export default defineConfig({
  worker: { format: 'es' },
  preview: { port: 4174, strictPort: true },
})
