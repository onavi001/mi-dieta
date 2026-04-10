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
    return runWithAction('generatePlan', async () => {
      const data = await api.generatePlan()
      applyPlanPayload(data)
      return normalizePlan(data.plan)
    })
  }, [api, applyPlanPayload, runWithAction])

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
    },
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
