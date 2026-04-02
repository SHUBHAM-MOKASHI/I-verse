"use client";

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Eraser, PaintBucket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Point {
  x: number;
  y: number;
}

interface DrawLineProps {
  prevPoint: Point | null;
  currentPoint: Point;
  color: string;
  width: number;
}

export default function Canvas({ isDrawer }: { isDrawer: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);
  const { socket, room, reactions } = useGameStore();
  const prevPoint = useRef<Point | null>(null);

  const colors = ['#000000', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#A855F7', '#FFFFFF'];

  useEffect(() => {
    if (!socket) return;
    
    socket.on('draw_line', ({ prevPoint, currentPoint, color, width }: DrawLineProps) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        const w = canvas.width;
        const h = canvas.height;
        const p1 = prevPoint ? { x: prevPoint.x * w, y: prevPoint.y * h } : null;
        const p2 = { x: currentPoint.x * w, y: currentPoint.y * h };
        drawLine(ctx, p1, p2, color, width);
      }
    });

    socket.on('clear_canvas', () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });

    return () => {
      socket.off('draw_line');
      socket.off('clear_canvas');
    };
  }, [socket]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 1000;
      canvas.height = 1000;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
      }
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !container) return;
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      const size = Math.min(width, height);
      
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    resizeObserver.observe(container);
    handleResize();
    
    return () => resizeObserver.disconnect();
  }, []);

  const drawLine = (ctx: CanvasRenderingContext2D, p1: Point | null, p2: Point, strokeColor: string, strokeWidth: number) => {
    ctx.beginPath();
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor;
    
    if (p1) {
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    } else {
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(p2.x, p2.y); // Draw dot
    }
    ctx.stroke();
    ctx.closePath();
  };

  const onDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || !isDrawer || room?.status !== 'playing') return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const currentPointRelative = {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height
    };

    const w = canvas.width;
    const h = canvas.height;
    
    const p1 = prevPoint.current ? { x: prevPoint.current.x * w, y: prevPoint.current.y * h } : null;
    const p2 = { x: currentPointRelative.x * w, y: currentPointRelative.y * h };

    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawLine(ctx, p1, p2, color, lineWidth);
    }

    socket?.emit('draw_line', {
      roomId: room?.id,
      line: { prevPoint: prevPoint.current, currentPoint: currentPointRelative, color, width: lineWidth }
    });

    prevPoint.current = currentPointRelative;
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer || room?.status !== 'playing') return;
    setIsDrawing(true);
    isDrawingRef.current = true;
    prevPoint.current = null;
    onDraw(e);
  };

  const handleEnd = () => {
    setIsDrawing(false);
    isDrawingRef.current = false;
    prevPoint.current = null;
  };

  const clearCanvas = () => {
    if (!isDrawer) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      socket?.emit('clear_canvas', room?.id);
    }
  };

  const sendReaction = (type: string) => {
    socket?.emit('reaction', { roomId: room?.id, type });
  };

  return (
    <div className="flex flex-col w-full h-full min-h-[300px] bg-slate-100 rounded-2xl overflow-hidden shadow-inner relative">
      <div 
        ref={containerRef}
        className="flex-1 w-full h-full relative cursor-crosshair touch-none flex items-center justify-center bg-transparent"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleStart}
          onMouseMove={onDraw}
          onMouseUp={handleEnd}
          onMouseOut={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={onDraw}
          onTouchEnd={handleEnd}
          className="block bg-white shadow-sm"
        />
        
        {!isDrawer && room?.status === 'playing' && (
          <div className="absolute inset-0 pointer-events-none border-4 border-blue-400/20 z-10 rounded-2xl"></div>
        )}
        {room?.status !== 'playing' && (
          <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] flex items-center justify-center z-20">
            <p className="text-slate-800 font-bold bg-white/80 px-4 py-2 rounded-full shadow-sm">
              {room?.status === 'choosing_word' ? 'Waiting for drawer to choose a word...' : 'Game is paused'}
            </p>
          </div>
        )}
        
        {/* Floating Reactions */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
          <AnimatePresence>
            {room?.status === 'playing' && reactions.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 50, scale: 0.5, left: `${r.x}%` }}
                animate={{ opacity: [0, 1, 1, 0], y: -250, scale: [0.5, 1.2, 1], left: `${r.x + (Math.random() * 10 - 5)}%` }}
                transition={{ duration: 2.5, ease: "easeOut" }}
                className="absolute bottom-10 drop-shadow-lg -translate-x-1/2 flex flex-col items-center"
              >
                <div className="text-4xl">
                  {r.type === 'like' && '👍'}
                  {r.type === 'dislike' && '👎'}
                  {r.type === 'laugh' && '😂'}
                  {r.type === 'fire' && '🔥'}
                </div>
                <div className="text-[10px] text-center font-bold text-white bg-black/50 rounded-full px-2 mt-1 whitespace-nowrap">{r.playerName}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      </div>

      {!isDrawer && room?.status === 'playing' && (
        <div className="bg-slate-50 border-t border-slate-200 p-2 flex items-center justify-center gap-6 z-30">
          <button onClick={() => sendReaction('like')} className="p-2 hover:bg-slate-200 rounded-full transition-all hover:scale-110 active:scale-95 text-3xl shadow-sm bg-white" title="Like">👍</button>
          <button onClick={() => sendReaction('dislike')} className="p-2 hover:bg-slate-200 rounded-full transition-all hover:scale-110 active:scale-95 text-3xl shadow-sm bg-white" title="Dislike">👎</button>
          <button onClick={() => sendReaction('laugh')} className="p-2 hover:bg-slate-200 rounded-full transition-all hover:scale-110 active:scale-95 text-3xl shadow-sm bg-white" title="Laugh">😂</button>
          <button onClick={() => sendReaction('fire')} className="p-2 hover:bg-slate-200 rounded-full transition-all hover:scale-110 active:scale-95 text-3xl shadow-sm bg-white" title="Fire!">🔥</button>
        </div>
      )}

      {isDrawer && room?.status === 'playing' && (
        <div className="bg-white border-t border-slate-200 p-2 md:p-3 flex flex-wrap items-center justify-between gap-2 z-30">
          <div className="flex items-center gap-1 md:gap-2">
            {colors.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 md:w-8 md:h-8 rounded-full border-2 transition-transform shrink-0 ${color === c ? 'scale-110 border-slate-400 shadow-md' : 'border-transparent hover:scale-105'}`}
                style={{ backgroundColor: c, boxShadow: c === '#FFFFFF' ? 'inset 0 0 0 1px #e2e8f0' : 'none' }}
              />
            ))}
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-1 md:gap-2 bg-slate-100 px-2 py-1.5 md:px-3 rounded-lg">
              <PaintBucket className="w-4 h-4 text-slate-500" />
              <input 
                type="range" 
                min="2" 
                max="20" 
                value={lineWidth} 
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="w-16 md:w-24 accent-blue-500"
              />
            </div>
            
            <button 
              onClick={clearCanvas}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 font-semibold text-sm"
              title="Clear Canvas"
            >
              <Eraser className="w-5 h-5" /> Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
