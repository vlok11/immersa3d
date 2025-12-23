'use client';

import React from 'react';
import { Layout, Typography, Card, Button, Row, Col, Empty, Space, Spin, message } from 'antd';
import { PlusOutlined, MoreOutlined, EditOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ChunkedUploader from '../components/upload/ChunkedUploader';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

interface Project {
    id: string;
    name: string;
    description: string;
    updatedAt: string;
    thumbnail?: string;
}

interface Asset {
    id: string;
    filename: string;
    storagePath: string;
    fileSize: number;
    mimeType: string;
    type: string;
}

export default function Dashboard() {
    const router = useRouter();
    const [projects, setProjects] = React.useState<Project[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/projects');
            if (res.ok) {
                const data = await res.json();
                setProjects(data);
            }
        } catch (error) {
            console.error('Failed to fetch projects', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = async () => {
        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: 'Untitled Project',
                    description: 'New 3D Scene'
                })
            });
            if (res.ok) {
                const newProject = await res.json();
                router.push(`/editor/${newProject.id}`);
            }
        } catch (error) {
            console.error('Failed to create project', error);
        }
    };

    const handleUploadComplete = async (asset: Asset) => {
        try {
            // 创建项目
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: asset.filename || 'Imported Project', 
                    description: '从上传资源创建'
                })
            });
            if (res.ok) {
                const project = await res.json();
                const config = { assetId: asset.id };
                
                // 更新项目配置
                await fetch(`/api/projects/${project.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        name: asset.filename || 'Imported Project',
                        description: '从上传资源创建',
                        sceneConfig: JSON.stringify(config)
                    }) 
                });
                
                message.success('项目创建成功！');
                router.push(`/editor/${project.id}`);
            }
        } catch (e) {
            console.error(e);
            message.error('创建项目失败');
        }
    };

    return (
        <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
            <Header style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 24, height: 24, background: 'linear-gradient(45deg, #1890ff, #722ed1)', borderRadius: 4 }}></div>
                    <Title level={4} style={{ margin: 0 }}>Immersa 3D</Title>
                </div>
                <Space>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1890ff', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>U</div>
                </Space>
            </Header>
            <Content style={{ padding: '24px 48px' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <div style={{ marginBottom: 32 }}>
                        <ChunkedUploader 
                            onUploadComplete={handleUploadComplete}
                            accept="image/*,video/*"
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <Title level={3} style={{ margin: 0 }}>My Projects</Title>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateNew} size="large" loading={loading}>
                            New Project
                        </Button>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>
                    ) : (
                        <Row gutter={[24, 24]}>
                            {projects.map(project => (
                                <Col xs={24} sm={12} md={8} lg={6} key={project.id}>
                                    <Card
                                        hoverable
                                        cover={
                                            <div style={{ height: 160, overflow: 'hidden', position: 'relative', background: '#eee' }}>
                                                {/* <img alt={project.name} src={project.thumbnail} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>
                                                    No Thumbnail
                                                </div>
                                            </div>
                                        }
                                        actions={[
                                            <EditOutlined key="edit" onClick={() => router.push(`/editor/${project.id}`)} />,
                                            <MoreOutlined key="more" />,
                                        ]}
                                    >
                                        <Card.Meta
                                            title={<Link href={`/editor/${project.id}`}>{project.name}</Link>}
                                            description={`Updated: ${new Date(project.updatedAt).toLocaleDateString()}`}
                                        />
                                    </Card>
                                </Col>
                            ))}
                            
                            {projects.length === 0 && (
                                <Col span={24}>
                                    <Empty
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        description="No projects yet"
                                    >
                                        <Button type="primary" onClick={handleCreateNew}>Create Now</Button>
                                    </Empty>
                                </Col>
                            )}
                        </Row>
                    )}
                </div>
            </Content>
            <Footer style={{ textAlign: 'center', color: '#888' }}>
                Immersa 3D ©2024
            </Footer>
        </Layout>
    );
}
