import { useEffect, useState } from 'react'
import { onConsistencyStreakUpdated, readConsistencyStreak } from '@/utils/dailyEngagement'

type Props = {
  completedToday: number
  todayMealCount: number
  autoAdjustMessage: string
}

export function WeeklyDietProgressPanel({
  completedToday,
  todayMealCount,
  autoAdjustMessage,
}: Props) {
  const [streakDays, setStreakDays] = useState(0)
  const safeTotal = Math.max(0, todayMealCount || 0)
  const safeCompleted = Math.max(0, Math.min(completedToday, safeTotal))
  const percent = safeTotal ? (safeCompleted / safeTotal) * 100 : 0

  useEffect(() => {
    const refresh = () => setStreakDays(readConsistencyStreak().count)
    refresh()
    return onConsistencyStreakUpdated(refresh)
  }, [completedToday])

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-800">Progreso de hoy</p>
        <div className="flex items-center gap-1.5 shrink-0">
          {streakDays > 0 && (
            <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
              {streakDays}d
            </span>
          )}
          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1">
            {safeCompleted}/{safeTotal}
          </span>
        </div>
      </div>

      <div className="h-2.5 bg-gradient-to-r from-emerald-100 via-lime-100 to-cyan-100 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 via-lime-500 to-cyan-500 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      {autoAdjustMessage && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <p className="text-[11px] text-emerald-800">{autoAdjustMessage}</p>
        </div>
      )}
    </div>
  )
}
