import type { TipoComida } from '../../types/domain'
import { mealDistributionKeyFromTipo } from '../../features/diet-planner/weeklyDietHelpers'
import {
  DEFAULT_MEAL_DISTRIBUTION,
  distributeGroupPortionsByMeal,
  mealDistributionKeys,
  mealDistributionWeightsMap,
  type DistributionKey,
  type NutritionGoal,
  type PlanGroupKey,
} from './professionalNutritionRules'

const PLAN_GROUP_KEYS: PlanGroupKey[] = [
  'verduras',
  'frutas',
  'cereales_tuberculos',
  'leguminosas',
  'proteina_animal_o_alternativas',
  'lacteos_o_sustitutos',
  'grasas_saludables',
]

function createEmptyTotals(): Record<PlanGroupKey, number> {
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

/**
 * Pesos por comida (mismo criterio que la API: `mealPortionTargets.js` + `mealDistributionWeightsMap`).
 */
export function distributionWeightsFromProfile(
  mealCount: number,
  raw: Partial<Record<DistributionKey, number | undefined>> | null | undefined
): Record<DistributionKey, number> {
  return mealDistributionWeightsMap(mealCount, {
    breakfast: Number(raw?.breakfast ?? DEFAULT_MEAL_DISTRIBUTION.breakfast),
    snackAm: Number(raw?.snackAm ?? DEFAULT_MEAL_DISTRIBUTION.snackAm),
    lunch: Number(raw?.lunch ?? DEFAULT_MEAL_DISTRIBUTION.lunch),
    snackPm: Number(raw?.snackPm ?? DEFAULT_MEAL_DISTRIBUTION.snackPm),
    dinner: Number(raw?.dinner ?? DEFAULT_MEAL_DISTRIBUTION.dinner),
  })
}

/**
 * Porciones objetivo por grupo para un slot (`tipo` de comida), alineado con la generación en API.
 */
export function computeSlotTargetGroupPortions(
  tipo: string,
  planPortionsByGroup: Record<PlanGroupKey, number>,
  rawDistributionByMeal: Partial<Record<DistributionKey, number | undefined>> | null | undefined,
  mealCount: number,
  nutritionGoal: NutritionGoal
): Record<PlanGroupKey, number> {
  const slotKey = mealDistributionKeyFromTipo(tipo as TipoComida) as DistributionKey
  const keys = mealDistributionKeys(mealCount)
  const distributionWeightsByKey = distributionWeightsFromProfile(mealCount, rawDistributionByMeal)
  const targets = createEmptyTotals()

  for (const group of PLAN_GROUP_KEYS) {
    const distribution = distributeGroupPortionsByMeal(
      group,
      planPortionsByGroup[group] || 0,
      keys,
      distributionWeightsByKey,
      { goal: nutritionGoal }
    )
    targets[group] = Number((distribution[slotKey] || 0).toFixed(2))
  }

  return targets
}
