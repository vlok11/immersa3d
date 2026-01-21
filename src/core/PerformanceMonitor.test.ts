import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getPerformanceMonitor, resetPerformanceMonitor } from './PerformanceMonitor';

vi.mock('./EventBus', () => ({
    getEventBus: () => ({
        emit: vi.fn(),
        on: vi.fn(() => () => { }),
    }),
}));

describe('PerformanceMonitor', () => {
    beforeEach(() => {
        resetPerformanceMonitor();
        vi.useFakeTimers();
    });

    afterEach(() => {
        const monitor = getPerformanceMonitor();

        monitor.stop();
        vi.useRealTimers();
    });

    it('should return same instance on multiple calls', () => {
        const monitor1 = getPerformanceMonitor();
        const monitor2 = getPerformanceMonitor();

        expect(monitor1).toBe(monitor2);
    });

    it('should return initial metrics', () => {
        const monitor = getPerformanceMonitor();
        const metrics = monitor.getMetrics();

        expect(metrics.fps).toBeDefined();
        expect(metrics.frameTime).toBeDefined();
    });

    it('should record service init times', () => {
        const monitor = getPerformanceMonitor();

        monitor.recordServiceInitTime('test-service', 150);
        monitor.recordServiceInitTime('another-service', 200);

        const times = monitor.getInitTimes();

        expect(times.get('test-service')).toBe(150);
        expect(times.get('another-service')).toBe(200);
    });

    it('should start and stop monitoring', () => {
        const monitor = getPerformanceMonitor();

        monitor.start();
        monitor.stop();

        // Should not throw
        expect(true).toBe(true);
    });

    it('should not start twice', () => {
        const monitor = getPerformanceMonitor();

        monitor.start();
        monitor.start();
        monitor.stop();

        expect(true).toBe(true);
    });

    it('should get and set thresholds', () => {
        const monitor = getPerformanceMonitor();

        monitor.setThresholds({ minFps: 20, maxFrameTime: 50 });

        const thresholds = monitor.getThresholds();

        expect(thresholds.minFps).toBe(20);
        expect(thresholds.maxFrameTime).toBe(50);
    });

    it('should preserve existing thresholds when setting partial', () => {
        const monitor = getPerformanceMonitor();
        const originalThresholds = monitor.getThresholds();

        monitor.setThresholds({ minFps: 10 });

        const newThresholds = monitor.getThresholds();

        expect(newThresholds.minFps).toBe(10);
        expect(newThresholds.maxMemoryPercent).toBe(originalThresholds.maxMemoryPercent);
    });
});
