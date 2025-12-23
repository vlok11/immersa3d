/**
 * 交错渲染 Shader
 * 用于裸眼 3D 光栅屏的交错条纹输出
 */

import * as THREE from 'three';

export interface InterlacedShaderUniforms {
  viewTextures: { value: THREE.Texture[] };
  numViews: { value: number };
  pitch: { value: number };
  tilt: { value: number };
  center: { value: number };
  screenWidth: { value: number };
  screenHeight: { value: number };
}

/**
 * 交错渲染 Shader Material
 */
export function createInterlacedMaterial(numViews: number): THREE.ShaderMaterial {
  // 创建 texture array uniform
  const viewTextures: THREE.Texture[] = [];
  for (let i = 0; i < numViews; i++) {
    viewTextures.push(new THREE.Texture());
  }
  
  return new THREE.ShaderMaterial({
    uniforms: {
      viewTextures: { value: viewTextures },
      numViews: { value: numViews },
      pitch: { value: 354.0 },
      tilt: { value: -0.1153 },
      center: { value: 0.04239 },
      screenWidth: { value: 1536 },
      screenHeight: { value: 2048 }
    },
    vertexShader: `
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D viewTextures[32]; // 最大支持 32 视点
      uniform int numViews;
      uniform float pitch;
      uniform float tilt;
      uniform float center;
      uniform float screenWidth;
      uniform float screenHeight;
      
      varying vec2 vUv;
      
      void main() {
        // 屏幕像素坐标
        vec2 pixelCoord = vUv * vec2(screenWidth, screenHeight);
        
        // 计算当前像素对应的视点索引
        // 基于光栅透镜的光学原理
        float subpixel = mod(pixelCoord.x, 3.0); // RGB 子像素
        float slope = tilt * screenHeight;
        
        // 计算视点索引
        float viewIndex = (pixelCoord.x + pixelCoord.y * slope + center * screenWidth) / pitch;
        viewIndex = mod(viewIndex, float(numViews));
        
        // 插值采样
        int idx0 = int(floor(viewIndex));
        int idx1 = int(mod(float(idx0 + 1), float(numViews)));
        float t = fract(viewIndex);
        
        // 从对应视点纹理采样
        vec4 color0 = texture2D(viewTextures[idx0], vUv);
        vec4 color1 = texture2D(viewTextures[idx1], vUv);
        
        // 线性插值
        gl_FragColor = mix(color0, color1, t);
      }
    `
  });
}

/**
 * 简化版交错 Shader（使用单张 Quilt 纹理）
 */
export function createQuiltInterlacedMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      quiltTex: { value: null },
      numViews: { value: 32 },
      quiltCols: { value: 8 },
      quiltRows: { value: 4 },
      pitch: { value: 354.0 },
      tilt: { value: -0.1153 },
      center: { value: 0.04239 },
      screenWidth: { value: 1536 },
      screenHeight: { value: 2048 }
    },
    vertexShader: `
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D quiltTex;
      uniform int numViews;
      uniform int quiltCols;
      uniform int quiltRows;
      uniform float pitch;
      uniform float tilt;
      uniform float center;
      uniform float screenWidth;
      uniform float screenHeight;
      
      varying vec2 vUv;
      
      vec4 sampleView(int viewIdx, vec2 uv) {
        // 计算视点在 Quilt 中的位置
        int col = viewIdx - (viewIdx / quiltCols) * quiltCols;
        int row = viewIdx / quiltCols;
        
        float tileWidth = 1.0 / float(quiltCols);
        float tileHeight = 1.0 / float(quiltRows);
        
        vec2 tileUV = vec2(
          float(col) * tileWidth + uv.x * tileWidth,
          float(row) * tileHeight + uv.y * tileHeight
        );
        
        return texture2D(quiltTex, tileUV);
      }
      
      void main() {
        vec2 pixelCoord = vUv * vec2(screenWidth, screenHeight);
        
        float slope = tilt * screenHeight;
        float viewIndex = (pixelCoord.x + pixelCoord.y * slope + center * screenWidth) / pitch;
        viewIndex = mod(viewIndex, float(numViews));
        
        int idx0 = int(floor(viewIndex));
        int idx1 = int(mod(float(idx0 + 1), float(numViews)));
        float t = fract(viewIndex);
        
        vec4 color0 = sampleView(idx0, vUv);
        vec4 color1 = sampleView(idx1, vUv);
        
        gl_FragColor = mix(color0, color1, t);
      }
    `
  });
}
