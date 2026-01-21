import { createLogger } from '@/core/Logger';

import type { Vec3 } from '@/shared/types';

export interface ShakeConfig {
  decay?: number;
  duration?: number;
  frequency?: number;
  intensity?: number;
}

export interface ShakeState {
  config: Required<ShakeConfig>;
  isActive: boolean;
  startTime: number;
}

export interface HandheldConfig {
  enabled: boolean;
  frequency: number;
  intensity: number;
}

const SHAKE_CONSTANTS = {
  MS_TO_SECONDS: 0.001,
  MS_IN_SECOND: 1000,
  HANDHELD_SCALE_XY: 0.1,
  HANDHELD_SCALE_Z: 0.05,
  HANDHELD_Z_FREQ_SCALE: 0.5,
  SHAKE_Z_SCALE: 0.5,
  SHAKE_Z_FREQ_SCALE: 0.7,
  NOISE_OFFSET_X: 100,
  NOISE_OFFSET_Y: 200,
  NOISE_OFFSET_Z: 300,
  PERM_SIZE: 256,
  PERM_MASK: 255,
  FADE_C1: 6,
  FADE_C2: 15,
  FADE_C3: 10,
  GRAD_MASK: 3,
} as const;

const DEFAULTS: Required<ShakeConfig> = {
  intensity: 0.35,
  frequency: 12,
  decay: 2.5,
  duration: 0,
};

const HANDHELD_DEFAULTS: HandheldConfig = {
  enabled: false,
  intensity: 0.15,
  frequency: 4,
};

const logger = createLogger({ module: 'CameraShakeService' });

export const getCameraShakeService = (): CameraShakeServiceImpl =>
  CameraShakeServiceImpl.getInstance();

export const resetCameraShakeService = (): void => {
  CameraShakeServiceImpl.resetInstance();
};

class CameraShakeServiceImpl {
  private static instance: CameraShakeServiceImpl | null = null;

  private handheld: HandheldConfig = { ...HANDHELD_DEFAULTS };

  private readonly permutation: number[] = (() => {
    const perm = [];

    for (let i = 0; i < SHAKE_CONSTANTS.PERM_SIZE; i++) perm[i] = i;

    for (let i = SHAKE_CONSTANTS.PERM_MASK; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [perm[i], perm[j]] = [perm[j] ?? 0, perm[i] ?? 0];
    }

    return [...perm, ...perm];
  })();

  private shake: ShakeState = {
    isActive: false,
    startTime: 0,
    config: { ...DEFAULTS },
  };

  private constructor() {}

  static getInstance(): CameraShakeServiceImpl {
    CameraShakeServiceImpl.instance ??= new CameraShakeServiceImpl();

    return CameraShakeServiceImpl.instance;
  }

  static resetInstance(): void {
    if (CameraShakeServiceImpl.instance) {
      CameraShakeServiceImpl.instance.stop();
      CameraShakeServiceImpl.instance = null;
    }
  }

  calculate(time: number): Vec3 {
    let offset: Vec3 = { x: 0, y: 0, z: 0 };

    if (this.handheld.enabled) {
      offset = this.calculateHandheld(time);
    }

    if (this.shake.isActive) {
      const shakeOffset = this.calculateShake(time);

      offset.x += shakeOffset.x;
      offset.y += shakeOffset.y;
      offset.z += shakeOffset.z;
    }

    return offset;
  }

  private calculateHandheld(time: number): Vec3 {
    const { intensity, frequency } = this.handheld;
    const t = time * SHAKE_CONSTANTS.MS_TO_SECONDS;

    const noiseX = this.perlinNoise(t * frequency, 0);
    const noiseY = this.perlinNoise(0, t * frequency);
    const noiseZ = this.perlinNoise(
      t * frequency * SHAKE_CONSTANTS.HANDHELD_Z_FREQ_SCALE,
      t * frequency * SHAKE_CONSTANTS.HANDHELD_Z_FREQ_SCALE
    );

    return {
      x: noiseX * intensity * SHAKE_CONSTANTS.HANDHELD_SCALE_XY,
      y: noiseY * intensity * SHAKE_CONSTANTS.HANDHELD_SCALE_XY,
      z: noiseZ * intensity * SHAKE_CONSTANTS.HANDHELD_SCALE_Z,
    };
  }

  private calculateShake(time: number): Vec3 {
    const { intensity, frequency, decay, duration } = this.shake.config;
    const elapsed = (time - this.shake.startTime) * SHAKE_CONSTANTS.MS_TO_SECONDS;

    if (duration > 0 && elapsed * SHAKE_CONSTANTS.MS_IN_SECOND >= duration) {
      this.shake.isActive = false;

      return { x: 0, y: 0, z: 0 };
    }

    const decayFactor = Math.exp(-decay * elapsed);
    const currentIntensity = intensity * decayFactor;

    const noiseX = this.perlinNoise(elapsed * frequency, SHAKE_CONSTANTS.NOISE_OFFSET_X);
    const noiseY = this.perlinNoise(SHAKE_CONSTANTS.NOISE_OFFSET_Y, elapsed * frequency);
    const noiseZ = this.perlinNoise(
      elapsed * frequency * SHAKE_CONSTANTS.SHAKE_Z_FREQ_SCALE,
      SHAKE_CONSTANTS.NOISE_OFFSET_Z
    );

    return {
      x: noiseX * currentIntensity,
      y: noiseY * currentIntensity,
      z: noiseZ * currentIntensity * SHAKE_CONSTANTS.SHAKE_Z_SCALE,
    };
  }

  private fade(t: number): number {
    return (
      t *
      t *
      t *
      (t * (t * SHAKE_CONSTANTS.FADE_C1 - SHAKE_CONSTANTS.FADE_C2) + SHAKE_CONSTANTS.FADE_C3)
    );
  }

  getConfig(): Required<ShakeConfig> {
    return { ...this.shake.config };
  }

  getHandheldConfig(): HandheldConfig {
    return { ...this.handheld };
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & SHAKE_CONSTANTS.GRAD_MASK;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;

    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  isActive(): boolean {
    return this.shake.isActive || this.handheld.enabled;
  }

  isHandheldEnabled(): boolean {
    return this.handheld.enabled;
  }

  isShaking(): boolean {
    return this.shake.isActive;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private perlinNoise(x: number, y: number): number {
    const p = this.permutation;

    const X = Math.floor(x) & SHAKE_CONSTANTS.PERM_MASK;
    const Y = Math.floor(y) & SHAKE_CONSTANTS.PERM_MASK;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = p[(p[X] ?? 0) + Y] ?? 0;
    const ab = p[(p[X] ?? 0) + Y + 1] ?? 0;
    const ba = p[(p[X + 1] ?? 0) + Y] ?? 0;
    const bb = p[(p[X + 1] ?? 0) + Y + 1] ?? 0;

    const x1 = this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u);
    const x2 = this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u);

    return this.lerp(x1, x2, v);
  }

  setConfig(config: Partial<ShakeConfig>): void {
    this.shake.config = { ...this.shake.config, ...config };
  }

  setHandheldIntensity(intensity: number): void {
    this.handheld.intensity = Math.max(0, Math.min(1, intensity));
  }

  setHandheldMode(enabled: boolean, intensity?: number): void {
    this.handheld.enabled = enabled;

    if (intensity !== undefined) {
      this.handheld.intensity = Math.max(0, Math.min(1, intensity));
    }

    logger.info(enabled ? 'Handheld mode enabled' : 'Handheld mode disabled', {
      intensity: this.handheld.intensity,
    });
  }

  shake_trigger(config?: Partial<ShakeConfig>): void {
    this.shake.config = { ...DEFAULTS, ...config };
    this.shake.startTime = performance.now();
    this.shake.isActive = true;

    logger.info('Shake triggered', { config: this.shake.config });
  }

  stop(): void {
    this.shake.isActive = false;

    logger.info('Shake stopped');
  }
}

export { CameraShakeServiceImpl as CameraShakeService };
