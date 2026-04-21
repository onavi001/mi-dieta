import { Capacitor } from '@capacitor/core'

export function getApiBaseUrl(): string {
  const configured = (import.meta.env.VITE_DIETA_API_BASE as string | undefined)?.trim()
  if (configured) return configured.replace(/\/$/, '')

  if (Capacitor.isNativePlatform()) {
    console.error(
      '[Mi Dieta] Falta VITE_DIETA_API_BASE en el build. Crea .env.production con la URL HTTPS del API (misma que en Netlify), luego: npm run cap:sync'
    )
  }

  return 'http://localhost:3000'
}