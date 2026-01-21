import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { App } from './App';

vi.mock('@/app/useAppHandlers', () => {
  return {
    useAppHandlers: () => ({
      handleFileUpload: vi.fn(),
      handleUrlSubmit: vi.fn(),
      handleRetry: vi.fn(),
      handleSetCameraView: vi.fn(),
      handleVideoSeek: vi.fn(),
      handleExportScene: vi.fn(),
      handleDownloadSnapshot: vi.fn(),
      handleToggleRecording: vi.fn(),
    }),
  };
});
vi.mock('@/stores/useSessionStore', () => {
  return {
    useSessionStore: () => ({
      status: 'idle',
      progress: 0,
      statusMessage: '',
      currentAsset: null,
      processedResult: null,
      videoState: { isPlaying: false, currentTime: 0, duration: 0, isMuted: true },
      uploadStart: vi.fn(),
      updateProgress: vi.fn(),
      uploadComplete: vi.fn(),
      uploadError: vi.fn(),
      resetSession: vi.fn(),
      setVideoTime: vi.fn(),
      setVideoDuration: vi.fn(),
      togglePlay: vi.fn(),
    }),
  };
});
describe('App smoke', () => {
  it('renders upload panel and can switch to url input', async () => {
    render(<App />);

    expect(screen.getByText('上传资源')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '选择本地文件' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '使用视频链接' }));

    expect(screen.getByText('输入链接')).toBeInTheDocument();
  });
});
