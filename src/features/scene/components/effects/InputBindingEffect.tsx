import { useThree } from '@react-three/fiber';
import { memo, useEffect } from 'react';

import { useCoreController } from '@/features/scene/services/camera';

export const InputBindingEffect = memo(() => {
  const { gl } = useThree();
  const { isReady, bindInput } = useCoreController();

  useEffect(() => {
    if (!isReady) return;
    bindInput(gl.domElement);
  }, [bindInput, gl, isReady]);

  return null;
});

InputBindingEffect.displayName = 'InputBindingEffect';
