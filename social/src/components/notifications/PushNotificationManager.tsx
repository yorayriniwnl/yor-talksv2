import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { publicBetaConfig } from '@/lib/public-beta-config';

function decodeVapidKey(value: string): Uint8Array {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export function PushNotificationManager() {
  const currentUser = useAppStore((state) => state.currentUser);
  const eligibility = useAppStore((state) => state.eligibility);
  const eligibilityLoaded = useAppStore((state) => state.eligibilityLoaded);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPrompt, setShowPrompt] = useState(false);
  const permissionRequestPending = useRef(false);
  const requestedFromPrompt = useRef(false);
  const notificationsAllowed = publicBetaConfig.webPushEnabled && Boolean(currentUser) && currentUser.notificationsEnabled !== false
    && eligibilityLoaded && eligibility?.activated === true && eligibility.capabilities.social && eligibility.experience === 'adult_18_plus';

  useEffect(() => {
    setShowPrompt(false);
    if (!publicBetaConfig.webPushEnabled) return;
    // Register the worker independently of the permission prompt. The old
    // early return left browsers without an updated worker after a deploy.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration info:', err);
      });
    }

    // Check if notifications are supported
    if ('Notification' in window) {
      setPermission(Notification.permission);
      
      // If default and user has been active for 5s, suggest enabling
      if (notificationsAllowed && Notification.permission === 'default') {
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [currentUser?.id, notificationsAllowed]);

  const registerPushSubscription = async (ownerId: string) => {
    const isCurrentAccount = () => {
      const state = useAppStore.getState();
      return state.currentUser?.id === ownerId && state.currentUser.notificationsEnabled !== false
        && state.eligibilityLoaded && state.eligibility?.activated === true
        && state.eligibility.capabilities.social && state.eligibility.experience === 'adult_18_plus';
    };
    if (!publicBetaConfig.webPushEnabled) throw new Error('Push notifications are not enabled for this beta');
    if (!isCurrentAccount()) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push notifications are not supported by this browser');
    }
    const { publicKey } = await api.getPushPublicKey();
    const registration = await navigator.serviceWorker.ready;
    if (!isCurrentAccount()) return;
    const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidKey(publicKey) as unknown as BufferSource,
      });
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
      throw new Error('The browser returned an incomplete push subscription');
    }
    if (!isCurrentAccount()) return;
    await api.savePushSubscription({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      userAgent: navigator.userAgent,
    });
  };

  useEffect(() => {
    let active = true;
    if (notificationsAllowed && currentUser && permission === 'granted') {
      const announce = requestedFromPrompt.current;
      requestedFromPrompt.current = false;
      registerPushSubscription(currentUser.id).then(() => {
        if (active && announce) toast.success('Push subscription saved for this device.');
      }).catch((error) => {
        if (active && announce) toast.info(error instanceof Error ? error.message : 'Device push delivery is not configured yet.');
      });
    }
    return () => { active = false; };
    // The subscription is synchronized once per signed-in user/device.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, permission, notificationsAllowed]);

  const handleRequestPermission = async () => {
    if (!notificationsAllowed || permissionRequestPending.current) return;
    sounds.playPop();
    if (!('Notification' in window)) {
      toast.error('Browser notifications not supported on this device');
      return;
    }

    try {
      permissionRequestPending.current = true;
      const perm = await Notification.requestPermission();
      requestedFromPrompt.current = perm === 'granted';
      setPermission(perm);
      setShowPrompt(false);

      if (perm === 'granted') {
        sounds.playChime();
      } else {
        toast.info('Notifications were not enabled.');
      }
    } catch {
      setShowPrompt(false);
    } finally {
      permissionRequestPending.current = false;
    }
  };

  return (
    <AnimatePresence>
      {notificationsAllowed && showPrompt && permission === 'default' && (
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.95 }}
          role="region"
          aria-label="Push notification preferences"
          className="fixed top-20 right-4 md:right-8 z-50 max-w-sm w-[calc(100%-2rem)] p-4 rounded-3xl glass-heavy border border-primary/40 shadow-2xl font-sans"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5 animate-pulse" />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-display font-extrabold text-xs text-foreground">Push notifications</h4>
              <p className="text-[0.68rem] text-muted-foreground mt-0.5 leading-snug">
                Allow this device to receive supported account alerts. Availability and delivery timing depend on browser and service configuration.
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
              type="button"
              aria-label="Dismiss push notification prompt"
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
