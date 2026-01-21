import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    getLifecycleManager,
    type LifecycleAware,
    LifecycleState,
    resetLifecycleManager,
} from './LifecycleManager';

vi.mock('./EventBus', () => ({
    getEventBus: () => ({
        emit: vi.fn(),
        on: vi.fn(() => () => { }),
    }),
}));

vi.mock('./Logger', () => ({
    createLogger: () => ({
        debug: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    }),
}));

const createMockService = (
    id: string,
    deps: string[] = [],
    shouldFail = false
): LifecycleAware => ({
    serviceId: id,
    dependencies: deps,
    initialize: vi.fn(async () => {
        if (shouldFail) throw new Error(`Service ${id} failed`);
    }),
    destroy: vi.fn(async () => { }),
});

describe('LifecycleManager', () => {
    beforeEach(() => {
        resetLifecycleManager();
    });

    it('should register a service', () => {
        const manager = getLifecycleManager();
        const service = createMockService('test-service');

        manager.register(service);

        expect(manager.getServiceState('test-service')).toBe(LifecycleState.UNINITIALIZED);
    });

    it('should not register duplicate services', () => {
        const manager = getLifecycleManager();
        const service1 = createMockService('test-service');
        const service2 = createMockService('test-service');

        manager.register(service1);
        manager.register(service2);

        expect(manager.getServiceState('test-service')).toBe(LifecycleState.UNINITIALIZED);
    });

    it('should unregister a service', () => {
        const manager = getLifecycleManager();
        const service = createMockService('test-service');

        manager.register(service);
        manager.unregister('test-service');

        expect(manager.getServiceState('test-service')).toBeUndefined();
    });

    it('should initialize all services', async () => {
        const manager = getLifecycleManager();
        const service1 = createMockService('service-1');
        const service2 = createMockService('service-2');

        manager.register(service1);
        manager.register(service2);
        await manager.initializeAll();

        expect(service1.initialize).toHaveBeenCalled();
        expect(service2.initialize).toHaveBeenCalled();
        expect(manager.getState()).toBe(LifecycleState.READY);
    });

    it('should initialize in dependency order', async () => {
        const manager = getLifecycleManager();
        const initOrder: string[] = [];

        const serviceA: LifecycleAware = {
            serviceId: 'service-a',
            dependencies: ['service-b'],
            initialize: vi.fn(async () => void initOrder.push('a')),
            destroy: vi.fn(async () => { }),
        };
        const serviceB: LifecycleAware = {
            serviceId: 'service-b',
            dependencies: ['service-c'],
            initialize: vi.fn(async () => void initOrder.push('b')),
            destroy: vi.fn(async () => { }),
        };
        const serviceC: LifecycleAware = {
            serviceId: 'service-c',
            dependencies: [],
            initialize: vi.fn(async () => void initOrder.push('c')),
            destroy: vi.fn(async () => { }),
        };

        manager.register(serviceA);
        manager.register(serviceB);
        manager.register(serviceC);
        await manager.initializeAll();

        expect(initOrder).toEqual(['c', 'b', 'a']);
    });

    it('should detect circular dependencies', async () => {
        const manager = getLifecycleManager();

        const serviceA = createMockService('service-a', ['service-b']);
        const serviceB = createMockService('service-b', ['service-a']);

        manager.register(serviceA);
        manager.register(serviceB);

        await expect(manager.initializeAll()).rejects.toThrow('Circular dependency');
    });

    it('should not re-initialize if already ready', async () => {
        const manager = getLifecycleManager();
        const service = createMockService('test-service');

        manager.register(service);
        await manager.initializeAll();
        await manager.initializeAll();

        expect(service.initialize).toHaveBeenCalledTimes(1);
    });

    it('should destroy all services', async () => {
        const manager = getLifecycleManager();
        const service = createMockService('test-service');

        manager.register(service);
        await manager.initializeAll();
        await manager.destroyAll();

        expect(service.destroy).toHaveBeenCalled();
        expect(manager.getState()).toBe(LifecycleState.DESTROYED);
    });

    it('should not destroy if already destroyed', async () => {
        const manager = getLifecycleManager();
        const service = createMockService('test-service');

        manager.register(service);
        await manager.initializeAll();
        await manager.destroyAll();
        await manager.destroyAll();

        expect(service.destroy).toHaveBeenCalledTimes(1);
    });

    it('should pause and resume services', async () => {
        const manager = getLifecycleManager();
        const service: LifecycleAware = {
            serviceId: 'pausable-service',
            initialize: vi.fn(async () => { }),
            destroy: vi.fn(async () => { }),
            pause: vi.fn(),
            resume: vi.fn(),
        };

        manager.register(service);
        await manager.initializeAll();

        manager.pause();

        expect(service.pause).toHaveBeenCalled();
        expect(manager.getState()).toBe(LifecycleState.PAUSED);

        manager.resume();

        expect(service.resume).toHaveBeenCalled();
        expect(manager.getState()).toBe(LifecycleState.READY);
    });

    it('should return correct isServiceReady', async () => {
        const manager = getLifecycleManager();
        const service = createMockService('test-service');

        manager.register(service);

        expect(manager.isServiceReady('test-service')).toBe(false);

        await manager.initializeAll();

        expect(manager.isServiceReady('test-service')).toBe(true);
    });
});
