import {
  GROUP_GRAMS_PER_PORTION,
  type PlanGroupKey,
} from '../../data/reference/ingredientReference'
import {
  detectIngredientGroup,
  gramsPerPortionForIngredient,
  ingredientToEstimatedGrams,
} from '../../data/reference/ingredientConversionUtils'
import type { Comida, MealGroupPortions, MealIngredient } from '../../types/domain'

export type MealNutritionSource = 'explicit' | 'estimated'

export interface MealRankingPreferences {
  preferredCuisineTags?: string[]
  preferQuickMeals?: boolean
  avoidFish?: boolean
  preferMeasuredMeals?: boolean
  autoApplyToGeneratedWeek?: boolean
}

export interface MealRankingOptions {
  preferences?: MealRankingPreferences
}

export interface MealMatchResult {
  meal: Comida
  score: number
  rankScore: number
  source: MealNutritionSource
  targetPortions: MealGroupPortions
  mealPortions: MealGroupPortions
  missingGroups: PlanGroupKey[]
  extraGroups: PlanGroupKey[]
}

function emptyGroupPortions(): Record<PlanGroupKey, number> {
  return {
    verduras: 0,
    frutas: 0,
    cereales_tuberculos: 0,
    leguminosas: 0,
    proteina_animal_o_alternativas: 0,
    lacteos_o_sustitutos: 0,
    grasas_saludables: 0,
  }
}

function normalizeGroupPortions(values?: MealGroupPortions): Record<PlanGroupKey, number> {
  const normalized = emptyGroupPortions()

  if (!values) return normalized

  for (const group of Object.keys(normalized) as PlanGroupKey[]) {
    const value = values[group]
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      normalized[group] = Number(value.toFixed(2))
    }
  }

  return normalized
}

/** Porciones estimadas solo desde ingredientes (ignora `groupPortions` del platillo). */
export function estimateMealGroupPortionsFromIngredients(meal: Comida): Record<PlanGroupKey, number> {
  return estimateMealGroupPortions({ ...meal, groupPortions: {} })
}

export function estimateMealGroupPortions(meal: Comida): Record<PlanGroupKey, number> {
  const explicit = normalizeGroupPortions(meal.groupPortions)
  const hasExplicit = Object.values(explicit).some((value) => value > 0)
  if (hasExplicit) return explicit

  const estimated = emptyGroupPortions()

  for (const ingredient of meal.ingredientes) {
    const group = detectIngredientGroup(ingredient.id, `${ingredient.id} ${ingredient.presentacion || ''}`)
    if (!group) continue

    const grams = ingredientToEstimatedGrams(ingredient, group)
    const gramsPerPortion = gramsPerPortionForIngredient(
      group,
      ingredient.id,
      `${ingredient.id} ${ingredient.presentacion || ''}`
    )
    if (!Number.isFinite(grams) || grams <= 0 || gramsPerPortion <= 0) continue

    estimated[group] += grams / gramsPerPortion
  }

  for (const group of Object.keys(estimated) as PlanGroupKey[]) {
    estimated[group] = Number(estimated[group].toFixed(2))
  }

  return estimated
}

export function getMealNutritionSource(meal: Comida): MealNutritionSource {
  const explicit = normalizeGroupPortions(meal.groupPortions)
  return Object.values(explicit).some((value) => value > 0) ? 'explicit' : 'estimated'
}

export function scoreMealAgainstGroupTarget(meal: Comida, target: MealGroupPortions): MealMatchResult {
  const normalizedTarget = normalizeGroupPortions(target)
  const mealPortions = estimateMealGroupPortions(meal)
  const missingGroups: PlanGroupKey[] = []
  const extraGroups: PlanGroupKey[] = []

  let totalPenalty = 0

  for (const group of Object.keys(normalizedTarget) as PlanGroupKey[]) {
    const targetValue = normalizedTarget[group]
    const mealValue = mealPortions[group]

    if (targetValue <= 0 && mealValue <= 0) continue

    if (targetValue > 0 && mealValue <= 0.05) {
      missingGroups.push(group)
      totalPenalty += 2.5
      continue
    }

    if (targetValue <= 0 && mealValue > 0.2) {
      extraGroups.push(group)
      totalPenalty += 1.5 + mealValue
      continue
    }

    const delta = Math.abs(mealValue - targetValue)
    const relativePenalty = targetValue > 0 ? delta / targetValue : delta
    totalPenalty += relativePenalty

    if (mealValue - targetValue > 0.35) {
      extraGroups.push(group)
    }
  }

  return {
    meal,
    score: Number(totalPenalty.toFixed(3)),
    rankScore: Number(totalPenalty.toFixed(3)),
    source: getMealNutritionSource(meal),
    targetPortions: normalizedTarget,
    mealPortions,
    missingGroups,
    extraGroups,
  }
}

function preferenceAdjustment(meal: Comida, source: MealNutritionSource, preferences?: MealRankingPreferences): number {
  if (!preferences) return 0

  let adjustment = 0
  const normalizedName = meal.nombre.toLowerCase()
  const normalizedTags = (meal.tags || []).map((tag) => tag.toLowerCase())
  const cuisineTags = (meal.realDishMetadata?.cuisineTags || []).map((tag) => tag.toLowerCase())

  if (preferences.preferMeasuredMeals && source === 'explicit') {
    adjustment -= 0.2
  }

  if (preferences.preferQuickMeals) {
    const prep = meal.realDishMetadata?.prepTimeMinutes
    if (typeof prep === 'number' && prep <= 20) {
      adjustment -= 0.25
    }
  }

  if (preferences.avoidFish) {
    const fishKeywords = ['pescado', 'salmon', 'atun', 'tilapia', 'camaron', 'marisco', 'mojarra', 'basa', 'cazon', 'sardina']
    const hasFish = fishKeywords.some((keyword) => normalizedName.includes(keyword) || normalizedTags.some((tag) => tag.includes(keyword)))
    if (hasFish) {
      adjustment += 0.8
    }
  }

  if (preferences.preferredCuisineTags && preferences.preferredCuisineTags.length > 0) {
    const preferred = preferences.preferredCuisineTags.map((tag) => tag.toLowerCase())
    const hasPreferredCuisine = preferred.some((tag) => cuisineTags.includes(tag) || normalizedTags.includes(tag))
    if (hasPreferredCuisine) {
      adjustment -= 0.35
    }
  }

  return adjustment
}

export function rankMealsForGroupTarget(meals: Comida[], target: MealGroupPortions, options?: MealRankingOptions): MealMatchResult[] {
  return meals
    .map((meal) => {
      const base = scoreMealAgainstGroupTarget(meal, target)
      const adjustment = preferenceAdjustment(base.meal, base.source, options?.preferences)
      return {
        ...base,
        rankScore: Number((base.score + adjustment).toFixed(3)),
      }
    })
    .sort((left, right) => left.rankScore - right.rankScore || left.score - right.score || left.meal.nombre.localeCompare(right.meal.nombre, 'es'))
}

function sumGroupPortions(values: Record<PlanGroupKey, number>): number {
  return Object.values(values).reduce((acc, v) => acc + (Number.isFinite(v) ? Math.max(0, v) : 0), 0)
}

/**
 * Base de porciones por grupo para escalar cantidades: prioriza lo inferido de ingredientes;
 * si no hay datos útiles, usa `groupPortions` explícitos del platillo.
 */
function portionBasisForScaling(meal: Comida): Record<PlanGroupKey, number> {
  const fromIngredients = estimateMealGroupPortionsFromIngredients(meal)
  if (sumGroupPortions(fromIngredients) > 0.02) return fromIngredients
  return normalizeGroupPortions(meal.groupPortions)
}

function roundScaledQuantity(cantidad: number, unidad: string): number {
  const u = (unidad || '').toLowerCase()
  if (!Number.isFinite(cantidad) || cantidad <= 0) return cantidad
  if (u === 'g' || u === 'ml' || u === 'kg' || u === 'l') return Math.max(1, Math.round(cantidad))
  if (u === 'piece' || u === 'slice' || u === 'cup' || u === 'tbsp' || u === 'tsp')
    return Math.max(0.25, Math.round(cantidad * 20) / 20)
  return Math.round(cantidad * 100) / 100
}

/**
 * Escala cantidades de ingredientes para acercar las porciones por grupo al objetivo del slot
 * (misma lógica que `distributeGroupPortionsByMeal` en el plan activo).
 * Actualiza `groupPortions` con los objetivos positivos para coherencia en UI.
 */
export function alignMealPortionsToGroupTargets(meal: Comida, targets: MealGroupPortions): Comida {
  const normalizedTarget = normalizeGroupPortions(targets)
  const basis = portionBasisForScaling(meal)

  const scaleByGroup: Record<PlanGroupKey, number> = {
    verduras: 1,
    frutas: 1,
    cereales_tuberculos: 1,
    leguminosas: 1,
    proteina_animal_o_alternativas: 1,
    lacteos_o_sustitutos: 1,
    grasas_saludables: 1,
  }

  for (const group of Object.keys(scaleByGroup) as PlanGroupKey[]) {
    const t = normalizedTarget[group]
    const c = basis[group]
    if (t <= 0.001 && c > 0.001) {
      scaleByGroup[group] = 0.05
    } else if (t > 0.001 && c > 0.001) {
      scaleByGroup[group] = t / c
    } else {
      scaleByGroup[group] = 1
    }
  }

  const nextIngredientes = meal.ingredientes.map((ing) => {
    const group = detectIngredientGroup(ing.id, `${ing.id} ${ing.presentacion || ''}`)
    if (!group) return ing
    const factor = scaleByGroup[group]
    if (factor === 1) return ing
    const nextQty = roundScaledQuantity(ing.cantidad * factor, ing.unidad)
    return { ...ing, cantidad: nextQty }
  })

  const nextGroupPortions: MealGroupPortions = {}
  for (const group of Object.keys(normalizedTarget) as PlanGroupKey[]) {
    const t = normalizedTarget[group]
    if (t > 0.001) nextGroupPortions[group] = Number(t.toFixed(2))
  }

  return {
    ...meal,
    ingredientes: nextIngredientes,
    groupPortions: Object.keys(nextGroupPortions).length > 0 ? nextGroupPortions : meal.groupPortions,
  }
}

/** Alineado con `GROUP_TO_BASE_INGREDIENT` en mi-dieta-api `planController.js`. */
const PLAN_GROUP_BASE_INGREDIENT_ID: Record<PlanGroupKey, string> = {
  verduras: 'espinaca',
  frutas: 'manzana',
  cereales_tuberculos: 'arroz',
  leguminosas: 'frijol',
  proteina_animal_o_alternativas: 'pollo',
  lacteos_o_sustitutos: 'yogurt',
  grasas_saludables: 'aguacate',
}

const TARGET_NEAR_EPS = 0.12
const MIN_ADD_GRAMS = 4

/**
 * Añade líneas de ingrediente base cuando, tras el escalado, aún falta aporte de un grupo con objetivo > 0.
 */
export function fillMissingGroupPortionsFromTargets(meal: Comida, targets: MealGroupPortions): Comida {
  const normalizedTarget = normalizeGroupPortions(targets)
  const current = estimateMealGroupPortionsFromIngredients(meal)
  const additions: MealIngredient[] = []

  for (const group of Object.keys(PLAN_GROUP_BASE_INGREDIENT_ID) as PlanGroupKey[]) {
    const t = normalizedTarget[group] || 0
    const c = current[group] || 0
    if (t <= 0.08) continue
    if (c >= t - TARGET_NEAR_EPS) continue
    const deficit = t - c
    if (deficit <= 0.05) continue
    const baseIngredientId = PLAN_GROUP_BASE_INGREDIENT_ID[group]
    const grams = deficit * gramsPerPortionForIngredient(group, baseIngredientId, baseIngredientId)
    if (grams < MIN_ADD_GRAMS) continue

    additions.push({
      id: baseIngredientId,
      presentacion: `Ajuste automático del plan (${group})`,
      cantidad: Math.max(1, Math.round(grams)),
      unidad: 'g',
    })
  }

  if (additions.length === 0) return meal

  return {
    ...meal,
    ingredientes: [...meal.ingredientes, ...additions],
  }
}