// ============================================================
// Immersa 3D - App Store Slice
// Global application state
// ============================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { RenderBackend } from '../../core/context';

/**
 * Theme mode
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Application error
 */
export interface AppError {
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: number;
  dismissed: boolean;
}

/**
 * App state interface
 */
export interface AppState {
  // Initialization
  initialized: boolean;
  renderBackend: RenderBackend | null;
  
  // UI state
  theme: ThemeMode;
  sidebarOpen: boolean;
  activePanel: string | null;
  
  // Loading states
  loading: {
    app: boolean;
    media: boolean;
    analysis: boolean;
    export: boolean;
  };
  
  // Errors
  errors: AppError[];
  
  // Actions
  setInitialized: (initialized: boolean, backend: RenderBackend) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleSidebar: () => void;
  setActivePanel: (panel: string | null) => void;
  setLoading: (key: keyof AppState['loading'], value: boolean) => void;
  addError: (message: string, severity: AppError['severity']) => void;
  dismissError: (id: string) => void;
  clearErrors: () => void;
}

/**
 * App store with Immer middleware
 */
export const useAppStore = create<AppState>()(
  immer((set) => ({
    // Initial state
    initialized: false,
    renderBackend: null,
    theme: 'dark',
    sidebarOpen: true,
    activePanel: null,
    loading: {
      app: true,
      media: false,
      analysis: false,
      export: false,
    },
    errors: [],
    
    // Actions
    setInitialized: (initialized, backend) =>
      set((state) => {
        state.initialized = initialized;
        state.renderBackend = backend;
        state.loading.app = false;
      }),
    
    setTheme: (theme) =>
      set((state) => {
        state.theme = theme;
      }),
    
    toggleSidebar: () =>
      set((state) => {
        state.sidebarOpen = !state.sidebarOpen;
      }),
    
    setActivePanel: (panel) =>
      set((state) => {
        state.activePanel = panel;
      }),
    
    setLoading: (key, value) =>
      set((state) => {
        state.loading[key] = value;
      }),
    
    addError: (message, severity) =>
      set((state) => {
        state.errors.push({
          id: `error_${Date.now()}`,
          message,
          severity,
          timestamp: Date.now(),
          dismissed: false,
        });
      }),
    
    dismissError: (id) =>
      set((state) => {
        const error = state.errors.find((e) => e.id === id);
        if (error) {
          error.dismissed = true;
        }
      }),
    
    clearErrors: () =>
      set((state) => {
        state.errors = [];
      }),
  }))
);

// Non-React access (for WebWorker or vanilla JS)
export const getAppState = useAppStore.getState;
export const setAppState = useAppStore.setState;
