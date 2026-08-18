import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, ShieldAlert, Code, Zap, Play, CheckCircle2, 
  AlertTriangle, Terminal, Cpu, FileText, Lock, ChevronRight
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Vulnerability {
  id: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'OPTIMIZATION';
  line: number;
  description: string;
  recommendation: string;
}

const DEFAULT_CONTRACT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CyberVault {
    mapping(address => uint256) public balances;
    bool private locked;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    // Vulnerable to Reentrancy Attack!
    function withdrawAll() external {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "Zero balance");

        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Transfer failed");

        balances[msg.sender] = 0; // State updated after external call
    }
}`;

export default function AuditStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const [code, setCode] = useState(DEFAULT_CONTRACT);
  const [isScanning, setIsScanning] = useState(false);
  const [auditScore, setAuditScore] = useState<number | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);

  const handleRunAudit = () => {
    uiaudio.warp();
    setIsScanning(true);
    setVulnerabilities([]);
    setAuditScore(null);

    setTimeout(() => {
      uiaudio.success();
      setIsScanning(false);
      setAuditScore(64);
      setVulnerabilities([
        {
          id: 'v-1',
          type: 'Reentrancy Vulnerability (SWC-107)',
          severity: 'CRITICAL',
          line: 16,
          description: 'State variable `balances[msg.sender]` is zeroed after external `.call{value: ...}` execution. Malicious fallback contracts can drain vault funds.',
          recommendation: 'Apply Checks-Effects-Interactions (CEI) pattern or use OpenZeppelin ReentrancyGuard mutex nonReentrant modifier.'
        },
        {
          id: 'v-2',
          type: 'Gas Optimization: Uncached Storage Read',
          severity: 'OPTIMIZATION',
          line: 14,
          description: 'Repeated SLOAD on storage variable without memory caching in loops.',
          recommendation: 'Cache state variables in local stack memory.'
        }
      ]);
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <ShieldCheck className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                AUDIT STUDIO // SMART CONTRACT BYTECODE FUZZER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                SOLIDITY 0.8.20+
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Automated reentrancy fuzzing, symbolic execution & gas profiler for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Audit Score Banner */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          {auditScore !== null && (
            <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
              <div className="text-[10px] text-zinc-400">SECURITY RATING</div>
              <div className="text-lg font-bold text-amber-400">{auditScore} / 100</div>
            </div>
          )}
          <button
            onClick={handleRunAudit}
            disabled={isScanning}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isScanning ? 'FUZZING BYTECODE...' : 'RUN SECURITY SCAN'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* Solidity Source Editor (7 Cols) */}
        <div className="lg:col-span-7 space-y-3 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/10 text-zinc-400">
            <span className="font-bold text-white">SOLIDITY SOURCE CODE</span>
            <span>EVM BYTECODE COMPILE</span>
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-[420px] bg-zinc-950 border border-white/10 rounded-xl p-4 text-emerald-400 font-mono text-xs leading-relaxed focus:outline-none focus:border-emerald-500 transition-colors resize-none scrollbar-thin"
          />
        </div>

        {/* Vulnerability Report Inspector (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              AUDIT FINDINGS ({vulnerabilities.length})
            </h3>
          </div>

          {vulnerabilities.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-zinc-500 text-center space-y-2">
              <ShieldCheck className="w-8 h-8 opacity-40 animate-pulse" />
              <span>Ready for symbolic fuzzing run. Click 'Run Security Scan' to analyze call graphs.</span>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {vulnerabilities.map((v) => (
                <div 
                  key={v.id}
                  className="p-4 rounded-xl bg-zinc-950 border border-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                      v.severity === 'CRITICAL' ? "bg-red-500/20 text-red-400 border border-red-500/40" : "bg-emerald-500/20 text-emerald-300"
                    )}>
                      {v.severity} • LINE {v.line}
                    </span>
                    <span className="font-bold text-white truncate max-w-[180px]">{v.type}</span>
                  </div>

                  <p className="text-zinc-300 leading-relaxed text-[11px] font-sans">
                    {v.description}
                  </p>

                  <div className="p-2.5 rounded bg-zinc-900/80 border border-white/5 text-cyan-300 text-[10px]">
                    <strong>FIX:</strong> {v.recommendation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
