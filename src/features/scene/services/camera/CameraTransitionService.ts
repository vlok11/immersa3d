import { Vector3 } from 'three';

import { getEventBus } from '@/core/EventBus';
import { createLogger } from '@/core/Logger';
import { CAMERA_TRANSITION, PERSPECTIVE_ORTHO } from '@/shared/constants/camera';
import { CameraMode, ProjectionMode } from '@/shared/types';
import { useCameraStore, useSceneStore } from '@/stores/index';

import { getAnimationScheduler } from './AnimationScheduler';
import { captureSnapshot, createSnapshot, interpolateSnapshots } from './CameraStateSnapshot';
import { calculateCameraSync } from './PerspectiveOrthoBridge';
import { getPresetForProjection, getTransitionConfig } from './ProjectionCameraPresets';

import type { LifecycleAware } from '@/core/LifecycleManager';
import type {
  AnimationHandle,
  CameraStateSnapshot,
  CameraTransitionConfig,
  ProjectionCameraPreset,
  Vec3,
} from '@/shared/types';

export interface TransitionCallbacks {
  onComplete?: () => void;
  onStart?: () => void;
  onUpdate?: (progress: number, current: Partial<CameraStateSnapshot>) => void;
}

export const getCameraTransitionService = (): CameraTransitionServiceImpl =>
  CameraTransitionServiceImpl.getInstance();

class CameraTransitionServiceImpl implements LifecycleAware {
  private static instance: CameraTransitionServiceImpl | null = null;
  private _isInitialized = false;

  private activeTransition: AnimationHandle | null = null;
  readonly dependencies = ['CameraService', 'AnimationScheduler'];
  private focalOffset: Vec3 = { x: 0, y: 0, z: 0 };
  private lastProjectionMode: ProjectionMode | null = null;
  readonly serviceId = 'CameraTransitionService';

  private constructor() {}

  static getInstance(): CameraTransitionServiceImpl {
    CameraTransitionServiceImpl.instance ??= new CameraTransitionServiceImpl();

    return CameraTransitionServiceImpl.instance;
  }

  private calculateTargetSnapshot(
    from: CameraStateSnapshot,
    preset: ProjectionCameraPreset,
    targetMode: ProjectionMode,
    cameraMode: CameraMode
  ): CameraStateSnapshot {
    const dir = new Vector3(
      from.position.x - from.target.x,
      from.position.y - from.target.y,
      from.position.z - from.target.z
    );

    if (dir.lengthSq() < CAMERA_TRANSITION.EPSILON) {
      dir.set(0, 0, 1);
    }
    dir.normalize();

    let targetPosition: Vec3;
    const targetLookAt: Vec3 = { ...preset.targetOffset };

    if (preset.positionHint === 'inside') {
      targetPosition = {
        x: targetLookAt.x + dir.x * preset.idealDistance,
        y: targetLookAt.y + dir.y * preset.idealDistance,
        z: targetLookAt.z + dir.z * preset.idealDistance,
      };
    } else if (preset.positionHint === 'above') {
      targetPosition = {
        x: targetLookAt.x,
        y: targetLookAt.y + preset.idealDistance,
        z: targetLookAt.z + CAMERA_TRANSITION.ABOVE_Z_OFFSET,
      };
    } else {
      targetPosition = {
        x: targetLookAt.x + dir.x * preset.idealDistance,
        y: targetLookAt.y + dir.y * preset.idealDistance,
        z: targetLookAt.z + dir.z * preset.idealDistance,
      };
    }

    return createSnapshot(
      targetPosition,
      targetLookAt,
      preset.idealFov,
      cameraMode,
      targetMode,
      from.zoom
    );
  }

  cancelTransition(): void {
    if (this.activeTransition) {
      this.activeTransition.cancel();
      this.activeTransition = null;
    }
  }

  async destroy(): Promise<void> {
    this.cancelTransition();
    this._isInitialized = false;
  }

  private executeTransition(
    from: CameraStateSnapshot,
    to: CameraStateSnapshot,
    config: CameraTransitionConfig,
    callbacks?: TransitionCallbacks
  ): AnimationHandle {
    const scheduler = getAnimationScheduler();

    callbacks?.onStart?.();

    return scheduler.animate(0, 1, {
      duration: config.duration,
      easing: config.easing,
      onUpdate: (progress) => {
        const interpolated = interpolateSnapshots(from, to, progress);

        useCameraStore.getState().setPose(
          {
            position: interpolated.position,
            target: interpolated.target,
            fov: interpolated.fov,
          },
          'motion'
        );
        callbacks?.onUpdate?.(progress, interpolated);
      },
      onComplete: () => {
        this.activeTransition = null;
        useCameraStore.getState().setPose(
          {
            position: to.position,
            target: to.target,
            fov: to.fov,
          },
          'preset'
        );
        callbacks?.onComplete?.();
        getEventBus().emit('camera:transition-complete', {
          projectionMode: to.projectionMode,
          cameraMode: to.cameraMode,
        });
      },
    });
  }

  getFocalOffset(): Vec3 {
    return { ...this.focalOffset };
  }

  infinityDolly(
    direction: 'in' | 'out',
    speed = 0.5
  ): void {
    const cameraState = useCameraStore.getState();
    const { position, target } = cameraState.pose;

    const forward = new Vector3(
      target.x - position.x,
      target.y - position.y,
      target.z - position.z
    ).normalize();

    const moveDir = direction === 'in' ? 1 : -1;
    const offset = forward.multiplyScalar(speed * moveDir);

    const newPosition: Vec3 = {
      x: position.x + offset.x,
      y: position.y + offset.y,
      z: position.z + offset.z,
    };

    cameraState.setPose({ position: newPosition }, 'user');
    logger.info('Infinity dolly', { direction, speed });
  }

  async initialize(): Promise<void> {
    if (this._isInitialized) return;
    logger.info('Initializing');
    this._isInitialized = true;
  }

  isTransitioning(): boolean {
    return this.activeTransition?.isActive() ?? false;
  }

  setFocalOffset(
    offset: Vec3,
    enableTransition = true,
    duration = 300
  ): AnimationHandle | null {
    this.focalOffset = { ...offset };

    const cameraState = useCameraStore.getState();
    const { position, target } = cameraState.pose;

    const newTarget: Vec3 = {
      x: target.x + offset.x,
      y: target.y + offset.y,
      z: target.z + offset.z,
    };

    if (!enableTransition) {
      cameraState.setPose({ target: newTarget }, 'user');

      return null;
    }

    const fromSnapshot = createSnapshot(
      position,
      target,
      cameraState.pose.fov,
      useSceneStore.getState().config.cameraMode,
      useSceneStore.getState().config.projectionMode,
      1
    );

    const toSnapshot = createSnapshot(
      position,
      newTarget,
      cameraState.pose.fov,
      useSceneStore.getState().config.cameraMode,
      useSceneStore.getState().config.projectionMode,
      1
    );

    this.cancelTransition();
    this.activeTransition = this.executeTransition(fromSnapshot, toSnapshot, {
      duration,
      easing: 'ease-out-cubic',
      preserveDistance: false,
      preserveDirection: false,
    });

    logger.info('Focal offset set', { offset });

    return this.activeTransition;
  }

  setLastProjectionMode(mode: ProjectionMode): void {
    this.lastProjectionMode = mode;
  }

  transitionCameraMode(
    targetMode: CameraMode,
    currentPosition: Vec3,
    currentTarget: Vec3,
    currentFovOrZoom: number,
    cameraDistance: number,
    callbacks?: TransitionCallbacks
  ): AnimationHandle | null {
    this.cancelTransition();

    const { config: sceneConfig } = useSceneStore.getState();

    if (sceneConfig.cameraMode === targetMode) return null;

    const { projectionMode, cameraMode: sourceMode } = sceneConfig;
    const fromSnapshot = createSnapshot(
      currentPosition,
      currentTarget,
      sourceMode === CameraMode.PERSPECTIVE ? currentFovOrZoom : PERSPECTIVE_ORTHO.DEFAULT_FOV,
      sourceMode,
      projectionMode,
      sourceMode === CameraMode.ORTHOGRAPHIC ? currentFovOrZoom : PERSPECTIVE_ORTHO.BASE_ZOOM
    );

    const syncResult = calculateCameraSync(
      sourceMode === CameraMode.PERSPECTIVE ? 'perspective' : 'orthographic',
      currentFovOrZoom,
      cameraDistance
    );

    const toSnapshot = createSnapshot(
      currentPosition,
      currentTarget,
      targetMode === CameraMode.PERSPECTIVE ? syncResult.perspectiveFov : PERSPECTIVE_ORTHO.DEFAULT_FOV,
      targetMode,
      projectionMode,
      targetMode === CameraMode.ORTHOGRAPHIC ? syncResult.orthoZoom : PERSPECTIVE_ORTHO.BASE_ZOOM
    );

    const transitionConfig: CameraTransitionConfig = {
      duration: 400,
      easing: 'ease-in-out-cubic',
      preserveDistance: true,
      preserveDirection: true,
    };

    this.activeTransition = this.executeTransition(
      fromSnapshot,
      toSnapshot,
      transitionConfig,
      callbacks
    );

    return this.activeTransition;
  }

  transitionToProjection(
    targetMode: ProjectionMode,
    currentPosition: Vec3,
    currentTarget: Vec3,
    currentFov: number,
    callbacks?: TransitionCallbacks
  ): AnimationHandle | null {
    const sourceMode = this.lastProjectionMode ?? ProjectionMode.PLANE;

    if (sourceMode === targetMode) return null;

    this.cancelTransition();

    const { config: sceneConfig } = useSceneStore.getState();
    const fromSnapshot = captureSnapshot({
      cameraMode: sceneConfig.cameraMode,
      projectionMode: sourceMode,
    });

    fromSnapshot.position = { ...currentPosition };
    fromSnapshot.target = { ...currentTarget };
    fromSnapshot.fov = currentFov;

    const preset = getPresetForProjection(targetMode);
    const toSnapshot = this.calculateTargetSnapshot(
      fromSnapshot,
      preset,
      targetMode,
      sceneConfig.cameraMode
    );

    const transitionConfig = getTransitionConfig(sourceMode, targetMode);

    this.activeTransition = this.executeTransition(
      fromSnapshot,
      toSnapshot,
      transitionConfig,
      callbacks
    );

    this.lastProjectionMode = targetMode;

    getEventBus().emit('camera:transition-started', {
      from: sourceMode,
      to: targetMode,
      duration: transitionConfig.duration,
    });

    return this.activeTransition;
  }

  truck(
    x: number,
    y: number,
    enableTransition = true,
    duration = 400
  ): AnimationHandle | null {
    const cameraState = useCameraStore.getState();
    const { position, target } = cameraState.pose;

    const forward = new Vector3(
      target.x - position.x,
      target.y - position.y,
      target.z - position.z
    ).normalize();

    const up = new Vector3(0, 1, 0);
    const right = new Vector3().crossVectors(forward, up).normalize();
    const adjustedUp = new Vector3().crossVectors(right, forward).normalize();

    const offsetX = right.x * x + adjustedUp.x * y;
    const offsetY = right.y * x + adjustedUp.y * y;
    const offsetZ = right.z * x + adjustedUp.z * y;

    const newPosition: Vec3 = {
      x: position.x + offsetX,
      y: position.y + offsetY,
      z: position.z + offsetZ,
    };

    const newTarget: Vec3 = {
      x: target.x + offsetX,
      y: target.y + offsetY,
      z: target.z + offsetZ,
    };

    if (!enableTransition) {
      cameraState.setPose({ position: newPosition, target: newTarget }, 'user');

      return null;
    }

    const fromSnapshot = createSnapshot(
      position,
      target,
      cameraState.pose.fov,
      useSceneStore.getState().config.cameraMode,
      useSceneStore.getState().config.projectionMode,
      1
    );

    const toSnapshot = createSnapshot(
      newPosition,
      newTarget,
      cameraState.pose.fov,
      useSceneStore.getState().config.cameraMode,
      useSceneStore.getState().config.projectionMode,
      1
    );

    this.cancelTransition();
    this.activeTransition = this.executeTransition(fromSnapshot, toSnapshot, {
      duration,
      easing: 'ease-out-cubic',
      preserveDistance: true,
      preserveDirection: true,
    });

    logger.info('Truck', { x, y });

    return this.activeTransition;
  }
}

const logger = createLogger({ module: 'CameraTransitionService' });

export { CameraTransitionServiceImpl as CameraTransitionService };
