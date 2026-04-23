import {
  GROUP_GRAMS_PER_PORTION,
  INGREDIENT_GROUP_KEYWORDS,
  INGREDIENT_REFERENCE,
  normalizeIngredientText,
  normalizeIngredientUnit,
  type IngredientReference,
  type PlanGroupKey,
} from './ingredientReference'

export function getIngredientReference(ingredientId: string): IngredientReference | null {
  const key = normalizeIngredientText(ingredientId)
  return INGREDIENT_REFERENCE[key] || null
}

export function detectIngredientGroup(ingredientId: string, ingredientText: string): PlanGroupKey | null {
  const explicit = getIngredientReference(ingredientId)
  if (explicit) return explicit.group

  const normalized = normalizeIngredientText(ingredientText)
  for (const group of Object.keys(INGREDIENT_GROUP_KEYWORDS) as PlanGroupKey[]) {
    const matches = INGREDIENT_GROUP_KEYWORDS[group].some((keyword) => normalized.includes(keyword))
    if (matches) return group
  }

  return null
}

export function unitToGramsFactor(unit: string, group: PlanGroupKey | null, ingredientId?: string): number | null {
  const normalizedUnit = normalizeIngredientUnit(unit)

  if (ingredientId) {
    const explicit = getIngredientReference(ingredientId)
    if (explicit?.unitToGrams && typeof explicit.unitToGrams[normalizedUnit] === 'number') {
      return explicit.unitToGrams[normalizedUnit]
    }
  }

  if (normalizedUnit === 'g') return 1
  if (normalizedUnit === 'kg') return 1000
  if (normalizedUnit === 'ml') return 1
  if (normalizedUnit === 'l') return 1000
  if (normalizedUnit === 'oz') return 30
  if (normalizedUnit === 'tbsp') return 15
  if (normalizedUnit === 'tsp') return 5
  if (normalizedUnit === 'slice') return group === 'cereales_tuberculos' ? 30 : 25
  if (normalizedUnit === 'cup') {
    if (group === 'lacteos_o_sustitutos') return 240
    if (group === 'cereales_tuberculos' || group === 'leguminosas') return 120
    return 150
  }
  if (normalizedUnit === 'piece') {
    if (group === 'frutas') return 120
    if (group === 'proteina_animal_o_alternativas') return 50
    if (group === 'verduras') return 80
    return 60
  }
  if (normalizedUnit === 'pinch') return 0.5

  return null
}

export function ingredientToEstimatedGrams(
  ingredient: { id: string; cantidad: number; unidad: string },
  group: PlanGroupKey
): number {
  if (!Number.isFinite(ingredient.cantidad) || ingredient.cantidad <= 0) return 0
  const factor = unitToGramsFactor(ingredient.unidad || '', group, ingredient.id)
  if (factor === null) {
    return ingredient.cantidad
  }

  return ingredient.cantidad * factor
}

const PROTEIN_PORTION_GRAMS_KEYWORDS: Array<{ grams: number; keywords: string[] }> = [
  { grams: 35, keywords: ['salmon', 'atun', 'tuna', 'pescado', 'tilapia', 'camaron', 'sardina', 'bacalao'] },
  { grams: 30, keywords: ['pollo', 'pavo', 'res', 'cerdo', 'carne molida', 'lomo'] },
  { grams: 45, keywords: ['queso panela', 'queso cottage', 'queso fresco', 'queso oaxaca'] },
  { grams: 50, keywords: ['huevo', 'claras', 'tofu', 'tempeh'] },
]

/**
 * Gramos que representan 1 porción para un ingrediente específico.
 * - Si el catálogo lo define (portionGramEquivalent), se usa tal cual.
 * - En proteína, aplica heurísticas para diferenciar carnes/pescados/huevo/quesos.
 * - Si no hay regla específica, usa el estándar del grupo.
 */
export function gramsPerPortionForIngredient(
  group: PlanGroupKey,
  ingredientId: string,
  ingredientText = ''
): number {
  const explicit = getIngredientReference(ingredientId)
  if (explicit?.portionGramEquivalent && explicit.portionGramEquivalent > 0) {
    return explicit.portionGramEquivalent
  }

  if (group === 'proteina_animal_o_alternativas') {
    const normalized = normalizeIngredientText(`${ingredientId} ${ingredientText}`)
    for (const rule of PROTEIN_PORTION_GRAMS_KEYWORDS) {
      if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
        return rule.grams
      }
    }
  }

  return GROUP_GRAMS_PER_PORTION[group]
}