import { useState } from 'react'
import { DAYS } from '../data/weeklySlots'
import { MealCard } from './MealCard'
import type { Persona } from '../data/types'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { buildWeeklyMeals, nextMealForSlot } from '../data/mealEngine'
import { migrateStringArray, migrateStringMap } from '../hooks/localStorageMigrations'
import { triggerHaptic } from '../utils/haptics'

const SWIPE_TRIGGER = 72

interface WeeklyDietProps {
  persona: Persona
  focusMode: 'today' | 'week'
}

interface LastAction {
  cardId: string
  previousState: boolean
}

export function WeeklyDiet({ persona, focusMode }: WeeklyDietProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [selectedMealsBySlot, setSelectedMealsBySlot] = useLocalStorage<Record<string, string>>(
    'selectedMealsBySlot',
    {},
    { migrate: (stored) => migrateStringMap(stored) }
  )
  const [completedMeals, setCompletedMeals] = useLocalStorage<string[]>(
    'completedMeals',
    [],
    { migrate: (stored) => migrateStringArray(stored) }
  )
  const [completedDays, setCompletedDays] = useLocalStorage<string[]>(
    'completedDays',
    [],
    { migrate: (stored) => migrateStringArray(stored) }
  )
  const [lastAction, setLastAction] = useState<LastAction | null>(null)

  const meals = buildWeeklyMeals(selectedMealsBySlot)

  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long' }).replace(/^\w/, c => c.toUpperCase())

  const toggleCard = (id: string) => {
    const newSet = new Set(expandedCards)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedCards(newSet)
  }

  const toggleMealCompleted = (cardId: string) => {
    const wasCompleted = completedMeals.includes(cardId)

    if (wasCompleted) {
      setCompletedMeals(completedMeals.filter((id) => id !== cardId))
    } else {
      setCompletedMeals([...completedMeals, cardId])
    }

    triggerHaptic('success')
    setLastAction({ cardId, previousState: wasCompleted })
  }

  const toggleDayCompleted = (day: string) => {
    if (completedDays.includes(day)) {
      setCompletedDays(completedDays.filter((d) => d !== day))
    } else {
      setCompletedDays([...completedDays, day])
    }

    triggerHaptic('light')
  }

  const swapMeal = (slotId: string, tipo: (typeof meals)[number]['tipo'], currentMealId: string) => {
    const nextMealId = nextMealForSlot(tipo, currentMealId)
    setSelectedMealsBySlot({
      ...selectedMealsBySlot,
      [slotId]: nextMealId,
    })

    triggerHaptic('warning')
  }

  const displayedDays = focusMode === 'today' ? DAYS.filter(d => d === today) : DAYS
  const todayMeals = meals.filter((meal) => meal.day === today)
  const completedToday = todayMeals.filter((meal) => completedMeals.includes(meal.slotId)).length

  const undoLastMealToggle = () => {
    if (!lastAction) return

    if (lastAction.previousState) {
      if (!completedMeals.includes(lastAction.cardId)) {
        setCompletedMeals([...completedMeals, lastAction.cardId])
      }
    } else {
      setCompletedMeals(completedMeals.filter((id) => id !== lastAction.cardId))
    }

    setLastAction(null)
  }

  return (
    <div className="px-4 py-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-800">Progreso de hoy</p>
          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1">
            {completedToday}/{todayMeals.length || 0}
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${todayMeals.length ? (completedToday / todayMeals.length) * 100 : 0}%` }}
          />
        </div>
        <p className="text-xs text-gray-500">
          Desliza derecha para completar y izquierda para intercambiar.
        </p>
      </div>

      {displayedDays.map((day) => {
        const dayMeals = meals.filter((meal) => meal.day === day)
        const isDayCompleted = completedDays.includes(day)

        return (
          <div key={day} className="mb-10">
            <div className="flex items-center justify-between mb-4 pl-1">
              <div className="uppercase text-xs font-semibold tracking-widest text-gray-500">
                {day}
              </div>
              <button
                onClick={() => toggleDayCompleted(day)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  isDayCompleted ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {isDayCompleted ? '✓ Completado' : 'Marcar completo'}
              </button>
            </div>
            <div className="space-y-3">
              {dayMeals.map((comida) => {
                const cardId = comida.slotId
                return (
                  <MealCard
                    key={cardId}
                    comida={comida}
                    hour={comida.hour}
                      swipeTrigger={SWIPE_TRIGGER}
                    persona={persona}
                    isExpanded={expandedCards.has(cardId)}
                    onToggle={() => toggleCard(cardId)}
                    isCompleted={completedMeals.includes(cardId)}
                    onToggleCompleted={() => toggleMealCompleted(cardId)}
                    onSwapMeal={() => swapMeal(comida.slotId, comida.tipo, comida.id)}
                    onQuickComplete={() => toggleMealCompleted(cardId)}
                    onQuickSwap={() => swapMeal(comida.slotId, comida.tipo, comida.id)}
                  />
                )
              })}
            </div>
          </div>
        )
      })}

      {lastAction && (
        <div className="fixed bottom-24 left-0 right-0 px-4 z-40">
          <div className="max-w-[430px] mx-auto bg-gray-900 text-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-lg">
            <span className="text-sm">Cambio aplicado</span>
            <button
              onClick={undoLastMealToggle}
              className="text-sm font-semibold text-emerald-300"
            >
              Deshacer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}