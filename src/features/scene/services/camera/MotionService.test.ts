import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock all dependencies before importing
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

vi.mock('@/stores/cameraStore', () => ({
    useCameraStore: {
        getState: () => ({
            pose: {
                position: [0, 0, 5],
                target: [0, 0, 0],
                up: [0, 1, 0],
                fov: 60,
            },
            interaction: { isInteracting: false },
            setPose: vi.fn(),
        }),
        subscribe: vi.fn(() => vi.fn()),
    },
}));

describe('MotionService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    it('should export getMotionService function', async () => {
        const module = await import('./MotionService');

        expect(module.getMotionService).toBeDefined();
        expect(typeof module.getMotionService).toBe('function');
    });

    it('should get singleton instance', async () => {
        const module = await import('./MotionService');
        const service1 = module.getMotionService();
        const service2 = module.getMotionService();

        expect(service1).toBe(service2);
    });

    it('should have correct serviceId', async () => {
        const module = await import('./MotionService');
        const service = module.getMotionService();

        expect(service.serviceId).toBe('MotionService');
    });

    it('should have dependencies', async () => {
        const module = await import('./MotionService');
        const service = module.getMotionService();

        expect(service.dependencies).toContain('CameraService');
    });

    it('should get initial state', async () => {
        const module = await import('./MotionService');
        const service = module.getMotionService();
        const state = service.getState();

        expect(state).toBeDefined();
        expect(state.isActive).toBe(false);
        expect(state.type).toBe('STATIC');
    });

    it('should get default parameters', async () => {
        const module = await import('./MotionService');
        const service = module.getMotionService();
        const params = service.getParameters();

        expect(params).toBeDefined();
    });

    it('should get and set blend mode', async () => {
        const module = await import('./MotionService');
        const service = module.getMotionService();

        expect(service.getBlendMode()).toBe('override');

        service.setBlendMode('additive');

        expect(service.getBlendMode()).toBe('additive');
    });

    it('should set parameter', async () => {
        const module = await import('./MotionService');
        const service = module.getMotionService();

        // setParameter method is available
        expect(typeof service.setParameter).toBe('function');
    });

    it('should check isActive', async () => {
        const module = await import('./MotionService');
        const service = module.getMotionService();

        expect(service.isActive()).toBe(false);
    });

    it('should check isPaused', async () => {
        const module = await import('./MotionService');
        const service = module.getMotionService();

        expect(service.isPaused()).toBe(false);
    });

    it('should get progress', async () => {
        const module = await import('./MotionService');
        const service = module.getMotionService();

        expect(service.getProgress()).toBe(0);
    });

    it('should get type', async () => {
        const module = await import('./MotionService');
        const service = module.getMotionService();

        expect(service.getType()).toBe('STATIC');
    });
});
