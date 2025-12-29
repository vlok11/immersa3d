// ============================================================
// Immersa 3D - Media Store Slice
// Media input state management
// ============================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

/**
 * Media source type
 */
export type MediaSourceType = 'upload' | 'url' | 'camera';

/**
 * Media info
 */
export interface MediaInfo {
  id: string;
  type: 'image' | 'video';
  sourceType: MediaSourceType;
  originalName: string;
  mimeType: string;
  width: number;
  height: number;
  fileSize: number;
  dataUrl: string; // Base64 or object URL
  createdAt: number;
}

/**
 * Media state interface
 */
export interface MediaState {
  // Current media
  currentMedia: MediaInfo | null;
  
  // Processing states
  processing: boolean;
  processingStep: string;
  
  // History (for undo/redo)
  history: MediaInfo[];
  historyIndex: number;
  
  // Actions
  setMedia: (media: MediaInfo) => void;
  clearMedia: () => void;
  setProcessing: (processing: boolean, step?: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

/**
 * Media store
 */
export const useMediaStore = create<MediaState>()(
  immer((set, get) => ({
    // Initial state
    currentMedia: null,
    processing: false,
    processingStep: '',
    history: [],
    historyIndex: -1,
    
    // Actions
    setMedia: (media) =>
      set((state) => {
        // Add to history
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(media);
        
        // Limit history size
        if (newHistory.length > 20) {
          newHistory.shift();
        }
        
        state.currentMedia = media;
        state.history = newHistory;
        state.historyIndex = newHistory.length - 1;
      }),
    
    clearMedia: () =>
      set((state) => {
        // Revoke object URLs to prevent memory leaks
        if (state.currentMedia?.dataUrl.startsWith('blob:')) {
          URL.revokeObjectURL(state.currentMedia.dataUrl);
        }
        
        state.currentMedia = null;
        state.processing = false;
        state.processingStep = '';
      }),
    
    setProcessing: (processing, step = '') =>
      set((state) => {
        state.processing = processing;
        state.processingStep = step;
      }),
    
    undo: () =>
      set((state) => {
        if (state.historyIndex > 0) {
          state.historyIndex -= 1;
          state.currentMedia = state.history[state.historyIndex];
        }
      }),
    
    redo: () =>
      set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex += 1;
          state.currentMedia = state.history[state.historyIndex];
        }
      }),
    
    canUndo: () => get().historyIndex > 0,
    canRedo: () => get().historyIndex < get().history.length - 1,
  }))
);

// Non-React access
export const getMediaState = useMediaStore.getState;
export const setMediaState = useMediaStore.setState;
