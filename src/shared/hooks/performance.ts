import { useCallback, useMemo, useRef } from 'react';

import { CameraMotionType, MirrorMode, ProjectionMode, RenderStyle } from '@/shared/types';

import type { SceneConfig } from '@/shared/types';

/**
 * 性能优化 Hooks
 * 用于减少不必要的重渲染和计算
 */

// =============================================
// 防抖 Hook
// =============================================

export function useDebounce<T extends (...args: Parameters<T>) => void>(
    callback: T,
    delay: number
): T {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const callbackRef = useRef(callback);

    callbackRef.current = callback;

    return useCallback(
        ((...args: Parameters<T>) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                callbackRef.current(...args);
            }, delay);
        }) as T,
        [delay]
    );
}

// =============================================
// 节流 Hook
// =============================================

export function useThrottle<T extends (...args: Parameters<T>) => void>(
    callback: T,
    delay: number
): T {
    const lastCallRef = useRef<number>(0);
    const callbackRef = useRef(callback);

    callbackRef.current = callback;

    return useCallback(
        ((...args: Parameters<T>) => {
            const now = Date.now();

            if (now - lastCallRef.current >= delay) {
                lastCallRef.current = now;
                callbackRef.current(...args);
            }
        }) as T,
        [delay]
    );
}

// =============================================
// 稳定回调 Hook
// =============================================

export function useStableCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
    callback: T
): T {
    const callbackRef = useRef(callback);

    callbackRef.current = callback;

    return useCallback(
        ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
        []
    );
}

// =============================================
// 派生状态计�?Hook
// =============================================

export function useSceneConfigDerived(config: SceneConfig) {
    // 是否处于自动运镜模式
    const isAutoMotion = useMemo(
        () =>
            [
                CameraMotionType.ORBIT,
                CameraMotionType.FLY_BY,
                CameraMotionType.SPIRAL,
                CameraMotionType.DOLLY_ZOOM,
                CameraMotionType.ARC,
                CameraMotionType.TRACKING,
            ].includes(config.cameraMotionType),
        [config.cameraMotionType]
    );

    // 是否为沉浸式投影模式
    const isImmersiveProjection = useMemo(
        () =>
            [
                ProjectionMode.INFINITE_BOX,
                ProjectionMode.CORNER,
                ProjectionMode.CUBE,
                ProjectionMode.PANORAMA,
                ProjectionMode.SPHERE,
                ProjectionMode.DOME,
                ProjectionMode.CYLINDER,
            ].includes(config.projectionMode),
        [config.projectionMode]
    );

    // 是否有镜像效�?
    const hasMirror = useMemo(
        () => config.mirrorMode !== MirrorMode.NONE,
        [config.mirrorMode]
    );

    // 是否为特殊渲染风�?
    const isSpecialRenderStyle = useMemo(
        () => config.renderStyle !== RenderStyle.NORMAL,
        [config.renderStyle]
    );

    // 是否有任何特效开�?
    const hasActiveEffects = useMemo(
        () =>
            config.enableParticles ||
            config.enableNakedEye3D ||
            hasMirror ||
            isSpecialRenderStyle,
        [config.enableParticles, config.enableNakedEye3D, hasMirror, isSpecialRenderStyle]
    );

    return {
        isAutoMotion,
        isImmersiveProjection,
        hasMirror,
        isSpecialRenderStyle,
        hasActiveEffects,
    };
}

// =============================================
// 前一个�?Hook
// =============================================

export function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T | undefined>(undefined);
    const previous = ref.current;

    ref.current = value;

    return previous;
}

// =============================================
// 首次渲染检�?Hook
// =============================================

export function useIsFirstRender(): boolean {
    const isFirstRef = useRef(true);

    if (isFirstRef.current) {
        isFirstRef.current = false;

        return true;
    }

    return false;
}

// =============================================
// 挂载状�?Hook
// =============================================

export function useIsMounted(): () => boolean {
    const mountedRef = useRef(false);

    // 使用 useCallback 的依赖数组技巧来�?useEffect 之前设置
    const isMounted = useCallback(() => mountedRef.current, []);

    // 组件挂载时设置为 true
    useMemo(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
        };
    }, []);

    return isMounted;
}

// =============================================
// 懒初始化 Hook
// =============================================

export function useLazyInit<T>(factory: () => T): T {
    const valueRef = useRef<T | null>(null);

    valueRef.current ??= factory();

    return valueRef.current;
}

// =============================================
// 记忆化对象比�?Hook
// =============================================

export function useShallowMemo<T extends Record<string, unknown>>(obj: T): T {
    const ref = useRef<T>(obj);

    const isEqual = useMemo(() => {
        const keys = Object.keys(obj);
        const prevKeys = Object.keys(ref.current);

        if (keys.length !== prevKeys.length) return false;

        return keys.every((key) => Object.is(obj[key], ref.current[key]));
    }, [obj]);

    if (!isEqual) {
        ref.current = obj;
    }

    return ref.current;
}
