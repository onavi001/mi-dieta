import {
  GROUP_GRAMS_PER_PORTION,
  type PlanGroupKey,
} from './ingredientReference'

export type DistributionKey = 'breakfast' | 'snackAm' | 'lunch' | 'snackPm' | 'dinner'
export type NutritionGoal = 'lose' | 'loseFast' | 'maintain' | 'muscle' | 'gain' | 'endurance' | 'healthy'

export const DEFAULT_MEAL_DISTRIBUTION: Record<DistributionKey, number> = {
  breakfast: 25,
  snackAm: 10,
  lunch: 30,
  snackPm: 10,
  dinner: 25,
}

const MEAL_DISTRIBUTION_BY_COUNT: Record<3 | 4 | 5, Record<DistributionKey, number>> = {
  3: {
    breakfast: 30,
    snackAm: 0,
    lunch: 40,
    snackPm: 0,
    dinner: 30,
  },
  4: {
    breakfast: 25,
    snackAm: 0,
    lunch: 35,
    snackPm: 10,
    dinner: 30,
  },
  5: {
    breakfast: 25,
    snackAm: 10,
    lunch: 30,
    snackPm: 10,
    dinner: 25,
  },
}

export { GROUP_GRAMS_PER_PORTION }
export type { PlanGroupKey }

const ZERO_GROUPS: Record<PlanGroupKey, number> = {
  verduras: 0,
  frutas: 0,
  cereales_tuberculos: 0,
  leguminosas: 0,
  proteina_animal_o_alternativas: 0,
  lacteos_o_sustitutos: 0,
  grasas_saludables: 0,
}

const FOOD_GROUP_BASE: Record<3 | 4 | 5, Record<DistributionKey, Record<PlanGroupKey, number>>> = {
  3: {
    breakfast: {
      verduras: 0,
      frutas: 0.2,
      cereales_tuberculos: 0.45,
      leguminosas: 0,
      proteina_animal_o_alternativas: 0.2,
      lacteos_o_sustitutos: 0.15,
      grasas_saludables: 0,
    },
    snackAm: { ...ZERO_GROUPS },
    lunch: {
      verduras: 0.35,
      frutas: 0,
      cereales_tuberculos: 0.25,
      leguminosas: 0.2,
      proteina_animal_o_alternativas: 0.2,
      lacteos_o_sustitutos: 0,
      grasas_saludables: 0,
    },
    snackPm: { ...ZERO_GROUPS },
    dinner: {
      verduras: 0.4,
      frutas: 0,
      cereales_tuberculos: 0.15,
      leguminosas: 0.15,
      proteina_animal_o_alternativas: 0.3,
      lacteos_o_sustitutos: 0,
      grasas_saludables: 0,
    },
  },
  4: {
    breakfast: {
      verduras: 0,
      frutas: 0.2,
      cereales_tuberculos: 0.4,
      leguminosas: 0,
      proteina_animal_o_alternativas: 0.25,
      lacteos_o_sustitutos: 0.15,
      grasas_saludables: 0,
    },
    snackAm: { ...ZERO_GROUPS },
    lunch: {
      verduras: 0.35,
      frutas: 0,
      cereales_tuberculos: 0.25,
      leguminosas: 0.2,
      proteina_animal_o_alternativas: 0.2,
      lacteos_o_sustitutos: 0,
      grasas_saludables: 0,
    },
    snackPm: {
      verduras: 0,
      frutas: 0.6,
      cereales_tuberculos: 0,
      leguminosas: 0,
      proteina_animal_o_alternativas: 0,
      lacteos_o_sustitutos: 0.4,
      grasas_saludables: 0,
    },
    dinner: {
      verduras: 0.4,
      frutas: 0,
      cereales_tuberculos: 0.15,
      leguminosas: 0.15,
      proteina_animal_o_alternativas: 0.3,
      lacteos_o_sustitutos: 0,
      grasas_saludables: 0,
    },
  },
  5: {
    breakfast: {
      verduras: 0,
      frutas: 0.25,
      cereales_tuberculos: 0.4,
      leguminosas: 0,
      proteina_animal_o_alternativas: 0.2,
      lacteos_o_sustitutos: 0.15,
      grasas_saludables: 0,
    },
    snackAm: {
      verduras: 0,
      frutas: 0.6,
      cereales_tuberculos: 0,
      leguminosas: 0,
      proteina_animal_o_alternativas: 0,
      lacteos_o_sustitutos: 0.4,
      grasas_saludables: 0,
    },
    lunch: {
      verduras: 0.35,
      frutas: 0,
      cereales_tuberculos: 0.25,
      leguminosas: 0.2,
      proteina_animal_o_alternativas: 0.2,
      lacteos_o_sustitutos: 0,
      grasas_saludables: 0,
    },
    snackPm: {
      verduras: 0,
      frutas: 0.6,
      cereales_tuberculos: 0,
      leguminosas: 0,
      proteina_animal_o_alternativas: 0,
      lacteos_o_sustitutos: 0.4,
      grasas_saludables: 0,
    },
    dinner: {
      verduras: 0.4,
      frutas: 0,
      cereales_tuberculos: 0.15,
      leguminosas: 0.15,
      proteina_animal_o_alternativas: 0.3,
      lacteos_o_sustitutos: 0,
      grasas_saludables: 0,
    },
  },
}

const GOAL_FOOD_GROUP_ADJUSTMENTS: Record<NutritionGoal, Partial<Record<DistributionKey, Partial<Record<PlanGroupKey, number>>>>> = {
  lose: {
    lunch: { verduras: 0.05, cereales_tuberculos: -0.05 },
    dinner: { verduras: 0.05, cereales_tuberculos: -0.05 },
  },
  loseFast: {
    lunch: { verduras: 0.05, cereales_tuberculos: -0.05 },
    dinner: { verduras: 0.05, cereales_tuberculos: -0.05 },
  },
  maintain: {},
  muscle: {
    breakfast: { proteina_animal_o_alternativas: 0.05, lacteos_o_sustitutos: -0.05 },
    lunch: { proteina_animal_o_alternativas: 0.05, leguminosas: -0.05 },
    dinner: { proteina_animal_o_alternativas: 0.05, verduras: -0.05 },
  },
  gain: {
    breakfast: { cereales_tuberculos: 0.05, frutas: -0.05 },
    lunch: { cereales_tuberculos: 0.05, verduras: -0.05 },
  },
  endurance: {
    breakfast: { cereales_tuberculos: 0.1, proteina_animal_o_alternativas: -0.05, lacteos_o_sustitutos: -0.05 },
    lunch: { cereales_tuberculos: 0.1, proteina_animal_o_alternativas: -0.05, leguminosas: -0.05 },
  },
  healthy: {},
}

export function profileGoalToNutritionGoal(
  objectiveGoal?:
    | 'weight_loss'
    | 'rapid_weight_loss'
    | 'weight_maintenance'
    | 'muscle_gain'
    | 'weight_gain'
    | 'endurance_improvement'
    | 'healthy_diet'
    | null
): NutritionGoal {
  const map = {
    weight_loss: 'lose',
    rapid_weight_loss: 'loseFast',
    weight_maintenance: 'maintain',
    muscle_gain: 'muscle',
    weight_gain: 'gain',
    endurance_improvement: 'endurance',
    healthy_diet: 'healthy',
  } as const

  if (!objectiveGoal) return 'healthy'
  return map[objectiveGoal] || 'healthy'
}

function goalFoodGroupMatrix(mealCount: number, goal: NutritionGoal): Record<DistributionKey, Record<PlanGroupKey, number>> {
  const normalizedMealCount: 3 | 4 | 5 = mealCount <= 3 ? 3 : mealCount === 4 ? 4 : 5
  const base = JSON.parse(JSON.stringify(FOOD_GROUP_BASE[normalizedMealCount])) as Record<DistributionKey, Record<PlanGroupKey, number>>
  const deltas = GOAL_FOOD_GROUP_ADJUSTMENTS[goal] || {}

  for (const mealKey of Object.keys(deltas) as DistributionKey[]) {
    const byGroup = deltas[mealKey] || {}
    for (const group of Object.keys(byGroup) as PlanGroupKey[]) {
      const current = Number(base[mealKey]?.[group] || 0)
      const delta = Number(byGroup[group] || 0)
      base[mealKey][group] = Math.max(0, current + delta)
    }
  }

  return base
}

export function mealDistributionKeys(mealCount: number): DistributionKey[] {
  if (mealCount <= 3) return ['breakfast', 'lunch', 'dinner']
  if (mealCount === 4) return ['breakfast', 'lunch', 'snackPm', 'dinner']
  return ['breakfast', 'snackAm', 'lunch', 'snackPm', 'dinner']
}

export function mealDistributionWeightsMap(
  mealCount: number,
  customDistribution?: Partial<Record<DistributionKey, number | undefined>>
): Record<DistributionKey, number> {
  const keys = mealDistributionKeys(mealCount)
  const defaultsByCount = MEAL_DISTRIBUTION_BY_COUNT[mealCount <= 3 ? 3 : mealCount === 4 ? 4 : 5]
  const rawByKey: Record<DistributionKey, number> = {
    breakfast: 0,
    snackAm: 0,
    lunch: 0,
    snackPm: 0,
    dinner: 0,
  }

  for (const key of keys) {
    const customValue = customDistribution?.[key]
    rawByKey[key] =
      typeof customValue === 'number' && Number.isFinite(customValue) && customValue >= 0
        ? customValue
        : defaultsByCount[key]
  }

  const total = keys.reduce((acc, key) => acc + rawByKey[key], 0)
  if (total <= 0) {
    const fallbackTotal = keys.reduce((acc, key) => acc + defaultsByCount[key], 0)
    for (const key of keys) {
      rawByKey[key] = defaultsByCount[key] / fallbackTotal
    }

    return rawByKey
  }

  for (const key of keys) {
    rawByKey[key] = rawByKey[key] / total
  }

  return rawByKey
}

export function distributeGroupPortionsByMeal(
  group: PlanGroupKey,
  totalPortions: number,
  keys: DistributionKey[],
  baseWeightsByKey: Record<DistributionKey, number>,
  options?: { goal?: NutritionGoal }
): Record<DistributionKey, number> {
  const empty: Record<DistributionKey, number> = {
    breakfast: 0,
    snackAm: 0,
    lunch: 0,
    snackPm: 0,
    dinner: 0,
  }

  if (!Number.isFinite(totalPortions) || totalPortions <= 0) return empty

  const goal = options?.goal || 'healthy'
  const matrix = goalFoodGroupMatrix(keys.length, goal)
  const weightedRaw = keys.map((key) => baseWeightsByKey[key] * matrix[key][group])
  const weightedTotal = weightedRaw.reduce((acc, value) => acc + value, 0)
  if (weightedTotal <= 0) return empty

  const baseShares: Record<DistributionKey, number> = {
    breakfast: 0,
    snackAm: 0,
    lunch: 0,
    snackPm: 0,
    dinner: 0,
  }

  keys.forEach((key, idx) => {
    baseShares[key] = weightedRaw[idx] / weightedTotal
  })

  const finalShares = baseShares

  keys.forEach((key) => {
    empty[key] = totalPortions * finalShares[key]
  })

  return empty
}
