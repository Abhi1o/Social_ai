import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme, DashboardWidget, NotificationPreferences } from '@/types';

interface UIState {
  // Theme
  theme: Theme;
  setTheme: (theme: Partial<Theme>) => void;
  toggleTheme: () => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Command Palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;

  // Dashboard
  dashboardWidgets: DashboardWidget[];
  setDashboardWidgets: (widgets: DashboardWidget[]) => void;
  addDashboardWidget: (widget: DashboardWidget) => void;
  removeDashboardWidget: (widgetId: string) => void;
  updateDashboardWidget: (widgetId: string, updates: Partial<DashboardWidget>) => void;

  // Notifications
  notificationPreferences: NotificationPreferences;
  setNotificationPreferences: (preferences: NotificationPreferences) => void;

  // Loading states
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  // Modals
  modals: Record<string, boolean>;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  toggleModal: (modalId: string) => void;

  // Mobile
  isMobile: boolean;
  setIsMobile: (mobile: boolean) => void;

  // Preferences
  language: string;
  setLanguage: (language: string) => void;
  
  timezone: string;
  setTimezone: (timezone: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Theme
      theme: {
        mode: 'auto',
        primaryColor: '#6366f1',
        accentColor: '#8b5cf6',
        borderRadius: 12,
        fontSize: 'medium',
      },
      setTheme: (theme) => set((state) => ({ theme: { ...state.theme, ...theme } })),
      toggleTheme: () => set((state) => ({
        theme: {
          ...state.theme,
          mode: state.theme.mode === 'light' ? 'dark' : 'light',
        },
      })),

      // Sidebar
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      // Command Palette
      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

      // Dashboard
      dashboardWidgets: [
        {
          id: 'ai-insights',
          type: 'ai_insights',
          title: 'AI Insights',
          size: 'large',
          position: { x: 0, y: 0 },
          isVisible: true,
        },
        {
          id: 'quick-composer',
          type: 'quick_composer',
          title: 'Quick Composer',
          size: 'medium',
          position: { x: 1, y: 0 },
          isVisible: true,
        },
        {
          id: 'schedule-preview',
          type: 'schedule_preview',
          title: 'Today\'s Schedule',
          size: 'medium',
          position: { x: 0, y: 1 },
          isVisible: true,
        },
        {
          id: 'performance-snapshot',
          type: 'performance_snapshot',
          title: 'Performance Snapshot',
          size: 'large',
          position: { x: 1, y: 1 },
          isVisible: true,
        },
      ],
      setDashboardWidgets: (widgets) => set({ dashboardWidgets: widgets }),
      addDashboardWidget: (widget) => set((state) => ({
        dashboardWidgets: [...state.dashboardWidgets, widget],
      })),
      removeDashboardWidget: (widgetId) => set((state) => ({
        dashboardWidgets: state.dashboardWidgets.filter(w => w.id !== widgetId),
      })),
      updateDashboardWidget: (widgetId, updates) => set((state) => ({
        dashboardWidgets: state.dashboardWidgets.map(w =>
          w.id === widgetId ? { ...w, ...updates } : w
        ),
      })),

      // Notifications
      notificationPreferences: {
        email: true,
        push: true,
        inApp: true,
        digest: 'daily',
        types: [],
      },
      setNotificationPreferences: (preferences) => set({ notificationPreferences: preferences }),

      // Loading states
      globalLoading: false,
      setGlobalLoading: (loading) => set({ globalLoading: loading }),

      // Modals
      modals: {},
      openModal: (modalId) => set((state) => ({
        modals: { ...state.modals, [modalId]: true },
      })),
      closeModal: (modalId) => set((state) => ({
        modals: { ...state.modals, [modalId]: false },
      })),
      toggleModal: (modalId) => set((state) => ({
        modals: { ...state.modals, [modalId]: !state.modals[modalId] },
      })),

      // Mobile
      isMobile: false,
      setIsMobile: (mobile) => set({ isMobile: mobile }),

      // Preferences
      language: 'en',
      setLanguage: (language) => set({ language }),
      
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      setTimezone: (timezone) => set({ timezone }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        dashboardWidgets: state.dashboardWidgets,
        notificationPreferences: state.notificationPreferences,
        language: state.language,
        timezone: state.timezone,
      }),
    }
  )
);