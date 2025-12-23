'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Layout, Input, Button, Typography, Space, Slider, message, Spin, Switch, Radio, Select, ColorPicker, Collapse, Divider } from 'antd';
import type { EditorSceneRef } from '../../components/editor/EditorScene';
import { ArrowLeftOutlined, CloudUploadOutlined, VideoCameraOutlined, StopOutlined, CameraOutlined, EnvironmentOutlined, ExperimentOutlined, SettingOutlined } from '@ant-design/icons';
import Link from 'next/link';
import ProjectionModeSelector, { type ProjectionMode } from '../../components/editor/ProjectionModeSelector';
import type { StereoRendererRef } from '../../components/editor/renderers/StereoRenderer';
import type { PeppersGhostExporterRef } from '../../components/editor/renderers/PeppersGhostExporter';

// 动态导入 EditorScene，禁用 SSR 避免 Three.js 相关的服务器端渲染错误
const EditorScene = dynamic(
    () => import('../../components/editor/EditorScene'),
    { 
        ssr: false,
        loading: () => <div style={{ width: '100%', height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}><Spin size="large" tip="加载 3D 场景..." /></div>
    }
);

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function EditorPage({ params }: { params: { id: string } }) {
    // 默认无资源，用户需上传或从项目配置加载
    const [imageUrl, setImageUrl] = React.useState<string | null>(null); 
    const [depthUrl, setDepthUrl] = React.useState<string | undefined>(undefined);
    const [displacementScale, setDisplacementScale] = React.useState<number>(1.0);
    const [currentAssetId, setCurrentAssetId] = React.useState<string | null>(null);
    const [cameraType, setCameraType] = React.useState<'perspective' | 'orthographic'>('perspective');
    const [animationMode, setAnimationMode] = React.useState<'none' | 'circular' | 'dolly-zoom'>('none');
    const [autoRotate, setAutoRotate] = React.useState(false);
    
    // Post-processing states
    const [bloomIntensity, setBloomIntensity] = React.useState(0.0);
    const [vignetteDarkness, setVignetteDarkness] = React.useState(0.0);

    // Atmosphere states
    const [envPreset, setEnvPreset] = React.useState<'city' | 'sunset' | 'dawn' | 'night' | 'warehouse'>('city');
    const [fogEnabled, setFogEnabled] = React.useState(false);
    const [fogColor, setFogColor] = React.useState('#1a1a1a');

    const [fogDensity, setFogDensity] = React.useState(0.5);

    // Material states
    const [roughness, setRoughness] = React.useState(0.5);
    const [metalness, setMetalness] = React.useState(0.5);
    const [wireframe, setWireframe] = React.useState(false);
    const [geometryMode, setGeometryMode] = React.useState<'mesh' | 'points' | 'plane' | 'layered'>('mesh');
    const [pointSize, setPointSize] = React.useState(2.0);
    const [resolution, setResolution] = React.useState<'low' | 'medium' | 'high' | 'ultra'>('medium');
    const [layerCount, setLayerCount] = React.useState(5);
    const [layerSpacing, setLayerSpacing] = React.useState(0.5);

    // Post-processing states
    const [brightness, setBrightness] = React.useState(0);
    const [contrast, setContrast] = React.useState(0);
    const [saturation, setSaturation] = React.useState(0);
    const [hue, setHue] = React.useState(0);
    const [toneMapping, setToneMapping] = React.useState<'no' | 'aces' | 'filmic' | 'reinhard'>('no');
    
    // 投影模式状态
    const [projectionMode, setProjectionMode] = React.useState<ProjectionMode>('perspective');
    const [eyeSeparation, setEyeSeparation] = React.useState(0.064);
    const [quiltViews, setQuiltViews] = React.useState(32);
    
    const editorRef = React.useRef<EditorSceneRef>(null);
    const stereoRef = React.useRef<StereoRendererRef>(null);
    const peppersGhostRef = React.useRef<PeppersGhostExporterRef>(null);
    const [isRecording, setIsRecording] = React.useState(false);

    // Project Metadata
    const [projectName, setProjectName] = React.useState('Untitled Project');
    const [projectDesc, setProjectDesc] = React.useState('');
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        if (params.id) {
            fetchProject(params.id);
        }
    }, [params.id]);

    const fetchProject = async (id: string) => {
        try {
            const res = await fetch(`/api/projects/${id}`);
            if (res.ok) {
                const project = await res.json();
                setProjectName(project.name);
                setProjectDesc(project.description);
                if (project.sceneConfig) {
                    try {
                        const config = JSON.parse(project.sceneConfig);
                        
                        // Load Asset Image
                        if (config.assetId) {
                            // Use the proxy endpoint we created in AssetController
                            // Assumption: AssetController exposes /api/assets/file/{storagePath} or similar
                            // But for now, we only have assetId. 
                            // We need an endpoint to get Asset URL by ID. 
                            // AssetController has GET /api/assets/{id}/url returning {url: ...}
                            
                            try {
                                setCurrentAssetId(config.assetId);
                                const assetRes = await fetch(`/api/assets/${config.assetId}/url`);
                                if (assetRes.ok) {
                                    const assetData = await assetRes.json();
                                    if (assetData.url) setImageUrl(assetData.url);
                                }
                            } catch (err) {
                                console.error("Failed to load asset url", err);
                            }
                        }

                        if(config.envPreset) setEnvPreset(config.envPreset);
                        if(config.fog) {
                            setFogEnabled(config.fog.enabled);
                            setFogColor(config.fog.color);
                            setFogDensity(config.fog.density);
                        }
                        if(config.materials) {
                            setRoughness(config.materials.roughness);
                            setMetalness(config.materials.metalness);
                            setDisplacementScale(config.materials.displacementScale);
                            setWireframe(config.materials.wireframe);
                        }
                        if(config.geometry) {
                            setGeometryMode(config.geometry.mode);
                            setPointSize(config.geometry.pointSize);
                        }
                        if(config.postProcessing) {
                            setBrightness(config.postProcessing.brightness);
                            setContrast(config.postProcessing.contrast);
                            setSaturation(config.postProcessing.saturation);
                            setHue(config.postProcessing.hue);
                            setToneMapping(config.postProcessing.toneMapping);
                        }
                    } catch (e) {
                        console.error("Failed to parse scene config", e);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to load project", error);
        }
    };

    const saveProject = async () => {
        setSaving(true);
        const sceneConfig = {
            envPreset,
            fog: { enabled: fogEnabled, color: fogColor, density: fogDensity },
            materials: { roughness, metalness, displacementScale, wireframe },
            geometry: { mode: geometryMode, pointSize },
            postProcessing: { brightness, contrast, saturation, hue, toneMapping }
        };

        try {
            const res = await fetch(`/api/projects/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: projectName,
                    description: projectDesc,
                    sceneConfig: JSON.stringify(sceneConfig)
                })
            });
            if (res.ok) {
                message.success('Project saved successfully');
            } else {
                message.error('Failed to save project');
            }
        } catch {
           message.error('Error saving project');
        } finally {
            setSaving(false);
        }
    };



    const [loading, setLoading] = React.useState(false);

    // 注意：资源加载已在 fetchProject 中处理
    // 新建项目没有关联资源，使用默认占位图或保持 null
    // 移除之前错误使用 params.id 作为资源文件名的代码

    const handleGenerateDepth = async () => {
        if (!currentAssetId) {
            message.warning('请先上传图片资源');
            return;
        }
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('assetId', currentAssetId);
            
            const res = await fetch('/api/infer/depth', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            if (data.resultUrl) {
                setDepthUrl(data.resultUrl);
                message.success("Depth map generated!");
            }
        } catch (e) {
            console.error(e);
            message.error("Failed to generate depth");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout style={{ height: '100vh' }}>
            <Header style={{ background: '#001529', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Link href="/dashboard"><Button type="text" icon={<ArrowLeftOutlined />} style={{ color: 'white' }} /></Link>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                         <Input 
                            value={projectName} 
                            onChange={(e) => setProjectName(e.target.value)} 
                            bordered={false}
                            style={{ color: 'white', padding: 0, fontSize: 16, fontWeight: 600, width: 200 }} 
                         />
                         <span style={{ fontSize: 10, color: '#aaa' }}>{projectDesc || 'No description'}</span>
                    </div>
                    <Button type="primary" size="small" onClick={saveProject} loading={saving}>Save</Button>
                </div>
                <div>
                     {!isRecording ? (
                        <Button 
                            icon={<VideoCameraOutlined />} 
                            style={{ marginRight: 8 }}
                            onClick={() => {
                                editorRef.current?.startRecording();
                                setIsRecording(true);
                                message.info('Recording started...');
                            }}
                        >
                            Record
                        </Button>
                     ) : (
                        <Button 
                            danger 
                            type="primary" 
                            icon={<StopOutlined />} 
                            style={{ marginRight: 8 }}
                            onClick={() => {
                                editorRef.current?.stopRecording();
                                setIsRecording(false);
                                message.success('Recording saved!');
                            }}
                        >
                            Stop
                        </Button>
                     )}
                     <Button type="primary" icon={<CloudUploadOutlined />} onClick={() => editorRef.current?.exportGLB()}>Export GLB</Button>
                     <Button type="default" icon={<ExperimentOutlined />} onClick={() => editorRef.current?.exportQuilt()}>Export Quilt</Button>
                </div>
            </Header>

            {/* Floating Toolbar */}
            <div style={{
                position: 'fixed',
                bottom: 24,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                padding: '8px 16px',
                borderRadius: 24,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex',
                gap: 12,
                zIndex: 1000
            }}>
                <Button 
                    shape="circle" 
                    icon={isRecording ? <StopOutlined style={{ color: '#ff4d4f' }} /> : <VideoCameraOutlined />} 
                    onClick={() => {
                        if (isRecording) {
                            editorRef.current?.stopRecording();
                            setIsRecording(false);
                            message.success('Recording saved!');
                        } else {
                            editorRef.current?.startRecording();
                            setIsRecording(true);
                            message.info('Recording started...');
                        }
                    }}
                    size="large"
                />
                 <div style={{ width: 1, background: '#f0f0f0' }}></div>
                 <Button shape="circle" icon={<CameraOutlined />} onClick={() => {
                    // Start circular animation
                    setAnimationMode('circular');
                    // Reset after some time or let user stop
                 }} />
            </div>


            <Layout>
                <Sider width={320} style={{ background: '#fff', borderRight: '1px solid #f0f0f0', overflowY: 'auto' }}>
                    <Collapse 
                        defaultActiveKey={['1', '2', '3']} 
                        ghost 
                        items={[
                            {
                                key: '1',
                                label: <Space><EnvironmentOutlined /> Atmosphere & Light</Space>,
                                children: (
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <div>
                                            <Text type="secondary">Environment</Text>
                                            <Select 
                                                value={envPreset} 
                                                onChange={setEnvPreset} 
                                                style={{ width: '100%' }}
                                                options={[
                                                    { value: 'city', label: 'City' },
                                                    { value: 'sunset', label: 'Sunset' },
                                                    { value: 'dawn', label: 'Dawn' },
                                                    { value: 'night', label: 'Night' },
                                                    { value: 'warehouse', label: 'Warehouse' },
                                                    { value: 'forest', label: 'Forest' },
                                                    { value: 'studio', label: 'Studio' },
                                                ]}
                                            />
                                        </div>

                                        <div>
                                            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                                <Text type="secondary">Fog</Text>
                                                <Switch checked={fogEnabled} onChange={setFogEnabled} size="small" />
                                            </Space>
                                            {fogEnabled && (
                                                <div style={{ marginTop: 8, paddingLeft: 8, borderLeft: '2px solid #f0f0f0' }}>
                                                    <div style={{ marginBottom: 8 }}>
                                                        <Text style={{ fontSize: 12 }}>Color</Text>
                                                        <br />
                                                        <ColorPicker value={fogColor} onChange={(c) => setFogColor(c.toHexString())} size="small" showText />
                                                    </div>
                                                    <div>
                                                        <Text style={{ fontSize: 12 }}>Density</Text>
                                                        <Slider 
                                                            min={0} 
                                                            max={1} 
                                                            step={0.01} 
                                                            value={fogDensity} 
                                                            onChange={setFogDensity} 
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <Text type="secondary">Bloom Intensity</Text>
                                            <Slider min={0} max={2} step={0.1} value={bloomIntensity} onChange={setBloomIntensity} />
                                        </div>
                                        <div>
                                            <Text type="secondary">Vignette</Text>
                                            <Slider min={0} max={1} step={0.1} value={vignetteDarkness} onChange={setVignetteDarkness} />
                                        </div>
                                    </Space>
                                )
                            },
                            {
                                key: '2',
                                label: <Space><CameraOutlined /> Camera & Motion</Space>,
                                children: (
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <div>
                                            <Text type="secondary">Perspective</Text>
                                            <Radio.Group 
                                                block 
                                                options={['perspective', 'orthographic']} 
                                                value={cameraType} 
                                                onChange={(e) => setCameraType(e.target.value)} 
                                                optionType="button"
                                                buttonStyle="solid"
                                            />
                                        </div>
                                        <div>
                                            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                                <Text type="secondary">Auto Rotate</Text>
                                                <Switch checked={autoRotate} onChange={setAutoRotate} size="small" />
                                            </Space>
                                        </div>
                                        <div>
                                            <Text type="secondary">Animation Mode</Text>
                                            <Select 
                                                value={animationMode} 
                                                onChange={setAnimationMode} 
                                                style={{ width: '100%' }}
                                                options={[
                                                    { value: 'none', label: 'None (Manual)' },
                                                    { value: 'circular', label: 'Circular Orbit' },
                                                    { value: 'dolly-zoom', label: 'Dolly Zoom' },
                                                ]}
                                            />
                                        </div>
                                    </Space>
                                )
                            },
                            {
                                key: '3',
                                label: <Space><ExperimentOutlined /> Material & Geometry</Space>,
                                children: (
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        {depthUrl ? (
                                            <div>
                                                <Text type="secondary">Displacement Scale</Text>
                                                <Slider min={0} max={5} step={0.1} value={displacementScale} onChange={setDisplacementScale} />
                                            </div>
                                        ) : (
                                            <Button block type="dashed" onClick={handleGenerateDepth} loading={loading}>
                                                Generate Depth Map to Enable 3D
                                            </Button>
                                        )}

                                        <div>
                                            <Text type="secondary">Roughness</Text>
                                            <Slider min={0} max={1} step={0.01} value={roughness} onChange={setRoughness} />
                                        </div>
                                        <div>
                                            <Text type="secondary">Metalness</Text>
                                            <Slider min={0} max={1} step={0.01} value={metalness} onChange={setMetalness} />
                                        </div>
                                        <div>
                                            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                                 <Text type="secondary">Wireframe</Text>
                                                 <Switch checked={wireframe} onChange={setWireframe} size="small" />
                                            </Space>
                                        </div>
                                    </Space>
                                )
                            },
                            {
                                key: '3b',
                                label: <Space><ExperimentOutlined /> Post Processing</Space>,
                                children: (
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <div>
                                            <Text type="secondary">Tone Mapping</Text>
                                            <Select 
                                                value={toneMapping} 
                                                onChange={setToneMapping} 
                                                style={{ width: '100%' }}
                                                options={[
                                                    { value: 'no', label: 'None' },
                                                    { value: 'aces', label: 'ACES Filmic' },
                                                    { value: 'filmic', label: 'Cineon' },
                                                    { value: 'reinhard', label: 'Reinhard' },
                                                ]}
                                            />
                                        </div>
                                        <div>
                                            <Text type="secondary">Brightness</Text>
                                            <Slider min={-0.5} max={0.5} step={0.05} value={brightness} onChange={setBrightness} />
                                        </div>
                                        <div>
                                            <Text type="secondary">Contrast</Text>
                                            <Slider min={-0.5} max={0.5} step={0.05} value={contrast} onChange={setContrast} />
                                        </div>
                                        <div>
                                            <Text type="secondary">Saturation</Text>
                                            <Slider min={-1} max={1} step={0.1} value={saturation} onChange={setSaturation} />
                                        </div>
                                        <div>
                                            <Text type="secondary">Hue</Text>
                                            <Slider min={-3.14} max={3.14} step={0.1} value={hue} onChange={setHue} />
                                        </div>
                                    </Space>
                                )
                            },
                            {
                                key: '4',
                                label: <Space><SettingOutlined /> Material & Geometry</Space>,
                                children: (
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <div>
                                            <Text type="secondary">Geometry Mode</Text>
                                            <Radio.Group 
                                                block 
                                                options={[
                                                    { label: 'Mesh', value: 'mesh' },
                                                    { label: 'Plane', value: 'plane' },
                                                    { label: 'Layers', value: 'layered' },
                                                    { label: 'Points', value: 'points' }
                                                ]}
                                                value={geometryMode} 
                                                onChange={(e) => setGeometryMode(e.target.value)} 
                                                optionType="button"
                                                buttonStyle="solid"
                                            />
                                        </div>
                                        {geometryMode === 'points' && (
                                             <div>
                                                <Text type="secondary">Point Size</Text>
                                                <Slider min={0.1} max={10} step={0.1} value={pointSize} onChange={setPointSize} />
                                             </div>
                                        )}
                                        {geometryMode === 'layered' && (
                                            <>
                                                <div>
                                                    <Text type="secondary">Layer Count</Text>
                                                    <Slider min={2} max={20} step={1} value={layerCount} onChange={setLayerCount} />
                                                </div>
                                                <div>
                                                    <Text type="secondary">Layer Spacing</Text>
                                                    <Slider min={0.1} max={2.0} step={0.1} value={layerSpacing} onChange={setLayerSpacing} />
                                                </div>
                                            </>
                                        )}

                                        <Divider style={{ margin: '8px 0' }} />

                                        <div>
                                            <Text type="secondary">Geometry Resolution</Text>
                                            <Select 
                                                style={{ width: '100%' }}
                                                value={resolution}
                                                onChange={setResolution}
                                                options={[
                                                    { value: 'low', label: 'Low (128x128)' },
                                                    { value: 'medium', label: 'Medium (256x256)' },
                                                    { value: 'high', label: 'High (512x512)' },
                                                    { value: 'ultra', label: 'Ultra (1024x1024) - GPU Heavy' }
                                                ]}
                                            />
                                        </div>

                                        <Divider style={{ margin: '8px 0' }} />

                                        {geometryMode === 'mesh' && (
                                            <div>
                                                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                                    <Text type="secondary">Wireframe</Text>
                                                    <Switch checked={wireframe} onChange={setWireframe} size="small" />
                                                </Space>
                                            </div>
                                        )}


                                        <div>
                                            <Text type="secondary">Displacement Scale</Text>
                                            <Slider min={0} max={10} step={0.1} value={displacementScale} onChange={setDisplacementScale} />
                                        </div>
                                        <div>
                                            <Text type="secondary">Roughness</Text>
                                            <Slider min={0} max={1} step={0.01} value={roughness} onChange={setRoughness} />
                                        </div>
                                        <div>
                                            <Text type="secondary">Metalness</Text>
                                            <Slider min={0} max={1} step={0.01} value={metalness} onChange={setMetalness} />
                                        </div>
                                    </Space>
                                )
                            },
                            {
                                key: '5',
                                label: <Space><SettingOutlined /> Project</Space>,
                                children: (
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <div>
                                            <Text type="secondary">Name</Text>
                                            <Input 
                                                placeholder="Project Name" 
                                                value={projectName} 
                                                onChange={(e) => setProjectName(e.target.value)} 
                                            />
                                        </div>
                                         <Button block type="primary" ghost onClick={() => setDepthUrl(undefined)}>Reset to 2D</Button>
                                    </Space>
                                )
                            },
                            {
                                key: '6',
                                label: <Space><ExperimentOutlined /> 投影模式</Space>,
                                children: (
                                    <ProjectionModeSelector
                                        value={projectionMode}
                                        onChange={setProjectionMode}
                                        eyeSeparation={eyeSeparation}
                                        onEyeSeparationChange={setEyeSeparation}
                                        quiltViews={quiltViews}
                                        onQuiltViewsChange={setQuiltViews}
                                        onExportStereo={(type) => {
                                            stereoRef.current?.exportSBS?.();
                                            message.success(`正在导出 ${type} 立体图像...`);
                                        }}
                                        onExportQuilt={() => editorRef.current?.exportQuilt()}
                                        onExportPeppersGhost={() => {
                                            peppersGhostRef.current?.exportPeppersGhost();
                                            message.success('正在导出 Pepper\'s Ghost 图像...');
                                        }}
                                        onExportPeppersGhostVideo={() => {
                                            peppersGhostRef.current?.exportPeppersGhostVideo();
                                            message.success('正在导出 Pepper\'s Ghost 视频...');
                                        }}
                                    />
                                )
                            },
                            {
                                key: '7',
                                label: <Space><CloudUploadOutlined /> Export</Space>,
                                children: (
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <Button 
                                            block 
                                            type="primary"
                                            onClick={() => editorRef.current?.exportGLB()}
                                        >
                                            Download GLB
                                        </Button>
                                        <Divider style={{ margin: '8px 0' }} />
                                        <Text type="secondary">Video Recording</Text>
                                        {!isRecording ? (
                                            <Button 
                                                block 
                                                icon={<VideoCameraOutlined />}
                                                onClick={() => {
                                                    editorRef.current?.startRecording();
                                                    setIsRecording(true);
                                                }}
                                            >
                                                Start Recording
                                            </Button>
                                        ) : (
                                            <Button 
                                                block 
                                                danger
                                                icon={<StopOutlined />}
                                                onClick={() => {
                                                    editorRef.current?.stopRecording();
                                                    setIsRecording(false);
                                                }}
                                            >
                                                Stop Recording
                                            </Button>
                                        )}
                                        <Divider style={{ margin: '8px 0' }} />
                                        <Button 
                                            block 
                                            onClick={() => editorRef.current?.exportQuilt()}
                                        >
                                            Export Quilt (Holographic)
                                        </Button>
                                    </Space>
                                )
                            }
                        ]}
                    />
                </Sider>
                <Content style={{ position: 'relative' }}>
                    {/* Scene View */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                         {imageUrl ? (
                            <EditorScene 
                                ref={editorRef}
                                imageUrl={imageUrl} 
                                depthUrl={depthUrl} 
                                displacementScale={displacementScale}
                                cameraType={cameraType}
                                animationMode={animationMode}
                                autoRotate={autoRotate}
                                bloomIntensity={bloomIntensity}
                                vignetteDarkness={vignetteDarkness}
                                envPreset={envPreset}
                                fogColor={fogColor}
                                fogDensity={fogEnabled ? fogDensity : 0}
                                roughness={roughness}
                                metalness={metalness}
                                wireframe={wireframe}
                                geometryMode={geometryMode}
                                pointSize={pointSize}
                                resolution={resolution}
                                layerCount={layerCount}
                                layerSpacing={layerSpacing}
                                brightness={brightness}
                                contrast={contrast}
                                saturation={saturation}
                                hue={hue}
                                toneMapping={toneMapping}
                            />
                         ) : (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                <Spin size="large" />
                            </div>
                         )}
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
}
