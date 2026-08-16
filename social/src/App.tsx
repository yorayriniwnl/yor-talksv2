import { Suspense, useEffect } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Redirect, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
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
import { AppProfiler } from '@/components/perf/AppProfiler';
import RouteTelemetry from '@/components/perf/RouteTelemetry';
import { initTelemetry } from '@/lib/telemetry';
import { PageTransition } from '@/components/ui/PageTransition';

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
const Tournaments = lazyWithRetry(() => import('@/pages/tournaments'));
const Studio = lazyWithRetry(() => import('@/pages/studio'));
const Lounge = lazyWithRetry(() => import('@/pages/lounge'));
const Bazaar = lazyWithRetry(() => import('@/pages/bazaar'));
const Arcade = lazyWithRetry(() => import('@/pages/arcade'));
const SuperPass = lazyWithRetry(() => import('@/pages/pass'));
const Clans = lazyWithRetry(() => import('@/pages/clans'));
const Radar = lazyWithRetry(() => import('@/pages/radar'));
const MemeStudio = lazyWithRetry(() => import('@/pages/meme-studio'));
const CodeDuel = lazyWithRetry(() => import('@/pages/code-duel'));
const SynthRoom = lazyWithRetry(() => import('@/pages/synth-room'));
const Bounties = lazyWithRetry(() => import('@/pages/bounties'));
const CreatorAnalytics = lazyWithRetry(() => import('@/pages/creator-analytics'));
const HologramStudio = lazyWithRetry(() => import('@/pages/hologram'));
const VoiceAI = lazyWithRetry(() => import('@/pages/voice-ai'));
const Scrims = lazyWithRetry(() => import('@/pages/scrims'));
const Metaverse = lazyWithRetry(() => import('@/pages/metaverse'));
const Soundboard = lazyWithRetry(() => import('@/pages/soundboard'));
const MediaKit = lazyWithRetry(() => import('@/pages/media-kit'));
const Turntable = lazyWithRetry(() => import('@/pages/turntable'));
const ParticleSandbox = lazyWithRetry(() => import('@/pages/particle-sandbox'));
const TacticsWhiteboard = lazyWithRetry(() => import('@/pages/tactics'));

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
  const [location] = useLocation();

  return (
    <AppShell>
      <ErrorBoundary>
        <Suspense fallback={<RouteSkeleton />}>
          <PageTransition>
            <Switch location={location}>
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
              <Route path="/tournaments/:id?" component={Tournaments} />
              <Route path="/tournaments" component={Tournaments} />
              <Route path="/studio" component={Studio} />
              <Route path="/lounge/:id?" component={Lounge} />
              <Route path="/lounge" component={Lounge} />
              <Route path="/games" component={Bazaar} />
              <Route path="/bazaar" component={Bazaar} />
              <Route path="/arcade" component={Arcade} />
              <Route path="/pass" component={SuperPass} />
              <Route path="/clans" component={Clans} />
              <Route path="/radar" component={Radar} />
              <Route path="/meme-studio" component={MemeStudio} />
              <Route path="/duel" component={CodeDuel} />
              <Route path="/code-duel" component={CodeDuel} />
              <Route path="/synth" component={SynthRoom} />
              <Route path="/synth-room" component={SynthRoom} />
              <Route path="/bounties" component={Bounties} />
              <Route path="/grants" component={Bounties} />
              <Route path="/analytics" component={CreatorAnalytics} />
              <Route path="/creator-analytics" component={CreatorAnalytics} />
              <Route path="/hologram" component={HologramStudio} />
              <Route path="/voice-ai" component={VoiceAI} />
              <Route path="/scrims" component={Scrims} />
              <Route path="/metaverse" component={Metaverse} />
              <Route path="/soundboard" component={Soundboard} />
              <Route path="/media-kit" component={MediaKit} />
              <Route path="/mediakit" component={MediaKit} />
              <Route path="/dj" component={Turntable} />
              <Route path="/turntable" component={Turntable} />
              <Route path="/particles" component={ParticleSandbox} />
              <Route path="/tactics" component={TacticsWhiteboard} />
              <Route path="/settings" component={Settings} />
              <Route component={NotFound} />
            </Switch>
          </PageTransition>
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
        <MotionConfig reducedMotion="user">
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <AppProfiler>
                <RouteTelemetry />
                <Router />
              </AppProfiler>
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </MotionConfig>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
