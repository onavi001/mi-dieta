/**
 * Datos de referencia de ingredientes: la fuente de verdad es el API (`GET /api/reference/ingredients`).
 * Si falla la red, se usa `ingredientReference.bundle.json` (exportado desde el API).
 */

import ingredientReferenceBundle from './ingredientReference.bundle.json'
import type { IngredientPortionProfile } from './ingredientPortionProfiles'
import { hydrateHumanPortionProfiles } from './ingredientPortionProfiles'
import { normalizeIngredientText } from './ingredientNormalize'

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
  humanPortionProfiles?: IngredientPortionProfile[]
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

export function resetIngredientReference(): void {
  INGREDIENT_REFERENCE = {}
  INGREDIENT_GROUP_KEYWORDS = { ...EMPTY_KEYWORDS }
  GROUP_GRAMS_PER_PORTION = { ...EMPTY_GRAMS }
  GROUP_LABELS = { ...EMPTY_LABELS }
  unitAliasesInternal = {}
  hydrated = false
  hydrateHumanPortionProfiles(undefined)
}

function applyPayload(data: IngredientReferencePayload): void {
  INGREDIENT_REFERENCE = data.items
  INGREDIENT_GROUP_KEYWORDS = data.groupKeywords
  GROUP_GRAMS_PER_PORTION = data.groupGramsPerPortion
  GROUP_LABELS = data.groupLabels
  unitAliasesInternal = data.unitAliases
  hydrateHumanPortionProfiles(data.humanPortionProfiles)
  hydrated = true
}

/** Catálogo empaquetado con la última exportación del API (offline / error de red). */
export function hydrateIngredientReferenceFallback(): void {
  applyPayload(ingredientReferenceBundle as IngredientReferencePayload)
}

export function hydrateIngredientReference(data: IngredientReferencePayload): void {
  applyPayload(data)
}

export { normalizeIngredientText }

export function normalizeIngredientUnit(value: string): string {
  const key = normalizeIngredientText(value).replace(/\./g, '')
  return unitAliasesInternal[key] || key
}

/** Primer paint y tests: bundle exportado desde el API hasta que llegue la respuesta en vivo. */
hydrateIngredientReferenceFallback()
