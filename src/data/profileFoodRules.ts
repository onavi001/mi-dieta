import { normalizeIngredientText } from './ingredientReference'
import type { Comida } from './types'

export type FoodRuleOption = { value: string; label: string }

export interface FoodRuleProfile {
  allergies?: string[] | null
  intolerances?: string[] | null
  foodPreferences?: string[] | null
}

export const PREFERENCE_OPTIONS: FoodRuleOption[] = [
  { value: 'pollo', label: 'Pollo' },
  { value: 'res', label: 'Res' },
  { value: 'cerdo', label: 'Cerdo' },
  { value: 'pavo', label: 'Pavo' },
  { value: 'pescado', label: 'Pescado' },
  { value: 'mariscos', label: 'Mariscos' },
  { value: 'huevo', label: 'Huevo' },
  { value: 'lacteos', label: 'Lácteos' },
  { value: 'leguminosas', label: 'Leguminosas' },
  { value: 'verduras', label: 'Verduras' },
  { value: 'frutas', label: 'Frutas' },
  { value: 'sin_gluten', label: 'Sin gluten' },
  { value: 'vegetariano', label: 'Vegetariano' },
  { value: 'vegano', label: 'Vegano' },
]

export const ALLERGY_OPTIONS: FoodRuleOption[] = [
  { value: 'gluten', label: 'Gluten / Trigo' },
  { value: 'lacteos', label: 'Lácteos' },
  { value: 'huevo', label: 'Huevo' },
  { value: 'pescado', label: 'Pescado' },
  { value: 'mariscos', label: 'Mariscos' },
  { value: 'nueces', label: 'Nueces' },
  { value: 'almendra', label: 'Almendra' },
  { value: 'cacahuate', label: 'Cacahuate' },
  { value: 'pistache', label: 'Pistache' },
  { value: 'nuez_de_la_india', label: 'Nuez de la india' },
  { value: 'soya', label: 'Soya' },
  { value: 'ajonjoli', label: 'Ajonjolí' },
]

export const INTOLERANCE_OPTIONS: FoodRuleOption[] = [
  { value: 'lactosa', label: 'Lactosa' },
  { value: 'gluten', label: 'Gluten' },
  { value: 'fructosa', label: 'Fructosa' },
  { value: 'sorbitol', label: 'Sorbitol' },
  { value: 'histamina', label: 'Histamina' },
  { value: 'cafeina', label: 'Cafeína' },
  { value: 'fodmap', label: 'FODMAP' },
  { value: 'cerdo', label: 'Cerdo' },
  { value: 'huevo', label: 'Huevo' },
  { value: 'mariscos', label: 'Mariscos' },
]

const OPTION_LABELS = new Map<string, string>([
  ...PREFERENCE_OPTIONS,
  ...ALLERGY_OPTIONS,
  ...INTOLERANCE_OPTIONS,
].map((option) => [option.value, option.label]))

const PREFERENCE_RESTRICTIONS = new Map<string, string>([
  ['sin_gluten', 'gluten'],
  ['vegetariano', 'vegetariano'],
  ['vegano', 'vegano'],
])

const EXCLUDED_INGREDIENTS_BY_RESTRICTION: Record<string, string[]> = {
  gluten: ['tortilla de harina', 'pan de caja', 'pan integral', 'pan pita', 'pan pita integral', 'pasta', 'pasta integral'],
  lacteos: ['leche entera', 'leche descremada', 'leche semidescremada', 'yogurt griego', 'yogurt natural', 'yogurt bajo en grasa', 'queso fresco', 'queso oaxaca', 'queso manchego', 'queso cheddar', 'queso ricotta', 'queso panela', 'queso cottage', 'kefir', 'leche de vaca'],
  lactosa: ['leche entera', 'leche descremada', 'leche semidescremada', 'yogurt griego', 'yogurt natural', 'yogurt bajo en grasa', 'queso fresco', 'queso oaxaca', 'queso manchego', 'queso cheddar', 'queso ricotta', 'queso panela', 'queso cottage', 'kefir'],
  huevo: ['huevo', 'huevo entero', 'clara de huevo'],
  pescado: ['salmon', 'filete de salmon', 'tilapia', 'filete de tilapia', 'atun en agua', 'atun en aceite', 'sardina', 'mojarra', 'cazon'],
  mariscos: ['camaron'],
  nueces: ['nuez', 'nuez de la india', 'pecan'],
  almendra: ['almendra', 'mantequilla de almendra', 'leche de almendra'],
  cacahuate: ['cacahuate', 'mantequilla de cacahuate'],
  pistache: ['pistache'],
  nuez_de_la_india: ['nuez de la india'],
  soya: ['tofu', 'tofu firme', 'soya texturizada', 'proteina de soya', 'leche de soya', 'soya', 'tempeh', 'edamame'],
  ajonjoli: ['ajonjoli', 'tahini'],
  fructosa: ['mango', 'pera', 'uva', 'durazno', 'chabacano'],
  cerdo: ['cerdo', 'carnitas', 'chuleta de cerdo'],
  histamina: ['atun en aceite', 'atun en agua', 'sardina', 'queso manchego', 'queso oaxaca', 'queso cheddar'],
  fodmap: ['ajo', 'cebolla', 'poro'],
  vegetariano: ['pollo', 'pollo deshebrado', 'pollo molido', 'pollo entero', 'pechuga de pollo', 'pierna de pollo', 'muslo de pollo', 'pavo', 'pavo molido', 'pavo deshebrado', 'pechuga de pavo', 'res', 'res deshebrada', 'bistec', 'bistec de res', 'carne', 'carne molida de res', 'cerdo', 'chuleta de cerdo', 'carnitas', 'pescado', 'salmon', 'filete de salmon', 'tilapia', 'filete de tilapia', 'atun en agua', 'atun en aceite', 'sardina', 'camaron', 'mojarra', 'cazon'],
  vegano: ['huevo', 'huevo entero', 'clara de huevo', 'leche entera', 'leche descremada', 'leche semidescremada', 'yogurt griego', 'yogurt natural', 'yogurt bajo en grasa', 'queso fresco', 'queso oaxaca', 'queso manchego', 'queso cheddar', 'queso ricotta', 'queso panela', 'queso cottage', 'kefir', 'pollo', 'pollo deshebrado', 'pollo molido', 'pollo entero', 'pechuga de pollo', 'pierna de pollo', 'muslo de pollo', 'pavo', 'pavo molido', 'pavo deshebrado', 'pechuga de pavo', 'res', 'res deshebrada', 'bistec', 'bistec de res', 'carne', 'carne molida de res', 'cerdo', 'chuleta de cerdo', 'carnitas', 'pescado', 'salmon', 'filete de salmon', 'tilapia', 'filete de tilapia', 'atun en agua', 'atun en aceite', 'sardina', 'camaron', 'mojarra', 'cazon'],
}

const PREFERRED_INGREDIENTS_BY_PREFERENCE: Record<string, string[]> = {
  pollo: ['pollo', 'pollo deshebrado', 'pollo molido', 'pollo entero', 'pechuga de pollo', 'pierna de pollo', 'muslo de pollo'],
  res: ['res', 'res deshebrada', 'bistec', 'bistec de res', 'carne', 'carne molida de res', 'arrachera', 'milanesa'],
  cerdo: ['cerdo', 'chuleta de cerdo', 'carnitas'],
  pavo: ['pavo', 'pavo molido', 'pavo deshebrado', 'pechuga de pavo'],
  pescado: ['pescado', 'salmon', 'filete de salmon', 'tilapia', 'filete de tilapia', 'atun en agua', 'atun en aceite', 'sardina', 'mojarra', 'cazon'],
  mariscos: ['camaron'],
  huevo: ['huevo', 'huevo entero', 'clara de huevo'],
  lacteos: ['leche entera', 'leche descremada', 'leche semidescremada', 'yogurt griego', 'yogurt natural', 'yogurt bajo en grasa', 'queso fresco', 'queso oaxaca', 'queso manchego', 'queso cheddar', 'queso ricotta', 'queso panela', 'queso cottage', 'kefir'],
  leguminosas: ['frijol', 'frijoles', 'lenteja', 'lentejas', 'garbanzo', 'garbanzos', 'haba', 'edamame', 'alverjon', 'soya'],
  verduras: ['verduras', 'verdura', 'brocoli', 'espinaca', 'zanahoria', 'calabaza', 'pepino', 'lechuga', 'jitomate', 'tomate'],
  frutas: ['manzana', 'platano', 'papaya', 'pera', 'sandia', 'melon', 'berries', 'fresa', 'pina'],
}

export function getRestrictionKeys(profile?: FoodRuleProfile | null): string[] {
  const preferenceRestrictions = (profile?.foodPreferences ?? [])
    .map((preference) => PREFERENCE_RESTRICTIONS.get(preference))
    .filter((value): value is string => Boolean(value))

  return Array.from(new Set([
    ...(profile?.allergies ?? []),
    ...(profile?.intolerances ?? []),
    ...preferenceRestrictions,
  ]))
}

export function getRestrictionLabels(profile?: FoodRuleProfile | null): string[] {
  return getRestrictionKeys(profile).map((key) => OPTION_LABELS.get(key) || key)
}

export function getExcludedIngredientSet(profile?: FoodRuleProfile | null): Set<string> {
  return new Set(
    getRestrictionKeys(profile).flatMap((restriction) => EXCLUDED_INGREDIENTS_BY_RESTRICTION[restriction] ?? [])
  )
}

export function getPreferredIngredientSet(profile?: FoodRuleProfile | null): Set<string> {
  return new Set(
    (profile?.foodPreferences ?? []).flatMap((preference) => PREFERRED_INGREDIENTS_BY_PREFERENCE[preference] ?? [])
  )
}

export function isIngredientExcludedForProfile(ingredientId: string, profile?: FoodRuleProfile | null): boolean {
  return getExcludedIngredientSet(profile).has(normalizeIngredientText(ingredientId))
}

export function sortIngredientOptionsForProfile(candidates: string[], currentIngredientId: string, profile?: FoodRuleProfile | null): string[] {
  const normalizedCurrent = normalizeIngredientText(currentIngredientId)
  const excluded = getExcludedIngredientSet(profile)
  const preferred = getPreferredIngredientSet(profile)

  return candidates
    .filter((id) => id === normalizedCurrent || !excluded.has(id))
    .sort((left, right) => {
      if (left === normalizedCurrent) return -1
      if (right === normalizedCurrent) return 1

      const leftPreferred = preferred.has(left)
      const rightPreferred = preferred.has(right)
      if (leftPreferred !== rightPreferred) return leftPreferred ? -1 : 1

      return left.localeCompare(right, 'es')
    })
}

export function pickReplacementIngredient(currentIngredientId: string, candidates: string[], profile?: FoodRuleProfile | null): string | null {
  const normalizedCurrent = normalizeIngredientText(currentIngredientId)
  return sortIngredientOptionsForProfile(candidates, currentIngredientId, profile)
    .find((candidate) => normalizeIngredientText(candidate) !== normalizedCurrent) ?? null
}

export function mealPreferenceScore(meal: Comida, profile?: FoodRuleProfile | null): number {
  const preferred = getPreferredIngredientSet(profile)
  if (preferred.size === 0) return 0

  const uniqueIngredients = new Set(meal.ingredientes.map((ingredient) => normalizeIngredientText(ingredient.id)))
  let score = 0
  uniqueIngredients.forEach((ingredientId) => {
    if (preferred.has(ingredientId)) score += 1
  })
  return score
}

export function getMealProfileBadges(
  meal: Comida,
  profile?: FoodRuleProfile | null,
): Array<{ label: string; tone: 'preference' | 'compatibility' }> {
  const ingredientIds = new Set(meal.ingredientes.map((ingredient) => normalizeIngredientText(ingredient.id)))
  const preferenceBadges = (profile?.foodPreferences ?? [])
    .filter((preference) => {
      const preferredIngredients = PREFERRED_INGREDIENTS_BY_PREFERENCE[preference] ?? []
      return preferredIngredients.some((ingredientId) => ingredientIds.has(ingredientId))
    })
    .slice(0, 2)
    .map((preference) => ({
      label: `Prioriza ${OPTION_LABELS.get(preference) || preference}`,
      tone: 'preference' as const,
    }))

  const compatibilityBadges = getRestrictionLabels(profile)
    .slice(0, preferenceBadges.length > 0 ? 1 : 2)
    .map((label) => ({
      label: `Compatible con ${label}`,
      tone: 'compatibility' as const,
    }))

  return [...preferenceBadges, ...compatibilityBadges].slice(0, 3)
}

export function isMealAllowedForProfile(meal: Comida, profile?: FoodRuleProfile | null): boolean {
  return meal.ingredientes.every((ingredient) => !isIngredientExcludedForProfile(ingredient.id, profile))
}

export function filterAndSortMealsForProfile(meals: Comida[], profile?: FoodRuleProfile | null): Comida[] {
  return meals
    .filter((meal) => isMealAllowedForProfile(meal, profile))
    .sort((left, right) => {
      const preferenceDelta = mealPreferenceScore(right, profile) - mealPreferenceScore(left, profile)
      if (preferenceDelta !== 0) return preferenceDelta
      return left.nombre.localeCompare(right.nombre, 'es')
    })
}

export function filterMealIngredientsForProfile(meals: Comida[], profile?: FoodRuleProfile | null): Comida[] {
  return meals.map((meal) => ({
    ...meal,
    ingredientes: meal.ingredientes.filter((ingredient) => !isIngredientExcludedForProfile(ingredient.id, profile)),
  }))
}

export function summarizeFilteredMeals(
  originalMeals: Comida[],
  filteredMeals: Comida[],
  profile?: FoodRuleProfile | null,
): {
  removedCount: number
  removedIngredients: string[]
  restrictionLabels: string[]
} {
  const removedIngredients = new Set<string>()
  let removedCount = 0

  for (const [index, meal] of originalMeals.entries()) {
    const filteredMeal = filteredMeals[index]
    if (!filteredMeal) continue

    const filteredIds = new Set(filteredMeal.ingredientes.map((ingredient) => normalizeIngredientText(ingredient.id)))
    for (const ingredient of meal.ingredientes) {
      const normalizedId = normalizeIngredientText(ingredient.id)
      if (filteredIds.has(normalizedId)) continue
      removedCount += 1
      removedIngredients.add(ingredient.id)
    }
  }

  return {
    removedCount,
    removedIngredients: Array.from(removedIngredients).sort((left, right) => left.localeCompare(right, 'es')),
    restrictionLabels: getRestrictionLabels(profile),
  }
}