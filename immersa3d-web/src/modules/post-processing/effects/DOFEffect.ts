// ============================================================
// Immersa 3D - DOF (Depth of Field) Effect
// Bokeh-style depth-based blur
// ============================================================

import * as THREE from 'three';

/**
 * DOF effect configuration
 */
export interface DOFConfig {
  focusDistance: number;
  focusRange: number;
  aperture: number;
  maxBlur: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: DOFConfig = {
  focusDistance: 5.0,
  focusRange: 3.0,
  aperture: 0.025,
  maxBlur: 0.01,
};

/**
 * DOFEffect - Depth of Field blur
 * 
 * Creates bokeh-style depth-based blur effect using
 * the depth buffer to determine blur amount.
 */
export class DOFEffect {
  private config: DOFConfig;
  private material: THREE.ShaderMaterial | null = null;
  
  constructor(config?: Partial<DOFConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Initialize effect material
   */
  initialize(): void {
    this.dispose();
    
    this.material = new THREE.ShaderMaterial({
      vertexShader: fullscreenVertexShader,
      fragmentShader: dofFragmentShader,
      uniforms: {
        uTexture: { value: null },
        uDepthTexture: { value: null },
        uFocusDistance: { value: this.config.focusDistance },
        uFocusRange: { value: this.config.focusRange },
        uAperture: { value: this.config.aperture },
        uMaxBlur: { value: this.config.maxBlur },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uCameraNear: { value: 0.1 },
        uCameraFar: { value: 1000 },
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
  updateConfig(config: Partial<DOFConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.material) {
      this.material.uniforms.uFocusDistance.value = this.config.focusDistance;
      this.material.uniforms.uFocusRange.value = this.config.focusRange;
      this.material.uniforms.uAperture.value = this.config.aperture;
      this.material.uniforms.uMaxBlur.value = this.config.maxBlur;
    }
  }
  
  /**
   * Update resolution
   */
  setResolution(width: number, height: number): void {
    if (this.material) {
      this.material.uniforms.uResolution.value.set(width, height);
    }
  }
  
  /**
   * Update camera parameters
   */
  setCameraParams(near: number, far: number): void {
    if (this.material) {
      this.material.uniforms.uCameraNear.value = near;
      this.material.uniforms.uCameraFar.value = far;
    }
  }
  
  /**
   * Get configuration
   */
  getConfig(): DOFConfig {
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
 * DOF fragment shader with bokeh
 */
const dofFragmentShader = `
  uniform sampler2D uTexture;
  uniform sampler2D uDepthTexture;
  uniform float uFocusDistance;
  uniform float uFocusRange;
  uniform float uAperture;
  uniform float uMaxBlur;
  uniform vec2 uResolution;
  uniform float uCameraNear;
  uniform float uCameraFar;
  
  varying vec2 vUv;
  
  // Convert depth buffer value to linear depth
  float linearizeDepth(float depth) {
    float z = depth * 2.0 - 1.0;
    return (2.0 * uCameraNear * uCameraFar) / (uCameraFar + uCameraNear - z * (uCameraFar - uCameraNear));
  }
  
  // Bokeh kernel samples (circular pattern)
  const int SAMPLES = 16;
  const vec2 BOKEH_KERNEL[16] = vec2[16](
    vec2(0.0, 0.0),
    vec2(0.54545456, 0.0),
    vec2(0.16855472, 0.5187581),
    vec2(-0.44128203, 0.3206101),
    vec2(-0.44128197, -0.3206102),
    vec2(0.1685548, -0.5187581),
    vec2(1.0, 0.0),
    vec2(0.809017, 0.58778524),
    vec2(0.30901697, 0.95105654),
    vec2(-0.30901703, 0.9510565),
    vec2(-0.80901706, 0.5877852),
    vec2(-1.0, 0.0),
    vec2(-0.80901694, -0.58778536),
    vec2(-0.30901664, -0.9510566),
    vec2(0.30901712, -0.9510565),
    vec2(0.80901694, -0.5877853)
  );
  
  void main() {
    // Sample depth at current pixel
    float depth = texture2D(uDepthTexture, vUv).r;
    float linearDepth = linearizeDepth(depth);
    
    // Calculate blur amount based on distance from focus
    float distFromFocus = abs(linearDepth - uFocusDistance);
    float blur = clamp(distFromFocus / uFocusRange, 0.0, 1.0) * uMaxBlur;
    
    // Apply aperture
    blur *= uAperture * 100.0;
    
    vec2 texelSize = 1.0 / uResolution;
    vec3 color = vec3(0.0);
    float totalWeight = 0.0;
    
    // Bokeh blur sampling
    for (int i = 0; i < SAMPLES; i++) {
      vec2 offset = BOKEH_KERNEL[i] * blur * texelSize * 10.0;
      vec3 sampleColor = texture2D(uTexture, vUv + offset).rgb;
      
      // Weight by brightness for bokeh effect
      float weight = 1.0 + dot(sampleColor, vec3(0.333)) * 0.5;
      color += sampleColor * weight;
      totalWeight += weight;
    }
    
    color /= totalWeight;
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

export default DOFEffect;
