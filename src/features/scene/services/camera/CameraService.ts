import { inject, singleton } from 'tsyringe';

import { container, TOKENS } from '@/core/container';
import { createLogger } from '@/core/Logger';
import { getAnimationScheduler } from '@/features/scene/services/camera/AnimationScheduler';
import { ANIMATION_DURATION, CAMERA, DEFAULT_ANIMATION_DURATION } from '@/shared/constants';
import { CAMERA_ANIMATION, CAMERA_LIMITS } from '@/shared/constants/camera';
import { lerpVec3 } from '@/shared/utils';
import { useCameraStore } from '@/stores/index';

import { calculateDistance, calculatePresetPose, type CameraPresetType } from './CameraPresets';

import type { EventBus } from '@/core/EventTypes';
import type { LifecycleAware } from '@/core/LifecycleManager';
import type {
  AnimationHandle,
  CameraBookmark,
  CameraPose,
  CameraPreset,
  CameraService as CameraServiceType,
  ProjectionType,
  TransitionOptions,
  Vec3,
} from '@/shared/types';
import type { Camera } from 'three';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';

const FOV_TO_RAD_DIVISOR = 360;

@singleton()
export class CameraServiceImpl implements CameraServiceType, LifecycleAware {
  private _isInitialized = false;
  private animationId: AnimationHandle | null = null;

  readonly dependencies: string[] = [];

  private projectionMode: ProjectionType = 'perspective';
  readonly serviceId = 'CameraService';
  constructor(@inject(TOKENS.EventBus) private eventBus: EventBus) {}

  static resetInstance(): void {
    container.clearInstances();
  }

  private animatePose(from: CameraPose, to: Partial<CameraPose>, options: TransitionOptions): void {
    const scheduler = getAnimationScheduler();
    const targetPose: CameraPose = {
      ...from,
      ...to,
      position: to.position ? { ...from.position, ...to.position } : from.position,
      target: to.target ? { ...from.target, ...to.target } : from.target,
      up: to.up ? { ...from.up, ...to.up } : from.up,
    };

    if (this.animationId) {
      scheduler.cancel(this.animationId);
    }

    this.animationId = scheduler.animate(0, 1, {
      duration: options.duration ?? ANIMATION_DURATION.DEFAULT,
      easing: options.easing ?? 'ease-out-cubic',
      onUpdate: (progress) => {
        const interpolated = this.interpolatePose(from, targetPose, progress);

        this.store.setPose(interpolated, 'motion');
        options.onUpdate?.(progress);

        this.eventBus.emit('camera:pose-animating', {
          currentPose: interpolated,
          targetPose,
          progress,
        });
      },
      onComplete: () => {
        this.animationId = null;
        this.store.setPose(targetPose, 'preset');

        this.eventBus.emit('camera:pose-changed', {
          pose: targetPose,
          previousPose: from,
          source: 'animation',
        });

        options.onComplete?.();
      },
    });
  }

  async applyPreset(preset: CameraPreset): Promise<void> {
    const currentPose = this.getPose();
    const currentDist = calculateDistance(currentPose.position, currentPose.target);
    const presetPose = calculatePresetPose(preset as CameraPresetType, currentDist);

    return new Promise((resolve) => {
      this.setPose(presetPose, {
        duration: CAMERA_ANIMATION.PRESET,
        easing: 'ease-in-out-cubic',
        onComplete: () => {
          this.eventBus.emit('camera:preset-applied', { preset, pose: this.getPose() });
          resolve();
        },
      });
    });
  }

  canRedo(): boolean {
    return false;
  }

  canUndo(): boolean {
    return this.store.history.length > 1;
  }

  deleteBookmark(id: string): void {
    this.store.removeBookmark(id);
    this.eventBus.emit('camera:bookmark-deleted', { bookmarkId: id });
  }

  async destroy(): Promise<void> {
    logger.info('Destroying');
    this._isInitialized = false;
  }

  private emitHistoryChanged(): void {
    this.eventBus.emit('camera:history-changed', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      historyLength: this.store.history.length,
    });
  }

  async fitToBox(
    min: Vec3,
    max: Vec3,
    padding = 1.2,
    duration = DEFAULT_ANIMATION_DURATION
  ): Promise<void> {
    const center: Vec3 = {
      x: (min.x + max.x) / 2,
      y: (min.y + max.y) / 2,
      z: (min.z + max.z) / 2,
    };

    const size = Math.max(max.x - min.x, max.y - min.y, max.z - min.z);
    const {fov} = this.store.pose;
    const distance = (size * padding) / (2 * Math.tan((fov * Math.PI) / FOV_TO_RAD_DIVISOR));

    const currentPose = this.getPose();
    const direction: Vec3 = {
      x: currentPose.position.x - currentPose.target.x,
      y: currentPose.position.y - currentPose.target.y,
      z: currentPose.position.z - currentPose.target.z,
    };

    const len = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
    const normalizedDir: Vec3 = len > 0 ? {
      x: direction.x / len,
      y: direction.y / len,
      z: direction.z / len,
    } : { x: 0, y: 0, z: 1 };

    const newPosition: Vec3 = {
      x: center.x + normalizedDir.x * distance,
      y: center.y + normalizedDir.y * distance,
      z: center.z + normalizedDir.z * distance,
    };

    return new Promise((resolve) => {
      this.setPose(
        { position: newPosition, target: center },
        {
          duration,
          easing: 'ease-out-cubic',
          onComplete: () => {
            this.eventBus.emit('camera:fit-to-box', { min, max, padding });
            resolve();
          },
        }
      );
    });
  }

  async fitToSelection(
    boundingBoxes: Array<{ max: Vec3; min: Vec3; }>,
    padding = 1.2,
    duration = DEFAULT_ANIMATION_DURATION
  ): Promise<void> {
    if (boundingBoxes.length === 0) return;

    const globalMin: Vec3 = { x: Infinity, y: Infinity, z: Infinity };
    const globalMax: Vec3 = { x: -Infinity, y: -Infinity, z: -Infinity };

    for (const box of boundingBoxes) {
      globalMin.x = Math.min(globalMin.x, box.min.x);
      globalMin.y = Math.min(globalMin.y, box.min.y);
      globalMin.z = Math.min(globalMin.z, box.min.z);
      globalMax.x = Math.max(globalMax.x, box.max.x);
      globalMax.y = Math.max(globalMax.y, box.max.y);
      globalMax.z = Math.max(globalMax.z, box.max.z);
    }

    return this.fitToBox(globalMin, globalMax, padding, duration);
  }

  async fitToSphere(
    center: Vec3,
    radius: number,
    padding = 1.2,
    duration = DEFAULT_ANIMATION_DURATION
  ): Promise<void> {
    const {fov} = this.store.pose;
    const distance = (radius * 2 * padding) / (2 * Math.tan((fov * Math.PI) / FOV_TO_RAD_DIVISOR));

    const currentPose = this.getPose();
    const direction: Vec3 = {
      x: currentPose.position.x - currentPose.target.x,
      y: currentPose.position.y - currentPose.target.y,
      z: currentPose.position.z - currentPose.target.z,
    };

    const len = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
    const normalizedDir: Vec3 = len > 0 ? {
      x: direction.x / len,
      y: direction.y / len,
      z: direction.z / len,
    } : { x: 0, y: 0, z: 1 };

    const newPosition: Vec3 = {
      x: center.x + normalizedDir.x * distance,
      y: center.y + normalizedDir.y * distance,
      z: center.z + normalizedDir.z * distance,
    };

    return new Promise((resolve) => {
      this.setPose(
        { position: newPosition, target: center },
        {
          duration,
          easing: 'ease-out-cubic',
          onComplete: () => {
            this.eventBus.emit('camera:fit-to-sphere', { center, radius, padding });
            resolve();
          },
        }
      );
    });
  }

  getBookmarks(): CameraBookmark[] {
    return this.store.bookmarks.map((b) => ({
      id: b.id,
      name: b.name,
      pose: { ...b.pose, near: CAMERA_LIMITS.NEAR, far: CAMERA_LIMITS.FAR },
      createdAt: b.createdAt,
    }));
  }

  getPose(): CameraPose {
    const { pose } = this.store;

    return {
      position: { ...pose.position },
      target: { ...pose.target },
      up: { ...pose.up },
      fov: pose.fov,
      near: CAMERA_LIMITS.NEAR,
      far: CAMERA_LIMITS.FAR,
    };
  }

  async initialize(): Promise<void> {
    if (this._isInitialized) return;
    logger.info('Initializing');
    this._isInitialized = true;
  }

  private interpolatePose(from: CameraPose, to: CameraPose, t: number): CameraPose {
    return {
      position: lerpVec3(from.position, to.position, t),
      target: lerpVec3(from.target, to.target, t),
      up: lerpVec3(from.up, to.up, t),
      fov: from.fov + (to.fov - from.fov) * t,
      near: from.near,
      far: from.far,
    };
  }

  async loadBookmark(id: string): Promise<void> {
    const bookmark = this.store.bookmarks.find((b) => b.id === id);

    if (!bookmark) return;

    return new Promise((resolve) => {
      this.setPose(bookmark.pose, {
        duration: CAMERA_ANIMATION.BOOKMARK,
        easing: 'ease-in-out-cubic',
        onComplete: () => {
          this.eventBus.emit('camera:bookmark-loaded', { bookmark });
          resolve();
        },
      });
    });
  }

  async lookAt(target: Vec3, duration = DEFAULT_ANIMATION_DURATION): Promise<void> {
    return new Promise((resolve) => {
      this.setPose(
        { target },
        {
          duration,
          easing: 'ease-out-cubic',
          onComplete: resolve,
        }
      );
    });
  }

  async moveTo(position: Vec3, duration = DEFAULT_ANIMATION_DURATION): Promise<void> {
    return new Promise((resolve) => {
      this.setPose(
        { position },
        {
          duration,
          easing: 'ease-out-cubic',
          onComplete: resolve,
        }
      );
    });
  }

  redo(): void {}

  saveBookmark(name: string): string {
    this.store.addBookmark(name);
    const { bookmarks } = this.store;
    const bookmark = bookmarks[bookmarks.length - 1];

    if (bookmark) {
      this.eventBus.emit('camera:bookmark-saved', { bookmark });

      return bookmark.id;
    }

    return '';
  }

  async setFov(fov: number, duration = ANIMATION_DURATION.FOV): Promise<void> {
    const clampedFov = Math.max(CAMERA.FOV_MIN, Math.min(CAMERA.FOV_MAX, fov));

    return new Promise((resolve) => {
      this.setPose(
        { fov: clampedFov },
        {
          duration,
          easing: 'ease-out-cubic',
          onComplete: resolve,
        }
      );
    });
  }

  setPose(newPose: Partial<CameraPose>, options?: TransitionOptions): void {
    const previousPose = this.getPose();

    if (options?.duration && options.duration > 0) {
      this.animatePose(previousPose, newPose, options);
    } else {
      this.store.setPose(newPose, 'user');
      this.eventBus.emit('camera:pose-changed', {
        pose: this.getPose(),
        previousPose,
        source: 'user',
      });
    }
  }

  setProjection(mode: ProjectionType): void {
    const previousMode = this.projectionMode;

    this.projectionMode = mode;
    this.eventBus.emit('camera:projection-changed', { mode, previousMode });
  }

  private get store() {
    return useCameraStore.getState();
  }

  syncFromThree(camera: Camera, controls: OrbitControlsType): void {
    const threeCamera = camera as THREE.PerspectiveCamera;

    this.store.setPose(
      {
        position: {
          x: threeCamera.position.x,
          y: threeCamera.position.y,
          z: threeCamera.position.z,
        },
        target: { x: controls.target.x, y: controls.target.y, z: controls.target.z },
        up: { x: threeCamera.up.x, y: threeCamera.up.y, z: threeCamera.up.z },
        fov: threeCamera.fov,
      },
      'user'
    );
  }

  syncToThree(camera: Camera, controls: OrbitControlsType): void {
    const pose = this.getPose();
    const threeCamera = camera as THREE.PerspectiveCamera;

    threeCamera.position.set(pose.position.x, pose.position.y, pose.position.z);
    controls.target.set(pose.target.x, pose.target.y, pose.target.z);
    threeCamera.up.set(pose.up.x, pose.up.y, pose.up.z);

    if (pose.fov !== undefined) {
      threeCamera.fov = pose.fov;
      threeCamera.updateProjectionMatrix();
    }

    controls.update();
  }

  undo(): void {
    this.store.undo();
    this.emitHistoryChanged();
  }
}

export const getCameraService = (): CameraServiceType =>
  container.resolve<CameraServiceType>(TOKENS.CameraService);
const logger = createLogger({ module: 'CameraService' });

export { CameraServiceImpl as CameraService };

container.register(TOKENS.CameraService, { useClass: CameraServiceImpl });
declare namespace THREE {
  interface PerspectiveCamera extends Camera {
    far: number;
    fov: number;
    near: number;
    updateProjectionMatrix(): void;
  }
}
