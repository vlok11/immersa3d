/**
 * Looking Glass / 裸眼 3D 屏幕配置
 */

export interface LKGConfig {
  name: string;
  description: string;
  // 光栅/透镜参数
  pitch: number;        // 像素密度 (单位: pixels/view)
  tilt: number;         // 倾斜角度 (度)
  center: number;       // 中心偏移 (归一化 0-1)
  viewCone: number;     // 视锥角度 (度)
  
  // 视点配置
  numViews: number;     // 总视点数
  quiltCols: number;    // Quilt 列数
  quiltRows: number;    // Quilt 行数
  
  // 分辨率
  screenWidth: number;
  screenHeight: number;
  quiltWidth: number;
  quiltHeight: number;
}

/**
 * 预设配置 - Looking Glass 产品线
 */
export const LKG_PRESETS: Record<string, LKGConfig> = {
  // Looking Glass Portrait
  portrait: {
    name: 'Looking Glass Portrait',
    description: '7.9" 全息显示器',
    pitch: 354.42,
    tilt: -0.1153,
    center: 0.04239,
    viewCone: 40,
    numViews: 48,
    quiltCols: 8,
    quiltRows: 6,
    screenWidth: 1536,
    screenHeight: 2048,
    quiltWidth: 3360,
    quiltHeight: 3360
  },
  
  // Looking Glass Go
  go: {
    name: 'Looking Glass Go',
    description: '8" 便携全息显示器',
    pitch: 355,
    tilt: -0.12,
    center: 0.05,
    viewCone: 53,
    numViews: 100,
    quiltCols: 11,
    quiltRows: 10,
    screenWidth: 1440,
    screenHeight: 2560,
    quiltWidth: 4092,
    quiltHeight: 4092
  },
  
  // Looking Glass 16"
  looking_glass_16: {
    name: 'Looking Glass 16"',
    description: '16" 专业全息显示器',
    pitch: 335.49,
    tilt: -0.08,
    center: 0.03,
    viewCone: 50,
    numViews: 45,
    quiltCols: 9,
    quiltRows: 5,
    screenWidth: 2048,
    screenHeight: 2048,
    quiltWidth: 4096,
    quiltHeight: 4096
  },
  
  // 通用配置 (开发/测试用)
  generic: {
    name: '通用裸眼 3D',
    description: '通用配置，适用于大多数光栅屏',
    pitch: 350,
    tilt: -0.1,
    center: 0.05,
    viewCone: 45,
    numViews: 32,
    quiltCols: 8,
    quiltRows: 4,
    screenWidth: 1920,
    screenHeight: 1080,
    quiltWidth: 4096,
    quiltHeight: 4096
  }
};

/**
 * 从视点索引计算相机偏移
 */
export function calculateViewOffset(
  viewIndex: number, 
  config: LKGConfig
): { x: number; angle: number } {
  const totalViews = config.numViews;
  const viewConeRad = (config.viewCone * Math.PI) / 180;
  
  // 归一化视点位置 (-0.5 到 0.5)
  const normalizedIndex = (viewIndex / (totalViews - 1)) - 0.5;
  
  // 计算角度偏移
  const angle = normalizedIndex * viewConeRad;
  
  // 计算水平偏移（假设对象在原点）
  const x = Math.tan(angle) * 5; // 5 是参考距离
  
  return { x, angle };
}

/**
 * 计算 Quilt 中每个视图的 UV 坐标
 */
export function calculateQuiltTileUV(
  viewIndex: number,
  config: LKGConfig
): { u: number; v: number; width: number; height: number } {
  const col = viewIndex % config.quiltCols;
  const row = Math.floor(viewIndex / config.quiltCols);
  
  const tileWidth = 1 / config.quiltCols;
  const tileHeight = 1 / config.quiltRows;
  
  return {
    u: col * tileWidth,
    v: 1 - (row + 1) * tileHeight, // 从底部开始
    width: tileWidth,
    height: tileHeight
  };
}

/**
 * 验证配置是否有效
 */
export function validateConfig(config: LKGConfig): boolean {
  return (
    config.numViews > 0 &&
    config.quiltCols > 0 &&
    config.quiltRows > 0 &&
    config.quiltCols * config.quiltRows >= config.numViews &&
    config.viewCone > 0 &&
    config.viewCone <= 180
  );
}
