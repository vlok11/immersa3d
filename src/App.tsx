import { memo, useRef, useState } from 'react';

import { useAppHandlers } from '@/app/useAppHandlers';
import { ControlPanel } from '@/features/controls';
import { SceneViewer, type SceneViewerHandle } from '@/features/scene';
import { StatusDisplay, UploadPanel } from '@/features/upload';
import { AppHeader, MobileDrawer } from '@/shared/components';
import { useSceneConfigSubscriber } from '@/shared/hooks/useSceneConfigSubscriber';
import { useSessionStore } from '@/stores/useSessionStore';

import type { CameraViewPreset, ProcessingState } from '@/shared/types';

type AppCameraView = CameraViewPreset | 'default';

const App = memo(() => {
  const {
    status,
    progress,
    statusMessage,
    currentAsset,
    processedResult,
    videoState,
    uploadStart,
    updateProgress,
    uploadComplete,
    uploadError,
    resetSession,
    setVideoTime,
    setVideoDuration,
    togglePlay: toggleVideoPlay,
  } = useSessionStore();

  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeCameraView, setActiveCameraView] = useState<AppCameraView>('default');
  const [isRecording, setIsRecording] = useState(false);

  const sceneRef = useRef<SceneViewerHandle>(null);

  useSceneConfigSubscriber();

  const {
    handleFileUpload,
    handleUrlSubmit,
    handleRetry,
    handleSetCameraView,
    handleVideoSeek,
    handleExportScene,
    handleDownloadSnapshot,
    handleToggleRecording,
  } = useAppHandlers({
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
  });

  const showUpload = status === 'idle';
  const showProcessing = ['uploading', 'analyzing', 'processing_depth'].includes(status);
  const showScene = status === 'ready' && currentAsset && processedResult;
  const isVideo = currentAsset?.type === 'video';

  let processingStatus: ProcessingState['status'];

  if (status === 'processing_depth') {
    processingStatus = 'generating_depth';
  } else if (status === 'uploading') {
    processingStatus = 'analyzing';
  } else {
    processingStatus = status as ProcessingState['status'];
  }

  const controlPanelProps = {
    hasVideo: isVideo,
    videoState,
    onVideoTogglePlay: toggleVideoPlay,
    onVideoSeek: handleVideoSeek,
    onSetCameraView: handleSetCameraView,
    activeCameraView: activeCameraView === 'default' ? null : activeCameraView,
    onExportScene: handleExportScene,
    onDownloadSnapshot: handleDownloadSnapshot,
    onToggleRecording: handleToggleRecording,
    isRecording,
  };

  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden flex flex-col">
      <AppHeader />

      <main className="flex-1 flex overflow-hidden">
        {showUpload ? (
          <div className="flex-1 flex items-center justify-center">
            <UploadPanel
              acceptedFormats=".jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov"
              onFileUpload={handleFileUpload}
              onUrlSubmit={handleUrlSubmit}
              setShowUrlInput={setShowUrlInput}
              setUrlInput={setUrlInput}
              showUrlInput={showUrlInput}
              urlInput={urlInput}
            />
          </div>
        ) : null}

        {showProcessing ? (
          <div className="flex-1 flex items-center justify-center">
            <StatusDisplay
              onRetry={handleRetry}
              processingState={{
                status: processingStatus,
                progress,
                message: statusMessage,
              }}
            />
          </div>
        ) : null}

        {showScene ? (
          <>
            <div className="flex-1 relative">
              <SceneViewer
                aspectRatio={processedResult.asset.aspectRatio}
                backgroundUrl={processedResult.backgroundUrl ?? null}
                depthUrl={processedResult.depthMapUrl}
                imageUrl={processedResult.imageUrl}
                isVideoPlaying={videoState.isPlaying}
                onVideoDurationChange={setVideoDuration}
                onVideoEnded={() => toggleVideoPlay()}
                onVideoTimeUpdate={setVideoTime}
                ref={sceneRef}
                videoUrl={
                  processedResult.asset.type === 'video' ? processedResult.asset.sourceUrl : null
                }
              />
            </div>

            <div className="w-80 border-l border-zinc-800 overflow-y-auto">
              <ControlPanel {...controlPanelProps} />
            </div>
          </>
        ) : null}
      </main>

      <MobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        onOpen={() => setMobileDrawerOpen(true)}
      >
        {showScene ? <ControlPanel {...controlPanelProps} /> : null}
      </MobileDrawer>
    </div>
  );
});

export { App };

App.displayName = 'App';
