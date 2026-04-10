import { describe, expect, it } from 'vitest'
import {
  distributeGroupPortionsByMeal,
  mealDistributionKeys,
  mealDistributionWeightsMap,
  type PlanGroupKey,
} from './professionalNutritionRules'

const ALL_GROUPS: PlanGroupKey[] = [
  'verduras',
  'frutas',
  'cereales_tuberculos',
  'leguminosas',
  'proteina_animal_o_alternativas',
  'lacteos_o_sustitutos',
  'grasas_saludables',
]

describe('professionalNutritionRules', () => {
  it('keeps snack targets only for frutas and lacteos in 5-meal plans', () => {
    const keys = mealDistributionKeys(5)
    const weights = mealDistributionWeightsMap(5)

    const targetByGroup = Object.fromEntries(
      ALL_GROUPS.map((group) => [group, distributeGroupPortionsByMeal(group, 10, keys, weights)])
    ) as Record<PlanGroupKey, Record<'breakfast' | 'snackAm' | 'lunch' | 'snackPm' | 'dinner', number>>

    expect(targetByGroup.verduras.snackAm).toBe(0)
    expect(targetByGroup.cereales_tuberculos.snackAm).toBe(0)
    expect(targetByGroup.leguminosas.snackAm).toBe(0)
    expect(targetByGroup.proteina_animal_o_alternativas.snackAm).toBe(0)
    expect(targetByGroup.grasas_saludables.snackAm).toBe(0)

    expect(targetByGroup.verduras.snackPm).toBe(0)
    expect(targetByGroup.cereales_tuberculos.snackPm).toBe(0)
    expect(targetByGroup.leguminosas.snackPm).toBe(0)
    expect(targetByGroup.proteina_animal_o_alternativas.snackPm).toBe(0)
    expect(targetByGroup.grasas_saludables.snackPm).toBe(0)

    expect(targetByGroup.frutas.snackAm).toBeGreaterThan(0)
    expect(targetByGroup.lacteos_o_sustitutos.snackAm).toBeGreaterThan(0)
    expect(targetByGroup.frutas.snackPm).toBeGreaterThan(0)
    expect(targetByGroup.lacteos_o_sustitutos.snackPm).toBeGreaterThan(0)
  })

  it('preserves total portions when distributing a group across meals', () => {
    const keys = mealDistributionKeys(5)
    const weights = mealDistributionWeightsMap(5)
    const totalPortions = 7.5

    const distributed = distributeGroupPortionsByMeal('frutas', totalPortions, keys, weights)
    const totalDistributed = keys.reduce((acc, key) => acc + distributed[key], 0)

    expect(totalDistributed).toBeCloseTo(totalPortions, 6)
  })
})