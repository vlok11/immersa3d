import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import { getEventBus } from '@/core/EventBus';
import { CameraConfigEvents, ConfigEvents } from '@/core/EventTypes';
import { DEFAULT_SCENE_CONFIG } from '@/shared/config/defaultSceneConfig';
import { CameraMode, CameraMotionType, ProjectionMode } from '@/shared/types';

import type { SceneConfig } from '@/shared/types';
import type { StateCreator } from 'zustand';

interface SceneStore {
  config: SceneConfig;
  resetConfig: () => void;
  resetViewConfig: () => void;
  setConfig: (
    updater: Partial<SceneConfig> | ((prev: SceneConfig) => Partial<SceneConfig>)
  ) => void;
}

const createSceneSlice: StateCreator<SceneStore, [], [], SceneStore> = (set, get) => ({
  config: DEFAULT_CONFIG,
  setConfig: (updater) => {
    const oldConfig = get().config;
    const changes = typeof updater === 'function' ? updater(oldConfig) : updater;

    if (!hasSceneConfigChanges(oldConfig, changes)) return;

    const nextChanges: Partial<SceneConfig> = { ...changes };

    if (nextChanges.projectionMode !== undefined) {
      const immersiveModes = [
        ProjectionMode.INFINITE_BOX,
        ProjectionMode.CORNER,
        ProjectionMode.CUBE,
        ProjectionMode.PANORAMA,
        ProjectionMode.SPHERE,
        ProjectionMode.DOME,
        ProjectionMode.CYLINDER,
      ];
      const shouldImmersive = immersiveModes.includes(nextChanges.projectionMode);

      nextChanges.isImmersive = shouldImmersive;
      if (shouldImmersive) {
        nextChanges.cameraMode = CameraMode.PERSPECTIVE;
      }
    }

    const newConfig = { ...oldConfig, ...nextChanges };

    set({ config: newConfig });

    const bus = getEventBus();

    if (nextChanges.fov !== undefined && nextChanges.fov !== oldConfig.fov) {
      console.log('[sharedStore] Emitting FOV_CHANGED:', nextChanges.fov);
      bus.emit(CameraConfigEvents.FOV_CHANGED, { fov: nextChanges.fov });
    }

    if (nextChanges.orthoZoom !== undefined && nextChanges.orthoZoom !== oldConfig.orthoZoom) {
      console.log('[sharedStore] Emitting ORTHO_ZOOM_CHANGED:', nextChanges.orthoZoom);
      bus.emit(CameraConfigEvents.ORTHO_ZOOM_CHANGED, { orthoZoom: nextChanges.orthoZoom });
    }

    if (nextChanges.cameraMode !== undefined && nextChanges.cameraMode !== oldConfig.cameraMode) {
      console.log('[sharedStore] Emitting CAMERA_MODE_CHANGED:', nextChanges.cameraMode);
      bus.emit(CameraConfigEvents.CAMERA_MODE_CHANGED, {
        mode: nextChanges.cameraMode === CameraMode.PERSPECTIVE ? 'perspective' : 'orthographic',
        previousMode: oldConfig.cameraMode === CameraMode.PERSPECTIVE ? 'perspective' : 'orthographic',
      });
    }

    bus.emit(ConfigEvents.CHANGED, {
      changes: nextChanges as Partial<Record<string, unknown>>,
      oldConfig: oldConfig as unknown as Partial<Record<string, unknown>>,
      newConfig: newConfig as unknown as Partial<Record<string, unknown>>,
    });
  },
  resetConfig: () => {
    const oldConfig = get().config;

    set({ config: DEFAULT_CONFIG });
    getEventBus().emit(ConfigEvents.RESET, {
      oldConfig: oldConfig as unknown as Partial<Record<string, unknown>>,
      newConfig: DEFAULT_CONFIG as unknown as Partial<Record<string, unknown>>,
    });
  },
  resetViewConfig: () => {
    const oldConfig = get().config;
    const viewChanges = {
      cameraMotionType: CameraMotionType.STATIC,
      isImmersive: false,
      fov: 50,  // 与 DEFAULT_SCENE_CONFIG 保持一致
    };

    if (!hasSceneConfigChanges(oldConfig, viewChanges)) return;
    set((state) => ({
      config: { ...state.config, ...viewChanges },
    }));
    getEventBus().emit(ConfigEvents.CHANGED, {
      changes: viewChanges as Partial<Record<string, unknown>>,
      oldConfig: oldConfig as unknown as Partial<Record<string, unknown>>,
      newConfig: { ...oldConfig, ...viewChanges } as unknown as Partial<Record<string, unknown>>,
    });
  },
});
const DEFAULT_CONFIG: SceneConfig = DEFAULT_SCENE_CONFIG;
const hasSceneConfigChanges = (oldConfig: SceneConfig, changes: Partial<SceneConfig>): boolean => {
  for (const key of Object.keys(changes) as (keyof SceneConfig)[]) {
    if (!Object.is(oldConfig[key], changes[key])) return true;
  }

  return false;
};

export const useCameraMotionType = () => useSceneStore((s) => s.config.cameraMotionType);
export const useDisplacementScale = () => useSceneStore((s) => s.config.displacementScale);
export const useIsImmersive = () => useSceneStore((s) => s.config.isImmersive);
export const useProjectionMode = () => useSceneStore((s) => s.config.projectionMode);
export const useRenderStyle = () => useSceneStore((s) => s.config.renderStyle);
export const useSceneStore = create<SceneStore>()(
  devtools(
    subscribeWithSelector((...a) => ({
      ...createSceneSlice(...a),
    })),
    { name: 'SceneStore', enabled: import.meta.env.DEV }
  )
);
