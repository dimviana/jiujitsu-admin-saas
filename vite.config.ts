import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // FIX: Replaced process.cwd() with '.' to resolve a TypeScript type error where 'cwd' was not found on 'process'.
  // In a standard Vite setup, '.' resolves to the project root, which is the intended behavior.
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    base: '/', // Ensure absolute paths for assets
    envPrefix: 'REACT_APP_', // Compatibilidade com variáveis injetadas pelo script de deploy
    resolve: {
      alias: {
        // FIX: Replaced `__dirname` (not available in ES modules) with `'./'` to resolve the alias to the project root.
        '@': path.resolve('./'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    define: {
      // FIX: Map REACT_APP_API_KEY to process.env.API_KEY to comply with Gemini API guidelines.
      'process.env': {
        API_KEY: JSON.stringify(env.REACT_APP_API_KEY)
      },
    }
  };
});