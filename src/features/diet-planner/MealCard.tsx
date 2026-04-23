import { useState } from 'react'
import type { ConversionModalState, MealCardProps } from './meal-card/mealCardTypes'
export type { MealCardProps } from './meal-card/mealCardTypes'
import { useMealCardSwipe } from './hooks/useMealCardSwipe'
import { formatQty } from './meal-card/mealCardFormat'
import { MealCardConversionModal } from './meal-card/MealCardConversionModal'
import { MealCardIngredientPopup, type IngredientPopupState } from './meal-card/MealCardIngredientPopup'
import { MealCardSuggestedAlternativesModal } from './meal-card/MealCardSuggestedAlternativesModal'
import { portionStatusSurfaceClasses } from './meal-card/mealCardStyles'

export function MealCard({
  comida,
  slotId,
  groupBreakdown,
  hour,
  swipeTrigger,
  isExpanded,
  onToggle,
  isCompleted,
  mealPortionFactor,
  getIngredientMultiplier,
  onSetIngredientMultiplier,
  isIngredientReplacing,
  getIngredientOptions,
  onReplaceIngredient,
  onToggleCompleted,
  onSwapMeal,
  onQuickComplete,
  onQuickSwap,
  suggestedMeals = [],
  profileFoodRules,
  suggestionsLoading = false,
  onOpenSuggestedMeals,
  hasSuggestedMealOverride = false,
  saveState,
  onApplySuggestedMeal,
  onClearSuggestedMeal,
  swapEnabled = true,
}: MealCardProps) {
  const [conversionState, setConversionState] = useState<ConversionModalState | null>(null)
  const [showGroupBreakdown, setShowGroupBreakdown] = useState(false)
  const [showSuggestedMeals, setShowSuggestedMeals] = useState(false)
  const [showAllSuggestedMeals, setShowAllSuggestedMeals] = useState(false)
  const [ingredientPopup, setIngredientPopup] = useState<IngredientPopupState | null>(null)
  const [ingredientSearch, setIngredientSearch] = useState('')

  const { swipeOffset, onTouchStart, onTouchMove, onTouchEnd, onCardClick } = useMealCardSwipe({
    swipeTrigger,
    onQuickComplete,
    onQuickSwap,
    swapEnabled,
  })

  const closeSuggestedModal = () => {
    setShowSuggestedMeals(false)
    setShowAllSuggestedMeals(false)
  }

  return (
    <div id={`meal-card-${slotId}`} className="relative overflow-hidden rounded-2xl mb-3 scroll-mt-4">
      <div className="absolute inset-0 bg-emerald-500/90 text-white text-xs font-semibold flex items-center pl-4">
        Completar
      </div>
      {swapEnabled && (
        <div className="absolute inset-0 bg-blue-500/90 text-white text-xs font-semibold flex items-center justify-end pr-4">
          Intercambiar
        </div>
      )}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={`bg-white border border-gray-200 rounded-2xl p-4 active:scale-[0.985] transition-all relative ${
          isCompleted ? 'opacity-75' : ''
        } ${swipeOffset === 0 ? 'duration-200' : 'duration-75'}`}
        style={{ transform: `translateX(${swipeOffset}px)` }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleCompleted()
          }}
          className={`absolute top-4 right-4 w-7 h-7 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-colors min-h-touch-mobile ${
            isCompleted ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 text-gray-400'
          }`}
        >
          {isCompleted && '✓'}
        </button>

        <div
          onClick={() => onCardClick(onToggle)}
          className="flex items-start justify-between gap-3 pr-8 cursor-pointer"
        >
          <div className="flex-1">
            <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-xl mb-2 bg-gray-100 text-gray-700 mr-2">
              {hour}
            </span>
            <span
              className={`inline-block px-3 py-1 text-xs font-medium rounded-xl mb-2
              ${comida.tipo === 'Desayuno' ? 'bg-amber-100 text-amber-700' : ''}
              ${comida.tipo === 'Comida' ? 'bg-red-100 text-red-700' : ''}
              ${comida.tipo === 'Cena' ? 'bg-teal-100 text-teal-700' : ''}
              ${comida.tipo.includes('Snack') ? 'bg-green-100 text-green-700' : ''}
            `}
            >
              {comida.tipo}
            </span>
            <p
              className={`font-medium text-base leading-tight ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}
            >
              {comida.nombre}
            </p>
            <div className="mt-1">
              <div className="flex flex-wrap gap-1.5">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    hasSuggestedMealOverride
                      ? 'bg-sky-100 text-sky-800 border-sky-200'
                      : 'bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                >
                  {hasSuggestedMealOverride ? 'Alternativa guardada' : 'Plan original'}
                </span>
                {saveState && (
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      saveState === 'saving'
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : saveState === 'saved'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border-rose-200'
                    }`}
                  >
                    {saveState === 'saving' ? 'Guardando...' : saveState === 'saved' ? 'Guardado' : 'Error al guardar'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className={`text-2xl text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            {swapEnabled && (
              <button
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onSwapMeal()
                }}
                className="mb-3 px-3 py-2.5 min-h-10 w-full rounded-xl text-sm font-medium bg-blue-50 text-blue-700 active:bg-blue-100 transition-colors"
              >
                Intercambiar comida
              </button>
            )}

            <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 mb-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowGroupBreakdown((prev) => !prev)
                }}
                className="w-full flex items-center justify-between px-1 py-1.5 rounded-lg text-left"
              >
                <span className="text-xs font-semibold text-emerald-800">Porciones por grupo</span>
                <span className="text-[11px] font-medium text-emerald-700">{showGroupBreakdown ? 'Ocultar' : 'Ver'}</span>
              </button>

              {showGroupBreakdown && (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {groupBreakdown.map((item) => (
                    <div
                      key={item.group}
                      className={`text-[10px] rounded-lg border px-2 py-1.5 ${portionStatusSurfaceClasses(item.status)}`}
                    >
                      <p className="font-semibold leading-tight">{item.label}</p>
                      <p>Porc objetivo: {item.targetPortions}</p>
                      <p>Porc actual: {item.adjustedPortions}</p>
                      <p>Gr objetivo: {item.targetGrams}g</p>
                      <p>Gr actual: {item.adjustedGrams}g</p>
                      <p className="font-semibold">{item.statusLabel}</p>
                    </div>
                  ))}
                  {groupBreakdown.length === 0 && (
                    <p className="text-[11px] text-gray-600 col-span-full">Sin grupos para este filtro.</p>
                  )}
                </div>
              )}
            </div>

            {suggestedMeals.length > 0 && (
              <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100 mb-3">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-sky-900">Platillos reales similares</p>
                    <p className="text-[11px] text-sky-700 leading-relaxed">
                      Sugeridos según el objetivo de grupos de esta comida
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <span className="text-[10px] font-semibold text-sky-700 bg-white rounded-full px-2.5 py-1 border border-sky-200 whitespace-nowrap">
                      {suggestedMeals.length} opciones
                    </span>
                    {hasSuggestedMealOverride && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 rounded-full px-2.5 py-1 border border-emerald-200 whitespace-nowrap">
                        Alternativa activa
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] text-sky-800 leading-relaxed pr-1">
                    {suggestedMeals[0]?.meal.nombre || 'Hay alternativas compatibles disponibles'}
                  </p>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation()
                      if (onOpenSuggestedMeals) {
                        await onOpenSuggestedMeals()
                      }
                      setShowAllSuggestedMeals(false)
                      setShowSuggestedMeals(true)
                    }}
                    disabled={suggestionsLoading}
                    className="shrink-0 w-full sm:w-auto px-3 py-2 min-h-9 rounded-lg text-[11px] font-semibold bg-sky-100 text-sky-800 active:bg-sky-200"
                  >
                    {suggestionsLoading ? 'Cargando...' : 'Ver alternativas'}
                  </button>
                </div>
              </div>
            )}

            <div className="p-2.5 sm:p-3 rounded-2xl bg-gray-50 mb-4 sm:mb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-green-600">Ingredientes ({comida.ingredientes.length})</p>
                <span className="text-[10px] text-gray-500">Editables</span>
              </div>
              <ul className="space-y-1.5 sm:space-y-2">
                {comida.ingredientes.map((ing, idx) => {
                  const multiplier = getIngredientMultiplier(slotId, ing.id, idx)
                  const effectiveAmount = ing.cantidad * mealPortionFactor * multiplier
                  const isModified = multiplier !== 1

                  return (
                    <li
                      key={idx}
                      className={`rounded-xl p-2 border ${
                        multiplier === 0
                          ? 'bg-gray-50 border-gray-200'
                          : isModified
                            ? 'bg-white border-l-4 border-amber-300 border-y-gray-200 border-r-gray-200'
                            : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-xs sm:text-sm font-medium flex-1 min-w-0 truncate ${
                            multiplier === 0 ? 'line-through text-gray-400' : 'text-gray-900'
                          }`}
                        >
                          {ing.cantidad > 0 ? `${formatQty(effectiveAmount)}${ing.unidad}` : '?'}{' '}
                          {ing.id}
                          {multiplier === 0 && (
                            <span className="ml-1 text-[10px] font-normal not-italic">no usar</span>
                          )}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            const opts = getIngredientOptions(ing.id, `${ing.id} ${ing.presentacion || ''}`)
                            setIngredientSearch('')
                            setIngredientPopup({
                              idx,
                              ingId: ing.id,
                              ingText: `${ing.id} ${ing.presentacion || ''}`,
                              options: opts,
                            })
                          }}
                          className="shrink-0 px-2.5 py-1 min-h-8 rounded-lg text-[10px] font-semibold bg-gray-100 text-gray-700 active:bg-gray-200"
                        >
                          ⚙ Editar
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div>
              <p className="uppercase text-xs tracking-widest text-gray-500 font-medium mb-2">Preparación</p>
              <p className="text-sm text-gray-700 leading-relaxed">{comida.receta}</p>
            </div>

            {comida.tip && comida.tip !== '-' && (
              <div className="mt-4 bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <p className="text-xs font-medium text-amber-700 mb-1">💡 TIP REFLUJO</p>
                <p className="text-sm text-amber-800">{comida.tip}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {conversionState && (
        <MealCardConversionModal state={conversionState} onClose={() => setConversionState(null)} />
      )}

      {ingredientPopup && (
        <MealCardIngredientPopup
          popup={ingredientPopup}
          comida={comida}
          slotId={slotId}
          mealPortionFactor={mealPortionFactor}
          ingredientSearch={ingredientSearch}
          onIngredientSearchChange={setIngredientSearch}
          onClose={() => setIngredientPopup(null)}
          getIngredientMultiplier={getIngredientMultiplier}
          isIngredientReplacing={isIngredientReplacing}
          onSetIngredientMultiplier={onSetIngredientMultiplier}
          onReplaceIngredient={onReplaceIngredient}
          onOpenConversion={setConversionState}
        />
      )}

      {showSuggestedMeals && suggestedMeals.length > 0 && (
        <MealCardSuggestedAlternativesModal
          comida={comida}
          suggestedMeals={suggestedMeals}
          profileFoodRules={profileFoodRules}
          hasSuggestedMealOverride={hasSuggestedMealOverride}
          showAllSuggestedMeals={showAllSuggestedMeals}
          onToggleShowAll={() => setShowAllSuggestedMeals((prev) => !prev)}
          onClose={closeSuggestedModal}
          onClearSuggestedMeal={onClearSuggestedMeal}
          onApplySuggestedMeal={onApplySuggestedMeal}
        />
      )}
    </div>
  )
}
