import { useEffect, useRef, useState } from 'react'

interface UseLocalStorageOptions<T> {
  migrate?: (stored: unknown, initial: T) => T
}

const POLL_INTERVAL_MS = 3000

function getSharedStateApiBase(): string {
  const configured = (import.meta.env.VITE_SHARED_STATE_API as string | undefined)?.trim()
  if (configured) return configured.replace(/\/$/, '')

  return '/api/state'
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeByInitialType<T>(stored: unknown, initial: T): T {
  if (Array.isArray(initial)) {
    return (Array.isArray(stored) ? stored : initial) as T
  }

  if (typeof initial === 'boolean') {
    return (typeof stored === 'boolean' ? stored : initial) as T
  }

  if (typeof initial === 'number') {
    return (typeof stored === 'number' ? stored : initial) as T
  }

  if (typeof initial === 'string') {
    return (typeof stored === 'string' ? stored : initial) as T
  }

  if (isPlainObject(initial)) {
    return (isPlainObject(stored) ? stored : initial) as T
  }

  return (stored as T) ?? initial
}

export function useLocalStorage<T>(key: string, initial: T, options?: UseLocalStorageOptions<T>) {
  const sharedApiBase = getSharedStateApiBase()
  const valueRef = useRef<T>(initial)

  const normalizeIncoming = (stored: unknown): T => {
    return options?.migrate
      ? options.migrate(stored, initial)
      : normalizeByInitialType(stored, initial)
  }

  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      if (!stored) {
        return initial
      }

      const parsed = JSON.parse(stored) as unknown
      const nextValue = normalizeIncoming(parsed)

      if (JSON.stringify(nextValue) !== stored) {
        localStorage.setItem(key, JSON.stringify(nextValue))
      }

      return nextValue
    } catch {
      return initial
    }
  })

  useEffect(() => {
    valueRef.current = value
  }, [value])

  const saveLocal = (next: T) => {
    setValue(next)
    valueRef.current = next
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      // ignore localStorage failures
    }
  }

  const pullRemote = async () => {
    if (pendingPushCount.current > 0) return
    try {
      const response = await fetch(`${sharedApiBase}?key=${encodeURIComponent(key)}`)
      if (!response.ok) return

      const payload = (await response.json()) as { value?: unknown }
      if (!('value' in payload)) return

      const nextValue = normalizeIncoming(payload.value)
      if (JSON.stringify(nextValue) === JSON.stringify(valueRef.current)) return

      saveLocal(nextValue)
    } catch {
      // ignore network failures and keep local mode
    }
  }

  const pendingPushCount = useRef(0)

  const pushRemote = async (next: T) => {
    pendingPushCount.current++
    try {
      await fetch(`${sharedApiBase}?key=${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: next }),
      })
    } catch {
      // ignore network failures and keep local mode
    } finally {
      pendingPushCount.current--
    }
  }

  useEffect(() => {
    pullRemote()

    const intervalId = window.setInterval(() => {
      pullRemote()
    }, POLL_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, sharedApiBase])

  const set = (next: T | ((prev: T) => T)) => {
    const resolved = typeof next === 'function' ? (next as (prev: T) => T)(valueRef.current) : next
    saveLocal(resolved)
    void pushRemote(resolved)
  }

  return [value, set] as const
}