import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorSeverity, getErrorHandler, resetErrorHandler } from './ErrorHandler';

vi.mock('./EventBus', () => ({
    getEventBus: () => ({
        emit: vi.fn(),
        on: vi.fn(() => () => { }),
    }),
}));

describe('ErrorHandler', () => {
    beforeEach(() => {
        resetErrorHandler();
    });

    it('should return same instance on multiple calls', () => {
        const handler1 = getErrorHandler();
        const handler2 = getErrorHandler();

        expect(handler1).toBe(handler2);
    });

    it('should create new instance after reset', () => {
        const handler1 = getErrorHandler();

        resetErrorHandler();
        const handler2 = getErrorHandler();

        expect(handler1).not.toBe(handler2);
    });

    it('should create an AppError with defaults', () => {
        const handler = getErrorHandler();
        const error = handler.createError('TEST_ERROR', 'Test message');

        expect(error.code).toBe('TEST_ERROR');
        expect(error.message).toBe('Test message');
        expect(error.severity).toBe(ErrorSeverity.ERROR);
        expect(error.recoverable).toBe(true);
    });

    it('should create an AppError with custom options', () => {
        const handler = getErrorHandler();
        const error = handler.createError('FATAL_ERROR', 'Fatal message', {
            severity: ErrorSeverity.FATAL,
            recoverable: false,
            context: 'TestContext',
        });

        expect(error.severity).toBe(ErrorSeverity.FATAL);
        expect(error.recoverable).toBe(false);
        expect(error.context).toBe('TestContext');
    });

    it('should normalize Error to AppError', () => {
        const handler = getErrorHandler();
        const rawError = new Error('Something went wrong');

        const appError = handler.handle(rawError, { context: 'TestContext' });

        expect(appError.message).toBe('Something went wrong');
        expect(appError.context).toBe('TestContext');
        expect(appError.originalError).toBe(rawError);
    });

    it('should pass through AppError unchanged', () => {
        const handler = getErrorHandler();
        const appError = handler.createError('CODE', 'Message');

        const result = handler.handle(appError);

        expect(result).toBe(appError);
    });

    it('should categorize fatal errors', () => {
        const handler = getErrorHandler();
        const fatalError = new Error('fatal system failure');

        const appError = handler.handle(fatalError);

        expect(appError.severity).toBe(ErrorSeverity.FATAL);
    });

    it('should categorize warning messages', () => {
        const handler = getErrorHandler();
        const warningError = new Error('This is a warning about something');

        const appError = handler.handle(warningError);

        expect(appError.severity).toBe(ErrorSeverity.WARNING);
    });

    it('should record handled errors', () => {
        const handler = getErrorHandler();

        handler.handle(new Error('Error 1'));
        handler.handle(new Error('Error 2'));

        const history = handler.getHistory();

        expect(history).toHaveLength(2);
    });

    it('should limit history size', () => {
        const handler = getErrorHandler();

        for (let i = 0; i < 150; i++) {
            handler.handle(new Error(`Error ${i}`));
        }

        expect(handler.getHistory().length).toBeLessThanOrEqual(100);
    });

    it('should clear history', () => {
        const handler = getErrorHandler();

        handler.handle(new Error('Test'));
        handler.clearHistory();

        expect(handler.getHistory()).toHaveLength(0);
    });

    it('should notify callbacks on fatal error', () => {
        const handler = getErrorHandler();
        const callback = vi.fn();

        handler.onFatalError(callback);
        handler.handle(new Error('fatal crash'));

        expect(callback).toHaveBeenCalled();
    });

    it('should allow unsubscribing from fatal callbacks', () => {
        const handler = getErrorHandler();
        const callback = vi.fn();

        const unsubscribe = handler.onFatalError(callback);

        unsubscribe();
        handler.handle(new Error('fatal crash'));

        expect(callback).not.toHaveBeenCalled();
    });

    it('should not crash if callback throws', () => {
        const handler = getErrorHandler();
        const badCallback = () => {
            throw new Error('Callback error');
        };
        const goodCallback = vi.fn();

        handler.onFatalError(badCallback);
        handler.onFatalError(goodCallback);

        expect(() => handler.handle(new Error('fatal error'))).not.toThrow();
        expect(goodCallback).toHaveBeenCalled();
    });
});
