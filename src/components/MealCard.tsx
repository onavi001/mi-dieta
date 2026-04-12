import { useRef, useState } from 'react'
import type { TouchEvent } from 'react'
import type { Comida } from '../data/types'
import type { MealMatchResult } from '../data/mealCatalogMatching'
import {
  getMealProfileBadges,
  type FoodRuleProfile,
} from '../data/profileFoodRules'
import {
  GROUP_LABELS,
  GROUP_GRAMS_PER_PORTION,
  INGREDIENT_REFERENCE,
  normalizeIngredientText,
  normalizeIngredientUnit,
  type PlanGroupKey,
} from '../data/ingredientReference'
import {
  detectIngredientGroup,
  unitToGramsFactor,
} from '../data/ingredientConversionUtils'

interface MealCardProps {
  comida: Comida
  slotId: string
  groupBreakdown: Array<{
    group: string
    label: string
    targetPortions: number
    adjustedPortions: number
    targetGrams: number
    adjustedGrams: number
    status: 'ok' | 'warn' | 'alert'
    statusLabel: string
  }>
  hour: string
  swipeTrigger: number
  isExpanded: boolean
  onToggle: () => void
  isCompleted: boolean
  mealPortionFactor: number
  getIngredientMultiplier: (slotId: string, ingredientId: string, index: number) => number
  onSetIngredientMultiplier: (slotId: string, ingredientId: string, index: number, next: number) => void
  isIngredientReplacing: (slotId: string, index: number) => boolean
  getIngredientOptions: (ingredientId: string, ingredientText: string) => string[]
  onReplaceIngredient: (index: number, currentId: string, ingredientText: string, nextId: string) => void
  onToggleCompleted: () => void
  onSwapMeal: () => void
  onQuickComplete: () => void
  onQuickSwap: () => void
  suggestedMeals?: MealMatchResult[]
  profileFoodRules?: FoodRuleProfile
  suggestionsLoading?: boolean
  onOpenSuggestedMeals?: () => Promise<void>
  hasSuggestedMealOverride?: boolean
  saveState?: 'saving' | 'saved' | 'error'
  onApplySuggestedMeal?: (meal: Comida) => void
  onClearSuggestedMeal?: () => void
  swapEnabled?: boolean
}

type IngredientConversion = {
  label: string
  value: number
}

type PieceSizeConversion = {
  sizeLabel: string
  gramsPerPiece: number
  piecesForCurrent: number
}

type ConversionModalState = {
  ingredientId: string
  sourceAmount: number
  sourceUnit: string
  grams: number
  pieceGrams: number | null
  pieceAmount: number | null
  pieceSizeConversions: PieceSizeConversion[]
  group: PlanGroupKey | null
  portions: number | null
  conversions: IngredientConversion[]
}

const UNIT_LABELS: Record<string, string> = {
  g: 'gramos',
  kg: 'kilogramos',
  ml: 'mililitros',
  l: 'litros',
  oz: 'onzas',
  tbsp: 'cucharadas',
  tsp: 'cucharaditas',
  cup: 'tazas',
  piece: 'piezas',
  slice: 'rebanadas',
  pinch: 'pizcas',
}

const UNIT_PRIORITY = ['g', 'tbsp', 'tsp', 'cup', 'piece', 'slice', 'ml', 'oz', 'kg', 'l', 'pinch']

function formatQty(value: number): string {
  const rounded = Number(value.toFixed(2))
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}


function formatPortionFraction(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0'

  const whole = Math.floor(value)
  const fraction = value - whole
  const denominators = [2, 3, 4, 6, 8]

  let bestNumerator = 0
  let bestDenominator = 1
  let bestError = Number.POSITIVE_INFINITY

  denominators.forEach((denominator) => {
    const numerator = Math.round(fraction * denominator)
    const approx = numerator / denominator
    const error = Math.abs(fraction - approx)

    if (error < bestError) {
      bestNumerator = numerator
      bestDenominator = denominator
      bestError = error
    }
  })

  if (bestNumerator === 0 || bestError > 0.08) {
    return formatQty(value)
  }

  if (bestNumerator === bestDenominator) {
    return String(whole + 1)
  }

  if (whole === 0) {
    return `${bestNumerator}/${bestDenominator}`
  }

  return `${whole} ${bestNumerator}/${bestDenominator}`
}

function buildConversionModalState(
  ingredient: { id: string; cantidad: number; unidad: string },
  effectiveAmount: number
): ConversionModalState | null {
  if (!Number.isFinite(effectiveAmount) || effectiveAmount <= 0) {
    return null
  }

  const group = detectIngredientGroup(ingredient.id, ingredient.id)
  const sourceUnit = normalizeIngredientUnit(ingredient.unidad)
  const sourceFactor = unitToGramsFactor(sourceUnit, group, ingredient.id)
  if (!sourceFactor) {
    return null
  }

  const grams = effectiveAmount * sourceFactor
  if (!Number.isFinite(grams) || grams <= 0) {
    return null
  }

  const referenceUnits = Object.keys(
    INGREDIENT_REFERENCE[normalizeIngredientText(ingredient.id)]?.unitToGrams || {}
  )

  const candidateUnits = new Set<string>([...UNIT_PRIORITY, ...referenceUnits, sourceUnit])

  const conversions: IngredientConversion[] = []
  for (const unit of candidateUnits) {
    const factor = unitToGramsFactor(unit, group, ingredient.id)
    if (!factor) continue

    const converted = grams / factor
    if (!Number.isFinite(converted) || converted <= 0) continue

    conversions.push({
      label: UNIT_LABELS[unit] || unit,
      value: converted,
    })
  }

  conversions.sort((a, b) => a.value - b.value)

  const ingredientRef = INGREDIENT_REFERENCE[normalizeIngredientText(ingredient.id)]
  const pieceSizeConversions: PieceSizeConversion[] = ingredientRef?.pieceSizeGrams
    ? [
      {
        sizeLabel: 'Pieza chica',
        gramsPerPiece: ingredientRef.pieceSizeGrams.small,
        piecesForCurrent: grams / ingredientRef.pieceSizeGrams.small,
      },
      {
        sizeLabel: 'Pieza mediana',
        gramsPerPiece: ingredientRef.pieceSizeGrams.medium,
        piecesForCurrent: grams / ingredientRef.pieceSizeGrams.medium,
      },
      {
        sizeLabel: 'Pieza grande',
        gramsPerPiece: ingredientRef.pieceSizeGrams.large,
        piecesForCurrent: grams / ingredientRef.pieceSizeGrams.large,
      },
    ]
    : []

  const pieceFactor = unitToGramsFactor('piece', group, ingredient.id)
  const pieceGrams = pieceFactor && Number.isFinite(pieceFactor) && pieceFactor > 0 ? pieceFactor : null
  const pieceAmount = pieceGrams ? grams / pieceGrams : null
  const portions = group ? grams / GROUP_GRAMS_PER_PORTION[group] : null

  return {
    ingredientId: ingredient.id,
    sourceAmount: effectiveAmount,
    sourceUnit,
    grams,
    pieceGrams,
    pieceAmount,
    pieceSizeConversions,
    group,
    portions,
    conversions,
  }
}

function statusClasses(status: 'ok' | 'warn' | 'alert'): string {
  if (status === 'ok') return 'bg-emerald-50 border-emerald-200 text-emerald-900'
  if (status === 'warn') return 'bg-amber-50 border-amber-200 text-amber-900'
  return 'bg-rose-50 border-rose-200 text-rose-900'
}

function groupBadgeClasses(group: PlanGroupKey | null): string {
  if (group === 'verduras') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (group === 'frutas') return 'bg-orange-100 text-orange-800 border-orange-200'
  if (group === 'cereales_tuberculos') return 'bg-amber-100 text-amber-800 border-amber-200'
  if (group === 'leguminosas') return 'bg-lime-100 text-lime-800 border-lime-200'
  if (group === 'proteina_animal_o_alternativas') return 'bg-rose-100 text-rose-800 border-rose-200'
  if (group === 'lacteos_o_sustitutos') return 'bg-sky-100 text-sky-800 border-sky-200'
  if (group === 'grasas_saludables') return 'bg-violet-100 text-violet-800 border-violet-200'
  return 'bg-gray-100 text-gray-700 border-gray-200'
}

function suggestionScoreClasses(score: number): string {
  if (score <= 0.75) return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (score <= 1.5) return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-rose-100 text-rose-800 border-rose-200'
}

function suggestionScoreLabel(score: number): string {
  if (score <= 0.75) return 'Muy compatible'
  if (score <= 1.5) return 'Compatible'
  return 'Aproximado'
}

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
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [conversionState, setConversionState] = useState<ConversionModalState | null>(null)
  const [showGroupBreakdown, setShowGroupBreakdown] = useState(false)
  const [showSuggestedMeals, setShowSuggestedMeals] = useState(false)
  const [showIngredientTools, setShowIngredientTools] = useState(false)
  const [ingredientPopup, setIngredientPopup] = useState<{ idx: number; ingId: string; ingText: string; options: string[] } | null>(null)
  const [ingredientSearch, setIngredientSearch] = useState('')
  const touchStartX = useRef<number | null>(null)
  const movedBySwipe = useRef(false)

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX
    movedBySwipe.current = false
  }

  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return
    const delta = e.touches[0].clientX - touchStartX.current
    const clamped = Math.max(-90, Math.min(90, delta))

    if (Math.abs(clamped) > 12) {
      movedBySwipe.current = true
    }

    setSwipeOffset(clamped)
  }

  const onTouchEnd = () => {
    if (swipeOffset >= swipeTrigger) {
      onQuickComplete()
    }

    if (swapEnabled && swipeOffset <= -swipeTrigger) {
      onQuickSwap()
    }

    touchStartX.current = null
    setSwipeOffset(0)
  }

  const onCardClick = () => {
    if (movedBySwipe.current) {
      movedBySwipe.current = false
      return
    }

    onToggle()
  }

  return (
    <div className="relative overflow-hidden rounded-2xl mb-3">
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
        {/* Check icon for completed */}
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

        {/* Header de la comida */}
        <div
          onClick={onCardClick}
          className="flex items-start justify-between gap-3 pr-8 cursor-pointer"
        >
          <div className="flex-1">
            <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-xl mb-2 bg-gray-100 text-gray-700 mr-2">
              {hour}
            </span>
            <span className={`inline-block px-3 py-1 text-xs font-medium rounded-xl mb-2
              ${comida.tipo === 'Desayuno' ? 'bg-amber-100 text-amber-700' : ''}
              ${comida.tipo === 'Comida' ? 'bg-red-100 text-red-700' : ''}
              ${comida.tipo === 'Cena' ? 'bg-teal-100 text-teal-700' : ''}
              ${comida.tipo.includes('Snack') ? 'bg-green-100 text-green-700' : ''}
            `}>
              {comida.tipo}
            </span>
            <p className={`font-medium text-base leading-tight ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
              {comida.nombre}
            </p>
            <div className="mt-1">
              <div className="flex flex-wrap gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                  hasSuggestedMealOverride
                    ? 'bg-sky-100 text-sky-800 border-sky-200'
                    : 'bg-gray-100 text-gray-700 border-gray-200'
                }`}>
                  {hasSuggestedMealOverride ? 'Alternativa guardada' : 'Plan original'}
                </span>
                {saveState && (
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    saveState === 'saving'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : saveState === 'saved'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border-rose-200'
                  }`}>
                    {saveState === 'saving' ? 'Guardando...' : saveState === 'saved' ? 'Guardado' : 'Error al guardar'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className={`text-2xl text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>

        {/* Contenido expandible */}
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
                    <div key={item.group} className={`text-[10px] rounded-lg border px-2 py-1.5 ${statusClasses(item.status)}`}>
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
                    <p className="text-[11px] text-sky-700 leading-relaxed">Sugeridos según el objetivo de grupos de esta comida</p>
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

            {/* Ingredientes */}
            {(suggestedMeals.length === 0 || hasSuggestedMealOverride || showIngredientTools) ? (
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
                      <li key={idx} className={`rounded-xl p-2 border ${multiplier === 0 ? 'bg-gray-50 border-gray-200' : isModified ? 'bg-white border-l-4 border-amber-300 border-y-gray-200 border-r-gray-200' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs sm:text-sm font-medium flex-1 min-w-0 truncate ${multiplier === 0 ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                            {ing.cantidad > 0 ? `${formatQty(effectiveAmount)}${ing.unidad}` : '?'}{' '}{ing.id}
                            {multiplier === 0 && <span className="ml-1 text-[10px] font-normal not-italic">no usar</span>}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              const opts = getIngredientOptions(ing.id, `${ing.id} ${ing.presentacion || ''}`)
                              setIngredientSearch('')
                              setIngredientPopup({ idx, ingId: ing.id, ingText: `${ing.id} ${ing.presentacion || ''}`, options: opts })
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
            ) : (
              <div className="p-2.5 sm:p-3 rounded-2xl bg-amber-50 border border-amber-100 mb-4 sm:mb-5">
                <p className="text-xs font-semibold text-amber-900">Primero sugerencia de comida</p>
                <p className="text-[11px] text-amber-800 mt-1">
                  Para evitar cambios al azar, primero elige una alternativa completa y luego ajusta ingredientes si hace falta.
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowIngredientTools(true)
                  }}
                  className="mt-2 px-3 py-2 min-h-9 rounded-lg text-[11px] font-semibold bg-white text-amber-800 border border-amber-200 active:bg-amber-100"
                >
                  Editar ingredientes (avanzado)
                </button>
              </div>
            )}

            {/* Receta */}
            <div>
              <p className="uppercase text-xs tracking-widest text-gray-500 font-medium mb-2">Preparación</p>
              <p className="text-sm text-gray-700 leading-relaxed">{comida.receta}</p>
            </div>

            {/* Tip de reflujo */}
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
        <div
          className="fixed inset-0 z-[70] bg-gray-900/45 backdrop-blur-[1px] flex items-end sm:items-center justify-center px-4"
          onClick={(e) => {
            e.stopPropagation()
            setConversionState(null)
          }}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-medium text-gray-500">Conversión</p>
                <p className="text-lg font-semibold text-gray-900 leading-tight">{conversionState.ingredientId}</p>
              </div>
              <button
                type="button"
                onClick={() => setConversionState(null)}
                className="px-3 py-2 min-h-9 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 active:bg-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl border border-sky-100 bg-sky-50 p-3 mb-4">
              <p className="text-sm text-sky-900">
                Base: <span className="font-semibold">{formatQty(conversionState.sourceAmount)} {UNIT_LABELS[conversionState.sourceUnit] || conversionState.sourceUnit}</span>
              </p>
              <p className="text-sm text-sky-900">
                Equivale a <span className="font-semibold">{formatQty(conversionState.grams)} g</span>
              </p>
            </div>

            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Equivalencias</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {conversionState.conversions.map((item) => (
                  <div key={item.label} className="rounded-xl border border-gray-200 px-3 py-2 bg-gray-50">
                    <p className="text-[11px] text-gray-500">{item.label}</p>
                    <p className="text-sm font-semibold text-gray-900">{formatQty(item.value)}</p>
                  </div>
                ))}
              </div>
            </div>

            {conversionState.pieceGrams !== null && conversionState.pieceAmount !== null && (
              <div className="rounded-2xl border border-violet-100 bg-violet-50 p-3 mb-4">
                <p className="text-xs font-medium text-violet-700 mb-2">Pieza estándar</p>
                <p className="text-sm text-violet-900">
                  1 pieza ≈ <span className="font-semibold">{formatQty(conversionState.pieceGrams)} g</span>
                </p>
                <p className="text-sm text-violet-900">
                  Tu cantidad = <span className="font-semibold">{formatQty(conversionState.pieceAmount)}</span>
                  {' '}(<span className="font-semibold">{formatPortionFraction(conversionState.pieceAmount)}</span> pieza)
                </p>
              </div>
            )}

            {conversionState.pieceSizeConversions.length > 0 && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3 mb-4">
                <p className="text-xs font-medium text-indigo-700 mb-2">Por tamaño</p>
                <div className="grid grid-cols-1 gap-2">
                  {conversionState.pieceSizeConversions.map((item) => (
                    <div key={item.sizeLabel} className="rounded-xl border border-indigo-200 bg-white/80 px-3 py-2">
                      <p className="text-[11px] text-indigo-700">{item.sizeLabel}: 1 = {formatQty(item.gramsPerPiece)}g</p>
                      <p className="text-sm text-indigo-900">
                        Cantidad: <span className="font-semibold">{formatQty(item.piecesForCurrent)}</span> ({formatPortionFraction(item.piecesForCurrent)})
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-xs font-medium text-emerald-700 mb-1">Porciones</p>
              {conversionState.portions !== null ? (
                <p className="text-sm text-emerald-900">
                  {formatQty(conversionState.portions)} ({formatPortionFraction(conversionState.portions)} porciones)
                </p>
              ) : (
                <p className="text-sm text-emerald-900">No hay grupo detectado.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {ingredientPopup && (() => {
        const { idx, ingId, ingText, options } = ingredientPopup
        const ing = comida.ingredientes[idx]
        if (!ing) return null
        const detectedGroup = detectIngredientGroup(ingId, ingText)
        const replacing = isIngredientReplacing(slotId, idx)
        const multiplier = getIngredientMultiplier(slotId, ingId, idx)
        const effectiveAmount = ing.cantidad * mealPortionFactor * multiplier
        const filtered = ingredientSearch.trim() === ''
          ? options
          : options.filter((o) => o.toLowerCase().includes(ingredientSearch.toLowerCase().trim()))

        return (
          <div
            className="fixed inset-0 z-[70] bg-gray-900/45 backdrop-blur-[1px] flex items-end sm:items-center justify-center px-4"
            onClick={(e) => { e.stopPropagation(); setIngredientPopup(null) }}
          >
            <div
              className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 shadow-xl max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs font-medium text-gray-500">Ingrediente</p>
                  <p className="text-base font-semibold text-gray-900 leading-tight">{ingId}</p>
                  <div className="mt-1.5">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${groupBadgeClasses(detectedGroup)}`}
                    >
                      {detectedGroup ? GROUP_LABELS[detectedGroup] : 'Sin grupo detectado'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {ing.cantidad > 0 ? `${formatQty(effectiveAmount)}${ing.unidad}` : '?'}{multiplier !== 1 && multiplier !== 0 ? ` · cantidad ajustada` : multiplier === 0 ? ` · no se usa` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIngredientPopup(null)}
                  className="px-3 py-2 min-h-9 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 active:bg-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  type="button"
                  aria-label="Reducir cantidad"
                  disabled={replacing || multiplier <= 0.25}
                  onClick={() => onSetIngredientMultiplier(slotId, ingId, idx, multiplier - 0.25)}
                  className="min-h-10 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 disabled:opacity-40 active:bg-gray-200"
                >
                  ➖ Menos
                </button>
                <button
                  type="button"
                  aria-label="Aumentar cantidad"
                  disabled={replacing || multiplier >= 3}
                  onClick={() => onSetIngredientMultiplier(slotId, ingId, idx, multiplier + 0.25)}
                  className="min-h-10 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 disabled:opacity-40 active:bg-gray-200"
                >
                  ➕ Más
                </button>
                <button
                  type="button"
                  aria-label={multiplier === 0 ? 'Restaurar ingrediente' : 'Quitar ingrediente'}
                  title={multiplier === 0 ? 'Restaurar' : 'Quitar'}
                  disabled={replacing}
                  onClick={() => onSetIngredientMultiplier(slotId, ingId, idx, multiplier === 0 ? 1 : 0)}
                  className={`min-h-10 rounded-xl text-xs font-semibold disabled:opacity-60 active:opacity-80 ${multiplier === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-700'}`}
                >
                  {multiplier === 0 ? '↺ Restaurar' : '✕ Quitar'}
                </button>
                <button
                  type="button"
                  aria-label="Ver conversiones del ingrediente"
                  title="Ver equivalencias"
                  disabled={replacing || effectiveAmount <= 0}
                  onClick={() => {
                    setIngredientPopup(null)
                    setConversionState(buildConversionModalState(ing, effectiveAmount))
                  }}
                  className="min-h-10 rounded-xl text-xs font-semibold bg-sky-50 text-sky-700 disabled:opacity-60 active:bg-sky-100"
                >
                  ≈ Convertir
                </button>
              </div>

              {options.length > 1 && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-medium text-gray-600 mb-2">
                    Cambiar ingrediente{replacing ? ' · guardando...' : ''}
                  </p>
                  <input
                    type="text"
                    placeholder="Buscar ingrediente..."
                    value={ingredientSearch}
                    onChange={(e) => setIngredientSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    autoComplete="off"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 mb-2"
                  />
                  <ul className="space-y-1 max-h-48 overflow-y-auto">
                    {filtered.map((optionId) => (
                      <li key={optionId}>
                        <button
                          type="button"
                          disabled={replacing}
                          onClick={() => {
                            onReplaceIngredient(idx, ingId, ingText, optionId)
                            setIngredientPopup(null)
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-sm disabled:opacity-60 transition-colors ${
                            optionId === ingId
                              ? 'bg-blue-100 text-blue-800 font-semibold'
                              : 'bg-gray-50 text-gray-800 font-medium active:bg-gray-100'
                          }`}
                        >
                          {optionId === ingId ? '✓ ' : ''}{optionId}
                        </button>
                      </li>
                    ))}
                    {filtered.length === 0 && (
                      <li className="text-sm text-gray-400 text-center py-3">Sin resultados</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {showSuggestedMeals && suggestedMeals.length > 0 && (
        <div
          className="fixed inset-0 z-[70] bg-gray-900/45 backdrop-blur-[1px] flex items-end sm:items-center justify-center px-4"
          onClick={() => setShowSuggestedMeals(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 shadow-xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-medium text-gray-500">Alternativas reales</p>
                <p className="text-lg font-semibold text-gray-900 leading-tight">{comida.nombre}</p>
                <p className="text-xs text-gray-500 mt-0.5">Opciones compatibles con el objetivo de grupos de esta comida</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSuggestedMeals(false)}
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
                  setShowSuggestedMeals(false)
                }}
                className="w-full mb-3 px-3 py-2.5 min-h-10 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-700 active:bg-emerald-100"
              >
                Volver a la comida del plan
              </button>
            )}

            <div className="space-y-3">
              {suggestedMeals.map((item) => {
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
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${suggestionScoreClasses(item.score)}`}>
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
                        {item.missingGroups.length > 0 ? `Falta: ${item.missingGroups.map((group) => GROUP_LABELS[group]).join(', ')}` : 'Sin faltantes'}
                        {item.extraGroups.length > 0 ? ` · Extra: ${item.extraGroups.map((group) => GROUP_LABELS[group]).join(', ')}` : ''}
                      </p>
                    )}

                    {onApplySuggestedMeal && (
                      <button
                        type="button"
                        onClick={() => {
                          onApplySuggestedMeal(item.meal)
                          setShowSuggestedMeals(false)
                        }}
                        className="w-full px-3 py-2.5 min-h-10 rounded-xl text-sm font-semibold bg-sky-600 text-white active:bg-sky-700"
                      >
                        Usar esta opcion
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
