"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Pencil, Play, Users, Settings } from 'lucide-react';

const AVATARS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🦄', '🐙', '👾', '👻', '👽', '🤖'];

export default function Home() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [avatar, setAvatar] = useState('🐶');
  const [roomId, setRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(true);

  // Settings
  const [rounds, setRounds] = useState(3);
  const [drawTime, setDrawTime] = useState(60);
  const [wordsCount, setWordsCount] = useState(3);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRoomId = params.get('roomId');
      const err = params.get('error');
      
      if (urlRoomId) {
        setRoomId(urlRoomId.trim().toUpperCase());
        setIsCreating(false);
      }
      if (err) {
        // give a user friendly error message based on common socket errors
        const errMsg = err === 'room_exists' ? 'Room already exists.' : 
                       err === 'Room not found' ? 'Invalid room code! Please check and try again.' : 
                       err === 'Room is full' ? 'This room is full.' : 
                       err === 'Game already in progress' ? 'The game has already started!' : err;
        alert(`Could not join: ${errMsg}`);
      }
    }
  }, []);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Store settings in query/state or let the room page handle creation via socket
    const query = new URLSearchParams({
      name: playerName,
      avatar: avatar,
      rounds: rounds.toString(),
      drawTime: drawTime.toString(),
      wordsCount: wordsCount.toString(),
      action: 'create'
    }).toString();
    
    router.push(`/room/${newRoomId}?${query}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !roomId.trim()) return;
    
    const query = new URLSearchParams({
      name: playerName,
      avatar: avatar,
      action: 'join'
    }).toString();
    
    router.push(`/room/${roomId.trim().toUpperCase()}?${query}`);
  };

  return (
    <main className="min-h-screen flex p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-panel w-full max-w-md p-8 relative overflow-hidden m-auto my-auto"
      >
        {/* Decorative blobs */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>

        <div className="relative z-10 text-center mb-10">
          <motion.h1 
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="text-5xl font-extrabold flex items-center justify-center gap-1 tracking-tight"
          >
            <Pencil className="w-10 h-10 text-blue-400 rotate-[-15deg]" strokeWidth={3} />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              -verse
            </span>
          </motion.h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">Draw, Guess, Win.</p>
        </div>

        <div className="flex gap-2 mb-8 bg-slate-800/50 p-1 rounded-lg backdrop-blur-sm relative z-10">
          <button
            onClick={() => setIsCreating(true)}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${isCreating ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            Create Room
          </button>
          <button
            onClick={() => setIsCreating(false)}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${!isCreating ? 'bg-purple-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            Join Room
          </button>
        </div>

        <div className="relative z-10">
          {isCreating ? (
            <form onSubmit={handleCreateRoom} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Your Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                  placeholder="Enter your nickname"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Choose Avatar</label>
                <div className="flex gap-2 overflow-x-auto pb-2 pt-1 px-1 custom-scrollbar snap-x">
                  {AVATARS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatar(emoji)}
                      className={`text-2xl w-12 h-12 shrink-0 rounded-full flex items-center justify-center transition-all snap-center ${avatar === emoji ? 'bg-blue-500/20 border-2 border-blue-500 scale-110 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-800/50 border border-slate-700 hover:bg-slate-700 hover:scale-105'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Settings className="w-3 h-3" /> Rounds
                  </label>
                  <select
                    value={rounds}
                    onChange={(e) => setRounds(Number(e.target.value))}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all appearance-none"
                  >
                    <option value={3}>3 Rounds</option>
                    <option value={5}>5 Rounds</option>
                    <option value={10}>10 Rounds</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Draw Time</label>
                  <select
                    value={drawTime}
                    onChange={(e) => setDrawTime(Number(e.target.value))}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all appearance-none"
                  >
                    <option value={45}>45s</option>
                    <option value={60}>60s</option>
                    <option value={90}>90s</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Words Count</label>
                  <select
                    value={wordsCount}
                    onChange={(e) => setWordsCount(Number(e.target.value))}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all appearance-none"
                  >
                    <option value={3}>3 Words</option>
                    <option value={4}>4 Words</option>
                    <option value={5}>5 Words</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transform active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(59,130,246,0.5)]"
              >
                <Play className="w-5 h-5 fill-current" /> Create Game
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinRoom} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Your Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-slate-600"
                  placeholder="Enter your nickname"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Choose Avatar</label>
                <div className="flex gap-2 overflow-x-auto pb-2 pt-1 px-1 custom-scrollbar snap-x">
                  {AVATARS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatar(emoji)}
                      className={`text-2xl w-12 h-12 shrink-0 rounded-full flex items-center justify-center transition-all snap-center ${avatar === emoji ? 'bg-purple-500/20 border-2 border-purple-500 scale-110 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-slate-800/50 border border-slate-700 hover:bg-slate-700 hover:scale-105'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Room Code</label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-mono text-center tracking-widest placeholder:text-slate-600 placeholder:tracking-normal placeholder:font-sans"
                  placeholder="e.g. AB12CD"
                  maxLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transform active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(168,85,247,0.5)]"
              >
                <Users className="w-5 h-5" /> Join Game
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </main>
  );
}
