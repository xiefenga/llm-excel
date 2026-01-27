import { create } from "zustand";
import type { components } from "~/types/api";

type UserInfo = components["schemas"]["UserInfo"];

interface AuthState {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: UserInfo | null) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),
  clearUser: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),
  setLoading: (loading) =>
    set({
      isLoading: loading,
    }),
}));
