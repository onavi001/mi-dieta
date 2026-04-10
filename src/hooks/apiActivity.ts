import { useSyncExternalStore } from 'react'

type Listener = () => void

const DEFAULT_LABEL = 'Procesando solicitud...'

let pendingRequests = 0
let currentLabel = DEFAULT_LABEL
let requestSequence = 0
const activeRequests = new Map<number, string>()
const listeners = new Set<Listener>()

function emitChange() {
  listeners.forEach((listener) => listener())
}

export function startApiRequest(label = DEFAULT_LABEL): () => void {
  const requestId = ++requestSequence
  activeRequests.set(requestId, label)
  pendingRequests = activeRequests.size
  currentLabel = label
  emitChange()

  let completed = false
  return () => {
    if (completed) return
    completed = true

    activeRequests.delete(requestId)
    pendingRequests = activeRequests.size

    const latestActiveId = Array.from(activeRequests.keys()).reduce((latest, id) => (id > latest ? id : latest), -1)
    currentLabel = latestActiveId === -1 ? DEFAULT_LABEL : activeRequests.get(latestActiveId) || DEFAULT_LABEL

    emitChange()
  }
}

export function subscribeApiActivity(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getApiPendingRequests(): number {
  return pendingRequests
}

export function getApiCurrentLabel(): string {
  return currentLabel
}

export function useApiActivity() {
  const pending = useSyncExternalStore(subscribeApiActivity, getApiPendingRequests)
  const label = useSyncExternalStore(subscribeApiActivity, getApiCurrentLabel)

  return {
    pendingRequests: pending,
    isBusy: pending > 0,
    currentLabel: label,
  }
}
