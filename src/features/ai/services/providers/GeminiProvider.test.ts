import { afterEach, describe, expect, it, vi } from 'vitest';

import { GeminiProvider } from './GeminiProvider';

function stubGeminiEnv(values: Partial<Record<string, string>>) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      continue;
    }
    vi.stubEnv(key, value);
  }
}

vi.mock('@google/genai', () => {
  const generateContent = vi.fn();
  const GoogleGenAI = vi.fn(function (
    this: {
      models: unknown;
    },
    _opts: unknown
  ) {
    this.models = { generateContent };
  });

  return { GoogleGenAI, __test: { generateContent } };
});
describe('GeminiProvider', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });
  it('initializes with httpOptions.baseUrl when VITE_GEMINI_BASE_URL is valid', async () => {
    stubGeminiEnv({
      VITE_GEMINI_API_KEY: 'test-key',
      VITE_GEMINI_BASE_URL: 'http://127.0.0.1:8045',
      VITE_GEMINI_API_VERSION: 'v1beta',
    });
    const provider = new GeminiProvider();

    await provider.initialize();
    const { GoogleGenAI } = (await import('@google/genai')) as unknown as {
      GoogleGenAI: ReturnType<typeof vi.fn>;
    };

    expect(GoogleGenAI).toHaveBeenCalledTimes(1);
    expect(GoogleGenAI).toHaveBeenCalledWith({
      apiKey: 'test-key',
      apiVersion: 'v1beta',
      httpOptions: { baseUrl: 'http://127.0.0.1:8045' },
    });
    expect(provider.isAvailable).toBe(true);
  });
  it('ignores invalid VITE_GEMINI_BASE_URL values', async () => {
    stubGeminiEnv({
      VITE_GEMINI_API_KEY: 'test-key',
      VITE_GEMINI_BASE_URL: 'ftp://127.0.0.1:8045',
    });
    const provider = new GeminiProvider();

    await provider.initialize();
    const { GoogleGenAI } = (await import('@google/genai')) as unknown as {
      GoogleGenAI: ReturnType<typeof vi.fn>;
    };

    expect(GoogleGenAI).toHaveBeenCalledTimes(1);
    expect(GoogleGenAI).toHaveBeenCalledWith({
      apiKey: 'test-key',
      apiVersion: undefined,
      httpOptions: undefined,
    });
  });
  it('uses VITE_GEMINI_MODEL for analyzeScene calls', async () => {
    stubGeminiEnv({
      VITE_GEMINI_API_KEY: 'test-key',
      VITE_GEMINI_MODEL: 'gemini-3-pro-low',
    });
    const provider = new GeminiProvider();

    await provider.initialize();
    const { __test: testHooks } = (await import('@google/genai')) as unknown as {
      __test: {
        generateContent: ReturnType<typeof vi.fn>;
      };
    };
    const { generateContent: mockGenerateContent } = testHooks;

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        sceneType: 'INDOOR',
        description: 'demo',
        reasoning: 'demo',
        estimatedDepthScale: 1,
        recommendedFov: 60,
        recommendedPipeline: 'DEPTH_MESH',
        suggestedModel: 'default',
      }),
    });
    await provider.analyzeScene('data:image/jpeg;base64,abcd==');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const callArg = mockGenerateContent.mock.calls[0]?.[0];

    expect(callArg.model).toBe('gemini-3-pro-low');
    expect(callArg.contents?.[1]?.inlineData?.data).toBe('abcd==');
  });
});
