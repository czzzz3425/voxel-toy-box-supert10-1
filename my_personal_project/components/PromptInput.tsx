import React, { useState } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';

interface PromptInputProps {
  onSubmit: (prompt: string) => Promise<void>;
  isGenerating: boolean;
  disabled?: boolean;
}

export const PromptInput: React.FC<PromptInputProps> = ({
  onSubmit,
  isGenerating,
  disabled = false
}) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating || disabled) return;
    await onSubmit(prompt);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Sparkles className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the 3D voxel model you want to generate..."
            disabled={isGenerating || disabled}
            className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-slate-50 border-2 border-indigo-200 focus:border-indigo-500 focus:bg-white rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-inner text-sm sm:text-base"
          />
        </div>
        <button
          type="submit"
          disabled={!prompt.trim() || isGenerating || disabled}
          className="flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all transform active:scale-95 disabled:transform-none shadow-lg hover:shadow-xl text-sm sm:text-base"
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span className="hidden sm:inline">Generating...</span>
              <span className="sm:hidden">...</span>
            </>
          ) : (
            <>
              <Send size={16} />
              <span>Generate</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default PromptInput;
