import type { ConversionModalState } from './mealCardTypes'
import { UNIT_LABELS } from './mealCardConstants'
import { formatPortionFraction, formatQty } from './mealCardFormat'

type Props = {
  state: ConversionModalState
  onClose: () => void
}

export function MealCardConversionModal({ state, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[70] bg-gray-900/45 backdrop-blur-[1px] flex items-end sm:items-center justify-center px-4"
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-medium text-gray-500">Conversión</p>
            <p className="text-lg font-semibold text-gray-900 leading-tight">{state.ingredientId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 min-h-9 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 active:bg-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-3 mb-4">
          <p className="text-sm text-sky-900">
            Base:{' '}
            <span className="font-semibold">
              {formatQty(state.sourceAmount)} {UNIT_LABELS[state.sourceUnit] || state.sourceUnit}
            </span>
          </p>
          <p className="text-sm text-sky-900">
            Equivale a <span className="font-semibold">{formatQty(state.grams)} g</span>
          </p>
        </div>

        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Equivalencias</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {state.conversions.map((item) => (
              <div key={item.label} className="rounded-xl border border-gray-200 px-3 py-2 bg-gray-50">
                <p className="text-[11px] text-gray-500">{item.label}</p>
                <p className="text-sm font-semibold text-gray-900">{formatQty(item.value)}</p>
              </div>
            ))}
          </div>
        </div>

        {state.pieceGrams !== null && state.pieceAmount !== null && (
          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-3 mb-4">
            <p className="text-xs font-medium text-violet-700 mb-2">Pieza estándar</p>
            <p className="text-sm text-violet-900">
              1 pieza ≈ <span className="font-semibold">{formatQty(state.pieceGrams)} g</span>
            </p>
            <p className="text-sm text-violet-900">
              Tu cantidad = <span className="font-semibold">{formatQty(state.pieceAmount)}</span> (
              <span className="font-semibold">{formatPortionFraction(state.pieceAmount)}</span> pieza)
            </p>
          </div>
        )}

        {state.pieceSizeConversions.length > 0 && (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3 mb-4">
            <p className="text-xs font-medium text-indigo-700 mb-2">Por tamaño</p>
            <div className="grid grid-cols-1 gap-2">
              {state.pieceSizeConversions.map((item) => (
                <div key={item.sizeLabel} className="rounded-xl border border-indigo-200 bg-white/80 px-3 py-2">
                  <p className="text-[11px] text-indigo-700">
                    {item.sizeLabel}: 1 = {formatQty(item.gramsPerPiece)}g
                  </p>
                  <p className="text-sm text-indigo-900">
                    Cantidad: <span className="font-semibold">{formatQty(item.piecesForCurrent)}</span> (
                    {formatPortionFraction(item.piecesForCurrent)})
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
          <p className="text-xs font-medium text-emerald-700 mb-1">Porciones</p>
          {state.portions !== null ? (
            <p className="text-sm text-emerald-900">
              {formatQty(state.portions)} ({formatPortionFraction(state.portions)} porciones)
            </p>
          ) : (
            <p className="text-sm text-emerald-900">No hay grupo detectado.</p>
          )}
        </div>
      </div>
    </div>
  )
}
