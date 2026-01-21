import { getEventBus } from '@/core/EventBus';
import { PipelineEvents } from '@/core/EventTypes';
import { createLogger } from '@/core/Logger';

import { AnalyzeStage, DepthStage, PrepareStage, ReadStage } from './stages';
import { ASSET_DEFAULTS, PROGRESS } from './UploadPipeline.constants';

import type {
  CompleteCallback,
  ErrorCallback,
  PipelineProgress,
  PipelineStage,
  ProcessedResult,
  ProgressCallback,
  RecoveryOption,
  StageInput,
  UploadPipeline as UploadPipelineInterface,
} from './types';

export interface PipelineEventEmitter {
  emit(event: string, payload: Record<string, unknown>): void;
}
export interface PipelineOptions {
  eventEmitter?: PipelineEventEmitter;
}

const buildAnalysisResult = (
  analysis: NonNullable<StageInput['analysis']>
): ProcessedResult['analysis'] => ({
  ...analysis,
  estimatedDepthScale: analysis.estimatedDepthScale ?? ASSET_DEFAULTS.DEPTH_SCALE_ESTIMATE,
  depthVariance: analysis.depthVariance ?? ASSET_DEFAULTS.DEPTH_VARIANCE,
  keywords: analysis.keywords ?? [],
});
const buildAsset = (
  stageInput: StageInput,
  imageUrl: string,
  isVideo: boolean
): ProcessedResult['asset'] => {
  const baseAsset = {
    id: crypto.randomUUID(),
    sourceUrl: imageUrl,
    width: (stageInput.metadata?.width as number) ?? ASSET_DEFAULTS.WIDTH,
    height: (stageInput.metadata?.height as number) ?? ASSET_DEFAULTS.HEIGHT,
    aspectRatio: (stageInput.metadata?.aspectRatio as number) ?? ASSET_DEFAULTS.ASPECT_RATIO,
    createdAt: Date.now(),
  };

  if (isVideo) {
    return {
      ...baseAsset,
      type: 'video' as const,
      duration: (stageInput.metadata?.duration as number) ?? ASSET_DEFAULTS.DURATION,
      thumbnailUrl: imageUrl,
      sourceUrl: stageInput.videoUrl ?? imageUrl,
    };
  }

  return { ...baseAsset, type: 'image' as const };
};
const createDefaultEmitter = (): PipelineEventEmitter => ({
  emit: (event, payload) => {
    try {
      getEventBus().emit(event, payload);
    } catch {}
  },
});
const createStageInput = (input: File | string, signal: AbortSignal, runId: string): StageInput => {
  return input instanceof File ? { file: input, signal, runId } : { url: input, signal, runId };
};

export const createUploadPipeline = (options?: PipelineOptions): UploadPipelineImpl =>
  new UploadPipelineImpl(options);
const logger = createLogger({ module: 'UploadPipeline' });

class UploadPipelineImpl implements UploadPipelineInterface {
  private abortController: AbortController | null = null;
  private completeCallbacks = new Set<CompleteCallback>();
  private currentProgress: PipelineProgress = {
    stage: '',
    stageIndex: 0,
    totalStages: 0,
    progress: 0,
    message: '',
  };
  private currentRunId: string | null = null;
  private errorCallbacks = new Set<ErrorCallback>();
  private eventEmitter: PipelineEventEmitter;
  private isCancelled = false;
  private progressCallbacks = new Set<ProgressCallback>();
  private stages: PipelineStage[] = [];
  private startTime = 0;
  constructor(options?: PipelineOptions) {
    this.eventEmitter = options?.eventEmitter ?? createDefaultEmitter();
    this.stages = [new ReadStage(), new AnalyzeStage(), new DepthStage(), new PrepareStage()].sort(
      (a, b) => a.order - b.order
    );
  }
  private buildResult(stageInput: StageInput): ProcessedResult {
    const processingTime = Date.now() - this.startTime;
    const imageUrl = stageInput.imageUrl ?? '';
    const depthUrl = stageInput.depthUrl ?? '';
    const { analysis } = stageInput;

    if (!imageUrl || !depthUrl || !analysis) {
      throw new Error('Pipeline incomplete: missing required output data');
    }
    const result: ProcessedResult = {
      asset: buildAsset(stageInput, imageUrl, !!stageInput.videoUrl),
      analysis: buildAnalysisResult(analysis),
      depthMapUrl: depthUrl,
      imageUrl,
      backgroundUrl: stageInput.backgroundUrl,
      processingTime,
    };

    this.updateProgress({
      stage: 'complete',
      stageIndex: this.stages.length,
      totalStages: this.stages.length,
      progress: PROGRESS.COMPLETE,
      message: 'Processing complete',
    });
    for (const callback of this.completeCallbacks) {
      callback(result);
    }
    this.eventEmitter.emit(PipelineEvents.COMPLETED, { result });

    return result;
  }
  cancel(): void {
    this.isCancelled = true;
    this.abortController?.abort();
  }
  private checkCancellation(): void {
    if (this.isCancelled) {
      this.eventEmitter.emit(PipelineEvents.CANCELLED, {});
      throw new Error('Pipeline cancelled');
    }
  }
  private emitStageComplete(stageName: string, index: number, total: number): void {
    this.eventEmitter.emit(PipelineEvents.STAGE_COMPLETED, {
      stage: stageName,
      progress: Math.round(((index + 1) / total) * PROGRESS.COMPLETE),
    });
  }
  private emitStageStart(stageName: string, index: number, total: number): void {
    this.updateProgress({
      stage: stageName,
      stageIndex: index,
      totalStages: total,
      progress: Math.round((index / total) * PROGRESS.COMPLETE),
      message: `Processing ${stageName}...`,
    });
    this.eventEmitter.emit(PipelineEvents.STAGE_STARTED, {
      stage: stageName,
      progress: this.currentProgress.progress,
    });
  }
  private async executeStages(stageInput: StageInput): Promise<StageInput> {
    const totalStages = this.stages.length;
    let currentInput = stageInput;

    for (let i = 0; i < this.stages.length; i++) {
      this.checkCancellation();
      const stage = this.stages[i];

      if (!stage || stage.canSkip?.(currentInput)) continue;
      this.emitStageStart(stage.name, i, totalStages);
      const output = await stage.execute(currentInput);

      this.checkCancellation();
      if (!output.success) {
        this.handleStageError(stage.name, output.error, currentInput);
      }
      currentInput = output;
      this.emitStageComplete(stage.name, i, totalStages);
    }

    return currentInput;
  }
  getProgress(): PipelineProgress {
    return { ...this.currentProgress };
  }
  private getRecoveryOptions(stageName: string, stageInput?: StageInput): RecoveryOption[] {
    const options: RecoveryOption[] = [];

    options.push({
      label: 'Retry Stage',
      action: async () => {
        if (!stageInput) return;
        logger.info(`Retrying stage: ${stageName}`);
        const stageIndex = this.stages.findIndex((s) => s.name === stageName);

        if (stageIndex === -1) return;
        if (stageInput.file) {
          await this.process(stageInput.file);
        } else if (stageInput.url) {
          await this.process(stageInput.url);
        }
      },
    });
    if (stageName === 'read') {
      options.push({
        label: 'Select Different File',
        action: async () => {
          getEventBus().emit('ui:open-upload', {});
        },
      });
    }

    return options;
  }
  private handleStageError(
    stageName: string,
    error: Error | undefined,
    stageInput: StageInput
  ): never {
    const err = error ?? new Error(`Stage ${stageName} failed`);
    const recoveryOptions = this.getRecoveryOptions(stageName, stageInput);

    for (const callback of this.errorCallbacks) {
      callback(err, stageName, recoveryOptions);
    }
    this.eventEmitter.emit(PipelineEvents.ERROR, {
      stage: stageName,
      error: err.message,
    });
    throw err;
  }
  onComplete(callback: CompleteCallback): () => void {
    this.completeCallbacks.add(callback);

    return () => this.completeCallbacks.delete(callback);
  }
  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback);

    return () => this.errorCallbacks.delete(callback);
  }
  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.add(callback);

    return () => this.progressCallbacks.delete(callback);
  }
  async process(input: File | string): Promise<ProcessedResult> {
    this.isCancelled = false;
    this.startTime = Date.now();
    this.abortController = new AbortController();
    this.currentRunId = crypto.randomUUID();
    const inputType = input instanceof File ? 'file' : 'url';

    this.eventEmitter.emit(PipelineEvents.STARTED, { inputType });
    let stageInput = createStageInput(input, this.abortController.signal, this.currentRunId);

    stageInput = await this.executeStages(stageInput);

    return this.buildResult(stageInput);
  }
  private updateProgress(progress: PipelineProgress): void {
    this.currentProgress = progress;
    for (const callback of this.progressCallbacks) {
      callback(progress);
    }
  }
}

export { UploadPipelineImpl as UploadPipeline };
