// ============================================================
// Immersa 3D - Viewport Store Slice
// 3D viewport and camera state management
// ============================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

/**
 * Projection mode
 */
export type ProjectionMode = 'planar' | 'cylindrical' | 'spherical' | 'cubemap' | 'parallax' | 'pointcloud';

/**
 * Camera mode
 */
export type CameraMode = 'orbit' | 'firstPerson' | 'fly';

/**
 * Camera state
 */
export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  near: number;
  far: number;
}

/**
 * Viewport state interface
 */
export interface ViewportState {
  // Viewport dimensions
  width: number;
  height: number;
  pixelRatio: number;
  
  // Projection settings
  projectionMode: ProjectionMode;
  
  // Camera
  cameraMode: CameraMode;
  camera: CameraState;
  
  // Depth mesh settings
  depthIntensity: number;
  meshSubdivisions: number;
  
  // Display
  showGrid: boolean;
  showStats: boolean;
  wireframe: boolean;
  
  // Actions
  setViewportSize: (width: number, height: number, pixelRatio?: number) => void;
  setProjectionMode: (mode: ProjectionMode) => void;
  setCameraMode: (mode: CameraMode) => void;
  updateCamera: (partial: Partial<CameraState>) => void;
  resetCamera: () => void;
  setDepthIntensity: (intensity: number) => void;
  setMeshSubdivisions: (subdivisions: number) => void;
  toggleGrid: () => void;
  toggleStats: () => void;
  toggleWireframe: () => void;
}

/**
 * Default camera state
 */
const DEFAULT_CAMERA: CameraState = {
  position: [0, 0, 3],
  target: [0, 0, 0],
  fov: 50,
  near: 0.1,
  far: 1000,
};

/**
 * Viewport store
 */
export const useViewportStore = create<ViewportState>()(
  immer((set) => ({
    // Initial state
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio, 2),
    
    projectionMode: 'planar',
    cameraMode: 'orbit',
    camera: { ...DEFAULT_CAMERA },
    
    depthIntensity: 0.5,
    meshSubdivisions: 128,
    
    showGrid: true,
    showStats: false,
    wireframe: false,
    
    // Actions
    setViewportSize: (width, height, pixelRatio) =>
      set((state) => {
        state.width = width;
        state.height = height;
        if (pixelRatio !== undefined) {
          state.pixelRatio = Math.min(pixelRatio, 2);
        }
      }),
    
    setProjectionMode: (mode) =>
      set((state) => {
        state.projectionMode = mode;
      }),
    
    setCameraMode: (mode) =>
      set((state) => {
        state.cameraMode = mode;
      }),
    
    updateCamera: (partial) =>
      set((state) => {
        Object.assign(state.camera, partial);
      }),
    
    resetCamera: () =>
      set((state) => {
        state.camera = { ...DEFAULT_CAMERA };
      }),
    
    setDepthIntensity: (intensity) =>
      set((state) => {
        state.depthIntensity = Math.max(0, Math.min(2, intensity));
      }),
    
    setMeshSubdivisions: (subdivisions) =>
      set((state) => {
        state.meshSubdivisions = Math.max(8, Math.min(512, subdivisions));
      }),
    
    toggleGrid: () =>
      set((state) => {
        state.showGrid = !state.showGrid;
      }),
    
    toggleStats: () =>
      set((state) => {
        state.showStats = !state.showStats;
      }),
    
    toggleWireframe: () =>
      set((state) => {
        state.wireframe = !state.wireframe;
      }),
  }))
);

// Non-React access
export const getViewportState = useViewportStore.getState;
export const setViewportState = useViewportStore.setState;
