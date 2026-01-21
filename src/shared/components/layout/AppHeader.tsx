import { Box } from 'lucide-react';
import { memo } from 'react';

export const AppHeader = memo(() => (
  <header
    style={{
      height: '4rem',
      borderBottom: '1px solid #27272a',
      backgroundColor: 'rgba(24, 24, 27, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      zIndex: 20,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div
        style={{
          width: '2rem',
          height: '2rem',
          backgroundColor: '#4f46e5',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box style={{ color: 'white', width: '1.25rem', height: '1.25rem' }} />
      </div>
      <div>
        <h1
          style={{
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1.125rem',
            letterSpacing: '-0.025em',
            margin: 0,
          }}
        >
          Immersa 3D
        </h1>
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <span className="hidden sm:block" style={{ fontSize: '0.75rem', color: '#71717a' }}>
        由 Gemini &amp; WebGL 驱动
      </span>
      <button
        onMouseOut={(e) => (e.currentTarget.style.color = '#a1a1aa')}
        onMouseOver={(e) => (e.currentTarget.style.color = 'white')}
        style={{
          fontSize: '0.875rem',
          color: '#a1a1aa',
          transition: 'color 0.2s',
          textDecoration: 'none',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
        type="button"
      >
        文档
      </button>
    </div>
  </header>
));

AppHeader.displayName = 'AppHeader';
