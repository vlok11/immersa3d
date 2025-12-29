// ============================================================
// Immersa 3D - Chromatic Aberration Effect
// RGB channel separation at screen edges
// ============================================================

import * as THREE from 'three';

/**
 * Chromatic Aberration configuration
 */
export interface ChromaticAberrationConfig {
  offset: number;
  radialFalloff: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ChromaticAberrationConfig = {
  offset: 0.003,
  radialFalloff: true,
};

/**
 * ChromaticAberrationEffect - RGB channel separation
 * 
 * Simulates lens chromatic aberration by offsetting
 * RGB channels at screen edges.
 */
export class ChromaticAberrationEffect {
  private config: ChromaticAberrationConfig;
  private material: THREE.ShaderMaterial | null = null;
  
  constructor(config?: Partial<ChromaticAberrationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Initialize effect material
   */
  initialize(): void {
    this.dispose();
    
    this.material = new THREE.ShaderMaterial({
      vertexShader: fullscreenVertexShader,
      fragmentShader: chromaticAberrationFragmentShader,
      uniforms: {
        uTexture: { value: null },
        uOffset: { value: this.config.offset },
        uRadialFalloff: { value: this.config.radialFalloff ? 1.0 : 0.0 },
      },
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
  updateConfig(config: Partial<ChromaticAberrationConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.material) {
      this.material.uniforms.uOffset.value = this.config.offset;
      this.material.uniforms.uRadialFalloff.value = this.config.radialFalloff ? 1.0 : 0.0;
    }
  }
  
  /**
   * Get configuration
   */
  getConfig(): ChromaticAberrationConfig {
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
 * Chromatic aberration fragment shader
 */
const chromaticAberrationFragmentShader = `
  uniform sampler2D uTexture;
  uniform float uOffset;
  uniform float uRadialFalloff;
  
  varying vec2 vUv;
  
  void main() {
    // Direction from center
    vec2 direction = vUv - 0.5;
    
    // Distance from center for radial falloff
    float dist = length(direction);
    
    // Apply radial falloff if enabled
    float strength = uRadialFalloff > 0.5 ? dist * 2.0 : 1.0;
    strength = clamp(strength, 0.0, 1.0);
    
    // Normalize direction
    vec2 dir = normalize(direction);
    
    // Calculate offset for each channel
    float offset = uOffset * strength;
    
    // Sample each channel with offset
    float r = texture2D(uTexture, vUv + dir * offset).r;
    float g = texture2D(uTexture, vUv).g;
    float b = texture2D(uTexture, vUv - dir * offset).b;
    
    gl_FragColor = vec4(r, g, b, 1.0);
  }
`;

export default ChromaticAberrationEffect;
