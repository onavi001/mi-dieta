import { GROUP_LABELS, type PlanGroupKey } from '@/data/reference/ingredientReference'
import type { MealMatchResult } from '@/services/meal-matching/mealCatalogMatching'
import { getMealProfileBadges } from '@/services/profile-food/profileFoodRules'
import type { Comida } from '@/types/domain'
import type { FoodRuleProfile } from '@/services/profile-food/profileFoodRules'
import { INITIAL_VISIBLE_ALTERNATIVES } from './mealCardConstants'
import { formatQty } from './mealCardFormat'
import { suggestionScoreClasses, suggestionScoreLabel } from './mealCardStyles'

type Props = {
  comida: Comida
  suggestedMeals: MealMatchResult[]
  profileFoodRules?: FoodRuleProfile
  hasSuggestedMealOverride: boolean
  showAllSuggestedMeals: boolean
  onToggleShowAll: () => void
  onClose: () => void
  onClearSuggestedMeal?: () => void
  onApplySuggestedMeal?: (match: MealMatchResult) => void
}

export function MealCardSuggestedAlternativesModal({
  comida,
  suggestedMeals,
  profileFoodRules,
  hasSuggestedMealOverride,
  showAllSuggestedMeals,
  onToggleShowAll,
  onClose,
  onClearSuggestedMeal,
  onApplySuggestedMeal,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-[70] bg-gray-900/45 backdrop-blur-[1px] flex items-end sm:items-center justify-center px-4"
      onClick={() => {
        onClose()
      }}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 shadow-xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-medium text-gray-500">Alternativas reales</p>
            <p className="text-lg font-semibold text-gray-900 leading-tight">{comida.nombre}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Opciones compatibles con el objetivo de grupos de esta comida
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 min-h-9 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 active:bg-gray-200"
          >
            ✕
          </button>
        </div>

        {hasSuggestedMealOverride && onClearSuggestedMeal && (
          <button
            type="button"
            onClick={() => {
              onClearSuggestedMeal()
              onClose()
            }}
            className="w-full mb-3 px-3 py-2.5 min-h-10 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-700 active:bg-emerald-100"
          >
            Volver a la comida del plan
          </button>
        )}

        <div className="space-y-3">
          {(showAllSuggestedMeals ? suggestedMeals : suggestedMeals.slice(0, INITIAL_VISIBLE_ALTERNATIVES)).map(
            (item) => {
              const cuisine = item.meal.realDishMetadata?.cuisineTags?.[0]
              const prepMinutes = item.meal.realDishMetadata?.prepTimeMinutes
              const profileBadges = getMealProfileBadges(item.meal, profileFoodRules)

              return (
                <div key={item.meal.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{item.meal.nombre}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {cuisine ? `${cuisine} · ` : ''}
                        {typeof prepMinutes === 'number' ? `${prepMinutes} min` : 'Tiempo no definido'}
                        {item.source === 'explicit' ? ' · curado' : ' · estimado'}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${suggestionScoreClasses(item.score)}`}
                    >
                      {suggestionScoreLabel(item.score)}
                    </span>
                  </div>

                  {profileBadges.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {profileBadges.map((badge) => (
                        <span
                          key={badge.label}
                          className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
                            badge.tone === 'preference'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-sky-200 bg-sky-50 text-sky-700'
                          }`}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-[11px] text-gray-700 mb-2 leading-relaxed">{item.meal.receta}</p>

                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {Object.entries(item.mealPortions)
                      .filter(([, value]) => value > 0)
                      .slice(0, 4)
                      .map(([group, value]) => (
                        <span
                          key={group}
                          className="rounded-full border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-gray-700"
                        >
                          {GROUP_LABELS[group as PlanGroupKey]} · {formatQty(value)}
                        </span>
                      ))}
                  </div>

                  {(item.missingGroups.length > 0 || item.extraGroups.length > 0) && (
                    <p className="text-[11px] text-gray-600 mb-3 leading-relaxed">
                      {item.missingGroups.length > 0
                        ? `Falta: ${item.missingGroups.map((group) => GROUP_LABELS[group]).join(', ')}`
                        : 'Sin faltantes'}
                      {item.extraGroups.length > 0
                        ? ` · Extra: ${item.extraGroups.map((group) => GROUP_LABELS[group]).join(', ')}`
                        : ''}
                    </p>
                  )}

                  {onApplySuggestedMeal && (
                    <button
                      type="button"
                      onClick={() => {
                        onApplySuggestedMeal(item)
                        onClose()
                      }}
                      className="w-full px-3 py-2.5 min-h-10 rounded-xl text-sm font-semibold bg-sky-600 text-white active:bg-sky-700"
                    >
                      Usar esta opcion
                    </button>
                  )}
                </div>
              )
            }
          )}

          {suggestedMeals.length > INITIAL_VISIBLE_ALTERNATIVES && (
            <button
              type="button"
              onClick={onToggleShowAll}
              className="w-full px-3 py-2.5 min-h-10 rounded-xl text-sm font-semibold bg-gray-100 text-gray-800 active:bg-gray-200"
            >
              {showAllSuggestedMeals
                ? 'Ver menos'
                : `Ver mas (${suggestedMeals.length - INITIAL_VISIBLE_ALTERNATIVES} restantes)`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
