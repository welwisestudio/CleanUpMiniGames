import { defineConfig } from 'vite';

// Build metadata is injected by scripts/build.mjs (production) or defaults (dev server).
const buildNumber = process.env.BUILD_NUMBER ?? 'dev';
const buildTime = process.env.BUILD_TIME ?? new Date().toISOString();

export default defineConfig({
  // Relative asset paths: the build must work from any folder / platform host.
  base: './',
  define: {
    __BUILD_NUMBER__: JSON.stringify(buildNumber),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: true,
    // Phaser alone is ~1.2 MB minified; it is split into its own chunk.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined),
      },
    },
  },
  server: { host: '127.0.0.1', port: 5173 },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
  },
});
