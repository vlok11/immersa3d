// ============================================================
// Immersa 3D - Main Application
// Root component with 3D canvas, sidebar, and initialization
// ============================================================

import { useEffect, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Stats } from '@react-three/drei';

import { renderContext } from './core/context';
import { moduleRegistry } from './core/registry';
import { useAppStore, useViewportStore, useMediaStore } from './store';
import { DepthMesh, projection3DModule } from './modules/projection-3d';
import { ImageUploader, mediaInputModule } from './modules/media-input';
import { DepthEstimator, aiAnalysisModule } from './modules/ai-analysis';

import './styles/global.css';

/**
 * Loading screen component
 */
function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="loading-overlay">
      <div className="loading-spinner" />
      <p className="loading-text">{message}</p>
    </div>
  );
}

/**
 * 3D Scene content
 */
function Scene() {
  const showGrid = useViewportStore((s) => s.showGrid);
  const showStats = useViewportStore((s) => s.showStats);
  const camera = useViewportStore((s) => s.camera);
  
  return (
    <>
      {/* Lights */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      
      {/* Camera controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={20}
        target={camera.target}
      />
      
      {/* Grid helper */}
      {showGrid && (
        <Grid
          args={[10, 10]}
          position={[0, -1, 0]}
          cellSize={0.5}
          cellColor="#333355"
          sectionSize={2}
          sectionColor="#4455aa"
          fadeDistance={15}
          fadeStrength={1}
          infiniteGrid
        />
      )}
      
      {/* Main depth mesh */}
      <Suspense fallback={null}>
        <DepthMesh />
      </Suspense>
      
      {/* Stats (FPS counter) */}
      {showStats && <Stats />}
    </>
  );
}

/**
 * Sidebar component
 */
function Sidebar() {
  const currentMedia = useMediaStore((s) => s.currentMedia);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  
  if (!sidebarOpen) return null;
  
  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 'var(--sidebar-width)',
        height: '100%',
        background: 'var(--color-bg-secondary)',
        borderRight: '1px solid var(--color-border)',
        padding: 'var(--spacing-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-lg)',
        overflowY: 'auto',
        zIndex: 'var(--z-sticky)',
      }}
    >
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-bold)',
            margin: 0,
            marginBottom: 'var(--spacing-xs)',
          }}
        >
          <span className="gradient-text">Immersa 3D</span>
        </h1>
        <p
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-muted)',
            margin: 0,
          }}
        >
          AI-Powered 3D Content Engine
        </p>
      </div>
      
      {/* Image Upload */}
      <section>
        <h2
          style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 'var(--spacing-sm)',
          }}
        >
          Input
        </h2>
        <ImageUploader />
      </section>
      
      {/* AI Analysis - only show if media is loaded */}
      {currentMedia && (
        <section>
          <h2
            style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 'var(--spacing-sm)',
            }}
          >
            AI Analysis
          </h2>
          <DepthEstimator />
        </section>
      )}
      
      {/* Media Preview */}
      {currentMedia && (
        <section>
          <h2
            style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 'var(--spacing-sm)',
            }}
          >
            Preview
          </h2>
          <div
            style={{
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              border: '1px solid var(--color-border)',
            }}
          >
            <img
              src={currentMedia.dataUrl}
              alt={currentMedia.originalName}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
          </div>
          <p
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-muted)',
              marginTop: 'var(--spacing-xs)',
            }}
          >
            {currentMedia.width} × {currentMedia.height}
          </p>
        </section>
      )}
    </aside>
  );
}

/**
 * Main App component
 */
export default function App() {
  const [initMessage, setInitMessage] = useState('Initializing...');
  const initialized = useAppStore((s) => s.initialized);
  const setInitialized = useAppStore((s) => s.setInitialized);
  const addError = useAppStore((s) => s.addError);
  const renderBackend = useAppStore((s) => s.renderBackend);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  
  const camera = useViewportStore((s) => s.camera);
  
  // Initialize application
  useEffect(() => {
    async function initialize() {
      try {
        // Step 1: Detect GPU capabilities
        setInitMessage('Detecting GPU capabilities...');
        const capabilities = await renderContext.initialize();
        
        if (capabilities.backend === 'none') {
          addError('No GPU backend available. WebGL is required.', 'error');
          return;
        }
        
        console.log('[App] GPU Backend:', capabilities.backend);
        console.log('[App] Max Texture Size:', capabilities.maxTextureSize);
        console.log('[App] Renderer:', capabilities.renderer);
        
        // Step 2: Register core modules
        setInitMessage('Loading modules...');
        
        // Register media input module
        await moduleRegistry.register(mediaInputModule);
        await moduleRegistry.activate('media-input');
        
        // Register AI analysis module
        await moduleRegistry.register(aiAnalysisModule);
        await moduleRegistry.activate('ai-analysis');
        
        // Register 3D projection module
        await moduleRegistry.register(projection3DModule);
        await moduleRegistry.activate('projection-3d');
        
        // Step 3: Complete initialization
        setInitMessage('Ready');
        setInitialized(true, capabilities.backend);
        
      } catch (error) {
        console.error('[App] Initialization failed:', error);
        addError(
          `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'error'
        );
      }
    }
    
    initialize();
    
    // Cleanup on unmount
    return () => {
      moduleRegistry.disposeAll();
    };
  }, [setInitialized, addError]);
  
  // Show loading screen while initializing
  if (!initialized) {
    return <LoadingScreen message={initMessage} />;
  }
  
  return (
    <div className="app">
      {/* Sidebar */}
      <Sidebar />
      
      {/* 3D Canvas */}
      <div
        className="canvas-container"
        style={{
          marginLeft: sidebarOpen ? 'var(--sidebar-width)' : 0,
          transition: 'margin-left var(--transition-normal)',
        }}
      >
        <Canvas
          camera={{
            position: camera.position,
            fov: camera.fov,
            near: camera.near,
            far: camera.far,
          }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
          }}
          dpr={[1, 2]}
        >
          <Scene />
        </Canvas>
      </div>
      
      {/* Backend indicator */}
      <div
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          padding: '8px 12px',
          background: 'var(--color-surface)',
          backdropFilter: 'blur(12px)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-family-mono)',
        }}
      >
        {renderBackend?.toUpperCase()} | Immersa 3D v1.0
      </div>
    </div>
  );
}
