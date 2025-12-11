
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const cwd = (process as any).cwd();
  const env = loadEnv(mode, cwd, '');
  return {
    plugins: [react()],
    base: '/',
    envPrefix: 'REACT_APP_',
    resolve: {
      alias: {
        '@': path.resolve(cwd, './'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-charts': ['recharts'],
            'vendor-utils': ['jspdf', '@mercadopago/sdk-react', 'lucide-react'],
          }
        }
      }
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
      'process.env': {
        API_KEY: JSON.stringify(env.API_KEY || env.REACT_APP_API_KEY || "")
      },
    }
  };
});
