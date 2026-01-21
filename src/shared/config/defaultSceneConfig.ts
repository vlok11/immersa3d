import {
  CameraMode,
  CameraMotionType,
  ColorGradePreset,
  MirrorMode,
  ProjectionMode,
  RenderStyle,
} from '@/shared/types';

import type { SceneConfig } from '@/shared/types';

export const DEFAULT_SCENE_CONFIG: SceneConfig = {
  // ========== 深度与几何 ==========
  displacementScale: 1.5,        // 提高深度感 (原 1.2)
  wireframe: false,
  meshDensity: 256,               // 更高密度以获得更平滑效果 (原 192)
  mirrorMode: MirrorMode.NONE,

  // ========== 相机运动 ==========
  autoRotate: false,
  cameraMotionType: CameraMotionType.STATIC,
  cameraMotionSpeed: 0.5,         // 更平滑的运动速度 (原 0.6)
  cameraMotionBlend: 'additive',
  motionResumeDelayMs: 1000,      // 稍长的恢复延迟 (原 800)
  motionResumeTransitionMs: 400,  // 更平滑的过渡 (原 300)
  orbitRadius: 10,                // 更近的轨道 (原 12)
  orbitTilt: 15,
  flyByHeight: 3,
  flyBySwing: 12,
  spiralLoops: 2,
  spiralHeight: 8,
  arcAngle: 90,
  arcRhythm: 1,
  trackingDistance: 12,
  trackingOffset: 0,
  dollyRange: 20,
  dollyIntensity: 1,
  fov: 50,                        // 更小FOV获得更沉浸的视角 (原 55)
  orthoZoom: 18,                  // 调整正交缩放 (原 20)
  orthoZoomMin: 1,                // 正交模式最小缩放
  orthoZoomMax: 100,              // 正交模式最大缩放
  cameraMode: CameraMode.PERSPECTIVE,
  minDistance: 2,                 // 稍远的最小距离 (原 1.5)
  maxDistance: 35,                // 略小的最大距离 (原 40)
  dampingFactor: 0.06,            // 更平滑的阻尼 (原 0.08)
  rotateSpeed: 0.5,               // 更慢更精确的旋转 (原 0.6)
  zoomSpeed: 0.7,                 // 更平滑的缩放 (原 0.8)
  verticalShift: 0,
  enablePan: true,
  panSpeed: 0.5,                  // 更平滑的平移 (原 0.6)
  minPolarAngle: 0,
  maxPolarAngle: Math.PI,
  isImmersive: false,
  showGrid: false,
  showAxes: false,

  // ========== 渲染风格 ==========
  renderStyle: RenderStyle.NORMAL,  // 默认使用正常风格
  roughness: 0.5,                 // 更低的粗糙度获得更光滑感 (原 0.6)
  metalness: 0.15,                // 略低的金属度 (原 0.2)
  lightIntensity: 1.3,            // 稍强的光照 (原 1.2)
  exposure: 1.15,                 // 稍高的曝光 (原 1.1)
  // ========== 投影与环境 ==========
  projectionMode: ProjectionMode.PLANE,
  projectionAngle: 180,
  depthInvert: false,
  backgroundIntensity: 0.85,      // 稍高的背景强度 (原 0.8)
  enableNakedEye3D: false,
  enableParticles: false,
  edgeFade: 0.75,                 // 更柔和的边缘淡化 (原 0.8)
  parallaxScale: 0.35,            // 稍强的视差 (原 0.3)
  depthFog: 0.15,                 // 更柔和的深度雾 (原 0.2)

  // ========== 光照与调色 ==========
  lightAngleX: 40,                // 稍低的角度 (原 45)
  lightAngleY: 35,                // 稍高的侧光角度 (原 30)
  vignetteStrength: 0,              // 暗角已禁用
  particleType: 'dust',
  videoMuted: true,
  enableFrameInterpolation: true,
  enableVignette: false,            // 禁用暗角功能
  colorGrade: ColorGradePreset.CINEMATIC,
  saturation: 1.1,                // 稍高的饱和度 (原 1.08)
  contrast: 1.08,                 // 稍高的对比度 (原 1.05)
  brightness: 1.02,               // 稍亮 (原 1.0)
};
