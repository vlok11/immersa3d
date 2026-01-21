import { useThree } from '@react-three/fiber';
import { useEffect, useState } from 'react';

import { getEventBus, getInputService } from '@/features/scene/services/camera';

export const useUserInteraction = (): boolean => {
  const [isInteracting, setIsInteracting] = useState(false);
  const { gl } = useThree();
  const inputService = getInputService();
  const eventBus = getEventBus();

  useEffect(() => {
    const canvas = gl.domElement;

    inputService.bindToElement(canvas);

    return () => {
      inputService.unbind();
    };
  }, [gl, inputService]);

  useEffect(() => {
    const offStart = eventBus.on('input:interaction-start', () => {
      setIsInteracting(true);
    });
    const offEnd = eventBus.on('input:interaction-end', () => {
      setIsInteracting(false);
    });

    return () => {
      offStart();
      offEnd();
    };
  }, [eventBus]);

  return isInteracting;
};
