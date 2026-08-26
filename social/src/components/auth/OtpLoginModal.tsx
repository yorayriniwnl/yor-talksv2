import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smartphone, MessageSquare, ArrowRight, Sparkles, Check, 
  RotateCcw, ShieldCheck, Zap, Lock, Loader2 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';
import { api, setStoredTokens } from '@/lib/api-client';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OtpLoginModalProps {
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function OtpLoginModal({ trigger, isOpen, onOpenChange }: OtpLoginModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(30);
  const [loading, setLoading] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && countdown > 0) {
      interval = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, countdown]);

  const handleSendOtp = async () => {
    const raw = phoneNumber.replace(/[^0-9]/g, '');
    if (raw.length < 10) {
      toast.error('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setLoading(true);
    sounds.playPop();

    try {
      await api.request<any>('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: `+91${raw}`, channel }),
      });

      setStep('otp');
      setCountdown(30);
      toast.success(`OTP sent to +91 ${raw} via ${channel === 'whatsapp' ? 'WhatsApp 💬' : 'SMS 📱'}`);
      
      // Auto-focus first input
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;

    const newOtp = [...otpDigits];
    newOtp[index] = val.slice(-1);
    setOtpDigits(newOtp);

    // Auto-advance
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify if 6 digits filled
    const fullCode = newOtp.join('');
    if (fullCode.length === 6) {
      handleVerifyOtp(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join('');
    if (code.length !== 6) {
      toast.error('Please enter all 6 digits of the OTP');
      return;
    }

    setLoading(true);
    try {
      const raw = phoneNumber.replace(/[^0-9]/g, '');
      const res = await api.request<any>('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: `+91${raw}`, code }),
      });

      if (res && res.data) {
        setStoredTokens(res.data.tokens);
        useAppStore.setState({
          currentUser: res.data.user,
          tokens: res.data.tokens,
        });

        sounds.playChime();
        triggerConfetti();
        toast.success(`Welcome to Yor Talks, ${res.data.user.fullName || res.data.user.username}! 🇮🇳`);
        setOpen(false);
        // Refresh feed
        useAppStore.getState().loadFeed();
      }
    } catch (err: any) {
      toast.error(err.message || 'Incorrect OTP code. Try again.');
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[440px] rounded-3xl font-sans glass-heavy border border-primary/30 p-6">
        
        <DialogHeader className="text-center pb-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary via-purple-600 to-accent text-white flex items-center justify-center mx-auto mb-3 shadow-xl glow-neon-primary">
            <Smartphone className="w-7 h-7" />
          </div>
          <DialogTitle className="font-display font-black text-2xl text-foreground">
            {step === 'phone' ? '1-Tap Mobile Login' : 'Enter 6-Digit OTP'}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {step === 'phone' 
              ? 'Instant passwordless sign-in for Indian mobile numbers 🇮🇳'
              : `We sent an OTP to +91 ${phoneNumber}.`}
          </p>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'phone' ? (
            <motion.div
              key="step-phone"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4 pt-2"
            >
              {/* Channel Selector */}
              <div className="grid grid-cols-2 gap-2 surface-1 p-1 rounded-2xl border border-border/40">
                <button
                  type="button"
                  onClick={() => { setChannel('whatsapp'); sounds.playPop(); }}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    channel === 'whatsapp' 
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <MessageSquare className="w-3.5 h-3.5" /> WhatsApp OTP
                </button>

                <button
                  type="button"
                  onClick={() => { setChannel('sms'); sounds.playPop(); }}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    channel === 'sms' 
                      ? "bg-primary/20 text-primary border border-primary/40 shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Smartphone className="w-3.5 h-3.5" /> SMS OTP
                </button>
              </div>

              {/* Mobile Number Input */}
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-muted-foreground">
                  Mobile Number
                </label>
                <div className="flex items-center rounded-2xl surface-2 border border-border/50 overflow-hidden focus-within:border-primary/60 transition-colors">
                  <div className="px-3 py-2.5 bg-muted/60 border-r border-border/40 text-xs font-mono font-bold text-foreground flex items-center gap-1">
                    <span>🇮🇳</span> +91
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="98765 43210"
                    className="flex-1 bg-transparent px-3.5 py-2.5 text-sm font-mono font-bold text-foreground outline-none placeholder:text-muted-foreground/50 tracking-wider"
                  />
                </div>
              </div>

              <Button
                onClick={handleSendOtp}
                disabled={loading || phoneNumber.length < 10}
                className="w-full rounded-2xl font-display font-extrabold text-xs h-12 bg-gradient-to-r from-primary via-purple-600 to-accent text-white glow-neon-primary shadow-xl cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Get Instant OTP <ArrowRight className="w-4 h-4 ml-1.5" /></>}
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-[0.68rem] font-mono text-muted-foreground pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 100% Encrypted & Zero Spam Promise
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step-otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5 pt-2"
            >
              {/* 6 Digit Input Boxes */}
              <div className="flex justify-center gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className={cn(
                      "w-12 h-14 rounded-2xl surface-2 border-2 text-center text-xl font-mono font-black text-foreground outline-none transition-all",
                      digit ? "border-primary glow-neon-primary bg-primary/10" : "border-border/60 focus:border-primary/60"
                    )}
                  />
                ))}
              </div>

              {/* Resend & Change Phone Row */}
              <div className="flex items-center justify-between text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                >
                  Change Number
                </button>

                {countdown > 0 ? (
                  <span className="text-muted-foreground">Resend in {countdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-primary font-bold hover:underline cursor-pointer"
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              <Button
                onClick={() => handleVerifyOtp()}
                disabled={loading || otpDigits.some((d) => !d)}
                className="w-full rounded-2xl font-display font-extrabold text-xs h-12 bg-gradient-to-r from-emerald-500 via-teal-500 to-primary text-black glow-neon-primary shadow-xl cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify & enter Yor 🚀</>}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

      </DialogContent>
    </Dialog>
  );
}
