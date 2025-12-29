// ============================================================
// Immersa 3D - Detail Sharpener
// Unsharp masking filter for detail enhancement
// ============================================================

/**
 * Sharpener options
 */
export interface SharpenerOptions {
  /** Sharpening amount (0-2) */
  amount: number;
  /** Blur radius for unsharp mask */
  radius: number;
  /** Threshold for edge detection */
  threshold: number;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: SharpenerOptions = {
  amount: 0.5,
  radius: 1,
  threshold: 0,
};

/**
 * Detail Sharpener Class
 * Applies unsharp masking for detail enhancement
 */
export class DetailSharpener {
  private options: SharpenerOptions;
  
  constructor(options?: Partial<SharpenerOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * Update options
   */
  updateOptions(options: Partial<SharpenerOptions>): void {
    this.options = { ...this.options, ...options };
  }
  
  /**
   * Sharpen image data
   */
  sharpen(imageData: ImageData): ImageData {
    const { amount, radius, threshold } = this.options;
    
    // First, create a blurred version
    const blurred = this.gaussianBlur(imageData, radius);
    
    // Create output
    const output = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
    
    const original = imageData.data;
    const blurredData = blurred.data;
    const outputData = output.data;
    
    // Unsharp masking: sharpened = original + amount * (original - blurred)
    for (let i = 0; i < original.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const diff = original[i + c] - blurredData[i + c];
        
        // Apply threshold
        if (Math.abs(diff) >= threshold) {
          const sharpened = original[i + c] + diff * amount;
          outputData[i + c] = Math.max(0, Math.min(255, Math.round(sharpened)));
        }
      }
      // Alpha unchanged
    }
    
    return output;
  }
  
  /**
   * Apply Gaussian blur
   */
  private gaussianBlur(imageData: ImageData, radius: number): ImageData {
    const { width, height } = imageData;
    const output = new ImageData(
      new Uint8ClampedArray(imageData.data),
      width,
      height
    );
    
    const kernel = this.createGaussianKernel(radius);
    const kernelSize = kernel.length;
    const halfKernel = Math.floor(kernelSize / 2);
    
    const input = imageData.data;
    const outputData = output.data;
    
    // Horizontal pass
    const temp = new Uint8ClampedArray(input.length);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        let weightSum = 0;
        
        for (let k = 0; k < kernelSize; k++) {
          const px = Math.min(Math.max(x + k - halfKernel, 0), width - 1);
          const idx = (y * width + px) * 4;
          const weight = kernel[k];
          
          r += input[idx] * weight;
          g += input[idx + 1] * weight;
          b += input[idx + 2] * weight;
          a += input[idx + 3] * weight;
          weightSum += weight;
        }
        
        const outIdx = (y * width + x) * 4;
        temp[outIdx] = r / weightSum;
        temp[outIdx + 1] = g / weightSum;
        temp[outIdx + 2] = b / weightSum;
        temp[outIdx + 3] = a / weightSum;
      }
    }
    
    // Vertical pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        let weightSum = 0;
        
        for (let k = 0; k < kernelSize; k++) {
          const py = Math.min(Math.max(y + k - halfKernel, 0), height - 1);
          const idx = (py * width + x) * 4;
          const weight = kernel[k];
          
          r += temp[idx] * weight;
          g += temp[idx + 1] * weight;
          b += temp[idx + 2] * weight;
          a += temp[idx + 3] * weight;
          weightSum += weight;
        }
        
        const outIdx = (y * width + x) * 4;
        outputData[outIdx] = Math.round(r / weightSum);
        outputData[outIdx + 1] = Math.round(g / weightSum);
        outputData[outIdx + 2] = Math.round(b / weightSum);
        outputData[outIdx + 3] = Math.round(a / weightSum);
      }
    }
    
    return output;
  }
  
  /**
   * Create 1D Gaussian kernel
   */
  private createGaussianKernel(radius: number): number[] {
    const size = Math.ceil(radius * 2) * 2 + 1;
    const kernel = new Array(size);
    const sigma = radius / 2;
    const sigma2 = 2 * sigma * sigma;
    
    let sum = 0;
    const center = Math.floor(size / 2);
    
    for (let i = 0; i < size; i++) {
      const x = i - center;
      kernel[i] = Math.exp(-(x * x) / sigma2);
      sum += kernel[i];
    }
    
    // Normalize
    for (let i = 0; i < size; i++) {
      kernel[i] /= sum;
    }
    
    return kernel;
  }
}

/**
 * Create detail sharpener instance
 */
export function createDetailSharpener(options?: Partial<SharpenerOptions>): DetailSharpener {
  return new DetailSharpener(options);
}

/**
 * Quick sharpen function
 */
export function sharpenImage(
  imageData: ImageData,
  options?: Partial<SharpenerOptions>
): ImageData {
  const sharpener = new DetailSharpener(options);
  return sharpener.sharpen(imageData);
}
