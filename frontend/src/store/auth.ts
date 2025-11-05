import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/lib/api';
import type { User, Tenant, LoginForm, RegisterForm } from '@/types';

interface AuthState {
  // State
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (data: LoginForm) => Promise<void>;
  register: (data: RegisterForm) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      tenant: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (data: LoginForm) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await apiClient.login(data);
          
          set({
            user: response.user as User,
            tenant: response.tenant as Tenant,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Login failed',
            isLoading: false,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      register: async (data: RegisterForm) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await apiClient.register(data);
          
          set({
            user: response.user as User,
            tenant: response.tenant as Tenant,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Registration failed',
            isLoading: false,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      logout: () => {
        apiClient.logout();
        set({
          user: null,
          tenant: null,
          isAuthenticated: false,
          error: null,
        });
      },

      refreshProfile: async () => {
        try {
          set({ isLoading: true });
          
          const profile = await apiClient.getProfile();
          
          set({
            user: profile.user,
            tenant: profile.tenant,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          // If refresh fails, user is likely not authenticated
          set({
            user: null,
            tenant: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      clearError: () => set({ error: null }),
      
      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);