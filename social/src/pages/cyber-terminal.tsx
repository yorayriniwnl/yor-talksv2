import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, Shield, Zap, Play, RotateCcw, 
  Cpu, Lock, Unlock, CheckCircle2, ChevronRight
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface TerminalLine {
  text: string;
  type: 'cmd' | 'output' | 'error' | 'success';
}

export default function CyberTerminal() {
  const currentUser = useAppStore((state) => state.currentUser);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<TerminalLine[]>([
    { text: 'CYBER-OS v4.2.0-RELEASE (x86_64-quantum-arch)', type: 'output' },
    { text: 'Type "help" to view available system commands or "neofetch" for system telemetry.', type: 'output' },
  ]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const executeCommand = (cmdStr: string) => {
    const trimmed = cmdStr.trim();
    if (!trimmed) return;

    uiaudio.click();
    const newHistory: TerminalLine[] = [...history, { text: `user@yor-terminal:~$ ${trimmed}`, type: 'cmd' }];

    const parts = trimmed.split(' ');
    const cmd = parts[0].toLowerCase();
    const arg = parts[1];

    switch (cmd) {
      case 'help':
        newHistory.push({
          text: 'AVAILABLE UTILITIES: help, neofetch, ls, cat, nmap, clear, whoami, uname, date, matrix, ping',
          type: 'output'
        });
        break;

      case 'neofetch':
        newHistory.push({
          text: `
  /\_/\   OS: Cyber-OS 4.2.0 LTS
 ( o.o )  Host: Quantum Node Neural-X9
  > ^ <   Kernel: 6.12.0-ebpf-hardened
          Uptime: 42 days, 13 hours
          Shell: yor-sh 2.4
          Memory: 32768MB / 65536MB
          GPU: Neural Tensor Core RTX 5090
          User: ${currentUser?.name || 'Anya'}
          `,
          type: 'success'
        });
        break;

      case 'whoami':
        newHistory.push({ text: `uid=1000(${currentUser?.name || 'Anya'}) gid=1000(cyber-clan) groups=1000(sudo)`, type: 'output' });
        break;

      case 'ls':
        newHistory.push({ text: 'bin/  etc/  home/  var/  quantum_keys.pem  threat_signatures.db  contracts.sol', type: 'output' });
        break;

      case 'cat':
        if (arg === 'contracts.sol') {
          newHistory.push({ text: 'contract Vault { function withdraw() external {} }', type: 'output' });
        } else {
          newHistory.push({ text: `cat: ${arg || 'file'}: No such file or directory`, type: 'error' });
        }
        break;

      case 'nmap':
        newHistory.push({
          text: `Starting Nmap 7.94 scan on ${arg || '127.0.0.1'}...
PORT     STATE SERVICE
22/tcp   open  ssh
80/tcp   open  http
4000/tcp open  webrtc-signal
5432/tcp open  postgresql
Nmap done: 1 IP address scanned.`,
          type: 'success'
        });
        break;

      case 'clear':
        setHistory([]);
        setInputVal('');
        return;

      default:
        newHistory.push({ text: `yor-sh: command not found: ${cmd}`, type: 'error' });
    }

    setHistory(newHistory);
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(inputVal);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Terminal className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              CYBER TERMINAL // VIRTUAL UNIX EMULATOR
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              In-browser bash command interpreter & network probe toolkit for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center space-x-2 font-mono text-xs text-emerald-400 bg-zinc-950/80 px-4 py-2 rounded-xl border border-white/10">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>SHELL: /BIN/YOR-SH READY</span>
        </div>
      </div>

      {/* Terminal Screen Console */}
      <div 
        onClick={() => inputRef.current?.focus()}
        className="w-full max-w-4xl h-[520px] rounded-2xl bg-black border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.1)] p-6 font-mono text-xs overflow-y-auto flex flex-col justify-between cursor-text"
      >
        <div className="space-y-2">
          {history.map((line, idx) => (
            <div
              key={idx}
              className={cn(
                "leading-relaxed whitespace-pre-wrap",
                line.type === 'cmd' && "text-cyan-300 font-bold",
                line.type === 'output' && "text-zinc-300",
                line.type === 'success' && "text-emerald-400",
                line.type === 'error' && "text-rose-400"
              )}
            >
              {line.text}
            </div>
          ))}
          <div ref={terminalEndRef} />
        </div>

        {/* Command Input Prompt */}
        <div className="flex items-center space-x-2 pt-4 border-t border-white/10">
          <span className="text-emerald-400 font-bold">user@yor-terminal:~$</span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-white font-mono text-xs caret-emerald-400"
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}
