// ============================================================
// Immersa 3D - EXIF Parser
// Extract and handle EXIF orientation data
// ============================================================

/**
 * EXIF orientation values
 * 1: Normal
 * 2: Flipped horizontally
 * 3: Rotated 180°
 * 4: Flipped vertically
 * 5: Rotated 90° CCW + flipped horizontally
 * 6: Rotated 90° CW
 * 7: Rotated 90° CW + flipped horizontally
 * 8: Rotated 90° CCW
 */
export type ExifOrientation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * Extract EXIF orientation from a file
 */
export async function getExifOrientation(file: File): Promise<ExifOrientation> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const view = new DataView(event.target?.result as ArrayBuffer);
      
      // Check for JPEG magic bytes (FFD8)
      if (view.getUint16(0, false) !== 0xFFD8) {
        resolve(1); // Not a JPEG, assume normal orientation
        return;
      }

      const length = view.byteLength;
      let offset = 2;

      while (offset < length) {
        // Check for EXIF marker
        if (view.getUint16(offset, false) === 0xFFE1) {
          // Check for 'Exif' string
          const exifIdCode = view.getUint32(offset + 4, false);
          if (exifIdCode !== 0x45786966) {
            resolve(1);
            return;
          }

          // Get byte order
          const tiffOffset = offset + 10;
          const bigEndian = view.getUint16(tiffOffset, false) === 0x4D4D;

          // Get first IFD offset
          const ifdOffset = tiffOffset + view.getUint32(tiffOffset + 4, bigEndian);

          // Get number of directory entries
          const numEntries = view.getUint16(ifdOffset, bigEndian);

          // Search for orientation tag (0x0112)
          for (let i = 0; i < numEntries; i++) {
            const entryOffset = ifdOffset + 2 + i * 12;
            const tag = view.getUint16(entryOffset, bigEndian);

            if (tag === 0x0112) {
              const orientation = view.getUint16(entryOffset + 8, bigEndian);
              resolve(orientation as ExifOrientation);
              return;
            }
          }

          resolve(1);
          return;
        }

        offset += 2 + view.getUint16(offset + 2, false);
      }

      resolve(1);
    };

    reader.onerror = () => {
      resolve(1);
    };

    // Only read first 64KB for EXIF data
    reader.readAsArrayBuffer(file.slice(0, 65536));
  });
}

/**
 * Get CSS transform for EXIF orientation
 */
export function getOrientationTransform(orientation: ExifOrientation): string {
  switch (orientation) {
    case 2:
      return 'scaleX(-1)';
    case 3:
      return 'rotate(180deg)';
    case 4:
      return 'scaleY(-1)';
    case 5:
      return 'rotate(90deg) scaleX(-1)';
    case 6:
      return 'rotate(90deg)';
    case 7:
      return 'rotate(-90deg) scaleX(-1)';
    case 8:
      return 'rotate(-90deg)';
    default:
      return '';
  }
}

/**
 * Apply EXIF orientation correction to an image
 */
export function correctOrientation(
  image: HTMLImageElement,
  orientation: ExifOrientation,
  maxSize: number = 4096
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  let { width, height } = image;

  // Scale down if exceeds max size
  const scale = Math.min(1, maxSize / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  // Swap dimensions for 90° rotations
  const needsSwap = orientation >= 5 && orientation <= 8;
  
  if (needsSwap) {
    canvas.width = height;
    canvas.height = width;
  } else {
    canvas.width = width;
    canvas.height = height;
  }

  // Apply transformations based on orientation
  ctx.save();
  
  switch (orientation) {
    case 2:
      ctx.scale(-1, 1);
      ctx.translate(-width, 0);
      break;
    case 3:
      ctx.rotate(Math.PI);
      ctx.translate(-width, -height);
      break;
    case 4:
      ctx.scale(1, -1);
      ctx.translate(0, -height);
      break;
    case 5:
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(1, -1);
      break;
    case 6:
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(0, -height);
      break;
    case 7:
      ctx.rotate(-0.5 * Math.PI);
      ctx.scale(1, -1);
      ctx.translate(-width, 0);
      break;
    case 8:
      ctx.rotate(-0.5 * Math.PI);
      ctx.translate(-width, 0);
      break;
    default:
      break;
  }

  ctx.drawImage(image, 0, 0, width, height);
  ctx.restore();

  return canvas;
}
