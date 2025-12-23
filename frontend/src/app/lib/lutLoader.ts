/**
 * LUT 加载器
 * 加载 .cube 格式的 3D LUT 文件
 */

import * as THREE from 'three';

export interface LUTData {
  size: number;
  data: Float32Array;
  texture3D: THREE.Data3DTexture;
}

/**
 * 解析 .cube LUT 文件
 */
export async function loadCubeLUT(url: string): Promise<LUTData> {
  const response = await fetch(url);
  const text = await response.text();
  
  return parseCubeLUT(text);
}

/**
 * 解析 .cube 文本内容
 */
export function parseCubeLUT(cubeContent: string): LUTData {
  const lines = cubeContent.split('\n');
  let size = 0;
  const data: number[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // 跳过注释和空行
    if (trimmed.startsWith('#') || trimmed === '') continue;
    
    // 解析 LUT 尺寸
    if (trimmed.startsWith('LUT_3D_SIZE')) {
      size = parseInt(trimmed.split(' ')[1]);
      continue;
    }
    
    // 跳过其他元数据
    if (trimmed.startsWith('TITLE') || 
        trimmed.startsWith('DOMAIN_MIN') || 
        trimmed.startsWith('DOMAIN_MAX')) {
      continue;
    }
    
    // 解析 RGB 值
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 3) {
      const r = parseFloat(parts[0]);
      const g = parseFloat(parts[1]);
      const b = parseFloat(parts[2]);
      
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        data.push(r, g, b);
      }
    }
  }
  
  if (size === 0 || data.length === 0) {
    throw new Error('Invalid LUT file format');
  }
  
  // 创建 Float32Array
  const floatData = new Float32Array(data);
  
  // 创建 3D 纹理
  const texture3D = new THREE.Data3DTexture(
    floatData,
    size,
    size,
    size
  );
  texture3D.format = THREE.RGBFormat;
  texture3D.type = THREE.FloatType;
  texture3D.minFilter = THREE.LinearFilter;
  texture3D.magFilter = THREE.LinearFilter;
  texture3D.wrapS = THREE.ClampToEdgeWrapping;
  texture3D.wrapT = THREE.ClampToEdgeWrapping;
  texture3D.wrapR = THREE.ClampToEdgeWrapping;
  texture3D.needsUpdate = true;
  
  return { size, data: floatData, texture3D };
}

/**
 * LUT Shader
 */
export const LUTShader = {
  uniforms: {
    tDiffuse: { value: null },
    lutMap: { value: null },
    lutSize: { value: 32.0 },
    intensity: { value: 1.0 }
  },
  
  vertexShader: `
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler3D lutMap;
    uniform float lutSize;
    uniform float intensity;
    
    varying vec2 vUv;
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      
      // 将颜色值映射到 LUT 采样坐标
      float scale = (lutSize - 1.0) / lutSize;
      float offset = 0.5 / lutSize;
      
      vec3 lutCoord = color.rgb * scale + offset;
      vec3 lutColor = texture(lutMap, lutCoord).rgb;
      
      // 混合原色和 LUT 处理后的颜色
      gl_FragColor = vec4(mix(color.rgb, lutColor, intensity), color.a);
    }
  `
};

/**
 * 预设 LUT
 */
export const LUT_PRESETS = [
  { name: '无', value: null },
  { name: '电影感', value: 'cinematic.cube' },
  { name: '暖色调', value: 'warm.cube' },
  { name: '冷色调', value: 'cool.cube' },
  { name: '复古', value: 'vintage.cube' },
  { name: '黑白', value: 'bw.cube' },
  { name: '橙青', value: 'teal_orange.cube' }
];
