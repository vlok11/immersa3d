export const MOTION_CALC = {
  HALF: 0.5,
  NORMALIZE_OFFSET: 1,
  DOUBLE: 2,
  ORBIT_Y_SCALE: 0.4,             // 轨道Y缩放 (原 0.5)
  FLY_BY_Z_AMP: 3.5,              // 飞越Z幅度 (原 4)
  FLY_BY_Z_BASE: 10,              // 飞越Z基础 (原 12)
  FLY_BY_Z_SPEED_FACTOR: 0.4,     // 飞越Z速度因子 (原 0.5)
  FLY_BY_Y_SPEED_FACTOR: 0.6,     // 飞越Y速度因子 (原 0.7)
  SPIRAL_RADIUS_BASE: 12,         // 螺旋半径基础 (原 15)
  SPIRAL_RADIUS_FACTOR: 3,        // 螺旋半径因子 (原 4)
  SPIRAL_RADIUS_SPEED: 0.2,       // 螺旋半径速度 (原 0.25)
  SPIRAL_HEIGHT_SPEED: 0.35,      // 螺旋高度速度 (原 0.4)
  SPIRAL_ANGLE_FACTOR: 0.45,      // 螺旋角度因子 (原 0.5)
  SPIRAL_HEIGHT: 4,               // 螺旋高度 (原 5)
  ARC_RADIUS: 10,                 // 弧线半径 (原 12)
  ARC_ELEV_SPEED: 1.2,            // 弧线抬升速度 (原 1.5)
  ARC_ELEV_SCALE: 2.5,            // 弧线抬升缩放 (原 3)
  ARC_RANGE_FACTOR: 0.45,         // 弧线范围因子 (原 0.5)
  ARC_DEFAULT_ANGLE: 40,          // 弧线默认角度 (原 45)
  TRACKING_Z_OFFSET: 10,          // 追踪Z偏移 (原 12)
  TRACKING_ALPHA_BASE: 0.5,       // 追踪透明度基础 (原 0.6)
  TRACKING_ALPHA_SPEED: 0.35,     // 追踪透明度速度 (原 0.4)
  TRACKING_TARGET_Y_FACTOR: 0.4,  // 追踪目标Y因子 (原 0.5)
  DOLLY_MIN_DISTANCE: 4,          // 推拉最小距离 (原 5)
  BLEND_DEFAULT_Z: 8,             // 混合默认Z (原 9)
  BLEND_FACTOR: 0.25,             // 混合因子 (原 0.3)
  FLY_BY_SWING: 8,                // 飞越摆动 (原 10)
  ORBIT_TILT: 12,                 // 轨道倾斜 (原 15)
  DELTA_TIME_FACTOR: 20,          // 时间增量因子 (原 25)
  EPSILON: 0.001,
  MIN_DISTANCE: 0.1,
} as const;

export const MOTION_SPEED = {
  ORBIT: 0.5,
  FLY_BY: 0.4,
  SPIRAL: 0.3,
  ARC: 0.25,
  TRACKING: 0.35,
  DOLLY: 0.4,
} as const;

export const MS_PER_SECOND = 1000;
