import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Tab } from './data/types'
import { useDietApi } from './hooks/useDietApi'
import { useNutritionApi } from './hooks/useNutritionApi'
import { useApiActivity } from './hooks/apiActivity'
import { INGREDIENT_REFERENCE, type PlanGroupKey } from './data/ingredientReference'
import { detectIngredientGroup } from './data/ingredientConversionUtils'
import { getCuratedExpandedMealsByType } from './data/curatedMealCatalog'
import { estimateMealGroupPortions, rankMealsForGroupTarget } from './data/mealCatalogMatching'
import {
  filterAndSortMealsForProfile,
  isIngredientExcludedForProfile,
  pickReplacementIngredient,
} from './data/profileFoodRules'

type DietMode = 'today' | 'week'
const DATA_RESET_ALLOWED_USER_ID = '4a9daa23-4aee-4bcc-bdf3-4c50931607ea'

const WeeklyDiet = lazy(async () => {
  const mod = await import('./components/WeeklyDiet')
  return { default: mod.WeeklyDiet }
})

const GroceryList = lazy(async () => {
  const mod = await import('./components/GroceryList')
  return { default: mod.GroceryList }
})

const NutritionPanel = lazy(async () => {
  const mod = await import('./components/NutritionPanel')
  return { default: mod.NutritionPanel }
})

export default function App() {
  const [tab, setTab] = useState<Tab>('dieta')
  const [dietMode, setDietMode] = useState<DietMode>('today')
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [shareUserIdInput, setShareUserIdInput] = useState('')
  const [shareSearchInput, setShareSearchInput] = useState('')
  const [shareCanEditInput, setShareCanEditInput] = useState(false)
  const [shareMessage, setShareMessage] = useState('')
  const [resetMessage, setResetMessage] = useState('')
  const [autoGeneratingMeals, setAutoGeneratingMeals] = useState(false)
  const [isOverlayVisible, setIsOverlayVisible] = useState(false)
  const overlayShownAtRef = useRef<number>(0)
  const overlayHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    loading,
    error,
    actionLoading,
    session,
    profile,
    plan,
    activeSlots,
    combinedSlots,
    shareUsers,
    shareCandidates,
    incomingInvites,
    selectedShareUserId,
    setSelectedShareUserId,
    viewMode,
    setViewMode,
    sendShareInvite,
    searchShareCandidates,
    acceptInvite,
    rejectInvite,
    updateSharePermission,
    deleteShare,
    login,
    register,
    logout,
    swapMeal,
    setSlotMeal,
    setSlotCompleted,
    replaceIngredient,
    updateGroceryState,
    syncWeekState,
    weekState,
    fetchSlotAlternatives,
    generatePlan,
    resetMyData,
    refresh,
  } = useDietApi()
  const { summary, loadSummary } = useNutritionApi(session?.accessToken)
  const { isBusy: isApiBusy, pendingRequests, currentLabel } = useApiActivity()

  useEffect(() => {
    if (isApiBusy) {
      if (overlayHideTimeoutRef.current) {
        clearTimeout(overlayHideTimeoutRef.current)
        overlayHideTimeoutRef.current = null
      }

      if (!isOverlayVisible) {
        setIsOverlayVisible(true)
        overlayShownAtRef.current = Date.now()
      }
      return
    }

    if (!isOverlayVisible) return

    const elapsed = Date.now() - overlayShownAtRef.current
    const remaining = Math.max(0, 300 - elapsed)

    if (remaining === 0) {
      setIsOverlayVisible(false)
      return
    }

    overlayHideTimeoutRef.current = setTimeout(() => {
      setIsOverlayVisible(false)
      overlayHideTimeoutRef.current = null
    }, remaining)
  }, [isApiBusy, isOverlayVisible])

  useEffect(() => {
    return () => {
      if (overlayHideTimeoutRef.current) {
        clearTimeout(overlayHideTimeoutRef.current)
      }
    }
  }, [])

  const ingredientOptionsByGroup = useMemo(() => {
    const grouped = {
      verduras: [] as string[],
      frutas: [] as string[],
      cereales_tuberculos: [] as string[],
      leguminosas: [] as string[],
      proteina_animal_o_alternativas: [] as string[],
      lacteos_o_sustitutos: [] as string[],
      grasas_saludables: [] as string[],
    }

    for (const [id, ref] of Object.entries(INGREDIENT_REFERENCE)) {
      grouped[ref.group].push(id)
    }

    for (const group of Object.keys(grouped) as PlanGroupKey[]) {
      grouped[group].sort((a, b) => a.localeCompare(b, 'es'))
    }

    return grouped
  }, [])

  const todayLabel = new Date().toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  const selectedShareUser = shareUsers.find((item) => item.profile.id === selectedShareUserId) || null

  const ownedShareUsers = shareUsers.filter((item) => item.relation?.ownerUserId === session?.user.id)
  const canResetOwnData = session?.user.id === DATA_RESET_ALLOWED_USER_ID

  const mealsForGrocery = useMemo(() => {
    if (viewMode !== 'combined') {
      return (plan?.slots || [])
        .map((slot) => weekState?.mealOverrides?.[slot.slot] || slot.meal)
        .filter((meal): meal is NonNullable<typeof meal> => Boolean(meal))
    }

    const meals = combinedSlots.flatMap((slot) => {
      return Object.values(slot.users)
        .map((entry) => entry.meal)
        .filter((meal): meal is NonNullable<typeof meal> => Boolean(meal))
    })

    return meals
  }, [combinedSlots, plan?.slots, viewMode, weekState?.mealOverrides])

  const globalProcessLabel = useMemo(() => {
    if (autoGeneratingMeals) return 'Generando platillos y aplicando alternativas para la semana...'
    if (actionLoading.logout) return 'Cerrando sesión...'
    if (actionLoading.loadCombinedPlan) return 'Cargando vista combinada...'
    if (actionLoading.sendShareInvite) return 'Enviando invitación...'
    if (actionLoading.searchShareCandidates) return 'Buscando usuarios...'
    if (actionLoading.acceptInvite) return 'Aceptando invitación...'
    if (actionLoading.rejectInvite) return 'Rechazando invitación...'
    if (actionLoading.updateSharePermission) return 'Actualizando permisos compartidos...'
    if (actionLoading.deleteShare) return 'Quitando acceso compartido...'
    if (actionLoading.updateGroceryState) return 'Guardando cambios de la lista...'
    if (loading && !plan) return 'Sincronizando datos de tu cuenta...'
    return ''
  }, [actionLoading.acceptInvite, actionLoading.deleteShare, actionLoading.loadCombinedPlan, actionLoading.logout, actionLoading.rejectInvite, actionLoading.searchShareCandidates, actionLoading.sendShareInvite, actionLoading.updateGroceryState, actionLoading.updateSharePermission, autoGeneratingMeals, loading, plan])

  const overlayProcessLabel = globalProcessLabel || currentLabel || 'Procesando solicitud...'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthMessage('')
    await login(email.trim(), password)
    setPassword('')
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthMessage('')
    const result = await register(name.trim(), email.trim(), password)
    setPassword('')

    if (!result.loggedIn) {
      setAuthMessage('Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.')
      setAuthMode('login')
    }
  }

  const handleGeneratePlan = useCallback(async (): Promise<boolean> => {
    try {
      const generatedPlan = await generatePlan()
      if (!generatedPlan) return false

      const hasGeneratedMeals = generatedPlan.slots.some((slot) => Boolean(slot.meal))
      if (!hasGeneratedMeals) return false

      const nutritionData = summary || await loadSummary()
      const nutritionProfile = nutritionData?.nutritionProfile
      if (!nutritionProfile) return true

      const profileFoodRules = {
        allergies: nutritionProfile.allergies,
        intolerances: nutritionProfile.intolerances,
        foodPreferences: nutritionProfile.food_preferences,
      }

      const suggestionPreferences = weekState?.suggestionPreferences || {
        preferredCuisineTags: [],
        preferQuickMeals: false,
        avoidFish: false,
        preferMeasuredMeals: true,
        autoApplyToGeneratedWeek: true,
      }

      for (const slot of generatedPlan.slots) {
        if (!slot.meal) continue

        for (const [ingredientIndex, ingredient] of slot.meal.ingredientes.entries()) {
          if (!isIngredientExcludedForProfile(ingredient.id, profileFoodRules)) {
            continue
          }

          const group = detectIngredientGroup(ingredient.id, `${ingredient.id} ${ingredient.presentacion || ''}`)
          if (!group) continue

          const replacement = pickReplacementIngredient(ingredient.id, ingredientOptionsByGroup[group], profileFoodRules)

          if (!replacement || replacement === ingredient.id) continue

          try {
            await replaceIngredient(slot.slot, ingredientIndex, replacement, generatedPlan.week)
          } catch {
            // Keep base generated week even if a replacement fails.
          }
        }
      }

      const rankedOverrideEntries = await Promise.all(
        generatedPlan.slots
          .filter((slot) => Boolean(slot.meal))
          .map(async (slot) => {
            if (!slot.meal) return null

            // Use local curated catalog for auto-apply to avoid one backend call per slot.
            const alternatives = getCuratedExpandedMealsByType(slot.tipo)
              .filter((meal) => meal.id !== slot.meal?.id)
            const compatibleAlternatives = filterAndSortMealsForProfile(alternatives, profileFoodRules)
            if (compatibleAlternatives.length === 0) return null

            const ranked = rankMealsForGroupTarget(
              compatibleAlternatives,
              estimateMealGroupPortions(slot.meal),
              { preferences: suggestionPreferences }
            )

            const bestMatch = ranked[0]?.meal
            if (!bestMatch) return null

            return [slot.slot, bestMatch] as const
          })
      )

      const mealOverrides = Object.fromEntries(rankedOverrideEntries.filter((entry): entry is readonly [string, NonNullable<typeof entry>[1]] => Boolean(entry)))
      if (Object.keys(mealOverrides).length > 0) {
        await syncWeekState({ mealOverrides, week: generatedPlan.week })
      }

      return true
    } catch {
      return false
    }
  }, [
    summary,
    loadSummary,
    generatePlan,
    weekState?.suggestionPreferences,
    ingredientOptionsByGroup,
    replaceIngredient,
    syncWeekState,
  ])

  const generatePlanWithRetry = useCallback(async (): Promise<boolean> => {
    const generated = await handleGeneratePlan()
    if (generated) return true

    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 1000)
    })

    return handleGeneratePlan()
  }, [handleGeneratePlan])

  const runGeneratePlanWorkflow = useCallback(async () => {
    if (autoGeneratingMeals) return false

    setAutoGeneratingMeals(true)
    try {
      return await generatePlanWithRetry()
    } finally {
      setAutoGeneratingMeals(false)
    }
  }, [autoGeneratingMeals, generatePlanWithRetry])

  const handlePlanSaved = async () => {
    const generated = await runGeneratePlanWorkflow()
    setTab('dieta')
    return generated
  }

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault()
    setShareMessage('')

    const targetUserId = shareUserIdInput.trim()
    if (!targetUserId) {
      setShareMessage('Ingresa el user id del usuario con quien quieres compartir')
      return
    }

    await sendShareInvite(targetUserId, shareCanEditInput)
    setShareMessage('Invitación enviada correctamente')
    setShareUserIdInput('')
    setShareCanEditInput(false)
    setShareSearchInput('')
  }

  const handleResetMyData = async () => {
    setResetMessage('')

    const accepted = window.confirm('Esto eliminara tu plan, semana, avances nutri y compartidos. Tu usuario se conserva. Deseas continuar?')
    if (!accepted) return

    const confirmation = window.prompt('Escribe BORRAR para confirmar')
    if ((confirmation || '').trim().toUpperCase() !== 'BORRAR') {
      setResetMessage('Operacion cancelada: confirmacion invalida.')
      return
    }

    const deleted = await resetMyData()
    if (!deleted) {
      setResetMessage('No se pudo eliminar la informacion. Intenta nuevamente.')
      return
    }

    setResetMessage('Datos eliminados. Recargando...')
    window.location.reload()
  }

  const handleSearchShareCandidates = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextQuery = e.target.value
    setShareSearchInput(nextQuery)
    await searchShareCandidates(nextQuery)
  }

  if (!session) {
    return (
      <>
        <div className="min-h-screen bg-linear-to-b from-lime-50 via-amber-50 to-white flex items-center justify-center p-4">
          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Mi Dieta API</h1>
          <p className="text-sm text-gray-500 mb-4">
            {authMode === 'login'
              ? 'Inicia sesión para cargar tu plan remoto'
              : 'Crea tu cuenta para empezar con tu dieta personalizada'}
          </p>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login')
                setAuthMessage('')
              }}
              className={`py-2 text-xs font-semibold rounded-xl ${authMode === 'login' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register')
                setAuthMessage('')
              }}
              className={`py-2 text-xs font-semibold rounded-xl ${authMode === 'register' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Crear cuenta
            </button>
          </div>

          {authMode === 'register' && (
            <>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mb-3"
                required
              />
            </>
          )}

          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mb-3"
            required
          />

          <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mb-4"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {loading
              ? authMode === 'login' ? 'Entrando...' : 'Creando cuenta...'
              : authMode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>

          {authMessage && <p className="text-xs text-emerald-700 mt-3">{authMessage}</p>}
          {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
          </form>
        </div>

        {isOverlayVisible && (
          <div className="fixed inset-0 z-100 bg-white/70 backdrop-blur-[1px] flex items-center justify-center pointer-events-auto">
            <div className="rounded-2xl border border-emerald-200 bg-white px-5 py-4 shadow-lg flex items-center gap-3">
              <span className="inline-block h-5 w-5 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">{overlayProcessLabel}</p>
                <p className="text-xs text-emerald-700">Espera a que termine para continuar ({pendingRequests})</p>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <div className="max-w-107.5 mx-auto min-h-screen bg-linear-to-b from-lime-50 via-amber-50 to-white flex flex-col">
        <div className="sticky top-0 bg-white/90 backdrop-blur border-b z-50">
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-600 rounded-2xl flex items-center justify-center text-white text-2xl">🥗</div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Mi Dieta</h1>
                <p className="text-xs text-emerald-700">{todayLabel} • {profile?.name || session.user.email || 'usuario'}</p>
              </div>
            </div>
            <button
              onClick={() => void logout()}
              disabled={actionLoading.logout}
              className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700"
            >
              {actionLoading.logout ? 'Saliendo...' : 'Salir'}
            </button>
          </div>

          {globalProcessLabel && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
              <span>{globalProcessLabel}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              onClick={() => setViewMode('my')}
              className={`py-2 text-xs font-semibold rounded-xl ${viewMode === 'my' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Mi plan
            </button>
            <button
              onClick={() => setViewMode('combined')}
              className={`py-2 text-xs font-semibold rounded-xl ${viewMode === 'combined' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Combinada
            </button>
          </div>

          {viewMode === 'combined' && (
            <div className="mt-2 space-y-2">
              <select
                value={selectedShareUserId}
                onChange={(e) => setSelectedShareUserId(e.target.value)}
                disabled={actionLoading.loadCombinedPlan}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
              >
                <option value="">Selecciona usuario compartido</option>
                {shareUsers.map((item) => (
                  <option key={item.profile.id} value={item.profile.id}>
                    {item.profile.name}
                  </option>
                ))}
              </select>

              <form onSubmit={handleCreateShare} className="bg-gray-50 border border-gray-200 rounded-xl p-2">
                <p className="text-[11px] text-gray-500 mb-1">Compartir por nombre o email</p>
                <input
                  type="text"
                  value={shareSearchInput}
                  onChange={(e) => void handleSearchShareCandidates(e)}
                  disabled={actionLoading.searchShareCandidates || actionLoading.sendShareInvite}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs mb-2"
                  placeholder="Buscar usuario..."
                />

                {actionLoading.searchShareCandidates && (
                  <p className="text-[11px] text-gray-500 mb-2">Buscando coincidencias...</p>
                )}

                {shareCandidates.length > 0 && (
                  <div className="max-h-28 overflow-y-auto border border-gray-200 rounded-lg bg-white mb-2">
                    {shareCandidates.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => {
                          setShareUserIdInput(candidate.id)
                          setShareSearchInput(`${candidate.name} (${candidate.email})`)
                        }}
                        className="w-full text-left px-2 py-1.5 hover:bg-gray-50 border-b last:border-b-0"
                      >
                        <p className="text-xs font-medium text-gray-800">{candidate.name}</p>
                        <p className="text-[11px] text-gray-500">{candidate.email}</p>
                      </button>
                    ))}
                  </div>
                )}

                <p className="text-[11px] text-gray-500 mb-1">UUID seleccionado (fallback manual)</p>
                <input
                  type="text"
                  value={shareUserIdInput}
                  onChange={(e) => setShareUserIdInput(e.target.value)}
                  disabled={actionLoading.sendShareInvite}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs mb-2"
                  placeholder="user_id"
                />
                <label className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                  <input
                    type="checkbox"
                    checked={shareCanEditInput}
                    onChange={(e) => setShareCanEditInput(e.target.checked)}
                    disabled={actionLoading.sendShareInvite}
                  />
                  Permitir edición
                </label>
                <button
                  type="submit"
                  disabled={actionLoading.sendShareInvite}
                  className="w-full bg-emerald-600 text-white rounded-lg py-1.5 text-xs font-semibold"
                >
                  {actionLoading.sendShareInvite ? 'Compartiendo...' : 'Compartir'}
                </button>
                {shareMessage && <p className="text-[11px] text-emerald-700 mt-2">{shareMessage}</p>}
              </form>

              {ownedShareUsers.length > 0 && (
                <div className="space-y-1">
                  {ownedShareUsers.map((item) => (
                    <div key={item.profile.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-2 py-1.5">
                      <span className="text-xs text-gray-700 truncate pr-2">{item.profile.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void updateSharePermission(item.profile.id, !item.relation?.canEdit)}
                          disabled={actionLoading.updateSharePermission || actionLoading.deleteShare}
                          className="text-[11px] px-2 py-1 rounded bg-gray-100 text-gray-700"
                        >
                          {actionLoading.updateSharePermission ? 'Guardando...' : item.relation?.canEdit ? 'Solo ver' : 'Puede editar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteShare(item.profile.id)}
                          disabled={actionLoading.deleteShare || actionLoading.updateSharePermission}
                          className="text-[11px] px-2 py-1 rounded bg-red-50 text-red-700"
                        >
                          {actionLoading.deleteShare ? 'Quitando...' : 'Quitar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {incomingInvites.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-gray-500">Invitaciones pendientes</p>
                  {incomingInvites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                      <span className="text-xs text-amber-900 truncate pr-2">De: {invite.ownerUserId.slice(0, 8)}...</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => void acceptInvite(invite.id)}
                          disabled={actionLoading.acceptInvite || actionLoading.rejectInvite}
                          className="text-[11px] px-2 py-1 rounded bg-emerald-600 text-white"
                        >
                          {actionLoading.acceptInvite ? 'Aceptando...' : 'Aceptar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void rejectInvite(invite.id)}
                          disabled={actionLoading.rejectInvite || actionLoading.acceptInvite}
                          className="text-[11px] px-2 py-1 rounded bg-gray-200 text-gray-700"
                        >
                          {actionLoading.rejectInvite ? 'Rechazando...' : 'Rechazar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </div>
          )}
        </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-28">
        <Suspense
          fallback={
            <div className="px-4 py-10 flex items-center justify-center">
              <span className="text-sm text-gray-500">Cargando vista...</span>
            </div>
          }
        >
          {tab === 'dieta'
            ? !plan && !loading
              ? (
                <div className="px-4 py-8 space-y-4">
                  <div className="bg-white border border-gray-200 rounded-2xl p-5">
                    <p className="text-base font-semibold text-gray-900">Bienvenido a Mi Dieta</p>
                    <p className="text-xs text-gray-500 mt-1">Para generar tu plan personalizado, primero completa tu perfil nutricional.</p>
                    <ol className="mt-4 space-y-2 text-xs text-gray-700 list-decimal list-inside">
                      <li>Ve a <strong>Nutri</strong> y llena el formulario inicial con tus datos.</li>
                      <li>Guarda una versión de plan con tus porciones objetivo.</li>
                      <li>Regresa aquí y genera tu dieta personalizada.</li>
                    </ol>
                    <button
                      type="button"
                      onClick={() => setTab('nutricion')}
                      className="mt-4 w-full bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-semibold"
                    >
                      Ir a mi perfil nutricional
                    </button>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-2xl p-5">
                    <p className="text-sm font-semibold text-gray-900">Ya llenaste tu perfil?</p>
                    <p className="text-xs text-gray-500 mt-1">Si ya tienes un plan guardado, genera tu dieta aquí.</p>
                    {autoGeneratingMeals && (
                      <p className="text-xs text-emerald-700 mt-2 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
                        Generando platillos automaticamente para tu semana...
                      </p>
                    )}
                    {error && <p className="text-xs text-red-600 mt-2 bg-red-50 rounded-lg px-2 py-1">{error}</p>}
                    <button
                      type="button"
                      onClick={() => void runGeneratePlanWorkflow()}
                      disabled={loading || autoGeneratingMeals || actionLoading.generatePlan}
                      className="mt-3 w-full bg-gray-900 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"
                    >
                      {loading || autoGeneratingMeals || actionLoading.generatePlan ? 'Generando...' : 'Generar mi dieta personalizada'}
                    </button>
                  </div>
                </div>
              )
            : tab === 'dieta' && viewMode === 'combined' && actionLoading.loadCombinedPlan
              ? (
                <div className="px-4 py-10 flex items-center justify-center">
                  <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-600 shadow-sm">
                    Cargando dieta combinada...
                  </div>
                </div>
              )
              : (
              <WeeklyDiet
                key={`${viewMode}-${plan?.id || 'no-plan'}-${plan?.week || 'no-week'}`}
                focusMode={dietMode}
                mode={viewMode}
                accessToken={session.accessToken}
                slots={activeSlots}
                combinedSlots={combinedSlots}
                weekState={weekState}
                onSyncWeekState={syncWeekState}
                myUserId={session.user.id}
                otherUserId={selectedShareUserId || undefined}
                myUserName={profile?.name}
                otherUserName={selectedShareUser?.profile.name}
                canEditRelationship={Boolean(selectedShareUser?.relation?.canEdit)}
                onSwapMeal={swapMeal}
                onSetSlotCompleted={setSlotCompleted}
                onSetSlotMeal={setSlotMeal}
                onReplaceIngredient={replaceIngredient}
                onLoadSlotAlternatives={fetchSlotAlternatives}
                onRefreshPlan={refresh}
              />
            )
            : tab === 'super'
              ? (
              <GroceryList
                accessToken={session.accessToken}
                meals={mealsForGrocery}
                groceryState={plan?.groceryState || { checked: [], onlyPending: false }}
                weekState={weekState}
                onChangeGroceryState={updateGroceryState}
                onSyncWeekState={syncWeekState}
                isSavingState={actionLoading.updateGroceryState}
              />
              )
              : (
                <div className="px-4 py-4 space-y-4">
                  <NutritionPanel accessToken={session.accessToken} onPlanSaved={handlePlanSaved} />

                  {canResetOwnData && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 mb-12">
                      <p className="text-xs text-rose-800 font-semibold">Zona de mantenimiento personal</p>
                      <p className="text-xs text-rose-700 mt-0.5">Elimina todos tus datos (plan, comidas, nutricion y compartidos) sin borrar tu usuario.</p>
                      <button
                        type="button"
                        onClick={() => void handleResetMyData()}
                        disabled={actionLoading.resetMyData || loading}
                        className="mt-2 text-xs px-3 py-1.5 rounded-lg bg-rose-600 text-white disabled:opacity-60"
                      >
                        {actionLoading.resetMyData ? 'Eliminando...' : 'Eliminar todos mis datos'}
                      </button>
                      {resetMessage && <p className="text-xs text-rose-700 mt-2">{resetMessage}</p>}
                    </div>
                  )}
                </div>
              )}
        </Suspense>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="max-w-107.5 mx-auto bg-white/95 backdrop-blur border border-gray-200 shadow-lg rounded-2xl p-1.5 flex gap-1">
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
          <button
            onClick={() => setTab('nutricion')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              tab === 'nutricion' ? 'bg-emerald-600 text-white' : 'text-gray-600'
            }`}
          >
            Nutri
          </button>
        </div>
        </div>
      </div>

      {isOverlayVisible && (
        <div className="fixed inset-0 z-100 bg-white/70 backdrop-blur-[1px] flex items-center justify-center pointer-events-auto">
          <div className="rounded-2xl border border-emerald-200 bg-white px-5 py-4 shadow-lg flex items-center gap-3">
            <span className="inline-block h-5 w-5 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">{overlayProcessLabel}</p>
              <p className="text-xs text-emerald-700">No cierres ni toques la pantalla ({pendingRequests})</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
