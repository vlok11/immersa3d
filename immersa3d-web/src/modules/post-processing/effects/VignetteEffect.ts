// ============================================================
// Immersa 3D - Vignette Effect
// Radial brightness falloff post-processing
// ============================================================

import * as THREE from 'three';

/**
 * Vignette effect configuration
 */
export interface VignetteConfig {
  intensity: number;
  smoothness: number;
  roundness: number;
}

/**
 * Default vignette configuration
 */
const DEFAULT_CONFIG: VignetteConfig = {
  intensity: 0.4,
  smoothness: 0.5,
  roundness: 1.0,
};

/**
 * VignetteEffect - Radial brightness falloff
 * 
 * Creates a classic vignette effect with configurable
 * intensity, smoothness, and roundness parameters.
 */
export class VignetteEffect {
  private config: VignetteConfig;
  private material: THREE.ShaderMaterial | null = null;
  
  constructor(config?: Partial<VignetteConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Initialize effect material
   */
  initialize(): void {
    this.dispose();
    
    this.material = new THREE.ShaderMaterial({
      vertexShader: fullscreenVertexShader,
      fragmentShader: vignetteFragmentShader,
      uniforms: {
        uTexture: { value: null },
        uIntensity: { value: this.config.intensity },
        uSmoothness: { value: this.config.smoothness },
        uRoundness: { value: this.config.roundness },
      },
      transparent: true,
    });
  }
  
  /**
   * Get material
   */
  getMaterial(): THREE.ShaderMaterial | null {
    return this.material;
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<VignetteConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.material) {
      this.material.uniforms.uIntensity.value = this.config.intensity;
      this.material.uniforms.uSmoothness.value = this.config.smoothness;
      this.material.uniforms.uRoundness.value = this.config.roundness;
    }
  }
  
  /**
   * Get configuration
   */
  getConfig(): VignetteConfig {
    return { ...this.config };
  }
  
  /**
   * Dispose resources
   */
  dispose(): void {
    this.material?.dispose();
    this.material = null;
  }
}

/**
 * Fullscreen vertex shader
 */
const fullscreenVertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

/**
 * Vignette fragment shader
 */
const vignetteFragmentShader = `
  uniform sampler2D uTexture;
  uniform float uIntensity;
  uniform float uSmoothness;
  uniform float uRoundness;
  
  varying vec2 vUv;
  
  void main() {
    vec4 color = texture2D(uTexture, vUv);
    
    // Calculate distance from center
    vec2 center = vUv - 0.5;
    
    // Apply roundness (1.0 = circular, <1.0 = horizontal oval, >1.0 = vertical oval)
    center.x *= uRoundness;
    
    float dist = length(center) * 2.0;
    
    // Smooth vignette falloff
    float vignette = smoothstep(1.0 - uSmoothness, 1.0, dist);
    vignette = 1.0 - vignette * uIntensity;
    
    // Apply vignette
    gl_FragColor = vec4(color.rgb * vignette, color.a);
  }
`;

export default VignetteEffect;
