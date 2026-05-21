import React from 'react';
import { GenerationResultMeta } from './GenerationResultMeta';
import { GenerationError } from './ErrorDisplay';
import { GenerationMetadata, TemplateMatchResult } from '../types';
import { TemplateMatchResultDisplay } from './TemplateMatchResultDisplay';

interface StatusPanelProps {
  metadata?: GenerationMetadata;
  templateMatch?: TemplateMatchResult;
  error?: string;
  onRetry?: () => void;
  onDismissError?: () => void;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({
  metadata,
  templateMatch,
  error,
  onRetry,
  onDismissError
}) => {
  if (error) {
    return (
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 w-full max-w-md px-4">
        <GenerationError
          error={error}
          onRetry={onRetry}
          onDismiss={onDismissError}
        />
      </div>
    );
  }

  if (!metadata) return null;

  return (
    <div className="absolute top-24 left-4 z-20 w-80 max-w-[calc(100vw-2rem)] space-y-3">
      <GenerationResultMeta metadata={metadata} />
      {templateMatch && templateMatch.matched && (
        <TemplateMatchResultDisplay result={templateMatch} />
      )}
    </div>
  );
};

export default StatusPanel;
