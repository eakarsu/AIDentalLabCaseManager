import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendPort = process.env.BACKEND_PORT || '4000';
const frontendPort = parseInt(process.env.FRONTEND_PORT || '3000', 10);

export default defineConfig({
  plugins: [react()],
  server: {
    port: frontendPort,
    proxy: {
      '/api': `http://localhost:${backendPort}`
    }
  }
});
