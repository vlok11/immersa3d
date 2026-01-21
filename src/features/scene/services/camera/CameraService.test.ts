import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock all dependencies before importing the service
vi.mock('@/core/container', () => ({
    container: {
        register: vi.fn(),
        resolve: vi.fn(),
    },
    TOKENS: {
        EventBus: Symbol('EventBus'),
        CameraService: Symbol('CameraService'),
    },
}));

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

vi.mock('@/features/scene/services/camera/AnimationScheduler', () => ({
    getAnimationScheduler: () => ({
        cancel: vi.fn(),
        schedule: vi.fn().mockReturnValue('anim-001'),
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
                near: 0.1,
                far: 1000,
            },
            bookmarks: [],
            history: { entries: [], currentIndex: -1 },
            undo: vi.fn(),
            redo: vi.fn(),
            saveBookmark: vi.fn().mockReturnValue('bm-001'),
            loadBookmark: vi.fn(),
            deleteBookmark: vi.fn(),
            setPose: vi.fn(),
            canUndo: vi.fn().mockReturnValue(false),
            canRedo: vi.fn().mockReturnValue(false),
        }),
        subscribe: vi.fn(() => vi.fn()),
    },
}));

describe('CameraService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    it('should export getCameraService function', async () => {
        const module = await import('./CameraService');

        expect(module.getCameraService).toBeDefined();
        expect(typeof module.getCameraService).toBe('function');
    });

    it('should export CameraService class', async () => {
        const module = await import('./CameraService');

        expect(module.CameraService).toBeDefined();
    });

    it('should have static resetInstance method', async () => {
        const module = await import('./CameraService');

        expect(module.CameraService.resetInstance).toBeDefined();
        expect(typeof module.CameraService.resetInstance).toBe('function');
    });
});
