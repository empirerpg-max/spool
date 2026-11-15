import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    // Database tests need Postgres: run them with `npm run test:db`.
    fileParallelism: !process.env.VITEST_DB,
    exclude: process.env.VITEST_DB ? ['node_modules/**'] : ['tests/db/**', 'node_modules/**'],
  },
});
