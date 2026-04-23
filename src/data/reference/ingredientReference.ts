/**
 * Datos de referencia de ingredientes: se cargan desde el API (`GET /api/reference/ingredients`)
 * y se hidratan al iniciar la app (y en tests desde `src/test/fixtures`).
 */

export type PlanGroupKey =
  | 'verduras'
  | 'frutas'
  | 'cereales_tuberculos'
  | 'leguminosas'
  | 'proteina_animal_o_alternativas'
  | 'lacteos_o_sustitutos'
  | 'grasas_saludables'

export type IngredientReference = {
  group: PlanGroupKey
  unitToGrams?: Record<string, number>
  /** Gramos equivalentes a 1 porción para este ingrediente. */
  portionGramEquivalent?: number
  pieceSizeGrams?: {
    small: number
    medium: number
    large: number
  }
}

export type IngredientReferencePayload = {
  version: number
  items: Record<string, IngredientReference>
  groupKeywords: Record<PlanGroupKey, string[]>
  groupGramsPerPortion: Record<PlanGroupKey, number>
  groupLabels: Record<PlanGroupKey, string>
  unitAliases: Record<string, string>
}

const EMPTY_GRAMS: Record<PlanGroupKey, number> = {
  verduras: 0,
  frutas: 0,
  cereales_tuberculos: 0,
  leguminosas: 0,
  proteina_animal_o_alternativas: 0,
  lacteos_o_sustitutos: 0,
  grasas_saludables: 0,
}

const EMPTY_LABELS: Record<PlanGroupKey, string> = {
  verduras: '',
  frutas: '',
  cereales_tuberculos: '',
  leguminosas: '',
  proteina_animal_o_alternativas: '',
  lacteos_o_sustitutos: '',
  grasas_saludables: '',
}

const EMPTY_KEYWORDS: Record<PlanGroupKey, string[]> = {
  verduras: [],
  frutas: [],
  cereales_tuberculos: [],
  leguminosas: [],
  proteina_animal_o_alternativas: [],
  lacteos_o_sustitutos: [],
  grasas_saludables: [],
}

export let INGREDIENT_REFERENCE: Record<string, IngredientReference> = {}
export let INGREDIENT_GROUP_KEYWORDS: Record<PlanGroupKey, string[]> = { ...EMPTY_KEYWORDS }
export let GROUP_GRAMS_PER_PORTION: Record<PlanGroupKey, number> = { ...EMPTY_GRAMS }
export let GROUP_LABELS: Record<PlanGroupKey, string> = { ...EMPTY_LABELS }

let unitAliasesInternal: Record<string, string> = {}
let hydrated = false

export function isIngredientReferenceHydrated(): boolean {
  return hydrated
}

export function hydrateIngredientReference(data: IngredientReferencePayload): void {
  INGREDIENT_REFERENCE = data.items
  INGREDIENT_GROUP_KEYWORDS = data.groupKeywords
  GROUP_GRAMS_PER_PORTION = data.groupGramsPerPortion
  GROUP_LABELS = data.groupLabels
  unitAliasesInternal = data.unitAliases
  hydrated = true
}

export function normalizeIngredientText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeIngredientUnit(value: string): string {
  const key = normalizeIngredientText(value).replace(/\./g, '')
  return unitAliasesInternal[key] || key
}
