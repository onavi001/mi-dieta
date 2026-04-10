import {
  GROUP_GRAMS_PER_PORTION,
  type PlanGroupKey,
} from './ingredientReference'
import {
  detectIngredientGroup,
  ingredientToEstimatedGrams,
} from './ingredientConversionUtils'
import type { Comida, MealGroupPortions } from './types'

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

export function estimateMealGroupPortions(meal: Comida): Record<PlanGroupKey, number> {
  const explicit = normalizeGroupPortions(meal.groupPortions)
  const hasExplicit = Object.values(explicit).some((value) => value > 0)
  if (hasExplicit) return explicit

  const estimated = emptyGroupPortions()

  for (const ingredient of meal.ingredientes) {
    const group = detectIngredientGroup(ingredient.id, `${ingredient.id} ${ingredient.presentacion || ''}`)
    if (!group) continue

    const grams = ingredientToEstimatedGrams(ingredient, group)
    const gramsPerPortion = GROUP_GRAMS_PER_PORTION[group]
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