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
      // kokoro-js's dist imports node builtins it only uses in Node (voice
      // loading from disk). The stub forces its browser fetch path.
      path: path.resolve(__dirname, './src/bench/stubs/empty-module.ts'),
      'fs/promises': path.resolve(__dirname, './src/bench/stubs/empty-module.ts'),
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
    // BENCH_COOP=1 opts the dev server into cross-origin isolation so the
    // speech benchmark can measure multithreaded WASM inference (ORT needs
    // SharedArrayBuffer). Off by default — regular dev doesn't need it.
    ...(process.env.BENCH_COOP
      ? {
          headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
          },
        }
      : {}),
  },
  optimizeDeps: {
    force: true, // Force rebuild dependencies
  },
});