'use client';

import React from 'react';
import { Card, Select, Slider, Space, Typography, Button, Switch, Divider } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, UndoOutlined } from '@ant-design/icons';
import { MOTION_PRESETS, type MotionTemplate, type MotionParams } from '../../lib/motionTemplates';

const { Text } = Typography;

interface MotionPanelProps {
  // 当前选中的模板
  template?: string;
  onTemplateChange?: (template: string) => void;
  
  // 参数调整
  params?: Partial<MotionParams>;
  onParamsChange?: (params: Partial<MotionParams>) => void;
  
  // 播放控制
  isPlaying?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onReset?: () => void;
}

/**
 * 运镜控制面板
 */
export default function MotionPanel({
  template = 'orbitShowcase',
  onTemplateChange,
  params,
  onParamsChange,
  isPlaying = false,
  onPlay,
  onPause,
  onReset
}: MotionPanelProps) {
  const currentTemplate = MOTION_PRESETS[template];
  const currentParams = { ...currentTemplate?.params, ...params };
  
  const updateParam = (key: keyof MotionParams, value: number | boolean | string) => {
    onParamsChange?.({ ...currentParams, [key]: value });
  };
  
  return (
    <Card size="small" title="自动运镜" style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* 模板选择 */}
        <div>
          <Text type="secondary">运镜模板</Text>
          <Select
            value={template}
            onChange={onTemplateChange}
            style={{ width: '100%', marginTop: 4 }}
            options={Object.entries(MOTION_PRESETS).map(([key, tmpl]) => ({
              value: key,
              label: tmpl.name
            }))}
          />
          {currentTemplate && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {currentTemplate.description}
            </Text>
          )}
        </div>
        
        <Divider style={{ margin: '8px 0' }} />
        
        {/* 通用参数 */}
        <div>
          <Text type="secondary">时长 (秒)</Text>
          <Slider
            min={1}
            max={30}
            step={0.5}
            value={currentParams.duration}
            onChange={(v) => updateParam('duration', v)}
          />
        </div>
        
        <div>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Text type="secondary">循环</Text>
            <Switch
              size="small"
              checked={currentParams.loop}
              onChange={(v) => updateParam('loop', v)}
            />
          </Space>
        </div>
        
        <div>
          <Text type="secondary">缓动</Text>
          <Select
            value={currentParams.easing}
            onChange={(v) => updateParam('easing', v)}
            style={{ width: '100%', marginTop: 4 }}
            options={[
              { value: 'linear', label: '线性' },
              { value: 'easeIn', label: '缓入' },
              { value: 'easeOut', label: '缓出' },
              { value: 'easeInOut', label: '缓入缓出' }
            ]}
          />
        </div>
        
        <Divider style={{ margin: '8px 0' }} />
        
        {/* 特定模板参数 */}
        {currentTemplate?.type === 'orbit' && (
          <>
            <div>
              <Text type="secondary">环绕半径</Text>
              <Slider
                min={1}
                max={20}
                step={0.5}
                value={currentParams.orbitRadius}
                onChange={(v) => updateParam('orbitRadius', v)}
              />
            </div>
            <div>
              <Text type="secondary">相机高度</Text>
              <Slider
                min={-5}
                max={10}
                step={0.5}
                value={currentParams.orbitHeight}
                onChange={(v) => updateParam('orbitHeight', v)}
              />
            </div>
          </>
        )}
        
        {currentTemplate?.type === 'dolly' && (
          <>
            <div>
              <Text type="secondary">起始距离</Text>
              <Slider
                min={1}
                max={20}
                step={0.5}
                value={currentParams.dollyStart}
                onChange={(v) => updateParam('dollyStart', v)}
              />
            </div>
            <div>
              <Text type="secondary">结束距离</Text>
              <Slider
                min={1}
                max={20}
                step={0.5}
                value={currentParams.dollyEnd}
                onChange={(v) => updateParam('dollyEnd', v)}
              />
            </div>
          </>
        )}
        
        {currentTemplate?.type === 'parallax' && (
          <>
            <div>
              <Text type="secondary">幅度</Text>
              <Slider
                min={0.1}
                max={2}
                step={0.1}
                value={currentParams.parallaxAmplitude}
                onChange={(v) => updateParam('parallaxAmplitude', v)}
              />
            </div>
          </>
        )}
        
        <Divider style={{ margin: '8px 0' }} />
        
        {/* 播放控制 */}
        <Space style={{ width: '100%', justifyContent: 'center' }}>
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={isPlaying ? onPause : onPlay}
          />
          <Button
            shape="circle"
            icon={<UndoOutlined />}
            onClick={onReset}
          />
        </Space>
      </Space>
    </Card>
  );
}
