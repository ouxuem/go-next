// frontend/vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path' // Import path module for alias resolution

export default defineConfig({
  plugins: [react()], // Use the React plugin
  test: {
    globals: true, // Make describe, test, expect, etc. globally available
    environment: 'jsdom', // Simulate browser environment
    setupFiles: './vitest.setup.ts', // Path to the setup file (created next)
    // Optional: configure coverage
    // coverage: {
    //   provider: 'v8', // or 'istanbul'
    //   reporter: ['text', 'json', 'html'],
    // },
  },
  // Resolve aliases like in tsconfig.json
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}) 