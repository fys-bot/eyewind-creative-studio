import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3003,
        host: '0.0.0.0', // Listen on all interfaces
        strictPort: false, // Try next available port if 3000 is taken
        cors: true, // Enable CORS for development
        allowedHosts: ['all', 'localhost', '127.0.0.1'], // Allow all hosts for tunnel/network access
        proxy: {
          '/api': {
            target: 'http://localhost:3008',
            changeOrigin: true,
            secure: false
          },
          '/uploads': {
            target: 'http://localhost:3008',
            changeOrigin: true,
            secure: false
          },
          // Proxy for AI Gateway to bypass CORS
          '/ai-gateway': {
            target: 'https://ai-gateway.eyewind.com',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/ai-gateway/, ''),
            configure: (proxy, _options) => {
              proxy.on('error', (err, _req, _res) => {
                console.log('[AI Gateway Proxy] Error:', err.message);
              });
              proxy.on('proxyReq', (proxyReq, req, _res) => {
                console.log('[AI Gateway Proxy]', req.method, req.url, '->', proxyReq.path);
              });
              proxy.on('proxyRes', (proxyRes, req, _res) => {
                if (proxyRes.statusCode >= 400) {
                  console.log('[AI Gateway Proxy] Error Response:', req.method, req.url, proxyRes.statusCode);
                }
              });
            }
          },
          // Proxy for Volcengine API to bypass CORS
          '/ark-api': {
            target: 'https://ark.cn-beijing.volces.com',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/ark-api/, '')
          },
          // Proxy for Volcengine Image Generations (Direct Path)
          '/ark-image': {
            target: 'https://ark.cn-beijing.volces.com',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/ark-image/, '')
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
