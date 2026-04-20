import { detectIngredientGroup } from '../../data/reference/ingredientConversionUtils'
import { INGREDIENT_REFERENCE, type PlanGroupKey } from '../../data/reference/ingredientReference'
import type { Comida, TipoComida } from '../../types/domain'
import type { WeekPlan, WeekState, WeekStatePatch } from '../../hooks/dietApi/model'
import type { NutritionSummaryResponse } from '../../hooks/useNutritionApi'
import { profileGoalToNutritionGoal } from '../nutrition/professionalNutritionRules'
import { computeSlotTargetGroupPortions } from '../nutrition/portionTargetEngine'
import {
  alignMealPortionsToGroupTargets,
  estimateMealGroupPortions,
  fillMissingGroupPortionsFromTargets,
  rankMealsForGroupTarget,
} from '../meal-matching/mealCatalogMatching'
import {
  filterAndSortMealsForProfile,
  isIngredientExcludedForProfile,
  pickReplacementIngredient,
} from '../profile-food/profileFoodRules'

function buildIngredientOptionsByGroup(): Record<PlanGroupKey, string[]> {
  const grouped = {
    verduras: [] as string[],
    frutas: [] as string[],
    cereales_tuberculos: [] as string[],
    leguminosas: [] as string[],
    proteina_animal_o_alternativas: [] as string[],
    lacteos_o_sustitutos: [] as string[],
    grasas_saludables: [] as string[],
  }

  for (const [id, ref] of Object.entries(INGREDIENT_REFERENCE)) {
    grouped[ref.group].push(id)
  }

  for (const group of Object.keys(grouped) as PlanGroupKey[]) {
    grouped[group].sort((a, b) => a.localeCompare(b, 'es'))
  }

  return grouped
}

export interface ApplyPostPlanGenerationOptimizationsParams {
  generatedPlan: WeekPlan
  hasGeneratedMeals: boolean
  nutritionData: NutritionSummaryResponse | null
  weekStateSuggestionPreferences: WeekState['suggestionPreferences'] | null | undefined
  /** Catálogo agrupado por tipo (p. ej. GET /api/meals + groupMealsByTipo). */
  mealsByTipo: Partial<Record<TipoComida, Comida[]>>
  replaceIngredient: (
    slotId: string,
    ingredientIndex: number,
    nextIngredientId: string,
    week: string
  ) => Promise<unknown>
  syncWeekState: (patch: WeekStatePatch) => Promise<boolean>
}

/**
 * Reemplaza ingredientes excluidos y aplica overrides de comidas del catálogo según el perfil nutricional.
 * Devuelve si hubo comidas generadas o overrides aplicados (misma semántica que el flujo original en App).
 */
export async function applyPostPlanGenerationOptimizations(
  params: ApplyPostPlanGenerationOptimizationsParams
): Promise<boolean> {
  const {
    generatedPlan,
    hasGeneratedMeals,
    nutritionData,
    weekStateSuggestionPreferences,
    mealsByTipo,
    replaceIngredient,
    syncWeekState,
  } = params

  const ingredientOptionsByGroup = buildIngredientOptionsByGroup()

  const nutritionProfile = nutritionData?.nutritionProfile
  if (!nutritionProfile) return true

  const profileFoodRules = {
    allergies: nutritionProfile.allergies,
    intolerances: nutritionProfile.intolerances,
    foodPreferences: nutritionProfile.food_preferences,
  }

  const suggestionPreferences = weekStateSuggestionPreferences || {
    preferredCuisineTags: [],
    preferQuickMeals: false,
    avoidFish: false,
    preferMeasuredMeals: true,
    autoApplyToGeneratedWeek: true,
  }

  const selectedMealsPerDay = Math.max(3, Math.min(5, Number(nutritionProfile.meals_per_day || 5)))
  const rawDistributionByMeal = nutritionData?.activePlanVersion?.distribution_by_meal || {}

  const rawPlanPortions = nutritionData?.activePlanVersion?.portions_by_group as
    | Partial<Record<PlanGroupKey, number>>
    | undefined
  const hasPlanPortions = Boolean(rawPlanPortions)
  const planPortionsByGroup: Record<PlanGroupKey, number> = {
    verduras: Number(rawPlanPortions?.verduras || 0),
    frutas: Number(rawPlanPortions?.frutas || 0),
    cereales_tuberculos: Number(rawPlanPortions?.cereales_tuberculos || 0),
    leguminosas: Number(rawPlanPortions?.leguminosas || 0),
    proteina_animal_o_alternativas: Number(rawPlanPortions?.proteina_animal_o_alternativas || 0),
    lacteos_o_sustitutos: Number(rawPlanPortions?.lacteos_o_sustitutos || 0),
    grasas_saludables: Number(rawPlanPortions?.grasas_saludables || 0),
  }
  const nutritionGoal = profileGoalToNutritionGoal(nutritionProfile.objective_goal)

  for (const slot of generatedPlan.slots) {
    if (!slot.meal) continue

    for (const [ingredientIndex, ingredient] of slot.meal.ingredientes.entries()) {
      if (!isIngredientExcludedForProfile(ingredient.id, profileFoodRules)) {
        continue
      }

      const group = detectIngredientGroup(ingredient.id, `${ingredient.id} ${ingredient.presentacion || ''}`)
      if (!group) continue

      const replacement = pickReplacementIngredient(
        ingredient.id,
        ingredientOptionsByGroup[group],
        profileFoodRules
      )

      if (!replacement || replacement === ingredient.id) continue

      try {
        await replaceIngredient(slot.slot, ingredientIndex, replacement, generatedPlan.week)
      } catch {
        // Keep base generated week even if a replacement fails.
      }
    }
  }

  const mealOverrides: Record<string, NonNullable<(typeof generatedPlan.slots)[number]['meal']>> = {}

  for (const slot of generatedPlan.slots) {
    const alternatives = mealsByTipo[slot.tipo] ?? []
    if (alternatives.length === 0) continue

    const compatibleAlternatives = filterAndSortMealsForProfile(alternatives, profileFoodRules)
    const candidatePool = compatibleAlternatives.length > 0 ? compatibleAlternatives : alternatives
    if (candidatePool.length === 0) continue

    const targetPortions = hasPlanPortions
      ? computeSlotTargetGroupPortions(
          slot.tipo,
          planPortionsByGroup,
          rawDistributionByMeal,
          selectedMealsPerDay,
          nutritionGoal
        )
      : slot.meal
        ? estimateMealGroupPortions(slot.meal)
        : estimateMealGroupPortions(candidatePool[0])

    const ranked = rankMealsForGroupTarget(candidatePool, targetPortions, {
      preferences: suggestionPreferences,
    })

    const rankedMeal = ranked[0]?.meal || candidatePool[0]
    if (!rankedMeal) continue

    const finalMeal = hasPlanPortions
      ? fillMissingGroupPortionsFromTargets(alignMealPortionsToGroupTargets(rankedMeal, targetPortions), targetPortions)
      : rankedMeal
    const needsCatalogSwap = !slot.meal || slot.meal.id !== rankedMeal.id

    if (hasPlanPortions || needsCatalogSwap) {
      mealOverrides[slot.slot] = finalMeal
    }
  }

  if (Object.keys(mealOverrides).length > 0) {
    await syncWeekState({ mealOverrides, week: generatedPlan.week })
  }

  return hasGeneratedMeals || Object.keys(mealOverrides).length > 0
}
