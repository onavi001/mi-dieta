import type {
  AuthPayload,
  AuthProfile,
  RawCombinedSlot,
  RawMeal,
  RawPlan,
  ShareCandidate,
  ShareInvite,
  ShareUser,
  WeekStatePatch,
} from './model'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

type DietApiRequest = <T>(
  path: string,
  method?: HttpMethod,
  body?: unknown,
) => Promise<T>

export function createDietApiClient(request: DietApiRequest) {
  return {
    login: (email: string, password: string) => request<AuthPayload>('/api/auth/login', 'POST', { email, password }),
    register: (name: string, email: string, password: string) => request<AuthPayload>('/api/auth/register', 'POST', { name, email, password }),
    logout: () => request('/api/auth/logout', 'POST'),

    loadProfile: () => request<{ profile: AuthProfile }>('/api/users/me/profile'),

    loadMyPlan: () => request<{ plan: RawPlan | null }>('/api/plans/my'),
    generatePlan: () => request<{ plan: RawPlan | null }>('/api/plans/my/generate', 'POST', {}),
    loadSlotAlternatives: (slotId: string, currentMealId: string | null) => request<{
      slotId: string
      currentMealId: string | null
      suggestedMeals: RawMeal[]
    }>('/api/plans/my/alternatives', 'POST', {
      slotId,
      currentMealId,
    }),
    setSlotCompleted: (slotId: string, completed: boolean) => request<{ plan: RawPlan | null }>('/api/plans/my/complete', 'PUT', {
      slot: slotId,
      completed,
    }),
    replaceIngredient: (slotId: string, ingredientIndex: number, nextIngredientId: string, week?: string) => request<{ plan: RawPlan | null }>('/api/plans/my/ingredient', 'PUT', {
      slot: slotId,
      ingredientIndex,
      nextIngredientId,
      week,
    }),
    updateGroceryState: (nextState: { checked: string[]; onlyPending: boolean }) => request<{ plan: RawPlan | null }>('/api/plans/my/grocery', 'PUT', {
      groceryState: nextState,
    }),
    updateWeekState: (patch: WeekStatePatch) => request<{ plan: RawPlan | null }>('/api/plans/my/week-state', 'PUT', patch),
    loadCombinedPlan: (sharedUserId: string) => request<{ combinedSlots: RawCombinedSlot[] }>(`/api/plans/combined/${sharedUserId}`),

    loadShareUsers: () => request<{ users: ShareUser[] }>('/api/shares/my/users'),
    createShare: (sharedWithUserId: string, canEdit: boolean) => request<{ share: unknown }>('/api/shares', 'POST', {
      sharedWithUserId,
      canEdit,
    }),
    searchShareCandidates: (query: string) => request<{ users: ShareCandidate[] }>(`/api/shares/search?q=${encodeURIComponent(query)}`),
    loadIncomingInvites: () => request<{ invites: ShareInvite[] }>('/api/shares/invites/incoming'),
    loadOutgoingInvites: () => request<{ invites: ShareInvite[] }>('/api/shares/invites/outgoing'),
    sendShareInvite: (targetUserId: string, canEdit: boolean) => request<{ invite: ShareInvite }>('/api/shares/invites', 'POST', {
      targetUserId,
      canEdit,
    }),
    acceptInvite: (inviteId: string) => request<{ accepted: boolean }>(`/api/shares/invites/${inviteId}/accept`, 'POST'),
    rejectInvite: (inviteId: string) => request<{ rejected: boolean }>(`/api/shares/invites/${inviteId}/reject`, 'POST'),
    updateSharePermission: (sharedWithUserId: string, canEdit: boolean) => request<{ share: unknown }>(`/api/shares/${sharedWithUserId}`, 'PUT', {
      canEdit,
    }),
    deleteShare: (sharedWithUserId: string) => request<{ deleted: boolean }>(`/api/shares/${sharedWithUserId}`, 'DELETE'),
  }
}