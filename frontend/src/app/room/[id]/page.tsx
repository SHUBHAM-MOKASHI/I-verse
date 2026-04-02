"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Timer, Trophy, Send, Users, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { useGameStore } from '../../../store/useGameStore';
import Canvas from '../../../components/Canvas';
import confetti from 'canvas-confetti';

const playDing = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch(e) {}
};

const playTick = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch(e) {}
};

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const roomId = params.id as string;
  const playerName = searchParams.get('name') || '';
  const action = searchParams.get('action') || 'join';
  const rounds = Number(searchParams.get('rounds')) || 3;
  const drawTime = Number(searchParams.get('drawTime')) || 60;
  
  const { socket, connectSocket, disconnectSocket, room, isConnected, messages, wordChoices } = useGameStore();
  
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  const currentPlayer = room?.players.find(p => p.id === socket?.id);
  const isDrawer = currentPlayer?.isDrawer || false;
  const isHost = room?.players[0]?.id === socket?.id;

  useEffect(() => {
    if (!playerName) {
      router.push('/');
      return;
    }
    
    connectSocket();
    return () => disconnectSocket();
  }, [playerName, router, connectSocket, disconnectSocket]);

  useEffect(() => {
    if (!socket || !isConnected) return;
    
    if (action === 'create') {
      socket.emit('create_room', { roomId, playerName, settings: { rounds, wordsCount: 3, drawTime, guessTime: 30 } }, (res: any) => {
        if (res.error) router.push('/?error=room_exists');
      });
    } else {
      socket.emit('join_room', { roomId, playerName }, (res: any) => {
        if (res.error) router.push(`/?error=${res.error}`);
      });
    }
  }, [socket, isConnected, action, roomId, playerName, router, rounds, drawTime]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (room?.status === 'playing' && room.timer <= 10 && room.timer > 0) {
      playTick();
    }
  }, [room?.timer, room?.status]);

  useEffect(() => {
    if (!socket || !isConnected) return;
    
    const handleCorrectGuess = ({ playerId }: any) => {
      playDing();
      if (playerId === socket.id) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    };
    
    socket.on('correct_guess', handleCorrectGuess);

    return () => {
      socket.off('correct_guess', handleCorrectGuess);
    };
  }, [socket, isConnected]);

  const handleStartGame = () => {
    socket?.emit('start_game', roomId);
  };

  const handleChooseWord = (word: string) => {
    socket?.emit('word_chosen', { roomId, word });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;
    socket.emit('chat_message', { roomId, text: chatInput });
    setChatInput('');
  };

  const copyLink = () => {
    const url = `${window.location.origin}/?roomId=${roomId}`;
    navigator.clipboard.writeText(url);
    alert('Room link copied!');
  };

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent animate-spin rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 p-2 md:p-6 flex flex-col items-center gap-2 md:gap-4 bg-[#0f172a] text-slate-100 max-w-7xl mx-auto">
      
      {/* Header Area */ }
      <header className="w-full glass-panel p-3 md:p-4 flex flex-wrap justify-between items-center gap-2 md:gap-4 shrink-0 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="bg-blue-500/20 text-blue-400 font-mono font-bold px-4 py-2 rounded-xl flex items-center gap-2 border border-blue-500/30">
            <span className="text-sm uppercase tracking-widest">Room</span>
            <span className="text-xl">{room.id}</span>
          </div>
          
          {room.status === 'playing' && (
            <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
              <Timer className={`w-5 h-5 ${room.timer <= 10 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
              <span className={`font-bold text-xl ${room.timer <= 10 ? 'text-red-500' : 'text-slate-200'}`}>{room.timer}s</span>
            </div>
          )}
        </div>

        <div className="flex-1 flex justify-center min-w-[200px]">
          {room.status === 'playing' ? (
            <div className="text-center min-w-0 max-w-[45vw] xl:max-w-none">
              <p className="text-[9px] md:text-xs uppercase tracking-widest text-slate-400 mb-0.5 md:mb-1 font-bold truncate">Word to guess</p>
              <h2 className="text-sm md:text-2xl font-mono font-bold tracking-normal md:tracking-[0.2em] bg-slate-800/80 px-2 md:px-6 py-1 md:py-2 rounded-lg md:rounded-xl border border-slate-700 shadow-inner truncate">
                {isDrawer ? room.currentWord : room.wordHints}
              </h2>
            </div>
          ) : (
            <div className="text-sm md:text-xl font-bold text-slate-300">
              {room.status === 'waiting' ? 'Waiting to start' : 
               room.status === 'choosing_word' ? 'Choosing word...' : 
               room.status === 'round_end' ? 'Round Ended!' : 'Game Over!'}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Round</p>
            <p className="font-bold text-lg">{room.currentRound} <span className="text-slate-500">/ {room.settings.rounds}</span></p>
          </div>
          <button onClick={copyLink} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 text-slate-300">
            <LinkIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Game Area */}
      <div className="flex-1 w-full grid grid-cols-2 xl:grid-cols-[16rem_1fr_20rem] gap-2 md:gap-4 min-h-0 pb-2 overflow-y-auto xl:overflow-hidden touch-pan-y">
        
        {/* Left sidebar: Players */}
        <aside className="col-span-1 glass-panel p-2 flex flex-col gap-2 overflow-y-auto no-scrollbar order-2 xl:order-1 max-h-[45vh] xl:max-h-full">
          <div className="flex items-center gap-2 mb-1 text-slate-400 font-bold uppercase tracking-wider text-[10px] md:text-xs shrink-0">
            <Users className="w-4 h-4" /> Players ({room.players.length}/10)
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto pb-2 xl:pb-0">
            {room.players.sort((a,b) => b.score - a.score).map((p, i) => (
              <div 
                key={p.id} 
                className={`flex items-center justify-between p-2 md:p-3 rounded-xl transition-all border ${p.hasGuessed ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <span className="font-bold text-slate-400 text-xs w-4">#{i+1}</span>
                  <div className="truncate font-semibold text-sm flex items-center gap-1.5 object-contain">
                    <span className="truncate">{p.name} {p.id === socket?.id && '(You)'}</span>
                    {p.isDrawer && <Pencil className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                  </div>
                </div>
                <div className="flex items-center gap-1 font-bold text-blue-400">
                  {p.score} <span className="text-[10px] text-slate-500 font-normal">pts</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Center Canvas */}
        <main className="col-span-2 xl:col-span-1 relative order-1 xl:order-2 flex flex-col h-[48vh] xl:min-h-0 xl:flex-1 w-full rounded-2xl overflow-hidden">
          {room.status === 'choosing_word' && isDrawer ? (
            <div className="absolute inset-0 z-40 glass-panel flex flex-col items-center justify-center p-4 md:p-6 animate-in fade-in zoom-in duration-300">
              <h3 className="text-xl md:text-3xl font-bold mb-4 md:mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Choose a Word to Draw</h3>
              <div className="flex flex-col md:flex-row flex-wrap gap-3 md:gap-4 justify-center">
                {wordChoices.map((w, i) => (
                  <button 
                    key={i}
                    onClick={() => handleChooseWord(w)}
                    className="px-4 py-2 md:px-8 md:py-4 bg-slate-800 hover:bg-slate-700 rounded-xl md:rounded-2xl text-base md:text-xl font-bold border border-slate-600 hover:border-blue-500 transition-all shadow-lg hover:shadow-blue-500/20 hover:-translate-y-1"
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          ) : room.status === 'waiting' ? (
            <div className="absolute inset-0 z-40 glass-panel flex flex-col items-center justify-center">
              <h2 className="text-3xl font-bold mb-4 text-center">Waiting for players...</h2>
              <p className="text-slate-400 mb-8 max-w-sm text-center">Share the room code <b className="text-white">{room.id}</b> with your friends to join.</p>
              {room.players.length > 1 ? (
                isHost ? (
                  <button 
                    onClick={handleStartGame}
                    className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all hover:scale-105"
                  >
                    <Pencil className="w-5 h-5" /> Start Game Now
                  </button>
                ) : (
                  <p className="text-xl font-bold text-slate-300 animate-pulse bg-slate-800 px-6 py-3 rounded-xl border border-slate-700">Waiting for host to start the game...</p>
                )
              ) : null}
            </div>
          ) : room.status === 'round_end' ? (
             <div className="absolute inset-0 z-40 glass-panel flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md">
                <AlertCircle className="w-16 h-16 text-yellow-500 mb-4 animate-bounce" />
                <h2 className="text-3xl font-bold mb-2">Round over!</h2>
                <p className="text-xl text-slate-300">The word was: <span className="font-bold text-yellow-500 uppercase">{room.currentWord}</span></p>
             </div>
          ) : room.status === 'game_over' ? (
             <div className="absolute inset-0 z-40 glass-panel flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-xl">
                <Trophy className="w-24 h-24 text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                <h1 className="text-5xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600">Game Over!</h1>
                <h2 className="text-2xl text-slate-300 mb-8">Winner: {room.players.sort((a,b)=>b.score-a.score)[0]?.name}</h2>
                <button 
                  onClick={() => router.push('/')}
                  className="px-8 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-white transition-all shadow-lg hover:shadow-xl"
                >
                  Back to Home
                </button>
             </div>
          ) : null}

          <Canvas isDrawer={isDrawer} />
        </main>

        {/* Right sidebar: Chat */}
        <aside className="col-span-1 glass-panel flex flex-col order-3 h-[45vh] xl:h-auto border border-slate-700/50 overflow-hidden">
          <div className="p-2 md:p-3 border-b border-slate-700/50 bg-slate-800/30 font-bold text-[10px] md:text-sm tracking-widest text-slate-400 uppercase shrink-0">
            Chat & Guesses
          </div>
          
          <div 
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 no-scrollbar"
          >
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div 
                  key={m.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-[10px] md:text-sm px-2 md:px-3 py-1.5 md:py-2 rounded-lg md:rounded-xl break-words ${
                    m.system 
                      ? m.text.includes('guessed') ? 'bg-green-500/20 text-green-300 font-bold border border-green-500/30' : 'text-slate-400 italic font-medium bg-slate-800/50 text-center' 
                      : 'bg-slate-800 text-slate-200 border border-slate-700'
                  }`}
                >
                  {!m.system && <span className="font-bold text-blue-400 mr-2">{m.sender}:</span>}
                  {m.text}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-700/50 bg-slate-800/30">
            <div className="relative flex items-center">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isDrawer || currentPlayer?.hasGuessed}
                placeholder={isDrawer ? "Drawing..." : currentPlayer?.hasGuessed ? "Guessed!" : "Guess..."}
                className="w-full bg-slate-900 border border-slate-600 rounded-full pl-3 pr-10 md:pl-5 md:pr-12 py-2 md:py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-xs md:text-sm disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={isDrawer || currentPlayer?.hasGuessed || !chatInput.trim()}
                className="absolute right-2 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:hover:bg-blue-500"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </aside>
      </div>

    </div>
  );
}
