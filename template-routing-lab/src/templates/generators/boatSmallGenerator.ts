/**
 * Small Boat Voxel Generator
 *
 * Generates concrete voxel coordinates for exp-boat-small.
 */

export interface BoatSmallConfig {
  color: {
    hull: string;
    deck: string;
    cabin: string;
    windows: string;
    trim: string;
  };
  scale?: {
    hullLength?: number;
    cabinHeight?: number;
    deckWidth?: number;
  };
  cabinVariant?: 'open_deck' | 'small_cabin' | 'rescue_cabin';
}

export interface BoatVoxelCell {
  x: number;
  y: number;
  z: number;
  color: string;
  part: 'hull' | 'deck' | 'cabin' | 'windows' | 'trim' | 'bow' | 'stern';
}

export interface BoatSmallVoxelModel {
  templateId: 'exp-boat-small';
  bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  voxelSize: 1;
  voxels: BoatVoxelCell[];
  palette: BoatSmallConfig['color'];
  editableParts: {
    palette: { editable: true };
    hull: { editable: true; currentLength: number; range: [0.9, 1.2] };
    deck: { editable: true; currentWidth: number; range: [0.85, 1.15] };
    cabin: { editable: true; currentHeight: number; range: [0.8, 1.2] };
    cabinVariant: { editable: true; variants: ['open_deck', 'small_cabin', 'rescue_cabin']; currentVariant: 'open_deck' | 'small_cabin' | 'rescue_cabin' };
  };
  stats: {
    totalVoxels: number;
    partBreakdown: Record<BoatVoxelCell['part'], number>;
  };
}

const BOAT_VOXEL_BUDGET = {
  min: 140,
  max: 210,
} as const;

type BoatPart = BoatVoxelCell['part'];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function keyFor(x: number, y: number, z: number): string {
  return `${x}:${y}:${z}`;
}

function putVoxel(
  map: Map<string, BoatVoxelCell>,
  x: number,
  y: number,
  z: number,
  color: string,
  part: BoatPart
): void {
  map.set(keyFor(x, y, z), { x, y, z, color, part });
}

function addCuboid(
  map: Map<string, BoatVoxelCell>,
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  color: string,
  part: BoatPart
): void {
  for (let x = from.x; x <= to.x; x += 1) {
    for (let y = from.y; y <= to.y; y += 1) {
      for (let z = from.z; z <= to.z; z += 1) {
        putVoxel(map, x, y, z, color, part);
      }
    }
  }
}

function countParts(voxels: BoatVoxelCell[]): Record<BoatVoxelCell['part'], number> {
  const parts: Record<BoatVoxelCell['part'], number> = {
    hull: 0,
    deck: 0,
    cabin: 0,
    windows: 0,
    trim: 0,
    bow: 0,
    stern: 0,
  };
  voxels.forEach((voxel) => {
    parts[voxel.part] += 1;
  });
  return parts;
}

export function generateSmallBoatModel(config: BoatSmallConfig): BoatSmallVoxelModel {
  const { color, scale = {} } = config;
  const hullLength = clamp(scale.hullLength ?? 1.0, 0.9, 1.2);
  const cabinHeight = clamp(scale.cabinHeight ?? 1.0, 0.8, 1.2);
  const deckWidth = clamp(scale.deckWidth ?? 1.0, 0.85, 1.15);
  const cabinVariant = config.cabinVariant ?? 'small_cabin';

  const voxels = new Map<string, BoatVoxelCell>();
  const sternX = hullLength > 1.08 ? 10 : 9;
  const deckYMin = deckWidth > 1.02 ? 1 : 2;
  const deckYMax = deckWidth > 1.02 ? 4 : 3;

  addCuboid(voxels, { x: 1, y: 1, z: 1 }, { x: sternX - 1, y: 4, z: 2 }, color.hull, 'hull');
  addCuboid(voxels, { x: 2, y: 2, z: 0 }, { x: sternX - 2, y: 3, z: 0 }, color.hull, 'hull');
  addCuboid(voxels, { x: 2, y: deckYMin, z: 3 }, { x: sternX - 2, y: deckYMax, z: 3 }, color.deck, 'deck');

  addCuboid(voxels, { x: 0, y: 2, z: 1 }, { x: 1, y: 3, z: 2 }, color.hull, 'bow');
  putVoxel(voxels, 0, 2, 3, color.trim, 'bow');
  putVoxel(voxels, 0, 3, 3, color.trim, 'bow');

  addCuboid(voxels, { x: sternX, y: 1, z: 1 }, { x: sternX, y: 4, z: 2 }, color.hull, 'stern');
  addCuboid(voxels, { x: sternX - 1, y: 1, z: 3 }, { x: sternX, y: 4, z: 3 }, color.trim, 'trim');

  addCuboid(voxels, { x: 1, y: 0, z: 2 }, { x: sternX - 1, y: 0, z: 3 }, color.trim, 'trim');
  addCuboid(voxels, { x: 1, y: 5, z: 2 }, { x: sternX - 1, y: 5, z: 3 }, color.trim, 'trim');

  if (cabinVariant !== 'open_deck') {
    const cabinTop = cabinHeight > 1.05 ? 5 : 4;
    addCuboid(voxels, { x: 4, y: 2, z: 4 }, { x: 6, y: 3, z: cabinTop }, color.cabin, 'cabin');
    addCuboid(voxels, { x: 4, y: 2, z: 5 }, { x: 6, y: 2, z: cabinTop }, color.windows, 'windows');
    addCuboid(voxels, { x: 4, y: 3, z: 5 }, { x: 6, y: 3, z: cabinTop }, color.windows, 'windows');

    if (cabinVariant === 'rescue_cabin') {
      putVoxel(voxels, 5, 2, cabinTop + 1, color.trim, 'trim');
      putVoxel(voxels, 5, 3, cabinTop + 1, color.trim, 'trim');
    }
  } else {
    addCuboid(voxels, { x: 4, y: 2, z: 4 }, { x: 6, y: 3, z: 4 }, color.trim, 'trim');
  }

  const voxelArray = Array.from(voxels.values()).sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x;
    if (a.y !== b.y) return a.y - b.y;
    return a.z - b.z;
  });

  if (voxelArray.length < BOAT_VOXEL_BUDGET.min || voxelArray.length > BOAT_VOXEL_BUDGET.max) {
    throw new Error(
      `Generated boat voxel count ${voxelArray.length} is out of budget range ` +
      `[${BOAT_VOXEL_BUDGET.min}, ${BOAT_VOXEL_BUDGET.max}].`
    );
  }

  const maxX = voxelArray.reduce((max, voxel) => Math.max(max, voxel.x), 0);
  const maxY = voxelArray.reduce((max, voxel) => Math.max(max, voxel.y), 0);
  const maxZ = voxelArray.reduce((max, voxel) => Math.max(max, voxel.z), 0);

  return {
    templateId: 'exp-boat-small',
    bounds: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: maxX, y: maxY, z: maxZ },
    },
    voxelSize: 1,
    voxels: voxelArray,
    palette: color,
    editableParts: {
      palette: { editable: true },
      hull: { editable: true, currentLength: hullLength, range: [0.9, 1.2] },
      deck: { editable: true, currentWidth: deckWidth, range: [0.85, 1.15] },
      cabin: { editable: true, currentHeight: cabinHeight, range: [0.8, 1.2] },
      cabinVariant: {
        editable: true,
        variants: ['open_deck', 'small_cabin', 'rescue_cabin'],
        currentVariant: cabinVariant,
      },
    },
    stats: {
      totalVoxels: voxelArray.length,
      partBreakdown: countParts(voxelArray),
    },
  };
}

export function generateSmallBoat(config: BoatSmallConfig): string {
  return JSON.stringify(generateSmallBoatModel(config));
}

export const SMALL_BOAT_PRESETS: Record<string, BoatSmallConfig> = {
  fishing_boat: {
    color: {
      hull: '#2d6cdf',
      deck: '#f0f0e6',
      cabin: '#ffffff',
      windows: '#83cbe8',
      trim: '#1c335f',
    },
    cabinVariant: 'small_cabin',
  },
  rescue_boat: {
    color: {
      hull: '#e23d2f',
      deck: '#f8f8ef',
      cabin: '#ffffff',
      windows: '#8bd2ff',
      trim: '#f6c23e',
    },
    cabinVariant: 'rescue_cabin',
  },
};
