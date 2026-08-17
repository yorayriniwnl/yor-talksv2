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
const InvoiceStudio = lazyWithRetry(() => import('@/pages/invoice-studio'));
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
const BrandDealsHub = lazyWithRetry(() => import('@/pages/brand-deals'));
const ChaiSimulator = lazyWithRetry(() => import('@/pages/chai-sim'));
const CustomRoomLobby = lazyWithRetry(() => import('@/pages/custom-room'));
const GearCustomizer = lazyWithRetry(() => import('@/pages/gear-customizer'));
const MultistreamStudio = lazyWithRetry(() => import('@/pages/multistream'));
const TransferPortal = lazyWithRetry(() => import('@/pages/transfer-portal'));
const AcousticsLab = lazyWithRetry(() => import('@/pages/acoustics-lab'));
const RickshawDrift = lazyWithRetry(() => import('@/pages/rickshaw-drift'));
const AntiCheatWatchtower = lazyWithRetry(() => import('@/pages/anticheat-hub'));
const AIHighlightsStudio = lazyWithRetry(() => import('@/pages/ai-highlights'));
const CricketLab = lazyWithRetry(() => import('@/pages/cricket-lab'));
const CasterDeck = lazyWithRetry(() => import('@/pages/caster-deck'));
const PitchDeckStudio = lazyWithRetry(() => import('@/pages/pitch-deck'));
const DhabaRush = lazyWithRetry(() => import('@/pages/dhaba-rush'));
const TaxComplianceHub = lazyWithRetry(() => import('@/pages/tax-hub'));
const PostureAIHub = lazyWithRetry(() => import('@/pages/posture-ai'));
const PanipuriRush = lazyWithRetry(() => import('@/pages/panipuri-rush'));
const ChromaStudio = lazyWithRetry(() => import('@/pages/chroma-studio'));
const DisputeHub = lazyWithRetry(() => import('@/pages/dispute-hub'));
const TablaSynth = lazyWithRetry(() => import('@/pages/tabla-synth'));
const JerseyCustomizer = lazyWithRetry(() => import('@/pages/jersey-customizer'));
const NDAVault = lazyWithRetry(() => import('@/pages/nda-vault'));
const LassiBar = lazyWithRetry(() => import('@/pages/lassi-bar'));
const ContractSigner = lazyWithRetry(() => import('@/pages/contract-signer'));
const FoamPlanner = lazyWithRetry(() => import('@/pages/foam-planner'));
const VadaPavRush = lazyWithRetry(() => import('@/pages/vadapav-rush'));
const DraftCombine = lazyWithRetry(() => import('@/pages/draft-combine'));
const ChatOverlayStudio = lazyWithRetry(() => import('@/pages/chat-overlay'));
const BiryaniDumSimulator = lazyWithRetry(() => import('@/pages/biryani-dum'));
const SFXVault = lazyWithRetry(() => import('@/pages/sfx-vault'));
const ThumbnailStudio = lazyWithRetry(() => import('@/pages/thumbnail-studio'));
const ScrimsScheduler = lazyWithRetry(() => import('@/pages/scrims-scheduler'));
const RigBenchmark = lazyWithRetry(() => import('@/pages/rig-benchmark'));
const PrizePoolEscrow = lazyWithRetry(() => import('@/pages/prizepool-escrow'));
const FanChantsStudio = lazyWithRetry(() => import('@/pages/fan-chants'));
const LightingController = lazyWithRetry(() => import('@/pages/lighting-controller'));
const GiveawayWheel = lazyWithRetry(() => import('@/pages/giveaway-wheel'));
const PavBhajiRush = lazyWithRetry(() => import('@/pages/pavbhaji-rush'));
const FairPlayCompliance = lazyWithRetry(() => import('@/pages/fairplay-compliance'));
const AudioMatrix = lazyWithRetry(() => import('@/pages/audio-matrix'));
const CholeBhatureRush = lazyWithRetry(() => import('@/pages/chole-bhature'));
const GreenRoom = lazyWithRetry(() => import('@/pages/green-room'));
const VetoStudio = lazyWithRetry(() => import('@/pages/veto-studio'));
const KulfiFaloodaRush = lazyWithRetry(() => import('@/pages/kulfi-falooda'));
const MerchVault = lazyWithRetry(() => import('@/pages/merch-vault'));
const TeleprompterStudio = lazyWithRetry(() => import('@/pages/teleprompter'));
const IdliVadaRush = lazyWithRetry(() => import('@/pages/idli-vada'));
const CoachLab = lazyWithRetry(() => import('@/pages/coach-lab'));
const LUTGraderStudio = lazyWithRetry(() => import('@/pages/lut-grader'));
const RajmaChawalRush = lazyWithRetry(() => import('@/pages/rajma-chawal'));
const PyroDeck = lazyWithRetry(() => import('@/pages/pyro-deck'));
const VODChapters = lazyWithRetry(() => import('@/pages/vod-chapters'));
const BedmiPuriRush = lazyWithRetry(() => import('@/pages/bedmi-puri'));
const BootcampAllocator = lazyWithRetry(() => import('@/pages/bootcamp-allocator'));
const LivePollsHUD = lazyWithRetry(() => import('@/pages/live-polls'));
const PohaJalebiRush = lazyWithRetry(() => import('@/pages/poha-jalebi'));
const ScrimsLeaderboard = lazyWithRetry(() => import('@/pages/scrims-leaderboard'));
const SubathonTimer = lazyWithRetry(() => import('@/pages/subathon-timer'));
const LittiChokhaRush = lazyWithRetry(() => import('@/pages/litti-chokha'));
const KillzoneAnalyzer = lazyWithRetry(() => import('@/pages/killzone-analyzer'));
const HypeTrainHUD = lazyWithRetry(() => import('@/pages/hypetrain-hud'));
const DalBaatiRush = lazyWithRetry(() => import('@/pages/dal-baati'));
const DroneScout = lazyWithRetry(() => import('@/pages/drone-scout'));
const SubGoalStudio = lazyWithRetry(() => import('@/pages/sub-goal'));
const HyderabadiHaleemRush = lazyWithRetry(() => import('@/pages/hyderabadi-haleem'));
const LineupLab = lazyWithRetry(() => import('@/pages/lineup-lab'));
const EmoteWallStudio = lazyWithRetry(() => import('@/pages/emote-wall'));
const KathiRollRush = lazyWithRetry(() => import('@/pages/kathi-roll'));
const DamageTradeSimulator = lazyWithRetry(() => import('@/pages/damage-trade'));
const BitrateHealthWatchtower = lazyWithRetry(() => import('@/pages/bitrate-health'));
const AmritsariKulchaRush = lazyWithRetry(() => import('@/pages/amritsari-kulcha'));
const CasterDirectorDeck = lazyWithRetry(() => import('@/pages/caster-director'));
const TTSCustomizerStudio = lazyWithRetry(() => import('@/pages/tts-customizer'));
const MisalPavRush = lazyWithRetry(() => import('@/pages/misal-pav'));
const ReplayStudio = lazyWithRetry(() => import('@/pages/replay-studio'));
const SubathonWheelHUD = lazyWithRetry(() => import('@/pages/subathon-wheel'));
const DahiBhallaRush = lazyWithRetry(() => import('@/pages/dahi-bhalla'));
const StatCardGenerator = lazyWithRetry(() => import('@/pages/stat-card'));
const ChatPinsStudio = lazyWithRetry(() => import('@/pages/chat-pins'));
const MomosRush = lazyWithRetry(() => import('@/pages/momos-rush'));
const RecoilPatternMatrix = lazyWithRetry(() => import('@/pages/recoil-matrix'));
const ScoreTallyStudio = lazyWithRetry(() => import('@/pages/score-tally'));
const BaidaRotiRush = lazyWithRetry(() => import('@/pages/baida-roti'));
const DefusalTimerHUD = lazyWithRetry(() => import('@/pages/defusal-timer'));
const PollOverlayStudio = lazyWithRetry(() => import('@/pages/poll-overlay'));
const BunMaskaRush = lazyWithRetry(() => import('@/pages/bun-maska'));
const SmokeSimulator = lazyWithRetry(() => import('@/pages/smoke-simulator'));
const GoalMeterStudio = lazyWithRetry(() => import('@/pages/goal-meter'));
const KeemaPavRush = lazyWithRetry(() => import('@/pages/keema-pav'));
const FlashMatrix = lazyWithRetry(() => import('@/pages/flash-matrix'));
const TickerBarStudio = lazyWithRetry(() => import('@/pages/ticker-bar'));
const AppamStewRush = lazyWithRetry(() => import('@/pages/appam-stew'));
const CrosshairVault = lazyWithRetry(() => import('@/pages/crosshair-vault'));
const EmoteWaterfallStudio = lazyWithRetry(() => import('@/pages/emote-waterfall'));
const ParottaSalnaRush = lazyWithRetry(() => import('@/pages/parotta-salna'));
const ArmorMatrix = lazyWithRetry(() => import('@/pages/armor-matrix'));
const StreakMeterStudio = lazyWithRetry(() => import('@/pages/streak-meter'));
const PatialaLassiRush = lazyWithRetry(() => import('@/pages/patiala-lassi'));
const FootstepMatrix = lazyWithRetry(() => import('@/pages/footstep-matrix'));
const EmoteRainStudio = lazyWithRetry(() => import('@/pages/emote-rain'));
const AslamButterChickenRush = lazyWithRetry(() => import('@/pages/aslam-butter-chicken'));
const EconomyPlanner = lazyWithRetry(() => import('@/pages/economy-planner'));
const DonoTrainStudio = lazyWithRetry(() => import('@/pages/dono-train'));
const DoubleKaMeethaRush = lazyWithRetry(() => import('@/pages/double-ka-meetha'));
const AbilityMatrix = lazyWithRetry(() => import('@/pages/ability-matrix'));
const DecibelMeterStudio = lazyWithRetry(() => import('@/pages/decibel-meter'));
const GaloutiKebabRush = lazyWithRetry(() => import('@/pages/galouti-kebab'));
const RadarPings = lazyWithRetry(() => import('@/pages/radar-pings'));
const FireworkRocketStudio = lazyWithRetry(() => import('@/pages/firework-rocket'));
const NalliNihariRush = lazyWithRetry(() => import('@/pages/nalli-nihari'));
const PlantRetakeMatrix = lazyWithRetry(() => import('@/pages/plant-retake-matrix'));
const ConfettiCannonStudio = lazyWithRetry(() => import('@/pages/confetti-cannon'));
const MangaloreFishFryRush = lazyWithRetry(() => import('@/pages/mangalore-fish-fry'));
const AccuracyMatrix = lazyWithRetry(() => import('@/pages/accuracy-matrix'));
const LaserShowStudio = lazyWithRetry(() => import('@/pages/laser-show'));
const DesiThaliRush = lazyWithRetry(() => import('@/pages/desi-thali'));
const RotationMatrix = lazyWithRetry(() => import('@/pages/rotation-matrix'));
const EmoteFountainStudio = lazyWithRetry(() => import('@/pages/emote-fountain'));
const ParkKathiRollRush = lazyWithRetry(() => import('@/pages/park-kathi-roll'));
const AntiFlashMatrix = lazyWithRetry(() => import('@/pages/anti-flash-matrix'));
const EmoteTornadoStudio = lazyWithRetry(() => import('@/pages/emote-tornado'));
const ChettinadChickenRush = lazyWithRetry(() => import('@/pages/chettinad-chicken'));
const WallbangMatrix = lazyWithRetry(() => import('@/pages/wallbang-matrix'));
const EmoteDragonStudio = lazyWithRetry(() => import('@/pages/emote-dragon'));
const LucknowiBiryaniRush = lazyWithRetry(() => import('@/pages/lucknowi-biryani'));

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
              <Route path="/art" component={AIArtStudio} />
              <Route path="/ai-art" component={AIArtStudio} />
              <Route path="/merch" component={MerchStudio} />
              <Route path="/predictions" component={PredictionsArena} />
              <Route path="/spectrum" component={Spectrum} />
              <Route path="/visualizer" component={Spectrum} />
              <Route path="/overlays" component={OverlayStudio} />
              <Route path="/overlay-studio" component={OverlayStudio} />
              <Route path="/contracts" component={ContractsStudio} />
              <Route path="/treasury" component={ClanTreasury} />
              <Route path="/podcasts" component={PodcastStudio} />
              <Route path="/launchpad" component={GameLaunchpad} />
              <Route path="/fanclub" component={FanClubSubscriptions} />
              <Route path="/clips" component={ClipStudio} />
              <Route path="/rankings" component={PowerRankings} />
              <Route path="/invoices" component={InvoiceStudio} />
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
              <Route path="/deals" component={BrandDealsHub} />
              <Route path="/chai" component={ChaiSimulator} />
              <Route path="/rooms" component={CustomRoomLobby} />
              <Route path="/gear" component={GearCustomizer} />
              <Route path="/multistream" component={MultistreamStudio} />
              <Route path="/transfers" component={TransferPortal} />
              <Route path="/acoustics" component={AcousticsLab} />
              <Route path="/drift" component={RickshawDrift} />
              <Route path="/anticheat" component={AntiCheatWatchtower} />
              <Route path="/highlights" component={AIHighlightsStudio} />
              <Route path="/cricket-lab" component={CricketLab} />
              <Route path="/caster-deck" component={CasterDeck} />
              <Route path="/pitch-deck" component={PitchDeckStudio} />
              <Route path="/dhaba-rush" component={DhabaRush} />
              <Route path="/tax-hub" component={TaxComplianceHub} />
              <Route path="/posture-ai" component={PostureAIHub} />
              <Route path="/panipuri-rush" component={PanipuriRush} />
              <Route path="/chroma-studio" component={ChromaStudio} />
              <Route path="/dispute-hub" component={DisputeHub} />
              <Route path="/tabla-synth" component={TablaSynth} />
              <Route path="/jersey-customizer" component={JerseyCustomizer} />
              <Route path="/nda-vault" component={NDAVault} />
              <Route path="/lassi-bar" component={LassiBar} />
              <Route path="/contract-signer" component={ContractSigner} />
              <Route path="/foam-planner" component={FoamPlanner} />
              <Route path="/vadapav-rush" component={VadaPavRush} />
              <Route path="/draft-combine" component={DraftCombine} />
              <Route path="/chat-overlay" component={ChatOverlayStudio} />
              <Route path="/biryani-dum" component={BiryaniDumSimulator} />
              <Route path="/sfx-vault" component={SFXVault} />
              <Route path="/thumbnail-studio" component={ThumbnailStudio} />
              <Route path="/scrims-scheduler" component={ScrimsScheduler} />
              <Route path="/rig-benchmark" component={RigBenchmark} />
              <Route path="/prizepool-escrow" component={PrizePoolEscrow} />
              <Route path="/fan-chants" component={FanChantsStudio} />
              <Route path="/lighting-controller" component={LightingController} />
              <Route path="/giveaway-wheel" component={GiveawayWheel} />
              <Route path="/pavbhaji-rush" component={PavBhajiRush} />
              <Route path="/fairplay-compliance" component={FairPlayCompliance} />
              <Route path="/audio-matrix" component={AudioMatrix} />
              <Route path="/chole-bhature" component={CholeBhatureRush} />
              <Route path="/green-room" component={GreenRoom} />
              <Route path="/veto-studio" component={VetoStudio} />
              <Route path="/kulfi-falooda" component={KulfiFaloodaRush} />
              <Route path="/merch-vault" component={MerchVault} />
              <Route path="/teleprompter" component={TeleprompterStudio} />
              <Route path="/idli-vada" component={IdliVadaRush} />
              <Route path="/coach-lab" component={CoachLab} />
              <Route path="/lut-grader" component={LUTGraderStudio} />
              <Route path="/rajma-chawal" component={RajmaChawalRush} />
              <Route path="/pyro-deck" component={PyroDeck} />
              <Route path="/vod-chapters" component={VODChapters} />
              <Route path="/bedmi-puri" component={BedmiPuriRush} />
              <Route path="/bootcamp-allocator" component={BootcampAllocator} />
              <Route path="/live-polls" component={LivePollsHUD} />
              <Route path="/poha-jalebi" component={PohaJalebiRush} />
              <Route path="/scrims-leaderboard" component={ScrimsLeaderboard} />
              <Route path="/subathon-timer" component={SubathonTimer} />
              <Route path="/litti-chokha" component={LittiChokhaRush} />
              <Route path="/killzone-analyzer" component={KillzoneAnalyzer} />
              <Route path="/hypetrain-hud" component={HypeTrainHUD} />
              <Route path="/dal-baati" component={DalBaatiRush} />
              <Route path="/drone-scout" component={DroneScout} />
              <Route path="/sub-goal" component={SubGoalStudio} />
              <Route path="/hyderabadi-haleem" component={HyderabadiHaleemRush} />
              <Route path="/lineup-lab" component={LineupLab} />
              <Route path="/emote-wall" component={EmoteWallStudio} />
              <Route path="/kathi-roll" component={KathiRollRush} />
              <Route path="/damage-trade" component={DamageTradeSimulator} />
              <Route path="/bitrate-health" component={BitrateHealthWatchtower} />
              <Route path="/amritsari-kulcha" component={AmritsariKulchaRush} />
              <Route path="/caster-director" component={CasterDirectorDeck} />
              <Route path="/tts-customizer" component={TTSCustomizerStudio} />
              <Route path="/misal-pav" component={MisalPavRush} />
              <Route path="/replay-studio" component={ReplayStudio} />
              <Route path="/subathon-wheel" component={SubathonWheelHUD} />
              <Route path="/dahi-bhalla" component={DahiBhallaRush} />
              <Route path="/stat-card" component={StatCardGenerator} />
              <Route path="/chat-pins" component={ChatPinsStudio} />
              <Route path="/momos-rush" component={MomosRush} />
              <Route path="/recoil-matrix" component={RecoilPatternMatrix} />
              <Route path="/score-tally" component={ScoreTallyStudio} />
              <Route path="/baida-roti" component={BaidaRotiRush} />
              <Route path="/defusal-timer" component={DefusalTimerHUD} />
              <Route path="/poll-overlay" component={PollOverlayStudio} />
              <Route path="/bun-maska" component={BunMaskaRush} />
              <Route path="/smoke-simulator" component={SmokeSimulator} />
              <Route path="/goal-meter" component={GoalMeterStudio} />
              <Route path="/keema-pav" component={KeemaPavRush} />
              <Route path="/flash-matrix" component={FlashMatrix} />
              <Route path="/ticker-bar" component={TickerBarStudio} />
              <Route path="/appam-stew" component={AppamStewRush} />
              <Route path="/crosshair-vault" component={CrosshairVault} />
              <Route path="/emote-waterfall" component={EmoteWaterfallStudio} />
              <Route path="/parotta-salna" component={ParottaSalnaRush} />
              <Route path="/armor-matrix" component={ArmorMatrix} />
              <Route path="/streak-meter" component={StreakMeterStudio} />
              <Route path="/patiala-lassi" component={PatialaLassiRush} />
              <Route path="/footstep-matrix" component={FootstepMatrix} />
              <Route path="/emote-rain" component={EmoteRainStudio} />
              <Route path="/aslam-butter-chicken" component={AslamButterChickenRush} />
              <Route path="/economy-planner" component={EconomyPlanner} />
              <Route path="/dono-train" component={DonoTrainStudio} />
              <Route path="/double-ka-meetha" component={DoubleKaMeethaRush} />
              <Route path="/ability-matrix" component={AbilityMatrix} />
              <Route path="/decibel-meter" component={DecibelMeterStudio} />
              <Route path="/galouti-kebab" component={GaloutiKebabRush} />
              <Route path="/radar-pings" component={RadarPings} />
              <Route path="/firework-rocket" component={FireworkRocketStudio} />
              <Route path="/nalli-nihari" component={NalliNihariRush} />
              <Route path="/plant-retake-matrix" component={PlantRetakeMatrix} />
              <Route path="/confetti-cannon" component={ConfettiCannonStudio} />
              <Route path="/mangalore-fish-fry" component={MangaloreFishFryRush} />
              <Route path="/accuracy-matrix" component={AccuracyMatrix} />
              <Route path="/laser-show" component={LaserShowStudio} />
              <Route path="/desi-thali" component={DesiThaliRush} />
              <Route path="/rotation-matrix" component={RotationMatrix} />
              <Route path="/emote-fountain" component={EmoteFountainStudio} />
              <Route path="/park-kathi-roll" component={ParkKathiRollRush} />
              <Route path="/anti-flash-matrix" component={AntiFlashMatrix} />
              <Route path="/emote-tornado" component={EmoteTornadoStudio} />
              <Route path="/chettinad-chicken" component={ChettinadChickenRush} />
              <Route path="/wallbang-matrix" component={WallbangMatrix} />
              <Route path="/emote-dragon" component={EmoteDragonStudio} />
              <Route path="/lucknowi-biryani" component={LucknowiBiryaniRush} />
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
