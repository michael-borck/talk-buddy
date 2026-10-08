import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Dev-only CSP relaxation: @vitejs/plugin-react injects an inline
// React-refresh preamble in dev, which the production CSP (script-src
// 'self') rightly blocks. Packaged builds keep the strict policy.
function devCsp() {
  return {
    name: 'dev-csp-relax',
    apply: 'serve' as const,
    transformIndexHtml(html: string) {
      return html.replace("script-src 'self';", "script-src 'self' 'unsafe-inline';");
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), devCsp()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
    },
    // onnxruntime-web: prefer the "extern wasm" build, which never references
    // the 14MB .wasm from JS — the runtime fetches it from public/ort/ via
    // ort.env.wasm.wasmPaths instead. Prevents a duplicate hashed copy of the
    // binary being emitted into dist/assets.
    conditions: ['onnxruntime-web-use-extern-wasm'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 3307,
    strictPort: true,
  },
  optimizeDeps: {
    force: true, // Force rebuild dependencies
  },
});