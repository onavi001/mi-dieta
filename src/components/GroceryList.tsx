import { useLocalStorage } from '../hooks/useLocalStorage'
import { SUPER } from '../data/groceries'

export function GroceryList() {
  const [checked, setChecked] = useLocalStorage<string[]>('superChecked', [])

  const toggleItem = (id: string) => {
    if (checked.includes(id)) {
      setChecked(checked.filter((item) => item !== id))
    } else {
      setChecked([...checked, id])
    }
  }

  const clearChecked = () => {
    if (confirm('¿Borrar todas las marcas de la lista del súper?')) {
      setChecked([])
    }
  }

  const totalItems = SUPER.reduce((sum, cat) => sum + cat.items.length, 0)
  const checkedItems = SUPER.reduce((sum, cat, catIndex) => {
    return sum + cat.items.filter((_, i) => 
      checked.includes(`${cat.cat}-${catIndex}-${i}`)
    ).length
  }, 0)

  const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0

  return (
    <div className="px-4 py-6">
      {/* Barra de progreso */}
      <div className="mb-8">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">{checkedItems} de {totalItems} productos</span>
          <span className="font-semibold text-green-700">{progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-600 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {SUPER.map((categoria, catIndex) => (
        <div key={categoria.cat} className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="uppercase text-xs font-semibold tracking-widest text-gray-500">
              {categoria.cat}
            </h3>
            <span className="text-xs text-gray-400">
              {categoria.items.filter((_, i) => checked.includes(`${categoria.cat}-${catIndex}-${i}`)).length}/{categoria.items.length}
            </span>
          </div>

          <div className="space-y-2">
            {categoria.items.map((item, i) => {
              const itemId = `${categoria.cat}-${catIndex}-${i}`
              const isChecked = checked.includes(itemId)

              return (
                <div
                  key={i}
                  onClick={() => toggleItem(itemId)}
                  className={`flex items-start gap-4 p-4 rounded-2xl border transition-all active:scale-[0.985]
                    ${isChecked 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                >
                  <div className={`w-6 h-6 rounded-xl border-2 flex-shrink-0 mt-0.5 flex items-center justify-center
                    ${isChecked ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}>
                    {isChecked && <span className="text-white text-lg leading-none">✓</span>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${isChecked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {item.name}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">{item.qty}</p>
                    {item.note && (
                      <p className="text-xs text-gray-400 mt-1">{item.note}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {checkedItems > 0 && (
        <button
          onClick={clearChecked}
          className="mx-auto block mt-8 text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Limpiar toda la lista
        </button>
      )}
    </div>
  )
}