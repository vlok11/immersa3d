// ============================================================
// Immersa 3D - Edge Detector
// GPU-accelerated Sobel/Canny edge detection
// ============================================================

import * as THREE from 'three';

/**
 * Edge detection algorithm type
 */
export type EdgeDetectionAlgorithm = 'sobel' | 'prewitt' | 'laplacian';

/**
 * Edge detection configuration
 */
export interface EdgeDetectorConfig {
  /** Detection algorithm */
  algorithm: EdgeDetectionAlgorithm;
  /** Edge threshold (0-1) */
  threshold: number;
  /** Edge thickness */
  thickness: number;
  /** Invert output (white on black vs black on white) */
  invert: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: EdgeDetectorConfig = {
  algorithm: 'sobel',
  threshold: 0.1,
  thickness: 1.0,
  invert: false,
};

/**
 * Sobel edge detection shader
 * Computes gradient magnitude using Sobel operators
 */
const SOBEL_SHADER = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  
  fragmentShader: /* glsl */ `
    uniform sampler2D uTexture;
    uniform vec2 uResolution;
    uniform float uThreshold;
    uniform float uThickness;
    uniform bool uInvert;
    
    varying vec2 vUv;
    
    // Convert color to grayscale using luminance
    float luminance(vec3 color) {
      return dot(color, vec3(0.299, 0.587, 0.114));
    }
    
    void main() {
      // Texel size (pixel step in UV coordinates)
      vec2 texel = uThickness / uResolution;
      
      // Sample 3x3 neighborhood
      // Kernel positions:
      // [0,0] [1,0] [2,0]
      // [0,1] [1,1] [2,1]
      // [0,2] [1,2] [2,2]
      
      float tl = luminance(texture2D(uTexture, vUv + texel * vec2(-1.0, -1.0)).rgb);
      float tc = luminance(texture2D(uTexture, vUv + texel * vec2( 0.0, -1.0)).rgb);
      float tr = luminance(texture2D(uTexture, vUv + texel * vec2( 1.0, -1.0)).rgb);
      
      float ml = luminance(texture2D(uTexture, vUv + texel * vec2(-1.0,  0.0)).rgb);
      float mr = luminance(texture2D(uTexture, vUv + texel * vec2( 1.0,  0.0)).rgb);
      
      float bl = luminance(texture2D(uTexture, vUv + texel * vec2(-1.0,  1.0)).rgb);
      float bc = luminance(texture2D(uTexture, vUv + texel * vec2( 0.0,  1.0)).rgb);
      float br = luminance(texture2D(uTexture, vUv + texel * vec2( 1.0,  1.0)).rgb);
      
      // Sobel operator kernels
      // Gx = [-1  0  1]    Gy = [-1 -2 -1]
      //      [-2  0  2]         [ 0  0  0]
      //      [-1  0  1]         [ 1  2  1]
      
      float gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
      float gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;
      
      // Gradient magnitude (edge strength)
      float edge = sqrt(gx * gx + gy * gy);
      
      // Apply threshold
      edge = edge > uThreshold ? 1.0 : 0.0;
      
      // Invert if requested
      if (uInvert) {
        edge = 1.0 - edge;
      }
      
      gl_FragColor = vec4(vec3(edge), 1.0);
    }
  `,
};

/**
 * Prewitt edge detection shader
 * Similar to Sobel but with equal weights
 */
const PREWITT_SHADER = {
  vertexShader: SOBEL_SHADER.vertexShader,
  
  fragmentShader: /* glsl */ `
    uniform sampler2D uTexture;
    uniform vec2 uResolution;
    uniform float uThreshold;
    uniform float uThickness;
    uniform bool uInvert;
    
    varying vec2 vUv;
    
    float luminance(vec3 color) {
      return dot(color, vec3(0.299, 0.587, 0.114));
    }
    
    void main() {
      vec2 texel = uThickness / uResolution;
      
      float tl = luminance(texture2D(uTexture, vUv + texel * vec2(-1.0, -1.0)).rgb);
      float tc = luminance(texture2D(uTexture, vUv + texel * vec2( 0.0, -1.0)).rgb);
      float tr = luminance(texture2D(uTexture, vUv + texel * vec2( 1.0, -1.0)).rgb);
      
      float ml = luminance(texture2D(uTexture, vUv + texel * vec2(-1.0,  0.0)).rgb);
      float mr = luminance(texture2D(uTexture, vUv + texel * vec2( 1.0,  0.0)).rgb);
      
      float bl = luminance(texture2D(uTexture, vUv + texel * vec2(-1.0,  1.0)).rgb);
      float bc = luminance(texture2D(uTexture, vUv + texel * vec2( 0.0,  1.0)).rgb);
      float br = luminance(texture2D(uTexture, vUv + texel * vec2( 1.0,  1.0)).rgb);
      
      // Prewitt operator (equal weights)
      // Gx = [-1  0  1]    Gy = [-1 -1 -1]
      //      [-1  0  1]         [ 0  0  0]
      //      [-1  0  1]         [ 1  1  1]
      
      float gx = -tl - ml - bl + tr + mr + br;
      float gy = -tl - tc - tr + bl + bc + br;
      
      float edge = sqrt(gx * gx + gy * gy);
      edge = edge > uThreshold ? 1.0 : 0.0;
      
      if (uInvert) {
        edge = 1.0 - edge;
      }
      
      gl_FragColor = vec4(vec3(edge), 1.0);
    }
  `,
};

/**
 * Laplacian edge detection shader
 * Detects edges using second derivative
 */
const LAPLACIAN_SHADER = {
  vertexShader: SOBEL_SHADER.vertexShader,
  
  fragmentShader: /* glsl */ `
    uniform sampler2D uTexture;
    uniform vec2 uResolution;
    uniform float uThreshold;
    uniform float uThickness;
    uniform bool uInvert;
    
    varying vec2 vUv;
    
    float luminance(vec3 color) {
      return dot(color, vec3(0.299, 0.587, 0.114));
    }
    
    void main() {
      vec2 texel = uThickness / uResolution;
      
      float tc = luminance(texture2D(uTexture, vUv + texel * vec2( 0.0, -1.0)).rgb);
      float ml = luminance(texture2D(uTexture, vUv + texel * vec2(-1.0,  0.0)).rgb);
      float mc = luminance(texture2D(uTexture, vUv).rgb);
      float mr = luminance(texture2D(uTexture, vUv + texel * vec2( 1.0,  0.0)).rgb);
      float bc = luminance(texture2D(uTexture, vUv + texel * vec2( 0.0,  1.0)).rgb);
      
      // Laplacian kernel
      // [ 0 -1  0]
      // [-1  4 -1]
      // [ 0 -1  0]
      
      float edge = abs(4.0 * mc - tc - ml - mr - bc);
      edge = edge > uThreshold ? 1.0 : 0.0;
      
      if (uInvert) {
        edge = 1.0 - edge;
      }
      
      gl_FragColor = vec4(vec3(edge), 1.0);
    }
  `,
};

/**
 * EdgeDetector - GPU-accelerated edge detection
 * 
 * Implements Sobel, Prewitt, and Laplacian algorithms
 * for extracting edges from images.
 */
export class EdgeDetector {
  private config: EdgeDetectorConfig;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private quad: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private renderTarget: THREE.WebGLRenderTarget | null = null;
  
  constructor(config?: Partial<EdgeDetectorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Create orthographic scene for full-screen quad
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    // Create material
    this.material = this.createMaterial(this.config.algorithm);
    
    // Create full-screen quad
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.quad);
  }
  
  /**
   * Create shader material for algorithm
   */
  private createMaterial(algorithm: EdgeDetectionAlgorithm): THREE.ShaderMaterial {
    const shader = this.getShader(algorithm);
    
    return new THREE.ShaderMaterial({
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      uniforms: {
        uTexture: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uThreshold: { value: this.config.threshold },
        uThickness: { value: this.config.thickness },
        uInvert: { value: this.config.invert },
      },
    });
  }
  
  /**
   * Get shader for algorithm
   */
  private getShader(algorithm: EdgeDetectionAlgorithm): typeof SOBEL_SHADER {
    switch (algorithm) {
      case 'sobel':
        return SOBEL_SHADER;
      case 'prewitt':
        return PREWITT_SHADER;
      case 'laplacian':
        return LAPLACIAN_SHADER;
      default:
        return SOBEL_SHADER;
    }
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<EdgeDetectorConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update uniforms
    this.material.uniforms.uThreshold.value = this.config.threshold;
    this.material.uniforms.uThickness.value = this.config.thickness;
    this.material.uniforms.uInvert.value = this.config.invert;
    
    // Recreate material if algorithm changed
    if (config.algorithm && config.algorithm !== this.config.algorithm) {
      this.quad.material = this.createMaterial(config.algorithm);
      this.material.dispose();
      this.material = this.quad.material as THREE.ShaderMaterial;
    }
  }
  
  /**
   * Detect edges in texture
   */
  detect(
    renderer: THREE.WebGLRenderer,
    inputTexture: THREE.Texture,
    width: number,
    height: number
  ): THREE.Texture {
    // Create or resize render target
    if (!this.renderTarget || 
        this.renderTarget.width !== width || 
        this.renderTarget.height !== height) {
      this.renderTarget?.dispose();
      this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
      });
    }
    
    // Update uniforms
    this.material.uniforms.uTexture.value = inputTexture;
    this.material.uniforms.uResolution.value.set(width, height);
    
    // Render
    const previousRenderTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(this.renderTarget);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(previousRenderTarget);
    
    return this.renderTarget.texture;
  }
  
  /**
   * Detect edges and return as ImageData
   */
  detectToImageData(
    renderer: THREE.WebGLRenderer,
    inputTexture: THREE.Texture,
    width: number,
    height: number
  ): ImageData {
    this.detect(renderer, inputTexture, width, height);
    
    // Read pixels from render target
    const buffer = new Uint8Array(width * height * 4);
    renderer.readRenderTargetPixels(
      this.renderTarget!,
      0, 0, width, height,
      buffer
    );
    
    // Create ImageData (flip Y axis)
    const imageData = new ImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        const dstIdx = ((height - 1 - y) * width + x) * 4;
        imageData.data[dstIdx] = buffer[srcIdx];
        imageData.data[dstIdx + 1] = buffer[srcIdx + 1];
        imageData.data[dstIdx + 2] = buffer[srcIdx + 2];
        imageData.data[dstIdx + 3] = buffer[srcIdx + 3];
      }
    }
    
    return imageData;
  }
  
  /**
   * Dispose resources
   */
  dispose(): void {
    this.material.dispose();
    this.quad.geometry.dispose();
    this.renderTarget?.dispose();
    this.renderTarget = null;
  }
}

/**
 * Create edge detector instance
 */
export function createEdgeDetector(config?: Partial<EdgeDetectorConfig>): EdgeDetector {
  return new EdgeDetector(config);
}
