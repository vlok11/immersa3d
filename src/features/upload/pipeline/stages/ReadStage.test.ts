import { describe, expect, it, vi } from 'vitest';

import { ReadStage } from './ReadStage';

vi.mock('@/shared/constants', () => ({
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm'],
    BYTES_PER_KB: 1024,
    MAX_FILE_SIZE_MB: 50,
}));

vi.mock('@/shared/utils', () => ({
    extractFrameFromVideo: vi.fn().mockResolvedValue({
        base64: 'data:image/png;base64,frame',
        aspectRatio: 1.78,
        duration: 10,
    }),
    getObjectURLManager: () => ({
        create: vi.fn().mockReturnValue('blob:test-url'),
        revoke: vi.fn(),
    }),
    validateUrl: vi.fn().mockReturnValue({ valid: true }),
}));

describe('ReadStage', () => {
    it('should have correct name', () => {
        const stage = new ReadStage();

        expect(stage.name).toBe('read');
    });

    it('should have correct order', () => {
        const stage = new ReadStage();

        expect(stage.order).toBe(0);
    });

    it('should have execute method', () => {
        const stage = new ReadStage();

        expect(typeof stage.execute).toBe('function');
    });

    it('should fail when no input provided', async () => {
        const stage = new ReadStage();
        const input = {
            signal: new AbortController().signal,
            runId: 'test-run',
        };

        const result = await stage.execute(input);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('No file or URL');
    });

    it('should handle aborted signal', async () => {
        const stage = new ReadStage();
        const controller = new AbortController();

        controller.abort();

        const input = {
            file: new File(['test'], 'test.png', { type: 'image/png' }),
            signal: controller.signal,
            runId: 'test-run',
        };

        const result = await stage.execute(input);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Aborted');
    });
});
