import { useEffect, useRef, useState } from 'react'
import '../../../node_modules/@navi01/react/dist/tailwind.css'
import { Alert, Badge, Button, Card, Input, Progress } from '@navi01/react'
import type { Comida } from '@/types/domain'
import { useGroceryAdjustments } from '@/hooks/useGroceryAdjustments'
import { triggerHaptic } from '@/utils/haptics'
import { useNutritionApi } from '@/hooks/useNutritionApi'
import type { WeekState, WeekStatePatch } from '@/hooks/useDietApi'
import { useGroceryFilteredData } from './hooks/useGroceryFilteredData'

interface GroceryListProps {
  accessToken?: string
  meals: Comida[]
  groceryState: {
    checked: string[]
    onlyPending: boolean
  }
  weekState?: WeekState | null
  onChangeGroceryState: (nextState: { checked: string[]; onlyPending: boolean }) => Promise<void>
  onSyncWeekState?: (patch: WeekStatePatch) => Promise<boolean>
  isSavingState?: boolean
}

export function GroceryList({ accessToken, meals, groceryState, weekState, onChangeGroceryState, onSyncWeekState, isSavingState = false }: GroceryListProps) {
  const { adjustments, getAdjustment, updateAdjustment, removeAdjustment, clearAllAdjustments, restoreAdjustments } = useGroceryAdjustments(
    (next) => void Promise.resolve(onSyncWeekState?.({ groceryAdjustments: next })).then((saved) => {
      if (saved) {
        setSaveError('')
        setSaveFeedback('Lista guardada')
        if (saveFeedbackTimeoutRef.current) {
          clearTimeout(saveFeedbackTimeoutRef.current)
        }
        saveFeedbackTimeoutRef.current = setTimeout(() => setSaveFeedback(''), 1800)
      } else if (onSyncWeekState) {
        setSaveFeedback('')
        setSaveError('No se pudo guardar la lista')
        if (saveErrorTimeoutRef.current) {
          clearTimeout(saveErrorTimeoutRef.current)
        }
        saveErrorTimeoutRef.current = setTimeout(() => setSaveError(''), 2400)
      }
    })
  )
  const { summary, loadSummary } = useNutritionApi(accessToken)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showExcludedIngredients, setShowExcludedIngredients] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState('')
  const [saveError, setSaveError] = useState('')
  const [isGeneratingList, setIsGeneratingList] = useState(false)
  const [isPersistingState, setIsPersistingState] = useState(false)
  const saveFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hydrate adjustments from DB weekState when the plan loads.
  const weekStateRef = useRef<WeekState | null | undefined>(undefined)
  useEffect(() => {
    if (!weekState) return
    if (weekStateRef.current === weekState) return
    weekStateRef.current = weekState
    restoreAdjustments(weekState.groceryAdjustments)
  }, [weekState, restoreAdjustments])

  useEffect(() => {
    if (!accessToken) return
    void loadSummary()
  }, [accessToken, loadSummary])

  const { filteredSomeIngredient, filteredSummary, categories: SUPER, grocerySourceSummary } = useGroceryFilteredData(
    meals,
    summary
  )
  const checked = groceryState.checked
  const onlyPending = groceryState.onlyPending

  const persistGroceryState = async (nextState: { checked: string[]; onlyPending: boolean }) => {
    setIsPersistingState(true)
    try {
      await onChangeGroceryState(nextState)
    } finally {
      setIsPersistingState(false)
    }
  }

  const toggleItem = (id: string) => {
    const nextChecked = checked.includes(id)
      ? checked.filter((item) => item !== id)
      : [...checked, id]

    void persistGroceryState({
      ...groceryState,
      checked: nextChecked,
    })

    triggerHaptic('light')
  }

  const clearChecked = () => {
    if (confirm('¿Borrar todas las marcas de la lista del súper?')) {
      void persistGroceryState({
        ...groceryState,
        checked: [],
      })
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

  const handleGenerateWeeklyList = async () => {
    if (meals.length === 0) {
      setSaveFeedback('')
      setSaveError('No hay platillos generados para crear la lista')
      if (saveErrorTimeoutRef.current) clearTimeout(saveErrorTimeoutRef.current)
      saveErrorTimeoutRef.current = setTimeout(() => setSaveError(''), 2400)
      return
    }

    if ((checked.length > 0 || adjustments.length > 0) && !confirm('Esto regenerara la lista del super y limpiara marcas y ajustes manuales. ¿Deseas continuar?')) {
      return
    }

    setIsGeneratingList(true)
    try {
      clearAllAdjustments()
      await persistGroceryState({
        ...groceryState,
        checked: [],
      })
      setSaveError('')
      setSaveFeedback(`Lista semanal generada con ${meals.length} platillos`) 
      if (saveFeedbackTimeoutRef.current) clearTimeout(saveFeedbackTimeoutRef.current)
      saveFeedbackTimeoutRef.current = setTimeout(() => setSaveFeedback(''), 2000)
      triggerHaptic('success')
    } finally {
      setIsGeneratingList(false)
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-900">Lista del super basada en tu semana</p>
            <p className="mt-1 text-xs text-emerald-800">
              {grocerySourceSummary.mealCount} platillos creados y {grocerySourceSummary.uniqueIngredientCount} ingredientes unicos listos para agrupar.
            </p>
          </div>

          <Button
            onClick={() => void handleGenerateWeeklyList()}
            variant="primary"
            size="sm"
            disabled={isGeneratingList || meals.length === 0}
          >
            {isGeneratingList ? 'Generando lista...' : 'Generar lista semanal'}
          </Button>
        </div>
      </div>

      {(isPersistingState || isSavingState) && (
        <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-semibold text-sky-800">
          Guardando cambios de la lista...
        </div>
      )}

      {filteredSomeIngredient && (
        <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-sm font-semibold text-sky-900">Lista filtrada por perfil nutricional</p>
          <p className="mt-1 text-xs text-sky-800">
            Se ocultaron {filteredSummary.removedCount} ingrediente(s) por tu perfil.
          </p>
          {filteredSummary.restrictionLabels.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {filteredSummary.restrictionLabels.map((label) => (
                <span key={label} className="rounded-full border border-sky-200 bg-white px-2 py-1 text-[10px] font-semibold text-sky-700">
                  {label}
                </span>
              ))}
            </div>
          )}
          {filteredSummary.removedIngredients.length > 0 && (
            <div className="mt-2">
              <p className="text-[11px] text-sky-800">
                Ejemplos ocultos: {filteredSummary.removedIngredients.slice(0, 4).join(', ')}
                {filteredSummary.removedIngredients.length > 4 ? '...' : ''}
              </p>
              <button
                type="button"
                onClick={() => setShowExcludedIngredients((prev) => !prev)}
                className="mt-2 rounded-xl border border-sky-200 bg-white px-3 py-2 text-[11px] font-semibold text-sky-700 active:bg-sky-100"
              >
                {showExcludedIngredients ? 'Ocultar ingredientes excluidos' : 'Ver ingredientes excluidos'}
              </button>
              {showExcludedIngredients && (
                <div className="mt-2 rounded-xl border border-sky-200 bg-white p-3">
                  <p className="text-[11px] font-semibold text-sky-900">Ingredientes excluidos</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {filteredSummary.removedIngredients.map((ingredient) => (
                      <span
                        key={ingredient}
                        className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-medium text-sky-800"
                      >
                        {ingredient}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {SUPER.length === 0 && (
        <Alert
          variant="warning"
          className="mb-6"
          title="Lista vacia"
          description="No hay ingredientes para mostrar. Revisa que el plan semanal tenga comidas asignadas."
        />
      )}

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
                    <div className={`w-6 h-6 rounded-xl border-2 shrink-0 mt-0.5 flex items-center justify-center
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
        <div className="max-w-107.5 mx-auto bg-white/95 backdrop-blur border border-gray-200 rounded-2xl p-2 shadow-lg flex gap-2 justify-center">
          <Button
            onClick={() => {
              void onChangeGroceryState({
                ...groceryState,
                onlyPending: !onlyPending,
              })
            }}
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

      {saveFeedback && (
        <div className="fixed bottom-40 left-0 right-0 px-4 z-40 pointer-events-none">
          <div className="max-w-107.5 mx-auto rounded-2xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg">
            {saveFeedback}
          </div>
        </div>
      )}

      {saveError && !saveFeedback && (
        <div className="fixed bottom-40 left-0 right-0 px-4 z-40 pointer-events-none">
          <div className="max-w-107.5 mx-auto rounded-2xl bg-rose-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg">
            {saveError}
          </div>
        </div>
      )}
    </div>
  )
}
