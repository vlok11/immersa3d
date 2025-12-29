// ============================================================
// Immersa 3D - URL Importer Component
// Import images from external URLs with CORS handling
// ============================================================

import { useState, useCallback } from 'react';
import { useMediaStore, useAppStore } from '../../../store';
import { eventBus } from '../../../core/events';
import styles from './URLImporter.module.css';

/**
 * Supported URL patterns
 */
const URL_PATTERNS = {
  imgur: /^https?:\/\/(i\.)?imgur\.com/,
  unsplash: /^https?:\/\/images\.unsplash\.com/,
  pexels: /^https?:\/\/images\.pexels\.com/,
  generic: /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i,
};

/**
 * CORS proxy configuration
 */
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
];

/**
 * Max image size (10MB)
 */
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/**
 * Max canvas dimension
 */
const MAX_DIMENSION = 4096;

/**
 * Check if URL is from a known provider
 */
function getURLProvider(url: string): string | null {
  for (const [provider, pattern] of Object.entries(URL_PATTERNS)) {
    if (pattern.test(url)) {
      return provider;
    }
  }
  return null;
}

/**
 * Try to fetch image with CORS proxy
 */
async function fetchWithProxy(url: string): Promise<Blob> {
  // First, try direct fetch
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (response.ok) {
      return await response.blob();
    }
  } catch {
    console.log('[URLImporter] Direct fetch failed, trying proxies...');
  }
  
  // Try CORS proxies
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (response.ok) {
        return await response.blob();
      }
    } catch {
      continue;
    }
  }
  
  throw new Error('Failed to fetch image: CORS or network error');
}

/**
 * Load image from blob
 */
async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode image'));
    };
    
    img.src = url;
  });
}

/**
 * Scale image to fit within max dimensions
 */
function scaleImage(img: HTMLImageElement, maxDim: number): HTMLCanvasElement {
  let { width, height } = img;
  
  if (width > maxDim || height > maxDim) {
    const ratio = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);
  
  return canvas;
}

/**
 * URLImporter - Import images from external URLs
 */
export function URLImporter() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  
  const setMedia = useMediaStore((s) => s.setMedia);
  const addError = useAppStore((s) => s.addError);

  /**
   * Import image from URL
   */
  const importImage = useCallback(async () => {
    if (!url.trim()) {
      addError('Please enter a URL', 'warning');
      return;
    }
    
    // Validate URL format
    const provider = getURLProvider(url);
    if (!provider) {
      addError('Invalid image URL. Supported: Imgur, Unsplash, Pexels, or direct image links', 'warning');
      return;
    }
    
    setLoading(true);
    setStatus('Fetching image...');
    
    try {
      // Fetch image
      const blob = await fetchWithProxy(url);
      
      // Validate size
      if (blob.size > MAX_IMAGE_SIZE) {
        throw new Error(`Image size exceeds ${MAX_IMAGE_SIZE / 1024 / 1024}MB limit`);
      }
      
      // Validate type
      if (!blob.type.startsWith('image/')) {
        throw new Error('URL does not point to a valid image');
      }
      
      setStatus('Processing image...');
      
      // Load and scale image
      const img = await loadImage(blob);
      const canvas = scaleImage(img, MAX_DIMENSION);
      
      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png');
      
      // Extract filename from URL
      const urlParts = url.split('/');
      const filename = urlParts[urlParts.length - 1].split('?')[0] || 'imported-image.png';
      
      // Create media info
      const mediaInfo = {
        id: `media_${Date.now()}`,
        type: 'image' as const,
        sourceType: 'url' as const,
        originalName: filename,
        mimeType: blob.type,
        width: canvas.width,
        height: canvas.height,
        fileSize: blob.size,
        dataUrl,
        sourceUrl: url,
        createdAt: Date.now(),
      };
      
      // Store media
      setMedia(mediaInfo);
      
      // Emit event
      eventBus.emit('media:urlImported', {
        url,
        provider,
        width: canvas.width,
        height: canvas.height,
      });
      
      // Clear input
      setUrl('');
      setStatus('');
      
      console.log(`[URLImporter] Imported: ${url} (${canvas.width}x${canvas.height})`);
    } catch (error) {
      console.error('[URLImporter] Import failed:', error);
      addError(error instanceof Error ? error.message : 'Failed to import image', 'error');
      setStatus('');
    } finally {
      setLoading(false);
    }
  }, [url, setMedia, addError]);

  /**
   * Handle input keydown
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      importImage();
    }
  }, [importImage, loading]);

  return (
    <div className={styles.container}>
      <div className={styles.inputGroup}>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste image URL (Imgur, Unsplash, Pexels...)"
          className={styles.input}
          disabled={loading}
        />
        <button
          onClick={importImage}
          disabled={loading || !url.trim()}
          className={styles.button}
        >
          {loading ? 'Importing...' : 'Import'}
        </button>
      </div>
      
      {status && (
        <p className={styles.status}>{status}</p>
      )}
      
      <p className={styles.hint}>
        Supports: Imgur, Unsplash, Pexels, or any direct image link
      </p>
    </div>
  );
}
