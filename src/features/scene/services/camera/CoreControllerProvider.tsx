import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { createLogger } from '@/core/Logger';

import { getCoreController } from './CoreController';

import type { CoreController } from '@/shared/types';
import type { ReactNode } from 'react';

export function useAnimationService() {
  const { controller, isReady } = useCoreController();

  return isReady ? controller?.animation : null;
}
export function useCameraService() {
  const { controller, isReady } = useCoreController();

  return isReady ? controller?.camera : null;
}
export function useCoreController(): CoreControllerContextValue {
  const context = useContext(CoreControllerContext);

  if (!context) {
    throw new Error('useCoreController must be used within CoreControllerProvider');
  }

  return context;
}
export function useInputService() {
  const { controller, isReady } = useCoreController();

  return isReady ? controller?.input : null;
}
export function useMotionService() {
  const { controller, isReady } = useCoreController();

  return isReady ? controller?.motion : null;
}

interface CoreControllerContextValue {
  bindInput: (element: HTMLElement) => void;
  controller: CoreController | null;
  isReady: boolean;
}
interface CoreControllerProviderProps {
  autoInit?: boolean;
  children: ReactNode;
}

const CoreControllerContext = createContext<CoreControllerContextValue>({
  controller: null,
  isReady: false,
  bindInput: () => {},
});

export const CoreControllerProvider = memo(
  ({ children, autoInit = true }: CoreControllerProviderProps) => {
    const [isReady, setIsReady] = useState(false);

    const controllerRef = useRef<CoreController | null>(null);

    useEffect(() => {
      if (!autoInit) {
        return;
      }
      const controller = getCoreController();

      controllerRef.current = controller;
      const init = async (): Promise<void> => {
        try {
          await controller.initialize();
          setIsReady(true);
        } catch (error) {
          logger.error('Init failed', { error: String(error) });
        }
      };

      void init();

      return () => {
        controller.dispose();
        setIsReady(false);
      };
    }, [autoInit]);

    const bindInput = useCallback((element: HTMLElement) => {
      if (controllerRef.current?.isInitialized) {
        controllerRef.current.input.bindToElement(element);
      }
    }, []);

    const value = useMemo<CoreControllerContextValue>(
      () => ({
        controller: controllerRef.current,
        isReady,
        bindInput,
      }),
      [isReady, bindInput]
    );

    return (
      <CoreControllerContext.Provider value={value}>{children}</CoreControllerContext.Provider>
    );
  }
);
const logger = createLogger({ module: 'CoreControllerProvider' });

export { CoreControllerContext };

CoreControllerProvider.displayName = 'CoreControllerProvider';
