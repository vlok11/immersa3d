// ============================================================
// Immersa 3D - Analysis Store Slice
// AI analysis state management
// ============================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

/**
 * Analysis type
 */
export type AnalysisType = 'depth' | 'segmentation' | 'detection' | 'edge';

/**
 * Analysis result base
 */
export interface AnalysisResultBase {
  type: AnalysisType;
  timestamp: number;
  processingTime: number;
}

/**
 * Depth analysis result
 */
export interface DepthAnalysisResult extends AnalysisResultBase {
  type: 'depth';
  depthMap: ImageData;
  depthTextureUrl: string;
  minDepth: number;
  maxDepth: number;
}

/**
 * Segmentation result
 */
export interface SegmentationResult extends AnalysisResultBase {
  type: 'segmentation';
  masks: Array<{
    id: string;
    label: string;
    maskData: ImageData;
    confidence: number;
    bounds: { x: number; y: number; width: number; height: number };
  }>;
}

/**
 * Detection result
 */
export interface DetectionResult extends AnalysisResultBase {
  type: 'detection';
  objects: Array<{
    id: string;
    label: string;
    confidence: number;
    bounds: { x: number; y: number; width: number; height: number };
  }>;
}

/**
 * Edge detection result
 */
export interface EdgeResult extends AnalysisResultBase {
  type: 'edge';
  edgeMap: ImageData;
  edgeTextureUrl: string;
}

export type AnalysisResult = 
  | DepthAnalysisResult 
  | SegmentationResult 
  | DetectionResult 
  | EdgeResult;

/**
 * Analysis state interface
 */
export interface AnalysisState {
  // Results cache
  results: Map<AnalysisType, AnalysisResult>;
  
  // Processing states
  running: Set<AnalysisType>;
  progress: Map<AnalysisType, number>;
  
  // Model states
  modelsLoaded: Set<string>;
  modelsLoading: Set<string>;
  
  // Actions
  setResult: (result: AnalysisResult) => void;
  clearResult: (type: AnalysisType) => void;
  clearAllResults: () => void;
  setRunning: (type: AnalysisType, running: boolean) => void;
  setProgress: (type: AnalysisType, progress: number) => void;
  setModelLoaded: (modelId: string) => void;
  setModelLoading: (modelId: string, loading: boolean) => void;
  getDepthResult: () => DepthAnalysisResult | undefined;
}

/**
 * Analysis store
 */
export const useAnalysisStore = create<AnalysisState>()(
  immer((set, get) => ({
    // Initial state
    results: new Map(),
    running: new Set(),
    progress: new Map(),
    modelsLoaded: new Set(),
    modelsLoading: new Set(),
    
    // Actions
    setResult: (result) =>
      set((state) => {
        state.results.set(result.type, result);
        state.running.delete(result.type);
        state.progress.set(result.type, 100);
      }),
    
    clearResult: (type) =>
      set((state) => {
        const result = state.results.get(type);
        
        // Revoke texture URLs
        if (result) {
          if ('depthTextureUrl' in result) {
            URL.revokeObjectURL(result.depthTextureUrl);
          }
          if ('edgeTextureUrl' in result) {
            URL.revokeObjectURL(result.edgeTextureUrl);
          }
        }
        
        state.results.delete(type);
        state.progress.delete(type);
      }),
    
    clearAllResults: () =>
      set((state) => {
        // Cleanup all texture URLs
        for (const result of state.results.values()) {
          if ('depthTextureUrl' in result) {
            URL.revokeObjectURL(result.depthTextureUrl);
          }
          if ('edgeTextureUrl' in result) {
            URL.revokeObjectURL(result.edgeTextureUrl);
          }
        }
        
        state.results.clear();
        state.progress.clear();
        state.running.clear();
      }),
    
    setRunning: (type, running) =>
      set((state) => {
        if (running) {
          state.running.add(type);
          state.progress.set(type, 0);
        } else {
          state.running.delete(type);
        }
      }),
    
    setProgress: (type, progress) =>
      set((state) => {
        state.progress.set(type, progress);
      }),
    
    setModelLoaded: (modelId) =>
      set((state) => {
        state.modelsLoaded.add(modelId);
        state.modelsLoading.delete(modelId);
      }),
    
    setModelLoading: (modelId, loading) =>
      set((state) => {
        if (loading) {
          state.modelsLoading.add(modelId);
        } else {
          state.modelsLoading.delete(modelId);
        }
      }),
    
    getDepthResult: () => get().results.get('depth') as DepthAnalysisResult | undefined,
  }))
);

// Non-React access
export const getAnalysisState = useAnalysisStore.getState;
export const setAnalysisState = useAnalysisStore.setState;
