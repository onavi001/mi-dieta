import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Comida, TipoComida } from '../data/types'
import { getApiBaseUrl } from '../utils/apiBaseUrl'
import { getCuratedExpandedMealsByType } from '../data/curatedMealCatalog'
import { createDietApiClient } from './dietApi/client'
import {
  type ApiResponse,
  type ApiSession,
  type AuthPayload,
  type AuthProfile,
  type CombinedSlot,
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

export type { DietSlot, CombinedSlot, WeekPlan, WeekState, WeekStatePatch } from './dietApi/model'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export function useDietApi() {
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const baseUrl = useMemo(() => getApiBaseUrl(), [])

  const request = useCallback(async <T>(
    path: string,
    method: HttpMethod = 'GET',
    body?: unknown,
    tokenOverride?: string
  ): Promise<T> => {
    const token = tokenOverride || session?.accessToken
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    const payload = (await response.json()) as ApiResponse<T>

    if (!response.ok || !payload.ok || payload.data === undefined) {
      throw new Error(payload.error || 'Request failed')
    }

    return payload.data
  }, [baseUrl, session?.accessToken])

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

  const applyAuthSession = useCallback((data: AuthPayload) => {
    if (!data.session?.access_token) {
      return false
    }

    const nextSession: ApiSession = {
      accessToken: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    }

    writeStoredSession(nextSession)
    setSession(nextSession)
    return true
  }, [])

  const applyPlanPayload = useCallback((payload: { plan: RawPlan | null }) => {
    setPlan(normalizePlan(payload.plan))
  }, [])

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
  }, [])

  const loadMyPlan = useCallback(async () => {
    const data = await api.loadMyPlan()
    applyPlanPayload(data)
  }, [api, applyPlanPayload])

  const generatePlan = useCallback(async () => {
    const data = await api.generatePlan()
    applyPlanPayload(data)
    return normalizePlan(data.plan)
  }, [api, applyPlanPayload])

  const fetchSlotAlternatives = useCallback(async (slotId: string, currentMealId: string | null): Promise<Comida[]> => {
    const buildLocalFallback = (): Comida[] => {
      const slotTipo = (plan?.slots || []).find((slot) => slot.slot === slotId)?.tipo
      if (!slotTipo) return []

      return getCuratedExpandedMealsByType(slotTipo)
        .filter((meal) => !currentMealId || meal.id !== currentMealId)
    }

    try {
      const data = await api.loadSlotAlternatives(slotId, currentMealId)
      if (!Array.isArray(data.suggestedMeals) || data.suggestedMeals.length === 0) {
        return buildLocalFallback()
      }

      return data.suggestedMeals
        .map((meal) => normalizeMeal(meal))
        .filter((meal): meal is Comida => Boolean(meal))
    } catch (err) {
      const fallback = buildLocalFallback()
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

    const data = await api.searchShareCandidates(q)
    setShareCandidates(data.users || [])
  }, [api])

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
    await api.sendShareInvite(targetUserId, canEdit)

    await refreshShareState()
  }, [api, refreshShareState])

  const acceptInvite = useCallback(async (inviteId: string) => {
    await api.acceptInvite(inviteId)
    await refreshShareState()
  }, [api, refreshShareState])

  const rejectInvite = useCallback(async (inviteId: string) => {
    await api.rejectInvite(inviteId)
    await loadInvites()
  }, [api, loadInvites])

  const updateSharePermission = useCallback(async (sharedWithUserId: string, canEdit: boolean) => {
    await api.updateSharePermission(sharedWithUserId, canEdit)

    await loadShareUsers()
  }, [api, loadShareUsers])

  const deleteShare = useCallback(async (sharedWithUserId: string) => {
    await api.deleteShare(sharedWithUserId)

    if (selectedShareUserId === sharedWithUserId) {
      setSelectedShareUserId('')
    }

    await loadShareUsers()
  }, [api, loadShareUsers, selectedShareUserId])

  const loadProfile = useCallback(async () => {
    const data = await api.loadProfile()
    setProfile(data.profile)
  }, [api])

  const loadCombinedPlan = useCallback(async () => {
    if (!selectedShareUserId || viewMode !== 'combined') {
      setCombinedSlots([])
      return
    }

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
  }, [api, selectedShareUserId, viewMode])

  const bootstrap = useCallback(async () => {
    if (!session?.accessToken) {
      setProfile(null)
      setPlan(null)
      setShareUsers([])
      setCombinedSlots([])
      return
    }

    await runWithLoading(async () => {
      await Promise.all([loadProfile(), loadMyPlan(), loadShareUsers(), loadInvites()])
      return true
    }, 'Error al cargar datos')
  }, [loadInvites, loadMyPlan, loadProfile, loadShareUsers, runWithLoading, session?.accessToken])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

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
    try {
      if (session?.accessToken) {
        await api.logout()
      }
    } catch {
      // Ignore logout API failures and clear local session anyway.
    } finally {
      clearSessionState()
    }
  }, [api, clearSessionState, session?.accessToken])

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

  const replaceIngredient = useCallback(async (slotId: string, ingredientIndex: number, nextIngredientId: string, week?: string) => {
    const data = await api.replaceIngredient(slotId, ingredientIndex, nextIngredientId, week)

    applyPlanPayload(data)
  }, [api, applyPlanPayload])

  const updateGroceryState = useCallback(async (nextState: { checked: string[]; onlyPending: boolean }) => {
    const data = await api.updateGroceryState(nextState)

    applyPlanPayload(data)
  }, [api, applyPlanPayload])

  const syncWeekState = useCallback(async (patch: WeekStatePatch) => {
    try {
      const data = await api.updateWeekState(patch)
      applyPlanPayload(data)
      return true
    } catch {
      // Sync failures are non-critical; local state is the source of truth until next load.
      return false
    }
  }, [api, applyPlanPayload])

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
    setSlotCompleted,
    replaceIngredient,
    updateGroceryState,
    syncWeekState,
    fetchSlotAlternatives,
    generatePlan,
    refresh: bootstrap,
  }), [
    bootstrap,
    fetchSlotAlternatives,
    generatePlan,
    replaceIngredient,
    setSlotCompleted,
    swapMeal,
    syncWeekState,
    updateGroceryState,
  ])

  return {
    loading,
    error,
    session,
    profile,
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
  }
}
