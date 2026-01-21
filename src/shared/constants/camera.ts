export const CAMERA_LIMITS = {
  NEAR: 0.1,
  FAR: 1000,
} as const;

export const CAMERA_ANIMATION = {
  PRESET: 700,          // 预设切换动画时长 (原 600)
  BOOKMARK: 900,        // 书签切换动画时长 (原 800)
} as const;

export const CAMERA_ANIMATOR = {
  FOV: 50,              // 默认FOV (原 55)
  POSITION_Z: 8,        // 默认Z位置 (原 9)
  MOVE_DURATION: 600,   // 移动动画时长 (原 500)
  LOOK_DURATION: 600,   // 朝向动画时长 (原 500)
  FOV_DURATION: 350,    // FOV动画时长 (原 300)
  LERP_FACTOR: 0.06,    // 更平滑的线性插值 (原 0.08)
  FOV_LERP_FACTOR: 0.1, // FOV插值因子 (原 0.12)
  FOV_THRESHOLD: 0.01,
  RESUME_TRANSITION_MS: 400,  // 恢复过渡时长 (原 300)
  BLEND_FACTOR: 0.25,   // 混合因子 (原 0.3)
  EASING_POWER: 2.5,    // 缓动幂次 (原 3)
  DELTA_MULTIPLIER: 6,  // 增量乘数 (原 8)
  EPSILON: 0.0001,
  PROGRESS_THRESHOLD: 0.01,
} as const;

export const PERSPECTIVE_ORTHO = {
  DEFAULT_FOV: 55,
  BASE_ZOOM: 20,
  FOV_MIN: 10,
  FOV_MAX: 120,
  DEG_TO_RAD_HALF: 180,
  REFERENCE_DISTANCE: 9,
  REFERENCE_HEIGHT: 10,
} as const;

export const CAMERA_TRANSITION = {
  EPSILON: 0.0001,
  ABOVE_Z_OFFSET: 0.1,
  MODE_DURATION: 400,
} as const;
