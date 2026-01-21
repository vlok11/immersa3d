import { createLogger } from '@/core/Logger';

import type { AIProvider, DepthResult } from '../types';
import type { AnalysisResult, SceneType, TechPipeline } from '@/shared/types';

export class GeminiProvider implements AIProvider {
  private _isAvailable = false;
  private client: GoogleGenAIClient | null = null;
  readonly providerId = 'gemini';
  async analyzeScene(base64Image: string): Promise<ImageAnalysis> {
    if (!this.client) {
      throw new Error('Gemini client not initialized');
    }
    try {
      const base64Data = base64Image.includes(',')
        ? (base64Image.split(',')[1] ?? base64Image)
        : base64Image;
      const configuredModel = import.meta.env.VITE_GEMINI_MODEL?.trim();
      const model =
        configuredModel && configuredModel.length > 0 ? configuredModel : 'gemini-1.5-flash';
      const result = await this.client.models.generateContent({
        model,
        contents: [
          { text: ANALYSIS_PROMPT },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data,
            },
          },
        ],
      });
      let { text } = result;

      if (!text) {
        throw new Error('Gemini 未返回任何响应');
      }
      text = text.replace(/```json\s*|\s*```/g, '').trim();
      const parsed = JSON.parse(text) as {
        description: string;
        estimatedDepthScale: number;
        reasoning: string;
        recommendedFov: number;
        recommendedPipeline: string;
        sceneType: string;
        suggestedModel: string;
      };

      return {
        sceneType: parsed.sceneType as SceneType,
        description: parsed.description,
        reasoning: parsed.reasoning,
        estimatedDepthScale: parsed.estimatedDepthScale,
        recommendedFov: parsed.recommendedFov,
        recommendedPipeline: parsed.recommendedPipeline as TechPipeline,
        suggestedModel: parsed.suggestedModel,
      };
    } catch (error) {
      logger.error('Gemini analysis failed', { error: String(error) });
      throw error;
    }
  }
  async dispose(): Promise<void> {
    this.client = null;
    this._isAvailable = false;
    logger.info('GeminiProvider destroyed');
  }
  async estimateDepth(_imageUrl: string): Promise<DepthResult> {
    throw new Error('Gemini does not support depth estimation');
  }
  async initialize(): Promise<void> {
    const allowInProd = import.meta.env.VITE_GEMINI_ENABLE_IN_PROD === 'true';

    if (import.meta.env.PROD && !allowInProd) {
      logger.warn('Gemini 在生产环境默认禁用');
      this._isAvailable = false;

      return;
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const baseUrl = import.meta.env.VITE_GEMINI_BASE_URL?.trim();
    const apiVersion = import.meta.env.VITE_GEMINI_API_VERSION?.trim();

    if (!apiKey) {
      logger.warn('Gemini API Key 未配置');
      this._isAvailable = false;

      return;
    }
    try {
      const moduleName = '@google/genai';
      const module = await import(moduleName).catch(() => null);

      if (!module) {
        logger.warn('Gemini SDK not installed');
        this._isAvailable = false;

        return;
      }
      const { GoogleGenAI } = module;
      const httpOptions =
        baseUrl && (baseUrl.startsWith('http://') || baseUrl.startsWith('https://'))
          ? { baseUrl }
          : undefined;

      if (baseUrl && !httpOptions) {
        logger.warn('VITE_GEMINI_BASE_URL 格式不正确，已忽略');
      }
      const normalizedApiVersion = apiVersion && apiVersion.length > 0 ? apiVersion : undefined;

      this.client = new GoogleGenAI({
        apiKey,
        apiVersion: normalizedApiVersion,
        httpOptions,
      }) as GoogleGenAIClient;
      this._isAvailable = true;
      logger.info('GeminiProvider initialized');
    } catch (error) {
      logger.error('Failed to initialize Gemini', { error: String(error) });
      this._isAvailable = false;
    }
  }
  get isAvailable(): boolean {
    return this._isAvailable;
  }
}

type ImageAnalysis = AnalysisResult;

interface GenerateContentResponse {
  text: string;
}
interface GoogleGenAIClient {
  models: GoogleGenAIModels;
}
interface GoogleGenAIModels {
  generateContent(params: {
    contents: {
      inlineData?: {
        data: string;
        mimeType: string;
      };
      text?: string;
    }[];
    model: string;
  }): Promise<GenerateContentResponse>;
}

const ANALYSIS_PROMPT = `Analyze this image and provide a JSON response with the following structure:
{
  "sceneType": "INDOOR" | "OUTDOOR" | "OBJECT" | "UNKNOWN",
  "description": "Brief description of the scene",
  "reasoning": "Why you chose this scene type",
  "estimatedDepthScale": number between 0.5 and 5,
  "recommendedFov": number between 30 and 90,
  "recommendedPipeline": "DEPTH_MESH" | "GAUSSIAN_SPLAT" | "GENERATIVE_MESH",
  "suggestedModel": "default" | "portrait" | "landscape"
}

Consider:
- Scene depth and complexity
- Whether it's a close-up object or wide scene
- Lighting conditions
- Best projection mode for 3D effect`;

export const createGeminiProvider = (): AIProvider => new GeminiProvider();
const logger = createLogger({ module: 'GeminiProvider' });
