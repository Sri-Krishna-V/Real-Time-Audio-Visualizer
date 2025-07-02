import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    host: true,
    cors: true,
    // Enable HTTPS for microphone access in development
    // https: true // Uncomment if needed for microphone testing
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          utils: ['./src/utils/ObjectPool.ts', './src/utils/PerformanceLOD.ts']
        }
      }
    }
  },
  assetsInclude: ['**/*.glsl', '**/*.vert', '**/*.frag'],
  optimizeDeps: {
    include: ['three']
  }
});
