import { useState } from 'react'
import '../../node_modules/@navi01/react/dist/tailwind.css'
import { Alert, Badge, Button, Card, Input, Progress } from '@navi01/react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { migrateStringArray } from '../hooks/localStorageMigrations'
import { useGroceryAdjustments } from '../hooks/useGroceryAdjustments'
import { generateGroceryListFromDb } from '../data/groceryEngineV2'
import { triggerHaptic } from '../utils/haptics'

export function GroceryList() {
  const [checked, setChecked] = useLocalStorage<string[]>(
    'superChecked',
    [],
    { migrate: (stored) => migrateStringArray(stored) }
  )
  const [selectedMealsBySlot] = useLocalStorage<Record<string, string>>(
    'selectedMealsBySlot',
    {},
    { migrate: (stored) => {
      if (typeof stored === 'object' && stored !== null && !Array.isArray(stored)) {
        return stored as Record<string, string>
      }
      return {}
    } }
  )

  const { getAdjustment, updateAdjustment, removeAdjustment, clearAllAdjustments } = useGroceryAdjustments()
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [onlyPending, setOnlyPending] = useLocalStorage<boolean>('superOnlyPending', false)

  const SUPER = generateGroceryListFromDb(selectedMealsBySlot)

  const toggleItem = (id: string) => {
    if (checked.includes(id)) {
      setChecked(checked.filter((item) => item !== id))
    } else {
      setChecked([...checked, id])
    }

    triggerHaptic('light')
  }

  const clearChecked = () => {
    if (confirm('¿Borrar todas las marcas de la lista del súper?')) {
      setChecked([])
    }
  }

  const startEditing = (productName: string, currentQty: string) => {
    setEditingItem(productName)
    setEditValue(currentQty)
  }

  const saveEdit = (productName: string) => {
    if (editValue.trim()) {
      updateAdjustment(productName, editValue.trim())
    }
    setEditingItem(null)
  }

  const incrementQty = (productName: string, currentQty: string) => {
    // Intenta extraer el número de la cantidad actual
    const match = currentQty.match(/(\d+(?:\.\d+)?)/)
    if (match) {
      const num = parseFloat(match[1]) || 0
      const unit = currentQty.replace(/\d+(?:\.\d+)?/, '').trim()
      const newQty = `${Math.ceil((num + 1) * 10) / 10}${unit}`
      updateAdjustment(productName, newQty)
    }
  }

  const decrementQty = (productName: string, currentQty: string) => {
    const match = currentQty.match(/(\d+(?:\.\d+)?)/)
    if (match) {
      const num = parseFloat(match[1]) || 0
      if (num > 0) {
        const unit = currentQty.replace(/\d+(?:\.\d+)?/, '').trim()
        const newQty = `${Math.max(0, Math.floor((num - 1) * 10) / 10)}${unit}`
        updateAdjustment(productName, newQty)
      }
    }
  }

  const getDisplayQty = (item: { name: string; qty: string }) => {
    const adjustment = getAdjustment(item.name)
    return adjustment ? adjustment.customQty : item.qty
  }

  const hasAdjustment = (productName: string) => {
    return !!getAdjustment(productName)
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
      {SUPER.length === 0 && (
        <Alert
          variant="warning"
          className="mb-6"
          title="Lista vacia"
          description="No hay ingredientes para mostrar. Revisa que el plan semanal tenga comidas asignadas."
        />
      )}

      {/* Barra de progreso */}
      <div className="mb-8">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">{checkedItems} de {totalItems} productos</span>
          <span className="font-semibold text-green-700">{progress}%</span>
        </div>
        <Progress value={progress} variant="success" size="sm" aria-label="Progreso lista del super" />
      </div>

      {SUPER.map((categoria, catIndex) => {
        const visibleItems = categoria.items.filter((_, i) => {
          const itemId = `${categoria.cat}-${catIndex}-${i}`
          return !onlyPending || !checked.includes(itemId)
        })

        if (visibleItems.length === 0) {
          return null
        }

        return (
        <div key={categoria.cat} className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" size="sm" className="uppercase tracking-widest">
              {categoria.cat}
            </Badge>
            <span className="text-xs text-gray-400">
              {categoria.items.filter((_, i) => checked.includes(`${categoria.cat}-${catIndex}-${i}`)).length}/{categoria.items.length}
            </span>
          </div>

          <div className="space-y-2">
            {visibleItems.map((item) => {
              const i = categoria.items.indexOf(item)
              const itemId = `${categoria.cat}-${catIndex}-${i}`
              const isChecked = checked.includes(itemId)
              const displayQty = getDisplayQty(item)
              const isAdjusted = hasAdjustment(item.name)
              const isEditing = editingItem === item.name

              return (
                <Card
                  variant="bordered"
                  key={i}
                  onClick={() => !isEditing && toggleItem(itemId)}
                  className={`flex items-start gap-3 p-4 rounded-2xl border transition-all active:scale-[0.985]
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
                    <p className={`text-sm font-semibold ${isChecked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {item.name}
                    </p>

                    {isEditing ? (
                      <div className="mt-2 flex gap-2">
                        <Input
                          onClick={(e) => e.stopPropagation()}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 text-sm font-mono"
                          autoFocus
                        />
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            saveEdit(item.name)
                          }}
                          size="sm"
                          variant="primary"
                        >
                          Guardar
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingItem(null)
                          }}
                          size="sm"
                          variant="secondary"
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span 
                          onClick={(e) => {
                            e.stopPropagation()
                            startEditing(item.name, displayQty)
                          }}
                          className={`text-sm px-2 py-1 font-mono cursor-pointer rounded hover:bg-gray-100 ${
                            isAdjusted ? 'text-blue-600 font-bold' : 'text-gray-600'
                          }`}
                        >
                          {displayQty}
                        </span>

                        <div className="flex gap-1">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              decrementQty(item.name, displayQty)
                              triggerHaptic('light')
                            }}
                            size="sm"
                            variant="secondary"
                            disabled={isChecked}
                          >
                            −
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              incrementQty(item.name, displayQty)
                              triggerHaptic('light')
                            }}
                            size="sm"
                            variant="secondary"
                            disabled={isChecked}
                          >
                            +
                          </Button>

                          {isAdjusted && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                removeAdjustment(item.name)
                                triggerHaptic('light')
                              }}
                              size="sm"
                              variant="outline"
                              title="Restaurar cantidad original"
                            >
                              ↺
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {item.note && (
                      <p className="text-xs text-gray-400 mt-1">{item.note}</p>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
        )
      })}

      <div className="fixed bottom-24 left-0 right-0 px-4 z-40">
        <div className="max-w-[430px] mx-auto bg-white/95 backdrop-blur border border-gray-200 rounded-2xl p-2 shadow-lg flex gap-2 justify-center">
          <Button
            onClick={() => setOnlyPending(!onlyPending)}
            variant={onlyPending ? 'primary' : 'outline'}
            size="sm"
          >
            {onlyPending ? 'Mostrando pendientes' : 'Solo pendientes'}
          </Button>
          {checkedItems > 0 && (
            <Button
              onClick={clearChecked}
              variant="destructive"
              size="sm"
            >
              Limpiar
            </Button>
          )}
          <Button
            onClick={() => {
              if (confirm('¿Restaurar todas las cantidades a valores originales?')) {
                clearAllAdjustments()
                triggerHaptic('warning')
              }
            }}
            variant="outline"
            size="sm"
          >
            Restaurar
          </Button>
        </div>
      </div>
    </div>
  )
}