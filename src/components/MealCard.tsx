import { useRef, useState } from 'react'
import type { TouchEvent } from 'react'
import type { Comida, Persona } from '../data/types'

interface MealCardProps {
  comida: Comida
  persona: Persona
  hour: string
  swipeTrigger: number
  isExpanded: boolean
  onToggle: () => void
  isCompleted: boolean
  onToggleCompleted: () => void
  onSwapMeal: () => void
  onQuickComplete: () => void
  onQuickSwap: () => void
}

export function MealCard({
  comida,
  persona,
  hour,
  swipeTrigger,
  isExpanded,
  onToggle,
  isCompleted,
  onToggleCompleted,
  onSwapMeal,
  onQuickComplete,
  onQuickSwap,
}: MealCardProps) {
  const showIvan = persona !== 'paulina'
  const showPaulina = persona !== 'ivan'
  const [swipeOffset, setSwipeOffset] = useState(0)
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

    if (swipeOffset <= -swipeTrigger) {
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
      <div className="absolute inset-0 bg-blue-500/90 text-white text-xs font-semibold flex items-center justify-end pr-4">
        Intercambiar
      </div>
      <div
        onClick={onCardClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={`bg-white border border-gray-200 rounded-2xl p-4 active:scale-[0.985] transition-all cursor-pointer relative ${
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
        className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
          isCompleted ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 text-gray-400'
        }`}
      >
        {isCompleted && '✓'}
      </button>

      {/* Header de la comida */}
      <div className="flex items-start justify-between gap-3 pr-8">
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
        </div>
        <span className={`text-2xl text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </div>

      {/* Contenido expandible */}
      {isExpanded && (
        <div className="mt-5 pt-5 border-t border-gray-100">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSwapMeal()
            }}
            className="mb-4 px-3 py-2 rounded-xl text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
          >
            Intercambiar comida
          </button>

          {/* Ingredientes */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {showIvan && (
              <div className={`p-4 rounded-2xl ${persona === 'ivan' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                <p className="text-xs font-medium text-green-600 mb-2">IVAN</p>
                <ul className="text-sm space-y-1">
                  {comida.ingredientes.map((ing, idx) => (
                    <li key={idx} className="text-gray-800">
                      {ing.cantidadIvan > 0 ? `${ing.cantidadIvan}${ing.unidad} ${ing.id}` : '(no)'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {showPaulina && (
              <div className={`p-4 rounded-2xl ${persona === 'paulina' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                <p className="text-xs font-medium text-green-600 mb-2">PAULINA</p>
                <ul className="text-sm space-y-1">
                  {comida.ingredientes.map((ing, idx) => (
                    <li key={idx} className="text-gray-800">
                      {ing.cantidadPaulina > 0 ? `${ing.cantidadPaulina}${ing.unidad} ${ing.id}` : '(no)'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

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
    </div>
  )
}