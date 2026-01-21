import { useCallback, useEffect, useRef } from 'react';

import { bootstrap } from '@/app/index';
import { createUploadPipeline } from '@/features/upload/pipeline';
import { CameraMotionType } from '@/shared/types';
import { useCameraStore, useSceneStore } from '@/stores/index';

import type { ProcessedAsset } from '@/core/domain/types';
import type { SceneViewerHandle } from '@/features/scene';
import type { CameraViewPreset } from '@/shared/types';

export function useAppHandlers(options: UseAppHandlersOptions) {
  const {
    sceneRef,
    urlInput,
    setUrlInput,
    setShowUrlInput,
    setActiveCameraView,
    isRecording,
    setIsRecording,
    uploadStart,
    updateProgress,
    uploadComplete,
    uploadError,
    resetSession,
    setVideoTime,
  } = options;

  const bootstrapRef = useRef(false);
  const pipelineRef = useRef(createUploadPipeline());

  const { setConfig } = useSceneStore();
  const resetCamera = useCameraStore((s) => s.resetCamera);

  useEffect(() => {
    if (!bootstrapRef.current) {
      bootstrapRef.current = true;
      bootstrap().catch(console.error);
    }

    const pipeline = pipelineRef.current;

    const unsubscribeProgress = pipeline.onProgress((p) => {
      if (p.stage === 'complete') return;
      const sessionStatus = PIPELINE_STATUS_MAP[p.stage] ?? 'analyzing';

      updateProgress(sessionStatus, p.progress, p.message);
    });

    const unsubscribeError = pipeline.onError((err) => {
      uploadError(err.message);
    });

    const unsubscribeComplete = pipeline.onComplete((result) => {
      uploadComplete(result);
    });

    return () => {
      unsubscribeProgress();
      unsubscribeError();
      unsubscribeComplete();
    };
  }, [updateProgress, uploadComplete, uploadError]);

  const processInput = useCallback(
    async (input: File | string) => {
      uploadStart(input);
      resetCamera();
      try {
        await pipelineRef.current.process(input);
      } catch (error) {
        console.error(error);
      }
    },
    [uploadStart, resetCamera]
  );

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (file) {
        void processInput(file);
      }
    },
    [processInput]
  );

  const handleUrlSubmit = useCallback(() => {
    if (urlInput.trim()) {
      void processInput(urlInput.trim());
      setUrlInput('');
      setShowUrlInput(false);
    }
  }, [urlInput, processInput, setUrlInput, setShowUrlInput]);

  const handleRetry = useCallback(() => {
    pipelineRef.current.cancel();
    resetSession();
  }, [resetSession]);

  const handleSetCameraView = useCallback(
    (view: CameraViewPreset) => {
      setActiveCameraView(view);
      setConfig({ cameraMotionType: CameraMotionType.STATIC });
      sceneRef.current?.setCameraView(view);
    },
    [setConfig, setActiveCameraView, sceneRef]
  );

  const handleVideoSeek = useCallback(
    (time: number) => {
      sceneRef.current?.seekVideo?.(time);
      setVideoTime(time);
    },
    [setVideoTime, sceneRef]
  );

  const handleExportScene = useCallback(() => {
    sceneRef.current?.exportScene();
  }, [sceneRef]);

  const handleDownloadSnapshot = useCallback(() => {
    sceneRef.current?.downloadSnapshot();
  }, [sceneRef]);

  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      sceneRef.current?.stopRecording();
      setIsRecording(false);
    } else {
      sceneRef.current?.startRecording(true);
      setIsRecording(true);
    }
  }, [isRecording, setIsRecording, sceneRef]);

  return {
    handleFileUpload,
    handleUrlSubmit,
    handleRetry,
    handleSetCameraView,
    handleVideoSeek,
    handleExportScene,
    handleDownloadSnapshot,
    handleToggleRecording,
  };
}

export interface UseAppHandlersOptions {
  isRecording: boolean;
  resetSession: () => void;
  sceneRef: React.RefObject<SceneViewerHandle | null>;
  setActiveCameraView: (view: CameraViewPreset | 'default') => void;
  setIsRecording: (value: boolean) => void;
  setShowUrlInput: (value: boolean) => void;
  setUrlInput: (value: string) => void;

  setVideoTime: (time: number) => void;
  updateProgress: (
    status: 'analyzing' | 'processing_depth',
    progress: number,
    message: string
  ) => void;
  uploadComplete: (result: ProcessedAsset) => void;
  uploadError: (message: string) => void;
  uploadStart: (input?: File | string) => void;
  urlInput: string;
}

const PIPELINE_STATUS_MAP: Record<string, 'analyzing' | 'processing_depth'> = {
  analyze: 'analyzing',
  depth: 'processing_depth',
  prepare: 'processing_depth',
};
