import { describe, expect, it, vi } from 'vitest';

vi.mock('@/core/EventBus', () => ({
    getEventBus: () => ({
        emit: vi.fn(),
        on: vi.fn(() => () => { }),
    }),
}));

vi.mock('@/core/Logger', () => ({
    createLogger: () => ({
        debug: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    }),
}));

describe('UploadPipeline', () => {
    it('should export createUploadPipeline function', async () => {
        const module = await import('./UploadPipeline');

        expect(module.createUploadPipeline).toBeDefined();
        expect(typeof module.createUploadPipeline).toBe('function');
    });

    it('should export UploadPipeline class', async () => {
        const module = await import('./UploadPipeline');

        expect(module.UploadPipeline).toBeDefined();
    });

    it('should create pipeline instance', async () => {
        const module = await import('./UploadPipeline');
        const pipeline = module.createUploadPipeline();

        expect(pipeline).toBeDefined();
        expect(typeof pipeline.process).toBe('function');
        expect(typeof pipeline.cancel).toBe('function');
        expect(typeof pipeline.getProgress).toBe('function');
        expect(typeof pipeline.onProgress).toBe('function');
        expect(typeof pipeline.onComplete).toBe('function');
        expect(typeof pipeline.onError).toBe('function');
    });

    it('should return current progress', async () => {
        const module = await import('./UploadPipeline');
        const pipeline = module.createUploadPipeline();
        const progress = pipeline.getProgress();

        expect(progress).toBeDefined();
        expect(progress.stage).toBeDefined();
        expect(typeof progress.progress).toBe('number');
    });

    it('should allow subscribing to progress', async () => {
        const module = await import('./UploadPipeline');
        const pipeline = module.createUploadPipeline();
        const callback = vi.fn();

        const unsub = pipeline.onProgress(callback);

        expect(typeof unsub).toBe('function');
    });

    it('should allow subscribing to complete', async () => {
        const module = await import('./UploadPipeline');
        const pipeline = module.createUploadPipeline();
        const callback = vi.fn();

        const unsub = pipeline.onComplete(callback);

        expect(typeof unsub).toBe('function');
    });

    it('should allow subscribing to error', async () => {
        const module = await import('./UploadPipeline');
        const pipeline = module.createUploadPipeline();
        const callback = vi.fn();

        const unsub = pipeline.onError(callback);

        expect(typeof unsub).toBe('function');
    });
});
