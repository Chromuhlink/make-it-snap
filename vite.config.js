import { defineConfig } from 'vite';

export default defineConfig({
  root: 'public',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: '../dist',
    rollupOptions: {
      input: {
        main: 'public/index.html',
      }
    }
  },
  optimizeDeps: {
    include: ['@reown/appkit', '@reown/appkit-adapter-wagmi', 'wagmi', 'viem', '@zoralabs/coins-sdk']
  }
});