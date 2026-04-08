export type HapticPattern = 'light' | 'success' | 'warning'

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  success: [14, 24, 18],
  warning: [24, 32, 24],
}

export function triggerHaptic(pattern: HapticPattern = 'light') {
  if (typeof window === 'undefined') return

  const vibrate = window.navigator?.vibrate
  if (typeof vibrate !== 'function') return

  try {
    vibrate(PATTERNS[pattern])
  } catch {
    // Ignore browser-level vibration errors.
  }
}
