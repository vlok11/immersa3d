import { describe, expect, it } from 'vitest';

import { PrepareStage } from './PrepareStage';

describe('PrepareStage', () => {
  it('fails when required fields are missing', async () => {
    const stage = new PrepareStage();

    const out = await stage.execute({ success: true } as never);

    expect(out.success).toBe(false);
    expect(out.error?.message).toContain('Missing image URL');
  });

  it('builds recommendedConfig from analysis', async () => {
    const stage = new PrepareStage();
    const out = await stage.execute({
      imageUrl: 'image.png',
      depthUrl: 'depth.png',
      analysis: { estimatedDepthScale: 2.5, recommendedFov: 70 } as never,
      metadata: {},
      success: true,
    } as never);

    expect(out.success).toBe(true);
    expect(out.metadata?.recommendedConfig).toEqual({ displacementScale: 2.5, fov: 70 });
    expect(out.metadata?.ready).toBe(true);
  });
});
