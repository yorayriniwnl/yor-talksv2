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
const NanoLab = lazyWithRetry(() => import('@/pages/nano-lab'));
const EurorackSynth = lazyWithRetry(() => import('@/pages/eurorack-synth'));
const ValkyrieProtocol = lazyWithRetry(() => import('@/pages/valkyrie-protocol'));
const NodeTopology = lazyWithRetry(() => import('@/pages/node-topology'));
const EsportsTycoon = lazyWithRetry(() => import('@/pages/esports-tycoon'));
const QuantumCircuitSimulator = lazyWithRetry(() => import('@/pages/quantum-circuit'));
const CyberDrift3D = lazyWithRetry(() => import('@/pages/cyber-drift-3d'));
const FractalStudio = lazyWithRetry(() => import('@/pages/fractal-studio'));
const HawkEyeSim = lazyWithRetry(() => import('@/pages/hawkeye-sim'));
const ThreatSoc = lazyWithRetry(() => import('@/pages/threat-soc'));
const BlackHoleSim = lazyWithRetry(() => import('@/pages/blackhole-sim'));
const WindTunnel = lazyWithRetry(() => import('@/pages/wind-tunnel'));
const NeuralBeatmaker = lazyWithRetry(() => import('@/pages/neural-beatmaker'));
const CyberRogue = lazyWithRetry(() => import('@/pages/cyber-rogue'));
const AuditStudio = lazyWithRetry(() => import('@/pages/audit-studio'));
const FluidSim = lazyWithRetry(() => import('@/pages/fluid-sim'));
const CyberPinball = lazyWithRetry(() => import('@/pages/cyber-pinball'));
const PolySynth = lazyWithRetry(() => import('@/pages/poly-synth'));
const CricketTrainer = lazyWithRetry(() => import('@/pages/cricket-trainer'));
const NeuralTrainer = lazyWithRetry(() => import('@/pages/neural-trainer'));
const GravWave = lazyWithRetry(() => import('@/pages/grav-wave'));
const RoverSim = lazyWithRetry(() => import('@/pages/rover-sim'));
const GeneCircuit = lazyWithRetry(() => import('@/pages/gene-circuit'));
const CityCourier = lazyWithRetry(() => import('@/pages/city-courier'));
const VocoderStudio = lazyWithRetry(() => import('@/pages/vocoder-studio'));
const ColliderSim = lazyWithRetry(() => import('@/pages/collider-sim'));
const DockingSim = lazyWithRetry(() => import('@/pages/docking-sim'));
const CyberTerminal = lazyWithRetry(() => import('@/pages/cyber-terminal'));
const SupersonicSim = lazyWithRetry(() => import('@/pages/supersonic-sim'));
const GranularSynth = lazyWithRetry(() => import('@/pages/granular-synth'));
const QkdStudio = lazyWithRetry(() => import('@/pages/qkd-studio'));
const TokamakSim = lazyWithRetry(() => import('@/pages/tokamak-sim'));
const EegStudio = lazyWithRetry(() => import('@/pages/eeg-studio'));
const CyberRally = lazyWithRetry(() => import('@/pages/cyber-rally'));
const ChiptuneTracker = lazyWithRetry(() => import('@/pages/chiptune-tracker'));
const SpaceElevator = lazyWithRetry(() => import('@/pages/space-elevator'));
const TrafficAi = lazyWithRetry(() => import('@/pages/traffic-ai'));
const SpeechSynth = lazyWithRetry(() => import('@/pages/speech-synth'));
const TankArena = lazyWithRetry(() => import('@/pages/tank-arena'));
const TeleportationStudio = lazyWithRetry(() => import('@/pages/teleportation-studio'));
const ExoplanetSim = lazyWithRetry(() => import('@/pages/exoplanet-sim'));
const HyperloopSim = lazyWithRetry(() => import('@/pages/hyperloop-sim'));
const CellularMatrix = lazyWithRetry(() => import('@/pages/cellular-matrix'));
const NeonBreakout = lazyWithRetry(() => import('@/pages/neon-breakout'));
const CrisprStudio = lazyWithRetry(() => import('@/pages/crispr-studio'));
const WormholeSim = lazyWithRetry(() => import('@/pages/wormhole-sim'));
const DroneSim = lazyWithRetry(() => import('@/pages/drone-sim'));
const SynapseSim = lazyWithRetry(() => import('@/pages/synapse-sim'));
const HoverboardSim = lazyWithRetry(() => import('@/pages/hoverboard-sim'));
const AnnealerSim = lazyWithRetry(() => import('@/pages/annealer-sim'));
const SupernovaSim = lazyWithRetry(() => import('@/pages/supernova-sim'));
const ScramjetSim = lazyWithRetry(() => import('@/pages/scramjet-sim'));
const HodgkinHuxley = lazyWithRetry(() => import('@/pages/hodgkin-huxley'));
const SkiRacer = lazyWithRetry(() => import('@/pages/ski-racer'));
const ShorStudio = lazyWithRetry(() => import('@/pages/shor-studio'));
const DysonSwarm = lazyWithRetry(() => import('@/pages/dyson-swarm'));
const MechSim = lazyWithRetry(() => import('@/pages/mech-sim'));
const PhageSim = lazyWithRetry(() => import('@/pages/phage-sim'));
const Pinball3D = lazyWithRetry(() => import('@/pages/pinball-3d'));
const GroverStudio = lazyWithRetry(() => import('@/pages/grover-studio'));
const KerrBlackHole = lazyWithRetry(() => import('@/pages/kerr-blackhole'));
const IonThruster = lazyWithRetry(() => import('@/pages/ion-thruster'));
const MicrotubuleSim = lazyWithRetry(() => import('@/pages/microtubule-sim'));
const NeonSnake = lazyWithRetry(() => import('@/pages/neon-snake'));
const ErrorCorrection = lazyWithRetry(() => import('@/pages/error-correction'));
const AlcubierreSim = lazyWithRetry(() => import('@/pages/alcubierre-sim'));
const MpdThruster = lazyWithRetry(() => import('@/pages/mpd-thruster'));
const RibosomeSim = lazyWithRetry(() => import('@/pages/ribosome-sim'));
const NeonAsteroids = lazyWithRetry(() => import('@/pages/neon-asteroids'));
const QuantumWalk = lazyWithRetry(() => import('@/pages/quantum-walk'));
const CloudChamber = lazyWithRetry(() => import('@/pages/cloud-chamber'));
const MagnetarSim = lazyWithRetry(() => import('@/pages/magnetar-sim'));
const PrimeEditor = lazyWithRetry(() => import('@/pages/prime-editor'));
const CyberArkanoid = lazyWithRetry(() => import('@/pages/cyber-arkanoid'));
const LindbladSim = lazyWithRetry(() => import('@/pages/lindblad-sim'));
const SynchrotronSim = lazyWithRetry(() => import('@/pages/synchrotron-sim'));
const NtpRocket = lazyWithRetry(() => import('@/pages/ntp-rocket'));
const AtpSynthase = lazyWithRetry(() => import('@/pages/atp-synthase'));
const LunarLander = lazyWithRetry(() => import('@/pages/lunar-lander'));
const CvTeleport = lazyWithRetry(() => import('@/pages/cv-teleport'));
const CmbSim = lazyWithRetry(() => import('@/pages/cmb-sim'));
const ZpinchSim = lazyWithRetry(() => import('@/pages/zpinch-sim'));
const KinesinSim = lazyWithRetry(() => import('@/pages/kinesin-sim'));
const NeonTanks = lazyWithRetry(() => import('@/pages/neon-tanks'));
const XebStudio = lazyWithRetry(() => import('@/pages/xeb-studio'));
const MicrolensingSim = lazyWithRetry(() => import('@/pages/microlensing-sim'));
const AntimatterRocket = lazyWithRetry(() => import('@/pages/antimatter-rocket'));
const PatchClamp = lazyWithRetry(() => import('@/pages/patch-clamp'));
const MissileDefense = lazyWithRetry(() => import('@/pages/missile-defense'));
const GhzTeleport = lazyWithRetry(() => import('@/pages/ghz-teleport'));
const InflationSim = lazyWithRetry(() => import('@/pages/inflation-sim'));
const MtfFusion = lazyWithRetry(() => import('@/pages/mtf-fusion'));
const BacteriorhodopsinSim = lazyWithRetry(() => import('@/pages/bacteriorhodopsin-sim'));
const LightCycles = lazyWithRetry(() => import('@/pages/light-cycles'));
const BosonSampling = lazyWithRetry(() => import('@/pages/boson-sampling'));
const EhtBlackHole = lazyWithRetry(() => import('@/pages/eht-blackhole'));
const LithiumMpd = lazyWithRetry(() => import('@/pages/lithium-mpd'));
const CrisprActivator = lazyWithRetry(() => import('@/pages/crispr-activator'));
const AsteroidMiner = lazyWithRetry(() => import('@/pages/asteroid-miner'));
const QpeStudio = lazyWithRetry(() => import('@/pages/qpe-studio'));
const CosmicString = lazyWithRetry(() => import('@/pages/cosmic-string'));
const TriAlphaFusion = lazyWithRetry(() => import('@/pages/trialpha-fusion'));
const MinimalCell = lazyWithRetry(() => import('@/pages/minimal-cell'));
const CyberPac = lazyWithRetry(() => import('@/pages/cyber-pac'));
const AqcStudio = lazyWithRetry(() => import('@/pages/aqc-studio'));
const XenonDetector = lazyWithRetry(() => import('@/pages/xenon-detector'));
const MifFusion = lazyWithRetry(() => import('@/pages/mif-fusion'));
const ZfnStudio = lazyWithRetry(() => import('@/pages/zfn-studio'));
const CyberPong = lazyWithRetry(() => import('@/pages/cyber-pong'));
const VqeStudio = lazyWithRetry(() => import('@/pages/vqe-studio'));
const AxionHaloscope = lazyWithRetry(() => import('@/pages/axion-haloscope'));
const StellaratorSim = lazyWithRetry(() => import('@/pages/stellarator-sim'));
const BaseEditor = lazyWithRetry(() => import('@/pages/base-editor'));
const SpaceInvaders = lazyWithRetry(() => import('@/pages/space-invaders'));
const QaoaStudio = lazyWithRetry(() => import('@/pages/qaoa-studio'));
const CnbNeutrino = lazyWithRetry(() => import('@/pages/cnb-neutrino'));
const VasimrRocket = lazyWithRetry(() => import('@/pages/vasimr-rocket'));
const TalenStudio = lazyWithRetry(() => import('@/pages/talen-studio'));
const CyberFrogger = lazyWithRetry(() => import('@/pages/cyber-frogger'));
const QstStudio = lazyWithRetry(() => import('@/pages/qst-studio'));
const MuonTomography = lazyWithRetry(() => import('@/pages/muon-tomography'));
const OrionDrive = lazyWithRetry(() => import('@/pages/orion-drive'));
const PrimeEditorV2 = lazyWithRetry(() => import('@/pages/prime-editor-v2'));
const BoulderDash = lazyWithRetry(() => import('@/pages/boulder-dash'));
const RandomizedBenchmarking = lazyWithRetry(() => import('@/pages/randomized-benchmarking'));
const FrbStudio = lazyWithRetry(() => import('@/pages/frb-studio'));
const RdreEngine = lazyWithRetry(() => import('@/pages/rdre-engine'));
const RetronStudio = lazyWithRetry(() => import('@/pages/retron-studio'));
const FlappyDrone = lazyWithRetry(() => import('@/pages/flappy-drone'));
const QptStudio = lazyWithRetry(() => import('@/pages/qpt-studio'));
const ExomoonSim = lazyWithRetry(() => import('@/pages/exomoon-sim'));
const DfdFusionRocket = lazyWithRetry(() => import('@/pages/dfd-fusion-rocket'));
const EpigeneticEditor = lazyWithRetry(() => import('@/pages/epigenetic-editor'));
const LunarDefender = lazyWithRetry(() => import('@/pages/lunar-defender'));
const HamiltonianSim = lazyWithRetry(() => import('@/pages/hamiltonian-sim'));
const CasimirStudio = lazyWithRetry(() => import('@/pages/casimir-studio'));
const HdltThruster = lazyWithRetry(() => import('@/pages/hdlt-thruster'));
const NcaaStudio = lazyWithRetry(() => import('@/pages/ncaa-studio'));
const StarCastle = lazyWithRetry(() => import('@/pages/star-castle'));
const QsvtStudio = lazyWithRetry(() => import('@/pages/qsvt-studio'));
const PmnsOscillation = lazyWithRetry(() => import('@/pages/pmns-oscillation'));
const PhotonicRocket = lazyWithRetry(() => import('@/pages/photonic-rocket'));
const RibosomeO = lazyWithRetry(() => import('@/pages/ribosome-o'));
const RobotMaze = lazyWithRetry(() => import('@/pages/robot-maze'));
const IsingQpt = lazyWithRetry(() => import('@/pages/ising-qpt'));
const BaoCosmology = lazyWithRetry(() => import('@/pages/bao-cosmology'));
const NepRocket = lazyWithRetry(() => import('@/pages/nep-rocket'));
const TxtlStudio = lazyWithRetry(() => import('@/pages/txtl-studio'));
const TempestVortex = lazyWithRetry(() => import('@/pages/tempest-vortex'));
const QuantumOracle = lazyWithRetry(() => import('@/pages/quantum-oracle'));
const Reionization21cm = lazyWithRetry(() => import('@/pages/reionization-21cm'));
const SolarSail = lazyWithRetry(() => import('@/pages/solar-sail'));
const GeneDrive = lazyWithRetry(() => import('@/pages/gene-drive'));
const GravitarSim = lazyWithRetry(() => import('@/pages/gravitar-sim'));
const CvQkd = lazyWithRetry(() => import('@/pages/cv-qkd'));
const QcdPlasma = lazyWithRetry(() => import('@/pages/qcd-plasma'));
const AntimatterCore = lazyWithRetry(() => import('@/pages/antimatter-core'));
const Sc2Studio = lazyWithRetry(() => import('@/pages/sc2-studio'));
const GorfFleet = lazyWithRetry(() => import('@/pages/gorf-fleet'));
const QuantumEraser = lazyWithRetry(() => import('@/pages/quantum-eraser'));
const SterileNeutrino = lazyWithRetry(() => import('@/pages/sterile-neutrino'));
const FrcThruster = lazyWithRetry(() => import('@/pages/frc-thruster'));
const ZringStudio = lazyWithRetry(() => import('@/pages/zring-studio'));
const SinistarArcade = lazyWithRetry(() => import('@/pages/sinistar-arcade'));
const ContextualitySim = lazyWithRetry(() => import('@/pages/contextuality-sim'));
const OptomechanicsSim = lazyWithRetry(() => import('@/pages/optomechanics-sim'));
const M2p2Sail = lazyWithRetry(() => import('@/pages/m2p2-sail'));
const CrisprLogic = lazyWithRetry(() => import('@/pages/crispr-logic'));
const VanguardSim = lazyWithRetry(() => import('@/pages/vanguard-sim'));
const GraphWalk = lazyWithRetry(() => import('@/pages/graph-walk'));
const MajoranaBraiding = lazyWithRetry(() => import('@/pages/majorana-braiding'));
const FusionMirror = lazyWithRetry(() => import('@/pages/fusion-mirror'));
const EpigeneticClock = lazyWithRetry(() => import('@/pages/epigenetic-clock'));
const BerzerkArcade = lazyWithRetry(() => import('@/pages/berzerk-arcade'));
const CvTeleportStudio = lazyWithRetry(() => import('@/pages/cv-teleport-studio'));
const BcsSuperconductor = lazyWithRetry(() => import('@/pages/bcs-superconductor'));
const RotatingPlasma = lazyWithRetry(() => import('@/pages/rotating-plasma'));
const CrisprEpigenome = lazyWithRetry(() => import('@/pages/crispr-epigenome'));
const TrenchRun = lazyWithRetry(() => import('@/pages/trench-run'));
const HelstromSim = lazyWithRetry(() => import('@/pages/helstrom-sim'));
const QuantumHall = lazyWithRetry(() => import('@/pages/quantum-hall'));
const CuspThruster = lazyWithRetry(() => import('@/pages/cusp-thruster'));
const OrthorepStudio = lazyWithRetry(() => import('@/pages/orthorep-studio'));
const QixArcade = lazyWithRetry(() => import('@/pages/qix-arcade'));
const QuantumSteering = lazyWithRetry(() => import('@/pages/quantum-steering'));
const QuantumZeno = lazyWithRetry(() => import('@/pages/quantum-zeno'));
const StartramSim = lazyWithRetry(() => import('@/pages/startram-sim'));
const RnaiStudio = lazyWithRetry(() => import('@/pages/rnai-studio'));
const CommandArcade = lazyWithRetry(() => import('@/pages/command-arcade'));
const HardyParadox = lazyWithRetry(() => import('@/pages/hardy-paradox'));
const LaughlinFqhe = lazyWithRetry(() => import('@/pages/laughlin-fqhe'));
const NswrEngine = lazyWithRetry(() => import('@/pages/nswr-engine'));
const Sy14Fusion = lazyWithRetry(() => import('@/pages/sy14-fusion'));
const MarbleArcade = lazyWithRetry(() => import('@/pages/marble-arcade'));
const BuresFisher = lazyWithRetry(() => import('@/pages/bures-fisher'));
const ZneStudio = lazyWithRetry(() => import('@/pages/zne-studio'));
const GasCoreEngine = lazyWithRetry(() => import('@/pages/gas-core-engine'));
const ClickChemistry = lazyWithRetry(() => import('@/pages/click-chemistry'));
const DeathStarCore = lazyWithRetry(() => import('@/pages/death-star-core'));
const KcbsPentagram = lazyWithRetry(() => import('@/pages/kcbs-pentagram'));
const PecStudio = lazyWithRetry(() => import('@/pages/pec-studio'));
const FissionFragment = lazyWithRetry(() => import('@/pages/fission-fragment'));
const PhageTail = lazyWithRetry(() => import('@/pages/phage-tail'));
const LightTank3D = lazyWithRetry(() => import('@/pages/light-tank-3d'));
const OtocScrambler = lazyWithRetry(() => import('@/pages/otoc-scrambler'));
const CdrStudio = lazyWithRetry(() => import('@/pages/cdr-studio'));
const AcmfRocket = lazyWithRetry(() => import('@/pages/acmf-rocket'));
const ScrambleStudio = lazyWithRetry(() => import('@/pages/scramble-studio'));
const HothSpeeder = lazyWithRetry(() => import('@/pages/hoth-speeder'));
const WStateStudio = lazyWithRetry(() => import('@/pages/w-state-studio'));
const VirtualDistillation = lazyWithRetry(() => import('@/pages/virtual-distillation'));
const PulsedPlasmoid = lazyWithRetry(() => import('@/pages/pulsed-plasmoid'));
const RiboswitchStudio = lazyWithRetry(() => import('@/pages/riboswitch-studio'));
const EndorSpeeder = lazyWithRetry(() => import('@/pages/endor-speeder'));
const CvMbqcStudio = lazyWithRetry(() => import('@/pages/cv-mbqc-studio'));
const SymmetryVerification = lazyWithRetry(() => import('@/pages/symmetry-verification'));
const MedusaRocket = lazyWithRetry(() => import('@/pages/medusa-rocket'));
const CrisproffStudio = lazyWithRetry(() => import('@/pages/crisproff-studio'));
const TieFighterArcade = lazyWithRetry(() => import('@/pages/tie-fighter-arcade'));
const LatticeSurgery = lazyWithRetry(() => import('@/pages/lattice-surgery'));
const DualStateQem = lazyWithRetry(() => import('@/pages/dual-state-qem'));
const LaserAntimatter = lazyWithRetry(() => import('@/pages/laser-antimatter'));
const Cas12aCascade = lazyWithRetry(() => import('@/pages/cas12a-cascade'));
const SurfaceTurretAssault = lazyWithRetry(() => import('@/pages/surface-turret-assault'));
const MagicStateFactory = lazyWithRetry(() => import('@/pages/magic-state-factory'));
const SubspaceExpansion = lazyWithRetry(() => import('@/pages/subspace-expansion'));
const PuffFusionRocket = lazyWithRetry(() => import('@/pages/puff-fusion-rocket'));
const Cas13dVirus = lazyWithRetry(() => import('@/pages/cas13d-virus'));
const FalconAsteroids = lazyWithRetry(() => import('@/pages/falcon-asteroids'));
const ColorCodeStudio = lazyWithRetry(() => import('@/pages/color-code-studio'));
const VirtualSubspace = lazyWithRetry(() => import('@/pages/virtual-subspace'));
const IcfRamjet = lazyWithRetry(() => import('@/pages/icf-ramjet'));
const CasminiStudio = lazyWithRetry(() => import('@/pages/casmini-studio'));
const ExecutorAssault = lazyWithRetry(() => import('@/pages/executor-assault'));
const RaussendorfLattice = lazyWithRetry(() => import('@/pages/raussendorf-lattice'));
const FermionicShadows = lazyWithRetry(() => import('@/pages/fermionic-shadows'));
const SkyhookTether = lazyWithRetry(() => import('@/pages/skyhook-tether'));
const Cas14Diagnostics = lazyWithRetry(() => import('@/pages/cas14-diagnostics'));
const BwingAssault = lazyWithRetry(() => import('@/pages/bwing-assault'));
const FloquetMajorana = lazyWithRetry(() => import('@/pages/floquet-majorana'));

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
              <Route path="/nano-lab" component={NanoLab} />
              <Route path="/eurorack-synth" component={EurorackSynth} />
              <Route path="/valkyrie-protocol" component={ValkyrieProtocol} />
              <Route path="/node-topology" component={NodeTopology} />
              <Route path="/esports-tycoon" component={EsportsTycoon} />
              <Route path="/quantum-circuit" component={QuantumCircuitSimulator} />
              <Route path="/cyber-drift-3d" component={CyberDrift3D} />
              <Route path="/fractal-studio" component={FractalStudio} />
              <Route path="/hawkeye-sim" component={HawkEyeSim} />
              <Route path="/threat-soc" component={ThreatSoc} />
              <Route path="/blackhole-sim" component={BlackHoleSim} />
              <Route path="/wind-tunnel" component={WindTunnel} />
              <Route path="/neural-beatmaker" component={NeuralBeatmaker} />
              <Route path="/cyber-rogue" component={CyberRogue} />
              <Route path="/audit-studio" component={AuditStudio} />
              <Route path="/fluid-sim" component={FluidSim} />
              <Route path="/cyber-pinball" component={CyberPinball} />
              <Route path="/poly-synth" component={PolySynth} />
              <Route path="/cricket-trainer" component={CricketTrainer} />
              <Route path="/neural-trainer" component={NeuralTrainer} />
              <Route path="/grav-wave" component={GravWave} />
              <Route path="/rover-sim" component={RoverSim} />
              <Route path="/gene-circuit" component={GeneCircuit} />
              <Route path="/city-courier" component={CityCourier} />
              <Route path="/vocoder-studio" component={VocoderStudio} />
              <Route path="/collider-sim" component={ColliderSim} />
              <Route path="/docking-sim" component={DockingSim} />
              <Route path="/cyber-terminal" component={CyberTerminal} />
              <Route path="/supersonic-sim" component={SupersonicSim} />
              <Route path="/granular-synth" component={GranularSynth} />
              <Route path="/qkd-studio" component={QkdStudio} />
              <Route path="/tokamak-sim" component={TokamakSim} />
              <Route path="/eeg-studio" component={EegStudio} />
              <Route path="/cyber-rally" component={CyberRally} />
              <Route path="/chiptune-tracker" component={ChiptuneTracker} />
              <Route path="/space-elevator" component={SpaceElevator} />
              <Route path="/traffic-ai" component={TrafficAi} />
              <Route path="/speech-synth" component={SpeechSynth} />
              <Route path="/tank-arena" component={TankArena} />
              <Route path="/teleportation-studio" component={TeleportationStudio} />
              <Route path="/exoplanet-sim" component={ExoplanetSim} />
              <Route path="/hyperloop-sim" component={HyperloopSim} />
              <Route path="/cellular-matrix" component={CellularMatrix} />
              <Route path="/neon-breakout" component={NeonBreakout} />
              <Route path="/crispr-studio" component={CrisprStudio} />
              <Route path="/wormhole-sim" component={WormholeSim} />
              <Route path="/drone-sim" component={DroneSim} />
              <Route path="/synapse-sim" component={SynapseSim} />
              <Route path="/hoverboard-sim" component={HoverboardSim} />
              <Route path="/annealer-sim" component={AnnealerSim} />
              <Route path="/supernova-sim" component={SupernovaSim} />
              <Route path="/scramjet-sim" component={ScramjetSim} />
              <Route path="/hodgkin-huxley" component={HodgkinHuxley} />
              <Route path="/ski-racer" component={SkiRacer} />
              <Route path="/shor-studio" component={ShorStudio} />
              <Route path="/dyson-swarm" component={DysonSwarm} />
              <Route path="/mech-sim" component={MechSim} />
              <Route path="/phage-sim" component={PhageSim} />
              <Route path="/pinball-3d" component={Pinball3D} />
              <Route path="/grover-studio" component={GroverStudio} />
              <Route path="/kerr-blackhole" component={KerrBlackHole} />
              <Route path="/ion-thruster" component={IonThruster} />
              <Route path="/microtubule-sim" component={MicrotubuleSim} />
              <Route path="/neon-snake" component={NeonSnake} />
              <Route path="/error-correction" component={ErrorCorrection} />
              <Route path="/alcubierre-sim" component={AlcubierreSim} />
              <Route path="/mpd-thruster" component={MpdThruster} />
              <Route path="/ribosome-sim" component={RibosomeSim} />
              <Route path="/neon-asteroids" component={NeonAsteroids} />
              <Route path="/quantum-walk" component={QuantumWalk} />
              <Route path="/cloud-chamber" component={CloudChamber} />
              <Route path="/magnetar-sim" component={MagnetarSim} />
              <Route path="/prime-editor" component={PrimeEditor} />
              <Route path="/cyber-arkanoid" component={CyberArkanoid} />
              <Route path="/lindblad-sim" component={LindbladSim} />
              <Route path="/synchrotron-sim" component={SynchrotronSim} />
              <Route path="/ntp-rocket" component={NtpRocket} />
              <Route path="/atp-synthase" component={AtpSynthase} />
              <Route path="/lunar-lander" component={LunarLander} />
              <Route path="/cv-teleport" component={CvTeleport} />
              <Route path="/cmb-sim" component={CmbSim} />
              <Route path="/zpinch-sim" component={ZpinchSim} />
              <Route path="/kinesin-sim" component={KinesinSim} />
              <Route path="/neon-tanks" component={NeonTanks} />
              <Route path="/xeb-studio" component={XebStudio} />
              <Route path="/microlensing-sim" component={MicrolensingSim} />
              <Route path="/antimatter-rocket" component={AntimatterRocket} />
              <Route path="/patch-clamp" component={PatchClamp} />
              <Route path="/missile-defense" component={MissileDefense} />
              <Route path="/ghz-teleport" component={GhzTeleport} />
              <Route path="/inflation-sim" component={InflationSim} />
              <Route path="/mtf-fusion" component={MtfFusion} />
              <Route path="/bacteriorhodopsin-sim" component={BacteriorhodopsinSim} />
              <Route path="/light-cycles" component={LightCycles} />
              <Route path="/boson-sampling" component={BosonSampling} />
              <Route path="/eht-blackhole" component={EhtBlackHole} />
              <Route path="/lithium-mpd" component={LithiumMpd} />
              <Route path="/crispr-activator" component={CrisprActivator} />
              <Route path="/asteroid-miner" component={AsteroidMiner} />
              <Route path="/qpe-studio" component={QpeStudio} />
              <Route path="/cosmic-string" component={CosmicString} />
              <Route path="/trialpha-fusion" component={TriAlphaFusion} />
              <Route path="/minimal-cell" component={MinimalCell} />
              <Route path="/cyber-pac" component={CyberPac} />
              <Route path="/aqc-studio" component={AqcStudio} />
              <Route path="/xenon-detector" component={XenonDetector} />
              <Route path="/mif-fusion" component={MifFusion} />
              <Route path="/zfn-studio" component={ZfnStudio} />
              <Route path="/cyber-pong" component={CyberPong} />
              <Route path="/vqe-studio" component={VqeStudio} />
              <Route path="/axion-haloscope" component={AxionHaloscope} />
              <Route path="/stellarator-sim" component={StellaratorSim} />
              <Route path="/base-editor" component={BaseEditor} />
              <Route path="/space-invaders" component={SpaceInvaders} />
              <Route path="/qaoa-studio" component={QaoaStudio} />
              <Route path="/cnb-neutrino" component={CnbNeutrino} />
              <Route path="/vasimr-rocket" component={VasimrRocket} />
              <Route path="/talen-studio" component={TalenStudio} />
              <Route path="/cyber-frogger" component={CyberFrogger} />
              <Route path="/qst-studio" component={QstStudio} />
              <Route path="/muon-tomography" component={MuonTomography} />
              <Route path="/orion-drive" component={OrionDrive} />
              <Route path="/prime-editor-v2" component={PrimeEditorV2} />
              <Route path="/boulder-dash" component={BoulderDash} />
              <Route path="/randomized-benchmarking" component={RandomizedBenchmarking} />
              <Route path="/frb-studio" component={FrbStudio} />
              <Route path="/rdre-engine" component={RdreEngine} />
              <Route path="/retron-studio" component={RetronStudio} />
              <Route path="/flappy-drone" component={FlappyDrone} />
              <Route path="/qpt-studio" component={QptStudio} />
              <Route path="/exomoon-sim" component={ExomoonSim} />
              <Route path="/dfd-fusion-rocket" component={DfdFusionRocket} />
              <Route path="/epigenetic-editor" component={EpigeneticEditor} />
              <Route path="/lunar-defender" component={LunarDefender} />
              <Route path="/hamiltonian-sim" component={HamiltonianSim} />
              <Route path="/casimir-studio" component={CasimirStudio} />
              <Route path="/hdlt-thruster" component={HdltThruster} />
              <Route path="/ncaa-studio" component={NcaaStudio} />
              <Route path="/star-castle" component={StarCastle} />
              <Route path="/qsvt-studio" component={QsvtStudio} />
              <Route path="/pmns-oscillation" component={PmnsOscillation} />
              <Route path="/photonic-rocket" component={PhotonicRocket} />
              <Route path="/ribosome-o" component={RibosomeO} />
              <Route path="/robot-maze" component={RobotMaze} />
              <Route path="/ising-qpt" component={IsingQpt} />
              <Route path="/bao-cosmology" component={BaoCosmology} />
              <Route path="/nep-rocket" component={NepRocket} />
              <Route path="/txtl-studio" component={TxtlStudio} />
              <Route path="/tempest-vortex" component={TempestVortex} />
              <Route path="/quantum-oracle" component={QuantumOracle} />
              <Route path="/reionization-21cm" component={Reionization21cm} />
              <Route path="/solar-sail" component={SolarSail} />
              <Route path="/gene-drive" component={GeneDrive} />
              <Route path="/gravitar-sim" component={GravitarSim} />
              <Route path="/cv-qkd" component={CvQkd} />
              <Route path="/qcd-plasma" component={QcdPlasma} />
              <Route path="/antimatter-core" component={AntimatterCore} />
              <Route path="/sc2-studio" component={Sc2Studio} />
              <Route path="/gorf-fleet" component={GorfFleet} />
              <Route path="/quantum-eraser" component={QuantumEraser} />
              <Route path="/sterile-neutrino" component={SterileNeutrino} />
              <Route path="/frc-thruster" component={FrcThruster} />
              <Route path="/zring-studio" component={ZringStudio} />
              <Route path="/sinistar-arcade" component={SinistarArcade} />
              <Route path="/contextuality-sim" component={ContextualitySim} />
              <Route path="/optomechanics-sim" component={OptomechanicsSim} />
              <Route path="/m2p2-sail" component={M2p2Sail} />
              <Route path="/crispr-logic" component={CrisprLogic} />
              <Route path="/vanguard-sim" component={VanguardSim} />
              <Route path="/graph-walk" component={GraphWalk} />
              <Route path="/majorana-braiding" component={MajoranaBraiding} />
              <Route path="/fusion-mirror" component={FusionMirror} />
              <Route path="/epigenetic-clock" component={EpigeneticClock} />
              <Route path="/berzerk-arcade" component={BerzerkArcade} />
              <Route path="/cv-teleport-studio" component={CvTeleportStudio} />
              <Route path="/bcs-superconductor" component={BcsSuperconductor} />
              <Route path="/rotating-plasma" component={RotatingPlasma} />
              <Route path="/crispr-epigenome" component={CrisprEpigenome} />
              <Route path="/trench-run" component={TrenchRun} />
              <Route path="/helstrom-sim" component={HelstromSim} />
              <Route path="/quantum-hall" component={QuantumHall} />
              <Route path="/cusp-thruster" component={CuspThruster} />
              <Route path="/orthorep-studio" component={OrthorepStudio} />
              <Route path="/qix-arcade" component={QixArcade} />
              <Route path="/quantum-steering" component={QuantumSteering} />
              <Route path="/quantum-zeno" component={QuantumZeno} />
              <Route path="/startram-sim" component={StartramSim} />
              <Route path="/rnai-studio" component={RnaiStudio} />
              <Route path="/command-arcade" component={CommandArcade} />
              <Route path="/hardy-paradox" component={HardyParadox} />
              <Route path="/laughlin-fqhe" component={LaughlinFqhe} />
              <Route path="/nswr-engine" component={NswrEngine} />
              <Route path="/sy14-fusion" component={Sy14Fusion} />
              <Route path="/marble-arcade" component={MarbleArcade} />
              <Route path="/bures-fisher" component={BuresFisher} />
              <Route path="/zne-studio" component={ZneStudio} />
              <Route path="/gas-core-engine" component={GasCoreEngine} />
              <Route path="/click-chemistry" component={ClickChemistry} />
              <Route path="/death-star-core" component={DeathStarCore} />
              <Route path="/kcbs-pentagram" component={KcbsPentagram} />
              <Route path="/pec-studio" component={PecStudio} />
              <Route path="/fission-fragment" component={FissionFragment} />
              <Route path="/phage-tail" component={PhageTail} />
              <Route path="/light-tank-3d" component={LightTank3D} />
              <Route path="/otoc-scrambler" component={OtocScrambler} />
              <Route path="/cdr-studio" component={CdrStudio} />
              <Route path="/acmf-rocket" component={AcmfRocket} />
              <Route path="/scramble-studio" component={ScrambleStudio} />
              <Route path="/hoth-speeder" component={HothSpeeder} />
              <Route path="/w-state-studio" component={WStateStudio} />
              <Route path="/virtual-distillation" component={VirtualDistillation} />
              <Route path="/pulsed-plasmoid" component={PulsedPlasmoid} />
              <Route path="/riboswitch-studio" component={RiboswitchStudio} />
              <Route path="/endor-speeder" component={EndorSpeeder} />
              <Route path="/cv-mbqc-studio" component={CvMbqcStudio} />
              <Route path="/symmetry-verification" component={SymmetryVerification} />
              <Route path="/medusa-rocket" component={MedusaRocket} />
              <Route path="/crisproff-studio" component={CrisproffStudio} />
              <Route path="/tie-fighter-arcade" component={TieFighterArcade} />
              <Route path="/lattice-surgery" component={LatticeSurgery} />
              <Route path="/dual-state-qem" component={DualStateQem} />
              <Route path="/laser-antimatter" component={LaserAntimatter} />
              <Route path="/cas12a-cascade" component={Cas12aCascade} />
              <Route path="/surface-turret-assault" component={SurfaceTurretAssault} />
              <Route path="/magic-state-factory" component={MagicStateFactory} />
              <Route path="/subspace-expansion" component={SubspaceExpansion} />
              <Route path="/puff-fusion-rocket" component={PuffFusionRocket} />
              <Route path="/cas13d-virus" component={Cas13dVirus} />
              <Route path="/falcon-asteroids" component={FalconAsteroids} />
              <Route path="/color-code-studio" component={ColorCodeStudio} />
              <Route path="/virtual-subspace" component={VirtualSubspace} />
              <Route path="/icf-ramjet" component={IcfRamjet} />
              <Route path="/casmini-studio" component={CasminiStudio} />
              <Route path="/executor-assault" component={ExecutorAssault} />
              <Route path="/raussendorf-lattice" component={RaussendorfLattice} />
              <Route path="/fermionic-shadows" component={FermionicShadows} />
              <Route path="/skyhook-tether" component={SkyhookTether} />
              <Route path="/cas14-diagnostics" component={Cas14Diagnostics} />
              <Route path="/bwing-assault" component={BwingAssault} />
              <Route path="/floquet-majorana" component={FloquetMajorana} />
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
