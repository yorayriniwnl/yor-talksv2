import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { toast } from 'sonner';

export function PushNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window) {
      setPermission(Notification.permission);
      
      // If default and user has been active for 5s, suggest enabling
      if (Notification.permission === 'default') {
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }

    // Register service worker if available
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration info:', err);
      });
    }
  }, []);

  const handleRequestPermission = async () => {
    sounds.playPop();
    if (!('Notification' in window)) {
      toast.error('Browser notifications not supported on this device');
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      setShowPrompt(false);

      if (perm === 'granted') {
        sounds.playChime();
        toast.success('🔔 Lockscreen push notifications enabled!');
        
        // Show test notification
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification('Yor Talks 🇮🇳', {
              body: 'Welcome to instant Bharat alerts! You will get notified for Likes, DMs & Calls.',
              icon: '/favicon.ico',
              vibrate: [200, 100, 200],
            } as any);
          });
        } else {
          new Notification('Yor Talks 🇮🇳', {
            body: 'Welcome to instant Bharat alerts! You will get notified for Likes, DMs & Calls.',
            icon: '/favicon.ico',
          });
        }
      } else {
        toast.info('Notifications were not enabled.');
      }
    } catch {
      setShowPrompt(false);
    }
  };

  return (
    <AnimatePresence>
      {showPrompt && permission === 'default' && (
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.95 }}
          className="fixed top-20 right-4 md:right-8 z-50 max-w-sm w-full p-4 rounded-3xl glass-heavy border border-primary/40 shadow-2xl font-sans"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5 animate-pulse" />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-display font-extrabold text-xs text-foreground flex items-center gap-1.5">
                Enable Instant Push Alerts <span className="text-[0.62rem] font-mono px-1.5 py-0.2 rounded bg-primary/20 text-primary font-bold">LIVE</span>
              </h4>
              <p className="text-[0.68rem] text-muted-foreground mt-0.5 leading-snug">
                Get notified on your lockscreen when creators post Stories, send DMs, or start WebRTC 4K video calls.
              </p>

              <div className="flex items-center gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleRequestPermission}
                  className="rounded-xl text-xs font-bold h-8 px-4 bg-primary text-primary-foreground glow-neon-primary cursor-pointer"
                >
                  Turn On Alerts
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPrompt(false)}
                  className="rounded-xl text-xs h-8 px-2.5 text-muted-foreground cursor-pointer"
                >
                  Not Now
                </Button>
              </div>
            </div>

            <button
              onClick={() => setShowPrompt(false)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted/50 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
