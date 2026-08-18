import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, DollarSign, Activity, BarChart3, LineChart, 
  ArrowUpRight, ArrowDownRight, RefreshCw, Layers, ShieldCheck, Zap,
  Briefcase, Filter, Search, Globe, Clock, ChevronRight
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface TickerData {
  symbol: string;
  name: string;
  creatorHandle: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  category: 'Esports' | 'Audio' | 'Aero' | 'Hardware' | 'Biotech' | 'Artisan';
  history: number[];
}

const INITIAL_TICKERS: TickerData[] = [
  { symbol: 'ANYA', name: 'Anya Esports Prime', creatorHandle: '@anya_gaming', price: 428.50, change24h: 14.8, volume24h: 1240000, marketCap: 42850000, category: 'Esports', history: [380, 395, 390, 410, 405, 418, 428.5] },
  { symbol: 'KATANA', name: 'Kazuki Tamahagane Forge', creatorHandle: '@kazuki_katana', price: 89.20, change24h: 8.4, volume24h: 680000, marketCap: 17840000, category: 'Artisan', history: [78, 80, 82, 81, 85, 87, 89.2] },
  { symbol: 'SCRAM', name: 'Tariq Mach 7 Aerodynamics', creatorHandle: '@tariq_hypersonic', price: 142.10, change24h: -3.2, volume24h: 910000, marketCap: 28420000, category: 'Aero', history: [155, 152, 149, 148, 145, 143, 142.1] },
  { symbol: 'CHITIN', name: 'Soraya Ocean Biopolymers', creatorHandle: '@soraya_biomaterials', price: 215.75, change24h: 22.6, volume24h: 1850000, marketCap: 64725000, category: 'Biotech', history: [170, 175, 185, 192, 205, 210, 215.75] },
  { symbol: 'SARANGI', name: 'Siddhartha 22-Shruti Acoustics', creatorHandle: '@siddhartha_sarangi', price: 64.30, change24h: 5.1, volume24h: 340000, marketCap: 9645000, category: 'Audio', history: [59, 60, 61, 62, 63, 63.5, 64.3] },
  { symbol: 'OVERCLOCK', name: 'Vikram Liquid Helium Lab', creatorHandle: '@vikram_oc', price: 310.00, change24h: 11.2, volume24h: 1420000, marketCap: 46500000, category: 'Hardware', history: [270, 275, 282, 290, 298, 305, 310] },
];

interface Order {
  id: string;
  price: number;
  amount: number;
  total: number;
}

export default function CreatorTerminal() {
  const currentUser = useAppStore((state) => state.currentUser);
  const [tickers, setTickers] = useState<TickerData[]>(INITIAL_TICKERS);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ANYA');
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [amount, setAmount] = useState<string>('10');
  const [walletBalance, setWalletBalance] = useState(25000);
  const [portfolio, setPortfolio] = useState<{ [key: string]: number }>({ ANYA: 45, CHITIN: 20 });
  const [recentTrades, setRecentTrades] = useState<{ id: string; time: string; symbol: string; price: number; amount: number; type: 'buy' | 'sell' }[]>([
    { id: '1', time: '12:04:12', symbol: 'ANYA', price: 428.50, amount: 25, type: 'buy' },
    { id: '2', time: '12:04:08', symbol: 'CHITIN', price: 215.75, amount: 50, type: 'buy' },
    { id: '3', time: '12:03:55', symbol: 'SCRAM', price: 142.10, amount: 15, type: 'sell' },
    { id: '4', time: '12:03:41', symbol: 'KATANA', price: 89.20, amount: 80, type: 'buy' },
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeTicker = tickers.find(t => t.symbol === selectedSymbol) || tickers[0];

  // High-frequency price ticker simulator
  useEffect(() => {
    const interval = window.setInterval(() => {
      setTickers(prev => prev.map(ticker => {
        const delta = (Math.random() - 0.48) * (ticker.price * 0.015);
        const newPrice = Math.max(1, +(ticker.price + delta).toFixed(2));
        const newHistory = [...ticker.history.slice(1), newPrice];
        const newChange = +(((newPrice - newHistory[0]) / newHistory[0]) * 100).toFixed(2);
        return {
          ...ticker,
          price: newPrice,
          change24h: newChange,
          history: newHistory,
        };
      }));

      // Simulate a random trade in the stream
      if (Math.random() > 0.4) {
        const randomTicker = tickers[Math.floor(Math.random() * tickers.length)];
        const tradeType: 'buy' | 'sell' = Math.random() > 0.5 ? 'buy' : 'sell';
        const tradeAmount = Math.floor(Math.random() * 50) + 5;
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        setRecentTrades(prev => [
          {
            id: Math.random().toString(),
            time: timeStr,
            symbol: randomTicker.symbol,
            price: randomTicker.price,
            amount: tradeAmount,
            type: tradeType
          },
          ...prev.slice(0, 14)
        ]);
      }
    }, 1800);

    return () => clearInterval(interval);
  }, [tickers]);

  // High performance Canvas Candlestick & Sparkline Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const history = activeTicker.history;
    const minVal = Math.min(...history) * 0.98;
    const maxVal = Math.max(...history) * 1.02;
    const range = maxVal - minVal;

    const paddingX = 40;
    const paddingY = 40;
    const chartWidth = canvas.width - paddingX * 2;
    const chartHeight = canvas.height - paddingY * 2;

    // Draw Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = paddingY + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(paddingX, y);
      ctx.lineTo(canvas.width - paddingX, y);
      ctx.stroke();

      // Price Label
      const labelPrice = (maxVal - (range / 4) * i).toFixed(2);
      ctx.fillStyle = '#71717a';
      ctx.font = '10px monospace';
      ctx.fillText(`$${labelPrice}`, 5, y + 3);
    }

    // Draw Gradient Area
    const isPositive = activeTicker.change24h >= 0;
    const strokeColor = isPositive ? '#10b981' : '#ef4444';
    const gradient = ctx.createLinearGradient(0, paddingY, 0, canvas.height - paddingY);
    gradient.addColorStop(0, isPositive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    history.forEach((val, idx) => {
      const x = paddingX + (chartWidth / (history.length - 1)) * idx;
      const y = paddingY + chartHeight - ((val - minVal) / range) * chartHeight;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    // Stroke line
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = 10;
    ctx.stroke();

    // Fill under curve
    ctx.lineTo(paddingX + chartWidth, canvas.height - paddingY);
    ctx.lineTo(paddingX, canvas.height - paddingY);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.shadowBlur = 0;
    ctx.fill();

    // Draw pulsating current price node
    const lastX = paddingX + chartWidth;
    const lastY = paddingY + chartHeight - ((history[history.length - 1] - minVal) / range) * chartHeight;

    ctx.fillStyle = strokeColor;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
    ctx.fill();
  }, [activeTicker]);

  const handleExecuteTrade = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const totalCost = numAmount * activeTicker.price;

    if (tradeMode === 'buy') {
      if (walletBalance < totalCost) {
        uiaudio.error();
        alert('Insufficient wallet reserves for transaction!');
        return;
      }
      uiaudio.success();
      setWalletBalance(b => +(b - totalCost).toFixed(2));
      setPortfolio(prev => ({
        ...prev,
        [activeTicker.symbol]: (prev[activeTicker.symbol] || 0) + numAmount
      }));
    } else {
      const currentHolding = portfolio[activeTicker.symbol] || 0;
      if (currentHolding < numAmount) {
        uiaudio.error();
        alert('Insufficient token balance to sell!');
        return;
      }
      uiaudio.warp();
      setWalletBalance(b => +(b + totalCost).toFixed(2));
      setPortfolio(prev => ({
        ...prev,
        [activeTicker.symbol]: prev[activeTicker.symbol] - numAmount
      }));
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header Terminal Info Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Activity className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-300 to-indigo-400">
                CREATOR TERMINAL // BLOOMBERG FOR CREATORS
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                HIGH FREQ L3
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Live tokenized creator market caps, order books, and real-time execution matrices
            </p>
          </div>
        </div>

        {/* Portfolio Balance HUD */}
        <div className="flex items-center space-x-4 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">USDC BALANCE</div>
            <div className="text-lg font-bold text-emerald-400">${walletBalance.toLocaleString()}</div>
          </div>
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">HOLDINGS VALUE</div>
            <div className="text-lg font-bold text-cyan-400">
              ${Object.entries(portfolio).reduce((acc, [sym, count]) => {
                const t = tickers.find(item => item.symbol === sym);
                return acc + (t ? t.price * count : 0);
              }, 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Main 3-Column Terminal Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tickers Market Watch (3 cols) */}
        <div className="lg:col-span-3 space-y-3 bg-zinc-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="text-xs font-bold font-mono text-zinc-400">CREATOR MARKETS</span>
            <span className="text-[10px] font-mono text-emerald-400 animate-pulse">● LIVE TICKER</span>
          </div>

          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {tickers.map(ticker => {
              const isSelected = ticker.symbol === selectedSymbol;
              const isPos = ticker.change24h >= 0;

              return (
                <div
                  key={ticker.symbol}
                  onClick={() => {
                    uiaudio.click();
                    setSelectedSymbol(ticker.symbol);
                  }}
                  className={cn(
                    "p-3 rounded-xl cursor-pointer transition-all border font-mono",
                    isSelected 
                      ? "bg-zinc-800/80 border-emerald-500/40 shadow-md" 
                      : "bg-zinc-950/40 border-white/5 hover:border-white/10"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-white text-sm">{ticker.symbol}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase">
                          {ticker.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate max-w-[120px]">{ticker.creatorHandle}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-white">${ticker.price.toFixed(2)}</div>
                      <div className={cn("text-[10px] font-bold flex items-center justify-end space-x-0.5", isPos ? "text-emerald-400" : "text-red-400")}>
                        {isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        <span>{isPos ? '+' : ''}{ticker.change24h}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Column: High Res Candlestick & Sparkline Chart (6 cols) */}
        <div className="lg:col-span-6 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl flex flex-col justify-between">
          {/* Chart Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-white">{activeTicker.name}</h2>
                <span className="text-xs font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/40 font-bold">
                  {activeTicker.symbol}/USDC
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Market Cap: ${activeTicker.marketCap.toLocaleString()} • Vol: ${activeTicker.volume24h.toLocaleString()}
              </p>
            </div>

            <div className="text-right font-mono">
              <div className="text-2xl font-black text-white">${activeTicker.price.toFixed(2)}</div>
              <div className={cn("text-xs font-bold", activeTicker.change24h >= 0 ? "text-emerald-400" : "text-red-400")}>
                {activeTicker.change24h >= 0 ? '+' : ''}{activeTicker.change24h}% 24H DELTA
              </div>
            </div>
          </div>

          {/* Canvas Chart */}
          <div className="relative w-full h-[320px] rounded-xl overflow-hidden bg-zinc-950/60 border border-white/5 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={650}
              height={320}
              className="w-full h-full block"
            />
          </div>

          {/* Recent Trades Tape */}
          <div className="space-y-2">
            <div className="text-xs font-bold font-mono text-zinc-400 flex items-center justify-between">
              <span>REAL-TIME TRANSACTION STREAM</span>
              <span className="text-[10px] text-zinc-500">SPEED: 1.8s/BLOCK</span>
            </div>

            <div className="grid grid-cols-4 gap-2 font-mono text-[10px] text-zinc-400 bg-zinc-950/60 p-2.5 rounded-xl border border-white/5">
              {recentTrades.slice(0, 4).map(trade => (
                <div key={trade.id} className="flex flex-col">
                  <span className="text-zinc-500">{trade.time}</span>
                  <span className="font-bold text-white">{trade.symbol} • {trade.amount} units</span>
                  <span className={cn("font-bold", trade.type === 'buy' ? "text-emerald-400" : "text-red-400")}>
                    {trade.type.toUpperCase()} @ ${trade.price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Execution Order Terminal & Portfolio (3 cols) */}
        <div className="lg:col-span-3 space-y-4 bg-zinc-900/40 p-5 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="text-xs font-bold font-mono text-zinc-400 pb-2 border-b border-white/10">
            ORDER EXECUTION MATRIX
          </div>

          {/* Buy / Sell Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => {
                uiaudio.click();
                setTradeMode('buy');
              }}
              className={cn(
                "py-2 rounded-lg font-bold text-xs transition-all font-mono",
                tradeMode === 'buy' 
                  ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30" 
                  : "text-zinc-400 hover:text-white"
              )}
            >
              BUY {activeTicker.symbol}
            </button>
            <button
              onClick={() => {
                uiaudio.click();
                setTradeMode('sell');
              }}
              className={cn(
                "py-2 rounded-lg font-bold text-xs transition-all font-mono",
                tradeMode === 'sell' 
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/30" 
                  : "text-zinc-400 hover:text-white"
              )}
            >
              SELL {activeTicker.symbol}
            </button>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5 font-mono">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Token Units</span>
              <span>Holding: {portfolio[activeTicker.symbol] || 0}</span>
            </div>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Total Cost Calculation */}
          <div className="p-3 bg-zinc-950 rounded-xl border border-white/10 font-mono space-y-1.5 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Execution Price:</span>
              <span className="text-white">${activeTicker.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Gas Fee:</span>
              <span className="text-emerald-400 font-bold">$0.00 (Zero-Gas L3)</span>
            </div>
            <div className="h-px bg-white/10 my-1" />
            <div className="flex justify-between font-bold text-white text-sm">
              <span>Total Value:</span>
              <span className="text-emerald-400">
                ${((parseFloat(amount) || 0) * activeTicker.price).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleExecuteTrade}
            className={cn(
              "w-full py-3.5 rounded-xl font-bold font-mono tracking-wider transition-all shadow-lg text-sm",
              tradeMode === 'buy'
                ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-black hover:brightness-110 shadow-emerald-500/20"
                : "bg-gradient-to-r from-red-500 to-pink-600 text-white hover:brightness-110 shadow-red-500/20"
            )}
          >
            EXECUTE {tradeMode.toUpperCase()} ORDER
          </button>
        </div>
      </div>
    </div>
  );
}
