/**
 * Datos públicos del sitio (URLs de producción) y correo de contacto.
 *
 * Correo de soporte (prioridad):
 * 1. Variable de entorno `VITE_CONTACT_EMAIL` en Netlify (Site settings → Environment variables).
 * 2. O edita `LOCAL_CONTACT_EMAIL` aquí abajo con tu correo personal.
 */
export const SITE_ORIGIN = 'https://mi-dieta.netlify.app'
export const API_ORIGIN_PUBLIC = 'https://mi-dieta-api.onrender.com'

const LOCAL_CONTACT_EMAIL = 'onavi.001+support@gmail.com'

export const CONTACT_EMAIL =
  (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim() || LOCAL_CONTACT_EMAIL.trim()

export function contactMailtoHref(): string {
  const subject = encodeURIComponent('Mi Dieta — Consulta / soporte')
  if (!CONTACT_EMAIL) {
    return `mailto:?subject=${subject}`
  }
  return `mailto:${encodeURIComponent(CONTACT_EMAIL)}?subject=${subject}`
}
