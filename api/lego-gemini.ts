import type {
  BackendGenerationMode,
  BackendGenerationResponse,
  GenerationOptions,
  LegoApiCallRequest,
} from '../types';
import generateGeminiVoxelResult from './lib/generation/gemini.js';
import { inferTemplateMatch } from './lib/templateMatcher.js';
import {
  calculateMetadataFromVoxels,
  validateAndRepairVoxelArray,
} from './lib/voxelPostprocess.js';
import { saveGenerationRecord } from './lib/saveGeneration.js';

type VercelLikeRequest = {
  method?: string;
  body?: LegoApiCallRequest | string | null;
};

function parseRequestBody(body: VercelLikeRequest['body']): LegoApiCallRequest {
  if (!body) {
    return {} as LegoApiCallRequest;
  }

  if (typeof body === 'string') {
    return JSON.parse(body) as LegoApiCallRequest;
  }

  return body;
}

function resolveMode(
  requestedMode: LegoApiCallRequest['mode'],
  options?: GenerationOptions
): BackendGenerationMode {
  if (requestedMode === 'expert') return 'expert';
  if (requestedMode === 'quick' || requestedMode === 'fast') return 'fast';
  return options ? 'expert' : 'fast';
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown backend generation error.';
}

function getErrorStatus(error: unknown) {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const value = (error as { status?: unknown }).status;
    if (typeof value === 'number') {
      return value;
    }
  }

  return 500;
}

function getErrorCode(error: unknown) {
  const status = getErrorStatus(error);
  if (status === 429) {
    return 'RATE_LIMITED';
  }

  if (status === 503) {
    return 'MODEL_UNAVAILABLE';
  }

  return 'GEMINI_GENERATION_FAILED';
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const data = parseRequestBody(req.body);
    const { systemContext = '', prompt, options, params, useTwoStage } = data;
    const generationOptions = options ?? params;

    if (!prompt?.trim()) {
      const badRequest: BackendGenerationResponse = {
        success: false,
        warnings: [],
        error: 'prompt is required',
        errorCode: 'BAD_REQUEST',
        mode: 'fast',
        usedTwoStage: false,
      };
      return res.status(400).json(badRequest);
    }

    const mode = resolveMode(data.mode, generationOptions);
    const shouldUseTwoStage = useTwoStage ?? mode === 'expert';

    const { voxels: rawVoxels, intent, usedTwoStage } =
      await generateGeminiVoxelResult(
        systemContext,
        prompt,
        generationOptions,
        mode,
        shouldUseTwoStage
      );

    const postprocess = validateAndRepairVoxelArray(rawVoxels, intent.voxelBudget);
    const metadata = calculateMetadataFromVoxels(postprocess.voxels, postprocess.warnings);
    const templateMatch = inferTemplateMatch(prompt, intent);

    const response: BackendGenerationResponse = {
      success: true,
      voxels: postprocess.voxels,
      warnings: postprocess.warnings,
      stats: postprocess.stats,
      metadata,
      templateMatch,
      databaseReport: await saveGenerationRecord({
        prompt,
        options: generationOptions ?? {},
        success: true,
        voxelCount: metadata.voxelCount,
        colorCount: metadata.colorCount,
        warnings: postprocess.warnings,
        templateMatch,
      }),
      mode,
      usedTwoStage,
      intent,
    };

    return res.status(200).json(response);
  } catch (error) {
    const message = getErrorMessage(error);
    const status = getErrorStatus(error);
    const errorCode = getErrorCode(error);
    const fallbackBody = parseRequestBody(req.body);

    const databaseReport = await saveGenerationRecord({
      prompt: fallbackBody?.prompt ?? '',
      options: fallbackBody?.options ?? fallbackBody?.params ?? {},
      success: false,
      voxelCount: 0,
      colorCount: 0,
      warnings: ['Backend generation failed before a valid voxel result was produced.'],
      templateMatch: null,
      error: message,
    });

    const response: BackendGenerationResponse = {
      success: false,
      warnings: ['The backend request failed before a valid voxel result was produced.'],
      error: message,
      errorCode,
      databaseReport,
      mode: 'fast',
      usedTwoStage: false,
    };

    return res.status(status).json(response);
  }
}
