import type { Comida, TipoComida } from '@/types/domain'

/** Agrupa el catálogo de comidas (p. ej. respuesta de GET /api/meals) por tipo de slot. */
export function groupMealsByTipo(meals: Comida[]): Partial<Record<TipoComida, Comida[]>> {
  const map: Partial<Record<TipoComida, Comida[]>> = {}
  for (const m of meals) {
    const list = map[m.tipo]
    if (list) {
      list.push(m)
    } else {
      map[m.tipo] = [m]
    }
  }
  return map
}
