// ============================================================
// Immersa 3D - Bloom Effect
// Unreal Engine style bloom post-processing
// ============================================================

import * as THREE from 'three';

/**
 * Bloom effect configuration
 */
export interface BloomConfig {
  intensity: number;
  threshold: number;
  radius: number;
  levels: number;
}

/**
 * Default bloom configuration
 */
const DEFAULT_CONFIG: BloomConfig = {
  intensity: 0.5,
  threshold: 0.8,
  radius: 0.4,
  levels: 5,
};

/**
 * BloomEffect - Unreal Engine style glow effect
 * 
 * Implements multi-pass blur pyramid for realistic bloom.
 * Uses threshold extraction, blur pyramid, and composite pass.
 */
export class BloomEffect {
  private config: BloomConfig;
  private renderTargetBright: THREE.WebGLRenderTarget | null = null;
  private renderTargetsHorizontal: THREE.WebGLRenderTarget[] = [];
  private renderTargetsVertical: THREE.WebGLRenderTarget[] = [];
  private brightMaterial: THREE.ShaderMaterial | null = null;
  private blurMaterials: THREE.ShaderMaterial[] = [];
  private compositeMaterial: THREE.ShaderMaterial | null = null;
  
  constructor(config?: Partial<BloomConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Initialize render targets and materials
   */
  initialize(width: number, height: number): void {
    this.dispose();
    
    // Create brightness extraction target
    this.renderTargetBright = this.createRenderTarget(width, height);
    
    // Create blur pyramid targets
    let resx = Math.round(width / 2);
    let resy = Math.round(height / 2);
    
    for (let i = 0; i < this.config.levels; i++) {
      this.renderTargetsHorizontal.push(this.createRenderTarget(resx, resy));
      this.renderTargetsVertical.push(this.createRenderTarget(resx, resy));
      
      resx = Math.round(resx / 2);
      resy = Math.round(resy / 2);
    }
    
    // Create brightness extraction material
    this.brightMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVertexShader,
      fragmentShader: brightPassFragmentShader,
      uniforms: {
        uTexture: { value: null },
        uThreshold: { value: this.config.threshold },
      },
    });
    
    // Kernel sizes for each blur level - reserved for future variable kernel implementation
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _kernelSizes = [3, 5, 7, 9, 11];
    
    for (let i = 0; i < this.config.levels; i++) {
      const blurMaterial = new THREE.ShaderMaterial({
        vertexShader: fullscreenVertexShader,
        fragmentShader: gaussianBlurFragmentShader,
        uniforms: {
          uTexture: { value: null },
          uDirection: { value: new THREE.Vector2(1, 0) },
          uResolution: { value: new THREE.Vector2(width, height) },
        },
      });
      
      this.blurMaterials.push(blurMaterial);
    }
    
    // Create composite material
    this.compositeMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVertexShader,
      fragmentShader: bloomCompositeFragmentShader,
      uniforms: {
        uOriginal: { value: null },
        uBloom0: { value: null },
        uBloom1: { value: null },
        uBloom2: { value: null },
        uBloom3: { value: null },
        uBloom4: { value: null },
        uIntensity: { value: this.config.intensity },
        uRadius: { value: this.config.radius },
      },
    });
  }
  
  /**
   * Create render target
   */
  private createRenderTarget(width: number, height: number): THREE.WebGLRenderTarget {
    return new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    });
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<BloomConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.brightMaterial) {
      this.brightMaterial.uniforms.uThreshold.value = this.config.threshold;
    }
    
    if (this.compositeMaterial) {
      this.compositeMaterial.uniforms.uIntensity.value = this.config.intensity;
      this.compositeMaterial.uniforms.uRadius.value = this.config.radius;
    }
  }
  
  /**
   * Get configuration
   */
  getConfig(): BloomConfig {
    return { ...this.config };
  }
  
  /**
   * Dispose all resources
   */
  dispose(): void {
    this.renderTargetBright?.dispose();
    this.renderTargetBright = null;
    
    this.renderTargetsHorizontal.forEach((rt) => rt.dispose());
    this.renderTargetsHorizontal = [];
    
    this.renderTargetsVertical.forEach((rt) => rt.dispose());
    this.renderTargetsVertical = [];
    
    this.brightMaterial?.dispose();
    this.brightMaterial = null;
    
    this.blurMaterials.forEach((mat) => mat.dispose());
    this.blurMaterials = [];
    
    this.compositeMaterial?.dispose();
    this.compositeMaterial = null;
  }
}

/**
 * Fullscreen quad vertex shader
 */
const fullscreenVertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

/**
 * Brightness extraction fragment shader
 */
const brightPassFragmentShader = `
  uniform sampler2D uTexture;
  uniform float uThreshold;
  
  varying vec2 vUv;
  
  void main() {
    vec4 color = texture2D(uTexture, vUv);
    
    // Calculate luminance
    float luminance = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    
    // Extract bright pixels above threshold
    float brightness = max(0.0, luminance - uThreshold);
    
    // Soft threshold transition
    float contribution = brightness / (brightness + 1.0);
    
    gl_FragColor = vec4(color.rgb * contribution, 1.0);
  }
`;

/**
 * Gaussian blur fragment shader
 */
const gaussianBlurFragmentShader = `
  uniform sampler2D uTexture;
  uniform vec2 uDirection;
  uniform vec2 uResolution;
  
  varying vec2 vUv;
  
  // 9-tap Gaussian kernel
  const float weights[5] = float[5](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
  
  void main() {
    vec2 texelSize = 1.0 / uResolution;
    vec3 result = texture2D(uTexture, vUv).rgb * weights[0];
    
    for (int i = 1; i < 5; i++) {
      vec2 offset = uDirection * texelSize * float(i);
      result += texture2D(uTexture, vUv + offset).rgb * weights[i];
      result += texture2D(uTexture, vUv - offset).rgb * weights[i];
    }
    
    gl_FragColor = vec4(result, 1.0);
  }
`;

/**
 * Bloom composite fragment shader
 */
const bloomCompositeFragmentShader = `
  uniform sampler2D uOriginal;
  uniform sampler2D uBloom0;
  uniform sampler2D uBloom1;
  uniform sampler2D uBloom2;
  uniform sampler2D uBloom3;
  uniform sampler2D uBloom4;
  uniform float uIntensity;
  uniform float uRadius;
  
  varying vec2 vUv;
  
  void main() {
    vec3 original = texture2D(uOriginal, vUv).rgb;
    
    // Combine bloom levels with falloff
    vec3 bloom = vec3(0.0);
    bloom += texture2D(uBloom0, vUv).rgb * 1.0;
    bloom += texture2D(uBloom1, vUv).rgb * 0.8;
    bloom += texture2D(uBloom2, vUv).rgb * 0.6;
    bloom += texture2D(uBloom3, vUv).rgb * 0.4;
    bloom += texture2D(uBloom4, vUv).rgb * 0.2;
    
    bloom *= uIntensity;
    
    // Additive blending
    vec3 result = original + bloom * uRadius;
    
    gl_FragColor = vec4(result, 1.0);
  }
`;

export default BloomEffect;
