import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Comida, TipoComida } from '../types/domain'
import { getApiBaseUrl } from '../utils/apiBaseUrl'
import { logApiRequestFailed } from '../utils/clientLog'
import { createDietApiClient } from './dietApi/client'
import { startApiRequest } from './apiActivity'
import {
  type ApiResponse,
  type ApiSession,
  type AuthPayload,
  type AuthProfile,
  type CombinedSlot,
  type DailyEngagement,
  type RawCombinedSlot,
  type RawPlan,
  type ShareCandidate,
  type ShareInvite,
  type ShareUser,
  type WeekPlan,
  type WeekStatePatch,
  normalizeMeal,
  normalizePlan,
  readStoredSession,
  writeStoredSession,
} from './dietApi/model'
import { hydrateIngredientReference, isIngredientReferenceHydrated } from '../data/reference/ingredientReference'
import { refreshStoredSession, SESSION_REFRESH_EVENT } from './dietApi/refreshStoredSession'

export type { DietSlot, CombinedSlot, WeekPlan, WeekState, WeekStatePatch, DailyEngagement, DailyCheckinMood } from './dietApi/model'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
const UNAUTHORIZED_EVENT = 'mi-dieta:unauthorized'

function getDietRequestLabel(path: string, method: HttpMethod): string {
  if (path.includes('/api/auth/login')) return 'Iniciando sesion...'
  if (path.includes('/api/auth/register')) return 'Creando cuenta...'
  if (path.includes('/api/auth/refresh')) return 'Renovando sesion...'
  if (path.includes('/api/auth/logout')) return 'Cerrando sesion...'
  if (path.includes('/api/plans/my/generate')) return 'Generando plan de comidas...'
  if (path.includes('/api/plans/my/alternatives')) return 'Cargando alternativas de comidas...'
  if (path.includes('/api/plans/my/slot')) return 'Guardando comida seleccionada...'
  if (path.includes('/api/plans/my/week-state')) return 'Guardando ajustes de la semana...'
  if (path.includes('/api/plans/my/ingredient')) return 'Guardando reemplazo de ingrediente...'
  if (path.includes('/api/plans/my/complete')) return 'Guardando avance del dia...'
  if (path.includes('/api/plans/my/grocery')) return 'Guardando lista del super...'
  if (path.includes('/api/plans/combined/')) return 'Cargando plan combinado...'
  if (path.includes('/api/meals')) return 'Cargando catalogo de comidas...'
  if (path.includes('/api/reference/ingredients')) return 'Cargando referencia de ingredientes...'
  if (path.includes('/api/plans/my')) return 'Cargando plan semanal...'
  if (path.includes('/api/users/me/profile')) return 'Cargando perfil...'
  if (path.includes('/api/users/me/daily-engagement')) return 'Sincronizando progreso diario...'
  if (path.includes('/api/users/me/events')) return 'Registrando evento...'
  if (path.includes('/api/users/me/reset-data')) return 'Eliminando tus datos...'
  if (path.includes('/api/shares/search')) return 'Buscando usuarios para compartir...'
  if (path.includes('/api/shares/invites') && method === 'POST') return 'Enviando invitacion...'
  if (path.includes('/api/shares/invites') && path.includes('/accept')) return 'Aceptando invitacion...'
  if (path.includes('/api/shares/invites') && path.includes('/reject')) return 'Rechazando invitacion...'
  if (path.includes('/api/shares') && method === 'DELETE') return 'Quitando acceso compartido...'
  if (path.includes('/api/shares') && method === 'PUT') return 'Actualizando permisos compartidos...'
  if (path.includes('/api/shares')) return 'Sincronizando compartidos...'
  return method === 'GET' ? 'Cargando datos...' : 'Guardando cambios...'
}

export function useDietApi() {
  const [actionCounts, setActionCounts] = useState({
    searchShareCandidates: 0,
    sendShareInvite: 0,
    acceptInvite: 0,
    rejectInvite: 0,
    updateSharePermission: 0,
    deleteShare: 0,
    loadCombinedPlan: 0,
    logout: 0,
    generatePlan: 0,
    updateGroceryState: 0,
    resetMyData: 0,
  })
  const [session, setSession] = useState<ApiSession | null>(() => readStoredSession())
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [plan, setPlan] = useState<WeekPlan | null>(null)
  const [combinedSlots, setCombinedSlots] = useState<CombinedSlot[]>([])
  const [shareUsers, setShareUsers] = useState<ShareUser[]>([])
  const [shareCandidates, setShareCandidates] = useState<ShareCandidate[]>([])
  const [incomingInvites, setIncomingInvites] = useState<ShareInvite[]>([])
  const [outgoingInvites, setOutgoingInvites] = useState<ShareInvite[]>([])
  const [selectedShareUserId, setSelectedShareUserId] = useState<string>('')
  const [viewMode, setViewMode] = useState<'my' | 'combined'>('my')
  const [dailyEngagement, setDailyEngagement] = useState<DailyEngagement | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [isBootstrapped, setIsBootstrapped] = useState(false)
  const hasHandledUnauthorizedRef = useRef(false)

  const baseUrl = useMemo(() => getApiBaseUrl(), [])

  const clearSessionState = useCallback(() => {
    writeStoredSession(null)
    setSession(null)
    setProfile(null)
    setPlan(null)
    setCombinedSlots([])
    setShareUsers([])
    setIncomingInvites([])
    setOutgoingInvites([])
    setSelectedShareUserId('')
    setViewMode('my')
    setDailyEngagement(null)
  }, [])

  const request = useCallback(async <T>(
    path: string,
    method: HttpMethod = 'GET',
    body?: unknown,
    tokenOverride?: string
  ): Promise<T> => {
    const endRequest = startApiRequest(getDietRequestLabel(path, method))

    const skipRefreshOn401 =
      path.includes('/api/auth/login') ||
      path.includes('/api/auth/register') ||
      path.includes('/api/auth/refresh')

    const runFetch = (bearer: string | undefined) =>
      fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      })

    const bearer = tokenOverride || session?.accessToken

    try {
      let response = await runFetch(bearer)

      if (response.status === 401 && bearer && !skipRefreshOn401) {
        const next = await refreshStoredSession(baseUrl)
        if (next) {
          setSession(next)
          hasHandledUnauthorizedRef.current = false
          response = await runFetch(next.accessToken)
        }
      }

      if (response.status === 401 && bearer) {
        if (!hasHandledUnauthorizedRef.current) {
          hasHandledUnauthorizedRef.current = true
          clearSessionState()
        }

        throw new Error('Sesion expirada. Inicia sesion nuevamente.')
      }

      const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null

      if (!response.ok || !payload?.ok || payload.data === undefined) {
        throw new Error(payload?.error || 'Request failed')
      }

      return payload.data
    } catch (err) {
      logApiRequestFailed(path, method, err)
      throw err
    } finally {
      endRequest()
    }
  }, [baseUrl, clearSessionState, session?.accessToken])

  const api = useMemo(() => createDietApiClient(request), [request])

  const runWithLoading = useCallback(async <T,>(
    action: () => Promise<T>,
    fallbackMessage: string,
    rethrow = false
  ): Promise<T | null> => {
    setLoading(true)
    setError('')

    try {
      return await action()
    } catch (err) {
      const message = err instanceof Error ? err.message : fallbackMessage
      setError(message)
      if (rethrow) throw err
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const runWithAction = useCallback(async <T,>(
    key: keyof typeof actionCounts,
    action: () => Promise<T>
  ): Promise<T> => {
    setActionCounts((prev) => ({
      ...prev,
      [key]: prev[key] + 1,
    }))

    try {
      return await action()
    } finally {
      setActionCounts((prev) => ({
        ...prev,
        [key]: Math.max(0, prev[key] - 1),
      }))
    }
  }, [])

  const applyAuthSession = useCallback((data: AuthPayload) => {
    if (!data.session?.access_token) {
      return false
    }

    const nextSession: ApiSession = {
      accessToken: data.session.access_token,
      refreshToken: typeof data.session.refresh_token === 'string' ? data.session.refresh_token : undefined,
      expiresAt: typeof data.session.expires_at === 'number' ? data.session.expires_at : undefined,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    }

    writeStoredSession(nextSession)
    setSession(nextSession)
    hasHandledUnauthorizedRef.current = false
    return true
  }, [])

  const applyPlanPayload = useCallback((payload: { plan: RawPlan | null }) => {
    setPlan(normalizePlan(payload.plan))
  }, [])

  const loadMyPlan = useCallback(async () => {
    const data = await api.loadMyPlan()
    applyPlanPayload(data)
  }, [api, applyPlanPayload])

  const generatePlan = useCallback(async () => {
    return runWithAction('generatePlan', async () => {
      const data = await api.generatePlan()
      applyPlanPayload(data)
      return normalizePlan(data.plan)
    })
  }, [api, applyPlanPayload, runWithAction])

  const fetchAllMealsCatalog = useCallback(async (): Promise<Comida[]> => {
    const data = await api.loadMealsCatalog()
    return (data.meals || [])
      .map((meal) => normalizeMeal(meal))
      .filter((meal): meal is Comida => Boolean(meal))
  }, [api])

  const loadIngredientReference = useCallback(async () => {
    if (isIngredientReferenceHydrated()) return
    const data = await api.loadIngredientReference()
    hydrateIngredientReference(data)
  }, [api])

  const fetchSlotAlternatives = useCallback(async (slotId: string, currentMealId: string | null): Promise<Comida[]> => {
    const buildLocalFallback = async (): Promise<Comida[]> => {
      const slotTipo = (plan?.slots || []).find((slot) => slot.slot === slotId)?.tipo
      if (!slotTipo) return []

      try {
        const data = await api.loadMealsCatalog(slotTipo)
        return (data.meals || [])
          .map((meal) => normalizeMeal(meal))
          .filter((meal): meal is Comida => Boolean(meal))
          .filter((meal) => !currentMealId || meal.id !== currentMealId)
      } catch {
        return []
      }
    }

    try {
      const data = await api.loadSlotAlternatives(slotId, currentMealId)
      if (!Array.isArray(data.suggestedMeals) || data.suggestedMeals.length === 0) {
        return await buildLocalFallback()
      }

      return data.suggestedMeals
        .map((meal) => normalizeMeal(meal))
        .filter((meal): meal is Comida => Boolean(meal))
    } catch (err) {
      const fallback = await buildLocalFallback()
      if (fallback.length > 0) {
        return fallback
      }

      const message = err instanceof Error ? err.message : 'No se pudieron cargar alternativas de platillos'
      setError(message)
      return []
    }
  }, [api, plan?.slots])

  const loadShareUsers = useCallback(async () => {
    const data = await api.loadShareUsers()
    setShareUsers(data.users || [])
  }, [api])

  const createShare = useCallback(async (sharedWithUserId: string, canEdit: boolean) => {
    await api.createShare(sharedWithUserId, canEdit)

    await loadShareUsers()
  }, [api, loadShareUsers])

  const searchShareCandidates = useCallback(async (query: string) => {
    const q = query.trim()
    if (q.length < 2) {
      setShareCandidates([])
      return
    }

    await runWithAction('searchShareCandidates', async () => {
      const data = await api.searchShareCandidates(q)
      setShareCandidates(data.users || [])
      return data
    })
  }, [api, runWithAction])

  const loadInvites = useCallback(async () => {
    const [incoming, outgoing] = await Promise.all([
      api.loadIncomingInvites(),
      api.loadOutgoingInvites(),
    ])

    setIncomingInvites(incoming.invites || [])
    setOutgoingInvites(outgoing.invites || [])
  }, [api])

  const refreshShareState = useCallback(async () => {
    await Promise.all([loadInvites(), loadShareUsers()])
  }, [loadInvites, loadShareUsers])

  const sendShareInvite = useCallback(async (targetUserId: string, canEdit: boolean) => {
    await runWithAction('sendShareInvite', async () => {
      await api.sendShareInvite(targetUserId, canEdit)
      await refreshShareState()
      return true
    })
  }, [api, refreshShareState, runWithAction])

  const acceptInvite = useCallback(async (inviteId: string) => {
    await runWithAction('acceptInvite', async () => {
      await api.acceptInvite(inviteId)
      await refreshShareState()
      return true
    })
  }, [api, refreshShareState, runWithAction])

  const rejectInvite = useCallback(async (inviteId: string) => {
    await runWithAction('rejectInvite', async () => {
      await api.rejectInvite(inviteId)
      await loadInvites()
      return true
    })
  }, [api, loadInvites, runWithAction])

  const updateSharePermission = useCallback(async (sharedWithUserId: string, canEdit: boolean) => {
    await runWithAction('updateSharePermission', async () => {
      await api.updateSharePermission(sharedWithUserId, canEdit)
      await loadShareUsers()
      return true
    })
  }, [api, loadShareUsers, runWithAction])

  const deleteShare = useCallback(async (sharedWithUserId: string) => {
    await runWithAction('deleteShare', async () => {
      await api.deleteShare(sharedWithUserId)

      if (selectedShareUserId === sharedWithUserId) {
        setSelectedShareUserId('')
      }

      await loadShareUsers()
      return true
    })
  }, [api, loadShareUsers, runWithAction, selectedShareUserId])

  const loadProfile = useCallback(async () => {
    const data = await api.loadProfile()
    setProfile(data.profile)
  }, [api])

  const loadDailyEngagement = useCallback(async () => {
    const data = await api.loadDailyEngagement()
    setDailyEngagement(data.dailyEngagement || null)
    return data.dailyEngagement || null
  }, [api])

  const loadCombinedPlan = useCallback(async () => {
    if (!selectedShareUserId || viewMode !== 'combined') {
      setCombinedSlots([])
      return
    }

    await runWithAction('loadCombinedPlan', async () => {
      const data = await api.loadCombinedPlan(selectedShareUserId)
      const normalized = Array.isArray(data.combinedSlots)
        ? data.combinedSlots.map((slot) => {
          const row = slot as RawCombinedSlot
          const users: CombinedSlot['users'] = {}
          const sourceUsers = row.users || {}

          Object.keys(sourceUsers).forEach((userId) => {
            const rawMealId = sourceUsers[userId]?.mealId
            users[userId] = {
              mealId:
                typeof rawMealId === 'string'
                  ? rawMealId
                  : typeof rawMealId === 'number'
                    ? String(rawMealId)
                    : null,
              meal: normalizeMeal(sourceUsers[userId]?.meal),
              completed: Boolean(sourceUsers[userId]?.completed),
            }
          })

          return {
            slot: String(row.slot),
            day: String(row.day),
            tipo: row.tipo as TipoComida,
            hour: String(row.hour),
            users,
          }
        })
        : []

      setCombinedSlots(normalized)
      return normalized
    })
  }, [api, runWithAction, selectedShareUserId, viewMode])

  const bootstrap = useCallback(async () => {
    setIsBootstrapped(false)

    if (!session?.accessToken) {
      setProfile(null)
      setPlan(null)
      setShareUsers([])
      setCombinedSlots([])
      try {
        await loadIngredientReference()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo cargar la referencia de ingredientes'
        setError(message)
      }
      setIsBootstrapped(true)
      return
    }

    await runWithLoading(async () => {
      await Promise.all([loadProfile(), loadMyPlan(), loadShareUsers(), loadInvites(), loadIngredientReference(), loadDailyEngagement()])
      return true
    }, 'Error al cargar datos')

    setIsBootstrapped(true)
  }, [loadDailyEngagement, loadIngredientReference, loadInvites, loadMyPlan, loadProfile, loadShareUsers, runWithLoading, session?.accessToken])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  useEffect(() => {
    const onExternalRefresh = () => {
      const s = readStoredSession()
      if (s) {
        setSession(s)
        hasHandledUnauthorizedRef.current = false
      }
    }
    window.addEventListener(SESSION_REFRESH_EVENT, onExternalRefresh)
    return () => window.removeEventListener(SESSION_REFRESH_EVENT, onExternalRefresh)
  }, [])

  useEffect(() => {
    if (!session?.refreshToken || !session.expiresAt) return undefined

    const now = Math.floor(Date.now() / 1000)
    const secLeft = session.expiresAt - now - 120
    const schedule = () => {
      void refreshStoredSession(baseUrl).then((next) => {
        if (next) setSession(next)
      })
    }

    if (secLeft <= 0) {
      schedule()
      return undefined
    }

    const ms = Math.max(10_000, secLeft * 1000)
    const id = window.setTimeout(schedule, ms)
    return () => window.clearTimeout(id)
  }, [baseUrl, session?.expiresAt, session?.refreshToken])

  useEffect(() => {
    const handleUnauthorized = () => {
      if (!session?.accessToken || hasHandledUnauthorizedRef.current) return

      hasHandledUnauthorizedRef.current = true
      setError('Sesion expirada. Inicia sesion nuevamente.')
      clearSessionState()
    }

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)

    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    }
  }, [clearSessionState, session?.accessToken])

  useEffect(() => {
    void loadCombinedPlan()
  }, [loadCombinedPlan])

  const login = useCallback(async (email: string, password: string) => {
    await runWithLoading(async () => {
      const data = await api.login(email, password)

      applyAuthSession(data)
      return true
    }, 'No se pudo iniciar sesión', true)
  }, [api, applyAuthSession, runWithLoading])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const result = await runWithLoading(async () => {
      const data = await api.register(name, email, password)

      return { loggedIn: applyAuthSession(data) }
    }, 'No se pudo crear la cuenta', true)

    return result || { loggedIn: false }
  }, [api, applyAuthSession, runWithLoading])

  const logout = useCallback(async () => {
    await runWithAction('logout', async () => {
      try {
        if (session?.accessToken) {
          await api.logout()
        }
      } catch {
        // Ignore logout API failures and clear local session anyway.
      } finally {
        clearSessionState()
      }

      return true
    })
  }, [api, clearSessionState, runWithAction, session?.accessToken])

  const resetMyData = useCallback(async () => {
    return runWithAction('resetMyData', async () => {
      const data = await api.resetMyData()

      setPlan(null)
      setCombinedSlots([])
      setShareUsers([])
      setShareCandidates([])
      setIncomingInvites([])
      setOutgoingInvites([])
      setSelectedShareUserId('')
      setViewMode('my')

      return Boolean(data?.reset)
    })
  }, [api, runWithAction])

  const swapMeal = useCallback(async (slotId: string, tipo: TipoComida, currentMealId: string) => {
    void slotId
    void tipo
    void currentMealId
    setError('Intercambio manual deshabilitado. Regenera tu semana desde porciones en Nutri.')
  }, [])

  const setSlotCompleted = useCallback(async (slotId: string, completed: boolean) => {
    const data = await api.setSlotCompleted(slotId, completed)

    applyPlanPayload(data)
  }, [api, applyPlanPayload])

  const setSlotMeal = useCallback(async (slotId: string, meal: Comida, week?: string) => {
    const data = await api.setSlotMeal(slotId, meal, week || plan?.week)
    applyPlanPayload(data)
    return true
  }, [api, applyPlanPayload, plan?.week])

  const replaceIngredient = useCallback(async (slotId: string, ingredientIndex: number, nextIngredientId: string, week?: string) => {
    const data = await api.replaceIngredient(slotId, ingredientIndex, nextIngredientId, week || plan?.week)

    applyPlanPayload(data)
  }, [api, applyPlanPayload, plan?.week])

  const updateGroceryState = useCallback(async (nextState: { checked: string[]; onlyPending: boolean }) => {
    await runWithAction('updateGroceryState', async () => {
      const data = await api.updateGroceryState(nextState)
      applyPlanPayload(data)
      return true
    })
  }, [api, applyPlanPayload, runWithAction])

  const syncWeekState = useCallback(async (patch: WeekStatePatch) => {
    try {
      const payload: WeekStatePatch = patch.week
        ? patch
        : {
          ...patch,
          week: plan?.week,
        }

      const data = await api.updateWeekState(payload)
      applyPlanPayload(data)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar la semana en el backend'
      setError(message)
      return false
    }
  }, [api, applyPlanPayload, plan?.week])

  const saveDailyEngagement = useCallback(async (next: DailyEngagement) => {
    try {
      const data = await api.updateDailyEngagement(next)
      setDailyEngagement(data.dailyEngagement || next)
      return true
    } catch {
      return false
    }
  }, [api])

  const trackEvent = useCallback(async (event: string, context?: Record<string, unknown>) => {
    try {
      await api.trackEvent(event, context)
      return true
    } catch {
      return false
    }
  }, [api])

  const activeSlots = useMemo(() => {
    if (viewMode !== 'combined') {
      return plan?.slots || []
    }

    return []
  }, [plan?.slots, viewMode])

  const authActions = useMemo(() => ({
    login,
    register,
    logout,
  }), [login, logout, register])

  const shareActions = useMemo(() => ({
    createShare,
    searchShareCandidates,
    sendShareInvite,
    acceptInvite,
    rejectInvite,
    updateSharePermission,
    deleteShare,
  }), [
    acceptInvite,
    createShare,
    deleteShare,
    rejectInvite,
    searchShareCandidates,
    sendShareInvite,
    updateSharePermission,
  ])

  const planActions = useMemo(() => ({
    swapMeal,
    setSlotMeal,
    setSlotCompleted,
    replaceIngredient,
    updateGroceryState,
    syncWeekState,
    fetchSlotAlternatives,
    fetchAllMealsCatalog,
    generatePlan,
    refresh: bootstrap,
    resetMyData,
  }), [
    bootstrap,
    fetchAllMealsCatalog,
    fetchSlotAlternatives,
    generatePlan,
    resetMyData,
    replaceIngredient,
    setSlotMeal,
    setSlotCompleted,
    swapMeal,
    syncWeekState,
    updateGroceryState,
  ])

  return {
    loading,
    isBootstrapped,
    error,
    actionLoading: {
      searchShareCandidates: actionCounts.searchShareCandidates > 0,
      sendShareInvite: actionCounts.sendShareInvite > 0,
      acceptInvite: actionCounts.acceptInvite > 0,
      rejectInvite: actionCounts.rejectInvite > 0,
      updateSharePermission: actionCounts.updateSharePermission > 0,
      deleteShare: actionCounts.deleteShare > 0,
      loadCombinedPlan: actionCounts.loadCombinedPlan > 0,
      logout: actionCounts.logout > 0,
      generatePlan: actionCounts.generatePlan > 0,
      updateGroceryState: actionCounts.updateGroceryState > 0,
      resetMyData: actionCounts.resetMyData > 0,
    },
    session,
    profile,
    dailyEngagement,
    plan,
    weekState: plan?.weekState ?? null,
    activeSlots,
    combinedSlots,
    shareUsers,
    shareCandidates,
    incomingInvites,
    outgoingInvites,
    selectedShareUserId,
    setSelectedShareUserId,
    viewMode,
    setViewMode,
    ...shareActions,
    ...authActions,
    ...planActions,
    loadDailyEngagement,
    saveDailyEngagement,
    trackEvent,
  }
}
