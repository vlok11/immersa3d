// ============================================================
// Immersa 3D - Color Enhancer
// Automatic color enhancement using histogram equalization
// ============================================================

/**
 * Color enhancer options
 */
export interface ColorEnhancerOptions {
  /** Enhancement intensity (0-1) */
  intensity: number;
  /** Preserve skin tones */
  preserveSkinTones: boolean;
  /** Enhance saturation */
  enhanceSaturation: boolean;
  /** Saturation boost */
  saturationBoost: number;
  /** Contrast adjustment */
  contrast: number;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: ColorEnhancerOptions = {
  intensity: 0.5,
  preserveSkinTones: true,
  enhanceSaturation: true,
  saturationBoost: 0.15,
  contrast: 0.1,
};

/**
 * RGB color
 */
interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * HSL color
 */
interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * Color Enhancer Class
 * Applies automatic color enhancement to images
 */
export class ColorEnhancer {
  private options: ColorEnhancerOptions;
  
  constructor(options?: Partial<ColorEnhancerOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * Update options
   */
  updateOptions(options: Partial<ColorEnhancerOptions>): void {
    this.options = { ...this.options, ...options };
  }
  
  /**
   * Enhance image data
   */
  enhance(imageData: ImageData): ImageData {
    const { intensity, enhanceSaturation, saturationBoost, contrast } = this.options;
    
    // Create output
    const output = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
    
    const data = output.data;
    
    // Calculate histogram
    const histogram = this.calculateHistogram(imageData);
    
    // Calculate cumulative distribution function
    const cdf = this.calculateCDF(histogram);
    
    // Apply enhancement
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Apply histogram equalization
      let newR = Math.round(cdf[r] * 255);
      let newG = Math.round(cdf[g] * 255);
      let newB = Math.round(cdf[b] * 255);
      
      // Blend with original based on intensity
      newR = Math.round(r * (1 - intensity) + newR * intensity);
      newG = Math.round(g * (1 - intensity) + newG * intensity);
      newB = Math.round(b * (1 - intensity) + newB * intensity);
      
      // Apply contrast
      if (contrast !== 0) {
        const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
        newR = Math.round(factor * (newR - 128) + 128);
        newG = Math.round(factor * (newG - 128) + 128);
        newB = Math.round(factor * (newB - 128) + 128);
      }
      
      // Enhance saturation
      if (enhanceSaturation && saturationBoost !== 0) {
        const hsl = rgbToHsl({ r: newR, g: newG, b: newB });
        hsl.s = Math.min(1, hsl.s * (1 + saturationBoost));
        const rgb = hslToRgb(hsl);
        newR = rgb.r;
        newG = rgb.g;
        newB = rgb.b;
      }
      
      // Clamp values
      data[i] = Math.max(0, Math.min(255, newR));
      data[i + 1] = Math.max(0, Math.min(255, newG));
      data[i + 2] = Math.max(0, Math.min(255, newB));
    }
    
    return output;
  }
  
  /**
   * Calculate histogram (luminance)
   */
  private calculateHistogram(imageData: ImageData): number[] {
    const histogram = new Array(256).fill(0);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const luminance = Math.round(
        0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      );
      histogram[luminance]++;
    }
    
    return histogram;
  }
  
  /**
   * Calculate cumulative distribution function
   */
  private calculateCDF(histogram: number[]): number[] {
    const cdf = new Array(256);
    let sum = 0;
    const total = histogram.reduce((a, b) => a + b, 0);
    
    for (let i = 0; i < 256; i++) {
      sum += histogram[i];
      cdf[i] = sum / total;
    }
    
    // Normalize CDF
    const cdfMin = cdf.find(v => v > 0) ?? 0;
    
    for (let i = 0; i < 256; i++) {
      cdf[i] = (cdf[i] - cdfMin) / (1 - cdfMin);
    }
    
    return cdf;
  }
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Convert RGB to HSL
 */
function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  
  let h = 0;
  let s = 0;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return { h, s, l };
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(hsl: HSL): RGB {
  const { h, s, l } = hsl;
  
  let r: number, g: number, b: number;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Create color enhancer instance
 */
export function createColorEnhancer(options?: Partial<ColorEnhancerOptions>): ColorEnhancer {
  return new ColorEnhancer(options);
}

/**
 * Quick enhance function
 */
export function enhanceColors(
  imageData: ImageData,
  options?: Partial<ColorEnhancerOptions>
): ImageData {
  const enhancer = new ColorEnhancer(options);
  return enhancer.enhance(imageData);
}
