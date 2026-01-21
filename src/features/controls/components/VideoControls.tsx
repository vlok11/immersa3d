import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import React, { memo, useState } from 'react';

import { formatTime } from '../constants';

// 进度条计算常量
const PERCENT = 100;
const BUFFER_OFFSET = 15;

// =============================================
// 类型定义
// =============================================

interface VideoControlsProps {
  onDragEnd: () => void;
  onDragStart: () => void;
  onSeek?: (time: number) => void;
  onSliderChange: (value: number) => void;
  onToggleMute: () => void;
  onTogglePlay?: () => void;
  sliderValue: number;
  videoMuted: boolean;
  videoState: { currentTime: number; duration: number; isPlaying: boolean };
}

// =============================================
// 播放按钮子组件
// =============================================

interface PlayButtonProps {
  isPlaying: boolean;
  onClick?: () => void;
}

const PlayButton = memo<PlayButtonProps>(({ isPlaying, onClick }) => (
  <button
    className="
      relative w-11 h-11 rounded-full flex items-center justify-center
      bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500
      shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:shadow-xl
      transform hover:scale-105 active:scale-95
      transition-all duration-200 ease-out
      group
    "
    onClick={onClick}
    title={isPlaying ? '暂停' : '播放'}
  >
    {/* 外发光效果 */}
    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 opacity-0 group-hover:opacity-40 blur-lg transition-opacity duration-300" />
    {/* 内部光晕 */}
    <div className="absolute inset-0.5 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
    {isPlaying ? (
      <Pause className="w-5 h-5 text-white relative z-10 drop-shadow-sm" />
    ) : (
      <Play className="w-5 h-5 text-white ml-0.5 relative z-10 drop-shadow-sm" />
    )}
    {/* 播放时的脉冲动画 */}
    {isPlaying ? (
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 animate-ping opacity-20" />
    ) : null}
  </button>
));

PlayButton.displayName = 'PlayButton';

// =============================================
// 音量按钮子组件
// =============================================

interface VolumeButtonProps {
  isMuted: boolean;
  onClick: () => void;
}

const VolumeButton = memo<VolumeButtonProps>(({ isMuted, onClick }) => (
  <button
    className={`
      relative p-2.5 rounded-xl transition-all duration-200 group/vol
      ${isMuted
        ? 'text-zinc-500 bg-zinc-800/70 hover:bg-zinc-700/80 hover:text-zinc-300'
        : 'text-indigo-400 bg-indigo-500/15 hover:bg-indigo-500/25'
      }
    `}
    onClick={onClick}
    title={isMuted ? '取消静音' : '静音'}
  >
    {isMuted ? (
      <VolumeX className="w-5 h-5" />
    ) : (
      <>
        <Volume2 className="w-5 h-5" />
        {/* 声音波纹动画 */}
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-400/50 animate-ping" />
        </div>
      </>
    )}
  </button>
));

VolumeButton.displayName = 'VolumeButton';

// =============================================
// 时间悬浮提示子组件
// =============================================

interface TimeTooltipProps {
  duration: number;
  hoverTime: number;
  isVisible: boolean;
}

const TimeTooltip = memo<TimeTooltipProps>(({ hoverTime, duration, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div
      className="
        absolute -top-9 transform -translate-x-1/2 
        px-2.5 py-1.5 rounded-lg 
        bg-zinc-900/95 backdrop-blur-sm
        text-[11px] text-white font-mono font-medium
        shadow-xl border border-zinc-700/60 
        pointer-events-none z-20
        animate-in fade-in duration-150
      "
      style={{ left: `${(hoverTime / (duration || 1)) * PERCENT}%` }}
    >
      {formatTime(hoverTime)}
      {/* 小三角 */}
      <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-3 h-3 rotate-45 bg-zinc-900/95 border-r border-b border-zinc-700/60" />
    </div>
  );
});

TimeTooltip.displayName = 'TimeTooltip';

// =============================================
// 进度条轨道子组件
// =============================================

interface ProgressTrackProps {
  bufferPercent: number;
  isHovering: boolean;
  progressPercent: number;
}

const ProgressTrack = memo<ProgressTrackProps>(({ progressPercent, bufferPercent, isHovering }) => (
  <>
    {/* 背景轨道 */}
    <div className="absolute left-0 right-0 h-1.5 bg-zinc-800/80 rounded-full overflow-hidden group-hover/slider:h-2.5 transition-all duration-200 ease-out">
      {/* 缓冲进度 */}
      <div
        className="absolute left-0 top-0 h-full bg-zinc-700/40 rounded-full transition-all duration-300"
        style={{ width: `${bufferPercent}%` }}
      />
      {/* 播放进度条 */}
      <div
        className="
          absolute left-0 top-0 h-full rounded-full 
          bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500
          transition-all duration-75 ease-out
        "
        style={{ width: `${progressPercent}%` }}
      >
        {/* 进度条末端高光 */}
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-r from-transparent to-white/30" />
      </div>
    </div>

    {/* 拖动手柄 */}
    <div
      className={`
        absolute top-1/2 -translate-y-1/2 -translate-x-1/2
        w-5 h-5 rounded-full
        bg-white shadow-lg shadow-black/40
        border-2 border-indigo-400
        transform transition-all duration-150 ease-out
        ${isHovering ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}
        group-hover/slider:scale-100 group-hover/slider:opacity-100
      `}
      style={{ left: `${progressPercent}%` }}
    >
      {/* 手柄内部渐变 */}
      <div className="absolute inset-0.5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500" />
      {/* 手柄中心点 */}
      <div className="absolute inset-1.5 rounded-full bg-white/80" />
    </div>
  </>
));

ProgressTrack.displayName = 'ProgressTrack';

// =============================================
// 时间显示子组件
// =============================================

interface TimeDisplayProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}

const TimeDisplay = memo<TimeDisplayProps>(({ currentTime, duration, isPlaying }) => (
  <div className="flex justify-between items-center -mt-1">
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-mono text-zinc-300 tabular-nums font-medium">
        {formatTime(currentTime)}
      </span>
      {/* 播放状态指示器 */}
      {isPlaying ? (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-sm shadow-green-500/50" />
          <span className="text-[9px] text-green-400 font-medium tracking-wide">播放中</span>
        </div>
      ) : null}
    </div>
    <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
      {formatTime(duration)}
    </span>
  </div>
));

TimeDisplay.displayName = 'TimeDisplay';

// =============================================
// 主组件
// =============================================

export const VideoControls: React.FC<VideoControlsProps> = memo(
  ({
    videoState,
    sliderValue,
    videoMuted,
    onTogglePlay,
    onSeek,
    onSliderChange,
    onDragStart,
    onDragEnd,
    onToggleMute,
  }) => {
    const [isHovering, setIsHovering] = useState(false);
    const [hoverTime, setHoverTime] = useState(0);
    const progressPercent = (sliderValue / (videoState.duration || 1)) * PERCENT;
    const bufferPercent = Math.min(progressPercent + BUFFER_OFFSET, PERCENT);

    const handleTrackHover = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = x / rect.width;

      setHoverTime(percent * (videoState.duration || 0));
    };

    return (
      <div className="px-4 py-3 border-b border-zinc-800/60 bg-gradient-to-b from-zinc-900/80 to-zinc-900/40 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <PlayButton isPlaying={videoState.isPlaying} onClick={onTogglePlay} />

          {/* 进度条区域 */}
          <div
            className="flex-1 relative group/slider"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onMouseMove={handleTrackHover}
          >
            <TimeTooltip
              duration={videoState.duration}
              hoverTime={hoverTime}
              isVisible={isHovering}
            />

            {/* 进度轨道容器 */}
            <div className="relative h-10 flex items-center cursor-pointer">
              <ProgressTrack
                bufferPercent={bufferPercent}
                isHovering={isHovering}
                progressPercent={progressPercent}
              />

              {/* 隐藏的原生 input 用于交互 */}
              <input
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                max={videoState.duration || 1}
                min="0"
                onChange={(e) => onSliderChange(parseFloat(e.target.value))}
                onMouseDown={onDragStart}
                onMouseUp={(e) => {
                  onDragEnd();
                  onSeek?.(parseFloat((e.target as HTMLInputElement).value));
                }}
                onTouchEnd={(e) => {
                  onDragEnd();
                  onSeek?.(parseFloat((e.target as HTMLInputElement).value));
                }}
                onTouchStart={onDragStart}
                step="0.1"
                type="range"
                value={sliderValue}
              />
            </div>

            <TimeDisplay
              currentTime={sliderValue}
              duration={videoState.duration}
              isPlaying={videoState.isPlaying}
            />
          </div>

          <VolumeButton isMuted={videoMuted} onClick={onToggleMute} />
        </div>
      </div>
    );
  }
);

VideoControls.displayName = 'VideoControls';
