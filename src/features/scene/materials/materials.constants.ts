// ========== 动漫风格 ==========
export const ANIME_DEFAULTS = {
  SHADOW_STEPS: 4,                // 更多阴影层次 (原 3)
  SHADOW_THRESHOLD: 0.45,         // 更柔和的阴影边界 (原 0.5)
  HIGHLIGHT_SHARPNESS: 0.8,       // 更锐利的高光 (原 0.7)
  OUTLINE_WIDTH: 1.2,             // 更细腻的描边 (原 1.5)
  OUTLINE_COLOR_R: 0.1,           // 带有轻微暖色调的描边 (原 0.0)
  OUTLINE_COLOR_G: 0.08,
  OUTLINE_COLOR_B: 0.05,
  SKIN_TONE_BOOST: 0.4,           // 更明显的肤色增强 (原 0.3)
} as const;

// ========== 卡通着色 ==========
export const CEL_DEFAULTS = {
  COLOR_BANDS: 4,                 // 更多颜色层次 (原 3)
  OUTLINE_THICKNESS: 1.8,         // 略细的描边 (原 2.0)
  OUTLINE_COLOR_R: 0.05,          // 轻微暖调描边
  OUTLINE_COLOR_G: 0.03,
  OUTLINE_COLOR_B: 0.02,
  SHADOW_COLOR_R: 0.15,           // 更冷调的阴影 (原 0.2)
  SHADOW_COLOR_G: 0.15,           // (原 0.2)
  SHADOW_COLOR_B: 0.25,           // (原 0.3)
  HALFTONE_SIZE: 2.0,             // 添加半调效果 (原 0.0)
  SPECULAR_SIZE: 0.35,            // 略大的高光 (原 0.3)
} as const;

// ========== 水晶效果 ==========
export const CRYSTAL_DEFAULTS = {
  IOR: 1.45,                      // 略低的折射率更自然 (原 1.5)
  DISPERSION: 0.025,              // 更明显的色散 (原 0.02)
  FRESNEL_POWER: 2.8,             // 更强的菲涅尔效果 (原 2.5)
  TRANSMISSION: 0.92,             // 更透明 (原 0.9)
  CAUSTICS: 0.5,                  // 更明显的焦散 (原 0.4)
  CRYSTAL_COLOR_R: 0.88,          // 略带淡蓝色调
  CRYSTAL_COLOR_G: 0.93,
  CRYSTAL_COLOR_B: 1.0,
} as const;

// ========== 全息效果 ==========
export const HOLOGRAM_V2_DEFAULTS = {
  SCANLINE_INTENSITY: 0.5,        // 更柔和的扫描线 (原 0.6)
  SCANLINE_DENSITY: 60.0,         // 更密的扫描线 (原 50.0)
  RGB_OFFSET: 0.004,              // 更细微的色差 (原 0.005)
  FLICKER_SPEED: 1.5,             // 更慢更舒适的闪烁 (原 2.0)
  GLITCH_INTENSITY: 0.25,         // 更轻微的故障效果 (原 0.3)
  FRESNEL_POWER: 2.2,             // 调整边缘发光 (原 2.0)
  HOLO_COLOR_R: 0.1,              // 带有轻微蓝紫色调
  HOLO_COLOR_G: 0.9,
  HOLO_COLOR_B: 1.0,
  DATA_STREAM_SPEED: 1.2,         // 更慢的数据流 (原 1.5)
} as const;

// ========== 水墨风格 ==========
export const INK_WASH_DEFAULTS = {
  INK_DENSITY: 0.75,              // 更浓的墨色 (原 0.7)
  BLEED_AMOUNT: 0.6,              // 更明显的晕染 (原 0.5)
  PAPER_TEXTURE: 0.5,             // 更明显的纸张纹理 (原 0.4)
  BRUSH_TEXTURE: 0.7,             // 更强的笔触感 (原 0.6)
  WHITE_SPACE: 0.35,              // 略多的留白 (原 0.3)
  EDGE_WOBBLE: 0.35,              // 更自然的边缘 (原 0.4)
} as const;

// ========== 赛博朋克/矩阵 ==========
export const MATRIX_DEFAULTS = {
  FALL_SPEED: 1.8,                // 更慢更清晰的下落 (原 2.0)
  CHAR_DENSITY: 0.7,              // 更密集的字符 (原 0.6)
  GLOW_INTENSITY: 1.4,            // 更强的发光 (原 1.2)
  TRAIL_LENGTH: 0.6,              // 更长的拖尾 (原 0.5)
  MATRIX_COLOR_R: 0.05,           // 略带青色调 (原 0.0)
  MATRIX_COLOR_G: 1.0,
  MATRIX_COLOR_B: 0.85,           // (原 0.9)
  CHAR_SIZE: 10.0,                // 更大的字符 (原 8.0)
  SHOW_ORIGINAL: 0.4,             // 更清晰的原图显示 (原 0.5)
} as const;

// ========== 正常模式 ==========
export const NORMAL_DEFAULTS = {
  BRIGHTNESS: 1.02,               // 轻微提亮 (原 1.0)
  CONTRAST: 1.05,                 // 轻微增强对比 (原 1.0)
  SATURATION: 1.08,               // 轻微增强饱和度 (原 1.0)
} as const;

// ========== 复古像素 ==========
export const RETRO_PIXEL_DEFAULTS = {
  PIXEL_SIZE: 3.0,                // 更小的像素更精细 (原 4.0)
  PALETTE_MODE: 1,                // 默认 SNES 调色板 (原 0 NES)
  DITHER_STRENGTH: 0.45,          // 略轻的抖动 (原 0.5)
  CRT_EFFECT: 0.25,               // 更轻的CRT效果 (原 0.3)
  COLOR_DEPTH: 24,                // 更多颜色 (原 16)
  SCANLINE_BRIGHTNESS: 0.9,       // 更亮的扫描线 (原 0.85)
} as const;

// ========== 通用默认值 ==========
export const UNIFORM_DEFAULTS = {
  ZERO: 0.0,
  ONE: 1.0,
  OPACITY_DEFAULT: 1.0,
  EDGE_FADE_DEFAULT: 0.75,        // 更柔和的边缘 (原 0.8)
  SEAM_CORRECTION_DEFAULT: 0.0,
  DISPLACEMENT_SCALE_DEFAULT: 0.0,
  DISPLACEMENT_BIAS_DEFAULT: 0.0,
} as const;

export const TEXTURE = {
  DEFAULT_TEXEL_SIZE: 1024,
} as const;
