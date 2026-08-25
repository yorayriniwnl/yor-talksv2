import { Suspense, useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { Redirect, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { useAppStore } from '@/lib/store';

// Shell & Layout
import { AppShell } from '@/components/layout/AppShell';

// Helpers
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import RouteSkeleton from '@/components/ui/RouteSkeleton';
import { PageTransition } from '@/components/ui/PageTransition';

// ═══════════════════════════════════════════════════════════════
//  PAGES — Route-level code-splitting (43 pages)
// ═══════════════════════════════════════════════════════════════

// Core Social
const Auth = lazyWithRetry(() => import('@/pages/auth'));
const VerifyEmail = lazyWithRetry(() => import('@/pages/verify-email'));
const LegalPage = lazyWithRetry(() => import('@/pages/legal'));
  const Onboarding = lazyWithRetry(() => import('@/pages/onboarding'));
const BusinessDashboard = lazyWithRetry(() => import('@/pages/business-dashboard'));
const Home = lazyWithRetry(() => import('@/pages/home'));
const Pulse = lazyWithRetry(() => import('@/pages/pulse'));
const Worlds = lazyWithRetry(() => import('@/pages/worlds'));
const Dream = lazyWithRetry(() => import('@/pages/dream'));
const Explore = lazyWithRetry(() => import('@/pages/explore'));
const Profile = lazyWithRetry(() => import('@/pages/profile'));
  const Projects = lazyWithRetry(() => import('@/pages/projects'));
const PostDetail = lazyWithRetry(() => import('@/pages/post-detail'));
const Messages = lazyWithRetry(() => import('@/pages/messages'));
const Notifications = lazyWithRetry(() => import('@/pages/notifications'));
const Settings = lazyWithRetry(() => import('@/pages/settings'));

// Content & Discovery
const Articles = lazyWithRetry(() => import('@/pages/articles'));
const Videos = lazyWithRetry(() => import('@/pages/videos'));
const Live = lazyWithRetry(() => import('@/pages/live'));
const Communities = lazyWithRetry(() => import('@/pages/communities'));
const EventsPage = lazyWithRetry(() => import('@/pages/events'));

// Gaming & Esports
const Tournaments = lazyWithRetry(() => import('@/pages/tournaments'));
const Scrims = lazyWithRetry(() => import('@/pages/scrims'));
const Clans = lazyWithRetry(() => import('@/pages/clans'));
const Arcade = lazyWithRetry(() => import('@/pages/arcade'));
const Predictions = lazyWithRetry(() => import('@/pages/predictions'));
const Achievements = lazyWithRetry(() => import('@/pages/achievements'));
const PointsShop = lazyWithRetry(() => import('@/pages/points-shop'));
const SuperPass = lazyWithRetry(() => import('@/pages/pass'));
const PowerRankings = lazyWithRetry(() => import('@/pages/power-rankings'));
const TrophyRoom = lazyWithRetry(() => import('@/pages/trophy-room'));
const EsportsCalendar = lazyWithRetry(() => import('@/pages/esports-calendar'));

// Creator Tools
const Studio = lazyWithRetry(() => import('@/pages/studio'));
const CreatorAnalytics = lazyWithRetry(() => import('@/pages/creator-analytics'));
const CreatorStore = lazyWithRetry(() => import('@/pages/creator-store'));
const ClipStudio = lazyWithRetry(() => import('@/pages/clip-studio'));
const MediaKit = lazyWithRetry(() => import('@/pages/media-kit'));
const MerchStudio = lazyWithRetry(() => import('@/pages/merch-studio'));
const OverlayStudio = lazyWithRetry(() => import('@/pages/overlay-studio'));

// Marketplace & Economy
const Marketplace = lazyWithRetry(() => import('@/pages/marketplace'));
const Bazaar = lazyWithRetry(() => import('@/pages/bazaar'));
const Bounties = lazyWithRetry(() => import('@/pages/bounties'));
const ClanTreasury = lazyWithRetry(() => import('@/pages/treasury'));

// Social Features
const Dashboard = lazyWithRetry(() => import('@/pages/dashboard'));
const AIAssistant = lazyWithRetry(() => import('@/pages/ai-assistant'));
const Lounge = lazyWithRetry(() => import('@/pages/lounge'));
const FanClub = lazyWithRetry(() => import('@/pages/fan-club'));
const SquadComms = lazyWithRetry(() => import('@/pages/squad-comms'));
const CustomRoom = lazyWithRetry(() => import('@/pages/custom-room'));
const PodcastStudio = lazyWithRetry(() => import('@/pages/podcast-studio'));
const Grievance = lazyWithRetry(() => import('@/pages/grievance'));

import { PushNotificationManager } from '@/components/notifications/PushNotificationManager';

// ═══════════════════════════════════════════════════════════════
//  PROTECTED ROUTES
// ═══════════════════════════════════════════════════════════════

function ProtectedRoutes() {
  const [location] = useLocation();

  return (
    <ErrorBoundary>
      <AppShell>
        <ErrorBoundary>
          <Suspense fallback={<RouteSkeleton />}>
            <PageTransition>
              <Switch location={location}>
                {/* Core Social */}
                <Route path="/" component={Home} />
                <Route path="/pulse" component={Pulse} />
                <Route path="/worlds" component={Worlds} />
                <Route path="/dream" component={Dream} />
                <Route path="/explore" component={Explore} />
                <Route path="/post/:id" component={PostDetail} />
                <Route path="/profile/:id?" component={Profile} />
                <Route path="/projects" component={Projects} />
                <Route path="/messages/:id?" component={Messages} />
                <Route path="/notifications" component={Notifications} />
                <Route path="/settings" component={Settings} />

                {/* Content & Discovery */}
                <Route path="/articles/:id?" component={Articles} />
                <Route path="/videos/:id?" component={Videos} />
                <Route path="/live/:id?" component={Live} />
                <Route path="/communities/:id?" component={Communities} />
                <Route path="/events/:id?" component={EventsPage} />

                {/* Gaming & Esports */}
                <Route path="/tournaments/:id?" component={Tournaments} />
                <Route path="/scrims" component={Scrims} />
                <Route path="/clans" component={Clans} />
                <Route path="/arcade" component={Arcade} />
                <Route path="/predictions" component={Predictions} />
                <Route path="/achievements" component={Achievements} />
                <Route path="/points-shop" component={PointsShop} />
                <Route path="/pass" component={SuperPass} />
                <Route path="/rankings" component={PowerRankings} />
                <Route path="/trophies" component={TrophyRoom} />
                <Route path="/calendar" component={EsportsCalendar} />

                {/* Creator Tools */}
                <Route path="/studio" component={Studio} />
                <Route path="/analytics" component={CreatorAnalytics} />
                <Route path="/store" component={CreatorStore} />
                <Route path="/clips" component={ClipStudio} />
                <Route path="/media-kit" component={MediaKit} />
                <Route path="/merch" component={MerchStudio} />
                <Route path="/overlays" component={OverlayStudio} />

                {/* Marketplace & Economy */}
                <Route path="/marketplace/:id?" component={Marketplace} />
                <Route path="/bazaar" component={Bazaar} />
                <Route path="/bounties" component={Bounties} />
                <Route path="/treasury" component={ClanTreasury} />

                {/* Social Features */}
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/ai" component={AIAssistant} />
                <Route path="/lounge/:id?" component={Lounge} />
                <Route path="/fanclub" component={FanClub} />
                <Route path="/comms" component={SquadComms} />
                <Route path="/rooms" component={CustomRoom} />
                <Route path="/podcasts" component={PodcastStudio} />
                <Route path="/grievance" component={Grievance} />

                {/* 404 */}
                <Route component={NotFound} />
              </Switch>
            </PageTransition>
          </Suspense>
        </ErrorBoundary>
      </AppShell>
    </ErrorBoundary>
  );
}

// ═══════════════════════════════════════════════════════════════
//  ROUTER — Auth gating & redirect preservation
// ═══════════════════════════════════════════════════════════════

const AuthRedirect = () => <Redirect to="/" />;

function Router() {
  const currentUser = useAppStore((s) => s.currentUser);
  const isInitializing = useAppStore((s) => s.isInitializing);
  const initialize = useAppStore((s) => s.initialize);
  const [location] = useLocation();

  useEffect(() => {
    initialize().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isInitializing) {
    return <RouteSkeleton />;
  }

  return (
      <Switch>
        <Route path="/privacy" component={LegalPage} />
        <Route path="/terms" component={LegalPage} />
        <Route path="/community-guidelines" component={LegalPage} />
        {!currentUser && (
          <>
            <Route path="/auth" component={Auth} />
            <Route path="/verify-email/:token" component={VerifyEmail} />
            <Route path="/onboarding" component={Onboarding} />
            <Route path="/grievance" component={Grievance} />
            <Route>
              <Redirect to={`/auth?redirect=${encodeURIComponent(location)}`} />
            </Route>
          </>
        )}
        {currentUser && (
          <>
            <Route path="/auth" component={AuthRedirect} />
            <Route path="/verify-email/:token" component={VerifyEmail} />
            <Route path="/onboarding" component={Onboarding} />
            <Route>
              <ProtectedRoutes />
            </Route>
          </>
        )}
      </Switch>
  );
}

// ═══════════════════════════════════════════════════════════════
//  APP ROOT
// ═══════════════════════════════════════════════════════════════

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <MotionConfig reducedMotion="user">
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <PushNotificationManager />
          <Toaster />
        </TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}

export default App;
