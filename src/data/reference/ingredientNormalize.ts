/** Normalización de texto de ingrediente (sin depender del estado hidratado de la referencia). */
export function normalizeIngredientText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
