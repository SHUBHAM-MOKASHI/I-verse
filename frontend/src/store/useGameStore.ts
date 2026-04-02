import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

export interface Player {
  id: string;
  name: string;
  avatar?: string;
  score: number;
  isDrawer: boolean;
  hasGuessed: boolean;
}

export interface RoomSettings {
  rounds: number;
  wordsCount: number;
  drawTime: number;
  guessTime: number;
}

export interface RoomState {
  id: string;
  settings: RoomSettings;
  players: Player[];
  status: 'waiting' | 'choosing_word' | 'playing' | 'round_end' | 'game_over';
  currentRound: number;
  drawerIndex: number;
  currentWord: string;
  wordHints: string;
  timer: number;
}

export interface ChatMessage {
  id: string;
  system: boolean;
  sender?: string;
  text: string;
}

export interface Reaction {
  id: string;
  type: string;
  playerName: string;
  x: number;
}

interface GameStore {
  socket: Socket | null;
  isConnected: boolean;
  room: RoomState | null;
  messages: ChatMessage[];
  wordChoices: string[];
  reactions: Reaction[];
  
  connectSocket: () => void;
  disconnectSocket: () => void;
  setRoom: (room: RoomState | null) => void;
  addMessage: (msg: Omit<ChatMessage, 'id'>) => void;
  setWordChoices: (choices: string[]) => void;
  clearMessages: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  socket: null,
  isConnected: false,
  room: null,
  messages: [],
  wordChoices: [],
  reactions: [],

  connectSocket: () => {
    const { socket } = get();
    if (socket) return;
    
    // Connect to deployed backend URL if available, otherwise fallback to local network
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const localUrl = `http://${host}:3001`;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || localUrl;
    
    const newSocket = io(backendUrl);

    newSocket.on('connect', () => {
      set({ isConnected: true });
    });

    newSocket.on('disconnect', () => {
      set({ isConnected: false });
    });

    newSocket.on('room_updated', (room: RoomState) => {
      set({ room });
    });

    newSocket.on('timer_update', (timer: number) => {
      set((state) => ({ room: state.room ? { ...state.room, timer } : null }));
    });

    newSocket.on('chat_message', (msg: Omit<ChatMessage, 'id'>) => {
      set((state) => ({
        messages: [...state.messages, { ...msg, id: Math.random().toString() }]
      }));
    });

    newSocket.on('word_choices', (choices: string[]) => {
      set({ wordChoices: choices });
    });

    newSocket.on('reaction_received', (reaction: Reaction) => {
      set((state) => ({ reactions: [...state.reactions, reaction] }));
      setTimeout(() => {
        set((state) => ({ reactions: state.reactions.filter(r => r.id !== reaction.id) }));
      }, 3000);
    });

    set({ socket: newSocket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, room: null, messages: [], wordChoices: [], reactions: [] });
    }
  },

  setRoom: (room) => set({ room }),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, { ...msg, id: Math.random().toString() }] })),
  setWordChoices: (choices) => set({ wordChoices: choices }),
  clearMessages: () => set({ messages: [] })
}));
