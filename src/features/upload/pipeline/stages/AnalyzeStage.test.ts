import { afterEach, describe, expect, it, vi } from 'vitest';

import { AnalyzeStage } from './AnalyzeStage';

const analyzeScene = vi.fn();

vi.mock('@/features/ai/services', () => {
  return {
    getAIService: () => ({
      analyzeScene,
    }),
  };
});
describe('AnalyzeStage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns default analysis when imageBase64 is missing', async () => {
    const stage = new AnalyzeStage();

    const out = await stage.execute({ success: true } as never);

    expect(out.success).toBe(true);
    expect(out.analysis).toBeDefined();
    expect(out.analysis?.recommendedFov).toBe(55);
  });

  it('falls back to default analysis when AI throws', async () => {
    analyzeScene.mockRejectedValueOnce(new Error('boom'));
    const stage = new AnalyzeStage();

    const out = await stage.execute({
      imageBase64: 'data:image/png;base64,aaa',
      success: true,
    } as never);

    expect(out.success).toBe(true);
    expect(out.analysis?.reasoning).toContain('boom');
  });
});
