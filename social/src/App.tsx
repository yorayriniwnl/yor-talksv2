import { Suspense, useEffect } from 'react';
import { Redirect, Route, Switch, Router as WouterRouter } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { useAppStore } from '@/lib/store';

// Shell & Layout
import { AppShell } from '@/components/layout/AppShell';

// Helpers (lazy + resilient)
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import RouteSkeleton from '@/components/ui/RouteSkeleton';
import AppProfiler from '@/components/perf/AppProfiler';
import RouteTelemetry from '@/components/perf/RouteTelemetry';
import { initTelemetry } from '@/lib/telemetry';

// Pages (route-level code-splitting)
const Auth = lazyWithRetry(() => import('@/pages/auth'));
const Home = lazyWithRetry(() => import('@/pages/home'));
const Explore = lazyWithRetry(() => import('@/pages/explore'));
const Profile = lazyWithRetry(() => import('@/pages/profile'));
const PostDetail = lazyWithRetry(() => import('@/pages/post-detail'));
const Messages = lazyWithRetry(() => import('@/pages/messages'));
const Communities = lazyWithRetry(() => import('@/pages/communities'));
const Articles = lazyWithRetry(() => import('@/pages/articles'));
const Videos = lazyWithRetry(() => import('@/pages/videos'));
const Settings = lazyWithRetry(() => import('@/pages/settings'));
const Notifications = lazyWithRetry(() => import('@/pages/notifications'));
const Live = lazyWithRetry(() => import('@/pages/live'));
const EventsPage = lazyWithRetry(() => import('@/pages/events'));
const Marketplace = lazyWithRetry(() => import('@/pages/marketplace'));
const AIAssistant = lazyWithRetry(() => import('@/pages/ai-assistant'));
const Achievements = lazyWithRetry(() => import('@/pages/achievements'));
const PointsShop = lazyWithRetry(() => import('@/pages/points-shop'));
const Dashboard = lazyWithRetry(() => import('@/pages/dashboard'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    }
  }
});

function ProtectedRoutes() {
  return (
    <AppShell>
      <ErrorBoundary>
        <Suspense fallback={<RouteSkeleton />}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/explore" component={Explore} />
            <Route path="/post/:id" component={PostDetail} />
            <Route path="/profile/:id?" component={Profile} />
            <Route path="/messages/:id?" component={Messages} />
            <Route path="/communities/:id?" component={Communities} />
            <Route path="/articles/:id?" component={Articles} />
            <Route path="/videos/:id?" component={Videos} />
            <Route path="/notifications" component={Notifications} />
            <Route path="/live/:id?" component={Live} />
            <Route path="/events/:id?" component={EventsPage} />
            <Route path="/marketplace/:id?" component={Marketplace} />
            <Route path="/ai" component={AIAssistant} />
            <Route path="/achievements" component={Achievements} />
            <Route path="/points-shop" component={PointsShop} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </ErrorBoundary>
    </AppShell>
  );
}

function Router() {
  const currentUser = useAppStore((s) => s.currentUser);
  const isInitializing = useAppStore((s) => s.isInitializing);
  const initialize = useAppStore((s) => s.initialize);

  useEffect(() => {
    initialize().catch(console.error);
    // Intentionally run once on mount — initialize() reads the stored
    // tokens itself rather than depending on reactive state here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isInitializing) {
    return <RouteSkeleton />;
  }

  return (
    <Switch>
      {!currentUser && <Route path="/auth" component={Auth} />}
      {!currentUser && <Route component={Auth} />}
      {currentUser && <Route path="/auth" component={() => <Redirect to="/" />} />}
      {currentUser && <Route><ProtectedRoutes /></Route>}
    </Switch>
  );
}

import { useInsanityStore } from '@/lib/insanityStore';
import { sounds } from '@/lib/sound';
import { toast } from '@/hooks/use-toast';

function InsanityObserver() {
  const isInsaneMode = useInsanityStore((state) => state.isInsaneMode);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let toastInterval: NodeJS.Timeout;
    let scrambleInterval: NodeJS.Timeout;

    const handleMouseMove = (e: MouseEvent) => {
      const el = document.createElement('div');
      el.innerText = ['💀', '🔥', '🌀', '👁️', '👾', '💥', '⚠️', '☢️'][Math.floor(Math.random() * 8)];
      el.style.position = 'fixed';
      el.style.left = e.clientX + 'px';
      el.style.top = e.clientY + 'px';
      el.style.fontSize = Math.random() * 80 + 20 + 'px';
      el.style.pointerEvents = 'none';
      el.style.zIndex = '999999';
      el.style.transition = 'all 1s cubic-bezier(0.16, 1, 0.3, 1)';
      document.body.appendChild(el);
      
      requestAnimationFrame(() => {
        el.style.transform = `translate(${Math.random() * 400 - 200}px, ${Math.random() * 400 - 200}px) scale(0) rotate(${Math.random() * 720 - 360}deg)`;
        el.style.opacity = '0';
      });
      
      setTimeout(() => {
        el.remove();
      }, 1000);
    };

    if (isInsaneMode) {
      document.body.classList.add('insane-mode-active');
      document.designMode = 'on';

      // Inject Melt SVG Filter
      const svgStr = `
        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" class="absolute hidden" id="insane-svg-filter">
          <defs>
            <filter id="melt">
              <feTurbulence type="fractalNoise" baseFrequency="0.02 0.15" numOctaves="3" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="40" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>
      `;
      document.body.insertAdjacentHTML('beforeend', svgStr);
      document.body.style.filter = "url('#melt')";

      sounds.playGlitch();
      
      interval = setInterval(() => {
        sounds.playGlitch();
      }, 500 + Math.random() * 1000);
      
      toastInterval = setInterval(() => {
        const msgs = ['SYSTEM FAILURE', 'WAKE UP', 'REALITY IS A SIMULATION', 'VOID DETECTED', 'DO NOT LOOK BEHIND YOU'];
        toast({
          title: 'WARNING',
          description: msgs[Math.floor(Math.random() * msgs.length)],
          variant: 'destructive',
        });
      }, 400);
      
      scrambleInterval = setInterval(() => {
        document.body.style.fontFamily = ['"Comic Sans MS"', 'Papyrus', 'Impact', 'monospace', 'serif'][Math.floor(Math.random() * 5)];
        document.body.style.transform = `rotate(${Math.random() * 20 - 10}deg) scale(${Math.random() * 0.2 + 0.9})`;
        document.body.style.backgroundColor = `rgb(${Math.random()*255}, ${Math.random()*255}, ${Math.random()*255})`;
        window.scrollBy(Math.random() * 100 - 50, Math.random() * 100 - 50);

        // Randomly replace text content of elements
        const elements = document.querySelectorAll('p, span, h1, h2, h3, a, button');
        if (elements.length > 0) {
          const randomEl = elements[Math.floor(Math.random() * elements.length)] as HTMLElement;
          if (randomEl.innerText && randomEl.innerText.length > 0 && randomEl.innerText !== 'WAKE UP') {
             randomEl.dataset.originalText = randomEl.innerText;
             randomEl.innerText = ['WAKE UP', 'ZALGO', 'THE VOID', 'RUN', 'ERROR 404'][Math.floor(Math.random() * 5)];
          }
        }
      }, 50);

      window.addEventListener('mousemove', handleMouseMove);
      
      let titleInterval = setInterval(() => {
        document.title = ['SYSTEM FAILURE', 'YOU DID THIS', 'WAKE UP', 'NO ESCAPE', 'RUN'][Math.floor(Math.random() * 5)];
      }, 100);

      const meltdownTimer = setTimeout(() => {
        clearInterval(interval);
        clearInterval(toastInterval);
        clearInterval(scrambleInterval);
        window.removeEventListener('mousemove', handleMouseMove);
        
        document.body.innerHTML = `
          <div style="
            position: fixed; inset: 0; background: black; color: #0f0; 
            font-family: monospace; font-size: 16px; padding: 20px;
            overflow: hidden; z-index: 99999999; display: flex; flex-direction: column;
            justify-content: flex-end; align-items: flex-start; cursor: none !important;
          " id="meltdown-container">
            <h1 style="color: red; font-size: 6vw; text-align: center; position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); z-index: 2; width: 100%; cursor: none;">SYSTEM DESTROYED</h1>
          </div>
        `;
        document.body.style.cursor = 'none';
        
        const fakeFiles = [
          'src/App.tsx', 'src/index.css', 'src/components/ui/avatar.tsx', 'src/pages/home.tsx', 
          'node_modules/react/index.js', 'package.json', 'vite.config.ts', '.git/HEAD',
          'C:/Windows/System32/hal.dll', 'C:/Windows/System32/kernel32.dll', 'C:/bootmgr'
        ];
        
        let logCount = 0;
        const container = document.getElementById('meltdown-container');
        setInterval(() => {
          if (container) {
             const p = document.createElement('p');
             p.style.margin = '2px 0';
             
             if (logCount < 30) {
               p.innerText = "FATAL_ERROR_0x" + Math.random().toString(16).substr(2, 8).toUpperCase() + " // CORRUPTION LEVEL: CRITICAL";
             } else {
               p.style.color = '#ff0000';
               const file = fakeFiles[Math.floor(Math.random() * fakeFiles.length)];
               p.innerText = `[ OK ] DELETED: ${file} ... ${Math.floor(Math.random() * 100)}% corrupted`;
             }
             
             container.appendChild(p);
             if (container.children.length > 60) container.removeChild(container.firstChild as ChildNode);
             logCount++;
          }
          // Absolute horrible noise
          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = Math.random() > 0.5 ? 40 : 4000;
            gain.gain.value = 0.5;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
          } catch {}
        }, 50);

        // The ultimate escape hatch
        setTimeout(() => {
           window.location.href = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        }, 6000);

      }, 10000); // 10 seconds of pure liquid chaos before the crash
      
      return () => {
        document.body.classList.remove('insane-mode-active');
        document.body.style.fontFamily = '';
        document.body.style.transform = '';
        document.body.style.backgroundColor = '';
        document.body.style.filter = '';
        document.body.style.cursor = '';
        document.designMode = 'off';
        const svg = document.getElementById('insane-svg-filter');
        if (svg) svg.remove();
        clearInterval(interval);
        clearInterval(toastInterval);
        clearInterval(scrambleInterval);
        clearInterval(titleInterval);
        document.title = 'Yor Talks';
        clearTimeout(meltdownTimer);
        window.removeEventListener('mousemove', handleMouseMove);
        
        // Restore text (rough attempt)
        document.querySelectorAll('[data-original-text]').forEach((el) => {
          (el as HTMLElement).innerText = (el as HTMLElement).dataset.originalText || '';
        });
      };
    } else {
      document.body.classList.remove('insane-mode-active');
      document.body.style.fontFamily = '';
      document.body.style.transform = '';
      document.body.style.backgroundColor = '';
      document.body.style.filter = '';
      document.body.style.cursor = '';
      document.title = 'Yor Talks';
      document.designMode = 'off';
      const svg = document.getElementById('insane-svg-filter');
      if (svg) svg.remove();
    }
  }, [isInsaneMode]);

  return null;
}

function App() {
  useEffect(() => {
    try {
      // initialize telemetry batcher
      initTelemetry();
    } catch (e) {
      // ignore
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <InsanityObserver />
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <AppProfiler>
              <RouteTelemetry />
              <Router />
            </AppProfiler>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
