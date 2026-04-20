/**
 * Registro de fallos de API en el cliente: solo método, ruta y mensaje.
 * No incluye cabeceras, tokens ni cuerpo de la petición.
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export function logApiRequestFailed(path: string, method: HttpMethod, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err)
  if (import.meta.env.DEV) {
    console.warn('[api]', method, path, message)
  }
}
