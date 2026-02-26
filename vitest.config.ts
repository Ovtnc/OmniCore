import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    coverage: { reporter: ['text'], include: ['src/**/*.ts'], exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', '**/node_modules/**'] },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
