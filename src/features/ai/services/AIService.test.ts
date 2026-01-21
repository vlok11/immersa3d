import { describe, expect, it, vi } from 'vitest';

// This is a basic export verification test
// Full integration tests for AIService require complex mocking of providers

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

describe('AIService', () => {
    it('should export getAIService function', async () => {
        const module = await import('./AIService');

        expect(module.getAIService).toBeDefined();
        expect(typeof module.getAIService).toBe('function');
    });

    it('should export AIService class', async () => {
        const module = await import('./AIService');

        expect(module.AIService).toBeDefined();
    });

    it('should export resetAIService function', async () => {
        const module = await import('./AIService');

        expect(module.resetAIService).toBeDefined();
        expect(typeof module.resetAIService).toBe('function');
    });
});
