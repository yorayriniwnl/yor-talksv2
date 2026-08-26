import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Sparkles, X, Smartphone, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    let promptTimer: number | undefined;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after 3 seconds on site
      promptTimer = window.setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      if (promptTimer !== undefined) window.clearTimeout(promptTimer);
    };
  }, []);

  const handleInstall = async () => {
    sounds.playChime();
    triggerConfetti();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast.success('🎉 Yor Talks installed to your homescreen!');
      }
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else {
      toast.success('To install, tap Share (or 3-dots) and select "Add to Home Screen" 📲');
      setShowPrompt(false);
    }
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 max-w-sm w-full p-4 rounded-3xl glass-heavy border border-primary/40 shadow-2xl font-sans"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary via-purple-600 to-accent text-white flex items-center justify-center font-bold text-sm shadow-md glow-neon-primary shrink-0">
              YT
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="font-display font-black text-xs text-foreground">Install Yor Talks App</h4>
                <span className="text-[0.6rem] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold">FAST PWA</span>
              </div>
              <p className="text-[0.68rem] text-muted-foreground mt-0.5 leading-snug">
                Get fast access to Yor Talks and keep notifications close at hand.
              </p>
            </div>

            <button
              onClick={() => setShowPrompt(false)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted/50"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/30">
            <Button
              size="sm"
              onClick={handleInstall}
              className="flex-1 rounded-xl text-xs font-bold h-9 bg-primary text-primary-foreground glow-neon-primary cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" /> Add to Homescreen
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPrompt(false)}
              className="rounded-xl text-xs h-9 px-3 text-muted-foreground cursor-pointer"
            >
              Later
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
