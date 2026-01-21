import React, { memo } from 'react';

/**
 * 骨架屏组件 - 用于加载状态的占位显示
 */

interface SkeletonProps {
  className?: string;
  height?: number | string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  width?: number | string;
}

const roundedClasses = {
  none: '',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
} as const;

// 基础骨架元素
export const Skeleton: React.FC<SkeletonProps> = memo(
  ({ width, height = 16, rounded = 'md', className = '' }) => (
    <div
      className={`
        animate-pulse bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800
        bg-[length:200%_100%] animate-shimmer
        ${roundedClasses[rounded]}
        ${className}
      `}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  )
);
Skeleton.displayName = 'Skeleton';

// 卡片骨架
export const CardSkeleton: React.FC<{ count?: number }> = memo(({ count = 1 }) => (
  <div className="grid grid-cols-3 gap-2">
    {Array.from({ length: count }, (_, i) => `card-skeleton-${i}`).map((id) => (
      <div
        className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/30 flex flex-col items-center gap-2"
        key={id}
      >
        <Skeleton height={24} rounded="full" width={24} />
        <Skeleton height={12} width="60%" />
      </div>
    ))}
  </div>
));
CardSkeleton.displayName = 'CardSkeleton';

// 滑块骨架
export const SliderSkeleton: React.FC = memo(() => (
  <div className="space-y-2">
    <div className="flex justify-between">
      <Skeleton height={12} width={60} />
      <Skeleton height={16} rounded="md" width={40} />
    </div>
    <Skeleton height={8} rounded="full" width="100%" />
  </div>
));
SliderSkeleton.displayName = 'SliderSkeleton';

// 开关骨架
export const ToggleSkeleton: React.FC = memo(() => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-2">
      <Skeleton height={16} rounded="full" width={16} />
      <Skeleton height={12} width={80} />
    </div>
    <Skeleton height={20} rounded="full" width={40} />
  </div>
));
ToggleSkeleton.displayName = 'ToggleSkeleton';

// 折叠区块骨架
export const SectionSkeleton: React.FC<{ sliderCount?: number }> = memo(
  ({ sliderCount = 2 }) => (
    <div className="rounded-xl bg-zinc-800/30 border border-zinc-800/50 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton height={14} rounded="sm" width={14} />
        <Skeleton height={14} width={100} />
      </div>
      {Array.from({ length: sliderCount }, (_, i) => `slider-skeleton-${i}`).map((id) => (
        <SliderSkeleton key={id} />
      ))}
    </div>
  )
);
SectionSkeleton.displayName = 'SectionSkeleton';

// 控制面板完整骨架
export const ControlPanelSkeleton: React.FC = memo(() => (
  <div className="space-y-3 p-3">
    {/* 顶部状态卡片 */}
    <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
      <div className="flex items-center gap-3">
        <Skeleton height={40} rounded="lg" width={40} />
        <div className="flex-1 space-y-1.5">
          <Skeleton height={14} width="70%" />
          <Skeleton height={10} width="50%" />
        </div>
      </div>
    </div>

    {/* 渲染风格卡片网格 */}
    <SectionSkeleton sliderCount={0} />
    <CardSkeleton count={6} />

    {/* 滑块区块 */}
    <SectionSkeleton sliderCount={3} />
    <SectionSkeleton sliderCount={2} />
  </div>
));
ControlPanelSkeleton.displayName = 'ControlPanelSkeleton';

// 视频控制器骨架
export const VideoControlsSkeleton: React.FC = memo(() => (
  <div className="px-4 py-3 border-b border-zinc-800/60 bg-zinc-900/40">
    <div className="flex items-center gap-4">
      <Skeleton height={44} rounded="full" width={44} />
      <div className="flex-1 space-y-2">
        <Skeleton height={8} rounded="full" width="100%" />
        <div className="flex justify-between">
          <Skeleton height={10} width={40} />
          <Skeleton height={10} width={40} />
        </div>
      </div>
      <Skeleton height={40} rounded="lg" width={40} />
    </div>
  </div>
));
VideoControlsSkeleton.displayName = 'VideoControlsSkeleton';

// 场景加载骨架
export const SceneLoadingSkeleton: React.FC = memo(() => (
  <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
    <div className="text-center space-y-4">
      {/* 加载动画 */}
      <div className="relative w-20 h-20 mx-auto">
        <div className="absolute inset-0 rounded-full border-4 border-zinc-800" />
        <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        <div className="absolute inset-2 rounded-full border-4 border-t-transparent border-r-indigo-500 border-b-transparent border-l-transparent animate-spin animation-delay-150" />
      </div>
      
      {/* 加载文字 */}
      <div className="space-y-2">
        <div className="text-sm text-zinc-400 font-medium">正在加载场景...</div>
        <div className="flex justify-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  </div>
));
SceneLoadingSkeleton.displayName = 'SceneLoadingSkeleton';

// 上传区域骨架
export const UploadAreaSkeleton: React.FC = memo(() => (
  <div className="w-full h-64 rounded-2xl border-2 border-dashed border-zinc-700/50 bg-zinc-900/30 flex items-center justify-center">
    <div className="text-center space-y-4">
      <Skeleton className="mx-auto" height={48} rounded="lg" width={48} />
      <div className="space-y-2">
        <Skeleton className="mx-auto" height={14} width={120} />
        <Skeleton className="mx-auto" height={12} width={180} />
      </div>
    </div>
  </div>
));
UploadAreaSkeleton.displayName = 'UploadAreaSkeleton';
