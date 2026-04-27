import { GROUP_LABELS } from '@/data/reference/ingredientReference'
import {
  detectIngredientGroup,
  gramsPerPortionForIngredient,
  ingredientToEstimatedGrams,
} from '@/data/reference/ingredientConversionUtils'
import type { Comida } from '@/types/domain'
import { buildConversionModalState } from './mealCardConversion'
import type { ConversionModalState } from './mealCardTypes'
import { formatQty } from './mealCardFormat'
import { groupBadgeClasses } from './mealCardStyles'

export type IngredientPopupState = {
  idx: number
  ingId: string
  ingText: string
  options: string[]
}

type Props = {
  popup: IngredientPopupState
  comida: Comida
  slotId: string
  mealPortionFactor: number
  ingredientSearch: string
  onIngredientSearchChange: (value: string) => void
  onClose: () => void
  getIngredientMultiplier: (slotId: string, ingredientId: string, index: number) => number
  isIngredientReplacing: (slotId: string, index: number) => boolean
  onSetIngredientMultiplier: (slotId: string, ingredientId: string, index: number, next: number) => void
  onReplaceIngredient: (index: number, currentId: string, ingredientText: string, nextId: string) => void
  onOpenConversion: (state: ConversionModalState) => void
}

export function MealCardIngredientPopup({
  popup,
  comida,
  slotId,
  mealPortionFactor,
  ingredientSearch,
  onIngredientSearchChange,
  onClose,
  getIngredientMultiplier,
  isIngredientReplacing,
  onSetIngredientMultiplier,
  onReplaceIngredient,
  onOpenConversion,
}: Props) {
  const { idx, ingId, ingText, options } = popup
  const ing = comida.ingredientes[idx]
  if (!ing) return null

  const detectedGroup = detectIngredientGroup(ingId, ingText)
  const replacing = isIngredientReplacing(slotId, idx)
  const multiplier = getIngredientMultiplier(slotId, ingId, idx)
  const effectiveAmount = ing.cantidad * mealPortionFactor * multiplier
  const currentEquivalentPortion = detectedGroup
    ? gramsPerPortionForIngredient(detectedGroup, ing.id, `${ing.id} ${ing.presentacion || ''}`)
    : null
  const currentEffectiveGrams = detectedGroup
    ? ingredientToEstimatedGrams(ing, detectedGroup) * mealPortionFactor * multiplier
    : null
  const filtered =
    ingredientSearch.trim() === ''
      ? options
      : options.filter((o) => o.toLowerCase().includes(ingredientSearch.toLowerCase().trim()))

  return (
    <div
      className="fixed inset-0 z-[70] bg-gray-900/45 backdrop-blur-[1px] flex items-end sm:items-center justify-center px-4"
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
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
              {ing.cantidad > 0 ? `${formatQty(effectiveAmount)}${ing.unidad}` : '?'}
              {multiplier !== 1 && multiplier !== 0
                ? ` · cantidad ajustada`
                : multiplier === 0
                  ? ` · no se usa`
                  : ''}
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
              const next = buildConversionModalState(ing, effectiveAmount)
              if (next) {
                onClose()
                onOpenConversion(next)
              }
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
              onChange={(e) => onIngredientSearchChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoComplete="off"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 mb-2"
            />
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {filtered.map((optionId) => (
                <li key={optionId}>
                  {(() => {
                    const optionGroup = detectIngredientGroup(optionId, optionId)
                    let nextQtyHint: string | null = null

                    if (
                      detectedGroup &&
                      optionGroup === detectedGroup &&
                      currentEquivalentPortion &&
                      currentEffectiveGrams &&
                      currentEquivalentPortion > 0 &&
                      currentEffectiveGrams > 0
                    ) {
                      const nextEquivalentPortion = gramsPerPortionForIngredient(detectedGroup, optionId, optionId)
                      if (nextEquivalentPortion > 0) {
                        const currentPortions = currentEffectiveGrams / currentEquivalentPortion
                        const nextGrams = currentPortions * nextEquivalentPortion
                        if (Number.isFinite(nextGrams) && nextGrams > 0) {
                          nextQtyHint = `≈ ${Math.round(nextGrams)}g`
                        }
                      }
                    }

                    return (
                  <button
                    type="button"
                    disabled={replacing}
                    onClick={() => {
                      onReplaceIngredient(idx, ingId, ingText, optionId)
                      onClose()
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm disabled:opacity-60 transition-colors ${
                      optionId === ingId
                        ? 'bg-blue-100 text-blue-800 font-semibold'
                        : 'bg-gray-50 text-gray-800 font-medium active:bg-gray-100'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        {optionId === ingId ? '✓ ' : ''}
                        {optionId}
                      </span>
                      {nextQtyHint && (
                        <span className="shrink-0 text-[10px] font-semibold text-gray-500">
                          {nextQtyHint}
                        </span>
                      )}
                    </span>
                  </button>
                    )
                  })()}
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
}
