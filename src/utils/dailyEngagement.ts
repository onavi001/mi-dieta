export const DAILY_CHECKIN_STORAGE_KEY = 'mi-dieta:daily-checkin'
export const CONSISTENCY_STREAK_STORAGE_KEY = 'mi-dieta:consistency-streak'

export type DailyCheckinMood = 'good' | 'slip' | 'help'

export function localDateKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function prevLocalDateKey(from: string): string {
  const [y, m, d] = from.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() - 1)
  const y2 = dt.getFullYear()
  const m2 = String(dt.getMonth() + 1).padStart(2, '0')
  const d2 = String(dt.getDate()).padStart(2, '0')
  return `${y2}-${m2}-${d2}`
}

export function readDailyCheckin(date: string): DailyCheckinMood | null {
  try {
    const raw = localStorage.getItem(DAILY_CHECKIN_STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as { date?: string; mood?: DailyCheckinMood }
    if (data?.date === date && data?.mood) return data.mood
  } catch {
    // ignore
  }
  return null
}

export function writeDailyCheckin(date: string, mood: DailyCheckinMood) {
  localStorage.setItem(DAILY_CHECKIN_STORAGE_KEY, JSON.stringify({ date, mood, at: Date.now() }))
}

export function readConsistencyStreak(): { count: number; lastGoodDate: string | null } {
  try {
    const raw = localStorage.getItem(CONSISTENCY_STREAK_STORAGE_KEY)
    if (!raw) return { count: 0, lastGoodDate: null }
    const data = JSON.parse(raw) as { count?: number; lastGoodDate?: string | null }
    return {
      count: typeof data.count === 'number' && data.count > 0 ? data.count : 0,
      lastGoodDate: data.lastGoodDate ?? null,
    }
  } catch {
    return { count: 0, lastGoodDate: null }
  }
}

function writeConsistencyStreak(count: number, lastGoodDate: string) {
  localStorage.setItem(CONSISTENCY_STREAK_STORAGE_KEY, JSON.stringify({ count, lastGoodDate }))
}

const STREAK_UPDATED_EVENT = 'mi-dieta-consistency-updated'

export function notifyConsistencyStreakUpdated() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(STREAK_UPDATED_EVENT))
}

/** Devuelve la racha actualizada después de un check-in positivo. */
export function bumpConsistencyStreakForGoodCheckin(today: string): number {
  const { count, lastGoodDate } = readConsistencyStreak()
  let result: number
  if (lastGoodDate === today) {
    result = count || 1
  } else if (lastGoodDate === prevLocalDateKey(today)) {
    const next = (count || 0) + 1
    writeConsistencyStreak(next, today)
    result = next
  } else {
    writeConsistencyStreak(1, today)
    result = 1
  }
  notifyConsistencyStreakUpdated()
  return result
}

export function onConsistencyStreakUpdated(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(STREAK_UPDATED_EVENT, handler)
  return () => window.removeEventListener(STREAK_UPDATED_EVENT, handler)
}
