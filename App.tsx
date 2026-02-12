
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { Message, VoiceState } from './types';
import Visualizer from './components/Visualizer';
import ChatLog from './components/ChatLog';
import Header from './components/Header';
import { decode, encode, decodeAudioData } from './utils/audioUtils';

// Advanced Tool definitions for JARVIS
const TOOLS: FunctionDeclaration[] = [
  {
    name: 'search_web',
    parameters: {
      type: Type.OBJECT,
      description: 'Search the web for real-time information, news, or specific research.',
      properties: {
        query: { type: Type.STRING, description: 'The search query or URL.' }
      },
      required: ['query']
    }
  },
  {
    name: 'send_whatsapp_message',
    parameters: {
      type: Type.OBJECT,
      description: 'Send a message to a specific contact via WhatsApp.',
      properties: {
        phoneNumber: { type: Type.STRING, description: 'Recipient phone number with country code.' },
        message: { type: Type.STRING, description: 'The text content.' }
      },
      required: ['phoneNumber', 'message']
    }
  },
  {
    name: 'manage_productivity',
    parameters: {
      type: Type.OBJECT,
      description: 'Set reminders, block time, or prioritize tasks for the user.',
      properties: {
        task: { type: Type.STRING, description: 'The task description.' },
        action: { type: Type.STRING, enum: ['remind', 'prioritize', 'block_time'], description: 'Type of productivity action.' },
        time: { type: Type.STRING, description: 'Time or duration for the task.' }
      },
      required: ['task', 'action']
    }
  },
  {
    name: 'draft_outreach',
    parameters: {
      type: Type.OBJECT,
      description: 'Draft professional emails for Gmail or connection requests/messages for LinkedIn.',
      properties: {
        platform: { type: Type.STRING, enum: ['gmail', 'linkedin'], description: 'Target platform.' },
        recipient: { type: Type.STRING, description: 'Name or description of the recipient.' },
        context: { type: Type.STRING, description: 'Goal of the outreach (e.g., job application, networking).' },
        tone: { type: Type.STRING, description: 'Tone of the message (e.g., formal, concise).' }
      },
      required: ['platform', 'context']
    }
  },
  {
    name: 'open_application',
    parameters: {
      type: Type.OBJECT,
      description: 'Navigate to a specific digital workspace.',
      properties: {
        appName: { type: Type.STRING, enum: ['gmail', 'linkedin', 'calendar', 'youtube', 'github'], description: 'Name of the application.' }
      },
      required: ['appName']
    }
  }
];

const JARVIS_SYSTEM_INSTRUCTION = `You are JARVIS, a highly sophisticated AI assistant. 
Your tone is British, polite, and efficient. Refer to the user as "Sir".

CORE PROTOCOLS:
1. WORK ASSISTANT: Help manage Gmail (summaries, replies), LinkedIn (outreach, networking), and scheduling.
2. FORMATTING: Organize info in bullet points. Provide options before taking final actions. Use step-by-step instructions.
3. GMAIL SPECIALIST: For emails, provide: 1) Summary (3-4 lines), 2) Action items, 3) 3 variations of replies (Formal, Concise, Detailed).
4. LINKEDIN OUTREACH: Help write personalized connection requests and follow-ups. Suggest profile optimizations.
5. PRODUCTIVITY PLANNER: Prioritize tasks by urgency, block time estimates, and suggest Pomodoro workflows.
6. TOOL USAGE: Always confirm your intent before executing a tool.

Initialization sequence: Your first words must be "Systems online. What is the first task you want help with today, Sir?"`;

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    isSpeaking: false,
    volume: 0,
  });

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);

  const cleanupSession = useCallback(() => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    activeSourcesRef.current.clear();
    setIsSessionActive(false);
    setVoiceState({ isListening: false, isSpeaking: false, volume: 0 });
  }, []);

  const handleToolCall = async (fc: any) => {
    const { name, args, id } = fc;
    let result = "Action executed as requested, Sir.";

    switch (name) {
      case 'send_whatsapp_message':
        window.open(`https://wa.me/${args.phoneNumber.replace(/\+/g, '')}?text=${encodeURIComponent(args.message)}`, '_blank');
        result = `WhatsApp interface opened for ${args.phoneNumber}. Message drafted.`;
        break;
      case 'search_web':
        window.open(`https://www.google.com/search?q=${encodeURIComponent(args.query)}`, '_blank');
        result = `Results for "${args.query}" have been retrieved on your primary display.`;
        break;
      case 'open_application':
        const urls: Record<string, string> = {
          gmail: 'https://mail.google.com',
          linkedin: 'https://www.linkedin.com',
          calendar: 'https://calendar.google.com',
          youtube: 'https://www.youtube.com',
          github: 'https://www.github.com'
        };
        window.open(urls[args.appName] || 'https://www.google.com', '_blank');
        result = `Accessing ${args.appName} now, Sir.`;
        break;
      case 'manage_productivity':
        result = `Protocol ${args.action} initiated for: ${args.task}. ${args.time ? `Scheduled for ${args.time}.` : ''}`;
        break;
      case 'draft_outreach':
        result = `I have prepared a ${args.tone || 'professional'} ${args.platform} draft for ${args.recipient || 'your contact'}. Shall I read it back to you?`;
        break;
    }

    setMessages(prev => [...prev, { role: 'system', content: `SYSTEM: Executing ${name.replace(/_/g, ' ')}...`, timestamp: new Date() }]);

    if (sessionRef.current) {
      try {
        sessionRef.current.sendToolResponse({
          functionResponses: { id, name, response: { result } }
        });
      } catch (e) { console.error("Tool response error", e); }
    }
  };

  const startJarvis = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      if (!inputAudioContextRef.current) {
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      }

      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
      if (inputAudioContextRef.current.state === 'suspended') await inputAudioContextRef.current.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: TOOLS }],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
        },
        callbacks: {
          onopen: () => {
            setIsSessionActive(true);
            setVoiceState(prev => ({ ...prev, isListening: true }));
            
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              let sum = 0;
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
                sum += Math.abs(inputData[i]);
              }
              setVoiceState(prev => ({ ...prev, volume: sum / l }));
              sessionPromise.then(session => {
                if (session) {
                  session.sendRealtimeInput({
                    media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' }
                  });
                }
              }).catch(() => {});
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.toolCall) msg.toolCall.functionCalls.forEach(handleToolCall);

            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
              setVoiceState(prev => ({ ...prev, isSpeaking: true }));
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextRef.current.currentTime);
              const buffer = await decodeAudioData(decode(audioData), audioContextRef.current, 24000, 1);
              const source = audioContextRef.current.createBufferSource();
              source.buffer = buffer;
              source.connect(audioContextRef.current.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              activeSourcesRef.current.add(source);
              source.onended = () => {
                activeSourcesRef.current.delete(source);
                if (activeSourcesRef.current.size === 0) setVoiceState(prev => ({ ...prev, isSpeaking: false }));
              };
            }

            if (msg.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setVoiceState(prev => ({ ...prev, isSpeaking: false }));
            }
          },
          onclose: () => cleanupSession(),
          onerror: (e) => cleanupSession()
        }
      });

      sessionRef.current = await sessionPromise;
      setMessages(prev => [...prev, { role: 'system', content: "SYSTEM: JARVIS UPLINK ESTABLISHED.", timestamp: new Date() }]);
    } catch (err) {
      cleanupSession();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-cyan-50 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 via-transparent to-transparent pointer-events-none"></div>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
      
      <Header />

      <main className="flex-1 flex flex-col md:flex-row p-4 gap-4 overflow-hidden relative z-10">
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <ChatLog messages={messages} />
        </div>

        <div className="w-full md:w-80 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-md rounded-2xl border border-cyan-500/20 p-6 shadow-2xl">
          <Visualizer state={voiceState} isActive={isSessionActive} />
          
          <div className="mt-8 text-center">
            <h2 className="text-xl font-bold tracking-widest text-cyan-400 mb-1">
              {isSessionActive ? "JARVIS ACTIVE" : "SYSTEM OFFLINE"}
            </h2>
            <div className="flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isSessionActive ? 'bg-cyan-500 animate-pulse' : 'bg-slate-700'}`}></div>
              <p className="text-[10px] text-cyan-600 font-mono tracking-widest uppercase">
                {isSessionActive ? "Vocal Uplink Established" : "Awaiting Authorization"}
              </p>
            </div>
          </div>

          <button
            onClick={isSessionActive ? cleanupSession : startJarvis}
            className={`mt-10 w-full py-4 rounded-xl font-bold tracking-[0.2em] transition-all duration-500 transform hover:scale-[1.02] active:scale-95 border-2 flex items-center justify-center gap-3 ${
              isSessionActive 
                ? "bg-red-500/10 border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white" 
                : "bg-cyan-500/10 border-cyan-500/50 text-cyan-500 hover:bg-cyan-500 hover:text-white jarvis-glow"
            }`}
          >
            {isSessionActive ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                DISCONNECT
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                INITIALIZE
              </>
            )}
          </button>
          
          <div className="mt-8 space-y-3 w-full">
            <div className="p-3 bg-slate-800/50 rounded-lg border border-cyan-900/30 flex justify-between items-center">
              <span className="text-[10px] uppercase text-cyan-600 font-mono">Protocols</span>
              <span className="text-[10px] font-mono text-cyan-400">GMAIL_LINKEDIN_WA</span>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg border border-cyan-900/30 flex justify-between items-center">
              <span className="text-[10px] uppercase text-cyan-600 font-mono">Response</span>
              <span className="text-[10px] font-mono text-cyan-400 italic">Vocal_Only</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="p-2 text-center text-[10px] text-cyan-900 font-mono tracking-tighter uppercase opacity-50 flex justify-center gap-4">
        <span>Stark Industries Access Level 7</span>
        <span>•</span>
        <span>Mark LII Systems</span>
      </footer>
    </div>
  );
};

export default App;
