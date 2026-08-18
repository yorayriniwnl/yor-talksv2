import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { 
  Globe, Radio, Compass, Satellite, Play, Pause, RotateCcw, 
  Layers, Sliders, Activity, ShieldCheck, Zap, Info, Orbit, Navigation
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface SatelliteData {
  id: string;
  name: string;
  type: 'LEO' | 'GEO' | 'MEO' | 'DeepSpace';
  altitudeKm: number;
  velocityKmS: number;
  inclinationDeg: number;
  color: string;
  orbitRadius: number;
  speed: number;
  angle: number;
  groundStation: string;
  signalStrength: number;
}

const INITIAL_SATELLITES: SatelliteData[] = [
  { id: 'sat-1', name: 'ISRO Chandrayaan Relay-4', type: 'MEO', altitudeKm: 8500, velocityKmS: 6.2, inclinationDeg: 28.5, color: '#06b6d4', orbitRadius: 3.2, speed: 0.008, angle: 0.4, groundStation: 'ISTRAC Bengaluru', signalStrength: 98 },
  { id: 'sat-2', name: 'Anya Starlink-Bharat 12', type: 'LEO', altitudeKm: 550, velocityKmS: 7.8, inclinationDeg: 53.0, color: '#ec4899', orbitRadius: 2.3, speed: 0.02, angle: 1.8, groundStation: 'Mumbai Gateway', signalStrength: 94 },
  { id: 'sat-3', name: 'INSAT-4G Cyber Weather', type: 'GEO', altitudeKm: 35786, velocityKmS: 3.07, inclinationDeg: 0.0, color: '#f59e0b', orbitRadius: 4.8, speed: 0.003, angle: 3.2, groundStation: 'Hassan Master Control', signalStrength: 89 },
  { id: 'sat-4', name: 'Quantum Key QKD-1', type: 'LEO', altitudeKm: 600, velocityKmS: 7.6, inclinationDeg: 97.4, color: '#10b981', orbitRadius: 2.4, speed: 0.018, angle: 4.5, groundStation: 'Hyderabad Q-Hub', signalStrength: 99 },
  { id: 'sat-5', name: 'Aditya Solar Sentry-2', type: 'DeepSpace', altitudeKm: 1500000, velocityKmS: 1.5, inclinationDeg: 12.0, color: '#a855f7', orbitRadius: 6.0, speed: 0.001, angle: 5.8, groundStation: 'Byalalu DSN 32m', signalStrength: 78 },
];

export default function OrbitSandbox() {
  const currentUser = useAppStore((state) => state.currentUser);
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [satellites, setSatellites] = useState<SatelliteData[]>(INITIAL_SATELLITES);
  const [selectedSatId, setSelectedSatId] = useState<string>(INITIAL_SATELLITES[0].id);
  const [isSimulating, setIsSimulating] = useState(true);
  const [timeWarp, setTimeWarp] = useState(1);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showGroundTracks, setShowGroundTracks] = useState(true);

  const selectedSat = satellites.find(s => s.id === selectedSatId) || satellites[0];

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 5, 12);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x222233, 1.5);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.set(15, 8, 10);
    scene.add(sunLight);

    // Earth Sphere
    const earthGeo = new THREE.SphereGeometry(1.8, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      color: 0x1e3a8a,
      emissive: 0x0a1128,
      specular: 0x38bdf8,
      shininess: 25,
      wireframe: false,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);

    // Atmosphere Glow Shield
    const atmosGeo = new THREE.SphereGeometry(1.88, 64, 64);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    const atmosphere = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosphere);

    // Coordinate Grid / Equator Ring
    const equatorGeo = new THREE.RingGeometry(1.82, 1.84, 64);
    const equatorMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
    const equator = new THREE.Mesh(equatorGeo, equatorMat);
    equator.rotation.x = Math.PI / 2;
    scene.add(equator);

    // Orbit Rings and Satellite Meshes
    const satMeshes: { mesh: THREE.Mesh; sat: SatelliteData; orbitLine: THREE.Line }[] = [];

    satellites.forEach(sat => {
      // Orbit Path Circle
      const points: THREE.Vector3[] = [];
      const segments = 128;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(
          Math.cos(theta) * sat.orbitRadius,
          Math.sin(theta) * Math.sin(THREE.MathUtils.degToRad(sat.inclinationDeg)) * (sat.orbitRadius * 0.4),
          Math.sin(theta) * Math.cos(THREE.MathUtils.degToRad(sat.inclinationDeg)) * sat.orbitRadius
        ));
      }
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(points);
      const orbitMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(sat.color),
        transparent: true,
        opacity: 0.35,
      });
      const orbitLine = new THREE.Line(orbitGeo, orbitMat);
      scene.add(orbitLine);

      // Satellite Mesh
      const satGeo = new THREE.BoxGeometry(0.14, 0.14, 0.22);
      const satMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(sat.color),
        emissive: new THREE.Color(sat.color),
        emissiveIntensity: 0.6,
      });
      const mesh = new THREE.Mesh(satGeo, satMat);
      scene.add(mesh);

      satMeshes.push({ mesh, sat, orbitLine });
    });

    // Starfield Background
    const starGeo = new THREE.BufferGeometry();
    const starCount = 800;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 80;
      starPositions[i + 1] = (Math.random() - 0.5) * 80;
      starPositions[i + 2] = (Math.random() - 0.5) * 80;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.8 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Mouse Drag Rotation
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      scene.rotation.y += deltaX * 0.005;
      scene.rotation.x += deltaY * 0.005;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Earth gentle self-rotation
      earth.rotation.y += 0.002;

      // Update Satellite Orbital Positions
      satMeshes.forEach(item => {
        if (isSimulating) {
          item.sat.angle += item.sat.speed * timeWarp;
        }

        const x = Math.cos(item.sat.angle) * item.sat.orbitRadius;
        const y = Math.sin(item.sat.angle) * Math.sin(THREE.MathUtils.degToRad(item.sat.inclinationDeg)) * (item.sat.orbitRadius * 0.4);
        const z = Math.sin(item.sat.angle) * Math.cos(THREE.MathUtils.degToRad(item.sat.inclinationDeg)) * item.sat.orbitRadius;

        item.mesh.position.set(x, y, z);
        item.mesh.rotation.y += 0.03;
        item.orbitLine.visible = showOrbits;
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      earthGeo.dispose();
      earthMat.dispose();
      renderer.dispose();
    };
  }, [satellites, isSimulating, timeWarp, showOrbits]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-sky-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(14,165,233,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/30 border border-sky-400/40">
            <Orbit className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '15s' }} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-indigo-300 to-teal-400">
                ORBIT SANDBOX // 3D SATELLITE TELEMETRY
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                KEPLERIAN LEO/GEO
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Interactive 3D orbital mechanics and ISRO ground-station telemetry for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Simulation Controls */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={() => {
              uiaudio.click();
              setIsSimulating(!isSimulating);
            }}
            className={cn(
              "px-4 py-2.5 rounded-xl font-bold flex items-center space-x-2 transition-all shadow-md",
              isSimulating 
                ? "bg-sky-500/20 text-sky-300 border border-sky-400/40" 
                : "bg-amber-500/20 text-amber-300 border border-amber-400/40"
            )}
          >
            {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isSimulating ? 'SIMULATING' : 'PAUSED'}</span>
          </button>

          {/* Time warp multiplier */}
          <div className="flex items-center space-x-1 bg-zinc-950/80 p-1 rounded-xl border border-white/10">
            {[1, 5, 20].map((warp) => (
              <button
                key={warp}
                onClick={() => {
                  uiaudio.hover();
                  setTimeWarp(warp);
                }}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors",
                  timeWarp === warp ? "bg-sky-500 text-black shadow-sm" : "text-zinc-400 hover:text-white"
                )}
              >
                {warp}X
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main 3D Canvas & Telemetry Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* 3D WebGL Canvas (3 Cols) */}
        <div className="xl:col-span-3 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-zinc-950 min-h-[580px] flex items-center justify-center">
          <div ref={mountRef} className="w-full h-[580px] cursor-grab active:cursor-grabbing" />

          {/* 3D Overlay HUD Controls */}
          <div className="absolute top-4 left-4 flex items-center space-x-2 font-mono text-xs">
            <button
              onClick={() => setShowOrbits(!showOrbits)}
              className={cn(
                "px-3 py-1.5 rounded-xl border transition-colors flex items-center space-x-1.5 backdrop-blur-md",
                showOrbits ? "bg-zinc-900/80 text-sky-400 border-sky-500/30" : "bg-zinc-950/60 text-zinc-500 border-white/5"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>ORBIT PATHS</span>
            </button>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-white">CONSTELLATION: {satellites.length} BIRDS ACTIVE</span>
            </div>
            <div>COORDINATES: DRAG MOUSE TO ROTATE VECTOR FRAME</div>
          </div>
        </div>

        {/* Selected Satellite Telemetry HUD (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Satellite className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              TELEMETRY INSPECTOR
            </h3>
          </div>

          {/* Satellites List */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 font-mono">
            {satellites.map((sat) => {
              const isSelected = sat.id === selectedSatId;

              return (
                <div
                  key={sat.id}
                  onClick={() => {
                    uiaudio.click();
                    setSelectedSatId(sat.id);
                  }}
                  className={cn(
                    "p-2.5 rounded-xl cursor-pointer transition-all border text-xs flex items-center justify-between",
                    isSelected 
                      ? "bg-zinc-800/80 border-sky-500/40 shadow-md text-white" 
                      : "bg-zinc-950/40 border-white/5 text-zinc-400 hover:border-white/10"
                  )}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sat.color }} />
                    <span className="truncate font-bold">{sat.name}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 uppercase">
                    {sat.type}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Detailed Readouts */}
          {selectedSat && (
            <div className="space-y-3 font-mono text-xs pt-2 border-t border-white/10">
              <div className="p-3 bg-zinc-950 rounded-xl border border-white/10 space-y-2">
                <div className="flex justify-between text-zinc-400">
                  <span>Orbital Altitude:</span>
                  <span className="text-sky-300 font-bold">{selectedSat.altitudeKm.toLocaleString()} KM</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Orbital Velocity:</span>
                  <span className="text-emerald-300 font-bold">{selectedSat.velocityKmS} KM/S</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Inclination:</span>
                  <span className="text-purple-300 font-bold">{selectedSat.inclinationDeg}°</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Ground Link:</span>
                  <span className="text-amber-300 font-bold truncate max-w-[130px]">{selectedSat.groundStation}</span>
                </div>
                <div className="flex justify-between text-zinc-400 pt-1 border-t border-white/5">
                  <span>Signal SNR:</span>
                  <span className="text-teal-400 font-bold">{selectedSat.signalStrength}% OPTIMAL</span>
                </div>
              </div>

              {/* Emergency Burn Action */}
              <button
                onClick={() => {
                  uiaudio.warp();
                  setSatellites(prev => prev.map(s => s.id === selectedSat.id ? { ...s, speed: s.speed * 1.5, velocityKmS: +(s.velocityKmS + 0.4).toFixed(2) } : s));
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold tracking-wider text-xs shadow-lg hover:brightness-110 flex items-center justify-center space-x-2 transition-all"
              >
                <Zap className="w-4 h-4" />
                <span>FIRE DELTA-V ORBITAL BURN</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
