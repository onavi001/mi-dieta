import { useState } from 'react'
import type { Persona, Tab } from './data/types'
import { WeeklyDiet } from './components/WeeklyDiet'
import { GroceryList } from './components/GroceryList'

export default function App() {
  const [tab, setTab] = useState<Tab>('dieta')
  const [persona, setPersona] = useState<Persona>('ambos')

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b z-50">
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-600 rounded-2xl flex items-center justify-center text-white text-2xl">🥗</div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Mi Dieta</h1>
                <p className="text-xs text-green-600">Oscar &amp; Paulina</p>
              </div>
            </div>
          </div>

          {/* Toggle Persona */}
          <div className="flex bg-gray-100 rounded-3xl p-1 mt-5">
            {(['ambos', 'oscar', 'paulina'] as const).map((p) => (
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

        {/* Tabs */}
        <div className="flex border-t">
          <button
            onClick={() => setTab('dieta')}
            className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${
              tab === 'dieta' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500'
            }`}
          >
            Dieta Semanal
          </button>
          <button
            onClick={() => setTab('super')}
            className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${
              tab === 'super' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500'
            }`}
          >
            Lista del Súper
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto pb-20">
        {tab === 'dieta' ? <WeeklyDiet persona={persona} /> : <GroceryList />}
      </div>
    </div>
  )
}