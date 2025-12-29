// ============================================================
// Immersa 3D - Normal Map Generator
// Generate normal maps from depth using GPU shader
// ============================================================

import * as THREE from 'three';
import { eventBus } from '../../../core/events';

/**
 * Normal map quality settings
 */
export type NormalMapQuality = 'low' | 'medium' | 'high';

/**
 * Normal map generation options
 */
export interface NormalMapOptions {
  /** Output quality */
  quality: NormalMapQuality;
  /** Strength of the normal effect */
  strength: number;
  /** Invert Y axis (for some engines) */
  invertY?: boolean;
  /** Blur the depth before generating normals */
  blurRadius?: number;
}

/**
 * Quality to resolution mapping
 */
const QUALITY_RESOLUTION: Record<NormalMapQuality, number> = {
  low: 512,
  medium: 1024,
  high: 2048,
};

/**
 * Normal map generation shader
 */
const NORMAL_MAP_SHADER = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  
  fragmentShader: /* glsl */ `
    uniform sampler2D uDepthMap;
    uniform vec2 uResolution;
    uniform float uStrength;
    uniform bool uInvertY;
    
    varying vec2 vUv;
    
    void main() {
      // Sample depth at neighboring pixels
      vec2 texelSize = 1.0 / uResolution;
      
      // Sobel kernel for gradient calculation
      float tl = texture2D(uDepthMap, vUv + vec2(-texelSize.x, texelSize.y)).r;
      float t  = texture2D(uDepthMap, vUv + vec2(0.0, texelSize.y)).r;
      float tr = texture2D(uDepthMap, vUv + vec2(texelSize.x, texelSize.y)).r;
      float l  = texture2D(uDepthMap, vUv + vec2(-texelSize.x, 0.0)).r;
      float r  = texture2D(uDepthMap, vUv + vec2(texelSize.x, 0.0)).r;
      float bl = texture2D(uDepthMap, vUv + vec2(-texelSize.x, -texelSize.y)).r;
      float b  = texture2D(uDepthMap, vUv + vec2(0.0, -texelSize.y)).r;
      float br = texture2D(uDepthMap, vUv + vec2(texelSize.x, -texelSize.y)).r;
      
      // Sobel operator
      float dX = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
      float dY = (bl + 2.0 * b + br) - (tl + 2.0 * t + tr);
      
      // Scale by strength
      dX *= uStrength;
      dY *= uStrength;
      
      // Invert Y if needed
      if (uInvertY) {
        dY = -dY;
      }
      
      // Construct normal vector
      vec3 normal = normalize(vec3(-dX, -dY, 1.0));
      
      // Map from [-1, 1] to [0, 1] for storage
      normal = normal * 0.5 + 0.5;
      
      gl_FragColor = vec4(normal, 1.0);
    }
  `,
};

/**
 * Normal Map Generator Class
 * Uses GPU shaders to generate normal maps from depth textures
 */
export class NormalMapGenerator {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;
  
  constructor() {
    // Setup offscreen scene
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    // Create shader material
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uDepthMap: { value: null },
        uResolution: { value: new THREE.Vector2(1024, 1024) },
        uStrength: { value: 1.0 },
        uInvertY: { value: false },
      },
      vertexShader: NORMAL_MAP_SHADER.vertexShader,
      fragmentShader: NORMAL_MAP_SHADER.fragmentShader,
    });
    
    // Create fullscreen quad
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);
  }
  
  /**
   * Generate normal map from depth texture
   */
  generate(
    depthTexture: THREE.Texture,
    renderer: THREE.WebGLRenderer,
    options: NormalMapOptions
  ): THREE.Texture {
    const resolution = QUALITY_RESOLUTION[options.quality];
    
    // Create render target
    const renderTarget = new THREE.WebGLRenderTarget(resolution, resolution, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });
    
    // Update uniforms
    this.material.uniforms.uDepthMap.value = depthTexture;
    this.material.uniforms.uResolution.value.set(resolution, resolution);
    this.material.uniforms.uStrength.value = options.strength;
    this.material.uniforms.uInvertY.value = options.invertY ?? false;
    
    // Render to target
    const currentRenderTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(renderTarget);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(currentRenderTarget);
    
    eventBus.emit('geometry:normalMapGenerated', { 
      resolution,
      quality: options.quality,
    });
    
    return renderTarget.texture;
  }
  
  /**
   * Generate normal map asynchronously
   */
  async generateAsync(
    depthTexture: THREE.Texture,
    renderer: THREE.WebGLRenderer,
    options: NormalMapOptions
  ): Promise<THREE.Texture> {
    return new Promise((resolve) => {
      // Use requestAnimationFrame to not block
      requestAnimationFrame(() => {
        const result = this.generate(depthTexture, renderer, options);
        resolve(result);
      });
    });
  }
  
  /**
   * Dispose resources
   */
  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.scene.clear();
  }
}

/**
 * Create a singleton normal map generator
 */
let generatorInstance: NormalMapGenerator | null = null;

export function getNormalMapGenerator(): NormalMapGenerator {
  if (!generatorInstance) {
    generatorInstance = new NormalMapGenerator();
  }
  return generatorInstance;
}

/**
 * Generate normal map from depth (convenience function)
 */
export async function generateNormalMapFromDepth(
  depthTexture: THREE.Texture,
  renderer: THREE.WebGLRenderer,
  options: Partial<NormalMapOptions> = {}
): Promise<THREE.Texture> {
  const generator = getNormalMapGenerator();
  
  const fullOptions: NormalMapOptions = {
    quality: options.quality ?? 'medium',
    strength: options.strength ?? 1.0,
    invertY: options.invertY ?? false,
    blurRadius: options.blurRadius ?? 0,
  };
  
  return generator.generateAsync(depthTexture, renderer, fullOptions);
}
