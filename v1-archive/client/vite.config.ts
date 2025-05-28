import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ['talkbuddy.serveur.au'],
    hmr: {
      clientPort: 443,
      host: 'talkbuddy.serveur.au'
    }
  }
})
