import { afterEach, describe, expect, it, vi } from 'vitest';

import { DepthStage } from './DepthStage';

const estimateDepth = vi.fn();
const initialize = vi.fn();
const isAvailable = vi.fn();

vi.mock('@/features/ai/services', () => {
  return {
    getAIService: () => ({
      estimateDepth,
      initialize,
      isAvailable,
    }),
  };
});
describe('DepthStage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fails when imageUrl is missing', async () => {
    const stage = new DepthStage();

    const out = await stage.execute({ success: true } as never);

    expect(out.success).toBe(false);
    expect(out.error?.message).toContain('No image URL');
  });

  it('initializes AI service when not available', async () => {
    isAvailable.mockReturnValueOnce(false);
    estimateDepth.mockResolvedValueOnce({ depthUrl: 'depth.png', method: 'mock' });

    const stage = new DepthStage();
    const out = await stage.execute({ imageUrl: 'image.png', success: true } as never);

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(estimateDepth).toHaveBeenCalledWith('image.png');
    expect(out.success).toBe(true);
    expect(out.depthUrl).toBe('depth.png');
    expect(out.metadata?.depthMethod).toBe('mock');
  });
});
