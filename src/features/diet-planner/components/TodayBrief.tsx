import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GroupStatus } from '../weeklyDietTypes'
import {
  bumpConsistencyStreakForGoodCheckin,
  localDateKey,
  readConsistencyStreak,
  readDailyCheckin,
  writeDailyCheckin,
  type DailyCheckinMood,
} from '@/utils/dailyEngagement'

export type TodayBriefMeal = {
  slotId: string
  nombre: string
  tipo: string
  hour: string
  completed: boolean
}

export type TodayBriefImpactRow = {
  label: string
  status: GroupStatus
}

type Props = {
  meals: TodayBriefMeal[]
  impactRows: TodayBriefImpactRow[]
  planPortionsTotal: number
  adjustedPortionsToday: number
  onScrollToMeal: (slotId: string) => void
}

function parseHourToMinutes(hour: string): number {
  const m = hour.match(/(\d{1,2}):(\d{2})/)
  if (!m) return 24 * 60
  return Number(m[1]) * 60 + Number(m[2])
}

function rescueCopy(rows: TodayBriefImpactRow[], mealProgress: { done: number; total: number }): string | null {
  const alerts = rows.filter((r) => r.status === 'alert')
  if (alerts.length > 0) {
    return `Rescate: hoy vas alto en ${alerts[0].label}. En lo que queda del día, prioriza porciones del plan y evita sumar de ese grupo.`
  }
  const warns = rows.filter((r) => r.status === 'warn')
  if (warns.length >= 3) {
    return 'Rescate: varios grupos van al límite. Si puedes, sigue las comidas del plan sin extras.'
  }
  const hour = new Date().getHours()
  const ratio = mealProgress.total > 0 ? mealProgress.done / mealProgress.total : 0
  if (hour >= 14 && ratio < 0.5 && mealProgress.total > 0) {
    return 'Rescate: aún puedes cerrar el día bien. Marca lo que ya comiste y enfócate en la siguiente comida del plan.'
  }
  return null
}

export function TodayBrief({
  meals,
  impactRows,
  planPortionsTotal,
  adjustedPortionsToday,
  onScrollToMeal,
}: Props) {
  const [checkin, setCheckin] = useState<DailyCheckinMood | null>(null)
  const [streak, setStreak] = useState(0)

  const dateKey = useMemo(() => localDateKey(), [])

  useEffect(() => {
    setCheckin(readDailyCheckin(dateKey))
    setStreak(readConsistencyStreak().count)
  }, [dateKey])

  const sortedMeals = useMemo(() => {
    return [...meals].sort((a, b) => parseHourToMinutes(a.hour) - parseHourToMinutes(b.hour))
  }, [meals])

  const nextMeal = useMemo(() => {
    const incomplete = sortedMeals.find((m) => !m.completed)
    if (incomplete) return incomplete
    return sortedMeals[0] || null
  }, [sortedMeals])

  const rescue = useMemo(() => {
    return rescueCopy(impactRows, {
      done: meals.filter((m) => m.completed).length,
      total: meals.length,
    })
  }, [impactRows, meals])

  const portionDelta = useMemo(() => {
    if (!planPortionsTotal) return null
    const raw = adjustedPortionsToday - planPortionsTotal
    return Number(raw.toFixed(2))
  }, [adjustedPortionsToday, planPortionsTotal])

  const handleCheckin = useCallback(
    (mood: DailyCheckinMood) => {
      writeDailyCheckin(dateKey, mood)
      setCheckin(mood)
      if (mood === 'good') {
        const next = bumpConsistencyStreakForGoodCheckin(dateKey)
        setStreak(next)
      }
    },
    [dateKey]
  )

  if (meals.length === 0) return null

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 mb-5 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">Hoy en 30 segundos</p>
          <p className="text-sm font-bold text-gray-900 leading-tight mt-0.5">Tu día, en claro</p>
        </div>
        {streak > 0 && (
          <span className="shrink-0 text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-200 rounded-full px-2.5 py-1">
            Racha {streak}d
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl bg-white/90 border border-emerald-100 px-2.5 py-2">
          <p className="text-[10px] text-gray-500">Porciones hoy</p>
          <p className="text-xs font-bold text-gray-900">
            {adjustedPortionsToday.toFixed(1)}
            <span className="text-[10px] font-medium text-gray-500"> / {planPortionsTotal.toFixed(1)} obj.</span>
          </p>
          {portionDelta !== null && (
            <p className={`text-[10px] mt-0.5 ${portionDelta > 0.5 ? 'text-amber-700' : portionDelta < -0.5 ? 'text-sky-700' : 'text-emerald-700'}`}>
              {portionDelta > 0.5 ? 'Sobre el plan' : portionDelta < -0.5 ? 'Bajo el plan' : 'En rango'}
            </p>
          )}
        </div>
        <div className="rounded-xl bg-white/90 border border-emerald-100 px-2.5 py-2">
          <p className="text-[10px] text-gray-500">Comidas</p>
          <p className="text-xs font-bold text-gray-900">
            {meals.filter((m) => m.completed).length}/{meals.length}
            <span className="text-[10px] font-medium text-gray-500"> hechas</span>
          </p>
        </div>
      </div>

      {nextMeal && (
        <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 mb-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase">Siguiente foco</p>
          <p className="text-sm font-semibold text-gray-900 leading-snug">{nextMeal.nombre}</p>
          <p className="text-[11px] text-gray-600 mt-0.5">
            {nextMeal.hour} · {nextMeal.tipo}
            {nextMeal.completed ? ' · Listo' : ' · Pendiente'}
          </p>
          <button
            type="button"
            onClick={() => onScrollToMeal(nextMeal.slotId)}
            className="mt-2 w-full min-h-9 rounded-xl bg-emerald-600 text-white text-[11px] font-semibold active:bg-emerald-700"
          >
            Ir a esta comida
          </button>
        </div>
      )}

      {rescue && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 mb-3">
          <p className="text-[11px] text-amber-900 leading-snug">{rescue}</p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
        <p className="text-[10px] font-semibold text-gray-600 uppercase mb-2">Check-in de hoy</p>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => handleCheckin('good')}
            className={`min-h-10 rounded-lg text-[10px] font-semibold border ${
              checkin === 'good' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-800 border-gray-300 active:bg-gray-100'
            }`}
          >
            Voy bien
          </button>
          <button
            type="button"
            onClick={() => handleCheckin('slip')}
            className={`min-h-10 rounded-lg text-[10px] font-semibold border ${
              checkin === 'slip' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-800 border-gray-300 active:bg-gray-100'
            }`}
          >
            Me salí
          </button>
          <button
            type="button"
            onClick={() => handleCheckin('help')}
            className={`min-h-10 rounded-lg text-[10px] font-semibold border ${
              checkin === 'help' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-gray-800 border-gray-300 active:bg-gray-100'
            }`}
          >
            Ayuda
          </button>
        </div>
        {checkin === 'help' && (
          <p className="text-[10px] text-gray-600 mt-2 leading-snug">
            Abajo tienes tu plan del día. Si un grupo va alto, usa “Ajustar comidas y medidas al objetivo” en impacto diario.
          </p>
        )}
        {checkin === 'slip' && (
          <p className="text-[10px] text-gray-600 mt-2 leading-snug">
            Sin culpa: sigue con la siguiente comida del plan. Un día no define tu semana.
          </p>
        )}
      </div>
    </div>
  )
}
