/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DIETA_API_BASE?: string
  readonly VITE_CONTACT_EMAIL?: string
  /** Opcional: DSN del proyecto Sentry (errores del navegador) */
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string
}
