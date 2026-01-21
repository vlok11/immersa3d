import {
  Circle,
  Download,
  Image as ImageIcon,
  Info,
  Layers,
  Loader2,
  Maximize2,
  RotateCcw,
  Sliders,
  Square,
  Sun,
} from 'lucide-react';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { useSceneStore } from '@/stores/sharedStore';
import { useSessionStore } from '@/stores/useSessionStore';

import { CameraTab } from './CameraTab';
import { Btn, CardBtn, CollapsibleSection, Slider, Toggle, VideoControls } from './components';
import {
  DEPTH_PRESETS,
  MIRROR_MODES,
  MOTIONS,
  PROJECTIONS,
  RENDER_STYLES,
  TABS,
  type TabType,
} from './constants';
import { EffectsTab } from './EffectsTab';

import type { CameraViewPreset, SceneConfig } from '@/shared/types';

interface ControlPanelNewProps {
  activeCameraView?: CameraViewPreset | null;
  hasVideo: boolean;
  isRecording?: boolean;
  onDownloadSnapshot?: () => void;
  onExportScene?: () => void;
  onSetCameraView?: (view: CameraViewPreset) => void;
  onToggleRecording?: () => void;
  onVideoSeek?: (time: number) => void;
  onVideoTogglePlay?: () => void;
  videoState?: { currentTime: number; duration: number; isPlaying: boolean; };
}
interface HeaderProps {
  isExporting: boolean;
  isRecording?: boolean;
  onDownloadSnapshot?: () => void;
  onExportScene?: () => void;
  onReset: () => void;
  onToggleRecording?: () => void;
}
interface SceneTabProps {
  activeProjection: (typeof PROJECTIONS)[number] | undefined;
  config: SceneConfig;
  expandedSections: Record<string, boolean>;
  hoveredItem: string | null;
  set: <K extends keyof SceneConfig>(k: K, v: SceneConfig[K]) => void;
  setHoveredItem: (item: string | null) => void;
  toggleSection: (key: string) => void;
}
interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const ControlPanelNew: React.FC<ControlPanelNewProps> = memo(
  ({
    hasVideo,
    videoState,
    onVideoTogglePlay,
    onVideoSeek,
    onSetCameraView,
    activeCameraView,
    onExportScene,
    onDownloadSnapshot,
    onToggleRecording,
    isRecording,
  }) => {
    const [activeTab, setActiveTab] = useState<TabType>('scene');
    const [sliderValue, setSliderValue] = useState(0);
    const [dragging, setDragging] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
      projection: true,
      depth: true,
      camera: true,
      motion: true,
      style: true,
      color: true,
      lighting: true,
    });
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);

    const config = useSceneStore((s) => s.config);
    const setConfig = useSceneStore((s) => s.setConfig);
    const resetConfig = useSceneStore((s) => s.resetConfig);
    const { exportState } = useSessionStore();

    useEffect(() => {
      if (!dragging && videoState) setSliderValue(videoState.currentTime);
    }, [videoState, dragging]);

    const set = useCallback(
      <K extends keyof SceneConfig>(k: K, v: SceneConfig[K]) => {
        setConfig((p) => ({ ...p, [k]: v }));
      },
      [setConfig]
    );

    const toggleSection = useCallback((key: string) => {
      setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const activeProjection = useMemo(
      () => PROJECTIONS.find((p) => p.mode === config.projectionMode),
      [config.projectionMode]
    );
    const activeStyle = useMemo(
      () => RENDER_STYLES.find((r) => r.style === config.renderStyle),
      [config.renderStyle]
    );
    const activeMotion = useMemo(
      () => MOTIONS.find((m) => m.type === config.cameraMotionType),
      [config.cameraMotionType]
    );
    const { isExporting } = exportState;

    return (
      <div className="w-80 bg-zinc-900/98 backdrop-blur-md flex flex-col h-full border-l border-zinc-800/80 shadow-2xl relative">
        {isExporting ? (
          <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 p-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
              <div className="text-sm font-medium text-white">
                {exportState.format ? `导出 ${exportState.format.toUpperCase()}...` : '导出中...'}
              </div>
              <div className="w-32 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${exportState.progress}%` }}
                />
              </div>
            </div>
          </div>
        ) : null}

        <Header
          isExporting={isExporting}
          isRecording={isRecording}
          onDownloadSnapshot={onDownloadSnapshot}
          onExportScene={onExportScene}
          onReset={resetConfig}
          onToggleRecording={onToggleRecording}
        />

        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {hasVideo && videoState ? (
          <VideoControls
            onDragEnd={() => setDragging(false)}
            onDragStart={() => setDragging(true)}
            onSeek={onVideoSeek}
            onSliderChange={setSliderValue}
            onToggleMute={() => set('videoMuted', !config.videoMuted)}
            onTogglePlay={onVideoTogglePlay}
            sliderValue={sliderValue}
            videoMuted={config.videoMuted}
            videoState={videoState}
          />
        ) : null}

        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          <div className="p-3 space-y-1">
            {activeTab === 'scene' && (
              <SceneTab
                activeProjection={activeProjection}
                config={config}
                expandedSections={expandedSections}
                hoveredItem={hoveredItem}
                set={set}
                setHoveredItem={setHoveredItem}
                toggleSection={toggleSection}
              />
            )}

            {activeTab === 'camera' && (
              <CameraTab
                activeCameraView={activeCameraView}
                activeMotion={activeMotion}
                config={config}
                expandedSections={expandedSections}
                onSetCameraView={onSetCameraView}
                set={set}
                toggleSection={toggleSection}
              />
            )}

            {activeTab === 'effects' && (
              <EffectsTab
                activeStyle={activeStyle}
                config={config}
                expandedSections={expandedSections}
                set={set}
                toggleSection={toggleSection}
              />
            )}
          </div>
        </div>
      </div>
    );
  }
);
const Header: React.FC<HeaderProps> = memo(
  ({ isExporting, isRecording, onToggleRecording, onDownloadSnapshot, onExportScene, onReset }) => (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60 bg-zinc-900/50">
      <span className="text-xs font-medium text-zinc-300 tracking-wide">控制面板</span>
      <div className="flex items-center gap-1">
        <button
          className={`p-1.5 rounded-md transition-all disabled:opacity-50 ${isRecording ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
          disabled={isExporting}
          onClick={onToggleRecording}
          title={isRecording ? '停止录制' : '开始录制(WebM)'}
        >
          {isRecording ? (
            <Square className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Circle className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-50"
          disabled={isExporting}
          onClick={onDownloadSnapshot}
          title="保存截图"
        >
          <ImageIcon className="w-3.5 h-3.5" />
        </button>
        <button
          className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-50"
          disabled={isExporting}
          onClick={onExportScene}
          title="导出场景 (GLB)"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-3 bg-zinc-800 mx-1" />
        <button
          className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-50"
          disabled={isExporting}
          onClick={onReset}
          title="重置设置"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
);
const SceneTab: React.FC<SceneTabProps> = memo(
  ({
    config,
    set,
    expandedSections,
    toggleSection,
    hoveredItem,
    setHoveredItem,
    activeProjection,
  }) => (
    <>
      <div className="mb-3 p-3 rounded-xl bg-gradient-to-br from-zinc-800/80 to-zinc-800/40 border border-zinc-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-lg">
            {activeProjection?.icon}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-white">{activeProjection?.label}投影</div>
            <div className="text-[10px] text-zinc-500">{activeProjection?.desc}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-400">深度</div>
            <div className="text-sm font-mono text-indigo-400">
              {config.displacementScale.toFixed(1)}x
            </div>
          </div>
        </div>
      </div>

      <CollapsibleSection
        expanded={expandedSections.projection}
        icon={<Layers className="w-3.5 h-3.5" />}
        onToggle={() => toggleSection('projection')}
        title="投影模式"
      >
        <div className="grid grid-cols-3 gap-1.5">
          {PROJECTIONS.map((p) => (
            <CardBtn
              active={config.projectionMode === p.mode}
              key={p.mode}
              onClick={() => set('projectionMode', p.mode)}
              onMouseEnter={() => setHoveredItem(p.mode)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span className="text-base mb-0.5">{p.icon}</span>
              <span>{p.label}</span>
            </CardBtn>
          ))}
        </div>
        {hoveredItem && PROJECTIONS.find((p) => p.mode === hoveredItem) ? (
          <div className="mt-2 px-2 py-1.5 rounded-lg bg-zinc-800/50 text-[10px] text-zinc-400 flex items-center gap-1.5">
            <Info className="w-3 h-3" />
            {PROJECTIONS.find((p) => p.mode === hoveredItem)?.desc}
          </div>
        ) : null}
      </CollapsibleSection>

      <CollapsibleSection
        expanded={expandedSections.depth}
        icon={<Sliders className="w-3.5 h-3.5" />}
        onToggle={() => toggleSection('depth')}
        title="深度控制"
      >
        <Slider
          label="深度强度"
          max={8}
          min={0}
          onChange={(v) => set('displacementScale', v)}
          presets={DEPTH_PRESETS as unknown as number[]}
          showPresets
          step={0.1}
          value={config.displacementScale}
        />
        <Slider
          label="网格密度"
          max={512}
          min={64}
          onChange={(v) => set('meshDensity', v)}
          step={32}
          value={config.meshDensity}
        />
        <Toggle
          checked={config.depthInvert}
          label="深度反转"
          onChange={(v) => set('depthInvert', v)}
        />
        <Slider
          label="边缘淡化"
          max={1}
          min={0}
          onChange={(v) => set('edgeFade', v)}
          step={0.05}
          value={config.edgeFade}
        />
      </CollapsibleSection>

      <CollapsibleSection icon={<Maximize2 className="w-3.5 h-3.5" />} title="镜像模式">
        <div className="grid grid-cols-4 gap-1.5">
          {MIRROR_MODES.map((m) => (
            <Btn
              active={config.mirrorMode === m.mode}
              key={m.mode}
              onClick={() => set('mirrorMode', m.mode)}
            >
              {m.label}
            </Btn>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection icon={<Sun className="w-3.5 h-3.5" />} title="环境设置">
        <Slider
          label="背景强度"
          max={1}
          min={0}
          onChange={(v) => set('backgroundIntensity', v)}
          step={0.05}
          value={config.backgroundIntensity}
        />
        <Slider
          label="视差强度"
          max={1}
          min={0}
          onChange={(v) => set('parallaxScale', v)}
          step={0.05}
          value={config.parallaxScale}
        />
        <div className="flex gap-2 mt-2">
          <Toggle
            checked={config.showGrid}
            compact
            label="显示网格"
            onChange={(v) => set('showGrid', v)}
          />
          <Toggle
            checked={config.showAxes}
            compact
            label="显示坐标轴"
            onChange={(v) => set('showAxes', v)}
          />
        </div>
      </CollapsibleSection>
    </>
  )
);
const TabBar: React.FC<TabBarProps> = memo(({ activeTab, onTabChange }) => (
  <div className="flex border-b border-zinc-800/60 bg-zinc-900/30">
    {TABS.map((t) => (
      <button
        className={`flex-1 py-3 flex flex-col items-center gap-1.5 text-xs transition-all relative ${
          activeTab === t.key
            ? 'text-white'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
        }`}
        key={t.key}
        onClick={() => onTabChange(t.key)}
      >
        <div
          className={`p-1.5 rounded-lg transition-colors ${activeTab === t.key ? 'bg-indigo-600/20' : ''}`}
        >
          {t.icon}
        </div>
        <span className="font-medium">{t.label}</span>
        {activeTab === t.key ? (
          <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
        ) : null}
      </button>
    ))}
  </div>
));

export default ControlPanelNew;

ControlPanelNew.displayName = 'ControlPanelNew';
Header.displayName = 'Header';
TabBar.displayName = 'TabBar';
SceneTab.displayName = 'SceneTab';
