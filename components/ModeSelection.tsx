import React from 'react';
import { Zap, Cog } from 'lucide-react';

export type AppMode = 'expert' | 'quick';

interface ModeSelectionProps {
  onSelect: (mode: AppMode) => void;
}

// 悬浮立方体组件
const FloatingCube: React.FC<{ className?: string; size?: number; color?: string }> = ({ 
  className = '', 
  size = 20, 
  color = '#60a5fa' 
}) => (
  <div 
    className={`rounded-sm ${className}`}
    style={{ 
      width: size, 
      height: size, 
      backgroundColor: color,
      boxShadow: `0 4px 12px ${color}40`
    }}
  />
);

export const ModeSelection: React.FC<ModeSelectionProps> = ({ onSelect }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden">
      {/* 像素块背景 */}
      <div className="absolute inset-0 bg-slate-100" />
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(45deg, #93c5fd 25%, transparent 25%),
            linear-gradient(-45deg, #93c5fd 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #a5b4fc 75%),
            linear-gradient(-45deg, transparent 75%, #a5b4fc 75%)
          `,
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px',
        }}
      />

      {/* 悬浮立方体装饰 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* 左上角 */}
        <FloatingCube 
          className="absolute top-[10%] left-[8%] animate-float-1" 
          size={32} 
          color="#60a5fa" 
        />
        <FloatingCube 
          className="absolute top-[18%] left-[15%] animate-float-2" 
          size={20} 
          color="#818cf8" 
        />
        <FloatingCube 
          className="absolute top-[25%] left-[5%] animate-float-3" 
          size={16} 
          color="#38bdf8" 
        />

        {/* 右上角 */}
        <FloatingCube 
          className="absolute top-[12%] right-[10%] animate-float-2" 
          size={28} 
          color="#a78bfa" 
        />
        <FloatingCube 
          className="absolute top-[22%] right-[18%] animate-float-1" 
          size={18} 
          color="#c084fc" 
        />

        {/* 左下角 */}
        <FloatingCube 
          className="absolute bottom-[15%] left-[12%] animate-float-3" 
          size={24} 
          color="#38bdf8" 
        />
        <FloatingCube 
          className="absolute bottom-[25%] left-[6%] animate-float-1" 
          size={14} 
          color="#60a5fa" 
        />

        {/* 右下角 */}
        <FloatingCube 
          className="absolute bottom-[10%] right-[8%] animate-float-1" 
          size={30} 
          color="#818cf8" 
        />
        <FloatingCube 
          className="absolute bottom-[20%] right-[15%] animate-float-2" 
          size={16} 
          color="#a78bfa" 
        />

        {/* 中间分散的小立方体 */}
        <FloatingCube 
          className="absolute top-[35%] left-[25%] animate-float-2" 
          size={12} 
          color="#c084fc" 
        />
        <FloatingCube 
          className="absolute top-[40%] right-[22%] animate-float-3" 
          size={10} 
          color="#60a5fa" 
        />
        <FloatingCube 
          className="absolute bottom-[35%] left-[20%] animate-float-1" 
          size={14} 
          color="#818cf8" 
        />
        <FloatingCube 
          className="absolute bottom-[40%] right-[25%] animate-float-2" 
          size={12} 
          color="#38bdf8" 
        />
      </div>

      {/* 主内容区域 */}
      <div className="relative text-center space-y-8 sm:space-y-10 animate-in fade-in zoom-in duration-700">
        {/* 头部标题区域 */}
        <div className="space-y-3">
          {/* 装饰像素条 */}
          <div className="flex justify-center gap-1">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 sm:w-4 sm:h-4 rounded-sm"
                style={{
                  backgroundColor: ['#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#a78bfa', '#818cf8', '#60a5fa', '#38bdf8'][i],
                }}
              />
            ))}
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
              Voxel Toy Box
            </span>
          </h1>

          <div className="flex items-center justify-center gap-3">
            <div className="flex gap-0.5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-sm bg-blue-300" />
              ))}
            </div>
            <span className="text-sm text-slate-400 font-medium uppercase tracking-[0.2em]">Choose your creative mode</span>
            <div className="flex gap-0.5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-sm bg-purple-300" />
              ))}
            </div>
          </div>
        </div>

        {/* 模式选择按钮 */}
        <div className="flex flex-col sm:flex-row items-stretch justify-center gap-4 sm:gap-6 px-4">
          {/* Quick Mode */}
          <button
            onClick={() => onSelect('quick')}
            className="group relative w-72 sm:w-80 p-8 bg-gradient-to-br from-blue-400 via-blue-500 to-cyan-500 rounded-3xl shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 flex flex-col"
          >
            <div className="relative space-y-5 flex-1 flex flex-col justify-between">
              {/* 图标 */}
              <div className="flex items-center justify-center w-20 h-20 mx-auto bg-white/20 backdrop-blur-sm rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <Zap size={36} className="text-white drop-shadow-lg" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">Quick Mode</h2>
                <p className="text-white/75 text-sm font-medium">
                  Just enter a prompt and generate instantly
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white/90 text-xs font-bold uppercase tracking-wider">
                <Zap size={12} />
                <span>Fast & Simple</span>
              </div>
            </div>
          </button>

          {/* Expert Mode */}
          <button
            onClick={() => onSelect('expert')}
            className="group relative w-72 sm:w-80 p-8 bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 rounded-3xl shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 flex flex-col"
          >
            <div className="relative space-y-5 flex-1 flex flex-col justify-between">
              {/* 图标 */}
              <div className="flex items-center justify-center w-20 h-20 mx-auto bg-white/20 backdrop-blur-sm rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <Cog size={36} className="text-white drop-shadow-lg" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">Expert Mode</h2>
                <p className="text-white/75 text-sm font-medium">
                  Full control over models and parameters
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white/90 text-xs font-bold uppercase tracking-wider">
                <Cog size={12} />
                <span>Full Control</span>
              </div>
            </div>
          </button>
        </div>

        {/* 底部装饰 */}
        <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-medium">
          <div className="flex gap-0.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-sm bg-slate-300" />
            ))}
          </div>
          <span className="uppercase tracking-[0.15em]">Build imagination into blocks</span>
          <div className="flex gap-0.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-sm bg-slate-300" />
            ))}
          </div>
        </div>
      </div>

      {/* 悬浮动画样式 */}
      <style>{`
        @keyframes float-1 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(3deg); }
        }
        @keyframes float-2 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(-3deg); }
        }
        @keyframes float-3 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(5deg); }
        }
        .animate-float-1 {
          animation: float-1 4s ease-in-out infinite;
        }
        .animate-float-2 {
          animation: float-2 5s ease-in-out infinite;
        }
        .animate-float-3 {
          animation: float-3 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default ModeSelection;
