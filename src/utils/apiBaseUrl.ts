export function getApiBaseUrl(): string {
  const configured = (import.meta.env.VITE_DIETA_API_BASE as string | undefined)?.trim()
  if (configured) return configured.replace(/\/$/, '')
  return 'http://localhost:3000'
}