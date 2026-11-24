import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Next 16 exposes the extensionless `next/server` entry for Next's
      // bundler, but Vitest's Node resolver can reach it through next-auth's
      // nested dependency path without applying Next's package export rules.
      // Resolve the public entry directly so route-handler tests can import it.
      'next/server': path.resolve(__dirname, './node_modules/next/server.js'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    server: {
      deps: {
        // Keep next-auth inside Vite so the `next/server` test alias also
        // applies to its imports on Windows/Node ESM.
        inline: ['next-auth'],
      },
    },
  },
})
