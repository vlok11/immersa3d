'use client';

import UploadZone from './components/ui/UploadZone';
import { Layout, Typography, Button, Space, Card, Row, Col } from 'antd';
import { ArrowRightOutlined, ExperimentOutlined, ThunderboltOutlined, DownloadOutlined } from '@ant-design/icons';

const { Header, Content, Footer } = Layout;
const { Title, Paragraph } = Typography;

export default function Home() {
  const scrollToUpload = () => {
      // document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' });
      // Redirect to dashboard for now
      window.location.href = '/dashboard';
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#000' }}>
      <Header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        position: 'fixed',
        width: '100%',
        zIndex: 1000,
        padding: '0 48px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, background: 'linear-gradient(45deg, #1890ff, #722ed1)', borderRadius: 6 }}></div>
            <Title level={4} style={{ color: 'white', margin: 0, fontWeight: 700 }}>Immersa 3D</Title>
        </div>
        <Space>
            <Button type="link" style={{ color: 'rgba(255,255,255,0.7)' }}>Showcase</Button>
            <Button type="link" style={{ color: 'rgba(255,255,255,0.7)' }}>Features</Button>
            <Button type="primary" shape="round" onClick={scrollToUpload}>Get Started</Button>
        </Space>
      </Header>

      <Content style={{ marginTop: 0 }}>
        {/* Hero Section */}
        <div style={{ 
            height: '90vh', 
            background: 'radial-gradient(circle at center, #1a1a2e 0%, #000000 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            padding: '0 24px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{ 
                position: 'absolute', 
                top: '20%', 
                left: '20%', 
                width: '300px', 
                height: '300px', 
                background: '#1890ff', 
                borderRadius: '50%', 
                filter: 'blur(120px)', 
                opacity: 0.2 
            }} />
             <div style={{ 
                position: 'absolute', 
                bottom: '20%', 
                right: '20%', 
                width: '400px', 
                height: '400px', 
                background: '#722ed1', 
                borderRadius: '50%', 
                filter: 'blur(140px)', 
                opacity: 0.2 
            }} />

            <div style={{ zIndex: 1, maxWidth: 800 }}>
                <Title style={{ color: 'white', fontSize: '64px', margin: 0, letterSpacing: '-2px' }}>
                    Bring Your Photos<br />
                    <span style={{ 
                        background: 'linear-gradient(90deg, #1890ff, #f5222d)', 
                        WebkitBackgroundClip: 'text', 
                        WebkitTextFillColor: 'transparent' 
                    }}>To Life in 3D</span>
                </Title>
                <Paragraph style={{ color: 'rgba(255,255,255,0.6)', fontSize: '20px', marginTop: 24, maxWidth: 600, margin: '24px auto' }}>
                    Transform static images into immersive 3D scenes with AI-powered depth estimation. Edit, animate, and export in seconds.
                </Paragraph>
                <Space size="large" style={{ marginTop: 32 }}>
                    <Button type="primary" size="large" shape="round" icon={<ArrowRightOutlined />} style={{ height: 48, padding: '0 48px', fontSize: 18 }} onClick={scrollToUpload}>
                        Start Creating
                    </Button>
                    <Button size="large" type="text" style={{ color: 'white' }}>Watch Demo</Button>
                </Space>
            </div>
        </div>

        {/* Features Section */}
        <div style={{ padding: '80px 48px', background: '#050505' }}>
            <Row gutter={[48, 48]} justify="center">
                <Col xs={24} md={8}>
                    <Card bordered={false} style={{ background: 'transparent' }} bodyStyle={{ padding: 0 }}>
                        <ExperimentOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 24 }} />
                        <Title level={3} style={{ color: 'white' }}>AI Depth Estimation</Title>
                        <Paragraph style={{ color: 'rgba(255,255,255,0.5)' }}>
                            State-of-the-art machine learning models predict accurate depth maps from a single 2D image instantly.
                        </Paragraph>
                    </Card>
                </Col>
                <Col xs={24} md={8}>
                    <Card bordered={false} style={{ background: 'transparent' }} bodyStyle={{ padding: 0 }}>
                        <ThunderboltOutlined style={{ fontSize: 48, color: '#f5222d', marginBottom: 24 }} />
                        <Title level={3} style={{ color: 'white' }}>Real-time Editor</Title>
                        <Paragraph style={{ color: 'rgba(255,255,255,0.5)' }}>
                            Adjust controls for atmosphere, lighting, PBR materials, and camera motion in a high-performance WebGL environment.
                        </Paragraph>
                    </Card>
                </Col>
                <Col xs={24} md={8}>
                    <Card bordered={false} style={{ background: 'transparent' }} bodyStyle={{ padding: 0 }}>
                        <DownloadOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 24 }} />
                        <Title level={3} style={{ color: 'white' }}>Export & Share</Title>
                        <Paragraph style={{ color: 'rgba(255,255,255,0.5)' }}>
                            Download your creations as GLB 3D models or render cinematic videos to share on social media.
                        </Paragraph>
                    </Card>
                </Col>
            </Row>
        </div>

        {/* Upload Section */}
        <div id="upload-section" style={{ padding: '80px 24px', background: '#000', textAlign: 'center' }}>
             <Title level={2} style={{ color: 'white', marginBottom: 48 }}>Ready to try using your own images?</Title>
             <div style={{ maxWidth: 800, margin: '0 auto', background: '#111', padding: 48, borderRadius: 24, border: '1px solid #333' }}>
                <UploadZone />
             </div>
        </div>

      </Content>
      <Footer style={{ textAlign: 'center', background: '#000', color: 'rgba(255,255,255,0.3)', borderTop: '1px solid #111' }}>
        Immersa 3D ©{new Date().getFullYear()} Created by Antigravity
      </Footer>
    </Layout>
  );
}
