import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import { isValidStatusTransition, SESSION_STATUS_TRANSITIONS } from '@/core/domain/types';
import { getEventBus } from '@/core/EventBus';
import { MediaEvents, SessionEvents, UploadEvents } from '@/core/EventTypes';
import { SceneConfigurator } from '@/core/logic/SceneConfigurator';
import { getObjectURLManager } from '@/shared/utils';

import type { Asset, ProcessedAsset, SessionStatus } from '@/core/domain/types';

export interface ExportStateInfo {
  format: 'gltf' | 'glb' | 'png' | 'video' | null;
  isExporting: boolean;
  progress: number;
}
export interface SessionState {
  currentAsset: Asset | null;
  error: string | null;
  exportState: ExportStateInfo;
  finishExport: () => void;

  processedResult: ProcessedAsset | null;
  progress: number;

  resetSession: () => void;

  setMuted: (muted: boolean) => void;

  setVideoDuration: (duration: number) => void;
  setVideoTime: (time: number) => void;
  startExport: (format: ExportStateInfo['format']) => void;
  status: SessionStatus;
  statusMessage: string;

  togglePlay: () => void;
  updateExportProgress: (progress: number) => void;
  updateProgress: (status: SessionStatus, progress: number, message?: string) => void;
  uploadComplete: (result: ProcessedAsset) => void;

  uploadError: (error: string) => void;
  uploadStart: (input?: File | string) => void;
  videoState: VideoPlaybackState;
}
export interface VideoPlaybackState {
  currentTime: number;
  duration: number;
  isMuted: boolean;
  isPlaying: boolean;
}

export const useSessionStore = create<SessionState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      status: 'idle',
      statusMessage: '',
      progress: 0,
      error: null,
      currentAsset: null,
      processedResult: null,
      videoState: {
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        isMuted: true,
      },
      exportState: {
        isExporting: false,
        progress: 0,
        format: null,
      },

      uploadStart: (input) => {
        const current = get().status;

        if (!validateTransition(current, 'uploading')) return;

        getObjectURLManager().revokeAll();

        set({ status: 'uploading', progress: 0, error: null, statusMessage: '开始上传...' });

        if (input instanceof File) {
          getEventBus().emit(UploadEvents.STARTED, {
            fileName: input.name,
            fileType: input.type,
            fileSize: input.size,
          });
        } else {
          getEventBus().emit(UploadEvents.STARTED, {
            fileName: typeof input === 'string' ? input : '',
            fileType: 'url',
            fileSize: 0,
          });
        }
      },

      updateProgress: (status, progress, message) => {
        const current = get().status;

        if (current !== status && !validateTransition(current, status)) return;

        set({ status, progress, statusMessage: message ?? '' });
        getEventBus().emit(UploadEvents.PROGRESS, { progress, stage: status });
      },

      uploadComplete: (result) => {
        const current = get().status;

        if (!validateTransition(current, 'ready')) return;

        set({
          status: 'ready',
          progress: 100,
          statusMessage: '就绪',
          currentAsset: result.asset,
          processedResult: result,
        });

        getEventBus().emit(UploadEvents.COMPLETED, {
          result: result as unknown as Record<string, unknown>,
        });
        getEventBus().emit(MediaEvents.LOADED, {
          type: result.asset.type,
          url: result.asset.sourceUrl,
        });

        const recommended = SceneConfigurator.deriveConfig({
          analysis: result.analysis,
          assetType: result.asset.type,
        });

        getEventBus().emit(SessionEvents.CONFIG_RECOMMENDED, { config: recommended });
      },

      uploadError: (error) => {
        const current = get().status;

        if (!validateTransition(current, 'error')) return;

        set({ status: 'error', error, statusMessage: '发生错误' });
        getEventBus().emit(UploadEvents.ERROR, { error, stage: current });
      },

      resetSession: () => {
        const current = get().status;

        if (!validateTransition(current, 'idle')) return;

        getObjectURLManager().revokeAll();

        set({
          status: 'idle',
          currentAsset: null,
          processedResult: null,
          progress: 0,
          error: null,
          statusMessage: '',
        });

        getEventBus().emit(MediaEvents.UNLOADED, undefined);
        getEventBus().emit(SessionEvents.RESET_REQUESTED, undefined);
      },

      setVideoDuration: (duration) => {
        set((s) => ({ videoState: { ...s.videoState, duration } }));
      },

      setVideoTime: (time) => {
        set((s) => ({ videoState: { ...s.videoState, currentTime: time } }));
      },

      togglePlay: () => {
        const newState = !get().videoState.isPlaying;

        set((s) => ({ videoState: { ...s.videoState, isPlaying: newState } }));

        if (newState) {
          getEventBus().emit(MediaEvents.VIDEO_PLAY, undefined);
        } else {
          getEventBus().emit(MediaEvents.VIDEO_PAUSE, undefined);
        }
      },

      setMuted: (muted) => {
        set((s) => ({ videoState: { ...s.videoState, isMuted: muted } }));
      },

      startExport: (format) => {
        set({ exportState: { isExporting: true, progress: 0, format } });
      },

      updateExportProgress: (progress) => {
        set((s) => ({ exportState: { ...s.exportState, progress } }));
      },

      finishExport: () => {
        set({ exportState: { isExporting: false, progress: 100, format: null } });
      },
    })),
    { name: 'SessionStore' }
  )
);

function validateTransition(from: SessionStatus, to: SessionStatus): boolean {
  if (!isValidStatusTransition(from, to)) {
    console.warn(
      `[SessionStore] Invalid status transition: ${from} -> ${to}. ` +
        `Valid transitions from "${from}": ${SESSION_STATUS_TRANSITIONS[from]?.join(', ') ?? 'none'}`
    );

    return false;
  }

  return true;
}

export type { SessionStatus } from '@/core/domain/types';
