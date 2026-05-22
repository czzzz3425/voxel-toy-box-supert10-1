import { GoogleGenAI, Type } from '@google/genai';
import type {
  BackendGenerationMode,
  GenerationOptions,
  ModelIntent,
  VoxelData,
} from '../../../types';
import { configureOutboundProxyOnce } from '../networkProxy.js';
import {
  buildModelIntent,
  getIntentPrompt,
  getLLMMessageContent,
  getVoxelPromptFromIntent,
  normalizeModelIntent,
} from './modelCallTypes.js';
import {
  auditExpertVoxelCandidate,
  buildExpertRepairFeedback,
} from './expertValidation.js';

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);
const MAX_GEMINI_RETRIES = 2;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_EXPERT_VOXEL_ATTEMPTS = 2;

type JsonRecord = Record<string, unknown>;

function createGeminiClient() {
  configureOutboundProxyOnce();

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY for server-side Gemini calls.');
  }

  return new GoogleGenAI({ apiKey });
}

function getGeminiModel() {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractErrorStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const value = (error as { status?: unknown }).status;
    if (typeof value === 'number') {
      return value;
    }
  }

  const message = error instanceof Error ? error.message : String(error ?? '');
  const statusMatch = message.match(/"code"\s*:\s*(\d{3})/);
  if (statusMatch) {
    return Number(statusMatch[1]);
  }

  if (message.includes('RESOURCE_EXHAUSTED')) {
    return 429;
  }

  if (message.includes('UNAVAILABLE')) {
    return 503;
  }

  return undefined;
}

function isRetryableGeminiError(error: unknown) {
  const status = extractErrorStatus(error);
  if (status && RETRYABLE_STATUS_CODES.has(status)) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error ?? '');
  return [
    'UNAVAILABLE',
    'high demand',
    'ERR_CONNECTION_CLOSED',
    'fetch failed',
    'ECONNRESET',
    'ETIMEDOUT',
    'socket hang up',
  ].some((token) => message.includes(token));
}

function decorateGeminiError(error: unknown, stage: string) {
  const status = extractErrorStatus(error);
  const rawMessage = error instanceof Error ? error.message : String(error ?? '');

  let message = rawMessage || `Gemini failed during ${stage}.`;
  if (status === 429) {
    message =
      'Gemini request quota is temporarily exhausted. Please wait a moment and retry.';
  } else if (status === 503 || rawMessage.includes('UNAVAILABLE') || rawMessage.includes('high demand')) {
    message = `Gemini is temporarily busy during ${stage}. Please retry in a few seconds.`;
  } else if (
    rawMessage.includes('ERR_CONNECTION_CLOSED') ||
    rawMessage.includes('fetch failed') ||
    rawMessage.includes('ECONNRESET') ||
    rawMessage.includes('ETIMEDOUT')
  ) {
    message = `The connection to Gemini was interrupted during ${stage}. Please retry in a few seconds.`;
  }

  const decorated = new Error(message, { cause: error instanceof Error ? error : undefined });
  Object.assign(decorated, {
    status,
    retryable: isRetryableGeminiError(error),
  });
  return decorated;
}

async function withGeminiRetry<T>(stage: string, operation: () => Promise<T>): Promise<T> {
  let attempt = 0;
  let delayMs = INITIAL_RETRY_DELAY_MS;
  let lastError: unknown;

  while (attempt <= MAX_GEMINI_RETRIES) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetryableGeminiError(error) || attempt === MAX_GEMINI_RETRIES) {
        break;
      }

      await sleep(delayMs);
      delayMs *= 2;
      attempt += 1;
    }
  }

  throw decorateGeminiError(lastError, stage);
}

function getVoxelSchema() {
  return {
    type: Type.OBJECT,
    properties: {
      voxels: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            x: { type: Type.INTEGER },
            y: { type: Type.INTEGER },
            z: { type: Type.INTEGER },
            color: { type: Type.STRING, description: 'Hex color code e.g. #FF5500' },
          },
          required: ['x', 'y', 'z', 'color'],
        },
      },
      complianceReport: {
        type: Type.OBJECT,
        properties: {
          mustHaveFeaturesAddressed: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          forbiddenFeaturesAvoided: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          primaryColorsUsed: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          poseApplied: { type: Type.STRING },
          symmetryApplied: { type: Type.STRING },
          notes: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
      },
    },
    required: ['voxels'],
  };
}

function getIntentSchema() {
  return {
    type: Type.OBJECT,
    properties: {
      subject: { type: Type.STRING },
      style: { type: Type.STRING, enum: ['realistic', 'cartoon', 'abstract'] },
      colorScheme: { type: Type.STRING, enum: ['vibrant', 'pastel', 'monochrome', 'nature'] },
      size: { type: Type.STRING, enum: ['small', 'medium', 'large'] },
      symmetry: { type: Type.STRING, enum: ['none', 'bilateral', 'radial'] },
      voxelBudget: { type: Type.INTEGER },
      silhouetteKeywords: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      structuralRules: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      partBreakdown: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
          },
          required: ['name', 'description'],
        },
      },
      mustHaveFeatures: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      forbiddenFeatures: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      primaryColors: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      pose: { type: Type.STRING },
      proportionRules: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
    required: [
      'subject',
      'style',
      'colorScheme',
      'size',
      'symmetry',
      'voxelBudget',
      'silhouetteKeywords',
      'structuralRules',
      'partBreakdown',
      'mustHaveFeatures',
      'forbiddenFeatures',
      'primaryColors',
      'pose',
      'proportionRules',
    ],
  };
}

function parseJsonResponse<T>(rawText: string | undefined, fallbackMessage: string): T {
  if (!rawText?.trim()) {
    throw new Error(fallbackMessage);
  }

  return JSON.parse(rawText) as T;
}

function isVoxelLike(value: unknown): value is VoxelData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as JsonRecord;
  return (
    typeof record.x === 'number' &&
    Number.isFinite(record.x) &&
    typeof record.y === 'number' &&
    Number.isFinite(record.y) &&
    typeof record.z === 'number' &&
    Number.isFinite(record.z) &&
    (typeof record.color === 'number' || typeof record.color === 'string')
  );
}

function findVoxelArrayDeep(payload: unknown, visited = new Set<unknown>()): VoxelData[] | null {
  if (!payload || visited.has(payload)) {
    return null;
  }

  if (Array.isArray(payload)) {
    if (payload.length > 0 && payload.every(isVoxelLike)) {
      return payload as VoxelData[];
    }

    visited.add(payload);
    for (const item of payload) {
      const nested = findVoxelArrayDeep(item, visited);
      if (nested && nested.length > 0) {
        return nested;
      }
    }

    return null;
  }

  if (typeof payload !== 'object') {
    return null;
  }

  visited.add(payload);
  const record = payload as JsonRecord;
  for (const value of Object.values(record)) {
    const nested = findVoxelArrayDeep(value, visited);
    if (nested && nested.length > 0) {
      return nested;
    }
  }

  return null;
}

function parseVoxelResponse(rawText: string | undefined, fallbackMessage: string): VoxelData[] {
  const payload = parseJsonResponse<unknown>(rawText, fallbackMessage);
  const voxels = findVoxelArrayDeep(payload);
  if (!voxels || voxels.length === 0) {
    throw new Error(fallbackMessage);
  }

  return voxels;
}

export async function callGeminiFastMode(
  systemContext: string,
  prompt: string,
  options?: GenerationOptions
): Promise<{ intent: ModelIntent; voxels: VoxelData[] }> {
  const ai = createGeminiClient();
  const intent = buildModelIntent(prompt, options);
  const response = await withGeminiRetry('fast-mode generation', () =>
    ai.models.generateContent({
      model: getGeminiModel(),
      contents: getLLMMessageContent(systemContext, prompt, options),
      config: {
        responseMimeType: 'application/json',
        responseSchema: getVoxelSchema(),
      },
    })
  );

  const voxels = parseVoxelResponse(
    response.text,
    'Gemini fast mode returned no voxel payload.'
  );

  return { intent, voxels };
}

export async function callGeminiIntent(
  systemContext: string,
  prompt: string,
  options: GenerationOptions
): Promise<ModelIntent> {
  const ai = createGeminiClient();
  const response = await withGeminiRetry('expert-mode intent extraction', () =>
    ai.models.generateContent({
      model: getGeminiModel(),
      contents: getIntentPrompt(systemContext, prompt, options),
      config: {
        responseMimeType: 'application/json',
        responseSchema: getIntentSchema(),
      },
    })
  );

  return parseJsonResponse<ModelIntent>(
    response.text,
    'Gemini intent stage returned no ModelIntent.'
  );
}

export async function callGeminiVoxelFromIntent(
  systemContext: string,
  intent: ModelIntent,
  repairFeedback: string[] = []
): Promise<VoxelData[]> {
  const ai = createGeminiClient();
  const response = await withGeminiRetry('expert-mode voxel generation', () =>
    ai.models.generateContent({
      model: getGeminiModel(),
      contents: getVoxelPromptFromIntent(systemContext, intent, repairFeedback),
      config: {
        responseMimeType: 'application/json',
        responseSchema: getVoxelSchema(),
      },
    })
  );

  return parseVoxelResponse(
    response.text,
    'Gemini voxel stage returned no voxel payload.'
  );
}

export async function generateGeminiVoxelResult(
  systemContext: string,
  prompt: string,
  options: GenerationOptions | undefined,
  mode: BackendGenerationMode,
  useTwoStage: boolean
): Promise<{ voxels: VoxelData[]; intent: ModelIntent; usedTwoStage: boolean }> {
  if (mode === 'expert' || useTwoStage) {
    const safeOptions = options ?? {};
    const rawIntent = await callGeminiIntent(systemContext, prompt, safeOptions);
    const intent = normalizeModelIntent(rawIntent);
    let repairFeedback: string[] = [];
    let bestAudit:
      | ReturnType<typeof auditExpertVoxelCandidate>
      | null = null;

    for (let attempt = 0; attempt < MAX_EXPERT_VOXEL_ATTEMPTS; attempt += 1) {
      const candidateVoxels = await callGeminiVoxelFromIntent(
        systemContext,
        intent,
        repairFeedback
      );
      const audit = auditExpertVoxelCandidate(intent, candidateVoxels);

      if (!bestAudit || audit.score > bestAudit.score) {
        bestAudit = audit;
      }

      if (audit.acceptable) {
        return { voxels: audit.repairedVoxels, intent, usedTwoStage: true };
      }

      repairFeedback = buildExpertRepairFeedback(intent, audit.reasons);
    }

    if (bestAudit) {
      return { voxels: bestAudit.repairedVoxels, intent, usedTwoStage: true };
    }
  }

  const fastResult = await callGeminiFastMode(systemContext, prompt, options);
  return {
    voxels: fastResult.voxels,
    intent: fastResult.intent,
    usedTwoStage: false,
  };
}

export default generateGeminiVoxelResult;
