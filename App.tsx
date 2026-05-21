/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { VoxelEngine } from './services/VoxelEngine';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Generators } from './utils/voxelGenerators';
import { AppState, GenerationMetadata, TemplateMatchResult, VoxelData } from './types';
import { BottomPanel } from './components/BottomPanel';
import { StatusPanel } from './components/StatusPanel';
import { AdvancedParams } from './components/AdvancedParametersPanel';
import { TopBar } from './components/TopBar';
import { PresetModel } from './components/ModelSelector';
import { ModeSelection, AppMode } from './components/ModeSelection';
import { generateVoxelModel } from './services/generationApi';

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<VoxelEngine | null>(null);

  const [appState, setAppState] = useState<AppState>(AppState.STABLE);
  const [voxelCount, setVoxelCount] = useState<number>(0);
  const [showWelcome, setShowWelcome] = useState(true);
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

    const timer = setTimeout(() => setShowWelcome(false), 5000);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
      engine.cleanup();
    };
  }, []);

  const handleModelChange = (model: PresetModel) => {
    setSelectedModel(model);

    if (engineRef.current) {
      const generator = Generators[model];
      if (generator) {
        const modelData = generator();
        engineRef.current.loadInitialModel(modelData);
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

  const handleAddModel = () => {
    alert('Add model feature - connect to your custom model importer');
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
    setShowWelcome(false);
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

  return (
    <div className="relative w-full h-screen bg-[#f0f2f5] overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {appMode === null && <ModeSelection onSelect={setAppMode} />}

      {appMode !== null && (
        <>
          <WelcomeScreen visible={showWelcome} />

          <TopBar
            appMode={appMode}
            selectedModel={selectedModel}
            onSelectModel={handleModelChange}
            onAddModel={handleAddModel}
            isAutoRotate={isAutoRotate}
            onToggleRotate={handleToggleRotate}
            onShare={handleShare}
            onHome={handleHome}
            onDismantle={handleDismantle}
            onRebuild={handleRebuild}
            voxelCount={voxelCount}
            currentParams={currentParams}
          />

          <StatusPanel
            metadata={generationMetadata}
            templateMatch={templateMatch}
            error={error}
            onRetry={handleRetry}
            onDismissError={handleDismissError}
          />

          <BottomPanel
            onSubmit={handleSubmit}
            isGenerating={isGenerating}
            onParamsChange={setCurrentParams}
            showAdvanced={appMode === 'expert'}
          />
        </>
      )}
    </div>
  );
};

export default App;
