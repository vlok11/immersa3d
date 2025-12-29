// ============================================================
// Immersa 3D - 3D Model Exporter
// GLTF/GLB mesh export with depth displacement
// ============================================================

import * as THREE from 'three';
import { GLTFExporter, GLTFExporterOptions } from 'three/examples/jsm/exporters/GLTFExporter.js';

/**
 * Model export options
 */
export interface ModelExportOptions {
  format: 'gltf' | 'glb';
  binary: boolean;
  includeTextures: boolean;
  maxTextureSize: number;
  filename?: string;
}

/**
 * Default export options
 */
const DEFAULT_OPTIONS: ModelExportOptions = {
  format: 'glb',
  binary: true,
  includeTextures: true,
  maxTextureSize: 2048,
};

/**
 * Model3DExporter - Export 3D scene as GLTF/GLB
 * 
 * Exports the current 3D scene including geometry,
 * materials, and textures to GLTF or GLB format.
 */
export class Model3DExporter {
  private exporter: GLTFExporter;
  
  constructor() {
    this.exporter = new GLTFExporter();
  }
  
  /**
   * Export scene or object to GLTF/GLB
   */
  async export(
    object: THREE.Object3D,
    options: Partial<ModelExportOptions> = {}
  ): Promise<ArrayBuffer | object> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    const exporterOptions: GLTFExporterOptions = {
      binary: opts.format === 'glb' || opts.binary,
      maxTextureSize: opts.maxTextureSize,
      includeCustomExtensions: false,
    };
    
    return new Promise((resolve, reject) => {
      this.exporter.parse(
        object,
        (result) => {
          resolve(result);
        },
        (error) => {
          reject(error);
        },
        exporterOptions
      );
    });
  }
  
  /**
   * Export and download
   */
  async exportAndDownload(
    object: THREE.Object3D,
    options: Partial<ModelExportOptions> = {}
  ): Promise<void> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const result = await this.export(object, opts);
    
    const filename = opts.filename || `immersa3d_export.${opts.format}`;
    
    if (result instanceof ArrayBuffer) {
      // Binary GLB
      const blob = new Blob([result], { type: 'model/gltf-binary' });
      this.downloadBlob(blob, filename);
    } else {
      // JSON GLTF
      const json = JSON.stringify(result, null, 2);
      const blob = new Blob([json], { type: 'model/gltf+json' });
      this.downloadBlob(blob, filename);
    }
  }
  
  /**
   * Download blob as file
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
  
  /**
   * Create export preview (metadata)
   */
  createExportPreview(object: THREE.Object3D): {
    meshCount: number;
    vertexCount: number;
    triangleCount: number;
    textureCount: number;
  } {
    let meshCount = 0;
    let vertexCount = 0;
    let triangleCount = 0;
    const textures = new Set<THREE.Texture>();
    
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshCount++;
        
        const geometry = child.geometry;
        if (geometry.attributes.position) {
          vertexCount += geometry.attributes.position.count;
        }
        
        if (geometry.index) {
          triangleCount += geometry.index.count / 3;
        } else if (geometry.attributes.position) {
          triangleCount += geometry.attributes.position.count / 3;
        }
        
        // Collect textures
        const material = child.material;
        if (material instanceof THREE.MeshStandardMaterial || 
            material instanceof THREE.MeshBasicMaterial) {
          if (material.map) textures.add(material.map);
          if ('normalMap' in material && material.normalMap) {
            textures.add(material.normalMap);
          }
        }
      }
    });
    
    return {
      meshCount,
      vertexCount,
      triangleCount,
      textureCount: textures.size,
    };
  }
}

// Singleton instance
export const model3DExporter = new Model3DExporter();

export default Model3DExporter;
