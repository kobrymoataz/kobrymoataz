import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/kobrymoataz/',
  build: {
    outDir: 'dist',
    target: 'es2022',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 1600
  }
});
