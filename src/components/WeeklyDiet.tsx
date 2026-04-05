import { useState } from 'react'
import { DAYS, MEALS } from '../data/meals'
import { MealCard } from './MealCard'
import type { Persona } from '../data/types'
import { useLocalStorage } from '../hooks/useLocalStorage'

interface WeeklyDietProps {
  persona: Persona
}

export function WeeklyDiet({ persona }: WeeklyDietProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [showOnlyToday, setShowOnlyToday] = useLocalStorage('showOnlyToday', false)
  const [completedMeals, setCompletedMeals] = useLocalStorage<Set<string>>('completedMeals', new Set())
  const [completedDays, setCompletedDays] = useLocalStorage<Set<string>>('completedDays', new Set())

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
    const newSet = new Set(completedMeals)
    if (newSet.has(cardId)) {
      newSet.delete(cardId)
    } else {
      newSet.add(cardId)
    }
    setCompletedMeals(newSet)
  }

  const toggleDayCompleted = (day: string) => {
    const newSet = new Set(completedDays)
    if (newSet.has(day)) {
      newSet.delete(day)
    } else {
      newSet.add(day)
    }
    setCompletedDays(newSet)
  }

  const displayedDays = showOnlyToday ? DAYS.filter(d => d === today) : DAYS

  return (
    <div className="px-4 py-6">
      {/* Toggle para mostrar solo hoy */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setShowOnlyToday(!showOnlyToday)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            showOnlyToday ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          {showOnlyToday ? 'Mostrar toda la semana' : 'Mostrar solo hoy'}
        </button>
        {showOnlyToday && (
          <span className="text-sm text-gray-500">Hoy: {today}</span>
        )}
      </div>

      {displayedDays.map((day) => {
        const dayMeals = MEALS.filter((meal) => meal.day === day)
        const isDayCompleted = completedDays.has(day)

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
              {dayMeals.map((comida, index) => {
                const cardId = `${day}-${index}`
                return (
                  <MealCard
                    key={cardId}
                    comida={comida}
                    persona={persona}
                    isExpanded={expandedCards.has(cardId)}
                    onToggle={() => toggleCard(cardId)}
                    isCompleted={completedMeals.has(cardId)}
                    onToggleCompleted={() => toggleMealCompleted(cardId)}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}