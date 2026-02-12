
import React from 'react';
import { VoiceState } from '../types';

interface VisualizerProps {
  state: VoiceState;
  isActive: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ state, isActive }) => {
  const bars = Array.from({ length: 24 });
  
  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Outer Rotating Rings */}
      <div className={`absolute w-full h-full border-2 border-dashed border-cyan-500/20 rounded-full ${isActive ? 'animate-[spin_10s_linear_infinite]' : ''}`}></div>
      <div className={`absolute w-[85%] h-[85%] border border-cyan-400/10 rounded-full ${isActive ? 'animate-[spin_15s_linear_infinite_reverse]' : ''}`}></div>
      
      {/* Dynamic Pulse Ring */}
      <div 
        className="absolute rounded-full bg-cyan-500/10 ring-animate"
        style={{ 
          width: `${60 + (state.volume * 100)}%`, 
          height: `${60 + (state.volume * 100)}%`,
          transition: 'width 0.1s, height 0.1s'
        }}
      ></div>

      {/* The "Core" / Arc Reactor */}
      <div className={`relative w-40 h-40 rounded-full flex items-center justify-center bg-slate-900 shadow-[inset_0_0_30px_rgba(34,211,238,0.2)] border-2 transition-colors duration-1000 ${isActive ? 'border-cyan-400' : 'border-slate-800'}`}>
        
        {/* Core Glow */}
        <div className={`absolute w-24 h-24 rounded-full blur-2xl transition-opacity duration-500 ${isActive ? (state.isSpeaking ? 'bg-blue-400 opacity-60' : 'bg-cyan-400 opacity-30') : 'opacity-0'}`}></div>

        {/* Circular Bars */}
        <div className="absolute inset-0 flex items-center justify-center">
          {bars.map((_, i) => {
            const rotation = (i * 360) / bars.length;
            const h = isActive ? 10 + (state.volume * 40 * Math.random()) : 5;
            return (
              <div
                key={i}
                className={`absolute w-1 rounded-full transition-all duration-75 ${isActive ? 'bg-cyan-400/80' : 'bg-slate-700'}`}
                style={{
                  height: `${h}px`,
                  transform: `rotate(${rotation}deg) translateY(-60px)`,
                  opacity: isActive ? 0.8 : 0.3
                }}
              />
            );
          })}
        </div>

        {/* Center Symbol */}
        <div className="z-10 flex flex-col items-center">
           <svg viewBox="0 0 24 24" className={`w-12 h-12 transition-colors duration-500 ${isActive ? 'text-cyan-400 fill-cyan-400 arc-reactor-glow' : 'text-slate-700'}`}>
            <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" />
          </svg>
        </div>
      </div>

      {/* Status Labels */}
      <div className="absolute -bottom-2 flex gap-4">
        {state.isListening && <span className="text-[10px] font-mono text-cyan-400 animate-pulse">MIC_ON</span>}
        {state.isSpeaking && <span className="text-[10px] font-mono text-blue-400 animate-pulse">AUDIO_OUT</span>}
      </div>
    </div>
  );
};

export default Visualizer;
