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
  Clock,
  Copy,
  Crown,
  ExternalLink,
  Flame,
  Globe,
  HelpCircle,
  Lock,
  Mail,
  Printer,
  QrCode,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfettiBlast, triggerConfetti } from '@/components/ui/ConfettiBlast';
import { FounderBadge } from '@/components/system/FounderBadge';
import { api, type FounderPerk, type PreregisterPass } from '@/lib/api-client';
import '@/styles/operator-access.css';

const TARGET_LAUNCH_DATE = new Date('2026-12-01T00:00:00.000Z');

const REAL_FOUNDER_PERKS: FounderPerk[] = [
  {
    id: 'founder-badge',
    title: 'Permanent VIP Founder Badge',
    description: 'An exclusive Founder badge displayed on your profile, mini-cards, and beside every post you publish.',
    icon: 'ShieldCheck',
    rarity: 'Founder',
  },
  {
    id: 'handle-lock',
    title: 'Guaranteed Handle Reservation',
    description: 'Your @username is reserved in the registry. No one else can claim it between now and global launch.',
    icon: 'AtSign',
    rarity: 'Reserved',
  },
  {
    id: 'superpass-free',
    title: '1-Year Free SuperPass',
    description: 'Complimentary 365-day access to SuperPass creator features, priority feeds, and analytics from day one.',
    icon: 'Crown',
    rarity: '1 Year',
  },
  {
    id: 'holo-frame',
    title: 'Exclusive Founder Avatar Frame',
    description: 'Reflective animated iridescent border automatically unlocked in your profile frame settings.',
    icon: 'Sparkles',
    rarity: 'Cosmetic',
  },
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

export default function Preregister() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pass, setPass] = useState<PreregisterPass | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [totalRegistered, setTotalRegistered] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<CountdownState>(calculateCountdown);
  const [copiedLink, setCopiedLink] = useState(false);

  // Check URL params for referral code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('referral');
    if (ref) setReferralCode(ref.trim().toUpperCase());

    // Restore saved pass if already pre-registered in this browser
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

  // Fetch real database pre-registration count from the API
  useEffect(() => {
    let active = true;
    const fetchStats = async () => {
      try {
        const res = await api.getPreregisterStats();
        if (active && res && typeof res.totalRegistered === 'number') {
          setTotalRegistered(res.totalRegistered);
        }
      } catch {
        // quiet failure, no fake fallback
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(calculateCountdown());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // QR code generation for the pass
  useEffect(() => {
    if (!pass) return;
    const passPayload = JSON.stringify({
      app: 'Yor Talks',
      pass: pass.passNumber || 'FOUNDER',
      handle: pass.username || username,
      launch: '2026-12-01',
    });

    QRCode.toDataURL(passPayload, {
      margin: 1,
      width: 200,
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!cleanUsername || !isValidHandle) {
      setErrorMessage('Please choose a handle between 3 and 24 characters (letters, numbers, underscores).');
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const result = await api.preregister({
        email: email.trim().toLowerCase(),
        username: cleanUsername,
        launchUpdatesConsent: true,
        referralCode: referralCode.trim() || undefined,
        perks: REAL_FOUNDER_PERKS.map((p) => p.id),
      });

      const enrichedPass: PreregisterPass = {
        ...result,
        email: email.trim().toLowerCase(),
        username: result.username || cleanUsername,
        passNumber: result.passNumber || `FOUNDER-${cleanUsername.toUpperCase()}`,
        referralCode: result.referralCode || null,
      };

      setPass(enrichedPass);
      try {
        localStorage.setItem('yor:founder:pass:v1', JSON.stringify(enrichedPass));
      } catch {
        // ignore
      }

      // Update actual total registered
      setTotalRegistered((prev) => (prev !== null ? prev + 1 : 1));
      triggerConfetti();
      toast.success(
        result.isExisting
          ? `Welcome back, @${enrichedPass.username}! Your Founder Pass is loaded.`
          : `Reserved! Welcome to Yor Talks, @${enrichedPass.username}.`,
      );
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'We could not complete your pre-registration. Please check your details and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = () => {
    if (!pass) return;
    const refParam = pass.referralCode ? `?ref=${encodeURIComponent(pass.referralCode)}` : '';
    const shareUrl = `${window.location.origin}/preregister${refParam}`;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setCopiedLink(true);
        toast.success('Referral link copied to clipboard.');
        setTimeout(() => setCopiedLink(false), 2500);
      })
      .catch(() => {
        toast.error('Could not copy link to clipboard.');
      });
  };

  const shareOnTwitter = () => {
    if (!pass) return;
    const refParam = pass.referralCode ? `?ref=${encodeURIComponent(pass.referralCode)}` : '';
    const shareUrl = `${window.location.origin}/preregister${refParam}`;
    const tweetText = `I just reserved @${pass.username || cleanUsername} on @yortalks for the global launch on 1st December 2026. Lock your handle before launch:`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const shareOnWhatsApp = () => {
    if (!pass) return;
    const refParam = pass.referralCode ? `?ref=${encodeURIComponent(pass.referralCode)}` : '';
    const shareUrl = `${window.location.origin}/preregister${refParam}`;
    const text = `I just reserved my username on Yor Talks for the global launch on 1st December 2026. Pre-register to lock your handle and get founder perks:\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-[#07080a] text-[#f3f4f6] relative overflow-x-hidden selection:bg-[#e84b4b] selection:text-white font-sans antialiased">
      <ConfettiBlast />

      {/* Background radial gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-b from-[#e84b4b]/15 via-rose-950/10 to-transparent blur-[120px] rounded-full" />
        <div className="absolute top-[40%] right-[-10%] w-[400px] h-[400px] bg-amber-500/5 blur-[140px] rounded-full" />
      </div>

      {/* Top Header */}
      <header className="relative z-20 border-b border-white/5 backdrop-blur-xl bg-[#07080a]/80 sticky top-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <span
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#e84b4b] to-[#991b1b] text-white font-display font-extrabold text-lg flex items-center justify-center shadow-[0_0_20px_rgba(232,75,75,0.35)] group-hover:scale-105 transition-transform"
              aria-hidden="true"
            >
              Y
            </span>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-base tracking-tight text-white group-hover:text-[#ff8a7f] transition-colors">
                Yor Talks
              </span>
              <span className="font-mono text-[9px] tracking-widest text-[#717784] uppercase">
                Launch • 01 Dec 2026
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 text-xs font-mono text-[#ff8a7f]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e84b4b] animate-pulse" />
              <span>LAUNCH DATE: 1ST DECEMBER 2026</span>
            </div>

            <Link href="/auth">
              <Button
                variant="outline"
                className="border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-xs sm:text-sm text-[#e2e4e9] hover:text-white rounded-xl h-9"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-24">
        {/* Launch Pill */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#e84b4b]/15 via-white/[0.02] to-[#e84b4b]/15 border border-[#e84b4b]/30">
            <Flame className="w-4 h-4 text-[#e84b4b]" />
            <span className="font-mono text-xs font-bold tracking-wider text-[#ff8a7f] uppercase">
              EARLY ACCESS REGISTRATION
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
          </div>
        </div>

        {/* Hero Title */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h1 className="font-serif text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.08] text-white">
            Claim Your Identity Before{' '}
            <span className="block mt-1 bg-gradient-to-r from-[#ff8a7f] via-[#e84b4b] to-[#ffd700] bg-clip-text text-transparent italic">
              1st December 2026.
            </span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[#9ea4b0] max-w-xl mx-auto leading-relaxed">
            Reserve your handle today. Every pre-registered member automatically receives a verified Founder Badge, 1-Year free SuperPass, and handle protection.
          </p>
        </div>

        {/* Live Countdown Clock */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="p-[1px] rounded-2xl bg-gradient-to-r from-white/10 via-[#e84b4b]/30 to-white/10 shadow-[0_0_30px_rgba(232,75,75,0.12)]">
            <div className="bg-[#0c0e12] rounded-[15px] p-6 backdrop-blur-xl border border-white/5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#e84b4b]" />
                  <span className="font-mono text-xs font-semibold tracking-wider text-[#8e94a0] uppercase">
                    Countdown to Worldwide Launch
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[#ff8a7f] font-mono text-xs">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>1ST DEC 2026</span>
                </div>
              </div>

              {/* Digits Grid */}
              <div className="grid grid-cols-4 gap-3 sm:gap-4 text-center">
                <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="font-mono text-3xl sm:text-4xl font-bold text-white tracking-tight">
                    {String(countdown.days).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-[10px] sm:text-xs text-[#717784] uppercase tracking-wider mt-1">
                    Days
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="font-mono text-3xl sm:text-4xl font-bold text-white tracking-tight">
                    {String(countdown.hours).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-[10px] sm:text-xs text-[#717784] uppercase tracking-wider mt-1">
                    Hours
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="font-mono text-3xl sm:text-4xl font-bold text-white tracking-tight">
                    {String(countdown.minutes).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-[10px] sm:text-xs text-[#717784] uppercase tracking-wider mt-1">
                    Minutes
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl bg-[#e84b4b]/10 border border-[#e84b4b]/30">
                  <span className="font-mono text-3xl sm:text-4xl font-bold text-[#ff8a7f] tracking-tight">
                    {String(countdown.seconds).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-[10px] sm:text-xs text-[#ff8a7f] uppercase tracking-wider mt-1">
                    Seconds
                  </span>
                </div>
              </div>

              {totalRegistered !== null && (
                <div className="mt-4 pt-3 border-t border-white/5 text-center font-mono text-xs text-[#8e94a0]">
                  <strong className="text-white font-bold">{totalRegistered.toLocaleString()}</strong> pioneers already pre-registered
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            PASS OR REGISTRATION FORM
           ═══════════════════════════════════════════════════════════ */}
        {pass ? (
          /* THE FOUNDER BOARDING PASS */
          <div className="max-w-xl mx-auto mb-20">
            <div className="rounded-3xl p-[1px] bg-gradient-to-tr from-[#e84b4b] via-[#ffd700] to-rose-600 shadow-[0_0_50px_rgba(232,75,75,0.25)]">
              <div className="bg-[#0b0d12] rounded-[23px] p-6 sm:p-8 backdrop-blur-2xl">
                {/* Pass Header */}
                <div className="flex items-start justify-between border-b border-white/10 pb-6 mb-6">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold mb-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      PRE-REGISTERED FOUNDER
                    </div>
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
                      Founder Boarding Pass
                    </h2>
                    <p className="text-xs text-[#8e94a0] font-mono mt-0.5">
                      GLOBAL LAUNCH TICKET • 01 DEC 2026
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="block font-mono text-[10px] text-[#717784] uppercase">Pass Identifier</span>
                    <span className="font-mono text-base sm:text-lg font-bold text-[#ff8a7f]">
                      {pass.passNumber || 'FOUNDER-PASS'}
                    </span>
                  </div>
                </div>

                {/* Handle and Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="font-mono text-[10px] uppercase text-[#717784] block mb-1">
                      Reserved Handle
                    </span>
                    <span className="font-mono text-lg font-bold text-white flex items-center gap-1">
                      <span className="text-[#e84b4b]">@</span>
                      {pass.username || cleanUsername}
                    </span>
                    <span className="text-[11px] text-emerald-400 font-mono mt-1 block">
                      ✓ Reserved until launch
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="font-mono text-[10px] uppercase text-[#717784] block mb-1">
                      Registered Email
                    </span>
                    <span className="font-mono text-sm font-semibold text-white truncate block">
                      {pass.email || email}
                    </span>
                    <span className="text-[11px] text-[#717784] font-mono mt-1 block">
                      Launch link sends here
                    </span>
                  </div>
                </div>

                {/* Launch Metadata */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 mb-6 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
                  <div>
                    <span className="text-[#717784] block text-[9px]">LAUNCH</span>
                    <span className="font-bold text-[#ff8a7f]">01 DEC 2026</span>
                  </div>
                  <div>
                    <span className="text-[#717784] block text-[9px]">STATUS</span>
                    <span className="font-bold text-emerald-400">HANDLE LOCKED</span>
                  </div>
                  <div>
                    <span className="text-[#717784] block text-[9px]">PERK</span>
                    <span className="font-bold text-[#ffd700]">1-YEAR SUPERPASS</span>
                  </div>
                </div>

                {/* QR Code and Referral Link */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col sm:flex-row items-center gap-4 mb-6">
                  {qrCodeUrl ? (
                    <div className="flex flex-col items-center shrink-0">
                      <div className="p-2 rounded-lg bg-black border border-white/10">
                        <img src={qrCodeUrl} alt="Founder QR Code" className="w-20 h-20" />
                      </div>
                      <span className="font-mono text-[9px] text-[#717784] mt-1 uppercase">Scan to Verify</span>
                    </div>
                  ) : null}

                  <div className="flex-1 min-w-0 w-full text-center sm:text-left">
                    <span className="font-mono text-[11px] text-[#ff8a7f] uppercase font-bold block mb-1">
                      Your Founder Referral Link
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-white font-mono text-xs border border-white/10 flex-1 truncate text-left">
                        {`${window.location.origin}/preregister${pass.referralCode ? `?ref=${pass.referralCode}` : ''}`}
                      </code>
                      <Button
                        type="button"
                        size="sm"
                        onClick={copyShareLink}
                        className="bg-[#e84b4b] hover:bg-[#d63d3d] text-white text-xs px-3 h-8 shrink-0 font-medium rounded-lg"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                        {copiedLink ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                    <p className="text-[11px] text-[#717784] mt-2">
                      Share with friends who want to lock their usernames before launch day.
                    </p>
                  </div>
                </div>

                {/* Share Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={shareOnTwitter}
                      className="border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-xs text-white rounded-lg h-8"
                    >
                      Share on X (Twitter)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={shareOnWhatsApp}
                      className="border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-xs text-white rounded-lg h-8"
                    >
                      WhatsApp
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => window.print()}
                      className="border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-xs text-white rounded-lg h-8"
                    >
                      <Printer className="w-3 h-3 mr-1" /> Print
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
                    className="text-xs text-[#717784] hover:text-white h-8"
                  >
                    Register another handle
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM */
          <div className="max-w-md mx-auto mb-20">
            <div className="rounded-3xl p-[1px] bg-gradient-to-b from-[#e84b4b]/60 via-white/10 to-transparent shadow-[0_0_40px_rgba(232,75,75,0.18)]">
              <div className="bg-[#0b0d12] rounded-[23px] p-6 sm:p-8 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                  <div className="w-9 h-9 rounded-xl bg-[#e84b4b]/15 border border-[#e84b4b]/30 flex items-center justify-center text-[#ff8a7f]">
                    <ShieldCheck className="w-5 h-5 text-[#e84b4b]" />
                  </div>
                  <div>
                    <h2 className="font-serif text-xl font-bold text-white tracking-tight">
                      Reserve Your Handle
                    </h2>
                    <p className="text-xs text-[#717784] font-mono">
                      100% FREE • NO CREDIT CARD REQUIRED
                    </p>
                  </div>
                </div>

                {errorMessage && (
                  <div className="mb-5 p-3 rounded-xl bg-[#e84b4b]/10 border border-[#e84b4b]/30 text-[#ff8a7f] text-xs leading-relaxed">
                    {errorMessage}
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Handle Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="reg-username" className="font-mono text-xs text-[#8e94a0] uppercase">
                        Choose Username
                      </Label>
                      {cleanUsername && (
                        <span
                          className={`font-mono text-[10px] font-bold ${
                            isValidHandle ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isValidHandle ? '✓ Format valid' : '3-24 alphanumeric chars'}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <AtSign className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717784]" />
                      <Input
                        id="reg-username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="your_handle"
                        autoCapitalize="none"
                        autoCorrect="off"
                        maxLength={24}
                        className="pl-9 h-11 bg-white/[0.02] border-white/10 text-white placeholder:text-[#525866] font-mono text-sm focus:border-[#e84b4b] rounded-xl"
                        required
                      />
                    </div>
                    {cleanUsername && (
                      <p className="text-[11px] text-[#717784] font-mono pl-1">
                        Your profile URL will be <strong className="text-white">yortalks.com/@{cleanUsername}</strong>
                      </p>
                    )}
                  </div>

                  {/* Email Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-email" className="font-mono text-xs text-[#8e94a0] uppercase">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717784]" />
                      <Input
                        id="reg-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className="pl-9 h-11 bg-white/[0.02] border-white/10 text-white placeholder:text-[#525866] text-sm focus:border-[#e84b4b] rounded-xl"
                        required
                      />
                    </div>
                    <p className="text-[11px] text-[#717784] pl-1">
                      We will only email your Founder pass and launch day activation instructions.
                    </p>
                  </div>

                  {/* Optional Referral Code */}
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-ref" className="font-mono text-xs text-[#717784] uppercase">
                      Referral Code <span className="text-[#525866]">(Optional)</span>
                    </Label>
                    <Input
                      id="reg-ref"
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder="e.g. YOR-A1B2C3"
                      className="h-10 bg-white/[0.02] border-white/10 text-white placeholder:text-[#424754] font-mono text-xs focus:border-[#e84b4b] rounded-xl"
                    />
                  </div>

                  {/* Perks Summary */}
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-[#8e94a0] space-y-1">
                    <span className="font-mono text-[10px] text-[#ff8a7f] uppercase font-bold block">
                      Included With Pre-Registration:
                    </span>
                    <p className="text-[11px] leading-relaxed">
                      ✓ VIP Founder Badge • ✓ 1-Year Free SuperPass • ✓ Handle Lock Guarantee
                    </p>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-gradient-to-r from-[#e84b4b] to-[#b91c1c] hover:opacity-90 text-white font-bold text-sm tracking-wide rounded-xl shadow-[0_0_20px_rgba(232,75,75,0.3)] transition-transform active:scale-[0.99] mt-2"
                  >
                    {loading ? 'Reserving Handle…' : 'PRE-REGISTER FOR 01 DEC 2026 →'}
                  </Button>

                  <p className="text-[10px] text-center text-[#525866] pt-1">
                    By submitting, you agree to our{' '}
                    <Link href="/terms" className="underline hover:text-white">
                      Terms
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="underline hover:text-white">
                      Privacy Notice
                    </Link>
                    . Launch date is 1st December 2026.
                  </p>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            THE FOUNDER PERKS
           ═══════════════════════════════════════════════════════════ */}
        <section className="mb-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.02] border border-white/10 text-xs font-mono text-[#ff8a7f] uppercase tracking-wider mb-2">
              <Award className="w-3.5 h-3.5 text-[#e84b4b]" />
              PERKS &amp; PRIVILEGES
            </div>
            <h2 className="font-serif text-2xl sm:text-4xl font-bold text-white tracking-tight">
              What Founders Receive on 1st December 2026
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#8e94a0]">
              Every account pre-registered before worldwide launch receives these perks automatically upon activation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {REAL_FOUNDER_PERKS.map((perk, index) => (
              <div
                key={perk.id}
                className="rounded-2xl p-5 bg-white/[0.02] border border-white/5 hover:border-[#e84b4b]/40 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-[#e84b4b]/10 border border-[#e84b4b]/20 flex items-center justify-center text-[#ff8a7f]">
                      {index === 0 && <ShieldCheck className="w-4 h-4 text-[#e84b4b]" />}
                      {index === 1 && <AtSign className="w-4 h-4 text-[#60a5fa]" />}
                      {index === 2 && <Crown className="w-4 h-4 text-[#fbbf24]" />}
                      {index === 3 && <Sparkles className="w-4 h-4 text-[#c084fc]" />}
                    </div>
                    <span className="font-mono text-[9px] uppercase px-2 py-0.5 rounded-full bg-white/5 text-[#8e94a0] border border-white/5">
                      {perk.rarity}
                    </span>
                  </div>

                  <h3 className="font-serif text-base font-bold text-white mb-1.5">
                    {perk.title}
                  </h3>
                  <p className="text-xs text-[#8e94a0] leading-relaxed">
                    {perk.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-[#717784]">
                  <span>FOUNDER PERK</span>
                  <span className="text-emerald-400 font-bold">✓ INCLUDED</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            FREQUENTLY ASKED QUESTIONS
           ═══════════════════════════════════════════════════════════ */}
        <section className="max-w-2xl mx-auto mb-16">
          <div className="text-center mb-6">
            <h2 className="font-serif text-2xl font-bold text-white tracking-tight">
              Pre-Registration FAQ
            </h2>
            <p className="text-xs text-[#717784] font-mono mt-0.5">LAUNCH DETAILS &amp; LOGISTICS</p>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <h3 className="font-serif text-sm font-bold text-white mb-1 flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-[#e84b4b]" />
                Does pre-registration cost anything?
              </h3>
              <p className="text-xs text-[#8e94a0] leading-relaxed">
                No, pre-registration is 100% free. No credit card is required. All perks, including the 1-Year SuperPass entitlement, are credited without charge.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <h3 className="font-serif text-sm font-bold text-white mb-1 flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-[#e84b4b]" />
                What happens on 1st December 2026?
              </h3>
              <p className="text-xs text-[#8e94a0] leading-relaxed">
                You will receive an activation email at your registered address with a secure link to complete your password setup. Your reserved handle will be pre-filled and locked to your account.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <h3 className="font-serif text-sm font-bold text-white mb-1 flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-[#e84b4b]" />
                Can anyone else take my handle before launch?
              </h3>
              <p className="text-xs text-[#8e94a0] leading-relaxed">
                No. Once pre-registered, the username is reserved in our database. The platform authentication service blocks registration of reserved usernames unless submitted with your registered email.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 relative z-10 bg-[#07080a]">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#717784] font-mono">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e84b4b]" />
            <span>Yor Talks • Global Launch on 1st December 2026</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Notice
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
