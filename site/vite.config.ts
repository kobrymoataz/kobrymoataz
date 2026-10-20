import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// This is a project site: https://kobrymoataz.github.io/kobrymoataz/
export default defineConfig({
  plugins: [react()],
  base: '/kobrymoataz/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 900
  }
});
