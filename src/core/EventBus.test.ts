import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getEventBus, resetEventBus } from './EventBus';

vi.mock('./Logger', () => ({
    createLogger: () => ({
        debug: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    }),
}));

describe('EventBus', () => {
    beforeEach(() => {
        resetEventBus();
    });

    it('should subscribe and emit events', () => {
        const bus = getEventBus();
        const handler = vi.fn();

        bus.on('test:event', handler);
        bus.emit('test:event', { data: 'hello' });

        expect(handler).toHaveBeenCalledWith({ data: 'hello' });
    });

    it('should call multiple handlers for same event', () => {
        const bus = getEventBus();
        const handler1 = vi.fn();
        const handler2 = vi.fn();

        bus.on('test:event', handler1);
        bus.on('test:event', handler2);
        bus.emit('test:event', { value: 42 });

        expect(handler1).toHaveBeenCalled();
        expect(handler2).toHaveBeenCalled();
    });

    it('should unsubscribe via returned function', () => {
        const bus = getEventBus();
        const handler = vi.fn();

        const unsubscribe = bus.on('test:event', handler);

        unsubscribe();
        bus.emit('test:event', {});

        expect(handler).not.toHaveBeenCalled();
    });

    it('should remove specific handler via off', () => {
        const bus = getEventBus();
        const handler1 = vi.fn();
        const handler2 = vi.fn();

        bus.on('test:event', handler1);
        bus.on('test:event', handler2);
        bus.off('test:event', handler1);
        bus.emit('test:event', {});

        expect(handler1).not.toHaveBeenCalled();
        expect(handler2).toHaveBeenCalled();
    });

    it('should remove all handlers for specific event via offAll', () => {
        const bus = getEventBus();
        const handlerA = vi.fn();
        const handlerB = vi.fn();

        bus.on('event:a', handlerA);
        bus.on('event:b', handlerB);
        bus.offAll('event:a');
        bus.emit('event:a', {});
        bus.emit('event:b', {});

        expect(handlerA).not.toHaveBeenCalled();
        expect(handlerB).toHaveBeenCalled();
    });

    it('should remove all handlers via offAll without args', () => {
        const bus = getEventBus();
        const handler1 = vi.fn();
        const handler2 = vi.fn();

        bus.on('event:a', handler1);
        bus.on('event:b', handler2);
        bus.offAll();
        bus.emit('event:a', {});
        bus.emit('event:b', {});

        expect(handler1).not.toHaveBeenCalled();
        expect(handler2).not.toHaveBeenCalled();
    });

    it('should trigger once handler only one time', () => {
        const bus = getEventBus();
        const handler = vi.fn();

        bus.once('test:event', handler);
        bus.emit('test:event', { first: true });
        bus.emit('test:event', { second: true });

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith({ first: true });
    });

    it('should call higher priority handlers first', () => {
        const bus = getEventBus();
        const order: number[] = [];

        bus.on('test:event', () => order.push(1), { priority: 1 });
        bus.on('test:event', () => order.push(10), { priority: 10 });
        bus.on('test:event', () => order.push(5), { priority: 5 });
        bus.emit('test:event', {});

        expect(order).toEqual([10, 5, 1]);
    });

    it('should record event history', () => {
        const bus = getEventBus();
        const handler = vi.fn();

        bus.on('test:event', handler);
        bus.emit('test:event', { a: 1 });
        bus.emit('test:event', { b: 2 });

        const history = bus.getEventHistory();

        expect(history).toHaveLength(2);
    });

    it('should limit history size', () => {
        const bus = getEventBus();
        const handler = vi.fn();

        bus.on('test:event', handler);

        for (let i = 0; i < 200; i++) {
            bus.emit('test:event', { i });
        }

        expect(bus.getEventHistory().length).toBeLessThanOrEqual(100);
    });

    it('should clear history', () => {
        const bus = getEventBus();

        bus.on('test:event', vi.fn());
        bus.emit('test:event', {});
        bus.clearEventHistory();

        expect(bus.getEventHistory()).toHaveLength(0);
    });

    it('should not throw when handler throws', () => {
        const bus = getEventBus();
        const errorHandler = () => {
            throw new Error('Handler error');
        };
        const normalHandler = vi.fn();

        bus.on('test:event', errorHandler);
        bus.on('test:event', normalHandler);

        expect(() => bus.emit('test:event', {})).not.toThrow();
        expect(normalHandler).toHaveBeenCalled();
    });

    it('should return correct subscriber count', () => {
        const bus = getEventBus();

        expect(bus.getSubscriberCount('test:event')).toBe(0);

        bus.on('test:event', vi.fn());

        expect(bus.getSubscriberCount('test:event')).toBe(1);
    });
});
