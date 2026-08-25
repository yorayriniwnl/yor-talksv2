import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, IndianRupee, QrCode, Sparkles, CheckCircle2, 
  ExternalLink, Copy, Check, Heart, Trophy, Crown, Flame 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface UpiTipJarModalProps {
  creator: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    upiId?: string;
  };
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const TIP_TIERS = [
  { amount: 50, label: 'Chai & Samosa ☕', icon: '☕', badge: 'Supporter', color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/40' },
  { amount: 100, label: 'Creator Boost 🚀', icon: '🚀', badge: 'Booster', color: 'from-sky-500/20 to-blue-500/20 text-sky-400 border-sky-500/40' },
  { amount: 500, label: 'Superfan Patron 💎', icon: '💎', badge: 'Patron', color: 'from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/40' },
  { amount: 2000, label: 'Diamond Legend 👑', icon: '👑', badge: 'Legend', color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/40' },
];

export function UpiTipJarModal({ creator, trigger, isOpen, onOpenChange }: UpiTipJarModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;

  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [supporterName, setSupporterName] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const rawUpiId = creator.upiId || `${creator.username.toLowerCase()}@ybl`;
  const amountToPay = customAmount ? Number(customAmount) : selectedAmount;

  // Generate valid standard UPI Deep Link
  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(rawUpiId)}&pn=${encodeURIComponent(creator.displayName)}&am=${amountToPay}&cu=INR&tn=${encodeURIComponent(message || 'Superchat tip on Yor Talks')}`;
  
  // Quick dynamic QR URL (using public fast generator API)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiDeepLink)}&margin=8&format=svg`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(rawUpiId);
    setCopiedUpi(true);
    sounds.playPop();
    toast.success('UPI ID copied to clipboard!');
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleConfirmPayment = () => {
    sounds.playChime();
    triggerConfetti();
    setIsSuccess(true);
    toast.success(`🎉 Sent ₹${amountToPay} to ${creator.displayName}!`, {
      description: 'Your Superchat badge has been unlocked.'
    });
    setTimeout(() => {
      setIsSuccess(false);
      setOpen(false);
    }, 2800);
  };

  const displayName = creator.displayName || creator.username || 'Creator';
  const initialLetter = (displayName || 'C').charAt(0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      
      <DialogContent className="sm:max-w-[480px] rounded-3xl font-sans glass-heavy border border-primary/30 p-6 overflow-hidden">
        <DialogHeader className="pb-3 text-center flex flex-col items-center">
          <div className="relative mb-2">
            <Avatar className="w-16 h-16 border-2 border-primary shadow-xl ring-4 ring-primary/20">
              <AvatarImage src={creator.avatarUrl} />
              <AvatarFallback className="font-display font-black text-xl">{initialLetter}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-black flex items-center justify-center font-bold text-xs shadow-md">
              ⚡
            </div>
          </div>

          <DialogTitle className="font-display font-black text-xl flex items-center gap-1.5 text-foreground justify-center">
            Tip {displayName}
            <span className="text-[0.62rem] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              0% Platform Fee 🇮🇳
            </span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-sans">
            Direct instant UPI payment to creator. 100% of your tip goes straight to their bank account.
          </p>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="py-10 text-center flex flex-col items-center space-y-4"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 text-3xl shadow-2xl animate-bounce">
                ✓
              </div>
              <h3 className="font-display font-black text-2xl text-foreground">Superchat Sent!</h3>
              <p className="text-xs text-muted-foreground font-mono">
                ₹{amountToPay} transferred to @{creator.username}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-4 py-1">
              {/* Tip Preset Tiers */}
              <div className="grid grid-cols-2 gap-2">
                {TIP_TIERS.map((tier) => {
                  const isSelected = !customAmount && selectedAmount === tier.amount;
                  return (
                    <button
                      key={tier.amount}
                      onClick={() => {
                        setSelectedAmount(tier.amount);
                        setCustomAmount('');
                        sounds.playPop();
                      }}
                      className={cn(
                        "p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer",
                        isSelected 
                          ? "bg-primary/15 border-primary ring-2 ring-primary/30 shadow-lg glow-neon-primary" 
                          : "surface-1 border-border/40 hover:border-border/80"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base">{tier.icon}</span>
                        <span className="text-xs font-mono font-bold text-primary">₹{tier.amount}</span>
                      </div>
                      <span className="text-[0.72rem] font-bold text-foreground mt-2 line-clamp-1">{tier.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Amount Input */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setSelectedAmount(0);
                    }}
                    placeholder="Or enter custom amount in ₹"
                    className="pl-7 rounded-xl surface-1 border-border/50 text-xs h-10 font-mono"
                  />
                </div>
              </div>

              {/* Optional Message */}
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a superchat message (optional)…"
                className="rounded-xl surface-1 border-border/50 text-xs h-10"
              />

              {/* QR Code & UPI Deep Links */}
              <div className="p-4 rounded-2xl surface-1 border border-border/40 flex flex-col items-center text-center space-y-3">
                <div className="w-36 h-36 rounded-2xl bg-white p-2 shadow-xl flex items-center justify-center border border-zinc-200">
                  <img src={qrCodeUrl} alt="UPI QR Code" className="w-full h-full object-contain" />
                </div>

                <div className="flex items-center gap-2 w-full max-w-xs">
                  <span className="text-[0.72rem] font-mono text-muted-foreground truncate flex-1 surface-2 px-3 py-1.5 rounded-lg border border-border/30">
                    {rawUpiId}
                  </span>
                  <Button size="sm" variant="outline" onClick={handleCopyUpi} className="rounded-lg text-xs h-8 px-2.5 shrink-0">
                    {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>

                {/* Instant App Deep Links */}
                <div className="flex items-center justify-center gap-2 pt-1">
                  <a
                    href={upiDeepLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-muted/80 hover:bg-muted text-[0.7rem] font-bold text-foreground border border-border/40 flex items-center gap-1 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3 text-primary" /> Open in GPay / PhonePe
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleConfirmPayment}
                  disabled={!amountToPay || amountToPay <= 0}
                  className="flex-1 rounded-2xl font-display font-bold text-xs h-12 bg-gradient-to-r from-emerald-500 via-teal-500 to-primary text-black glow-neon-primary shadow-xl cursor-pointer"
                >
                  <Zap className="w-4 h-4 mr-1.5 fill-black" /> Complete Tip of ₹{amountToPay}
                </Button>
              </div>
            </div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
