// ============================================================
// Immersa 3D - Depth Estimation Worker
// Web Worker for running Depth-Anything-V2 inference
// ============================================================

import { pipeline, env, type DepthEstimationPipeline } from '@huggingface/transformers';

// Configure Transformers.js for browser environment
env.allowLocalModels = false;
env.useBrowserCache = true;

// Model configuration
const MODEL_ID = 'onnx-community/depth-anything-v2-small';

// Worker state
let depthPipeline: DepthEstimationPipeline | null = null;
let isInitializing = false;

/**
 * Message types from main thread
 */
interface WorkerRequest {
  type: 'init' | 'estimate' | 'dispose';
  taskId: string;
  imageData?: ImageData;
  options?: {
    useWebGPU?: boolean;
  };
}

/**
 * Message types to main thread
 */
interface WorkerResponse {
  type: 'ready' | 'progress' | 'result' | 'error';
  taskId: string;
  progress?: number;
  progressMessage?: string;
  result?: {
    depthData: ImageData;
    minDepth: number;
    maxDepth: number;
    processingTime: number;
  };
  error?: string;
}

/**
 * Send message to main thread
 */
function postResponse(response: WorkerResponse): void {
  self.postMessage(response);
}

/**
 * Initialize the depth estimation pipeline
 */
async function initializePipeline(taskId: string, useWebGPU: boolean = true): Promise<void> {
  if (depthPipeline || isInitializing) {
    postResponse({ type: 'ready', taskId });
    return;
  }

  isInitializing = true;

  try {
    postResponse({
      type: 'progress',
      taskId,
      progress: 0,
      progressMessage: 'Loading depth estimation model...',
    });

    // Determine device based on WebGPU availability
    const device = useWebGPU ? 'webgpu' : 'wasm';
    
    console.log(`[DepthWorker] Initializing with device: ${device}`);

    // Type assertion needed for complex pipeline options
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pipelineOptions: any = {
      device,
      progress_callback: (progressInfo: Record<string, unknown>) => {
        const progress = progressInfo.progress as number | undefined;
        if (progress !== undefined) {
          postResponse({
            type: 'progress',
            taskId,
            progress: Math.round(progress),
            progressMessage: (progressInfo.status as string) || 'Loading model...',
          });
        }
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    depthPipeline = await (pipeline as any)('depth-estimation', MODEL_ID, pipelineOptions);

    isInitializing = false;
    console.log('[DepthWorker] Pipeline initialized successfully');
    
    postResponse({ type: 'ready', taskId });
  } catch (error) {
    isInitializing = false;
    console.error('[DepthWorker] Failed to initialize pipeline:', error);
    
    postResponse({
      type: 'error',
      taskId,
      error: error instanceof Error ? error.message : 'Failed to initialize model',
    });
  }
}

/**
 * Run depth estimation on an image
 */
async function estimateDepth(taskId: string, imageData: ImageData): Promise<void> {
  if (!depthPipeline) {
    postResponse({
      type: 'error',
      taskId,
      error: 'Pipeline not initialized. Call init first.',
    });
    return;
  }

  const startTime = performance.now();

  try {
    postResponse({
      type: 'progress',
      taskId,
      progress: 10,
      progressMessage: 'Preparing image...',
    });

    // Convert ImageData to base64 for the pipeline
    const canvas = new OffscreenCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    ctx.putImageData(imageData, 0, 0);
    
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    const dataUrl = `data:image/png;base64,${base64}`;

    postResponse({
      type: 'progress',
      taskId,
      progress: 30,
      progressMessage: 'Running depth estimation...',
    });

    // Run the pipeline
    const result = await depthPipeline(dataUrl);

    postResponse({
      type: 'progress',
      taskId,
      progress: 80,
      progressMessage: 'Processing depth map...',
    });

    // Extract depth data from result
    // Handle both single result and array result
    const pipelineResult = Array.isArray(result) ? result[0] : result;
    const depthTensor = pipelineResult.depth;
    const { width, height } = depthTensor;
    const depthValues = depthTensor.data as unknown as Float32Array;

    // Find min/max for normalization
    let minDepth = Infinity;
    let maxDepth = -Infinity;
    for (let i = 0; i < depthValues.length; i++) {
      if (depthValues[i] < minDepth) minDepth = depthValues[i];
      if (depthValues[i] > maxDepth) maxDepth = depthValues[i];
    }

    // Normalize and convert to grayscale ImageData
    const depthImageData = new ImageData(width, height);
    const range = maxDepth - minDepth || 1;

    for (let i = 0; i < depthValues.length; i++) {
      // Normalize to 0-255 (invert so closer = brighter)
      const normalized = 1 - (depthValues[i] - minDepth) / range;
      const value = Math.round(normalized * 255);
      
      const pixelIndex = i * 4;
      depthImageData.data[pixelIndex] = value;     // R
      depthImageData.data[pixelIndex + 1] = value; // G
      depthImageData.data[pixelIndex + 2] = value; // B
      depthImageData.data[pixelIndex + 3] = 255;   // A
    }

    const processingTime = performance.now() - startTime;

    postResponse({
      type: 'result',
      taskId,
      result: {
        depthData: depthImageData,
        minDepth,
        maxDepth,
        processingTime,
      },
    });

    console.log(`[DepthWorker] Estimation completed in ${processingTime.toFixed(0)}ms`);
  } catch (error) {
    console.error('[DepthWorker] Estimation failed:', error);
    
    postResponse({
      type: 'error',
      taskId,
      error: error instanceof Error ? error.message : 'Depth estimation failed',
    });
  }
}

/**
 * Dispose the pipeline and free resources
 */
function disposePipeline(taskId: string): void {
  if (depthPipeline) {
    // Transformers.js pipelines don't have explicit dispose, but we can null the reference
    depthPipeline = null;
    console.log('[DepthWorker] Pipeline disposed');
  }
  
  postResponse({ type: 'ready', taskId });
}

/**
 * Handle messages from main thread
 */
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { type, taskId, imageData, options } = event.data;

  switch (type) {
    case 'init':
      await initializePipeline(taskId, options?.useWebGPU ?? true);
      break;

    case 'estimate':
      if (imageData) {
        await estimateDepth(taskId, imageData);
      } else {
        postResponse({
          type: 'error',
          taskId,
          error: 'No image data provided',
        });
      }
      break;

    case 'dispose':
      disposePipeline(taskId);
      break;

    default:
      postResponse({
        type: 'error',
        taskId,
        error: `Unknown message type: ${type}`,
      });
  }
};

// Signal that worker is ready
console.log('[DepthWorker] Worker script loaded');
