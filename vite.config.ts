import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// viteSingleFile inlines all JS/CSS into dist/index.html so the built app
// can be opened directly via file:// (double-click) without a web server.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
});
