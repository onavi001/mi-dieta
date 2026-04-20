import type { MealRankingPreferences } from '@/services/meal-matching/mealCatalogMatching'

const CUISINE_TAGS = ['mexicana', 'casero', 'vegetal', 'snack'] as const

type Props = {
  completedToday: number
  todayMealCount: number
  mealSuggestionPreferences: MealRankingPreferences
  onToggleCuisineTag: (tag: string) => void
  onTogglePreferQuickMeals: () => void
  onToggleAvoidFish: () => void
  autoAdjustMessage: string
}

export function WeeklyDietProgressPanel({
  completedToday,
  todayMealCount,
  mealSuggestionPreferences,
  onToggleCuisineTag,
  onTogglePreferQuickMeals,
  onToggleAvoidFish,
  autoAdjustMessage,
}: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-800">Progreso de hoy</p>
        <span className="text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1">
          {completedToday}/{todayMealCount || 0}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${todayMealCount ? (completedToday / todayMealCount) * 100 : 0}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">
        Desliza derecha para completar. Las comidas se generan automáticamente desde tus porciones.
      </p>
      <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50 px-3 py-3">
        <p className="text-xs font-semibold text-sky-900 mb-2">Preferencias de sugerencias</p>
        <p className="text-[11px] text-sky-700 mb-2">Al generar semana, se aplica automaticamente la alternativa mas compatible.</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {CUISINE_TAGS.map((tag) => {
            const active = (mealSuggestionPreferences.preferredCuisineTags || []).includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onToggleCuisineTag(tag)}
                className={`px-2.5 py-1.5 min-h-8 rounded-full text-[11px] font-semibold ${
                  active ? 'bg-sky-600 text-white' : 'bg-white text-sky-800 border border-sky-200 active:bg-sky-100'
                }`}
              >
                {tag}
              </button>
            )
          })}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onTogglePreferQuickMeals}
            className={`px-2.5 py-2 min-h-9 rounded-lg text-[11px] font-semibold ${
              mealSuggestionPreferences.preferQuickMeals
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-emerald-800 border border-emerald-200 active:bg-emerald-100'
            }`}
          >
            Rapidas (&lt;=20 min)
          </button>
          <button
            type="button"
            onClick={onToggleAvoidFish}
            className={`px-2.5 py-2 min-h-9 rounded-lg text-[11px] font-semibold ${
              mealSuggestionPreferences.avoidFish
                ? 'bg-rose-600 text-white'
                : 'bg-white text-rose-800 border border-rose-200 active:bg-rose-100'
            }`}
          >
            Evitar pescado
          </button>
        </div>
      </div>
      {autoAdjustMessage && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <p className="text-[11px] text-emerald-800">{autoAdjustMessage}</p>
        </div>
      )}
    </div>
  )
}
