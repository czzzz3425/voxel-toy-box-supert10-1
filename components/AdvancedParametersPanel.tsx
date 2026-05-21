import React from 'react';
import { ChevronDown, Palette, Maximize2, Repeat, Settings2 } from 'lucide-react';

export interface AdvancedParams {
  style: 'realistic' | 'cartoon' | 'abstract';
  colorScheme: 'vibrant' | 'pastel' | 'monochrome' | 'nature';
  size: 'small' | 'medium' | 'large';
  symmetry: 'none' | 'bilateral' | 'radial';
}

interface AdvancedParametersPanelProps {
  params: AdvancedParams;
  onChange: (params: AdvancedParams) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

export const AdvancedParametersPanel: React.FC<AdvancedParametersPanelProps> = ({
  params,
  onChange,
  isExpanded,
  onToggle
}) => {
  const updateParam = <K extends keyof AdvancedParams>(key: K, value: AdvancedParams[K]) => {
    onChange({ ...params, [key]: value });
  };

  return (
    <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings2 size={18} className="text-indigo-500" />
          <span className="font-bold text-slate-700">Advanced Parameters</span>
        </div>
        <ChevronDown
          size={18}
          className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <ParamSelect
            label="Style"
            icon={<Palette size={16} />}
            value={params.style}
            options={[
              { value: 'realistic', label: 'Realistic' },
              { value: 'cartoon', label: 'Cartoon' },
              { value: 'abstract', label: 'Abstract' }
            ]}
            onChange={(v) => updateParam('style', v as AdvancedParams['style'])}
          />

          <ParamSelect
            label="Color"
            icon={<Palette size={16} />}
            value={params.colorScheme}
            options={[
              { value: 'vibrant', label: 'Vibrant' },
              { value: 'pastel', label: 'Pastel' },
              { value: 'monochrome', label: 'Monochrome' },
              { value: 'nature', label: 'Nature' }
            ]}
            onChange={(v) => updateParam('colorScheme', v as AdvancedParams['colorScheme'])}
          />

          <ParamSelect
            label="Size"
            icon={<Maximize2 size={16} />}
            value={params.size}
            options={[
              { value: 'small', label: 'Small' },
              { value: 'medium', label: 'Medium' },
              { value: 'large', label: 'Large' }
            ]}
            onChange={(v) => updateParam('size', v as AdvancedParams['size'])}
          />

          <ParamSelect
            label="Symmetry"
            icon={<Repeat size={16} />}
            value={params.symmetry}
            options={[
              { value: 'none', label: 'None' },
              { value: 'bilateral', label: 'Bilateral' },
              { value: 'radial', label: 'Radial' }
            ]}
            onChange={(v) => updateParam('symmetry', v as AdvancedParams['symmetry'])}
          />
        </div>
      )}
    </div>
  );
};

interface ParamSelectProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

const ParamSelect: React.FC<ParamSelectProps> = ({ label, icon, value, options, onChange }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{label.substring(0, 3)}</span>
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 text-xs sm:text-sm"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

export default AdvancedParametersPanel;
