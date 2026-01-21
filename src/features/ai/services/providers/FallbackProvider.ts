import { createLogger } from '@/core/Logger';
import { SceneType, TechPipeline } from '@/shared/types';
import { generatePseudoDepthMap } from '@/shared/utils';

import type { AIProvider, DepthResult, ImageAnalysis } from '../types';

export class FallbackProvider implements AIProvider {
  private _isAvailable = true;
  readonly providerId = 'fallback';

  async analyzeScene(_base64Image: string): Promise<ImageAnalysis> {
    logger.info('Using fallback analysis');

    return {
      sceneType: SceneType.UNKNOWN,
      estimatedDepthScale: 1.5,
      description: '无法连接AI服务，使用默认设置',
      recommendedFov: 55,
      recommendedPipeline: TechPipeline.DEPTH_MESH,
      reasoning: '离线模式',
      suggestedModel: 'default',
    };
  }

  async dispose(): Promise<void> {
    logger.info('FallbackProvider destroyed');
  }

  async estimateDepth(imageUrl: string): Promise<DepthResult> {
    logger.info('Using fallback depth estimation');

    const depthUrl = await generatePseudoDepthMap(imageUrl);

    return {
      depthUrl,
      method: 'canvas',
      confidence: 0.5,
    };
  }

  async initialize(): Promise<void> {
    logger.info('FallbackProvider initialized');
  }

  get isAvailable(): boolean {
    return this._isAvailable;
  }
}

export const createFallbackProvider = (): AIProvider => new FallbackProvider();
const logger = createLogger({ module: 'FallbackProvider' });
