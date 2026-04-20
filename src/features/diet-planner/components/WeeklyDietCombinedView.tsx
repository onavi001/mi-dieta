import type { CombinedSlot } from '@/hooks/useDietApi'

type Props = {
  displayedDays: string[]
  combinedSlots: CombinedSlot[]
  myUserId?: string
  otherUserId?: string
  myUserName?: string
  otherUserName?: string
  canEditRelationship?: boolean
}

export function WeeklyDietCombinedView({
  displayedDays,
  combinedSlots,
  myUserId,
  otherUserId,
  myUserName,
  otherUserName,
  canEditRelationship,
}: Props) {
  return (
    <div className="px-4 py-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 shadow-sm">
        <p className="text-sm font-semibold text-gray-800 mb-1">Vista combinada</p>
        <p className="text-xs text-gray-500">
          {myUserName || 'Tú'} + {otherUserName || 'Usuario compartido'}
        </p>
        <span
          className={`inline-block mt-2 text-[11px] px-2 py-1 rounded-full ${
            canEditRelationship ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {canEditRelationship ? 'Permiso: puede editar' : 'Permiso: solo lectura'}
        </span>
      </div>

      {displayedDays.map((day) => {
        const daySlots = combinedSlots.filter((slot) => slot.day === day)
        if (daySlots.length === 0) return null

        return (
          <div key={day} className="mb-10">
            <div className="uppercase text-xs font-semibold tracking-widest text-gray-500 mb-4 pl-1">{day}</div>
            <div className="space-y-3">
              {daySlots.map((slot) => {
                const mine = myUserId ? slot.users[myUserId] : undefined
                const other = otherUserId ? slot.users[otherUserId] : undefined

                return (
                  <div key={slot.slot} className="bg-white border border-gray-200 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-xl bg-gray-100 text-gray-700">
                        {slot.hour}
                      </span>
                      <span className="inline-block px-3 py-1 text-xs font-medium rounded-xl bg-emerald-50 text-emerald-700">
                        {slot.tipo}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="p-3 rounded-xl bg-green-50 border border-green-200">
                        <p className="text-[11px] font-semibold text-green-700 mb-1">{myUserName || 'Tú'}</p>
                        <p className="text-sm text-gray-800">{mine?.meal?.nombre || 'Sin comida'}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                        <p className="text-[11px] font-semibold text-blue-700 mb-1">{otherUserName || 'Compartido'}</p>
                        <p className="text-sm text-gray-800">{other?.meal?.nombre || 'Sin comida'}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
