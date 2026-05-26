import React, { useState } from 'react';
import { PromptInput } from './PromptInput';
import { AdvancedParametersPanel, AdvancedParams } from './AdvancedParametersPanel';

interface BottomPanelProps {
  onSubmit: (prompt: string, params: AdvancedParams) => Promise<void>;
  isGenerating: boolean;
  onParamsChange?: (params: AdvancedParams) => void;
  showAdvanced?: boolean;
}

export const BottomPanel: React.FC<BottomPanelProps> = ({
  onSubmit,
  isGenerating,
  onParamsChange,
  showAdvanced = true
}) => {
  const [advancedParams, setAdvancedParams] = useState<AdvancedParams>({
    style: 'realistic',
    colorScheme: 'vibrant',
    size: 'medium',
    symmetry: 'none'
  });
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  const handleParamsChange = (newParams: AdvancedParams) => {
    setAdvancedParams(newParams);
    onParamsChange?.(newParams);
  };

  const handleSubmit = async (prompt: string) => {
    await onSubmit(prompt, advancedParams);
  };

  return (
    <div className="space-y-2">
      {/* 输入框 */}
      <PromptInput
        onSubmit={handleSubmit}
        isGenerating={isGenerating}
      />
      {/* 高级参数面板（仅 Expert Mode） */}
      {showAdvanced && (
        <AdvancedParametersPanel
          params={advancedParams}
          onChange={handleParamsChange}
          isExpanded={advancedExpanded}
          onToggle={() => setAdvancedExpanded(!advancedExpanded)}
        />
      )}
    </div>
  );
};

export default BottomPanel;
