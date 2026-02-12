
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="p-6 flex justify-between items-center border-b border-cyan-500/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
          <span className="text-cyan-400 font-black text-xl italic">J</span>
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-[0.3em] text-cyan-100">JARVIS</h1>
          <p className="text-[10px] text-cyan-600 font-mono -mt-1 tracking-widest">PERSONAL_ASSISTANT_AI</p>
        </div>
      </div>
      
      <div className="flex gap-6 items-center">
        <div className="hidden md:flex flex-col items-end font-mono">
          <span className="text-[10px] text-cyan-800 uppercase">System Status</span>
          <span className="text-xs text-cyan-400 animate-pulse">NOMINAL_OPERATIONS</span>
        </div>
        <div className="w-px h-8 bg-cyan-900/50 hidden md:block"></div>
        <div className="flex flex-col items-end font-mono">
          <span className="text-[10px] text-cyan-800 uppercase">Encryption</span>
          <span className="text-xs text-cyan-400 italic">SECURE_UPLINK</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
