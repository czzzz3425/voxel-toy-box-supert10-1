import type { GenerationStats, ModelIntent, VoxelData } from '../../../types';
import { validateAndRepairVoxelArray } from '../voxelPostprocess.js';

const EXPECTED_SIZE_LIMITS: Record<
  ModelIntent['size'],
  { minDimension: number; maxDimension: number; minHeight: number }
> = {
  small: { minDimension: 2, maxDimension: 8, minHeight: 2 },
  medium: { minDimension: 3, maxDimension: 14, minHeight: 3 },
  large: { minDimension: 4, maxDimension: 20, minHeight: 4 },
};

const MAX_EXPERT_REPAIR_REASONS = 8;

export type ExpertVoxelAudit = {
  acceptable: boolean;
  score: number;
  repairedVoxels: VoxelData[];
  stats: GenerationStats;
  warnings: string[];
  reasons: string[];
};

function hexToRgbInt(hex: string) {
  const normalized = hex.trim().replace(/^#/, '');
  if (!/^[0-9A-Fa-f]{6}$/.test(normalized)) {
    return null;
  }

  return Number.parseInt(normalized, 16);
}

function colorDistance(a: number, b: number) {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;

  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2);
}

function computeBilateralSymmetryScore(voxels: VoxelData[]) {
  if (voxels.length === 0) {
    return 0;
  }

  const coordSet = new Set(voxels.map((voxel) => `${voxel.x},${voxel.y},${voxel.z}`));
  let matched = 0;

  voxels.forEach((voxel) => {
    if (coordSet.has(`${-voxel.x},${voxel.y},${voxel.z}`)) {
      matched += 1;
    }
  });

  return matched / voxels.length;
}

function computeRadialSymmetryScore(voxels: VoxelData[]) {
  if (voxels.length === 0) {
    return 0;
  }

  const coordSet = new Set(voxels.map((voxel) => `${voxel.x},${voxel.y},${voxel.z}`));
  let matched = 0;

  voxels.forEach((voxel) => {
    if (coordSet.has(`${-voxel.x},${voxel.y},${-voxel.z}`)) {
      matched += 1;
    }
  });

  return matched / voxels.length;
}

function getPaletteAlignment(uniqueColors: number[], primaryColors: string[]) {
  const palette = primaryColors
    .map((color) => hexToRgbInt(color))
    .filter((color): color is number => color !== null);

  if (palette.length === 0 || uniqueColors.length === 0) {
    return { score: 1, colorOverflow: 0 };
  }

  const threshold = 92;
  const aligned = uniqueColors.filter((candidate) =>
    palette.some((target) => colorDistance(candidate, target) <= threshold)
  );

  return {
    score: aligned.length / uniqueColors.length,
    colorOverflow: Math.max(0, uniqueColors.length - (palette.length + 2)),
  };
}

function addReason(reasons: string[], reason: string) {
  if (!reasons.includes(reason) && reasons.length < MAX_EXPERT_REPAIR_REASONS) {
    reasons.push(reason);
  }
}

export function auditExpertVoxelCandidate(
  intent: ModelIntent,
  rawVoxels: VoxelData[]
): ExpertVoxelAudit {
  const repaired = validateAndRepairVoxelArray(rawVoxels, intent.voxelBudget);
  const { voxels, warnings, stats } = repaired;
  const reasons: string[] = [];
  let score = 1;

  if (voxels.length === 0) {
    addReason(reasons, 'The result produced no valid voxels.');
    return {
      acceptable: false,
      score: 0,
      repairedVoxels: voxels,
      stats,
      warnings,
      reasons,
    };
  }

  const minExpectedVoxels = Math.max(24, Math.floor(intent.voxelBudget * 0.35));
  if (voxels.length < minExpectedVoxels) {
    addReason(
      reasons,
      `The model is too sparse at ${voxels.length} voxels. Target a fuller silhouette closer to ${intent.voxelBudget} voxels.`
    );
    score -= 0.18;
  }

  if (voxels.length > intent.voxelBudget + 40) {
    addReason(
      reasons,
      `The model exceeds the voxel budget with ${voxels.length} voxels. Stay at or below ${intent.voxelBudget + 40}.`
    );
    score -= 0.18;
  }

  const sizeLimits = EXPECTED_SIZE_LIMITS[intent.size];
  const { width, height, depth } = stats.dimensions;
  if (
    width > sizeLimits.maxDimension ||
    height > sizeLimits.maxDimension ||
    depth > sizeLimits.maxDimension
  ) {
    addReason(
      reasons,
      `The overall dimensions ${width}x${height}x${depth} are too large for ${intent.size} size.`
    );
    score -= 0.15;
  }

  const largestFootprint = Math.max(width, depth);
  if (largestFootprint < sizeLimits.minDimension || height < sizeLimits.minHeight) {
    addReason(
      reasons,
      `The overall dimensions ${width}x${height}x${depth} are too small to read clearly for ${intent.size} size.`
    );
    score -= 0.12;
  }

  const disconnectedWarning = warnings.find((warning) => warning.includes('disconnected'));
  if (disconnectedWarning) {
    addReason(
      reasons,
      'The structure included disconnected fragments. Keep all major parts in one grounded connected form.'
    );
    score -= 0.2;
  }

  if (intent.symmetry === 'bilateral') {
    const symmetryScore = computeBilateralSymmetryScore(voxels);
    if (symmetryScore < 0.58) {
      addReason(
        reasons,
        `Bilateral symmetry is too weak with a mirror score of ${symmetryScore.toFixed(2)}.`
      );
      score -= 0.14;
    }
  }

  if (intent.symmetry === 'radial') {
    const symmetryScore = computeRadialSymmetryScore(voxels);
    if (symmetryScore < 0.5) {
      addReason(
        reasons,
        `Radial balance is too weak with a rotational symmetry score of ${symmetryScore.toFixed(2)}.`
      );
      score -= 0.14;
    }
  }

  const uniqueColors = Array.from(new Set(voxels.map((voxel) => voxel.color)));
  const paletteAlignment = getPaletteAlignment(uniqueColors, intent.primaryColors);
  if (paletteAlignment.score < 0.55) {
    addReason(
      reasons,
      `The palette drifted too far from the requested primary colors ${intent.primaryColors.join(', ')}.`
    );
    score -= 0.14;
  }

  if (paletteAlignment.colorOverflow > 0) {
    addReason(
      reasons,
      `Too many extra colors were used. Keep the palette closer to the requested primary colors ${intent.primaryColors.join(', ')}.`
    );
    score -= 0.1;
  }

  const acceptable = reasons.length === 0;

  return {
    acceptable,
    score: Math.max(0, Number(score.toFixed(2))),
    repairedVoxels: voxels,
    stats,
    warnings,
    reasons,
  };
}

export function buildExpertRepairFeedback(intent: ModelIntent, reasons: string[]) {
  const feedback = [...reasons];

  if (intent.mustHaveFeatures.length > 0) {
    feedback.push(
      `Make these must-have features obvious in the silhouette and major masses: ${intent.mustHaveFeatures.join(', ')}.`
    );
  }

  if (intent.forbiddenFeatures.length > 0) {
    feedback.push(
      `Avoid these forbidden traits: ${intent.forbiddenFeatures.join(', ')}.`
    );
  }

  if (intent.pose) {
    feedback.push(`Preserve this pose: ${intent.pose}.`);
  }

  if (intent.proportionRules.length > 0) {
    feedback.push(
      `Honor these proportion rules: ${intent.proportionRules.join(' | ')}.`
    );
  }

  return feedback.slice(0, MAX_EXPERT_REPAIR_REASONS);
}
