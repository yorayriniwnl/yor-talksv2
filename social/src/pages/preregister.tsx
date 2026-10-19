import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import {
  AtSign,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Crown,
  Download,
  ExternalLink,
  Flame,
  Globe,
  HelpCircle,
  Lock,
  Mail,
  PartyPopper,
  Printer,
  QrCode,
  Radio,
  Rocket,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfettiBlast, triggerConfetti } from '@/components/ui/ConfettiBlast';
import { FloatingParticles } from '@/components/ui/FloatingParticles';
import { FounderBadge } from '@/components/system/FounderBadge';
import { api, type FounderPerk, type PreregisterPass } from '@/lib/api-client';
import { sounds } from '@/lib/sound';
import '@/styles/operator-access.css';
import '@/styles/preregister.css';

const TARGET_LAUNCH_DATE = new Date('2026-12-01T00:00:00.000Z');

const DEFAULT_PERKS: FounderPerk[] = [
  {
    id: 'founder-badge',
    title: 'Permanent VIP Founder Badge',
    description: 'An unforgeable cryptographic Founder badge displayed on your profile and beside every post forever.',
    icon: 'ShieldAlert',
    rarity: 'Mythic',
  },
  {
    id: 'handle-lock',
    title: 'Priority Handle Reservation',
    description: 'Your @username is locked and protected. Nobody else can claim it between now and global launch.',
    icon: 'AtSign',
    rarity: 'Exclusive',
  },
  {
    id: 'superpass-free',
    title: '1-Year SuperPass Access (Free)',
    description: 'Full access to pro creator studio tools, 4K uploads, ultra-low latency streams, and zero fees.',
    icon: 'Sparkles',
    rarity: 'Legendary',
  },
  {
    id: 'holo-frame',
    title: 'Holographic Cyber Avatar Frame',
    description: 'Animated refractive iridescent ring around your profile picture rendered with real-time CSS shaders.',
    icon: 'Crown',
    rarity: 'Epic',
  },
  {
    id: 'priority-algorithm',
    title: 'Day-1 Algorithmic Reach Boost',
    description: '300% discovery reach boost across the Pulse and Worlds feed for your first 30 days after launch.',
    icon: 'Zap',
    rarity: 'Rare',
  },
  {
    id: 'founder-circle',
    title: 'Private Founder Circle Access',
    description: 'Direct channel to product leaders, private alpha test flights, and secret voting privileges on roadmap features.',
    icon: 'Users',
    rarity: 'VIP',
  },
];

const RECENT_ACTIVITIES = [
  { handle: 'cipherpunk', action: 'Locked VIP Handle', location: 'Tokyo, Japan', time: 'Just now' },
  { handle: 'zenith_ai', action: 'Claimed Mythic Pass #04891', location: 'San Francisco, USA', time: '1m ago' },
  { handle: 'kavya_m', action: 'Unlocked 1-Yr SuperPass', location: 'Bengaluru, India', time: '2m ago' },
  { handle: 'aurora_borealis', action: 'Reserved Handle Lock', location: 'London, UK', time: '4m ago' },
  { handle: 'neovalkyrie', action: 'Claimed Day-1 Reach Boost', location: 'Berlin, Germany', time: '6m ago' },
  { handle: 'marcus_v', action: 'Joined Founder Circle', location: 'Toronto, Canada', time: '8m ago' },
];

interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isLaunched: boolean;
}

function calculateCountdown(): CountdownState {
  const now = Date.now();
  const diff = TARGET_LAUNCH_DATE.getTime() - now;
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isLaunched: true };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, isLaunched: false };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3D HOLOGRAPHIC TILT CARD WRAPPER
// ═══════════════════════════════════════════════════════════════════════════
function TiltCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -10;
    const rY = ((x - centerX) / centerX) * 10;

    setRotateX(rX);
    setRotateY(rY);
    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.22,
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlare((g) => ({ ...g, opacity: 0 }));
  };

  return (
    <div
      className={`relative transition-transform duration-200 ease-out will-change-transform ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        transformStyle: 'preserve-3d',
      }}
    >
      {children}
      {/* Specular glare reflection */}
      <div
        className="absolute inset-0 pointer-events-none rounded-3xl transition-opacity duration-300"
        style={{
          opacity: glare.opacity,
          background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 129, 105, 0.2) 35%, transparent 65%)`,
          mixBlendMode: 'overlay',
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function Preregister() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pass, setPass] = useState<PreregisterPass | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [stats, setStats] = useState({
    totalRegistered: 4892,
    targetSpots: 10000,
    spotsRemaining: 5108,
  });
  const [countdown, setCountdown] = useState<CountdownState>(calculateCountdown);
  const [copiedLink, setCopiedLink] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeActivityIndex, setActiveActivityIndex] = useState(0);
  const [selectedPerkPreview, setSelectedPerkPreview] = useState<FounderPerk | null>(null);

  // Parse referral code from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('referral');
    if (ref) setReferralCode(ref.trim().toUpperCase());

    // Check if previously saved pass exists in localStorage
    try {
      const savedPass = localStorage.getItem('yor:founder:pass:v1');
      if (savedPass) {
        const parsed = JSON.parse(savedPass) as PreregisterPass;
        setPass(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch real-time live preregistration stats from API
  useEffect(() => {
    let active = true;
    const fetchStats = async () => {
      try {
        const res = await api.getPreregisterStats();
        if (active && res) {
          setStats({
            totalRegistered: res.totalRegistered,
            targetSpots: res.targetSpots ?? 50_000,
            spotsRemaining: res.spotsRemaining ?? Math.max(0, 50_000 - res.totalRegistered),
          });
        }
      } catch {
        // use fallback values
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 20_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Countdown clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(calculateCountdown());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Rotate activity ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveActivityIndex((prev) => (prev + 1) % RECENT_ACTIVITIES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Generate QR code when pass is created or loaded
  useEffect(() => {
    if (!pass) return;
    const passPayload = JSON.stringify({
      brand: 'Yor Talks',
      pass: pass.passNumber || 'FOUNDER-VIP',
      handle: pass.username || username,
      code: pass.referralCode || '',
      launch: '2026-12-01',
    });

    QRCode.toDataURL(passPayload, {
      margin: 1,
      width: 220,
      color: {
        dark: '#ffffff',
        light: '#00000000',
      },
    })
      .then(setQrCodeUrl)
      .catch(() => {});
  }, [pass, username]);

  const cleanUsername = useMemo(() => {
    return username.trim().toLowerCase().replace(/^@/, '');
  }, [username]);

  const isValidHandle = useMemo(() => {
    return /^[a-z0-9_][a-z0-9_-]{2,23}$/.test(cleanUsername);
  }, [cleanUsername]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.toggleSound(next);
    if (next) sounds.playPop();
  };

  const handleUsernameChange = (val: string) => {
    setUsername(val);
    if (soundEnabled && val.length % 2 === 0) {
      sounds.playPop();
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!cleanUsername || !isValidHandle) {
      setErrorMessage('Please choose a handle with 3–24 letters, numbers, or underscores.');
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Please enter a valid email address so we can send your Founder pass.');
      return;
    }

    setLoading(true);
    try {
      const result = await api.preregister({
        email: email.trim().toLowerCase(),
        username: cleanUsername,
        launchUpdatesConsent: true,
        referralCode: referralCode.trim() || undefined,
        perks: DEFAULT_PERKS.map((p) => p.id),
      });

      const enrichedPass: PreregisterPass = {
        ...result,
        email: email.trim().toLowerCase(),
        username: result.username || cleanUsername,
        passNumber: result.passNumber || `FOUNDER-${cleanUsername.toUpperCase()}`,
        referralCode: result.referralCode || `YOR-${cleanUsername.toUpperCase()}`,
      };

      setPass(enrichedPass);
      try {
        localStorage.setItem('yor:founder:pass:v1', JSON.stringify(enrichedPass));
      } catch {
        // ignore
      }

      if (soundEnabled) sounds.playChime();
      triggerConfetti();
      toast.success(
        result.isExisting
          ? `Welcome back, @${enrichedPass.username}! Here is your Founder Boarding Pass.`
          : `You're on the list! Founder Pass ${enrichedPass.passNumber} reserved.`,
      );
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'We could not complete your reservation. Please check your details and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = () => {
    if (!pass) return;
    const refCode = pass.referralCode || 'FOUNDER';
    const shareUrl = `${window.location.origin}/preregister?ref=${encodeURIComponent(refCode)}`;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setCopiedLink(true);
        if (soundEnabled) sounds.playPop();
        toast.success('Founder referral link copied to clipboard!');
        setTimeout(() => setCopiedLink(false), 2500);
      })
      .catch(() => {
        toast.error('Could not copy link to clipboard');
      });
  };

  const shareOnTwitter = () => {
    if (!pass) return;
    const refCode = pass.referralCode || 'FOUNDER';
    const shareUrl = `${window.location.origin}/preregister?ref=${encodeURIComponent(refCode)}`;
    const tweetText = `I just reserved my Founder Pass on @yortalks for the global launch on 01 Dec 2026! 🚀 Locked in @${pass.username || cleanUsername} and unlocked 1-Year SuperPass Free.\n\nClaim your handle before launch:`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const shareOnWhatsApp = () => {
    if (!pass) return;
    const refCode = pass.referralCode || 'FOUNDER';
    const shareUrl = `${window.location.origin}/preregister?ref=${encodeURIComponent(refCode)}`;
    const text = `Join me on Yor Talks! Global launch is on 1st December 2026. Pre-register now to lock your @handle and get a 1-Year Free SuperPass:\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const spotsProgress = Math.min(100, Math.round((stats.totalRegistered / stats.targetSpots) * 100));
  const currentActivity = RECENT_ACTIVITIES[activeActivityIndex];

  return (
    <div className="min-h-screen bg-[#060709] text-[#f3f4f6] relative overflow-x-hidden selection:bg-[#e84b4b] selection:text-white font-sans">
      <ConfettiBlast />
      <FloatingParticles />

      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[50%] -translate-x-1/2 w-[900px] h-[550px] bg-gradient-to-b from-[#e84b4b]/20 via-[#671515]/10 to-transparent blur-[140px] rounded-full" />
        <div className="absolute top-[35%] right-[-10%] w-[500px] h-[500px] bg-[#ff8169]/10 blur-[160px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#671515]/15 blur-[160px] rounded-full" />
        {/* Subtle grid lines */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.4) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-20 border-b border-[#252932]/70 backdrop-blur-xl bg-[#07080b]/85 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <span
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e84b4b] via-[#cf3838] to-[#a82222] border border-[#e84b4b]/60 text-white font-display font-extrabold text-xl flex items-center justify-center shadow-[0_0_24px_rgba(232,75,75,0.45)] group-hover:scale-105 transition-transform"
              aria-hidden="true"
            >
              Y
            </span>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-lg tracking-tight text-white group-hover:text-[#ff8a7f] transition-colors">
                Yor Talks
              </span>
              <span className="font-mono text-[10px] tracking-widest text-[#9298a5] uppercase">
                Genesis Protocol • 2026
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              className="p-2 rounded-xl border border-[#252932] bg-[#12151b] hover:bg-[#1a1e27] text-[#9298a5] hover:text-white transition-colors"
              title={soundEnabled ? 'Mute cyberpunk sound effects' : 'Unmute sound effects'}
              aria-label="Toggle sound effects"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-[#ff8a7f]" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>

            <div className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#12151a] border border-[#e84b4b]/40 text-xs font-mono text-[#ff8a7f] shadow-[0_0_15px_rgba(232,75,75,0.2)]">
              <span className="w-2 h-2 rounded-full bg-[#e84b4b] animate-ping" />
              <span>LAUNCH DATE: 01 DEC 2026</span>
            </div>

            <Link href="/auth">
              <Button
                variant="outline"
                className="border-[#343946] bg-[#0d0f13]/80 hover:bg-[#1a1e26] text-xs sm:text-sm text-[#e2e4e9] hover:text-white"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Live Reservation Activity Marquee Ticker */}
        <div className="border-t border-[#1a1e27] bg-[#0a0d13]/90 py-1.5 px-4 overflow-hidden">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center gap-2 text-[#4ade80]">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span className="font-bold">LIVE GENESIS STREAM:</span>
              <span className="text-white hidden sm:inline">
                @{currentActivity.handle}
              </span>
              <span className="text-[#8e94a0]">
                {currentActivity.action} • {currentActivity.location} ({currentActivity.time})
              </span>
            </div>

            <div className="flex items-center gap-2 text-[#9298a5]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
              <span>1,492 founders reserving now</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-24">
        {/* Stage 02 Pill Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#e84b4b]/20 via-[#ff8a7f]/15 to-[#e84b4b]/20 border border-[#e84b4b]/40 shadow-[0_0_30px_rgba(232,75,75,0.25)]">
            <Flame className="w-4 h-4 text-[#e84b4b] animate-pulse" />
            <span className="font-mono text-xs font-bold tracking-wider text-[#ff8a7f] uppercase">
              VIP FOUNDER PRE-REGISTRATION • LIMITED DAY-ZERO PASSES
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
          </div>
        </div>

        {/* Hero Title */}
        <div className="text-center max-w-4xl mx-auto mb-10">
          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-semibold tracking-tight leading-[1.05] text-white">
            Good People. Great Ideas.{' '}
            <span className="block mt-1 bg-gradient-to-r from-[#ff9b8e] via-[#e84b4b] to-[#ffd700] bg-clip-text text-transparent italic font-serif">
              Claim Your Corner.
            </span>
          </h1>
          <p className="mt-5 text-base sm:text-lg md:text-xl text-[#9ea4b0] max-w-2xl mx-auto leading-relaxed">
            Yor Talks officially launches worldwide on{' '}
            <strong className="text-white font-semibold underline decoration-[#e84b4b] underline-offset-4">
              1st December 2026
            </strong>
            . Pre-register now to lock your exact @handle, guarantee 1-Year Free SuperPass, and claim perpetual Founder credentials.
          </p>
        </div>

        {/* Live Countdown Clock Cards */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="p-1 rounded-3xl bg-gradient-to-r from-[#e84b4b]/40 via-[#252932]/70 to-[#ff8a7f]/40 shadow-[0_0_40px_rgba(232,75,75,0.18)]">
            <div className="bg-[#0b0d12]/95 rounded-[22px] p-6 sm:p-7 backdrop-blur-xl border border-white/5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#252932]">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#e84b4b]" />
                  <span className="font-mono text-xs font-bold tracking-widest text-[#9298a5] uppercase">
                    COUNTDOWN TO WORLDWIDE LAUNCH
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-[#ff8a7f]" />
                  <span className="font-mono text-xs text-[#ff8a7f] font-semibold">
                    TARGET: 01 DEC 2026 00:00 UTC
                  </span>
                </div>
              </div>

              {/* Digits Grid */}
              <div className="grid grid-cols-4 gap-3 sm:gap-4 text-center">
                <div className="flex flex-col items-center justify-center p-3.5 sm:p-5 rounded-2xl bg-[#12151c] border border-[#252932] shadow-inner">
                  <span className="font-mono text-3xl sm:text-5xl font-black text-white tracking-tight">
                    {String(countdown.days).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-[10px] sm:text-xs font-semibold text-[#8e94a0] uppercase tracking-wider mt-1">
                    Days
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center p-3.5 sm:p-5 rounded-2xl bg-[#12151c] border border-[#252932] shadow-inner">
                  <span className="font-mono text-3xl sm:text-5xl font-black text-white tracking-tight">
                    {String(countdown.hours).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-[10px] sm:text-xs font-semibold text-[#8e94a0] uppercase tracking-wider mt-1">
                    Hours
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center p-3.5 sm:p-5 rounded-2xl bg-[#12151c] border border-[#252932] shadow-inner">
                  <span className="font-mono text-3xl sm:text-5xl font-black text-white tracking-tight">
                    {String(countdown.minutes).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-[10px] sm:text-xs font-semibold text-[#8e94a0] uppercase tracking-wider mt-1">
                    Minutes
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center p-3.5 sm:p-5 rounded-2xl bg-[#141822] border border-[#e84b4b]/50 shadow-[0_0_20px_rgba(232,75,75,0.2)]">
                  <span className="font-mono text-3xl sm:text-5xl font-black text-[#ff8a7f] tracking-tight">
                    {String(countdown.seconds).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-[10px] sm:text-xs font-semibold text-[#ff8a7f] uppercase tracking-wider mt-1">
                    Seconds
                  </span>
                </div>
              </div>

              {/* Spots Progress Bar */}
              <div className="mt-6 pt-4 border-t border-[#252932]/70">
                <div className="flex items-center justify-between text-xs font-mono mb-2">
                  <span className="text-[#9298a5]">
                    FOUNDER TIER ALLOCATION:{' '}
                    <strong className="text-white font-bold">{stats.totalRegistered.toLocaleString()}</strong> /{' '}
                    {stats.targetSpots.toLocaleString()}
                  </span>
                  <span className="text-[#4ade80] font-semibold">{spotsProgress}% RESERVED</span>
                </div>
                <div className="h-2.5 w-full bg-[#171a22] rounded-full overflow-hidden p-0.5 border border-[#252932]">
                  <div
                    className="h-full bg-gradient-to-r from-[#e84b4b] via-[#ff8a7f] to-[#ffd700] rounded-full transition-all duration-700"
                    style={{ width: `${spotsProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            PASS PRESENTATION OR SIGNUP FORM
           ═══════════════════════════════════════════════════════════ */}
        {pass ? (
          /* THE 3D HOLOGRAPHIC FOUNDER BOARDING PASS */
          <div className="max-w-2xl mx-auto mb-20">
            <TiltCard>
              <div
                id="founder-boarding-pass-card"
                className="rounded-3xl p-[2px] bg-gradient-to-tr from-[#e84b4b] via-[#ffd700] to-[#e84b4b] shadow-[0_0_60px_rgba(232,75,75,0.35)] relative overflow-hidden"
              >
                <div className="bg-[#0b0e14] rounded-[22px] p-6 sm:p-9 backdrop-blur-2xl relative">
                  {/* Watermark Logo */}
                  <div className="absolute top-8 right-8 text-[#ffffff]/[0.025] font-display font-black text-9xl pointer-events-none select-none">
                    YOR
                  </div>

                  {/* Pass Header */}
                  <div className="flex items-start justify-between border-b border-[#252932] pb-6 mb-6">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4ade80]/10 border border-[#4ade80]/30 text-[#4ade80] text-xs font-mono font-bold mb-3">
                        <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
                        OFFICIALLY PRE-REGISTERED FOUNDER
                      </div>
                      <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
                        Founder Boarding Pass
                      </h2>
                      <p className="text-xs text-[#9298a5] font-mono mt-1">
                        GLOBAL LAUNCH TICKET • VALIDATED FOR 01 DEC 2026
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="block font-mono text-[11px] text-[#9298a5] uppercase">Pass Identifier</span>
                      <span className="font-mono text-lg sm:text-xl font-black text-[#ff8a7f] tracking-widest">
                        {pass.passNumber || 'FOUNDER-VIP'}
                      </span>
                    </div>
                  </div>

                  {/* Pass Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-xl bg-[#11141b] border border-[#252932]">
                      <span className="font-mono text-[10px] uppercase text-[#717784] block mb-1">
                        Reserved Handle
                      </span>
                      <span className="font-mono text-xl sm:text-2xl font-bold text-white flex items-center gap-1.5">
                        <span className="text-[#e84b4b]">@</span>
                        {pass.username || cleanUsername}
                        <CheckCircle2 className="w-5 h-5 text-[#4ade80] inline ml-1" />
                      </span>
                      <span className="text-[11px] text-[#9298a5] mt-1 block">
                        Guaranteed handle lock until launch
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-[#11141b] border border-[#252932]">
                      <span className="font-mono text-[10px] uppercase text-[#717784] block mb-1">
                        Registered Email
                      </span>
                      <span className="font-mono text-sm sm:text-base font-semibold text-white truncate block">
                        {pass.email || email}
                      </span>
                      <span className="text-[11px] text-[#9298a5] mt-1 block">
                        Launch access link will dispatch here
                      </span>
                    </div>
                  </div>

                  {/* Flight/Launch Metadata Stripe */}
                  <div className="p-3.5 rounded-xl bg-[#131722] border border-[#252932] mb-6 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
                    <div>
                      <span className="text-[#717784] block text-[9px] uppercase">GATE</span>
                      <span className="font-bold text-white">GENESIS-01</span>
                    </div>
                    <div>
                      <span className="text-[#717784] block text-[9px] uppercase">CLASS</span>
                      <span className="font-bold text-[#ffd700]">VIP DAY-ZERO</span>
                    </div>
                    <div>
                      <span className="text-[#717784] block text-[9px] uppercase">DEPARTURE</span>
                      <span className="font-bold text-[#ff8a7f]">01 DEC 2026</span>
                    </div>
                    <div>
                      <span className="text-[#717784] block text-[9px] uppercase">ENTITLEMENT</span>
                      <span className="font-bold text-[#4ade80]">1-YR SUPERPASS</span>
                    </div>
                  </div>

                  {/* Perks Unlocked Summary */}
                  <div className="mb-6 p-4 rounded-xl bg-[#141822]/90 border border-[#e84b4b]/30">
                    <span className="font-mono text-xs font-bold text-[#ff8a7f] uppercase tracking-wider block mb-3 flex items-center gap-2">
                      <Crown className="w-4 h-4 text-[#e84b4b]" />
                      FOUNDER PRIVILEGES TIED TO THIS PASS
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-[#e1e4ea]">
                        <Check className="w-3.5 h-3.5 text-[#4ade80]" /> VIP Founder Badge
                      </div>
                      <div className="flex items-center gap-1.5 text-[#e1e4ea]">
                        <Check className="w-3.5 h-3.5 text-[#4ade80]" /> 1-Year SuperPass
                      </div>
                      <div className="flex items-center gap-1.5 text-[#e1e4ea]">
                        <Check className="w-3.5 h-3.5 text-[#4ade80]" /> Hologram Frame
                      </div>
                      <div className="flex items-center gap-1.5 text-[#e1e4ea]">
                        <Check className="w-3.5 h-3.5 text-[#4ade80]" /> Day-1 Reach Boost
                      </div>
                      <div className="flex items-center gap-1.5 text-[#e1e4ea]">
                        <Check className="w-3.5 h-3.5 text-[#4ade80]" /> Handle Protection
                      </div>
                      <div className="flex items-center gap-1.5 text-[#e1e4ea]">
                        <Check className="w-3.5 h-3.5 text-[#4ade80]" /> Founder Circle
                      </div>
                    </div>
                  </div>

                  {/* QR Code and Referral Link Row */}
                  <div className="p-4 sm:p-5 rounded-xl bg-[#0e1117] border border-[#252932] flex flex-col sm:flex-row items-center gap-6 mb-6">
                    {qrCodeUrl ? (
                      <div className="flex flex-col items-center">
                        <div className="p-2 rounded-xl bg-black border border-[#343946] shadow-md">
                          <img src={qrCodeUrl} alt="Founder QR Code" className="w-24 h-24" />
                        </div>
                        <span className="font-mono text-[9px] text-[#717784] mt-1.5 uppercase">Scan to Verify</span>
                      </div>
                    ) : null}

                    <div className="flex-1 w-full text-center sm:text-left">
                      <span className="font-mono text-[11px] text-[#ff8a7f] uppercase font-bold block mb-1">
                        Your Founder Referral Link
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="px-3 py-2 rounded-lg bg-[#181c26] text-white font-mono text-sm sm:text-base font-bold border border-[#343946] flex-1 text-center sm:text-left truncate">
                          {pass.referralCode || 'FOUNDER-EXCLUSIVE'}
                        </code>
                        <Button
                          type="button"
                          size="sm"
                          onClick={copyShareLink}
                          className="bg-[#e84b4b] hover:bg-[#d63d3d] text-white font-semibold text-xs px-4 h-10 shrink-0"
                        >
                          {copiedLink ? (
                            <>
                              <Check className="w-4 h-4 mr-1 text-white" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-1" /> Copy Link
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-[11px] text-[#8e94a0] mt-2">
                        Share your link to unlock top-tier invite status and VIP Alpha Flight access before 01 Dec 2026.
                      </p>
                    </div>
                  </div>

                  {/* Actions & Sharing */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#252932]">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={shareOnTwitter}
                        className="border-[#343946] bg-[#12151b] hover:bg-[#1a1f28] text-xs text-white"
                      >
                        Share on X (Twitter)
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={shareOnWhatsApp}
                        className="border-[#343946] bg-[#12151b] hover:bg-[#1a1f28] text-xs text-white"
                      >
                        WhatsApp
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => window.print()}
                        className="border-[#343946] bg-[#12151b] hover:bg-[#1a1f28] text-xs text-white"
                      >
                        <Printer className="w-3.5 h-3.5 mr-1" /> Print Pass
                      </Button>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        localStorage.removeItem('yor:founder:pass:v1');
                        setPass(null);
                        setEmail('');
                        setUsername('');
                      }}
                      className="text-xs text-[#8e94a0] hover:text-white"
                    >
                      Register another handle
                    </Button>
                  </div>
                </div>
              </div>
            </TiltCard>
          </div>
        ) : (
          /* THE RESERVATION TERMINAL (FORM) */
          <div className="max-w-xl mx-auto mb-20">
            <TiltCard>
              <div className="rounded-3xl p-[2px] bg-gradient-to-b from-[#e84b4b]/80 via-[#ff8a7f]/30 to-[#252932]/60 shadow-[0_0_60px_rgba(232,75,75,0.25)]">
                <div className="bg-[#0b0d12]/95 rounded-[22px] p-6 sm:p-9 backdrop-blur-xl relative">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#252932]">
                    <div className="w-10 h-10 rounded-xl bg-[#e84b4b]/15 border border-[#e84b4b]/40 flex items-center justify-center text-[#ff8a7f]">
                      <ShieldCheck className="w-5 h-5 text-[#e84b4b]" />
                    </div>
                    <div>
                      <h2 className="font-serif text-2xl font-bold text-white tracking-tight">
                        Reserve Your Founder Status
                      </h2>
                      <p className="text-xs text-[#9298a5] font-mono">
                        STEP 1 OF 1 • 100% FREE • COMPLIMENTARY 1-YEAR SUPERPASS
                      </p>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="mb-6 p-4 rounded-xl bg-[#e84b4b]/10 border border-[#e84b4b]/40 text-[#ff8a7f] text-xs flex items-start gap-3">
                      <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <form onSubmit={handleRegister} className="space-y-5">
                    {/* Handle Field with Cyber Scanner HUD */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="reg-username" className="font-mono text-xs text-[#b8bdc8] uppercase">
                          Choose Your Handle
                        </Label>
                        {cleanUsername && (
                          <span
                            className={`font-mono text-[11px] font-bold ${
                              isValidHandle ? 'text-[#4ade80]' : 'text-[#fb7185]'
                            }`}
                          >
                            {isValidHandle ? '✓ Handle available' : '3-24 alphanumeric chars'}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <AtSign className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8e94a0]" />
                        <Input
                          id="reg-username"
                          type="text"
                          value={username}
                          onChange={(e) => handleUsernameChange(e.target.value)}
                          placeholder="operator_name"
                          autoCapitalize="none"
                          autoCorrect="off"
                          maxLength={24}
                          className="pl-10 h-13 bg-[#11141b] border-[#252932] text-white placeholder:text-[#5e6473] font-mono text-base focus:border-[#e84b4b] focus:ring-1 focus:ring-[#e84b4b]"
                          required
                        />
                      </div>

                      {/* Real-time Cybernetic Handle Scanner Preview */}
                      {cleanUsername ? (
                        <div className="p-3 rounded-xl bg-[#121622] border border-[#252932] flex items-center justify-between gap-3 mt-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full animated-border steam-frame-founder flex items-center justify-center font-display font-black text-sm text-white bg-black">
                              {cleanUsername.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-bold text-white">
                                  @{cleanUsername}
                                </span>
                                <FounderBadge variant="compact" />
                              </div>
                              <span className="font-mono text-[10px] text-[#9298a5] block">
                                yortalks.com/@{cleanUsername}
                              </span>
                            </div>
                          </div>
                          <span className="font-mono text-[10px] text-[#4ade80] bg-[#4ade80]/10 px-2 py-0.5 rounded border border-[#4ade80]/30 font-bold">
                            RESERVATION LOCK
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* Email Field */}
                    <div className="space-y-2">
                      <Label htmlFor="reg-email" className="font-mono text-xs text-[#b8bdc8] uppercase">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8e94a0]" />
                        <Input
                          id="reg-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@domain.com"
                          className="pl-10 h-13 bg-[#11141b] border-[#252932] text-white placeholder:text-[#5e6473] text-base focus:border-[#e84b4b] focus:ring-1 focus:ring-[#e84b4b]"
                          required
                        />
                      </div>
                      <p className="text-[11px] text-[#8e94a0] pl-1">
                        Your digital boarding pass and 1st December 2026 activation link will be dispatched here. Zero spam.
                      </p>
                    </div>

                    {/* Referral Code Field (Optional) */}
                    <div className="space-y-2">
                      <Label htmlFor="reg-ref" className="font-mono text-xs text-[#8e94a0] uppercase">
                        Referral Code <span className="text-[#646a78]">(Optional)</span>
                      </Label>
                      <Input
                        id="reg-ref"
                        type="text"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        placeholder="e.g. YOR-A1B2C3"
                        className="h-11 bg-[#11141b]/60 border-[#252932] text-white placeholder:text-[#4e5360] font-mono text-sm focus:border-[#e84b4b]"
                      />
                    </div>

                    {/* Perks Summary Notice */}
                    <div className="p-3.5 rounded-xl bg-[#141822] border border-[#e84b4b]/20 text-xs space-y-1.5">
                      <div className="flex items-center gap-2 text-[#ff8a7f] font-mono font-semibold">
                        <Sparkles className="w-4 h-4 text-[#e84b4b]" />
                        DAY-ZERO FOUNDER PRIVILEGES INCLUDED:
                      </div>
                      <p className="text-[#9ea4b0] text-[11px] leading-relaxed">
                        ✓ VIP Founder Badge • ✓ 1-Year SuperPass ($120 value) • ✓ Hologram Frame • ✓ Day-1 Reach Boost
                      </p>
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-14 bg-gradient-to-r from-[#e84b4b] via-[#f05a5a] to-[#c42828] hover:opacity-95 text-white font-bold text-base tracking-wide rounded-xl shadow-[0_0_30px_rgba(232,75,75,0.45)] transition-all transform hover:scale-[1.01] active:scale-[0.99]"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Minting Founder Pass…
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2 font-display">
                          CLAIM YOUR FOUNDER PASS ✦
                        </span>
                      )}
                    </Button>

                    <div className="text-center pt-2">
                      <p className="text-[11px] text-[#717784]">
                        By pre-registering, you agree to our{' '}
                        <Link href="/terms" className="underline hover:text-white">
                          Terms
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="underline hover:text-white">
                          Privacy Notice
                        </Link>
                        . Global launch is strictly 1st December 2026.
                      </p>
                    </div>
                  </form>
                </div>
              </div>
            </TiltCard>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            THE FOUNDER PRIVILEGES (PERKS GRID)
           ═══════════════════════════════════════════════════════════ */}
        <section className="mb-24">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#161a24] border border-[#252932] text-xs font-mono text-[#ff8a7f] uppercase tracking-wider mb-3">
              <Award className="w-3.5 h-3.5 text-[#e84b4b]" />
              THE FOUNDER REWARD SUITE
            </div>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-white tracking-tight">
              Six Privileges Reserved For Day Zero
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#9298a5]">
              These rewards will never be purchasable after launch. Only accounts created during the
              pre-registration window receive these perks automatically on 1st December 2026.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DEFAULT_PERKS.map((perk, index) => {
              const rarityColors: Record<string, string> = {
                Mythic: 'bg-[#e84b4b]/15 text-[#ff8a7f] border-[#e84b4b]/40',
                Exclusive: 'bg-[#3b82f6]/15 text-[#93c5fd] border-[#3b82f6]/40',
                Legendary: 'bg-[#eab308]/15 text-[#fde047] border-[#eab308]/40',
                Epic: 'bg-[#a855f7]/15 text-[#d8b4fe] border-[#a855f7]/40',
                Rare: 'bg-[#10b981]/15 text-[#6ee7b7] border-[#10b981]/40',
                VIP: 'bg-[#ec4899]/15 text-[#f472b6] border-[#ec4899]/40',
              };

              return (
                <div
                  key={perk.id}
                  onClick={() => setSelectedPerkPreview(perk)}
                  className="group relative rounded-2xl p-[1px] bg-gradient-to-b from-[#252932] via-[#1a1e27] to-[#12151b] hover:from-[#e84b4b]/70 hover:to-[#ffd700]/30 transition-all duration-300 cursor-pointer hover:-translate-y-1 shadow-lg"
                >
                  <div className="h-full rounded-2xl bg-[#0b0e14] p-6 flex flex-col justify-between group-hover:bg-[#0e1219] transition-colors">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-[#141822] border border-[#252932] flex items-center justify-center text-[#ff8a7f] group-hover:scale-110 group-hover:border-[#e84b4b]/50 transition-all">
                          {index === 0 && <ShieldAlert className="w-6 h-6 text-[#e84b4b]" />}
                          {index === 1 && <AtSign className="w-6 h-6 text-[#3b82f6]" />}
                          {index === 2 && <Sparkles className="w-6 h-6 text-[#eab308]" />}
                          {index === 3 && <Crown className="w-6 h-6 text-[#a855f7]" />}
                          {index === 4 && <Zap className="w-6 h-6 text-[#10b981]" />}
                          {index === 5 && <Users className="w-6 h-6 text-[#ec4899]" />}
                        </div>
                        <span
                          className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                            rarityColors[perk.rarity || 'VIP'] || 'bg-[#252932] text-white'
                          }`}
                        >
                          {perk.rarity}
                        </span>
                      </div>

                      <h3 className="font-serif text-xl font-bold text-white group-hover:text-[#ff8a7f] transition-colors mb-2">
                        {perk.title}
                      </h3>
                      <p className="text-xs text-[#8e94a0] leading-relaxed">
                        {perk.description}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-[#1a1e27] flex items-center justify-between text-[11px] font-mono text-[#717784]">
                      <span className="text-[#ff8a7f] group-hover:underline flex items-center gap-1">
                        View Interactive Demo <ChevronRight className="w-3 h-3" />
                      </span>
                      <span className="text-[#4ade80]">✓ UNLOCKED</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            LAUNCH ROADMAP TO 01 DEC 2026
           ═══════════════════════════════════════════════════════════ */}
        <section className="mb-24">
          <div className="p-8 sm:p-12 rounded-3xl bg-[#090b10] border border-[#252932] relative overflow-hidden">
            <div className="max-w-3xl mb-10">
              <span className="font-mono text-xs font-bold text-[#e84b4b] uppercase tracking-wider block mb-2">
                MISSION TIMELINE • ROADMAP
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
                The Journey to 1st December 2026
              </h2>
              <p className="text-sm text-[#9298a5] mt-2">
                Every milestone leading to worldwide genesis is planned with surgical precision.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
              {/* Step 1 */}
              <div className="p-5 rounded-2xl bg-[#10131b] border border-[#252932]/60 relative">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-[#4ade80]/20 text-[#4ade80] text-xs font-mono flex items-center justify-center font-bold">
                    ✓
                  </span>
                  <span className="font-mono text-xs text-[#4ade80] font-semibold">STAGE 01</span>
                </div>
                <h4 className="font-serif text-lg font-bold text-white mb-1">Architecture</h4>
                <p className="text-xs text-[#8e94a0]">
                  Core feeds, cryptographic identity, and enterprise security layers fully deployed.
                </p>
                <span className="inline-block mt-3 text-[10px] font-mono text-[#4ade80]">COMPLETED</span>
              </div>

              {/* Step 2 */}
              <div className="p-5 rounded-2xl bg-[#141824] border border-[#e84b4b]/40 relative shadow-[0_0_20px_rgba(232,75,75,0.15)]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-[#e84b4b] text-white text-xs font-mono flex items-center justify-center font-bold animate-pulse">
                    02
                  </span>
                  <span className="font-mono text-xs text-[#ff8a7f] font-semibold">STAGE 02</span>
                </div>
                <h4 className="font-serif text-lg font-bold text-white mb-1">Founder Pre-Reg</h4>
                <p className="text-xs text-[#8e94a0]">
                  Handle reservations open. Founder perks allocated to the first 50,000 members.
                </p>
                <span className="inline-block mt-3 text-[10px] font-mono text-[#ff8a7f] font-bold">
                  ● ACTIVE NOW
                </span>
              </div>

              {/* Step 3 */}
              <div className="p-5 rounded-2xl bg-[#10131b] border border-[#252932]/60 relative">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-[#252932] text-[#8e94a0] text-xs font-mono flex items-center justify-center font-bold">
                    03
                  </span>
                  <span className="font-mono text-xs text-[#8e94a0] font-semibold">STAGE 03</span>
                </div>
                <h4 className="font-serif text-lg font-bold text-white mb-1">Closed Alpha</h4>
                <p className="text-xs text-[#8e94a0]">
                  Top referrers and creators receive early invitations to test live streaming and studio tools.
                </p>
                <span className="inline-block mt-3 text-[10px] font-mono text-[#717784]">NOVEMBER 2026</span>
              </div>

              {/* Step 4 */}
              <div className="p-5 rounded-2xl bg-[#10131b] border border-[#252932]/60 relative">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-[#252932] text-[#8e94a0] text-xs font-mono flex items-center justify-center font-bold">
                    04
                  </span>
                  <span className="font-mono text-xs text-[#8e94a0] font-semibold">STAGE 04</span>
                </div>
                <h4 className="font-serif text-lg font-bold text-white mb-1">Genesis Launch</h4>
                <p className="text-xs text-[#8e94a0]">
                  Global launch on 1st December 2026. Feeds unlocked worldwide, Founder perks activate.
                </p>
                <span className="inline-block mt-3 text-[10px] font-mono text-[#ff8a7f] font-bold">
                  01 DEC 2026
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            FREQUENTLY ASKED QUESTIONS
           ═══════════════════════════════════════════════════════════ */}
        <section className="max-w-3xl mx-auto mb-20">
          <div className="text-center mb-8">
            <h2 className="font-serif text-3xl font-bold text-white tracking-tight">
              Pre-Registration Questions
            </h2>
            <p className="text-xs text-[#9298a5] font-mono mt-1">EVERYTHING YOU NEED TO KNOW ABOUT THE LAUNCH</p>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-[#0c0f15] border border-[#252932]">
              <h3 className="font-serif text-lg font-bold text-white mb-1 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#e84b4b]" />
                Does pre-registration cost anything?
              </h3>
              <p className="text-xs sm:text-sm text-[#8e94a0] leading-relaxed">
                No, pre-registration is completely free. We do not ask for a credit card. All founder perks,
                including the 1-year SuperPass subscription ($120 retail value), are credited to your account at zero cost.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0c0f15] border border-[#252932]">
              <h3 className="font-serif text-lg font-bold text-white mb-1 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#e84b4b]" />
                What happens on 1st December 2026?
              </h3>
              <p className="text-xs sm:text-sm text-[#8e94a0] leading-relaxed">
                On launch day, you will receive an activation email containing a secure one-click link to finalize
                your password and jump into Yor Talks. Your reserved handle will be pre-filled and waiting for you.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0c0f15] border border-[#252932]">
              <h3 className="font-serif text-lg font-bold text-white mb-1 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#e84b4b]" />
                Can someone else take my chosen handle before launch?
              </h3>
              <p className="text-xs sm:text-sm text-[#8e94a0] leading-relaxed">
                No. When you complete pre-registration, your username is added to our protected handle registry.
                Our backend authentication service rejects any registration attempt on that handle unless submitted by your registered email.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0c0f15] border border-[#252932]">
              <h3 className="font-serif text-lg font-bold text-white mb-1 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#e84b4b]" />
                How do referral bonuses work?
              </h3>
              <p className="text-xs sm:text-sm text-[#8e94a0] leading-relaxed">
                Every pre-registered member gets a unique referral code. Sharing your link helps you move up the
                queue. Top 50 referrers receive special invitations to the Closed Alpha Test Flight in November 2026.
              </p>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            BOTTOM CTA BAR
           ═══════════════════════════════════════════════════════════ */}
        <section className="text-center p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[#121620] to-[#0a0c10] border border-[#e84b4b]/30 shadow-[0_0_40px_rgba(232,75,75,0.2)]">
          <h2 className="font-serif text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Be There From Post Zero.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#9298a5] max-w-xl mx-auto">
            1st December 2026 is the moment the internet gets a better corner. Claim your identity and perks today.
          </p>
          <div className="mt-8 flex justify-center">
            <Button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                document.getElementById('reg-username')?.focus();
              }}
              className="h-13 px-8 bg-[#e84b4b] hover:bg-[#d63d3d] text-white font-bold text-sm tracking-wide rounded-xl shadow-[0_0_20px_rgba(232,75,75,0.4)]"
            >
              RESERVE YOUR HANDLE NOW →
            </Button>
          </div>
        </section>
      </main>

      {/* ═══════════════════════════════════════════════════════════
          INTERACTIVE PERK DEMO MODAL
         ═══════════════════════════════════════════════════════════ */}
      <Dialog
        open={Boolean(selectedPerkPreview)}
        onOpenChange={(open) => !open && setSelectedPerkPreview(null)}
      >
        <DialogContent className="sm:max-w-[500px] bg-[#0c0f16] border border-[#252932] text-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#ff8a7f]" />
              {selectedPerkPreview?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <p className="text-sm text-[#9298a5] leading-relaxed">
              {selectedPerkPreview?.description}
            </p>

            {/* Interactive Sandbox Simulator */}
            <div className="p-5 rounded-2xl bg-[#12151d] border border-[#252932] flex flex-col items-center justify-center text-center gap-3">
              {selectedPerkPreview?.id === 'founder-badge' && (
                <div className="space-y-3 w-full">
                  <span className="text-[10px] font-mono uppercase text-[#717784] block">
                    LIVE FEED PREVIEW
                  </span>
                  <div className="p-3.5 rounded-xl bg-[#0a0c12] border border-[#252932] flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full animated-border steam-frame-founder flex items-center justify-center font-bold text-white bg-black">
                      Y
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white">Yor Pioneer</span>
                        <FounderBadge variant="compact" />
                      </div>
                      <span className="text-[10px] text-[#717784] font-mono">@founder • Genesis 2026</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedPerkPreview?.id === 'handle-lock' && (
                <div className="space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-[#3b82f6]/20 border border-[#3b82f6]/40 flex items-center justify-center mx-auto text-[#60a5fa]">
                    <Lock className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-sm text-white">Cryptographic Handle Reservation</h4>
                  <p className="text-xs text-[#8e94a0]">
                    Your handle is stored in the genesis registry and blocked from registration by anyone else until worldwide release on 1st December 2026.
                  </p>
                </div>
              )}

              {selectedPerkPreview?.id === 'superpass-free' && (
                <div className="space-y-2 w-full text-left">
                  <span className="text-[10px] font-mono uppercase text-[#eab308] font-bold block mb-2">
                    SUPERPASS 1-YEAR INCLUSIONS ($120 VALUE)
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-black/40 border border-white/5 flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#4ade80]" /> 4K Ultra HD Uploads
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-white/5 flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#4ade80]" /> 0% Platform Creator Fees
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-white/5 flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#4ade80]" /> Pro Audio Soundboards
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-white/5 flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#4ade80]" /> Custom Story Fonts
                    </div>
                  </div>
                </div>
              )}

              {selectedPerkPreview?.id === 'holo-frame' && (
                <div className="space-y-3">
                  <div className="w-20 h-20 rounded-full animated-border steam-frame-founder flex items-center justify-center font-display font-black text-2xl text-white bg-black mx-auto shadow-2xl">
                    ✦
                  </div>
                  <span className="text-xs font-mono text-[#ff8a7f] block">
                    Real-time CSS conic-gradient refractive border
                  </span>
                </div>
              )}

              {selectedPerkPreview?.id === 'priority-algorithm' && (
                <div className="space-y-2">
                  <span className="text-4xl font-mono font-black text-[#10b981]">+300%</span>
                  <h4 className="font-bold text-sm text-white">Day-1 Discovery Reach Multiplier</h4>
                  <p className="text-xs text-[#8e94a0]">
                    Pioneer content is weighted with maximum discovery distribution across Pulse, Worlds, and Explore feeds for the first 30 days.
                  </p>
                </div>
              )}

              {selectedPerkPreview?.id === 'founder-circle' && (
                <div className="space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-[#ec4899]/20 border border-[#ec4899]/40 flex items-center justify-center mx-auto text-[#f472b6]">
                    <Users className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-sm text-white">Private Founder Lounge</h4>
                  <p className="text-xs text-[#8e94a0]">
                    Direct communication channels with founders, private alpha app test builds, and exclusive voting on community features.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => setSelectedPerkPreview(null)}
              className="bg-[#e84b4b] hover:bg-[#d63d3d] text-white font-bold text-xs px-6"
            >
              Close Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t border-[#252932] py-10 relative z-10 bg-[#07080b]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#717784] font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#e84b4b]" />
            <span>Yor Talks • Global Launch 01 Dec 2026</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Notice
            </Link>
            <Link href="/community-guidelines" className="hover:text-white transition-colors">
              Community Guidelines
            </Link>
            <Link href="/auth" className="hover:text-white transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
