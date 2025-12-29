// ============================================================
// Immersa 3D - Event Bus
// Strongly-typed event system based on mitt
// ============================================================

import mitt from 'mitt';

/**
 * Registry event types
 */
interface RegistryEvents {
  'module:registered': { moduleId: string };
  'module:activated': { moduleId: string };
  'module:deactivated': { moduleId: string };
  'module:disposed': { moduleId: string };
  'module:error': { moduleId: string; error: Error };
}

/**
 * Application-wide event types
 */
type Events = {
  // Registry events
  'module:registered': { moduleId: string };
  'module:activated': { moduleId: string };
  'module:deactivated': { moduleId: string };
  'module:disposed': { moduleId: string };
  'module:error': { moduleId: string; error: Error };
  
  // Media events
  'media:uploaded': { file: File; width: number; height: number };
  'media:processed': { imageData: ImageData };
  'media:cleared': undefined;

  // AI Analysis events
  'analysis:started': { type: 'depth' | 'segmentation' | 'detection' };
  'analysis:progress': { type: string; progress: number };
  'analysis:completed': { type: string; result: unknown };
  'analysis:error': { type: string; error: Error };

  // 3D Viewport events
  'viewport:ready': undefined;
  'viewport:resize': { width: number; height: number };
  'viewport:render': { deltaTime: number };

  // Camera events
  'camera:changed': { position: [number, number, number]; target: [number, number, number] };
  'camera:reset': undefined;
  'camera:modeChange': { mode: string };
  'camera:modeChanged': { mode: string };
  'camera:configUpdated': { config: unknown };
  'camera:transitionRequest': { position: [number, number, number]; lookAt: [number, number, number]; duration: number };
  'camera:transitionStart': Record<string, never>;
  'camera:transitionEnd': Record<string, never>;
  'camera:pointerLocked': Record<string, never>;
  'camera:pointerUnlocked': Record<string, never>;

  // Export events
  'export:started': { jobId: string; format: string };
  'export:progress': { jobId: string; progress: number; status?: string };
  'export:completed': { jobId: string; outputUrl: string };
  'export:failed': { jobId: string; error: string };
  'export:cancelled': { jobId: string };

  // Post Processing events
  'postprocess:configUpdate': { config: unknown };
  'postprocess:configChanged': { config: unknown };
  'postprocess:effectEnabled': { effect: string };
  'postprocess:effectDisabled': { effect: string };

  // Atmosphere events
  'atmosphere:configUpdate': { config: unknown };
  'atmosphere:configChanged': { config: unknown };
  'atmosphere:presetApplied': { preset: string };

  // Motion events (AutoMotionModule)
  'motion:play': { pathId?: string } | undefined;
  'motion:pause': undefined;
  'motion:stop': undefined;
  'motion:seek': { time: number };
  'motion:configChanged': { config: unknown };
  'motion:pathRegistered': { pathId: string };
  'motion:pathRemoved': { pathId: string };
  'motion:pathUpdated': { pathId: string };
  'motion:keyframeAdded': { pathId: string; time?: number; keyframe?: unknown };
  'motion:keyframeRemoved': { pathId: string; time?: number; index?: number };
  'motion:keyframeUpdated': { pathId: string; time?: number; index?: number };
  'motion:keyframeSelected': { pathId: string; index: number; keyframe: unknown };
  'motion:playbackStarted': { pathId: string };
  'motion:playbackPaused': { pathId: string; time?: number };
  'motion:playbackStopped': { pathId: string };
  'motion:playbackCompleted': { pathId: string };
  'motion:playbackProgress': { pathId: string; time: number; progress: number };
  'motion:seeked': { pathId: string; time: number };
  'motion:stateApplied': { pathId?: string; time?: number; position?: unknown; lookAt?: unknown; fov?: number };
  'motion:timelineToggled': { visible?: boolean; active?: boolean };
  'motion:pathEditorToggled': { visible?: boolean; active?: boolean };

  // Timeline events
  'timeline:play': { time?: number } | undefined;
  'timeline:pause': { time?: number } | undefined;
  'timeline:stop': { time?: number } | undefined;
  'timeline:seek': { time: number };
  'timeline:complete': { time?: number } | undefined;

  // Geometry events
  'geometry:subdivisionChange': { level: number };
  'geometry:subdivisionChanged': { level: number };
  'geometry:subdivisionStart': { level: number };
  'geometry:subdivisionComplete': { level: number; vertexCount: number };
  'geometry:subdivisionError': { level: number; error: string };
  'geometry:displacementUpdate': { scale: number; bias: number };
  'geometry:normalMapGenerationStart': { quality: string };
  'geometry:normalMapGenerated': { resolution: number; quality: string };
  'geometry:configChanged': { config: unknown };

  // Material events
  'material:paramsUpdate': { params: unknown };
  'material:paramsChanged': { params: unknown };
  'material:paramsReset': { params: unknown };
  'material:presetApply': { presetId: string };
  'material:presetApplied': { presetId: string; params: unknown };

  // Naked3D events
  'naked3d:setInputSource': { source: string };
  'naked3d:setIntensity': { intensity: number };
  'naked3d:toggle': undefined;
  'naked3d:activated': Record<string, never>;
  'naked3d:deactivated': Record<string, never>;
  'naked3d:inputSourceChanged': { source: string };
  'naked3d:offsetUpdate': { offset: { x: number; y: number } };
  'naked3d:configChanged': { config: unknown };
  'gyroscope:started': Record<string, never>;
  'gyroscope:stopped': Record<string, never>;
  'gyroscope:update': { offset: { x: number; y: number } };
  'mouseTracker:started': Record<string, never>;
  'mouseTracker:stopped': Record<string, never>;
  'mouseTracker:update': { offset: { x: number; y: number } };

  // Hologram events
  'hologram:setDisplayType': { type: string };
  'hologram:setViewCount': { count: number };
  'hologram:startEncoding': undefined;
  'hologram:stopEncoding': undefined;
  'hologram:activated': Record<string, never>;
  'hologram:deactivated': Record<string, never>;
  'hologram:rotationChanged': { rotation: number };
  'hologram:rotationUpdate': { rotation: number };
  'hologram:configChanged': { config: unknown };
  'hologram:encodingStarted': { config?: unknown };
  'hologram:encodingStopped': { progress: number };
  'hologram:encodingProgress': { progress: number; frame?: number; totalFrames?: number };
  'hologram:encodingComplete': { size?: number; frames?: number };
  'hologram:encodingError': { error: string };
  'hologram:encodingCancelled': Record<string, never>;

  // Enhance events
  'enhance:process': { type: string; input: ImageData };
  'enhance:cancel': { jobId: string };
  'enhance:clear': undefined;
  'enhance:configChanged': { config: unknown };
  'enhance:jobCreated': { jobId: string; type: string };
  'enhance:jobStarted': { jobId: string };
  'enhance:jobProgress': { jobId: string; progress: number };
  'enhance:jobComplete': { jobId: string; output: unknown };
  'enhance:jobError': { jobId: string; error: string };
  'enhance:jobCancelled': { jobId: string };
};

// Re-export for external use
export type AppEvents = Events;
export type { RegistryEvents };

/**
 * Strongly-typed event bus instance
 */
export const eventBus = mitt<Events>();

/**
 * Type-safe event subscription helper
 */
export function onEvent<K extends keyof Events>(
  event: K,
  handler: (payload: Events[K]) => void
): () => void {
  eventBus.on(event, handler);
  return () => eventBus.off(event, handler);
}

/**
 * One-time event subscription
 */
export function onceEvent<K extends keyof Events>(
  event: K,
  handler: (payload: Events[K]) => void
): () => void {
  const wrappedHandler = (payload: Events[K]) => {
    eventBus.off(event, wrappedHandler);
    handler(payload);
  };
  eventBus.on(event, wrappedHandler);
  return () => eventBus.off(event, wrappedHandler);
}
