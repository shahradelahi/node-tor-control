import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    hookTimeout: 300_000,
    testTimeout: 120_000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
