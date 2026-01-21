import { describe, expect, it } from 'vitest';

import {
  AnimeStyleControls,
  CelStyleControls,
  CrystalStyleControls,
  HologramStyleControls,
  InkWashStyleControls,
  MatrixStyleControls,
  RetroPixelStyleControls,
} from './RenderStyleControls';

describe('RenderStyleControls', () => {
  it('should export all style controls', () => {
    expect(AnimeStyleControls).toBeDefined();
    expect(InkWashStyleControls).toBeDefined();
    expect(HologramStyleControls).toBeDefined();
    expect(RetroPixelStyleControls).toBeDefined();
    expect(CelStyleControls).toBeDefined();
    expect(CrystalStyleControls).toBeDefined();
    expect(MatrixStyleControls).toBeDefined();
  });

  it('should have correct display names', () => {
    expect(AnimeStyleControls.displayName).toBe('AnimeStyleControls');
    expect(InkWashStyleControls.displayName).toBe('InkWashStyleControls');
    expect(HologramStyleControls.displayName).toBe('HologramStyleControls');
    expect(RetroPixelStyleControls.displayName).toBe('RetroPixelStyleControls');
    expect(CelStyleControls.displayName).toBe('CelStyleControls');
    expect(CrystalStyleControls.displayName).toBe('CrystalStyleControls');
    expect(MatrixStyleControls.displayName).toBe('MatrixStyleControls');
  });
});
