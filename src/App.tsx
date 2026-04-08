import { Suspense, lazy, useState } from 'react'
import type { Persona, Tab } from './data/types'

type DietMode = 'today' | 'week'

const WeeklyDiet = lazy(async () => {
  const mod = await import('./components/WeeklyDiet')
  return { default: mod.WeeklyDiet }
})

const GroceryList = lazy(async () => {
  const mod = await import('./components/GroceryList')
  return { default: mod.GroceryList }
})

export default function App() {
  const [tab, setTab] = useState<Tab>('dieta')
  const [dietMode, setDietMode] = useState<DietMode>('today')
  const [persona, setPersona] = useState<Persona>('ambos')

  const todayLabel = new Date().toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-gradient-to-b from-lime-50 via-amber-50 to-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur border-b z-50">
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-600 rounded-2xl flex items-center justify-center text-white text-2xl">🥗</div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Mi Dieta</h1>
                <p className="text-xs text-emerald-700">{todayLabel} • modo rapido</p>
              </div>
            </div>
          </div>

          {/* Toggle Persona */}
          <div className="flex bg-gray-100 rounded-3xl p-1 mt-5 gap-1">
            {(['ambos', 'ivan', 'paulina'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPersona(p)}
                className={`flex-1 py-2.5 text-sm font-medium rounded-3xl transition-all ${
                  persona === p
                    ? 'bg-white shadow text-gray-900'
                    : 'text-gray-500'
                }`}
              >
                {p === 'ambos' ? 'Ambos' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto pb-28">
        <Suspense
          fallback={
            <div className="px-4 py-10 flex items-center justify-center">
              <span className="text-sm text-gray-500">Cargando vista...</span>
            </div>
          }
        >
          {tab === 'dieta'
            ? <WeeklyDiet persona={persona} focusMode={dietMode} />
            : <GroceryList />}
        </Suspense>
      </div>

      {/* Bottom quick nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="max-w-[430px] mx-auto bg-white/95 backdrop-blur border border-gray-200 shadow-lg rounded-2xl p-1.5 flex gap-1">
          <button
            onClick={() => {
              setTab('dieta')
              setDietMode('today')
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              tab === 'dieta' && dietMode === 'today'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-600'
            }`}
          >
            Hoy
          </button>
          <button
            onClick={() => {
              setTab('dieta')
              setDietMode('week')
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              tab === 'dieta' && dietMode === 'week'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-600'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setTab('super')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              tab === 'super' ? 'bg-emerald-600 text-white' : 'text-gray-600'
            }`}
          >
            Super
          </button>
        </div>
      </div>
    </div>
  )
}