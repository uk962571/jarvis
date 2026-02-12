
import React, { useRef, useEffect } from 'react';
import { Message } from '../types';

interface ChatLogProps {
  messages: Message[];
}

const ChatLog: React.FC<ChatLogProps> = ({ messages }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide custom-scrollbar" ref={scrollRef}>
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center opacity-20 pointer-events-none">
          <p className="text-xl font-mono tracking-widest text-cyan-400">HISTORY_EMPTY</p>
          <p className="text-xs font-mono">INITIALIZE SYSTEM TO BEGIN LOGGING</p>
        </div>
      )}
      {messages.map((msg, idx) => (
        <div 
          key={idx} 
          className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}
        >
          <div className={`max-w-[85%] px-4 py-3 rounded-xl border font-mono text-sm leading-relaxed ${
            msg.role === 'user' 
              ? 'bg-cyan-500/5 border-cyan-500/20 text-cyan-200' 
              : msg.role === 'system'
              ? 'bg-slate-800/30 border-slate-700/50 text-slate-400 italic text-xs'
              : 'bg-slate-800/50 border-cyan-400/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.05)]'
          }`}>
            <div className="flex justify-between items-center mb-1 text-[10px] opacity-40 uppercase tracking-tighter">
              <span>{msg.role}</span>
              <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
            {msg.content}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatLog;
