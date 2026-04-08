import { getStore } from '@netlify/blobs'

const store = getStore('mi-dieta-shared-state')

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

export default async (request) => {
  const url = new URL(request.url)
  const key = url.searchParams.get('key')?.trim()

  if (!key) {
    return jsonResponse(400, { error: 'Missing key query param' })
  }

  if (request.method === 'GET') {
    const value = await store.get(key, { type: 'json' })
    return jsonResponse(200, { value: value ?? null })
  }

  if (request.method === 'PUT') {
    let body
    try {
      body = await request.json()
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON body' })
    }

    if (!body || !Object.prototype.hasOwnProperty.call(body, 'value')) {
      return jsonResponse(400, { error: 'Body must include { value }' })
    }

    await store.setJSON(key, body.value)
    return jsonResponse(200, { ok: true })
  }

  return jsonResponse(405, { error: 'Method not allowed' })
}