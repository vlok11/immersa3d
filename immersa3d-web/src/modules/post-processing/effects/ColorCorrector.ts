// ============================================================
// Immersa 3D - Color Corrector Effect
// Brightness, contrast, saturation adjustment
// ============================================================

import * as THREE from 'three';

/**
 * Color correction configuration
 */
export interface ColorCorrectorConfig {
  brightness: number;
  contrast: number;
  saturation: number;
  gamma: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ColorCorrectorConfig = {
  brightness: 0.0,
  contrast: 1.0,
  saturation: 1.0,
  gamma: 1.0,
};

/**
 * ColorCorrector - Basic color grading
 * 
 * Provides fundamental color correction controls for
 * brightness, contrast, saturation, and gamma.
 */
export class ColorCorrector {
  private config: ColorCorrectorConfig;
  private material: THREE.ShaderMaterial | null = null;
  
  constructor(config?: Partial<ColorCorrectorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Initialize effect material
   */
  initialize(): void {
    this.dispose();
    
    this.material = new THREE.ShaderMaterial({
      vertexShader: fullscreenVertexShader,
      fragmentShader: colorCorrectionFragmentShader,
      uniforms: {
        uTexture: { value: null },
        uBrightness: { value: this.config.brightness },
        uContrast: { value: this.config.contrast },
        uSaturation: { value: this.config.saturation },
        uGamma: { value: this.config.gamma },
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
  updateConfig(config: Partial<ColorCorrectorConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.material) {
      this.material.uniforms.uBrightness.value = this.config.brightness;
      this.material.uniforms.uContrast.value = this.config.contrast;
      this.material.uniforms.uSaturation.value = this.config.saturation;
      this.material.uniforms.uGamma.value = this.config.gamma;
    }
  }
  
  /**
   * Get configuration
   */
  getConfig(): ColorCorrectorConfig {
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
 * Color correction fragment shader
 */
const colorCorrectionFragmentShader = `
  uniform sampler2D uTexture;
  uniform float uBrightness;
  uniform float uContrast;
  uniform float uSaturation;
  uniform float uGamma;
  
  varying vec2 vUv;
  
  // Luminance coefficients (Rec. 709)
  const vec3 LUMINANCE_WEIGHTS = vec3(0.2126, 0.7152, 0.0722);
  
  void main() {
    vec4 color = texture2D(uTexture, vUv);
    vec3 rgb = color.rgb;
    
    // Apply brightness
    rgb += uBrightness;
    
    // Apply contrast
    rgb = (rgb - 0.5) * uContrast + 0.5;
    
    // Apply saturation
    float luminance = dot(rgb, LUMINANCE_WEIGHTS);
    rgb = mix(vec3(luminance), rgb, uSaturation);
    
    // Apply gamma correction
    rgb = pow(max(rgb, vec3(0.0)), vec3(1.0 / uGamma));
    
    // Clamp to valid range
    rgb = clamp(rgb, 0.0, 1.0);
    
    gl_FragColor = vec4(rgb, color.a);
  }
`;

export default ColorCorrector;
