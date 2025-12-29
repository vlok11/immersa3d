// ============================================================
// Immersa 3D - Depth Estimator Component
// React component for depth estimation UI and control
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAnalysisStore, useMediaStore, useAppStore } from '../../../store';
import { eventBus } from '../../../core/events';
import { renderContext } from '../../../core/context';
import styles from './DepthEstimator.module.css';

/**
 * Worker response types
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
 * DepthEstimator - Controls depth estimation workflow
 */
export function DepthEstimator() {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  
  // Store connections
  const currentMedia = useMediaStore((s) => s.currentMedia);
  const setRunning = useAnalysisStore((s) => s.setRunning);
  const setStoreProgress = useAnalysisStore((s) => s.setProgress);
  const setResult = useAnalysisStore((s) => s.setResult);
  const running = useAnalysisStore((s) => s.running);
  const addError = useAppStore((s) => s.addError);
  
  const isRunning = running.has('depth');

  /**
   * Initialize worker on mount
   */
  useEffect(() => {
    // Create worker
    workerRef.current = new Worker(
      new URL('../workers/depth.worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Handle messages from worker
    workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { type, progress, progressMessage: msg, result, error } = event.data;

      switch (type) {
        case 'ready':
          setIsReady(true);
          console.log('[DepthEstimator] Worker ready');
          break;

        case 'progress':
          if (progress !== undefined) {
            setLocalProgress(progress);
            setProgressMessage(msg || '');
            setStoreProgress('depth', progress);
          }
          break;

        case 'result':
          if (result) {
            // Convert depth data to blob URL for texture
            const canvas = document.createElement('canvas');
            canvas.width = result.depthData.width;
            canvas.height = result.depthData.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.putImageData(result.depthData, 0, 0);
              canvas.toBlob((blob) => {
                if (blob) {
                  const depthTextureUrl = URL.createObjectURL(blob);
                  
                  setResult({
                    type: 'depth',
                    depthMap: result.depthData,
                    depthTextureUrl,
                    minDepth: result.minDepth,
                    maxDepth: result.maxDepth,
                    timestamp: Date.now(),
                    processingTime: result.processingTime,
                  });
                  
                  setRunning('depth', false);
                  
                  eventBus.emit('analysis:completed', {
                    type: 'depth',
                    result: { depthTextureUrl },
                  });
                  
                  console.log(`[DepthEstimator] Completed in ${result.processingTime.toFixed(0)}ms`);
                }
              }, 'image/png');
            }
          }
          break;

        case 'error':
          console.error('[DepthEstimator] Error:', error);
          addError(error || 'Depth estimation failed', 'error');
          setRunning('depth', false);
          
          eventBus.emit('analysis:error', {
            type: 'depth',
            error: new Error(error || 'Unknown error'),
          });
          break;
      }
    };

    workerRef.current.onerror = (errorEvent) => {
      console.error('[DepthEstimator] Worker error:', errorEvent);
      addError('Depth worker crashed', 'error');
    };

    // Initialize the pipeline
    const useWebGPU = renderContext.isWebGPUAvailable;
    workerRef.current.postMessage({
      type: 'init',
      taskId: 'init',
      options: { useWebGPU },
    });

    // Cleanup on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'dispose', taskId: 'dispose' });
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [addError, setStoreProgress, setResult, setRunning]);

  /**
   * Run depth estimation on current media
   */
  const runEstimation = useCallback(async () => {
    if (!currentMedia || !workerRef.current || isRunning) {
      return;
    }

    setRunning('depth', true);
    setLocalProgress(0);
    setProgressMessage('Preparing...');
    
    eventBus.emit('analysis:started', { type: 'depth' });

    try {
      // Load image and convert to ImageData
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = currentMedia.dataUrl;
      });

      // Create canvas and extract ImageData
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      // Send to worker
      workerRef.current.postMessage({
        type: 'estimate',
        taskId: `depth_${Date.now()}`,
        imageData,
      });
    } catch (err) {
      console.error('[DepthEstimator] Failed to prepare image:', err);
      addError('Failed to prepare image for analysis', 'error');
      setRunning('depth', false);
    }
  }, [currentMedia, isRunning, setRunning, addError]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Depth Estimation</h3>
        <span className={`${styles.status} ${isReady ? styles.ready : styles.loading}`}>
          {isReady ? 'Ready' : 'Loading...'}
        </span>
      </div>
      
      {isRunning && (
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${localProgress}%` }} 
            />
          </div>
          <span className={styles.progressText}>{progressMessage}</span>
        </div>
      )}
      
      <button
        className={styles.button}
        onClick={runEstimation}
        disabled={!isReady || !currentMedia || isRunning}
      >
        {isRunning ? 'Processing...' : 'Analyze Depth'}
      </button>
      
      <p className={styles.hint}>
        Uses Depth-Anything-V2 for AI-powered depth estimation
      </p>
    </div>
  );
}
