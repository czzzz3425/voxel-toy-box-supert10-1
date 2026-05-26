/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { VoxelEngine } from './services/VoxelEngine';
import { Generators } from './utils/voxelGenerators';
import { AppState, GenerationMetadata, TemplateMatchResult, VoxelData } from './types';
import { BottomPanel } from './components/BottomPanel';
import { StatusPanel } from './components/StatusPanel';
import { AdvancedParams } from './components/AdvancedParametersPanel';
import { ChevronDown, Home, Pause, Play } from 'lucide-react';
import { PresetModel } from './components/ModelSelector';
import { ModeSelection, AppMode } from './components/ModeSelection';
import { generateVoxelModel } from './services/generationApi';
import { QuickModePanel, DisplayMode, BackgroundColor } from './components/QuickModePanel';
import { QuickModeActions } from './components/QuickModeActions';
import { ExpertModePanel } from './components/ExpertModePanel';
import { ExpertModeActions } from './components/ExpertModeActions';

const makeExportName = (extension: string) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `voxel-model-${timestamp}.${extension}`;
};

const downloadTextFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const downloadDataUrl = (filename: string, dataUrl: string) => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const createObjFromVoxels = (voxels: VoxelData[]) => {
  const lines = [
    '# Voxel Toy Box OBJ export',
    `# Voxels: ${voxels.length}`,
    '',
  ];

  let vertexOffset = 1;
  const half = 0.475;

  voxels.forEach((voxel, index) => {
    const color = `#${voxel.color.toString(16).padStart(6, '0')}`;
    const { x, y, z } = voxel;
    const vertices = [
      [x - half, y - half, z - half],
      [x + half, y - half, z - half],
      [x + half, y + half, z - half],
      [x - half, y + half, z - half],
      [x - half, y - half, z + half],
      [x + half, y - half, z + half],
      [x + half, y + half, z + half],
      [x - half, y + half, z + half],
    ];

    lines.push(`o voxel_${index}_${color.slice(1)}`);
    vertices.forEach(([vx, vy, vz]) => {
      lines.push(`v ${vx.toFixed(3)} ${vy.toFixed(3)} ${vz.toFixed(3)}`);
    });

    const i = vertexOffset;
    lines.push(
      `# color ${color}`,
      `f ${i} ${i + 1} ${i + 2} ${i + 3}`,
      `f ${i + 4} ${i + 7} ${i + 6} ${i + 5}`,
      `f ${i} ${i + 4} ${i + 5} ${i + 1}`,
      `f ${i + 1} ${i + 5} ${i + 6} ${i + 2}`,
      `f ${i + 2} ${i + 6} ${i + 7} ${i + 3}`,
      `f ${i + 3} ${i + 7} ${i + 4} ${i}`,
      ''
    );
    vertexOffset += 8;
  });

  return lines.join('\n');
};

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<VoxelEngine | null>(null);

  const [appState, setAppState] = useState<AppState>(AppState.STABLE);
  const [voxelCount, setVoxelCount] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState<PresetModel>('Eagle');

  const [generationMetadata, setGenerationMetadata] = useState<GenerationMetadata | undefined>();
  const [templateMatch, setTemplateMatch] = useState<TemplateMatchResult | undefined>();
  const [error, setError] = useState<string | undefined>();

  const [isAutoRotate, setIsAutoRotate] = useState(true);

  const [currentParams, setCurrentParams] = useState<AdvancedParams>({
    style: 'realistic',
    colorScheme: 'vibrant',
    size: 'medium',
    symmetry: 'none',
  });

  const [appMode, setAppMode] = useState<AppMode | null>(null);
  const [currentModelData, setCurrentModelData] = useState<VoxelData[]>([]);

  // Quick Mode UI state
  const [displayMode, setDisplayMode] = useState<DisplayMode>('solid');
  const [backgroundColor, setBackgroundColor] = useState<BackgroundColor>('gray');
  const [gridEnabled, setGridEnabled] = useState(true);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  // Expert Mode UI state
  const [expertLeftCollapsed, setExpertLeftCollapsed] = useState(false);
  const [expertRightCollapsed, setExpertRightCollapsed] = useState(false);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  // Background color effect
  useEffect(() => {
    const colorMap: Record<BackgroundColor, string> = {
      gray: '#f0f2f5',
      dark: '#374151',
      white: '#ffffff',
      purple: '#f3e8ff',
    };
    if (engineRef.current) {
      engineRef.current.setBackgroundColor(colorMap[backgroundColor]);
    }
  }, [backgroundColor]);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new VoxelEngine(
      containerRef.current,
      (newState) => setAppState(newState),
      (count) => setVoxelCount(count)
    );

    engineRef.current = engine;

    const initialModel = Generators.Eagle();
    engine.loadInitialModel(initialModel);
    setCurrentModelData(initialModel);

    const handleResize = () => engine.handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.cleanup();
    };
  }, []);

  const handleModelChange = (model: PresetModel) => {
    setSelectedModel(model);

    if (engineRef.current) {
      const generator = Generators[model];
      if (generator) {
        const modelData = generator();
        engineRef.current.loadModelLayered(modelData);
        setCurrentModelData(modelData);
      }
    }
  };

  const handleToggleRotate = () => {
    const newState = !isAutoRotate;
    setIsAutoRotate(newState);

    if (engineRef.current) {
      engineRef.current.setAutoRotate(newState);
    }
  };

  const handleShare = () => {
    if (engineRef.current) {
      const jsonData = engineRef.current.getJsonData();
      navigator.clipboard
        .writeText(jsonData)
        .then(() => {
          alert('Voxel data copied to clipboard!');
        })
        .catch(() => {
          alert('Failed to copy. Try manually copying from the JSON export.');
        });
    }
  };

  const handleSubmit = async (prompt: string, params: AdvancedParams) => {
    setError(undefined);
    setGenerationMetadata(undefined);
    setTemplateMatch(undefined);
    setIsGenerating(true);

    try {
      const backendResult = await generateVoxelModel(
        prompt,
        params,
        appMode === 'expert' ? 'expert' : 'fast'
      );

      const voxels = backendResult.voxels;

      if (engineRef.current) {
        engineRef.current.loadInitialModel(voxels);
      }

      setCurrentModelData(voxels);
      setGenerationMetadata(backendResult.metadata);
      setTemplateMatch(backendResult.templateMatch);
    } catch (err) {
      console.error('Generation failed', err);
      setError(err instanceof Error ? err.message : 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetry = () => {
    setError(undefined);
  };

  const handleDismissError = () => {
    setError(undefined);
  };

  const handleHome = () => {
    setAppMode(null);
    setIsGenerating(false);
    setError(undefined);
  };

  const handleDismantle = () => {
    engineRef.current?.dismantle();
  };

  const handleRebuild = () => {
    if (currentModelData.length > 0) {
      engineRef.current?.rebuild(currentModelData);
    }
  };

  const handleResetCamera = () => {
    engineRef.current?.resetCamera();
  };

  const handleExportJson = () => {
    const jsonData =
      engineRef.current?.getJsonData() ??
      JSON.stringify(
        currentModelData.map((voxel, id) => ({
          id,
          x: voxel.x,
          y: voxel.y,
          z: voxel.z,
          c: `#${voxel.color.toString(16).padStart(6, '0')}`,
        })),
        null,
        2
      );

    downloadTextFile(makeExportName('json'), jsonData, 'application/json');
  };

  const handleExportObj = () => {
    if (currentModelData.length === 0) {
      alert('No voxel model to export yet.');
      return;
    }

    downloadTextFile(makeExportName('obj'), createObjFromVoxels(currentModelData), 'text/plain');
  };

  const handleScreenshot = () => {
    const screenshot = engineRef.current?.captureScreenshot();

    if (!screenshot) {
      alert('No scene available to capture yet.');
      return;
    }

    downloadDataUrl(makeExportName('png'), screenshot);
  };

  // Background color mapping
  const bgColorMap: Record<BackgroundColor, string> = {
    gray: '#f0f2f5',
    dark: '#374151',
    white: '#ffffff',
    purple: '#f3e8ff',
  };

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ backgroundColor: bgColorMap[backgroundColor] }}>
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {appMode === null && <ModeSelection onSelect={setAppMode} />}

      {appMode !== null && (
        <>
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
            <button
              onClick={handleHome}
              className="pointer-events-auto flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium"
              title="Back to mode selection"
            >
              <Home size={15} />
              Modes
            </button>

            <div className="pointer-events-auto flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-sm border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Voxels</span>
              <span className="text-sm font-bold text-gray-800">{voxelCount.toLocaleString()}</span>
              <button
                onClick={handleToggleRotate}
                className="ml-1 flex items-center justify-center w-7 h-7 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
                title={isAutoRotate ? 'Pause Rotation' : 'Auto Rotate'}
              >
                {isAutoRotate ? <Pause size={14} /> : <Play size={14} />}
              </button>
            </div>
          </div>

          {/* Quick Mode Layout */}
          {appMode === 'quick' && (
            <div className="absolute inset-0 z-10 flex items-start pt-16 pb-24 pointer-events-none">
              {/* Left Panel */}
              <div className="flex-shrink-0 mt-4 ml-4 pointer-events-auto">
                <QuickModePanel
                  selectedModel={selectedModel}
                  onSelectModel={handleModelChange}
                  displayMode={displayMode}
                  onDisplayModeChange={setDisplayMode}
                  backgroundColor={backgroundColor}
                  onBackgroundColorChange={setBackgroundColor}
                  gridEnabled={gridEnabled}
                  onGridToggle={() => setGridEnabled(!gridEnabled)}
                  onResetCamera={handleResetCamera}
                  collapsed={leftPanelCollapsed}
                  onToggleCollapse={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
                />
              </div>

              {/* Center Spacer */}
              <div className="flex-1 min-w-0 mx-4" />

              {/* Right Panel */}
              <div className="flex-shrink-0 mt-4 mr-4 pointer-events-auto">
                <QuickModeActions
                  voxelCount={voxelCount}
                  selectedModel={selectedModel}
                  metadata={generationMetadata}
                  onDismantle={handleDismantle}
                  onRebuild={handleRebuild}
                  onExportJson={handleExportJson}
                  onExportObj={handleExportObj}
                  onScreenshot={handleScreenshot}
                  onShare={handleShare}
                  collapsed={rightPanelCollapsed}
                  onToggleCollapse={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                />
              </div>
            </div>
          )}

          {/* Expert Mode Layout */}
          {appMode === 'expert' && (
            <div className="absolute inset-0 z-10 flex items-start pt-16 pb-36 pointer-events-none">
              {/* Left Panel */}
              <div className="flex-shrink-0 mt-4 ml-4 pointer-events-auto">
                <ExpertModePanel
                  selectedModel={selectedModel}
                  onSelectModel={handleModelChange}
                  displayMode={displayMode}
                  onDisplayModeChange={setDisplayMode}
                  backgroundColor={backgroundColor}
                  onBackgroundColorChange={setBackgroundColor}
                  gridEnabled={gridEnabled}
                  onGridToggle={() => setGridEnabled(!gridEnabled)}
                  onResetCamera={handleResetCamera}
                  collapsed={expertLeftCollapsed}
                  onToggleCollapse={() => setExpertLeftCollapsed(!expertLeftCollapsed)}
                />
              </div>

              {/* Center Spacer */}
              <div className="flex-1 min-w-0 mx-4" />

              {/* Right Panel */}
              <div className="flex-shrink-0 mt-4 mr-4 pointer-events-auto">
                <ExpertModeActions
                  voxelCount={voxelCount}
                  selectedModel={selectedModel}
                  onDismantle={handleDismantle}
                  onRebuild={handleRebuild}
                  onExportJson={handleExportJson}
                  onExportObj={handleExportObj}
                  onScreenshot={handleScreenshot}
                  onShare={handleShare}
                  collapsed={expertRightCollapsed}
                  onToggleCollapse={() => setExpertRightCollapsed(!expertRightCollapsed)}
                />
              </div>
            </div>
          )}

          {/* Expert Mode: Status Panel */}
          {appMode === 'expert' && (
            <StatusPanel
              metadata={generationMetadata}
              templateMatch={templateMatch}
              error={error}
              onRetry={handleRetry}
              onDismissError={handleDismissError}
            />
          )}

          {/* Bottom Input */}
          <div className="absolute bottom-2 left-0 right-0 z-20 px-4 pointer-events-none">
            <div className="max-w-xl mx-auto space-y-2 pointer-events-auto">
              {/* Expert Mode: Advanced Parameters in Bottom */}
              {appMode === 'expert' && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setAdvancedExpanded(!advancedExpanded)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ChevronDown size={16} className="text-indigo-500" />
                      <span className="font-semibold text-sm text-gray-700">Advanced Parameters</span>
                    </div>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${advancedExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {advancedExpanded && (
                    <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Style</label>
                        <select
                          value={currentParams.style}
                          onChange={(e) => setCurrentParams({ ...currentParams, style: e.target.value as AdvancedParams['style'] })}
                          className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-gray-700 text-sm font-medium focus:outline-none focus:border-indigo-300"
                        >
                          <option value="realistic">Realistic</option>
                          <option value="cartoon">Cartoon</option>
                          <option value="abstract">Abstract</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Color</label>
                        <select
                          value={currentParams.colorScheme}
                          onChange={(e) => setCurrentParams({ ...currentParams, colorScheme: e.target.value as AdvancedParams['colorScheme'] })}
                          className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-gray-700 text-sm font-medium focus:outline-none focus:border-indigo-300"
                        >
                          <option value="vibrant">Vibrant</option>
                          <option value="pastel">Pastel</option>
                          <option value="monochrome">Monochrome</option>
                          <option value="nature">Nature</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Size</label>
                        <select
                          value={currentParams.size}
                          onChange={(e) => setCurrentParams({ ...currentParams, size: e.target.value as AdvancedParams['size'] })}
                          className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-gray-700 text-sm font-medium focus:outline-none focus:border-indigo-300"
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Symmetry</label>
                        <select
                          value={currentParams.symmetry}
                          onChange={(e) => setCurrentParams({ ...currentParams, symmetry: e.target.value as AdvancedParams['symmetry'] })}
                          className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-gray-700 text-sm font-medium focus:outline-none focus:border-indigo-300"
                        >
                          <option value="none">None</option>
                          <option value="bilateral">Bilateral</option>
                          <option value="radial">Radial</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <BottomPanel
                onSubmit={handleSubmit}
                isGenerating={isGenerating}
                onParamsChange={setCurrentParams}
                showAdvanced={false}
              />
            </div>
            {/* Footer tips */}
            <div className="flex items-center justify-between mt-3 px-2 text-[10px] text-gray-400">
              <div className="flex items-center gap-3">
                <span>Tip: Drag to rotate</span>
                <span>Scroll to zoom</span>
                <span>Right click to pan</span>
              </div>
              <div>Made with Voxel Toy Box</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
