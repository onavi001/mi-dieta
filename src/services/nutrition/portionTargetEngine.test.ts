import { describe, expect, it } from 'vitest'
import { computeSlotTargetGroupPortions, distributionWeightsFromProfile } from './portionTargetEngine'
import {
  distributeGroupPortionsByMeal,
  mealDistributionKeys,
  type PlanGroupKey,
} from './professionalNutritionRules'

describe('portionTargetEngine', () => {
  it('computeSlotTargetGroupPortions coincide con distributeGroupPortionsByMeal por slot', () => {
    const planPortions: Record<PlanGroupKey, number> = {
      verduras: 4,
      frutas: 3,
      cereales_tuberculos: 6,
      leguminosas: 1,
      proteina_animal_o_alternativas: 6,
      lacteos_o_sustitutos: 2,
      grasas_saludables: 1,
    }
    const mealCount = 5
    const weights = distributionWeightsFromProfile(mealCount, {})
    const keys = mealDistributionKeys(mealCount)

    const direct = computeSlotTargetGroupPortions('Comida', planPortions, {}, mealCount, 'healthy')

    for (const group of Object.keys(planPortions) as PlanGroupKey[]) {
      const d = distributeGroupPortionsByMeal(group, planPortions[group], keys, weights, { goal: 'healthy' })
      expect(direct[group]).toBeCloseTo(d.lunch, 1)
    }
  })
})
