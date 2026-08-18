import { Suspense, useEffect } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Redirect, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { useAppStore } from '@/lib/store';

// Beyond Peak Additions
import { ThreeBackground } from '@/components/ui/ThreeBackground';
import { AICopilot } from '@/components/copilot/AICopilot';
import { uiaudio } from '@/lib/audioEngine';

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
const AIArtStudio = lazyWithRetry(() => import('@/pages/ai-art'));
const MerchStudio = lazyWithRetry(() => import('@/pages/merch-studio'));
const PredictionsArena = lazyWithRetry(() => import('@/pages/predictions'));
const Spectrum = lazyWithRetry(() => import('@/pages/spectrum'));
const OverlayStudio = lazyWithRetry(() => import('@/pages/overlay-studio'));
const ContractsStudio = lazyWithRetry(() => import('@/pages/contracts'));
const ClanTreasury = lazyWithRetry(() => import('@/pages/treasury'));
const PodcastStudio = lazyWithRetry(() => import('@/pages/podcast-studio'));
const GameLaunchpad = lazyWithRetry(() => import('@/pages/game-launchpad'));
const FanClubSubscriptions = lazyWithRetry(() => import('@/pages/fan-club'));
const ClipStudio = lazyWithRetry(() => import('@/pages/clip-studio'));
const PowerRankings = lazyWithRetry(() => import('@/pages/power-rankings'));
const ScoutingRadar = lazyWithRetry(() => import('@/pages/scouting-radar'));
const TrophyRoom = lazyWithRetry(() => import('@/pages/trophy-room'));
const CricketAuctionArena = lazyWithRetry(() => import('@/pages/cricket-auction'));
const VoiceFXStudio = lazyWithRetry(() => import('@/pages/voice-fx'));
const EsportsAcademy = lazyWithRetry(() => import('@/pages/academy'));
const EsportsCalendar = lazyWithRetry(() => import('@/pages/esports-calendar'));
const VODReviewStudio = lazyWithRetry(() => import('@/pages/vod-review'));
const CreatorStore = lazyWithRetry(() => import('@/pages/creator-store'));
const SuperchatStudio = lazyWithRetry(() => import('@/pages/superchat-studio'));
const SquadCommsRoom = lazyWithRetry(() => import('@/pages/squad-comms'));
const GamerHealthHub = lazyWithRetry(() => import('@/pages/gamer-health'));
const ScoreboardStudio = lazyWithRetry(() => import('@/pages/scoreboard-studio'));

const CustomRoomLobby = lazyWithRetry(() => import('@/pages/custom-room'));
const GearCustomizer = lazyWithRetry(() => import('@/pages/gear-customizer'));
const MultistreamStudio = lazyWithRetry(() => import('@/pages/multistream'));
const TransferPortal = lazyWithRetry(() => import('@/pages/transfer-portal'));
const AcousticsLab = lazyWithRetry(() => import('@/pages/acoustics-lab'));
const RickshawDrift = lazyWithRetry(() => import('@/pages/rickshaw-drift'));
const AntiCheatWatchtower = lazyWithRetry(() => import('@/pages/anticheat-hub'));
const AIHighlightsStudio = lazyWithRetry(() => import('@/pages/ai-highlights'));
const CricketLab = lazyWithRetry(() => import('@/pages/cricket-lab'));
const ChromaStudio = lazyWithRetry(() => import('@/pages/chroma-studio'));
const TablaSynth = lazyWithRetry(() => import('@/pages/tabla-synth'));
const JerseyCustomizer = lazyWithRetry(() => import('@/pages/jersey-customizer'));

// Monumental Studios
const CyberDAW = lazyWithRetry(() => import('@/pages/cyber-daw'));
const NeonOverdriveGame = lazyWithRetry(() => import('@/pages/neon-overdrive'));
const CreatorTerminal = lazyWithRetry(() => import('@/pages/creator-terminal'));
const PromptArena = lazyWithRetry(() => import('@/pages/prompt-arena'));
const AsciiStudio = lazyWithRetry(() => import('@/pages/ascii-studio'));
const OrbitSandbox = lazyWithRetry(() => import('@/pages/orbit-sandbox'));
const TacticalSandbox = lazyWithRetry(() => import('@/pages/tactical-sandbox'));
const SignalLab = lazyWithRetry(() => import('@/pages/signal-lab'));
const CyberChess = lazyWithRetry(() => import('@/pages/cyber-chess'));

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
    <ErrorBoundary>
      <AppShell>
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
              <Route path="/studio" component={Studio} />
              <Route path="/lounge/:id?" component={Lounge} />
              <Route path="/bazaar" component={Bazaar} />
              <Route path="/arcade" component={Arcade} />
              <Route path="/pass" component={SuperPass} />
              <Route path="/clans" component={Clans} />
              <Route path="/radar" component={Radar} />
              <Route path="/meme-studio" component={MemeStudio} />
              <Route path="/code-duel" component={CodeDuel} />
              <Route path="/synth-room" component={SynthRoom} />
              <Route path="/bounties" component={Bounties} />
              <Route path="/creator-analytics" component={CreatorAnalytics} />
              <Route path="/hologram" component={HologramStudio} />
              <Route path="/voice-ai" component={VoiceAI} />
              <Route path="/scrims" component={Scrims} />
              <Route path="/metaverse" component={Metaverse} />
              <Route path="/soundboard" component={Soundboard} />
              <Route path="/media-kit" component={MediaKit} />
              <Route path="/turntable" component={Turntable} />
              <Route path="/particles" component={ParticleSandbox} />
              <Route path="/tactics" component={TacticsWhiteboard} />
              <Route path="/ai-art" component={AIArtStudio} />
              <Route path="/merch" component={MerchStudio} />
              <Route path="/predictions" component={PredictionsArena} />
              <Route path="/spectrum" component={Spectrum} />
              <Route path="/overlay-studio" component={OverlayStudio} />
              <Route path="/contracts" component={ContractsStudio} />
              <Route path="/treasury" component={ClanTreasury} />
              <Route path="/podcasts" component={PodcastStudio} />
              <Route path="/launchpad" component={GameLaunchpad} />
              <Route path="/fanclub" component={FanClubSubscriptions} />
              <Route path="/clips" component={ClipStudio} />
              <Route path="/rankings" component={PowerRankings} />
              <Route path="/scouting" component={ScoutingRadar} />
              <Route path="/trophies" component={TrophyRoom} />
              <Route path="/auction" component={CricketAuctionArena} />
              <Route path="/voice-fx" component={VoiceFXStudio} />
              <Route path="/academy" component={EsportsAcademy} />
              <Route path="/calendar" component={EsportsCalendar} />
              <Route path="/vods" component={VODReviewStudio} />
              <Route path="/store" component={CreatorStore} />
              <Route path="/superchat" component={SuperchatStudio} />
              <Route path="/comms" component={SquadCommsRoom} />
              <Route path="/health" component={GamerHealthHub} />
              <Route path="/scoreboard" component={ScoreboardStudio} />
              <Route path="/rooms" component={CustomRoomLobby} />
              <Route path="/gear" component={GearCustomizer} />
              <Route path="/multistream" component={MultistreamStudio} />
              <Route path="/transfers" component={TransferPortal} />
              <Route path="/acoustics" component={AcousticsLab} />
              <Route path="/drift" component={RickshawDrift} />
              <Route path="/anticheat" component={AntiCheatWatchtower} />
              <Route path="/highlights" component={AIHighlightsStudio} />
              <Route path="/cricket-lab" component={CricketLab} />
              <Route path="/chroma-studio" component={ChromaStudio} />
              <Route path="/tabla-synth" component={TablaSynth} />
              <Route path="/jersey-customizer" component={JerseyCustomizer} />
              <Route path="/cyber-daw" component={CyberDAW} />
              <Route path="/neon-overdrive" component={NeonOverdriveGame} />
              <Route path="/creator-terminal" component={CreatorTerminal} />
              <Route path="/prompt-arena" component={PromptArena} />
              <Route path="/ascii-studio" component={AsciiStudio} />
              <Route path="/orbit-sandbox" component={OrbitSandbox} />
              <Route path="/tactical-sandbox" component={TacticalSandbox} />
              <Route path="/signal-lab" component={SignalLab} />
              <Route path="/cyber-chess" component={CyberChess} />
              <Route path="/settings" component={Settings} />
              <Route component={NotFound} />
            </Switch>
          </PageTransition>
        </Suspense>
      </AppShell>
    </ErrorBoundary>
  );
}

const AuthRedirect = () => <Redirect to="/" />;

function Router() {
  const currentUser = useAppStore((s) => s.currentUser);
  const isInitializing = useAppStore((s) => s.isInitializing);
  const initialize = useAppStore((s) => s.initialize);
  const [location] = useLocation();

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
      {!currentUser && (
        <Route 
          component={() => <Redirect to={`/auth?redirect=${encodeURIComponent(location)}`} />} 
        />
      )}
      {currentUser && <Route path="/auth" component={AuthRedirect} />}
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

    // Initialize Web Audio Engine globally (must wait for user interaction to resume)
    uiaudio.init();
    const enableAudio = () => uiaudio.resume();
    document.addEventListener('click', enableAudio, { once: true });
    
    // Wire up global UI click sounds for buttons
    const playClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('a')) {
        uiaudio.click();
      }
    };
    document.addEventListener('click', playClick);

    return () => {
      document.removeEventListener('click', playClick);
    };
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user">
          <TooltipProvider>
            <ThreeBackground />
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <AppProfiler>
                <RouteTelemetry />
                <Router />
              </AppProfiler>
            </WouterRouter>
            <Toaster />
            <AICopilot />
          </TooltipProvider>
        </MotionConfig>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
