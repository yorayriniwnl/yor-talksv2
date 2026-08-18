import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Bot, BrainCircuit, Maximize2, Minimize2, Cpu } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

export function AICopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const currentUser = useAppStore((state) => state.currentUser);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize with a contextual greeting based on current user persona
  useEffect(() => {
    if (isOpen && messages.length === 0 && currentUser) {
      uiaudio.warp();
      setMessages([
        {
          id: '1',
          role: 'ai',
          text: `Neural link established. Accessing ${currentUser.name}'s context matrices. How can I assist you with ${currentUser.role || 'your operations'} today?`
        }
      ]);
    }
  }, [isOpen, currentUser, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const toggleOpen = () => {
    uiaudio.click();
    setIsOpen(!isOpen);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    uiaudio.hover();
    
    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', text: inputValue };
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    setIsTyping(true);

    // Mock AI Response with domain-specific flavor
    setTimeout(() => {
      uiaudio.success();
      setIsTyping(false);
      
      let reply = "Processing data...";
      const query = newUserMsg.text.toLowerCase();
      
      if (currentUser?.handle.includes('katana') || currentUser?.handle.includes('forge')) {
        reply = "Analyzing thermal gradients... The carbon diffusion at this temperature is optimal for tamahagane folding.";
      } else if (currentUser?.handle.includes('hypersonic')) {
        reply = "CFD simulation complete. Mach 7 inlet pressure is stabilizing, but boundary layer separation detected on the aft wing.";
      } else if (currentUser?.handle.includes('biomaterial')) {
        reply = "Spectroscopy confirms 100% degradation rate for the marine chitin sample in oceanic conditions.";
      } else {
        reply = "Task executed successfully. Neural network weights have been adjusted accordingly.";
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: reply
      }]);
    }, 1500);
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        className={cn(
          "fixed bottom-6 right-6 p-4 rounded-full shadow-2xl z-50 group",
          "bg-gradient-to-br from-cyan-600 to-indigo-900 border border-cyan-500/50 hover:border-cyan-400 backdrop-blur-md"
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleOpen}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <Sparkles className="w-6 h-6 text-cyan-200 group-hover:text-white transition-colors" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
        </span>
      </motion.button>

      {/* AI Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed z-50 flex flex-col bg-zinc-950/90 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(6,182,212,0.15)]",
              isExpanded 
                ? "bottom-[100px] right-6 w-[600px] h-[70vh] rounded-2xl" 
                : "bottom-[100px] right-6 w-[350px] h-[500px] rounded-2xl"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-cyan-950/50 to-transparent rounded-t-2xl">
              <div className="flex items-center space-x-2">
                <BrainCircuit className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-medium text-white">Neural Co-Pilot</h3>
                  <p className="text-[10px] text-cyan-400/80 font-mono">SYS.VER.2.4.9 // ONLINE</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-zinc-400 hover:text-white"
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button 
                  onClick={toggleOpen}
                  className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-colors text-zinc-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-700"
            >
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div 
                    className={cn(
                      "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                      msg.role === 'user' 
                        ? "bg-cyan-600/20 border border-cyan-500/30 text-cyan-50 rounded-br-sm" 
                        : "bg-zinc-800/50 border border-white/5 text-zinc-300 rounded-bl-sm"
                    )}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex items-center space-x-2 text-zinc-500 text-sm p-2 bg-zinc-800/30 rounded-2xl w-fit rounded-bl-sm">
                  <Cpu className="w-4 h-4 animate-spin text-cyan-500" />
                  <span className="font-mono text-[10px] tracking-widest animate-pulse">PROCESSING...</span>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-white/10 bg-zinc-900/50 rounded-b-2xl">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Initiate prompt sequence..."
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isTyping}
                  className="absolute right-2 p-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
