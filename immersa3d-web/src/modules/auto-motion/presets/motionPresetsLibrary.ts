// ============================================================
// Immersa 3D - Motion Presets Library
// Built-in camera motion presets
// ============================================================

import type { MotionPath, Keyframe, EasingType } from '../AutoMotionModule';

/**
 * Preset category type
 */
export type PresetCategory = 
  | 'cinematic'
  | 'presentation'
  | 'showcase'
  | 'transition'
  | 'effects';

/**
 * Motion preset definition
 */
export interface MotionPreset {
  id: string;
  name: string;
  description: string;
  category: PresetCategory;
  duration: number;
  thumbnail?: string;
  createPath: (options?: PresetOptions) => MotionPath;
}

/**
 * Preset generation options
 */
export interface PresetOptions {
  /** Center point of the motion */
  center?: [number, number, number];
  /** Scale multiplier */
  scale?: number;
  /** Duration override */
  duration?: number;
  /** Start FOV */
  startFov?: number;
  /** End FOV */
  endFov?: number;
}

/**
 * Default preset options
 */
const DEFAULT_OPTIONS: Required<PresetOptions> = {
  center: [0, 0, 0],
  scale: 1,
  duration: 5,
  startFov: 75,
  endFov: 75,
};

/**
 * Create keyframe helper
 */
function createKeyframe(
  time: number,
  position: [number, number, number],
  lookAt: [number, number, number],
  fov: number,
  easing: EasingType = 'easeInOut'
): Keyframe {
  return { time, position, lookAt, fov, easing };
}

/**
 * Apply scale and offset to position
 */
function transformPosition(
  pos: [number, number, number],
  center: [number, number, number],
  scale: number
): [number, number, number] {
  return [
    center[0] + pos[0] * scale,
    center[1] + pos[1] * scale,
    center[2] + pos[2] * scale,
  ];
}

// ============================================================
// Built-in Presets
// ============================================================

/**
 * Orbit preset - 360° rotation around subject
 */
const orbitPreset: MotionPreset = {
  id: 'orbit-360',
  name: 'Orbit 360°',
  description: 'Complete 360° rotation around the subject',
  category: 'showcase',
  duration: 8,
  createPath: (opts) => {
    const options = { ...DEFAULT_OPTIONS, ...opts };
    const { center, scale, duration, startFov } = options;
    const radius = 5 * scale;
    
    const keyframes: Keyframe[] = [];
    const steps = 8;
    
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const time = (i / steps) * duration;
      const position: [number, number, number] = transformPosition(
        [Math.sin(angle) * radius, 2 * scale, Math.cos(angle) * radius],
        center,
        1
      );
      keyframes.push(createKeyframe(time, position, center, startFov, 'linear'));
    }
    
    return {
      id: `orbit-360-${Date.now()}`,
      name: 'Orbit 360°',
      keyframes,
      duration,
      interpolation: 'catmullRom',
      loop: true,
    };
  },
};

/**
 * Dolly zoom (Hitchcock zoom) preset
 */
const dollyZoomPreset: MotionPreset = {
  id: 'dolly-zoom',
  name: 'Hitchcock Zoom',
  description: 'Classic dolly zoom effect - camera moves while zooming',
  category: 'cinematic',
  duration: 4,
  createPath: (opts) => {
    const options = { ...DEFAULT_OPTIONS, ...opts };
    const { center, scale, duration } = options;
    
    const keyframes: Keyframe[] = [
      createKeyframe(0, transformPosition([0, 1, 8], center, scale), center, 40, 'easeInOut'),
      createKeyframe(duration * 0.5, transformPosition([0, 1, 4], center, scale), center, 60, 'easeInOut'),
      createKeyframe(duration, transformPosition([0, 1, 2], center, scale), center, 90, 'easeOut'),
    ];
    
    return {
      id: `dolly-zoom-${Date.now()}`,
      name: 'Hitchcock Zoom',
      keyframes,
      duration,
      interpolation: 'bezier',
      loop: false,
    };
  },
};

/**
 * Push-in preset - dramatic approach
 */
const pushInPreset: MotionPreset = {
  id: 'push-in',
  name: 'Push In',
  description: 'Dramatic push towards the subject',
  category: 'cinematic',
  duration: 3,
  createPath: (opts) => {
    const options = { ...DEFAULT_OPTIONS, ...opts };
    const { center, scale, duration, startFov, endFov } = options;
    
    const keyframes: Keyframe[] = [
      createKeyframe(0, transformPosition([0, 2, 10], center, scale), center, startFov, 'easeIn'),
      createKeyframe(duration, transformPosition([0, 1, 3], center, scale), center, endFov, 'easeOut'),
    ];
    
    return {
      id: `push-in-${Date.now()}`,
      name: 'Push In',
      keyframes,
      duration,
      interpolation: 'bezier',
      loop: false,
    };
  },
};

/**
 * Pull-out preset - reveal shot
 */
const pullOutPreset: MotionPreset = {
  id: 'pull-out',
  name: 'Pull Out',
  description: 'Gradual reveal by moving away from subject',
  category: 'cinematic',
  duration: 4,
  createPath: (opts) => {
    const options = { ...DEFAULT_OPTIONS, ...opts };
    const { center, scale, duration, startFov, endFov } = options;
    
    const keyframes: Keyframe[] = [
      createKeyframe(0, transformPosition([0, 1, 2], center, scale), center, startFov, 'easeIn'),
      createKeyframe(duration, transformPosition([0, 3, 12], center, scale), center, endFov, 'easeOut'),
    ];
    
    return {
      id: `pull-out-${Date.now()}`,
      name: 'Pull Out',
      keyframes,
      duration,
      interpolation: 'bezier',
      loop: false,
    };
  },
};

/**
 * Tilt-up preset - vertical reveal
 */
const tiltUpPreset: MotionPreset = {
  id: 'tilt-up',
  name: 'Tilt Up',
  description: 'Vertical tilt from bottom to top',
  category: 'presentation',
  duration: 3,
  createPath: (opts) => {
    const options = { ...DEFAULT_OPTIONS, ...opts };
    const { center, scale, duration, startFov } = options;
    
    const basePos: [number, number, number] = transformPosition([0, 1, 5], center, scale);
    
    const keyframes: Keyframe[] = [
      createKeyframe(0, basePos, transformPosition([0, -2, 0], center, scale), startFov, 'easeInOut'),
      createKeyframe(duration, basePos, transformPosition([0, 4, 0], center, scale), startFov, 'easeOut'),
    ];
    
    return {
      id: `tilt-up-${Date.now()}`,
      name: 'Tilt Up',
      keyframes,
      duration,
      interpolation: 'linear',
      loop: false,
    };
  },
};

/**
 * Crane shot preset - vertical movement
 */
const craneShotPreset: MotionPreset = {
  id: 'crane-shot',
  name: 'Crane Shot',
  description: 'Vertical camera movement like a crane',
  category: 'cinematic',
  duration: 5,
  createPath: (opts) => {
    const options = { ...DEFAULT_OPTIONS, ...opts };
    const { center, scale, duration, startFov } = options;
    
    const keyframes: Keyframe[] = [
      createKeyframe(0, transformPosition([3, 0.5, 5], center, scale), center, startFov, 'easeIn'),
      createKeyframe(duration * 0.5, transformPosition([0, 4, 4], center, scale), center, startFov, 'easeInOut'),
      createKeyframe(duration, transformPosition([-3, 6, 3], center, scale), center, startFov, 'easeOut'),
    ];
    
    return {
      id: `crane-shot-${Date.now()}`,
      name: 'Crane Shot',
      keyframes,
      duration,
      interpolation: 'catmullRom',
      loop: false,
    };
  },
};

/**
 * Fly-through preset
 */
const flyThroughPreset: MotionPreset = {
  id: 'fly-through',
  name: 'Fly Through',
  description: 'Dynamic flight path through the scene',
  category: 'showcase',
  duration: 6,
  createPath: (opts) => {
    const options = { ...DEFAULT_OPTIONS, ...opts };
    const { center, scale, duration, startFov } = options;
    
    const keyframes: Keyframe[] = [
      createKeyframe(0, transformPosition([-5, 3, 10], center, scale), center, startFov, 'easeIn'),
      createKeyframe(duration * 0.3, transformPosition([0, 2, 5], center, scale), center, startFov, 'linear'),
      createKeyframe(duration * 0.6, transformPosition([3, 1, 2], center, scale), center, startFov + 10, 'linear'),
      createKeyframe(duration, transformPosition([5, 0.5, -3], center, scale), transformPosition([0, 0, -10], center, scale), startFov, 'easeOut'),
    ];
    
    return {
      id: `fly-through-${Date.now()}`,
      name: 'Fly Through',
      keyframes,
      duration,
      interpolation: 'catmullRom',
      loop: false,
    };
  },
};

/**
 * Turntable preset - simple rotation showcase
 */
const turntablePreset: MotionPreset = {
  id: 'turntable',
  name: 'Turntable',
  description: 'Simple 360° turntable rotation at fixed height',
  category: 'showcase',
  duration: 10,
  createPath: (opts) => {
    const options = { ...DEFAULT_OPTIONS, ...opts };
    const { center, scale, duration, startFov } = options;
    const radius = 4 * scale;
    const height = 1.5 * scale;
    
    const keyframes: Keyframe[] = [];
    const steps = 12;
    
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const time = (i / steps) * duration;
      const position: [number, number, number] = [
        center[0] + Math.sin(angle) * radius,
        center[1] + height,
        center[2] + Math.cos(angle) * radius,
      ];
      keyframes.push(createKeyframe(time, position, center, startFov, 'linear'));
    }
    
    return {
      id: `turntable-${Date.now()}`,
      name: 'Turntable',
      keyframes,
      duration,
      interpolation: 'catmullRom',
      loop: true,
    };
  },
};

// ============================================================
// Preset Registry
// ============================================================

/**
 * All available motion presets
 */
export const MOTION_PRESETS: MotionPreset[] = [
  orbitPreset,
  dollyZoomPreset,
  pushInPreset,
  pullOutPreset,
  tiltUpPreset,
  craneShotPreset,
  flyThroughPreset,
  turntablePreset,
];

/**
 * Get preset by ID
 */
export function getPreset(id: string): MotionPreset | undefined {
  return MOTION_PRESETS.find(p => p.id === id);
}

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: PresetCategory): MotionPreset[] {
  return MOTION_PRESETS.filter(p => p.category === category);
}

/**
 * Get all preset categories
 */
export function getPresetCategories(): PresetCategory[] {
  return [...new Set(MOTION_PRESETS.map(p => p.category))];
}

/**
 * Create a path from preset with options
 */
export function createPathFromPreset(presetId: string, options?: PresetOptions): MotionPath | null {
  const preset = getPreset(presetId);
  if (!preset) return null;
  return preset.createPath(options);
}
