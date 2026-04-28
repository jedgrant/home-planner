import { create } from 'zustand'

export type UserRole = 'parent' | 'child'

export interface AuthUser {
  uid: string
  displayName: string
  email: string
  photoUrl: string | null
  familyId: string | null
  role: UserRole | null
}

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  clear: () => set({ user: null, isLoading: false }),
}))
