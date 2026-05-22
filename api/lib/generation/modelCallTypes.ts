import type { GenerationOptions, ModelIntent } from '../../../types';

const DEFAULT_OPTIONS: Required<GenerationOptions> = {
  style: 'realistic',
  colorScheme: 'vibrant',
  size: 'medium',
  symmetry: 'none',
};

const BUDGET_BY_SIZE: Record<NonNullable<GenerationOptions['size']>, number> = {
  small: 120,
  medium: 200,
  large: 320,
};

const STYLE_RULES: Record<NonNullable<GenerationOptions['style']>, string> = {
  realistic:
    'Prefer believable proportions, recognizable silhouettes, restrained decoration, and stable structural choices.',
  cartoon:
    'Prefer exaggerated silhouette, cute readable proportions, simplified large features, and playful forms.',
  abstract:
    'Prefer stylized geometry, bold shape language, simplified symbolism, and artistic silhouette reduction.',
};

const COLOR_RULES: Record<NonNullable<GenerationOptions['colorScheme']>, string> = {
  vibrant: 'Use a saturated, high-contrast palette with 3 to 5 coordinated colors.',
  pastel: 'Use soft low-saturation colors with gentle contrast and a clean limited palette.',
  monochrome: 'Use one dominant hue with 1 to 2 close tonal variants.',
  nature:
    'Prefer earthy greens, browns, blues, stone, sand, and wood-like natural combinations.',
};

const SYMMETRY_RULES: Record<NonNullable<GenerationOptions['symmetry']>, string> = {
  none: 'Do not force symmetry unless it naturally improves readability.',
  bilateral: 'Prefer left-right symmetry for the main body and major silhouette.',
  radial: 'Prefer rotational balance around a central axis when the subject fits that structure.',
};

const PRIMARY_COLORS_BY_SCHEME: Record<NonNullable<GenerationOptions['colorScheme']>, string[]> = {
  vibrant: ['#FF5A36', '#FFC145', '#2EC4B6', '#3A86FF'],
  pastel: ['#F6BDC0', '#CDE7BE', '#A9DEF9', '#E4C1F9'],
  monochrome: ['#444444', '#777777', '#B5B5B5'],
  nature: ['#4F7F39', '#8D6E63', '#5C80BC', '#C2B280'],
};

const SIZE_PROPORTION_RULES: Record<NonNullable<GenerationOptions['size']>, string[]> = {
  small: [
    'Keep the silhouette compact and avoid over-thin appendages.',
    'Use simplified major forms with limited secondary detail.',
  ],
  medium: [
    'Balance body mass and readable appendages without making limbs too thin.',
    'Use enough silhouette variation to make the subject recognizable at a glance.',
  ],
  large: [
    'Use larger contiguous masses before adding surface detail.',
    'Keep all major appendages thick enough to stay structurally readable.',
  ],
};

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'art',
  'build',
  'create',
  'design',
  'for',
  'generate',
  'in',
  'make',
  'model',
  'of',
  'the',
  'toy',
  'voxel',
  'with',
]);

const normalizeGenerationOptions = (
  options: GenerationOptions | undefined
): Required<GenerationOptions> => ({
  style: options?.style ?? DEFAULT_OPTIONS.style,
  colorScheme: options?.colorScheme ?? DEFAULT_OPTIONS.colorScheme,
  size: options?.size ?? DEFAULT_OPTIONS.size,
  symmetry: options?.symmetry ?? DEFAULT_OPTIONS.symmetry,
});

function normalizePhrase(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function ensureUniqueStrings(values: string[], fallback: string[], maxItems: number) {
  const normalized = values
    .map((value) => normalizePhrase(value))
    .filter(Boolean);

  const unique = Array.from(new Set(normalized));
  if (unique.length > 0) {
    return unique.slice(0, maxItems);
  }

  return fallback.slice(0, maxItems);
}

function normalizeHexColor(color: string) {
  const trimmed = color.trim();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const shortHex = withHash.match(/^#([0-9a-fA-F]{3})$/);
  if (shortHex) {
    const [r, g, b] = shortHex[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  const fullHex = withHash.match(/^#([0-9a-fA-F]{6})$/);
  if (fullHex) {
    return `#${fullHex[1].toUpperCase()}`;
  }

  return '';
}

function extractPromptKeywords(prompt: string, maxItems = 4) {
  const tokens = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));

  return Array.from(new Set(tokens)).slice(0, maxItems);
}

function buildFallbackPartBreakdown(prompt: string) {
  const keywords = extractPromptKeywords(prompt, 3);
  const subjectHint = keywords.join(' ') || 'subject';
  const poseHint = buildFallbackPose(prompt);

  return [
    {
      name: 'core silhouette',
      description: `Establish the main ${subjectHint} body mass and primary readable outline.`,
    },
    {
      name: 'secondary features',
      description: 'Add the most recognizable appendages or facial/functional features from the prompt.',
    },
    {
      name: 'base and balance',
      description: `Keep the stance ${poseHint} with a grounded, connected support structure.`,
    },
  ];
}

function buildFallbackMustHaveFeatures(prompt: string, options: Required<GenerationOptions>) {
  const keywords = extractPromptKeywords(prompt, 4);
  return ensureUniqueStrings(
    [
      ...keywords.map((keyword) => `clear ${keyword} identity`),
      options.symmetry === 'bilateral' ? 'left-right balanced main body' : '',
      'stable connected base',
    ],
    ['clear subject silhouette', 'stable connected base'],
    5
  );
}

function buildFallbackForbiddenFeatures(options: Required<GenerationOptions>) {
  return ensureUniqueStrings(
    [
      'floating disconnected fragments',
      'paper-thin unsupported appendages',
      options.symmetry === 'bilateral' ? 'strong left-right asymmetry in the main body' : '',
      options.colorScheme === 'monochrome' ? 'rainbow-like multi-hue palette' : '',
    ],
    ['floating disconnected fragments', 'paper-thin unsupported appendages'],
    4
  );
}

function buildFallbackPose(prompt: string) {
  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes('flying') || lowerPrompt.includes('jump')) {
    return 'dynamic airborne pose with enough support to remain visually connected';
  }

  if (lowerPrompt.includes('sit')) {
    return 'compact seated pose with a stable grounded base';
  }

  return 'front-facing stable pose with clear weight distribution';
}

const buildFallbackIntent = (
  prompt: string,
  options?: GenerationOptions
): ModelIntent => {
  const resolvedOptions = normalizeGenerationOptions(options);
  const voxelBudget = BUDGET_BY_SIZE[resolvedOptions.size];

  return {
    subject: prompt.trim() || 'voxel sculpture',
    style: resolvedOptions.style,
    colorScheme: resolvedOptions.colorScheme,
    size: resolvedOptions.size,
    symmetry: resolvedOptions.symmetry,
    voxelBudget,
    silhouetteKeywords: [
      'clear overall silhouette',
      'readable main body',
      'stable base footprint',
    ],
    structuralRules: [
      'All major parts must stay connected.',
      'Avoid isolated floating voxels.',
      'Keep the model centered around x=0 and z=0.',
      'Place the lowest supporting voxels at y=0 whenever possible.',
    ],
    partBreakdown: buildFallbackPartBreakdown(prompt),
    mustHaveFeatures: buildFallbackMustHaveFeatures(prompt, resolvedOptions),
    forbiddenFeatures: buildFallbackForbiddenFeatures(resolvedOptions),
    primaryColors: PRIMARY_COLORS_BY_SCHEME[resolvedOptions.colorScheme],
    pose: buildFallbackPose(prompt),
    proportionRules: SIZE_PROPORTION_RULES[resolvedOptions.size],
  };
};

export const getLLMMessageContent = (
  systemContext: string,
  prompt: string,
  options?: GenerationOptions
) => {
  if (!options) {
    return `
${systemContext}

Task: Generate a 3D voxel art model of: "${prompt}".

Strict Rules:
1. Use approximately 150 to 200 voxels. MUST NOT exceed 250 voxels at the maximum.
2. The model must be centered at x=0, z=0.
3. The bottom of the model must be at y=0 or slightly higher.
4. Ensure the structure is physically plausible (connected).
5. Coordinates should be integers.

Return ONLY a JSON object in this exact envelope shape (no markdown, no explanation):
{
  "voxels": [
    { "x": 0, "y": 0, "z": 0, "color": "#FF5500" }
  ]
}
`;
  }

  const intent = buildFallbackIntent(prompt, options);

  return `
${systemContext}

Task: Generate a 3D voxel art model from the following structured intent.

Structured Intent:
${JSON.stringify(intent, null, 2)}

Generation Rules:
1. Target approximately ${intent.voxelBudget} voxels and do not exceed ${
    intent.voxelBudget + 40
  } voxels.
2. ${STYLE_RULES[intent.style]}
3. ${COLOR_RULES[intent.colorScheme]}
4. ${SYMMETRY_RULES[intent.symmetry]}
5. Keep the model centered around x=0 and z=0.
6. Keep the bottom of the model at y=0 or slightly above.
7. Maintain one connected structure.
8. Prefer readable silhouette over internal detail.
9. Coordinates must be integers.
10. Respect the listed must-have features, forbidden features, pose, palette, and proportion rules.
11. Return ONLY a JSON object in this exact envelope shape (no markdown, no explanation):
    {
      "voxels": [
        { "x": 0, "y": 0, "z": 0, "color": "#FF5500" }
      ]
    }
`;
};

export const getIntentPrompt = (
  systemContext: string,
  prompt: string,
  options: GenerationOptions
) => {
  const resolvedOptions = normalizeGenerationOptions(options);

  return `
${systemContext}

Task: Extract a structured ModelIntent for a voxel art model.

User prompt:
${prompt}

Advanced options:
${JSON.stringify(resolvedOptions, null, 2)}

Requirements:
1. Subject should be a short, concrete noun phrase.
2. Style must be one of realistic, cartoon, or abstract.
3. Color scheme must match the user's direction.
4. Size must map to a voxel budget.
5. Symmetry must reflect the prompt and options.
6. Silhouette keywords should be short visual descriptors.
7. Structural rules must emphasize connectivity and legibility.
8. partBreakdown must be an array of 2 to 4 major build sections with name and description.
9. mustHaveFeatures should list the most important visible traits that must appear.
10. forbiddenFeatures should list visible mistakes or traits to avoid.
11. primaryColors must be 2 to 4 hex colors like #FFAA33 that fit the requested palette.
12. pose should describe the intended stance or orientation in one short sentence.
13. proportionRules should describe silhouette and massing constraints to preserve.

Return ONLY a JSON object with subject, style, colorScheme, size, symmetry, voxelBudget, silhouetteKeywords, structuralRules, partBreakdown, mustHaveFeatures, forbiddenFeatures, primaryColors, pose, and proportionRules.
`;
};

export const getVoxelPromptFromIntent = (
  systemContext: string,
  intent: ModelIntent,
  repairFeedback: string[] = []
) => {
  const safeStyle = STYLE_RULES[intent.style] ?? STYLE_RULES[DEFAULT_OPTIONS.style];
  const safeColor = COLOR_RULES[intent.colorScheme] ?? COLOR_RULES[DEFAULT_OPTIONS.colorScheme];
  const safeSymmetry = SYMMETRY_RULES[intent.symmetry] ?? SYMMETRY_RULES[DEFAULT_OPTIONS.symmetry];
  const safeBudget = BUDGET_BY_SIZE[intent.size] ?? BUDGET_BY_SIZE[DEFAULT_OPTIONS.size];
  const repairSection =
    repairFeedback.length > 0
      ? `

Previous attempt failed these checks. Fix every item in the next response:
${repairFeedback.map((item, index) => `${index + 1}. ${item}`).join('\n')}
`
      : '';

  return `
${systemContext}

Task: Generate voxel coordinates from the provided ModelIntent.

ModelIntent:
${JSON.stringify(intent, null, 2)}
${repairSection}

Generation Rules:
1. Target approximately ${safeBudget} voxels and do not exceed ${
    safeBudget + 40
  } voxels.
2. ${safeStyle}
3. ${safeColor}
4. ${safeSymmetry}
5. Keep the model centered around x=0 and z=0.
6. Keep the lowest supporting voxels at y=0.
7. Maintain one connected structure.
8. Favor readable silhouette over internal detail.
9. Every mustHaveFeature must be visibly represented in the silhouette or primary masses.
10. Every forbiddenFeature must be actively avoided.
11. Use the primaryColors list as the dominant palette and keep extra colors to a minimum.
12. Respect the pose and proportionRules when distributing mass and appendages.
13. Coordinates must be integers.
14. Silently self-check the result before answering. If a constraint conflicts with readability, resolve it by preserving the subject silhouette, symmetry, connectivity, and the must-have features first.
15. Return ONLY a JSON object in this exact envelope shape (no markdown, no explanation):
    {
      "voxels": [
        { "x": 0, "y": 0, "z": 0, "color": "#FF5500" }
      ],
      "complianceReport": {
        "mustHaveFeaturesAddressed": ["feature 1"],
        "forbiddenFeaturesAvoided": ["mistake 1"],
        "primaryColorsUsed": ["#FF5500"],
        "poseApplied": "short description",
        "symmetryApplied": "short description",
        "notes": ["optional note"]
      }
    }
`;
};

export const buildModelIntent = buildFallbackIntent;

export function normalizeModelIntent(intent: ModelIntent): ModelIntent {
  const allowedStyles = Object.keys(STYLE_RULES);
  const allowedColorSchemes = Object.keys(COLOR_RULES);
  const allowedSizes = Object.keys(BUDGET_BY_SIZE);
  const allowedSymmetries = Object.keys(SYMMETRY_RULES);

  const safeStyle = allowedStyles.includes(intent.style) ? intent.style : DEFAULT_OPTIONS.style;
  const safeColorScheme = allowedColorSchemes.includes(intent.colorScheme) ? intent.colorScheme : DEFAULT_OPTIONS.colorScheme;
  const safeSize = allowedSizes.includes(intent.size) ? intent.size : DEFAULT_OPTIONS.size;
  const safeSymmetry = allowedSymmetries.includes(intent.symmetry) ? intent.symmetry : DEFAULT_OPTIONS.symmetry;

  const fallbackIntent = buildFallbackIntent(intent.subject ?? 'voxel sculpture', {
    style: safeStyle,
    colorScheme: safeColorScheme,
    size: safeSize,
    symmetry: safeSymmetry,
  });

  const partBreakdown = Array.isArray(intent.partBreakdown)
    ? intent.partBreakdown
        .map((part) => ({
          name: normalizePhrase(part?.name ?? ''),
          description: normalizePhrase(part?.description ?? ''),
        }))
        .filter((part) => part.name && part.description)
        .slice(0, 4)
    : [];

  const primaryColors = Array.isArray(intent.primaryColors)
    ? intent.primaryColors
        .map((color) => (typeof color === 'string' ? normalizeHexColor(color) : ''))
        .filter(Boolean)
        .slice(0, 4)
    : [];

  return {
    ...intent,
    style: safeStyle,
    colorScheme: safeColorScheme,
    size: safeSize,
    symmetry: safeSymmetry,
    voxelBudget: intent.voxelBudget ?? BUDGET_BY_SIZE[safeSize],
    silhouetteKeywords: ensureUniqueStrings(
      Array.isArray(intent.silhouetteKeywords) ? intent.silhouetteKeywords : [],
      fallbackIntent.silhouetteKeywords,
      5
    ),
    structuralRules: ensureUniqueStrings(
      Array.isArray(intent.structuralRules) ? intent.structuralRules : [],
      fallbackIntent.structuralRules,
      6
    ),
    partBreakdown: partBreakdown.length > 0 ? partBreakdown : fallbackIntent.partBreakdown,
    mustHaveFeatures: ensureUniqueStrings(
      Array.isArray(intent.mustHaveFeatures) ? intent.mustHaveFeatures : [],
      fallbackIntent.mustHaveFeatures,
      6
    ),
    forbiddenFeatures: ensureUniqueStrings(
      Array.isArray(intent.forbiddenFeatures) ? intent.forbiddenFeatures : [],
      fallbackIntent.forbiddenFeatures,
      5
    ),
    primaryColors: primaryColors.length > 0 ? primaryColors : fallbackIntent.primaryColors,
    pose: normalizePhrase(intent.pose ?? '') || fallbackIntent.pose,
    proportionRules: ensureUniqueStrings(
      Array.isArray(intent.proportionRules) ? intent.proportionRules : [],
      fallbackIntent.proportionRules,
      5
    ),
  };
}
