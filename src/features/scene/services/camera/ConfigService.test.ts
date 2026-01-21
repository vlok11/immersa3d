import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { container, TOKENS } from '@/core/container';

import { getConfigService, resetConfigService } from './ConfigService';

const emit = vi.fn();

beforeEach(() => {
    container.register(TOKENS.EventBus, { useValue: { emit } });
});

describe('ConfigService', () => {
    afterEach(() => {
        emit.mockClear();
        resetConfigService();
    });

    it('validates bounds for displacementScale, fov, exposure', () => {
        const service = getConfigService();
        const errors = service.validateConfig({
            displacementScale: 100,
            fov: 1,
            exposure: 100,
        } as never);

        expect(errors.length).toBe(3);
        expect(emit).toHaveBeenCalled();
    });

    it('imports config JSON when valid and emits change event', () => {
        const service = getConfigService() as unknown as { importConfig: (s: string) => void };

        service.importConfig(JSON.stringify({ fov: 60, exposure: 1.2 }));

        expect(emit).toHaveBeenCalled();
    });

    it('throws on invalid config import', () => {
        const service = getConfigService() as unknown as { importConfig: (s: string) => void };

        expect(() => service.importConfig(JSON.stringify({ fov: 999 }))).toThrow();
    });
});
