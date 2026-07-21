import React, { Suspense } from 'react';
import { Redirect, Route, Switch, Router as WouterRouter } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { useAppStore } from '@/lib/store';

// Shell & Layout
import AppShell from '@/components/layout/AppShell';

// Helpers (lazy + resilient)
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import RouteSkeleton from '@/components/ui/RouteSkeleton';
import AppProfiler from '@/components/perf/AppProfiler';
import RouteTelemetry from '@/components/perf/RouteTelemetry';

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
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function Router() {
  const currentUser = useAppStore((s) => s.currentUser);
  const loadInitialData = useAppStore((s) => s.loadInitialData);

  React.useEffect(() => {
    if (currentUser) {
      loadInitialData().catch(console.error);
    }
  }, [currentUser, loadInitialData]);

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
  React.useEffect(() => {
    try {
      // initialize telemetry batcher
      // lazy import to avoid breaking environments without DOM during tests
      import('@/lib/telemetry').then((m) => m.initTelemetry()).catch(() => {});
    } catch (e) {
      // ignore
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <AppProfiler>
              <RouteTelemetry />
              <ErrorBoundary>
                <Suspense fallback={<RouteSkeleton />}> 
                  <Router />
                </Suspense>
              </ErrorBoundary>
            </AppProfiler>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
