import { Keyboard, Plane, ZoomIn } from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';

import { getFlyModeService } from '@/features/scene/services/camera';
import { CameraMotionType } from '@/shared/types';
import { useCameraMotionType } from '@/stores/sharedStore';

import { FLY_MODE } from './CameraTab.constants';
import { CollapsibleSection, Slider, Toggle } from './components';

const FLY_MODE_STATE_CHECK_INTERVAL = 500;

const FlyModeSection = memo(() => {
  const [flyModeEnabled, setFlyModeEnabled] = useState(false);
  const [moveSpeed, setMoveSpeed] = useState<number>(FLY_MODE.MOVE_SPEED_DEFAULT);
  const cameraMotionType = useCameraMotionType();
  const isMotionActive = cameraMotionType !== CameraMotionType.STATIC;

  // 组件卸载时清理飞行模式
  useEffect(() => {
    return () => {
      const flyService = getFlyModeService();

      if (flyService.isEnabled()) {
        flyService.disable();
      }
    };
  }, []);

  // 同步飞行模式状态
  useEffect(() => {
    const checkState = () => {
      const flyService = getFlyModeService();

      if (flyModeEnabled !== flyService.isEnabled()) {
        setFlyModeEnabled(flyService.isEnabled());
      }
    };

    const interval = setInterval(checkState, FLY_MODE_STATE_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [flyModeEnabled]);

  const handleToggle = useCallback((enabled: boolean) => {
    setFlyModeEnabled(enabled);
    const flyService = getFlyModeService();

    if (enabled) {
      flyService.setConfig({ moveSpeed });
      flyService.enable();
    } else {
      flyService.disable();
    }
  }, [moveSpeed]);

  const handleSpeedChange = useCallback((value: number) => {
    setMoveSpeed(value);
    if (flyModeEnabled) {
      const flyService = getFlyModeService();

      flyService.setConfig({ moveSpeed: value });
    }
  }, [flyModeEnabled]);

  return (
    <CollapsibleSection icon={<Plane className="w-3.5 h-3.5" />} title="飞行模式">
      <Toggle
        checked={flyModeEnabled}
        label="启用飞行模式"
        onChange={handleToggle}
      />
      {isMotionActive && flyModeEnabled ? (
        <div className="mt-1.5 text-[10px] text-amber-400/80">
          ⏸ 自动运镜中，飞行控制暂停
        </div>
      ) : null}
      {flyModeEnabled ? (
        <>
          <Slider
            label="移动速度"
            max={FLY_MODE.MOVE_SPEED_MAX}
            min={FLY_MODE.MOVE_SPEED_MIN}
            onChange={handleSpeedChange}
            step={FLY_MODE.MOVE_SPEED_STEP}
            value={moveSpeed}
          />
          <div className="mt-3 p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-700/30">
            <div className="flex items-center gap-2 mb-2">
              <Keyboard className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[10px] text-zinc-400 font-medium">快捷键</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-zinc-500">前进/后退</span>
                <span className="text-zinc-300 font-mono">W / S</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">左移/右移</span>
                <span className="text-zinc-300 font-mono">A / D</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">上升/下降</span>
                <span className="text-zinc-300 font-mono">E / Q</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">加速</span>
                <span className="text-zinc-300 font-mono">Shift</span>
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-zinc-500">
            <ZoomIn className="w-3 h-3" />
            <span>按住 Shift 可 {FLY_MODE.BOOST_MULTIPLIER}x 加速移动</span>
          </div>
        </>
      ) : null}
    </CollapsibleSection>
  );
});

FlyModeSection.displayName = 'FlyModeSection';

export { FlyModeSection };
