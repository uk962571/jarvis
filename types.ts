
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  volume: number;
}
