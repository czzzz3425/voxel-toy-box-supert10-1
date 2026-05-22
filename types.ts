/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import type * as THREE from 'three';

export enum AppState {
  STABLE = 'STABLE',
  DISMANTLING = 'DISMANTLING',
  REBUILDING = 'REBUILDING'
}

// Bian: align backend generation options with the advanced frontend params.
export interface GenerationOptions {
  style?: 'realistic' | 'cartoon' | 'abstract';
  colorScheme?: 'vibrant' | 'pastel' | 'monochrome' | 'nature';
  size?: 'small' | 'medium' | 'large';
  symmetry?: 'none' | 'bilateral' | 'radial';
}

export type BackendGenerationMode = 'fast' | 'expert';

export interface GenerationStats {
  voxelCount: number;
  colorCount: number;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  repaired: boolean;
  removedVoxelCount?: number;
}

// Bian: first-stage structured intent for more controllable voxel generation.
export interface ModelIntent {
  subject: string;
  style: NonNullable<GenerationOptions['style']>;
  colorScheme: NonNullable<GenerationOptions['colorScheme']>;
  size: NonNullable<GenerationOptions['size']>;
  symmetry: NonNullable<GenerationOptions['symmetry']>;
  voxelBudget: number;
  silhouetteKeywords: string[];
  structuralRules: string[];
  partBreakdown: Array<{
    name: string;
    description: string;
  }>;
  mustHaveFeatures: string[];
  forbiddenFeatures: string[];
  primaryColors: string[];
  pose: string;
  proportionRules: string[];
}

export interface LegoApiCallRequest {
  systemContext: string;
  prompt: string;
  // Bian: accept advanced frontend controls without breaking the old prompt-only flow.
  options?: GenerationOptions;
  params?: GenerationOptions;
  mode?: BackendGenerationMode | 'quick';
  useTwoStage?: boolean;
}
export interface VoxelData {
  x: number;
  y: number;
  z: number;
  color: number;
}

export interface SimulationVoxel {
  id: number;
  x: number;
  y: number;
  z: number;
  color: THREE.Color;
  // Physics state
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  rvx: number;
  rvy: number;
  rvz: number;
}

export interface RebuildTarget {
  x: number;
  y: number;
  z: number;
  delay: number;
  isRubble?: boolean;
}

export interface SavedModel {
  name: string;
  data: VoxelData[];
  baseModel?: string;
}

export interface GenerationMetadata {
  voxelCount: number;
  colorCount: number;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  warnings?: string[];
}

export interface TemplateMatchResult {
  matched: boolean;
  templateName?: string;
  confidence?: number;
  templateInfo?: string;
}

export interface VoxelValidationResult {
  voxels: VoxelData[];
  warnings: string[];
  stats: GenerationStats;
}

export interface BackendGenerationResponse {
  success: boolean;
  voxels?: VoxelData[];
  warnings: string[];
  stats?: GenerationStats;
  metadata?: GenerationMetadata;
  templateMatch?: TemplateMatchResult;
  databaseReport?: DatabaseReport;
  mode: BackendGenerationMode;
  usedTwoStage: boolean;
  intent?: ModelIntent;
  error?: string;
  errorCode?: string;
}

export interface DatabaseHealthStatus {
  ok: boolean;
  mode: 'postgres' | 'embedded' | 'noop';
  message: string;
}

export interface DatabaseReport {
  health: DatabaseHealthStatus;
  write: {
    ok: boolean;
    message?: string;
  };
}

export interface MVPRequest {
  prompt: string;
}

export interface MVPResponse {
  success: boolean;
  voxels?: VoxelData[];
  error?: string;
}
