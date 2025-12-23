'use client';

import React from 'react';
import { Select, Slider, Card, Space, Typography, Button, Divider } from 'antd';
import { 
  BorderOutlined, 
  PictureOutlined, 
  EyeOutlined,
  DownloadOutlined,
  VideoCameraOutlined
} from '@ant-design/icons';

const { Text } = Typography;

export type ProjectionMode = 
  | 'perspective' 
  | 'orthographic' 
  | 'stereo-sbs' 
  | 'stereo-tb' 
  | 'stereo-anaglyph'
  | 'quilt'
  | 'peppers-ghost';

interface ProjectionModeSelectorProps {
  value?: ProjectionMode;
  onChange?: (mode: ProjectionMode) => void;
  // 立体模式参数
  eyeSeparation?: number;
  onEyeSeparationChange?: (value: number) => void;
  // Quilt 参数
  quiltViews?: number;
  onQuiltViewsChange?: (value: number) => void;
  // 导出回调
  onExportStereo?: (type: 'sbs' | 'tb' | 'anaglyph') => void;
  onExportQuilt?: () => void;
  onExportPeppersGhost?: () => void;
  onExportPeppersGhostVideo?: () => void;
}

const MODE_OPTIONS = [
  { 
    value: 'perspective', 
    label: '透视投影', 
    icon: <EyeOutlined />,
    description: '标准 3D 透视视图' 
  },
  { 
    value: 'orthographic', 
    label: '正交投影', 
    icon: <BorderOutlined />,
    description: '无透视的平行投影' 
  },
  { 
    value: 'stereo-sbs', 
    label: '立体 SBS', 
    icon: <PictureOutlined />,
    description: '左右立体 (Side-by-Side)' 
  },
  { 
    value: 'stereo-tb', 
    label: '立体 TB', 
    icon: <PictureOutlined />,
    description: '上下立体 (Top-Bottom)' 
  },
  { 
    value: 'stereo-anaglyph', 
    label: '红蓝立体', 
    icon: <PictureOutlined />,
    description: '红蓝眼镜立体' 
  },
  { 
    value: 'quilt', 
    label: 'Quilt 多视图', 
    icon: <PictureOutlined />,
    description: '裸眼 3D 光场输出' 
  },
  { 
    value: 'peppers-ghost', 
    label: 'Pepper\'s Ghost', 
    icon: <PictureOutlined />,
    description: '全息金字塔四视图' 
  }
];

/**
 * 投影模式选择器
 * 用于切换不同的 3D 投影和输出模式
 */
export default function ProjectionModeSelector({
  value = 'perspective',
  onChange,
  eyeSeparation = 0.064,
  onEyeSeparationChange,
  quiltViews = 32,
  onQuiltViewsChange,
  onExportStereo,
  onExportQuilt,
  onExportPeppersGhost,
  onExportPeppersGhostVideo
}: ProjectionModeSelectorProps) {
  
  const isStereoMode = value.startsWith('stereo-');
  const isQuiltMode = value === 'quilt';
  const isPeppersGhost = value === 'peppers-ghost';
  
  return (
    <Card size="small" title="投影模式" style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Select
          value={value}
          onChange={onChange}
          style={{ width: '100%' }}
          options={MODE_OPTIONS.map(opt => ({
            value: opt.value,
            label: (
              <Space>
                {opt.icon}
                <span>{opt.label}</span>
              </Space>
            )
          }))}
        />
        
        <Text type="secondary" style={{ fontSize: 12 }}>
          {MODE_OPTIONS.find(m => m.value === value)?.description}
        </Text>
        
        {/* 立体模式参数 */}
        {isStereoMode && (
          <>
            <Divider style={{ margin: '8px 0' }} />
            <div>
              <Text>眼距 (mm)</Text>
              <Slider
                min={30}
                max={100}
                step={1}
                value={eyeSeparation * 1000}
                onChange={(v) => onEyeSeparationChange?.(v / 1000)}
              />
            </div>
            <Button 
              icon={<DownloadOutlined />}
              onClick={() => {
                const type = value.replace('stereo-', '') as 'sbs' | 'tb' | 'anaglyph';
                onExportStereo?.(type);
              }}
              block
            >
              导出立体图像
            </Button>
          </>
        )}
        
        {/* Quilt 模式参数 */}
        {isQuiltMode && (
          <>
            <Divider style={{ margin: '8px 0' }} />
            <div>
              <Text>视点数量</Text>
              <Select
                value={quiltViews}
                onChange={onQuiltViewsChange}
                style={{ width: '100%', marginTop: 4 }}
                options={[
                  { value: 16, label: '16 视点 (4x4)' },
                  { value: 32, label: '32 视点 (8x4)' },
                  { value: 45, label: '45 视点 (9x5)' },
                  { value: 48, label: '48 视点 (8x6)' },
                  { value: 100, label: '100 视点 (10x10)' }
                ]}
              />
            </div>
            <Button 
              icon={<DownloadOutlined />}
              onClick={onExportQuilt}
              block
              style={{ marginTop: 8 }}
            >
              导出 Quilt
            </Button>
          </>
        )}
        
        {/* Pepper's Ghost 导出 */}
        {isPeppersGhost && (
          <>
            <Divider style={{ margin: '8px 0' }} />
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                icon={<DownloadOutlined />}
                onClick={onExportPeppersGhost}
                block
              >
                导出静态图像
              </Button>
              <Button 
                icon={<VideoCameraOutlined />}
                onClick={onExportPeppersGhostVideo}
                block
              >
                导出视频
              </Button>
            </Space>
          </>
        )}
      </Space>
    </Card>
  );
}
