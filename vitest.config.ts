import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // macOS AppleDouble resource-fork files (repo on an external drive) are
    // binary junk that otherwise matches the include globs and fails to parse.
    exclude: ['**/node_modules/**', '**/._*'],
  },
});
