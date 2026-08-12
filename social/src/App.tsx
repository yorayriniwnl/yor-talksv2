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
import { FloatingParticles } from '@/components/ui/FloatingParticles';
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
  const [location] = useLocation();

  return (
    <AppShell>
      <FloatingParticles />
      <ErrorBoundary>
        <Suspense fallback={<RouteSkeleton />}>
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
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
                <Route path="/settings" component={Settings} />
                <Route component={NotFound} />
              </Switch>
            </motion.div>
          </AnimatePresence>
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
