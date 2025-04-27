import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['api/**/*.{test,spec}.ts'],
    // Add the coverage section
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html'], // Choose reporters: text summary, json file, detailed html report
      // Optional: Specify files to include/exclude from coverage report
      // include: ['api/**/*.{ts,js}'],
      // exclude: ['api/index.ts', '**/node_modules/**', /* other exclusions */],
      all: true, // Report coverage for all files, not just those touched by tests
    },
  },
});