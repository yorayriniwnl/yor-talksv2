import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, ShieldCheck, Terminal, AlertTriangle, Activity, 
  Lock, Unlock, Cpu, Zap, Radio, CheckCircle2, ChevronRight
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface ThreatAlert {
  id: string;
  timestamp: string;
  sourceIp: string;
  targetService: string;
  vector: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  status: 'BLOCKED' | 'INVESTIGATING' | 'QUARANTINED';
}

const INITIAL_THREATS: ThreatAlert[] = [
  { id: 't-1', timestamp: '00:19:42', sourceIp: '185.220.101.44 (Tor Exit Node)', targetService: 'PostgreSQL DB Core:5432', vector: 'CVE-2026-8812 SQL Injection Probe', severity: 'CRITICAL', status: 'BLOCKED' },
  { id: 't-2', timestamp: '00:19:35', sourceIp: '194.26.29.112 (Botnet Pool)', targetService: 'WebSocket Gateway:4000', vector: 'SYN Flood SYN-ACK Exhaustion (4.2 Mpps)', severity: 'HIGH', status: 'QUARANTINED' },
  { id: 't-3', timestamp: '00:19:18', sourceIp: '45.154.255.89 (Unknown ASN)', targetService: 'Auth Token Dispatcher', vector: 'JWT Signature Algorithm None Bypass', severity: 'CRITICAL', status: 'BLOCKED' },
  { id: 't-4', timestamp: '00:18:50', sourceIp: '103.145.2.14 (Proxy Mesh)', targetService: 'WebRTC Signal Mesh', vector: 'STUN/TURN UDP Packet Amplification', severity: 'MEDIUM', status: 'BLOCKED' },
];

export default function ThreatSoc() {
  const currentUser = useAppStore((state) => state.currentUser);
  const [threats, setThreats] = useState<ThreatAlert[]>(INITIAL_THREATS);
  const [activeQuarantine, setActiveQuarantine] = useState(false);
  const [quarantineCount, setQuarantineCount] = useState(148);
  const [zeroTrustScore, setZeroTrustScore] = useState(99.4);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (Math.random() > 0.4) {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        const newIp = `${Math.floor(Math.random() * 200) + 40}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

        setThreats(prev => [
          {
            id: Math.random().toString(),
            timestamp: timeStr,
            sourceIp: `${newIp} (Automated Scanner)`,
            targetService: 'eBPF Sandbox Runtime',
            vector: 'Unauthorized Memset Syscall Trapped',
            severity: 'HIGH',
            status: 'BLOCKED'
          },
          ...prev.slice(0, 12)
        ]);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const handleQuarantineAll = () => {
    uiaudio.warp();
    setActiveQuarantine(true);

    setTimeout(() => {
      uiaudio.success();
      setQuarantineCount(c => c + threats.length);
      setZeroTrustScore(99.9);
      setThreats(prev => prev.map(t => ({ ...t, status: 'QUARANTINED' })));
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-red-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(239,68,68,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-700 flex items-center justify-center shadow-lg shadow-red-500/30 border border-red-400/40">
            <ShieldAlert className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-rose-300 to-amber-400">
                THREAT SOC // ZERO-TRUST DEFENSE COMMAND
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                eBPF SANDBOX LEVEL 5
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Live automated kernel intrusion detection and zero-day containment for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={handleQuarantineAll}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 font-bold text-white shadow-lg hover:brightness-110 flex items-center space-x-2 transition-all"
          >
            <Lock className="w-4 h-4" />
            <span>TRIGGER GLOBAL IP QUARANTINE</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* Threat Stream Feed (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-red-400" />
              <span className="font-bold text-white">REAL-TIME ZERO-DAY INTRUSION STREAM</span>
            </div>
            <span className="text-[10px] text-red-400 animate-pulse">● LIVE INTERCEPT</span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {threats.map((threat) => (
              <div 
                key={threat.id}
                className="p-4 rounded-xl bg-zinc-950/80 border border-white/5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                      threat.severity === 'CRITICAL' ? "bg-red-500/20 text-red-400 border border-red-500/40" : "bg-amber-500/20 text-amber-300"
                    )}>
                      {threat.severity}
                    </span>
                    <span className="font-bold text-white">{threat.vector}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500">{threat.timestamp}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 pt-1 border-t border-white/5">
                  <div>SRC: <strong className="text-zinc-300">{threat.sourceIp}</strong></div>
                  <div>TGT: <strong className="text-cyan-400">{threat.targetService}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Assembly & Security Telemetry (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Terminal className="w-5 h-5 text-red-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              eBPF DISASSEMBLY
            </h3>
          </div>

          <div className="p-3 bg-zinc-950 rounded-xl border border-white/10 font-mono text-[11px] text-emerald-400 space-y-1 overflow-x-auto">
            <div className="text-zinc-500">// Intercepted Syscall Hook</div>
            <div>0x00401000: mov eax, [ebp+0x08]</div>
            <div>0x00401003: cmp eax, 0x7f000001</div>
            <div>0x00401008: jne 0x00401020 &lt;drop&gt;</div>
            <div>0x0040100a: call bpf_ringbuf_submit</div>
            <div className="text-red-400 font-bold">// STATUS: EXECUTION QUARANTINED</div>
          </div>

          <div className="p-4 bg-zinc-950 rounded-xl border border-white/5 space-y-2">
            <div className="flex justify-between text-zinc-400">
              <span>Zero-Trust Integrity:</span>
              <span className="text-emerald-400 font-bold">{zeroTrustScore}% OPTIMAL</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Isolated Blacklist IPs:</span>
              <span className="text-red-400 font-bold">{quarantineCount} CIDRs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
