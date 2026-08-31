import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages는 /<repo>/ 하위 경로로 서비스되므로 base를 맞춰 준다.
// 로컬 개발이나 다른 호스팅에서는 VITE_BASE=/ 로 덮어쓴다.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/AI-Book/',
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: false },
});
