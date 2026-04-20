import { useMemo } from 'react'
import type { Comida } from '@/types/domain'
import { generateGroceryListFromMeals } from '@/services/grocery/groceryEngineV2'
import {
  filterMealIngredientsForProfile,
  summarizeFilteredMeals,
} from '@/services/profile-food/profileFoodRules'
import type { NutritionSummaryResponse } from '@/hooks/useNutritionApi'

export function useGroceryFilteredData(meals: Comida[], summary: NutritionSummaryResponse | null) {
  const allergies = summary?.nutritionProfile?.allergies
  const intolerances = summary?.nutritionProfile?.intolerances
  const foodPreferences = summary?.nutritionProfile?.food_preferences

  const filteredMeals = useMemo(() => {
    return filterMealIngredientsForProfile(meals, {
      allergies,
      intolerances,
      foodPreferences,
    })
  }, [meals, allergies, intolerances, foodPreferences])

  const filteredSomeIngredient = useMemo(() => {
    return filteredMeals.some((meal, index) => meal.ingredientes.length !== (meals[index]?.ingredientes.length || 0))
  }, [filteredMeals, meals])

  const filteredSummary = useMemo(() => {
    return summarizeFilteredMeals(meals, filteredMeals, {
      allergies,
      intolerances,
      foodPreferences,
    })
  }, [filteredMeals, meals, allergies, intolerances, foodPreferences])

  const categories = useMemo(() => generateGroceryListFromMeals(filteredMeals), [filteredMeals])

  const grocerySourceSummary = useMemo(() => {
    const uniqueIngredients = new Set(
      filteredMeals.flatMap((meal) => meal.ingredientes.map((ingredient) => ingredient.id.trim().toLowerCase()))
    )

    return {
      mealCount: filteredMeals.length,
      uniqueIngredientCount: uniqueIngredients.size,
    }
  }, [filteredMeals])

  return {
    filteredMeals,
    filteredSomeIngredient,
    filteredSummary,
    categories,
    grocerySourceSummary,
  }
}
