'use client';

import React from 'react';
import { Card, Select, Slider, Space, Typography, Button, Divider, Switch } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { LKG_PRESETS, type LKGConfig } from '../../lib/lkgConfig';

const { Text } = Typography;

interface QuiltSettingsProps {
  // 预设选择
  preset?: string;
  onPresetChange?: (preset: string) => void;
  
  // 自定义配置
  config?: LKGConfig;
  onConfigChange?: (config: LKGConfig) => void;
  
  // 导出
  onExport?: () => void;
  onExportVideo?: () => void;
}

/**
 * Quilt 设置面板
 * 配置裸眼 3D 多视图渲染参数
 */
export default function QuiltSettings({
  preset = 'generic',
  onPresetChange,
  config,
  onConfigChange,
  onExport,
  onExportVideo
}: QuiltSettingsProps) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  
  // 当前使用的配置
  const currentConfig = config || LKG_PRESETS[preset] || LKG_PRESETS.generic;
  
  // 更新配置
  const updateConfig = (key: keyof LKGConfig, value: number | string) => {
    if (onConfigChange) {
      onConfigChange({
        ...currentConfig,
        [key]: value
      });
    }
  };
  
  return (
    <Card size="small" title="Quilt 设置" style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* 预设选择 */}
        <div>
          <Text type="secondary">屏幕预设</Text>
          <Select
            value={preset}
            onChange={onPresetChange}
            style={{ width: '100%', marginTop: 4 }}
            options={Object.entries(LKG_PRESETS).map(([key, cfg]) => ({
              value: key,
              label: cfg.name
            }))}
          />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {currentConfig.description}
          </Text>
        </div>
        
        <Divider style={{ margin: '8px 0' }} />
        
        {/* 基础参数 */}
        <div>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Text type="secondary">视点数量</Text>
            <Text strong>{currentConfig.numViews}</Text>
          </Space>
        </div>
        
        <div>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Text type="secondary">布局</Text>
            <Text strong>{currentConfig.quiltCols}x{currentConfig.quiltRows}</Text>
          </Space>
        </div>
        
        <div>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Text type="secondary">视锥角度</Text>
            <Text strong>{currentConfig.viewCone}°</Text>
          </Space>
        </div>
        
        <Divider style={{ margin: '8px 0' }} />
        
        {/* 高级设置开关 */}
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text type="secondary">高级设置</Text>
          <Switch size="small" checked={showAdvanced} onChange={setShowAdvanced} />
        </Space>
        
        {showAdvanced && (
          <div style={{ marginTop: 8, paddingLeft: 8, borderLeft: '2px solid #f0f0f0' }}>
            <div style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 12 }}>像素密度 (Pitch)</Text>
              <Slider
                min={100}
                max={500}
                value={currentConfig.pitch}
                onChange={(v) => updateConfig('pitch', v)}
              />
            </div>
            
            <div style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 12 }}>倾斜角度 (Tilt)</Text>
              <Slider
                min={-0.3}
                max={0.3}
                step={0.01}
                value={currentConfig.tilt}
                onChange={(v) => updateConfig('tilt', v)}
              />
            </div>
            
            <div style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 12 }}>中心偏移 (Center)</Text>
              <Slider
                min={-0.1}
                max={0.1}
                step={0.01}
                value={currentConfig.center}
                onChange={(v) => updateConfig('center', v)}
              />
            </div>
            
            <div>
              <Text style={{ fontSize: 12 }}>视锥角度</Text>
              <Slider
                min={20}
                max={90}
                value={currentConfig.viewCone}
                onChange={(v) => updateConfig('viewCone', v)}
              />
            </div>
          </div>
        )}
        
        <Divider style={{ margin: '8px 0' }} />
        
        {/* 导出按钮 */}
        <Button 
          icon={<DownloadOutlined />}
          onClick={onExport}
          block
        >
          导出 Quilt 图像
        </Button>
        
        <Button 
          onClick={onExportVideo}
          block
        >
          导出 Quilt 视频
        </Button>
      </Space>
    </Card>
  );
}
