import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 500,
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          // Keep Navi UI isolated from core React vendor chunk.
          if (id.includes('/@navi01/react/')) {
            return 'vendor-navi'
          }

          if (id.includes('/react/') || id.includes('/react-dom/')) {
            return 'vendor-react'
          }

          if (id.includes('/@radix-ui/')) {
            return 'vendor-radix'
          }

          if (id.includes('/@tanstack/')) {
            return 'vendor-tanstack'
          }

          if (id.includes('/react-day-picker/')) {
            return 'vendor-daypicker'
          }

          if (id.includes('/cmdk/')) {
            return 'vendor-cmdk'
          }

          if (id.includes('/sonner/')) {
            return 'vendor-sonner'
          }

          if (id.includes('/tailwind-merge/') || id.includes('/clsx/')) {
            return 'vendor-utils'
          }

          if (id.includes('/@floating-ui/')) {
            return 'vendor-floating'
          }

          if (id.includes('/date-fns/')) {
            return 'vendor-datefns'
          }

          return 'vendor-misc'
        },
      },
    },
  },
})
