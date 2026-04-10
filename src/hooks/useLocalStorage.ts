import { useEffect, useRef, useState } from 'react'

interface UseLocalStorageOptions<T> {
  migrate?: (stored: unknown, initial: T) => T
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

  const set = (next: T | ((prev: T) => T)) => {
    const resolved = typeof next === 'function' ? (next as (prev: T) => T)(valueRef.current) : next
    saveLocal(resolved)
  }

  return [value, set] as const
}
