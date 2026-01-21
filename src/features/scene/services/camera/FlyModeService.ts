import { Vector3 } from 'three';

import { getEventBus } from '@/core/EventBus';
import { createLogger } from '@/core/Logger';
import { useCameraPoseStore as useCameraStore } from '@/stores/cameraStore';

import { getMotionService } from './MotionService';

import type { Vec3 } from '@/shared/types';

const logger = createLogger({ module: 'FlyModeService' });

const FLY_CONSTANTS = {
  MS_TO_SECONDS: 1000,
  VELOCITY_DECAY: 10,
  VELOCITY_THRESHOLD: 0.001,
  FRAME_RATE: 60,
} as const;

export interface FlyModeConfig {
  boostMultiplier: number;
  moveSpeed: number;
  smoothing: number;
}

export type MoveDirection = 'backward' | 'down' | 'forward' | 'left' | 'right' | 'up';

interface KeyState {
  backward: boolean;
  boost: boolean;
  down: boolean;
  forward: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
}

const DEFAULT_CONFIG: FlyModeConfig = {
  moveSpeed: 5,
  boostMultiplier: 3,
  smoothing: 0.15,
};

const KEY_BINDINGS: Record<string, keyof KeyState> = {
  w: 'forward',
  W: 'forward',
  ArrowUp: 'forward',
  s: 'backward',
  S: 'backward',
  ArrowDown: 'backward',
  a: 'left',
  A: 'left',
  ArrowLeft: 'left',
  d: 'right',
  D: 'right',
  ArrowRight: 'right',
  e: 'up',
  E: 'up',
  PageUp: 'up',
  q: 'down',
  Q: 'down',
  PageDown: 'down',
  Shift: 'boost',
};

/**
 * 飞行模式服务
 * 使用独立 updateLoop，但与自动运镜互斥
 */
class FlyModeServiceImpl {
  private static instance: FlyModeServiceImpl | null = null;

  private animationFrameId: number | null = null;
  private config: FlyModeConfig = { ...DEFAULT_CONFIG };
  private enabled = false;
  private handleBlur = (): void => {
    this.resetKeyState();
  };
  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.enabled) return;

    // 检测自动运镜状态，运镜期间不响应
    const motionService = getMotionService();

    if (motionService.isActive() && !motionService.isPaused()) {
      return;
    }

    const action = KEY_BINDINGS[e.key];

    if (action && !this.keyState[action]) {
      this.keyState[action] = true;
      e.preventDefault();
    }
  };
  private handleKeyUp = (e: KeyboardEvent): void => {
    if (!this.enabled) return;

    const action = KEY_BINDINGS[e.key];

    if (action) {
      this.keyState[action] = false;
    }
  };
  private keyState: KeyState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    boost: false,
  };
  private lastTime = 0;
  private updateLoop = (): void => {
    if (!this.enabled) return;

    // 检测自动运镜状态
    const motionService = getMotionService();

    if (motionService.isActive() && !motionService.isPaused()) {
      // 运镜期间暂停飞行控制，但保持循环
      this.animationFrameId = requestAnimationFrame(this.updateLoop);

      return;
    }

    // 检测用户交互状态
    const cameraState = useCameraStore.getState();

    if (cameraState.interaction.isInteracting) {
      // 用户交互期间暂停飞行控制
      this.animationFrameId = requestAnimationFrame(this.updateLoop);

      return;
    }

    const now = performance.now();
    const deltaTime = (now - this.lastTime) / FLY_CONSTANTS.MS_TO_SECONDS;

    this.lastTime = now;

    this.updateMovement(deltaTime);

    this.animationFrameId = requestAnimationFrame(this.updateLoop);
  };
  private velocity: Vec3 = { x: 0, y: 0, z: 0 };

  private constructor() {}

  static getInstance(): FlyModeServiceImpl {
    FlyModeServiceImpl.instance ??= new FlyModeServiceImpl();

    return FlyModeServiceImpl.instance;
  }

  static resetInstance(): void {
    if (FlyModeServiceImpl.instance) {
      FlyModeServiceImpl.instance.disable();
      FlyModeServiceImpl.instance = null;
    }
  }

  private addListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  disable(): void {
    if (!this.enabled) return;

    this.enabled = false;
    this.removeListeners();
    this.stopLoop();
    this.resetKeyState();
    logger.info('FlyMode disabled');
    getEventBus().emit('flymode:disabled', undefined);
  }

  enable(): void {
    if (this.enabled) return;

    this.enabled = true;
    this.addListeners();
    this.startLoop();
    logger.info('FlyMode enabled');
    getEventBus().emit('flymode:enabled', undefined);
  }

  getConfig(): FlyModeConfig {
    return { ...this.config };
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private removeListeners(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  }

  private resetKeyState(): void {
    this.keyState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
      boost: false,
    };
    this.velocity = { x: 0, y: 0, z: 0 };
  }

  setConfig(config: Partial<FlyModeConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('FlyMode config updated', { ...this.config });
  }

  private startLoop(): void {
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.updateLoop);
  }

  private stopLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  toggle(): boolean {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }

    return this.enabled;
  }

  private updateMovement(deltaTime: number): void {
    const cameraState = useCameraStore.getState();
    const { position, target } = cameraState.pose;

    const forward = new Vector3(
      target.x - position.x,
      target.y - position.y,
      target.z - position.z
    ).normalize();

    const worldUp = new Vector3(0, 1, 0);
    const right = new Vector3().crossVectors(forward, worldUp).normalize();
    const up = new Vector3().crossVectors(right, forward).normalize();

    let inputX = 0;
    let inputY = 0;
    let inputZ = 0;

    if (this.keyState.forward) inputZ += 1;
    if (this.keyState.backward) inputZ -= 1;
    if (this.keyState.right) inputX += 1;
    if (this.keyState.left) inputX -= 1;
    if (this.keyState.up) inputY += 1;
    if (this.keyState.down) inputY -= 1;

    if (inputX === 0 && inputY === 0 && inputZ === 0) {
      const decay = 1 - this.config.smoothing * FLY_CONSTANTS.VELOCITY_DECAY * deltaTime;

      this.velocity.x *= decay;
      this.velocity.y *= decay;
      this.velocity.z *= decay;

      if (
        Math.abs(this.velocity.x) < FLY_CONSTANTS.VELOCITY_THRESHOLD &&
        Math.abs(this.velocity.y) < FLY_CONSTANTS.VELOCITY_THRESHOLD &&
        Math.abs(this.velocity.z) < FLY_CONSTANTS.VELOCITY_THRESHOLD
      ) {
        return;
      }
    } else {
      const speed = this.keyState.boost
        ? this.config.moveSpeed * this.config.boostMultiplier
        : this.config.moveSpeed;

      const targetVelocity = {
        x: (right.x * inputX + up.x * inputY + forward.x * inputZ) * speed,
        y: (right.y * inputX + up.y * inputY + forward.y * inputZ) * speed,
        z: (right.z * inputX + up.z * inputY + forward.z * inputZ) * speed,
      };

      const lerpFactor =
        1 - Math.pow(1 - this.config.smoothing, deltaTime * FLY_CONSTANTS.FRAME_RATE);

      this.velocity.x += (targetVelocity.x - this.velocity.x) * lerpFactor;
      this.velocity.y += (targetVelocity.y - this.velocity.y) * lerpFactor;
      this.velocity.z += (targetVelocity.z - this.velocity.z) * lerpFactor;
    }

    const newPosition: Vec3 = {
      x: position.x + this.velocity.x * deltaTime,
      y: position.y + this.velocity.y * deltaTime,
      z: position.z + this.velocity.z * deltaTime,
    };

    const newTarget: Vec3 = {
      x: target.x + this.velocity.x * deltaTime,
      y: target.y + this.velocity.y * deltaTime,
      z: target.z + this.velocity.z * deltaTime,
    };

    cameraState.setPose({ position: newPosition, target: newTarget }, 'user');
  }
}

export const getFlyModeService = (): FlyModeServiceImpl => FlyModeServiceImpl.getInstance();

export const resetFlyModeService = (): void => {
  FlyModeServiceImpl.resetInstance();
};

export { FlyModeServiceImpl as FlyModeService };
