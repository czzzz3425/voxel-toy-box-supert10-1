/**
 * Low Turtle Voxel Generator
 *
 * Generates concrete voxel coordinates for exp-turtle-low.
 */

export interface TurtleLowConfig {
  color: {
    shell: string;
    body: string;
    belly: string;
    eyes: string;
  };
  scale?: {
    shellHeight?: number;
    headLength?: number;
    flipperSize?: number;
  };
  shellPattern?: 'plain' | 'ridge' | 'spotted';
}

export interface TurtleVoxelCell {
  x: number;
  y: number;
  z: number;
  color: string;
  part: 'shell' | 'body' | 'belly' | 'head' | 'legs' | 'tail' | 'eyes' | 'pattern';
}

export interface TurtleLowVoxelModel {
  templateId: 'exp-turtle-low';
  bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  voxelSize: 1;
  voxels: TurtleVoxelCell[];
  palette: TurtleLowConfig['color'];
  editableParts: {
    palette: { editable: true };
    shell: { editable: true; currentHeight: number; range: [0.9, 1.2] };
    head: { editable: true; currentLength: number; range: [0.8, 1.2] };
    legs: { editable: true; currentSize: number; range: [0.8, 1.2] };
    shellPattern: { editable: true; variants: ['plain', 'ridge', 'spotted']; currentVariant: 'plain' | 'ridge' | 'spotted' };
  };
  stats: {
    totalVoxels: number;
    partBreakdown: Record<TurtleVoxelCell['part'], number>;
  };
}

const TURTLE_VOXEL_BUDGET = {
  min: 130,
  max: 195,
} as const;

type TurtlePart = TurtleVoxelCell['part'];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function keyFor(x: number, y: number, z: number): string {
  return `${x}:${y}:${z}`;
}

function putVoxel(
  map: Map<string, TurtleVoxelCell>,
  x: number,
  y: number,
  z: number,
  color: string,
  part: TurtlePart
): void {
  map.set(keyFor(x, y, z), { x, y, z, color, part });
}

function addCuboid(
  map: Map<string, TurtleVoxelCell>,
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  color: string,
  part: TurtlePart
): void {
  for (let x = from.x; x <= to.x; x += 1) {
    for (let y = from.y; y <= to.y; y += 1) {
      for (let z = from.z; z <= to.z; z += 1) {
        putVoxel(map, x, y, z, color, part);
      }
    }
  }
}

function countParts(voxels: TurtleVoxelCell[]): Record<TurtleVoxelCell['part'], number> {
  const parts: Record<TurtleVoxelCell['part'], number> = {
    shell: 0,
    body: 0,
    belly: 0,
    head: 0,
    legs: 0,
    tail: 0,
    eyes: 0,
    pattern: 0,
  };
  voxels.forEach((voxel) => {
    parts[voxel.part] += 1;
  });
  return parts;
}

export function generateLowTurtleModel(config: TurtleLowConfig): TurtleLowVoxelModel {
  const { color, scale = {} } = config;
  const shellHeight = clamp(scale.shellHeight ?? 1.0, 0.9, 1.2);
  const headLength = clamp(scale.headLength ?? 1.0, 0.8, 1.2);
  const flipperSize = clamp(scale.flipperSize ?? 1.0, 0.8, 1.2);
  const shellPattern = config.shellPattern ?? 'ridge';

  const voxels = new Map<string, TurtleVoxelCell>();

  addCuboid(voxels, { x: 0, y: 1, z: 1 }, { x: 7, y: 5, z: 3 }, color.shell, 'shell');
  addCuboid(voxels, { x: 1, y: 2, z: 0 }, { x: 6, y: 4, z: 0 }, color.belly, 'belly');
  addCuboid(voxels, { x: 2, y: 2, z: 4 }, { x: 5, y: 4, z: 4 }, color.shell, 'shell');

  if (shellHeight > 1.05) {
    addCuboid(voxels, { x: 3, y: 2, z: 5 }, { x: 4, y: 4, z: 5 }, color.shell, 'shell');
  }

  addCuboid(voxels, { x: 8, y: 2, z: 1 }, { x: 9, y: 4, z: 2 }, color.body, 'head');
  if (headLength > 1.05) {
    addCuboid(voxels, { x: 10, y: 2, z: 1 }, { x: 10, y: 4, z: 2 }, color.body, 'head');
  }
  putVoxel(voxels, 9, 2, 3, color.eyes, 'eyes');
  putVoxel(voxels, 9, 4, 3, color.eyes, 'eyes');

  const legWidth = flipperSize > 1.05 ? 2 : 1;
  addCuboid(voxels, { x: 1, y: 0, z: 0 }, { x: 1 + legWidth, y: 1, z: 1 }, color.body, 'legs');
  addCuboid(voxels, { x: 1, y: 5, z: 0 }, { x: 1 + legWidth, y: 6, z: 1 }, color.body, 'legs');
  addCuboid(voxels, { x: 5, y: 0, z: 0 }, { x: 5 + legWidth, y: 1, z: 1 }, color.body, 'legs');
  addCuboid(voxels, { x: 5, y: 5, z: 0 }, { x: 5 + legWidth, y: 6, z: 1 }, color.body, 'legs');

  putVoxel(voxels, -1, 3, 1, color.body, 'tail');
  putVoxel(voxels, -1, 3, 2, color.body, 'tail');

  if (shellPattern === 'ridge') {
    addCuboid(voxels, { x: 2, y: 3, z: 4 }, { x: 5, y: 3, z: 4 }, color.body, 'pattern');
    addCuboid(voxels, { x: 3, y: 2, z: 4 }, { x: 4, y: 4, z: 4 }, color.body, 'pattern');
  } else if (shellPattern === 'spotted') {
    putVoxel(voxels, 2, 2, 4, color.body, 'pattern');
    putVoxel(voxels, 5, 2, 4, color.body, 'pattern');
    putVoxel(voxels, 2, 4, 4, color.body, 'pattern');
    putVoxel(voxels, 5, 4, 4, color.body, 'pattern');
  }

  const voxelArray = Array.from(voxels.values()).sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x;
    if (a.y !== b.y) return a.y - b.y;
    return a.z - b.z;
  });

  if (voxelArray.length < TURTLE_VOXEL_BUDGET.min || voxelArray.length > TURTLE_VOXEL_BUDGET.max) {
    throw new Error(
      `Generated turtle voxel count ${voxelArray.length} is out of budget range ` +
      `[${TURTLE_VOXEL_BUDGET.min}, ${TURTLE_VOXEL_BUDGET.max}].`
    );
  }

  const maxX = voxelArray.reduce((max, voxel) => Math.max(max, voxel.x), 0);
  const maxY = voxelArray.reduce((max, voxel) => Math.max(max, voxel.y), 0);
  const maxZ = voxelArray.reduce((max, voxel) => Math.max(max, voxel.z), 0);

  return {
    templateId: 'exp-turtle-low',
    bounds: {
      min: { x: -1, y: 0, z: 0 },
      max: { x: maxX, y: maxY, z: maxZ },
    },
    voxelSize: 1,
    voxels: voxelArray,
    palette: color,
    editableParts: {
      palette: { editable: true },
      shell: { editable: true, currentHeight: shellHeight, range: [0.9, 1.2] },
      head: { editable: true, currentLength: headLength, range: [0.8, 1.2] },
      legs: { editable: true, currentSize: flipperSize, range: [0.8, 1.2] },
      shellPattern: {
        editable: true,
        variants: ['plain', 'ridge', 'spotted'],
        currentVariant: shellPattern,
      },
    },
    stats: {
      totalVoxels: voxelArray.length,
      partBreakdown: countParts(voxelArray),
    },
  };
}

export function generateLowTurtle(config: TurtleLowConfig): string {
  return JSON.stringify(generateLowTurtleModel(config));
}

export const LOW_TURTLE_PRESETS: Record<string, TurtleLowConfig> = {
  pond_turtle: {
    color: {
      shell: '#3f7f3a',
      body: '#6fb35f',
      belly: '#d6c56a',
      eyes: '#111111',
    },
    shellPattern: 'ridge',
  },
  sea_turtle: {
    color: {
      shell: '#2d8c74',
      body: '#5fb99a',
      belly: '#d8d18a',
      eyes: '#111111',
    },
    shellPattern: 'spotted',
  },
};
