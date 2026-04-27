import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GroupStatus } from '../weeklyDietTypes'
import {
  bumpConsistencyStreakForGoodCheckin,
  localDateKey,
  readConsistencyStreak,
  readDailyCheckin,
  writeDailyCheckin,
  type DailyCheckinMood,
} from '@/utils/dailyEngagement'
import type { DailyEngagement } from '@/hooks/useDietApi'

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

export type TodayBriefImpactDetail = {
  label: string
  targetGrams: number
  adjustedGrams: number
  statusLabel: string
  status: GroupStatus
}

type Props = {
  meals: TodayBriefMeal[]
  impactRows: TodayBriefImpactRow[]
  impactDetails?: TodayBriefImpactDetail[]
  planPortionsTotal: number
  adjustedPortionsToday: number
  targetGramsToday?: number
  adjustedGramsToday?: number
  onScrollToMeal: (slotId: string) => void
  dailyEngagement?: DailyEngagement | null
  onSaveDailyEngagement?: (next: DailyEngagement) => Promise<boolean>
  onTrackEvent?: (event: string, context?: Record<string, unknown>) => Promise<boolean>
  onApplyRescue?: () => boolean | Promise<boolean>
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
  impactDetails = [],
  planPortionsTotal,
  adjustedPortionsToday,
  targetGramsToday = 0,
  adjustedGramsToday = 0,
  onScrollToMeal,
  dailyEngagement,
  onSaveDailyEngagement,
  onTrackEvent,
  onApplyRescue,
}: Props) {
  const viewedEventSentRef = useRef<string | null>(null)

  const dateKey = useMemo(() => localDateKey(), [])
  const [checkin, setCheckin] = useState<DailyCheckinMood | null>(() => readDailyCheckin(dateKey))
  const [streak, setStreak] = useState(() => readConsistencyStreak().count)
  const [rescueApplying, setRescueApplying] = useState(false)
  const [rescueFeedback, setRescueFeedback] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [impactExpanded, setImpactExpanded] = useState(false)

  useEffect(() => {
    if (viewedEventSentRef.current === dateKey) return
    viewedEventSentRef.current = dateKey
    void onTrackEvent?.('today_brief_viewed', {
      mealCount: meals.length,
      completedMeals: meals.filter((m) => m.completed).length,
    })
  }, [dateKey, meals, onTrackEvent])

  const effectiveCheckin = useMemo(() => {
    if (dailyEngagement?.date === dateKey && dailyEngagement?.mood) {
      return dailyEngagement.mood
    }
    return checkin
  }, [checkin, dailyEngagement, dateKey])

  const effectiveStreak = useMemo(() => {
    if (typeof dailyEngagement?.streak === 'number' && dailyEngagement.streak > 0) {
      return dailyEngagement.streak
    }
    return streak
  }, [dailyEngagement, streak])

  useEffect(() => {
    if (!rescueFeedback) return
    const timer = setTimeout(() => setRescueFeedback(''), 2200)
    return () => clearTimeout(timer)
  }, [rescueFeedback])

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
      void onTrackEvent?.('today_brief_checkin', { mood })
      if (mood === 'good') {
        const next = bumpConsistencyStreakForGoodCheckin(dateKey)
        setStreak(next)
        void onSaveDailyEngagement?.({
          date: dateKey,
          mood,
          streak: next,
          lastGoodDate: dateKey,
          updatedAt: new Date().toISOString(),
        })
        return
      }
      void onSaveDailyEngagement?.({
        date: dateKey,
        mood,
        streak,
        lastGoodDate: dailyEngagement?.lastGoodDate || null,
        updatedAt: new Date().toISOString(),
      })
    },
    [dailyEngagement?.lastGoodDate, dateKey, onSaveDailyEngagement, onTrackEvent, streak]
  )

  if (meals.length === 0) return null

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 mb-5 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">Hoy en 30 segundos</p>
          <p className="text-sm font-bold text-gray-900 leading-tight mt-0.5">Tu día, en claro</p>
        </div>
        {effectiveStreak > 0 && (
          <span className="shrink-0 text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-200 rounded-full px-2.5 py-1">
            Racha {effectiveStreak}d
          </span>
        )}
      </div>

      <div className="rounded-xl border border-emerald-100 bg-white/90 px-3 py-2.5 mb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-gray-900">Tu siguiente comida</p>
            {nextMeal && (
              <p className="text-[10px] text-gray-600 truncate mt-0.5">
                Siguiente: {nextMeal.hour} · {nextMeal.nombre}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="shrink-0 min-h-8 px-2.5 rounded-lg text-[10px] font-semibold bg-emerald-100 text-emerald-800 active:bg-emerald-200"
          >
            {expanded ? 'Ver menos' : 'Ver mas'}
          </button>
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          expanded ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'
        }`}
        aria-hidden={!expanded}
      >
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
                onClick={() => {
                  void onTrackEvent?.('today_brief_go_to_meal_click', {
                    slotId: nextMeal.slotId,
                    mealName: nextMeal.nombre,
                  })
                  onScrollToMeal(nextMeal.slotId)
                }}
                className="mt-2 w-full min-h-9 rounded-xl bg-emerald-600 text-white text-[11px] font-semibold active:bg-emerald-700"
              >
                Ir a esta comida
              </button>
            </div>
          )}
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
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 mb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold text-emerald-900 uppercase">Impacto diario</p>
                <p className="text-[11px] text-emerald-800">
                  Porciones: {planPortionsTotal.toFixed(1)} vs {adjustedPortionsToday.toFixed(1)}
                </p>
                <p className="text-[11px] text-emerald-800">
                  Gramos: {Math.round(targetGramsToday)}g vs {Math.round(adjustedGramsToday)}g
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImpactExpanded((prev) => !prev)}
                className="shrink-0 min-h-8 px-2.5 rounded-lg text-[10px] font-semibold bg-emerald-100 text-emerald-800 active:bg-emerald-200"
              >
                {impactExpanded ? 'Ver menos' : 'Ver detalle'}
              </button>
            </div>

            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${
                impactExpanded ? 'max-h-[600px] opacity-100 mt-2' : 'max-h-0 opacity-0'
              }`}
              aria-hidden={!impactExpanded}
            >
              {impactDetails.length > 0 && (
                <div className="grid grid-cols-1 gap-1.5">
                  {impactDetails.map((item) => (
                    <div key={item.label} className="text-[10px] rounded-lg px-2 py-1.5 border bg-white/90 border-emerald-200">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold truncate">{item.label}</p>
                        <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-100 rounded-full px-1.5 py-0.5">
                          {item.statusLabel}
                        </span>
                      </div>
                      <p>Obj: {item.targetGrams}g · Act: {item.adjustedGrams}g</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {rescue && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 mb-3">
              <p className="text-[11px] text-amber-900 leading-snug">{rescue}</p>
              {onApplyRescue && (
                <button
                  type="button"
                  disabled={rescueApplying}
                  onClick={async () => {
                    setRescueApplying(true)
                    void onTrackEvent?.('today_brief_rescue_apply_click', {
                      rescueKind: 'auto_adjust_day',
                    })
                    const ok = await Promise.resolve(onApplyRescue())
                    setRescueFeedback(ok ? 'Rescate aplicado. Revisa impacto diario.' : 'No se pudo aplicar rescate.')
                    void onTrackEvent?.('today_brief_rescue_apply_result', {
                      rescueKind: 'auto_adjust_day',
                      ok: Boolean(ok),
                    })
                    setRescueApplying(false)
                  }}
                  className="mt-2 w-full min-h-9 rounded-xl bg-amber-600 text-white text-[11px] font-semibold active:bg-amber-700 disabled:opacity-60"
                >
                  {rescueApplying ? 'Aplicando rescate...' : 'Aplicar rescate al resto del dia'}
                </button>
              )}
              {rescueFeedback && (
                <p className={`text-[10px] mt-2 ${rescueFeedback.startsWith('No se') ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {rescueFeedback}
                </p>
              )}
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
            <p className="text-[10px] font-semibold text-gray-600 uppercase mb-2">Check-in de hoy</p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleCheckin('good')}
                className={`min-h-10 rounded-lg text-[10px] font-semibold border ${
                  effectiveCheckin === 'good' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-800 border-gray-300 active:bg-gray-100'
                }`}
              >
                Voy bien
              </button>
              <button
                type="button"
                onClick={() => handleCheckin('slip')}
                className={`min-h-10 rounded-lg text-[10px] font-semibold border ${
                  effectiveCheckin === 'slip' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-800 border-gray-300 active:bg-gray-100'
                }`}
              >
                Me salí
              </button>
              <button
                type="button"
                onClick={() => handleCheckin('help')}
                className={`min-h-10 rounded-lg text-[10px] font-semibold border ${
                  effectiveCheckin === 'help' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-gray-800 border-gray-300 active:bg-gray-100'
                }`}
              >
                Ayuda
              </button>
            </div>
            {effectiveCheckin === 'help' && (
              <p className="text-[10px] text-gray-600 mt-2 leading-snug">
                Abajo tienes tu plan del dia. Si un grupo va alto, enfocate en la siguiente comida del plan.
              </p>
            )}
            {effectiveCheckin === 'slip' && (
              <p className="text-[10px] text-gray-600 mt-2 leading-snug">
                Sin culpa: sigue con la siguiente comida del plan. Un día no define tu semana.
              </p>
            )}
          </div>
      </div>
    </div>
  )
}
