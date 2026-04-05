import type { Comida, Persona } from '../data/types'

interface MealCardProps {
  comida: Comida
  persona: Persona
  isExpanded: boolean
  onToggle: () => void
  isCompleted: boolean
  onToggleCompleted: () => void
}

export function MealCard({ comida, persona, isExpanded, onToggle, isCompleted, onToggleCompleted }: MealCardProps) {
  const showOscar = persona !== 'paulina'
  const showPaulina = persona !== 'oscar'

  return (
    <div
      onClick={onToggle}
      className={`bg-white border border-gray-200 rounded-2xl p-4 mb-3 active:scale-[0.985] transition-all cursor-pointer relative ${
        isCompleted ? 'opacity-75' : ''
      }`}
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
          {/* Porciones */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {showOscar && (
              <div className={`p-4 rounded-2xl ${persona === 'oscar' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                <p className="text-xs font-medium text-green-600 mb-1">OSCAR</p>
                <p className="text-sm text-gray-800">{comida.oscar}</p>
              </div>
            )}
            {showPaulina && (
              <div className={`p-4 rounded-2xl ${persona === 'paulina' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                <p className="text-xs font-medium text-green-600 mb-1">PAULINA</p>
                <p className="text-sm text-gray-800">{comida.paulina}</p>
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
  )
}