type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)]
}

export function migrateStringArray(stored: unknown): string[] {
  if (Array.isArray(stored)) {
    return uniqueStrings(stored.filter((item): item is string => typeof item === 'string'))
  }

  if (!isRecord(stored)) {
    return []
  }

  // Supports legacy map shape: { "id": true, "id2": true }
  const truthyKeys = Object.entries(stored)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key)

  if (truthyKeys.length > 0) {
    return uniqueStrings(truthyKeys)
  }

  // Supports wrapped shape: { values: ["a", "b"] }
  const maybeValues = stored.values
  if (Array.isArray(maybeValues)) {
    return uniqueStrings(maybeValues.filter((item): item is string => typeof item === 'string'))
  }

  return []
}

export function migrateStringMap(stored: unknown): Record<string, string> {
  if (!isRecord(stored)) {
    return {}
  }

  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(stored)) {
    if (typeof value === 'string') {
      result[key] = value
    }
  }

  return result
}
