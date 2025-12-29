// ============================================================
// Immersa 3D - Multi View Renderer
// Generates quilt-style tiled views for lightfield displays
// ============================================================

import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { eventBus } from '../../../core/events';

/**
 * Quilt configuration
 */
export interface QuiltConfig {
  /** Number of columns in the quilt */
  columns: number;
  /** Number of rows in the quilt */
  rows: number;
  /** Total number of views */
  viewCount: number;
  /** Output width in pixels */
  outputWidth: number;
  /** Output height in pixels */
  outputHeight: number;
}

/**
 * Multi view renderer props
 */
interface MultiViewRendererProps {
  /** Quilt configuration */
  config: QuiltConfig;
  /** Camera to clone for multi-view */
  baseCamera?: THREE.PerspectiveCamera;
  /** Horizontal view angle range in degrees */
  viewAngleRange?: number;
  /** Distance of view positions from center */
  viewDistance?: number;
  /** Is rendering enabled */
  enabled?: boolean;
  /** Callback when quilt is rendered */
  onQuiltReady?: (texture: THREE.Texture) => void;
}

/**
 * Default quilt configurations for common displays
 */
export const QUILT_PRESETS = {
  /** Looking Glass Portrait */
  portrait: {
    columns: 8,
    rows: 6,
    viewCount: 48,
    outputWidth: 3360,
    outputHeight: 3360,
  },
  /** Looking Glass 4K */
  '4k': {
    columns: 5,
    rows: 9,
    viewCount: 45,
    outputWidth: 4096,
    outputHeight: 4096,
  },
  /** Looking Glass 8K */
  '8k': {
    columns: 5,
    rows: 9,
    viewCount: 45,
    outputWidth: 8192,
    outputHeight: 8192,
  },
  /** Preview (low resolution) */
  preview: {
    columns: 4,
    rows: 4,
    viewCount: 16,
    outputWidth: 1024,
    outputHeight: 1024,
  },
} as const;

/**
 * MultiViewRenderer - Generates quilt-style tiled views
 * 
 * Used for lightfield displays like Looking Glass.
 * Renders the scene from multiple viewpoints and
 * tiles them into a single texture.
 */
export function MultiViewRenderer({
  config,
  baseCamera,
  viewAngleRange = 40,
  viewDistance = 0.5,
  enabled = true,
  onQuiltReady,
}: MultiViewRendererProps) {
  const { gl, scene, camera: defaultCamera } = useThree();
  
  const camera = baseCamera || (defaultCamera as THREE.PerspectiveCamera);
  
  // Calculate view dimensions
  const viewWidth = Math.floor(config.outputWidth / config.columns);
  const viewHeight = Math.floor(config.outputHeight / config.rows);
  
  // Create render target for individual views
  const viewRenderTarget = useMemo(() => {
    return new THREE.WebGLRenderTarget(viewWidth, viewHeight, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });
  }, [viewWidth, viewHeight]);
  
  // Create render target for final quilt
  const quiltRenderTarget = useMemo(() => {
    return new THREE.WebGLRenderTarget(config.outputWidth, config.outputHeight, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });
  }, [config.outputWidth, config.outputHeight]);
  
  // Create camera for view rendering
  const viewCamera = useMemo(() => {
    const cam = camera.clone();
    cam.aspect = viewWidth / viewHeight;
    cam.updateProjectionMatrix();
    return cam;
  }, [camera, viewWidth, viewHeight]);
  
  // Create scene for compositing quilt
  const quiltScene = useMemo(() => new THREE.Scene(), []);
  const quiltCamera = useMemo(() => {
    return new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1);
  }, []);
  
  // Material for copying views to quilt
  const copyMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  
  // Create copy quad
  useEffect(() => {
    const geometry = new THREE.PlaneGeometry(1 / config.columns, 1 / config.rows);
    const material = new THREE.MeshBasicMaterial({ map: viewRenderTarget.texture });
    copyMaterialRef.current = material;
    
    const quad = new THREE.Mesh(geometry, material);
    quiltScene.add(quad);
    
    return () => {
      geometry.dispose();
      material.dispose();
      quiltScene.remove(quad);
    };
  }, [quiltScene, viewRenderTarget, config.columns, config.rows]);
  
  // Dispose render targets on unmount
  useEffect(() => {
    return () => {
      viewRenderTarget.dispose();
      quiltRenderTarget.dispose();
    };
  }, [viewRenderTarget, quiltRenderTarget]);
  
  // Reusable vector for view position calculation
  const tempPosition = useMemo(() => new THREE.Vector3(), []);
  const cameraDirection = useMemo(() => new THREE.Vector3(), []);
  const cameraRight = useMemo(() => new THREE.Vector3(), []);
  
  /**
   * Render all views to quilt
   */
  const renderQuilt = () => {
    if (!enabled) return;
    
    const previousRenderTarget = gl.getRenderTarget();
    
    // Get camera direction and right vector
    camera.getWorldDirection(cameraDirection);
    cameraRight.crossVectors(cameraDirection, camera.up).normalize();
    
    // Calculate angle step
    const angleStep = viewAngleRange / (config.viewCount - 1);
    const startAngle = -viewAngleRange / 2;
    
    // Render each view
    for (let i = 0; i < config.viewCount; i++) {
      // Calculate view angle
      const angle = startAngle + i * angleStep;
      const radians = THREE.MathUtils.degToRad(angle);
      
      // Calculate view position (arc around subject)
      tempPosition.copy(camera.position);
      tempPosition.addScaledVector(cameraRight, Math.sin(radians) * viewDistance);
      
      // Update view camera
      viewCamera.position.copy(tempPosition);
      viewCamera.lookAt(
        camera.position.x + cameraDirection.x,
        camera.position.y + cameraDirection.y,
        camera.position.z + cameraDirection.z
      );
      viewCamera.updateMatrixWorld();
      
      // Render view
      gl.setRenderTarget(viewRenderTarget);
      gl.render(scene, viewCamera);
      
      // Calculate quilt position
      const col = i % config.columns;
      const row = Math.floor(i / config.columns);
      
      // Copy to quilt
      const quadX = (col + 0.5) / config.columns - 0.5;
      const quadY = 0.5 - (row + 0.5) / config.rows;
      
      const quad = quiltScene.children[0] as THREE.Mesh;
      quad.position.set(quadX, quadY, 0);
      
      gl.setRenderTarget(quiltRenderTarget);
      gl.render(quiltScene, quiltCamera);
    }
    
    gl.setRenderTarget(previousRenderTarget);
    
    // Notify quilt ready
    if (onQuiltReady) {
      onQuiltReady(quiltRenderTarget.texture);
    }
    
    eventBus.emit('naked3d:quiltRendered', {
      config,
      viewCount: config.viewCount,
    });
  };
  
  // Render quilt on each frame (can be throttled for performance)
  useFrame(() => {
    if (enabled) {
      renderQuilt();
    }
  });
  
  return null;
}

/**
 * Export utilities
 */
export { QUILT_PRESETS as quiltPresets };
