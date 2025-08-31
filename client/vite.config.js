import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      // This ensures JSX is properly handled in .js files
      include: '**/*.{jsx,js}',
    }),
  ],
  esbuild: {
    // This ensures .js files with JSX are processed correctly
    loader: 'jsx',
    include: /.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
})
