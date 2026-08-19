import { ReactNode, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { 
  Home, Compass, Film, MessageCircle, Heart, PlusSquare, 
  UserRound, Settings, ImageIcon, Send, ShoppingBag, Music, Zap, Activity, BrainCircuit, Terminal,
  Orbit, Crosshair, Waves, Swords, Dna, Cable, Rocket, Network, Building2,
  Atom, Gauge, Sparkles, Target, ShieldAlert, Sun, Wind, Skull, ShieldCheck,
  Droplets, Brain, Radio, Car, Mic, Plane, Key, Flame, Globe2, Grid, Scissors, Bot, Search,
  GitFork, TrendingUp, Cpu, Camera, Eye, Gem
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { ThemeMorpher } from '@/components/ui/ThemeMorpher';
import { CursorGlow } from '@/components/ui/CursorGlow';
import { FloatingParticles } from '@/components/ui/FloatingParticles';
import { ScrollProgress } from '@/components/ui/ScrollProgress';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { NoiseOverlay } from '@/components/ui/NoiseOverlay';
import { GlobalAudioPlayer } from '@/components/player/GlobalAudioPlayer';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [location, setLocation] = useLocation();
  const currentUser = useAppStore((state) => state.currentUser);
  const addPost = useAppStore((state) => state.addPost);
  const notifications = useAppStore((state) => state.notifications);
  const unreadNotifs = notifications.filter(n => !n.read).length;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handleCreatePost = () => {
    if (!postContent.trim()) return;
    const media = imageUrl.trim() ? [imageUrl.trim()] : undefined;
    addPost(postContent, media);
    setPostContent('');
    setImageUrl('');
    setIsComposing(false);
  };

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Compass, label: 'Explore', path: '/explore' },
    { icon: Film, label: 'Reels', path: '/videos' },
    { icon: MessageCircle, label: 'Messages', path: '/messages' },
    { icon: Heart, label: 'Notifications', path: '/notifications', badge: unreadNotifs > 0 ? unreadNotifs : null },
    { icon: Music, label: 'Cyber DAW', path: '/cyber-daw' },
    { icon: Zap, label: 'Neon Overdrive', path: '/neon-overdrive' },
    { icon: Activity, label: 'Creator Terminal', path: '/creator-terminal' },
    { icon: BrainCircuit, label: 'Prompt Arena', path: '/prompt-arena' },
    { icon: Terminal, label: 'ASCII Studio', path: '/ascii-studio' },
    { icon: Orbit, label: 'Orbit Sandbox', path: '/orbit-sandbox' },
    { icon: Crosshair, label: 'Tactical Scrims', path: '/tactical-sandbox' },
    { icon: Waves, label: 'Signal Lab', path: '/signal-lab' },
    { icon: Swords, label: 'Cyber Chess', path: '/cyber-chess' },
    { icon: Dna, label: 'Nano Lab', path: '/nano-lab' },
    { icon: Cable, label: 'Eurorack Synth', path: '/eurorack-synth' },
    { icon: Rocket, label: 'Valkyrie Protocol', path: '/valkyrie-protocol' },
    { icon: Network, label: 'Node Topology', path: '/node-topology' },
    { icon: Building2, label: 'Esports Tycoon', path: '/esports-tycoon' },
    { icon: Atom, label: 'Quantum Circuit', path: '/quantum-circuit' },
    { icon: Gauge, label: 'Cyber Drift 3D', path: '/cyber-drift-3d' },
    { icon: Sparkles, label: 'Fractal Studio', path: '/fractal-studio' },
    { icon: Target, label: 'Hawk-Eye 3D', path: '/hawkeye-sim' },
    { icon: ShieldAlert, label: 'Threat SOC', path: '/threat-soc' },
    { icon: Sun, label: 'Black Hole Sim', path: '/blackhole-sim' },
    { icon: Wind, label: 'Wind Tunnel', path: '/wind-tunnel' },
    { icon: Music, label: 'Neural Beatmaker', path: '/neural-beatmaker' },
    { icon: Skull, label: 'Cyber Rogue', path: '/cyber-rogue' },
    { icon: ShieldCheck, label: 'Audit Studio', path: '/audit-studio' },
    { icon: Droplets, label: 'Fluid Sim', path: '/fluid-sim' },
    { icon: Zap, label: 'Cyber Pinball', path: '/cyber-pinball' },
    { icon: Music, label: 'Poly Synth', path: '/poly-synth' },
    { icon: Target, label: 'Cricket Trainer', path: '/cricket-trainer' },
    { icon: Brain, label: 'Neural Trainer', path: '/neural-trainer' },
    { icon: Radio, label: 'LIGO Grav Wave', path: '/grav-wave' },
    { icon: Compass, label: 'Mars Rover', path: '/rover-sim' },
    { icon: Dna, label: 'Gene Circuit', path: '/gene-circuit' },
    { icon: Car, label: 'City Courier', path: '/city-courier' },
    { icon: Mic, label: 'Vocoder Studio', path: '/vocoder-studio' },
    { icon: Atom, label: 'LHC Collider', path: '/collider-sim' },
    { icon: Rocket, label: 'Orbital Docking', path: '/docking-sim' },
    { icon: Terminal, label: 'Cyber Terminal', path: '/cyber-terminal' },
    { icon: Plane, label: 'Supersonic Jet', path: '/supersonic-sim' },
    { icon: Sparkles, label: 'Granular Synth', path: '/granular-synth' },
    { icon: Key, label: 'QKD BB84', path: '/qkd-studio' },
    { icon: Flame, label: 'Tokamak Fusion', path: '/tokamak-sim' },
    { icon: Brain, label: 'EEG Studio', path: '/eeg-studio' },
    { icon: Car, label: 'Cyber Rally', path: '/cyber-rally' },
    { icon: Music, label: 'Chiptune Tracker', path: '/chiptune-tracker' },
    { icon: Rocket, label: 'Space Elevator', path: '/space-elevator' },
    { icon: Car, label: 'Traffic AI', path: '/traffic-ai' },
    { icon: Volume2, label: 'Speech Synth', path: '/speech-synth' },
    { icon: Crosshair, label: 'Tank Arena', path: '/tank-arena' },
    { icon: Sparkles, label: 'Quantum Teleport', path: '/teleportation-studio' },
    { icon: Globe2, label: 'Exoplanet Transit', path: '/exoplanet-sim' },
    { icon: Zap, label: 'Hyperloop Maglev', path: '/hyperloop-sim' },
    { icon: Grid, label: 'Cellular Matrix', path: '/cellular-matrix' },
    { icon: Zap, label: 'Neon Breakout', path: '/neon-breakout' },
    { icon: Scissors, label: 'CRISPR Studio', path: '/crispr-studio' },
    { icon: Orbit, label: 'Wormhole 3D', path: '/wormhole-sim' },
    { icon: Plane, label: 'Drone PID', path: '/drone-sim' },
    { icon: Dna, label: 'Neural Synapse', path: '/synapse-sim' },
    { icon: Sparkles, label: 'Hoverboard 3D', path: '/hoverboard-sim' },
    { icon: Atom, label: 'Quantum Annealer', path: '/annealer-sim' },
    { icon: Sun, label: 'Supernova 3D', path: '/supernova-sim' },
    { icon: Flame, label: 'Scramjet Mach 7', path: '/scramjet-sim' },
    { icon: Activity, label: 'Hodgkin-Huxley', path: '/hodgkin-huxley' },
    { icon: Compass, label: 'Cyber Slalom', path: '/ski-racer' },
    { icon: Lock, label: "Shor's Factoring", path: '/shor-studio' },
    { icon: Sun, label: 'Dyson Swarm', path: '/dyson-swarm' },
    { icon: Bot, label: 'Cyber Mech', path: '/mech-sim' },
    { icon: Dna, label: 'Phage T4', path: '/phage-sim' },
    { icon: Zap, label: 'Pinball 3D', path: '/pinball-3d' },
    { icon: Search, label: 'Grover Search', path: '/grover-studio' },
    { icon: Orbit, label: 'Kerr Black Hole', path: '/kerr-blackhole' },
    { icon: Zap, label: 'Ion Thruster', path: '/ion-thruster' },
    { icon: Brain, label: 'Microtubules', path: '/microtubule-sim' },
    { icon: Zap, label: 'Neon Snake', path: '/neon-snake' },
    { icon: ShieldCheck, label: 'Error Correct', path: '/error-correction' },
    { icon: Rocket, label: 'Alcubierre Warp', path: '/alcubierre-sim' },
    { icon: Flame, label: 'MPD Thruster', path: '/mpd-thruster' },
    { icon: Dna, label: 'Ribosome 70S', path: '/ribosome-sim' },
    { icon: Rocket, label: 'Neon Asteroids', path: '/neon-asteroids' },
    { icon: TrendingUp, label: 'Quantum Walk', path: '/quantum-walk' },
    { icon: Atom, label: 'Cloud Chamber', path: '/cloud-chamber' },
    { icon: Radio, label: 'Magnetar QED', path: '/magnetar-sim' },
    { icon: Scissors, label: 'Prime Editor', path: '/prime-editor' },
    { icon: Zap, label: 'Cyber Arkanoid', path: '/cyber-arkanoid' },
    { icon: Waves, label: 'Lindblad GKSL', path: '/lindblad-sim' },
    { icon: Radio, label: 'Synchrotron Jet', path: '/synchrotron-sim' },
    { icon: Atom, label: 'NTP NERVA Rocket', path: '/ntp-rocket' },
    { icon: Zap, label: 'ATP Synthase', path: '/atp-synthase' },
    { icon: Rocket, label: 'Lunar Lander', path: '/lunar-lander' },
    { icon: Radio, label: 'CV Teleport', path: '/cv-teleport' },
    { icon: Sun, label: 'CMB Anisotropy', path: '/cmb-sim' },
    { icon: Zap, label: 'Z-Pinch Fusion', path: '/zpinch-sim' },
    { icon: Dna, label: 'Kinesin Motor', path: '/kinesin-sim' },
    { icon: Crosshair, label: 'Neon Tanks', path: '/neon-tanks' },
    { icon: Cpu, label: 'Quantum Supremacy', path: '/xeb-studio' },
    { icon: Globe2, label: 'Microlensing', path: '/microlensing-sim' },
    { icon: Rocket, label: 'Antimatter Rocket', path: '/antimatter-rocket' },
    { icon: Activity, label: 'Patch Clamp', path: '/patch-clamp' },
    { icon: ShieldAlert, label: 'Missile Defense', path: '/missile-defense' },
    { icon: Atom, label: 'GHZ Multipartite', path: '/ghz-teleport' },
    { icon: Waves, label: 'Cosmic Inflation', path: '/inflation-sim' },
    { icon: Flame, label: 'MTF Fusion', path: '/mtf-fusion' },
    { icon: Sun, label: 'Bacteriorhodopsin', path: '/bacteriorhodopsin-sim' },
    { icon: Zap, label: 'Light Cycles 3D', path: '/light-cycles' },
    { icon: Sparkles, label: 'Boson Sampling', path: '/boson-sampling' },
    { icon: Camera, label: 'EHT Black Hole', path: '/eht-blackhole' },
    { icon: Flame, label: 'Lithium MPD', path: '/lithium-mpd' },
    { icon: Dna, label: 'CRISPR Activator', path: '/crispr-activator' },
    { icon: Target, label: 'Asteroid Miner', path: '/asteroid-miner' },
    { icon: Atom, label: 'QPE Algorithm', path: '/qpe-studio' },
    { icon: Waves, label: 'Cosmic Strings', path: '/cosmic-string' },
    { icon: Flame, label: 'Tri-Alpha Fusion', path: '/trialpha-fusion' },
    { icon: Dna, label: 'Minimal Cell', path: '/minimal-cell' },
    { icon: Zap, label: 'Cyber Pac 3D', path: '/cyber-pac' },
    { icon: Atom, label: 'Adiabatic AQC', path: '/aqc-studio' },
    { icon: Atom, label: 'Dark Matter TPC', path: '/xenon-detector' },
    { icon: Flame, label: 'MIF MagLIF Fusion', path: '/mif-fusion' },
    { icon: Scissors, label: 'Zinc Finger ZFN', path: '/zfn-studio' },
    { icon: Zap, label: 'Cyber Pong 3D', path: '/cyber-pong' },
    { icon: Atom, label: 'VQE Chemistry', path: '/vqe-studio' },
    { icon: Radio, label: 'Axion Haloscope', path: '/axion-haloscope' },
    { icon: Flame, label: 'Stellarator W7-X', path: '/stellarator-sim' },
    { icon: Scissors, label: 'Base Editor (CBE/ABE)', path: '/base-editor' },
    { icon: Target, label: 'Space Invaders 3D', path: '/space-invaders' },
    { icon: Atom, label: 'QAOA Max-Cut', path: '/qaoa-studio' },
    { icon: Atom, label: 'CNB Neutrino', path: '/cnb-neutrino' },
    { icon: Rocket, label: 'VASIMR Rocket', path: '/vasimr-rocket' },
    { icon: Scissors, label: 'TALEN Editing', path: '/talen-studio' },
    { icon: Compass, label: 'Cyber Frogger 3D', path: '/cyber-frogger' },
    { icon: Atom, label: 'QST Tomography', path: '/qst-studio' },
    { icon: Eye, label: 'Muon Tomography', path: '/muon-tomography' },
    { icon: Rocket, label: 'Project Orion Drive', path: '/orion-drive' },
    { icon: Scissors, label: 'PEmax Prime Editor', path: '/prime-editor-v2' },
    { icon: Gem, label: 'Boulder Dash 3D', path: '/boulder-dash' },
    { icon: Atom, label: 'Clifford RB QCVV', path: '/randomized-benchmarking' },
    { icon: Radio, label: 'Fast Radio Burst', path: '/frb-studio' },
    { icon: Flame, label: 'RDRE Rocket Wave', path: '/rdre-engine' },
    { icon: Dna, label: 'Retron msDNA Editor', path: '/retron-studio' },
    { icon: Plane, label: 'Flappy Drone 3D', path: '/flappy-drone' },
    { icon: Atom, label: 'QPT Chi Matrix', path: '/qpt-studio' },
    { icon: Globe2, label: 'Exomoon Microlens', path: '/exomoon-sim' },
    { icon: Rocket, label: 'DFD Fusion Engine', path: '/dfd-fusion-rocket' },
    { icon: Scissors, label: 'Epigenetic Editor', path: '/epigenetic-editor' },
    { icon: Crosshair, label: 'Lunar Defender 3D', path: '/lunar-defender' },
    { icon: Atom, label: 'Trotter Hamiltonian', path: '/hamiltonian-sim' },
    { icon: Waves, label: 'Casimir Dynamic Cavity', path: '/casimir-studio' },
    { icon: Rocket, label: 'HDLT Helicon Thruster', path: '/hdlt-thruster' },
    { icon: Dna, label: 'ncAA Genetic Code', path: '/ncaa-studio' },
    { icon: Target, label: 'Star Castle 3D', path: '/star-castle' },
    { icon: Atom, label: 'QSVT Grand Unified', path: '/qsvt-studio' },
    { icon: Atom, label: 'PMNS Neutrino MSW', path: '/pmns-oscillation' },
    { icon: Rocket, label: 'Photonic Laser Rocket', path: '/photonic-rocket' },
    { icon: Dna, label: 'Ribo-Q Quadruplet', path: '/ribosome-o' },
    { icon: Target, label: 'Robot Maze 3D', path: '/robot-maze' },
    { icon: Atom, label: 'Ising QPT Criticality', path: '/ising-qpt' },
    { icon: Globe2, label: 'BAO Sound Horizon', path: '/bao-cosmology' },
    { icon: Rocket, label: 'NEP Megawatt Hall', path: '/nep-rocket' },
    { icon: Beaker, label: 'TX-TL Cell-Free Bio', path: '/txtl-studio' },
    { icon: Target, label: 'Tempest Vortex 3D', path: '/tempest-vortex' },
    { icon: Atom, label: 'Quantum Phase Oracle', path: '/quantum-oracle' },
    { icon: Radio, label: '21cm Cosmic Dawn', path: '/reionization-21cm' },
    { icon: Sun, label: 'Solar Photonic Sail', path: '/solar-sail' },
    { icon: Dna, label: 'CRISPR Gene Drive', path: '/gene-drive' },
    { icon: Target, label: 'Gravitar Planet 3D', path: '/gravitar-sim' },
    { icon: Waves, label: 'CV-QKD Coherent Fiber', path: '/cv-qkd' },
    { icon: Atom, label: 'QCD Quark Plasma', path: '/qcd-plasma' },
    { icon: Rocket, label: 'Antimatter Beam-Core', path: '/antimatter-core' },
    { icon: Dna, label: 'Sc2.0 Synthetic Yeast', path: '/sc2-studio' },
    { icon: Target, label: 'Gorf Fleet 3D', path: '/gorf-fleet' },
    { icon: EyeOff, label: 'Quantum Eraser Wave', path: '/quantum-eraser' },
    { icon: Atom, label: 'Sterile Neutrino SBL', path: '/sterile-neutrino' },
    { icon: Rocket, label: 'FRC Plasmoid Collider', path: '/frc-thruster' },
    { icon: Dna, label: 'FtsZ Z-Ring Division', path: '/zring-studio' },
    { icon: Target, label: 'Sinistar 3D Dreadnought', path: '/sinistar-arcade' },
    { icon: Grid3X3, label: 'Quantum Contextuality', path: '/contextuality-sim' },
    { icon: Atom, label: 'Quantum Optomechanics', path: '/optomechanics-sim' },
    { icon: Globe2, label: 'M2P2 Plasma Sail', path: '/m2p2-sail' },
    { icon: Binary, label: 'CRISPR Logic Gates', path: '/crispr-logic' },
    { icon: Target, label: 'Vanguard 3D Defender', path: '/vanguard-sim' },
    { icon: Network, label: 'Quantum Graph Walk', path: '/graph-walk' },
    { icon: GitMerge, label: 'Majorana Anyon Braid', path: '/majorana-braiding' },
    { icon: Rocket, label: 'Magnetic Mirror Fusion', path: '/fusion-mirror' },
    { icon: Clock, label: 'Epigenetic Aging Clock', path: '/epigenetic-clock' },
    { icon: Bot, label: 'Berzerk 3D Maze', path: '/berzerk-arcade' },
    { icon: Waves, label: 'CV Teleportation BK98', path: '/cv-teleport-studio' },
    { icon: Snowflake, label: 'BCS Superconductor', path: '/bcs-superconductor' },
    { icon: RotateCw, label: 'Rotating Plasma MCX', path: '/rotating-plasma' },
    { icon: Dna, label: 'CRISPR Epigenome Edit', path: '/crispr-epigenome' },
    { icon: Target, label: 'Trench Run 3D Vector', path: '/trench-run' },
    { icon: Scale, label: 'Helstrom Bound POVM', path: '/helstrom-sim' },
    { icon: Atom, label: 'Quantum Hall 2DEG', path: '/quantum-hall' },
    { icon: Rocket, label: 'Magnetic Cusp HEMP', path: '/cusp-thruster' },
    { icon: FlaskConical, label: 'OrthoRep In Vivo Evol', path: '/orthorep-studio' },
    { icon: Box, label: 'Qix 3D Geometry', path: '/qix-arcade' },
    { icon: Compass, label: 'EPR Quantum Steering', path: '/quantum-steering' },
    { icon: Eye, label: 'Quantum Zeno Effect', path: '/quantum-zeno' },
    { icon: Navigation, label: 'StarTram Maglev Launch', path: '/startram-sim' },
    { icon: Scissors, label: 'RNAi Dicer Ago2 RISC', path: '/rnai-studio' },
    { icon: ShieldAlert, label: 'Missile Command 3D', path: '/command-arcade' },
    { icon: Atom, label: 'Hardy Paradox Proof', path: '/hardy-paradox' },
    { icon: Snowflake, label: 'Laughlin Anyon FQHE', path: '/laughlin-fqhe' },
    { icon: Radiation, label: 'NSWR Fission Rocket', path: '/nswr-engine' },
    { icon: GitMerge, label: 'SY14 Chromosome Fusion', path: '/sy14-fusion' },
    { icon: Circle, label: 'Marble Madness 3D', path: '/marble-arcade' },
    { icon: Compass, label: 'Bures Metric QFI', path: '/bures-fisher' },
    { icon: TrendingDown, label: 'ZNE Error Mitigation', path: '/zne-studio' },
    { icon: Wind, label: 'Gas-Core Nuclear Rocket', path: '/gas-core-engine' },
    { icon: Link, label: 'Bio-Orthogonal Click', path: '/click-chemistry' },
    { icon: Target, label: 'Death Star II Core Run', path: '/death-star-core' },
    { icon: Pentagram, label: 'KCBS Pentagram Qutrit', path: '/kcbs-pentagram' },
    { icon: Sigma, label: 'PEC Quasi-Inverses', path: '/pec-studio' },
    { icon: Rocket, label: 'Fission Fragment FFRE', path: '/fission-fragment' },
    { icon: Dna, label: 'Synthetic Phage Tropism', path: '/phage-tail' },
    { icon: Target, label: 'Tron Light Tank 3D', path: '/light-tank-3d' },
    { icon: Flame, label: 'OTOC Quantum Scrambler', path: '/otoc-scrambler' },
    { icon: Brain, label: 'CDR Quantum ML Mitigation', path: '/cdr-studio' },
    { icon: Rocket, label: 'ACMF Antimatter Fusion', path: '/acmf-rocket' },
    { icon: Shuffle, label: 'Sc2.0 SCRaMbLE Studio', path: '/scramble-studio' },
    { icon: Cable, label: 'Hoth Speeder Harpoon 3D', path: '/hoth-speeder' },
    { icon: GitFork, label: 'Tripartite W-State', path: '/w-state-studio' },
    { icon: Filter, label: 'Virtual Distillation QEM', path: '/virtual-distillation' },
    { icon: Magnet, label: 'Pulsed Plasmoid Fusion', path: '/pulsed-plasmoid' },
    { icon: ToggleLeft, label: 'Synthetic Riboswitch', path: '/riboswitch-studio' },
    { icon: Trees, label: 'Endor Speeder Slalom 3D', path: '/endor-speeder' },
    { icon: Network, label: 'Continuous-Variable MBQC', path: '/cv-mbqc-studio' },
    { icon: CheckCircle2, label: 'Symmetry Verification', path: '/symmetry-verification' },
    { icon: Umbrella, label: 'Project Medusa Rocket', path: '/medusa-rocket' },
    { icon: Lock, label: 'CRISPRoff Epigenome', path: '/crisproff-studio' },
    { icon: Target, label: 'Star Wars 1983 TIE Arcade', path: '/tie-fighter-arcade' },
    { icon: Grid, label: 'Surface Code Lattice Surgery', path: '/lattice-surgery' },
    { icon: GitCompare, label: 'Dual-State QEM', path: '/dual-state-qem' },
    { icon: Rocket, label: 'VISTA Laser-Antimatter', path: '/laser-antimatter' },
    { icon: Layers, label: 'Cas12a Multi-Gene Cascade', path: '/cas12a-cascade' },
    { icon: TowerControl, label: 'Death Star Turret Assault', path: '/surface-turret-assault' },
    { icon: Factory, label: 'Magic State Factory', path: '/magic-state-factory' },
    { icon: Calculator, label: 'Quantum Subspace Expansion', path: '/subspace-expansion' },
    { icon: Magnet, label: 'PuFF Z-Pinch Rocket', path: '/puff-fusion-rocket' },
    { icon: Bug, label: 'CRISPR-Cas13d PAC-MAN', path: '/cas13d-virus' },
    { icon: Disc, label: 'Falcon Asteroid Slalom 3D', path: '/falcon-asteroids' },
    { icon: Hexagon, label: '2D Color Code Quantum', path: '/color-code-studio' },
    { icon: Filter, label: 'Virtual Subspace Inversion', path: '/virtual-subspace' },
    { icon: Compass, label: 'Bussard ICF Ramjet', path: '/icf-ramjet' },
    { icon: Package, label: 'CRISPR-CasMINI Therapy', path: '/casmini-studio' },
    { icon: Target, label: 'Executor Bridge Assault', path: '/executor-assault' },
    { icon: Box, label: '3D Raussendorf Lattice', path: '/raussendorf-lattice' },
    { icon: Eye, label: 'Fermionic Shadows QEM', path: '/fermionic-shadows' },
    { icon: Anchor, label: 'Orbital Skyhook Tether', path: '/skyhook-tether' },
    { icon: Search, label: 'Cas14 DETECTR-v2 Diagnostics', path: '/cas14-diagnostics' },
    { icon: Cross, label: 'B-Wing Star Destroyer Run', path: '/bwing-assault' },
    { icon: Repeat, label: 'Floquet Majorana Memory', path: '/floquet-majorana' },
    { icon: GitCompare, label: 'Dual-Frame QSE Solver', path: '/dual-frame-qse' },
    { icon: Plane, label: 'Air-Breathing Laser-MHD', path: '/airbreathing-mhd' },
    { icon: Edit3, label: 'CRISPR-Cas12m Base Editor', path: '/cas12m-base-editor' },
    { icon: Skull, label: 'Vader TIE Advanced Duel', path: '/vader-trench-duel' },
    { icon: Cube, label: '3D X-Cube Fracton Memory', path: '/fracton-studio' },
    { icon: FunctionSquare, label: 'Volterra Memory QEM', path: '/volterra-qem' },
    { icon: Magnet, label: 'ACMF Antimatter Ram-Explorer', path: '/antimatter-ram-explorer' },
    { icon: Cpu, label: 'CRISPR-Cas12c Dual Logic', path: '/cas12c-logic' },
    { icon: Gauge, label: 'TIE Interceptor Slalom', path: '/tie-interceptor-slalom' },
    { icon: Box, label: 'Haah\'s Cubic Code Memory', path: '/haah-code' },
    { icon: ShoppingBag, label: 'Points Vault', path: '/points-shop' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="app-shell relative flex min-h-screen overflow-hidden bg-background font-sans text-foreground">
      <ScrollProgress />
      <CommandPalette />
      <div className="app-atmosphere" aria-hidden="true">
        <span className="app-atmosphere__field app-atmosphere__field--primary" />
        <span className="app-atmosphere__field app-atmosphere__field--accent" />
        <FloatingParticles />
      </div>
      <CursorGlow />
      <NoiseOverlay />
      
      {/* ── DESKTOP INSTAGRAM SIDEBAR (Left Column) ────────────────────── */}
      <aside className={cn(
        "app-shell__rail hidden h-screen shrink-0 flex-col border-r border-border/40 py-6 backdrop-blur-xl md:sticky md:top-0 md:flex relative",
        sidebarCollapsed ? "w-[72px] px-2" : "w-64 lg:w-72 px-4",
        "transition-all duration-300 ease-out"
      )}>
        
        {/* Brand Logo & Live Theme Morpher */}
        <div className={cn("flex items-center mb-8", sidebarCollapsed ? "justify-center px-0" : "justify-between px-1")}>
          <Link href="/" className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary via-purple-500 to-accent grid place-items-center text-white text-xl font-bold font-display shadow-md glow-neon-primary group-hover:scale-105 transition-transform shrink-0">
              Y
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <span className="font-display font-extrabold text-xl tracking-tight leading-none text-foreground">Yor Talks</span>
                <span className="text-[0.62rem] font-mono text-primary tracking-wider uppercase mt-0.5 font-bold">Bharat Edition 🇮🇳</span>
              </div>
            )}
          </Link>
          {!sidebarCollapsed && <ThemeMorpher />}
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              title="Collapse sidebar"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="absolute top-4 -right-3 p-1 rounded-full bg-background border border-border/40 shadow-sm hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors z-50"
              title="Expand sidebar"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="rotate-180">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Navigation List */}
        <nav className="flex-1 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path ? (item.path === '/' ? location === '/' : location.startsWith(item.path)) : false;

            return (
              <button
                key={item.label}
                onClick={() => {
                  if (item.action) item.action();
                  else if (item.path) setLocation(item.path);
                }}
                className={cn(
                  "flex items-center w-full rounded-2xl text-sm font-semibold transition-all duration-200 group text-muted-foreground hover:text-foreground hover:bg-muted/50 hover-lift",
                  sidebarCollapsed ? "justify-center px-2 py-3 gap-0" : "gap-4 px-3.5 py-3",
                  isActive && "text-foreground bg-primary/10 font-bold border border-primary/20 border-l-2 border-l-primary"
                )}
              >
                {item.label === 'Create' ? (
                  <MagneticButton>
                    <div className={cn("flex items-center w-full", sidebarCollapsed ? "justify-center gap-0" : "gap-4")}>
                      <div className="relative">
                        <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive && "text-primary fill-primary/20 drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]")} />
                        {item.badge && (
                          <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white font-mono text-[0.62rem] font-bold px-1.5 py-0.2 rounded-full ring-2 ring-background">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </div>
                  </MagneticButton>
                ) : (
                  <>
                    <div className="relative">
                      <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive && "text-primary fill-primary/20 drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]")} />
                      {item.badge && (
                        <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white font-mono text-[0.62rem] font-bold px-1.5 py-0.2 rounded-full ring-2 ring-background">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Mini Profile & Account Switcher */}
        {currentUser && (
          <div className="space-y-2">
            <div className={cn("flex items-center rounded-2xl glass-heavy hover-lift border border-border/40 p-2.5", sidebarCollapsed ? "justify-center p-2" : "gap-2.5")}>
              <Link href={`/profile/${currentUser.id}`} className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group">
                <Avatar className="w-9 h-9 border border-border/50 shrink-0 group-hover:ring-2 ring-primary/40 transition-all">
                  <AvatarImage src={currentUser.avatarUrl} />
                  <AvatarFallback className="font-display font-bold">{currentUser.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                {!sidebarCollapsed && (
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs truncate leading-tight group-hover:text-primary transition-colors">{currentUser.displayName}</h4>
                    <p className="text-[0.68rem] text-muted-foreground font-mono truncate">@{currentUser.username}</p>
                  </div>
                )}
              </Link>
              {!sidebarCollapsed && (
                <AccountSwitcherDialog />
              )}
            </div>
          </div>
        )}
      </aside>

      {/* ── MAIN CONTENT AREA ────────────────────────────────────────────── */}
      <div className="app-shell__content min-h-screen min-w-0 flex-1">
        <main className="w-full h-full">
          {children}
        </main>
      </div>

      {/* ── MOBILE BOTTOM NAVIGATION BAR ─────────────────────────────────── */}
      <nav className="app-shell__mobile-nav fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border/40 px-3 py-2 md:hidden">
        <button onClick={() => setLocation('/')} className={cn("p-2 text-muted-foreground relative", location === '/' && "text-primary")}>
          <Home className="w-6 h-6" />
          {location === '/' && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
        </button>
        <button onClick={() => setLocation('/explore')} className={cn("p-2 text-muted-foreground relative", location === '/explore' && "text-primary")}>
          <Compass className="w-6 h-6" />
          {location === '/explore' && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
        </button>
        <MagneticButton intensity={0.4}>
          <button onClick={() => setIsComposing(true)} aria-label="Create post" className="p-2.5 rounded-full bg-primary text-primary-foreground glow-neon-primary -mt-5 shadow-2xl relative">
            <PlusSquare className="w-6 h-6" />
          </button>
        </MagneticButton>
        <button onClick={() => setLocation('/notifications')} className={cn("p-2 text-muted-foreground relative", location.startsWith('/notifications') && "text-primary")}>
          <Heart className="w-6 h-6" />
          {unreadNotifs > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white font-mono text-[0.55rem] font-bold min-w-[16px] h-4 px-1 rounded-full ring-2 ring-background flex items-center justify-center">
              {unreadNotifs > 99 ? '99+' : unreadNotifs}
            </span>
          )}
        </button>
        <button onClick={() => currentUser && setLocation(`/profile/${currentUser.id}`)} className={cn("p-2 text-muted-foreground relative", location.startsWith('/profile') && "text-primary")}>
          <UserRound className="w-6 h-6" />
          {location.startsWith('/profile') && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
        </button>
      </nav>

      {/* ── INSTAGRAM CREATE POST MODAL ──────────────────────────────────── */}
      <Dialog open={isComposing} onOpenChange={setIsComposing}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl font-sans">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-xl text-center">Create new post</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {currentUser && (
              <div className="flex items-center gap-3">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={currentUser.avatarUrl} />
                  <AvatarFallback className="font-display font-bold">{currentUser.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="font-bold text-sm">{currentUser.displayName}</span>
              </div>
            )}

            <textarea
              autoFocus
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="Write a caption..."
              className="w-full min-h-[120px] bg-transparent resize-none outline-none text-sm placeholder:text-muted-foreground font-serif leading-relaxed"
            />

            {/* Optional Image URL Input */}
            <div className="space-y-2 pt-2 border-t border-border/30">
              <label className="text-xs font-mono font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-primary" /> Image URL (Optional)
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full h-10 rounded-xl surface-1 border border-border/50 px-3 text-xs outline-none focus:border-primary/50"
              />
              {imageUrl.trim() && (
                <div className="h-36 rounded-xl overflow-hidden bg-muted mt-2">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleCreatePost}
              disabled={!postContent.trim()}
              className={cn(
                "w-full rounded-xl font-bold text-xs h-11 transition-all",
                postContent.trim() ? "glow-neon-primary bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              <Send className="w-3.5 h-3.5 mr-1.5" /> Share Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GlobalAudioPlayer />
    </div>
  );
}

function AccountSwitcherDialog() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const currentUser = useAppStore((state) => state.currentUser);
  const users = useAppStore((state) => state.users);
  const switchAccount = useAppStore((state) => state.switchAccount);

  const userList = Object.values(users);
  const filteredUsers = userList.filter((u) => 
    u.displayName.toLowerCase().includes(search.toLowerCase()) || 
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.bio && u.bio.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-primary transition-colors cursor-pointer"
        title="Switch Account"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </button>

      <DialogContent className="max-w-md rounded-2xl glass-heavy border border-border/50 max-h-[85vh] flex flex-col p-5">
        <DialogHeader className="pb-3 border-b border-border/30">
          <DialogTitle className="font-display font-bold text-lg flex items-center justify-between">
            <span>Switch Account</span>
            <span className="text-xs font-mono font-normal text-muted-foreground px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {userList.length} Active Personas
            </span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-sans">
            Instantly switch accounts to create content, test multi-agent interactions, or browse personalized feeds.
          </p>
        </DialogHeader>

        <div className="py-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search accounts by name, username, or role..."
            className="w-full h-10 rounded-xl surface-1 border border-border/50 px-3 text-xs outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground font-sans"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[380px] custom-scrollbar">
          {filteredUsers.map((user) => {
            const isCurrent = currentUser?.id === user.id;
            return (
              <button
                key={user.id}
                onClick={() => {
                  switchAccount(user.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left border cursor-pointer group",
                  isCurrent 
                    ? "bg-primary/15 border-primary/40 ring-1 ring-primary/30" 
                    : "hover:bg-muted/60 border-transparent hover:border-border/40"
                )}
              >
                <div className="relative shrink-0">
                  <Avatar className="w-10 h-10 border border-border/50">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback className="font-display font-bold text-xs">{user.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {isCurrent && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] ring-2 ring-background">
                      ✓
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-xs truncate leading-tight group-hover:text-primary transition-colors">{user.displayName}</h4>
                    {user.verified && (
                      <span className="text-[10px] text-sky-400 font-bold" title="Verified">✓</span>
                    )}
                  </div>
                  <p className="text-[0.68rem] text-muted-foreground font-mono truncate">@{user.username}</p>
                  {user.bio && (
                    <p className="text-[0.68rem] text-muted-foreground/80 line-clamp-1 mt-0.5 font-sans">{user.bio}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-[0.65rem] font-mono text-muted-foreground block font-bold">
                    {(user.followers || 0).toLocaleString()}
                  </span>
                  <span className="text-[0.6rem] text-muted-foreground/60 font-sans">followers</span>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
