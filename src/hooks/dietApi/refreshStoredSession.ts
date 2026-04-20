import { getApiBaseUrl } from '@/utils/apiBaseUrl'
import type { ApiResponse, ApiSession, AuthPayload } from './model'
import { readStoredSession, writeStoredSession } from './model'

export const SESSION_REFRESH_EVENT = 'mi-dieta:session-refreshed'

/**
 * Llama a POST /api/auth/refresh y persiste la nueva sesión en localStorage.
 * No usa el fetch de useDietApi para evitar recursión con el interceptor 401.
 */
export async function refreshStoredSession(baseUrl?: string): Promise<ApiSession | null> {
  const base = baseUrl ?? getApiBaseUrl()
  const current = readStoredSession()
  if (!current?.refreshToken) return null

  const response = await fetch(`${base}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: current.refreshToken }),
  })

  const payload = (await response.json().catch(() => null)) as ApiResponse<AuthPayload> | null
  if (!payload?.ok) return null

  const sess = payload.data?.session
  if (!response.ok || !sess?.access_token) {
    return null
  }

  const data = payload.data!
  if (!data.user?.id) return null

  const next: ApiSession = {
    accessToken: sess.access_token,
    refreshToken: sess.refresh_token ?? current.refreshToken,
    expiresAt: typeof sess.expires_at === 'number' ? sess.expires_at : undefined,
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  }

  writeStoredSession(next)
  window.dispatchEvent(new Event(SESSION_REFRESH_EVENT))
  return next
}
