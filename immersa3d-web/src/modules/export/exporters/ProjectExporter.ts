// ============================================================
// Immersa 3D - Project Exporter
// Serialize project state to JSON
// ============================================================

import { useMediaStore } from '../../../store/slices/mediaSlice';
import { useAnalysisStore } from '../../../store/slices/analysisSlice';
import { useViewportStore } from '../../../store/slices/viewportSlice';
import { useAppStore } from '../../../store/slices/appSlice';

/**
 * Serializable state data (excludes functions)
 */
interface SerializableData {
  [key: string]: unknown;
}

/**
 * Project data structure for export
 */
export interface ProjectData {
  version: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  description?: string;
  
  // State snapshots (serializable data only)
  app: SerializableData;
  media: SerializableData;
  analysis: SerializableData;
  viewport: SerializableData;
  
  // Optional embedded resources
  resources?: {
    images?: { [key: string]: string }; // Base64 encoded
  };
}

/**
 * Project export options
 */
export interface ProjectExportOptions {
  includeMedia: boolean;
  filename?: string;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: ProjectExportOptions = {
  includeMedia: false,
};

/**
 * Current project format version
 */
const PROJECT_VERSION = '1.0.0';

/**
 * Sanitize state by removing functions
 */
function sanitizeState(state: Record<string, unknown>): SerializableData {
  const result: SerializableData = {};
  
  for (const [key, value] of Object.entries(state)) {
    if (typeof value !== 'function') {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * ProjectExporter - Serialize and save project state
 */
export class ProjectExporter {
  /**
   * Export current project state
   */
  export(options: Partial<ProjectExportOptions> = {}): ProjectData {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    const project: ProjectData = {
      version: PROJECT_VERSION,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: 'Untitled Project',
      
      // Capture all store states (sanitized)
      app: sanitizeState(useAppStore.getState() as unknown as Record<string, unknown>),
      media: sanitizeState(useMediaStore.getState() as unknown as Record<string, unknown>),
      analysis: sanitizeState(useAnalysisStore.getState() as unknown as Record<string, unknown>),
      viewport: sanitizeState(useViewportStore.getState() as unknown as Record<string, unknown>),
    };
    
    // Include media if requested
    if (opts.includeMedia) {
      project.resources = this.collectResources();
    }
    
    return project;
  }
  
  /**
   * Export and download project
   */
  exportAndDownload(options: Partial<ProjectExportOptions> = {}): void {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const project = this.export(opts);
    
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    
    const filename = opts.filename || `immersa3d_project_${Date.now()}.json`;
    this.downloadBlob(blob, filename);
  }
  
  /**
   * Import project from JSON
   */
  async importFromFile(file: File): Promise<ProjectData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string;
          const project = JSON.parse(json) as ProjectData;
          
          // Validate version
          if (!project.version) {
            throw new Error('Invalid project file: missing version');
          }
          
          resolve(project);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }
  
  /**
   * Collect resources for embedding
   */
  private collectResources(): ProjectData['resources'] {
    const resources: ProjectData['resources'] = {
      images: {},
    };
    
    // Collect media if available
    const mediaState = useMediaStore.getState();
    if (mediaState.currentMedia?.dataUrl) {
      resources.images!['currentMedia'] = mediaState.currentMedia.dataUrl;
    }
    
    // Collect depth map if available
    const analysisState = useAnalysisStore.getState();
    const depthResult = analysisState.getDepthResult();
    if (depthResult?.depthTextureUrl) {
      resources.images!['depthMap'] = depthResult.depthTextureUrl;
    }
    
    return resources;
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
}

// Singleton instance
export const projectExporter = new ProjectExporter();

export default ProjectExporter;
