import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@localcontrol/core': path.resolve(__dirname, '../../packages/core'),
    },
  },
  base: process.env.ELECTRON ? './' : '/',
  server: {
    port: 5174,
  },
});
