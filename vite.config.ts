import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Use '.' to refer to the current directory for loading env files
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    /**
     * DEV SERVER LAN ACCESS (for testing on your phone)
     *
     * Problem:
     * - Vite defaults to binding to localhost only.
     * - That makes `http://localhost:5173` work on your PC, but NOT from your phone.
     *
     * Fix:
     * - `host: true` tells Vite to listen on all network interfaces (0.0.0.0).
     * - When you run `npm run dev`, Vite will also print the "Network" URL
     *   (your LAN IP + port) so you know exactly what to open on your phone.
     */
    server: {
      host: true
    },
    define: {
      // Polyfill process.env.API_KEY for the frontend
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});