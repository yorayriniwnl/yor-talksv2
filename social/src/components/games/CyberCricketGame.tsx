import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Trophy, Sparkles, Volume2, Shield, Flame, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export function CyberCricketGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [balls, setBalls] = useState(0);
  const [highScore, setHighScore] = useState(128);
  const [lastShot, setLastShot] = useState<string>('Ready to Bat!');
  const [gameResult, setGameResult] = useState<string | null>(null);

  // Ball & animation state
  const ballPosRef = useRef({ x: 150, y: 50, vx: 0, vy: 4, active: false });
  const animFrameRef = useRef<number | null>(null);

  const startNewInnings = () => {
    sounds.playPop();
    setScore(0);
    setWickets(0);
    setBalls(0);
    setGameResult(null);
    setLastShot('Innings Started — Watch the delivery timing!');
    setIsPlaying(true);
    bowlBall();
  };

  const bowlBall = () => {
    ballPosRef.current = {
      x: 150 + (Math.random() * 40 - 20),
      y: 40,
      vx: (Math.random() - 0.5) * 2,
      vy: 4 + Math.random() * 3,
      active: true
    };
  };

  const hitShot = () => {
    if (!ballPosRef.current.active) return;

    const ballY = ballPosRef.current.y;
    ballPosRef.current.active = false;

    // Sweet timing zone: ballY between 220 and 260
    if (ballY >= 230 && ballY <= 260) {
      // Perfect Timing: SIX!
      sounds.playChime();
      triggerConfetti();
      setScore(s => s + 6);
      setLastShot('🚀 MAXIMUM! 108m MEGA SIX over Deep Midwicket! (+6)');
    } else if (ballY >= 210 && ballY <= 280) {
      // Good Timing: FOUR!
      sounds.playPop();
      setScore(s => s + 4);
      setLastShot('🔥 CRACKING FOUR! Driven through Extra Cover! (+4)');
    } else if (ballY >= 180 && ballY <= 310) {
      // Single / Double
      const runs = Math.random() > 0.5 ? 2 : 1;
      sounds.playPop();
      setScore(s => s + runs);
      setLastShot(`⚡ Pushed into the gap for ${runs} run${runs > 1 ? 's' : ''}.`);
    } else {
      // Mis-timed: OUT!
      sounds.playPop();
      setWickets(w => {
        const nw = w + 1;
        if (nw >= 3) {
          setIsPlaying(false);
          setGameResult(`Innings Over! You scored ${score} runs.`);
          if (score > highScore) {
            setHighScore(score);
            toast.success(`🎉 New Cyber Cricket High Score: ${score} Runs! +250 Karma Awarded.`);
          }
        }
        return nw;
      });
      setLastShot('💔 WICKET! Clean Bowled / Caught behind!');
    }

    setBalls(b => {
      const nb = b + 1;
      if (nb >= 12 && wickets < 2) {
        setIsPlaying(false);
        setGameResult(`2 Overs Completed! Total Score: ${score} runs.`);
      } else {
        setTimeout(bowlBall, 1200);
      }
      return nb;
    });
  };

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Pitch
      ctx.fillStyle = '#18181b';
      ctx.fillRect(100, 30, 100, 260);

      // Pitch Crease Lines
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(105, 35, 90, 15); // Bowling crease
      ctx.strokeRect(105, 240, 90, 45); // Batting crease

      // Sweet Spot Hit Marker Zone
      ctx.fillStyle = 'rgba(234, 179, 8, 0.15)';
      ctx.fillRect(100, 230, 100, 30);

      // Stumps
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(145, 275, 10, 8); // Batting stumps
      ctx.fillRect(145, 32, 10, 8); // Bowling stumps

      // Draw Ball
      if (ballPosRef.current.active) {
        ballPosRef.current.y += ballPosRef.current.vy;
        ballPosRef.current.x += ballPosRef.current.vx;

        ctx.beginPath();
        ctx.arc(ballPosRef.current.x, ballPosRef.current.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Check if ball went past batsman without swing
        if (ballPosRef.current.y > 290) {
          ballPosRef.current.active = false;
          setLastShot('⚪ Dot Ball — Beat the bat outside off!');
          setBalls(b => {
            const nb = b + 1;
            if (nb >= 12) {
              setIsPlaying(false);
              setGameResult(`2 Overs Completed! Total Score: ${score} runs.`);
            } else {
              setTimeout(bowlBall, 1200);
            }
            return nb;
          });
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, score]);

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            🏏
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Street Cricket (2-Over Blitz)
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Timing-based Desi Arcade Mini-Game</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <div className="text-muted-foreground uppercase text-[0.62rem]">All-Time High</div>
          <div className="font-bold text-amber-400">{highScore} Runs</div>
        </div>
      </div>

      {/* Scoreboard Strip */}
      <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Score</span>
          <span className="font-display font-black text-xl text-primary">{score} / {wickets}</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Overs</span>
          <span className="font-display font-black text-xl text-foreground">{Math.floor(balls / 6)}.{(balls % 6)} / 2.0</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Run Rate</span>
          <span className="font-display font-black text-xl text-emerald-400">{balls > 0 ? ((score / balls) * 6).toFixed(1) : '0.0'}</span>
        </div>
      </div>

      {/* Game Canvas Box */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-black flex items-center justify-center mb-4">
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          className="w-full max-w-[300px] h-[300px] block"
        />

        {/* Overlay when game not playing */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            {gameResult ? (
              <>
                <Trophy className="w-12 h-12 text-amber-400 mb-2 animate-bounce" />
                <h4 className="font-display font-bold text-lg text-white mb-1">{gameResult}</h4>
                <p className="text-xs text-zinc-400 mb-4 font-mono">You earned +{Math.round(score * 1.5)} Karma & YOR XP!</p>
              </>
            ) : (
              <>
                <Flame className="w-12 h-12 text-primary mb-2" />
                <h4 className="font-display font-bold text-lg text-white mb-1">Time the Ball into the Yellow Zone!</h4>
                <p className="text-xs text-zinc-400 mb-4 font-mono">Click HIT when the ball enters the sweet-spot crease to smash 6s & 4s!</p>
              </>
            )}

            <Button
              onClick={startNewInnings}
              className="rounded-2xl font-bold text-xs h-11 px-6 bg-emerald-500 hover:bg-emerald-600 text-black glow-neon-primary shadow-lg"
            >
              <Play className="w-4 h-4 mr-1.5 fill-black" /> {gameResult ? 'Play Next Innings' : 'Start Match'}
            </Button>
          </div>
        )}
      </div>

      {/* Commentary & Action Controls */}
      <div className="space-y-3">
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-border/40 text-xs font-mono text-center text-zinc-300">
          🎙️ {lastShot}
        </div>

        {isPlaying && (
          <Button
            onClick={hitShot}
            className="w-full rounded-2xl font-bold text-sm h-14 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl glow-neon-primary text-base uppercase tracking-wider"
          >
            🏏 SWING BAT & HIT SHOT!
          </Button>
        )}
      </div>
    </div>
  );
}
