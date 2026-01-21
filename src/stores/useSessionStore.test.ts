import { describe, expect, it, vi } from 'vitest';

vi.mock('@/core/EventBus', () => {
  return {
    getEventBus: () => ({ emit: vi.fn() }),
  };
});
vi.mock('@/shared/utils', () => {
  return {
    getObjectURLManager: () => ({ revokeAll: vi.fn() }),
  };
});
vi.mock('@/core/logic/SceneConfigurator', () => {
  return {
    SceneConfigurator: { deriveConfig: vi.fn(() => ({})) },
  };
});
describe('useSessionStore smoke', () => {
  it('runs through the happy-path status transitions', async () => {
    const { useSessionStore } = await import('./useSessionStore');
    const { uploadStart, updateProgress, uploadComplete, resetSession } =
      useSessionStore.getState();

    uploadStart('https://example.com/a.png');
    expect(useSessionStore.getState().status).toBe('uploading');
    updateProgress('analyzing', 10, 'analyzing');
    expect(useSessionStore.getState().status).toBe('analyzing');
    updateProgress('processing_depth', 50, 'depth');
    expect(useSessionStore.getState().status).toBe('processing_depth');
    uploadComplete({
      asset: {
        id: 'a',
        sourceUrl: 'https://example.com/a.png',
        type: 'image',
        width: 100,
        height: 100,
        aspectRatio: 1,
        createdAt: Date.now(),
      },
      depthMapUrl: 'https://example.com/depth.png',
      imageUrl: 'https://example.com/a.png',
      analysis: {
        sceneType: 'UNKNOWN',
        description: 'd',
        reasoning: 'r',
        estimatedDepthScale: 1,
        recommendedFov: 55,
        recommendedPipeline: 'DEPTH_MESH',
      },
      processingTime: 1,
    } as never);
    expect(useSessionStore.getState().status).toBe('ready');
    resetSession();
    expect(useSessionStore.getState().status).toBe('idle');
  });
});
