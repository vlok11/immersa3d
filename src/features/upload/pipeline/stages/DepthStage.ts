import { createLogger } from '@/core/Logger';
import { getAIService } from '@/features/ai/services';

import type { PipelineStage, StageInput, StageOutput } from '../types';

export class DepthStage implements PipelineStage {
  readonly name = 'depth';
  readonly order = 2;
  canSkip(input: StageInput): boolean {
    return input.depthUrl !== undefined;
  }
  async execute(input: StageInput): Promise<StageOutput> {
    try {
      throwIfAborted(input.signal);
      if (!input.imageUrl) {
        throw new Error('No image URL available for depth estimation');
      }
      const aiService = getAIService();

      if (!aiService.isAvailable()) {
        await aiService.initialize();
      }
      throwIfAborted(input.signal);
      const depthResult = await aiService.estimateDepth(input.imageUrl);

      throwIfAborted(input.signal);

      return {
        ...input,
        depthUrl: depthResult.depthUrl,
        metadata: { ...input.metadata, depthMethod: depthResult.method },
        success: true,
      };
    } catch (error) {
      logger.error('Depth estimation failed', { error });

      return {
        ...input,
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}

const logger = createLogger({ module: 'DepthStage' });
const throwIfAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) {
    throw new Error('Aborted');
  }
};
