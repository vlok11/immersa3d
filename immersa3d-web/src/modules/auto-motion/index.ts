// ============================================================
// Immersa 3D - Auto Motion Module
// Public API exports
// ============================================================

// Module
export { AutoMotionModule, autoMotionModule } from './AutoMotionModule';
export type {
  AutoMotionConfig,
  AutoMotionState,
  Keyframe,
  MotionPath,
  InterpolationType,
  EasingType,
} from './AutoMotionModule';

// Utils
export { KeyframeManager } from './utils/keyframeManager';
export type { KeyframeSnapshot, InterpolatedState } from './utils/keyframeManager';
export { lerp, lerpVec3, applyEasing } from './utils/keyframeManager';

export { BezierCurveGenerator, calculateArcLength, reparameterizeByArcLength } from './utils/bezierCurveGenerator';
export type { Point3D, Point2D, BezierControlPoints, BezierSegment } from './utils/bezierCurveGenerator';

export { TimelineController, globalTimeline, createTimeline } from './utils/timelineController';
export type { TimelineState, TimelineCallback } from './utils/timelineController';

// Presets
export { MOTION_PRESETS, getPreset, getPresetsByCategory, getPresetCategories, createPathFromPreset } from './presets/motionPresetsLibrary';
export type { MotionPreset, PresetCategory, PresetOptions } from './presets/motionPresetsLibrary';

// Components
export { PathEditor } from './components/PathEditor';
export { EasingCurveEditor } from './components/EasingCurveEditor';
export { MotionPreviewer } from './components/MotionPreviewer';
