import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: './src/taskpane',
  base: './',
  plugins: [react()],
  build: {
    outDir: '../../dist/taskpane',
    emptyOutDir: true
  }
});
