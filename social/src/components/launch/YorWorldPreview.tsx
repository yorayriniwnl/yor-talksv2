import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './yor-world-preview.css';

export type YorWorldDistrict = 'commons' | 'studio' | 'dream';

interface YorWorldPreviewProps {
  selectedDistrict?: YorWorldDistrict;
  onSelectDistrict?: (district: YorWorldDistrict) => void;
}

const DISTRICTS: Record<YorWorldDistrict, { label: string; position: [number, number, number] }> = {
  commons: { label: 'The Commons', position: [0, 4, -0.6] },
  studio: { label: 'Creator Studio', position: [-4.05, 1.65, -0.5] },
  dream: { label: 'Dream Dock', position: [3.9, 1.85, 1.25] },
};

function WorldFallback() {
  return <img className="yw-fallback" src={`${import.meta.env.BASE_URL}images/yor-world-portal-v2.jpg`} alt="Yor World concept environment with a monumental illuminated portal" />;
}

function createArrivalScene(scene: THREE.Scene, world: THREE.Group) {
  const material = (color: string, metalness = 0.15, roughness = 0.75) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const stone = material('#282d32', 0.18);
  const mossStone = material('#444b50', 0.22);
  const ground = material('#646f70');
  const metal = material('#959fa2', 0.72, 0.29);
  const dark = material('#263530', 0.65, 0.36);
  const glass = material('#132d2a', 0.62, 0.2);
  const amber = new THREE.MeshStandardMaterial({ color: '#ffe0a1', emissive: '#ff9239', emissiveIntensity: 3.2, roughness: 0.4 });
  const lime = new THREE.MeshStandardMaterial({ color: '#dcfa94', emissive: '#a2d56d', emissiveIntensity: 1.25, roughness: 0.5 });
  let seed = 41;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const mesh = (geometry: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = world) => {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = world) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
  const cylinder = (top: number, bottom: number, h: number, mat: THREE.Material, x: number, y: number, z: number) => mesh(new THREE.CylinderGeometry(top, bottom, h, 64), mat, x, y, z);
  const torus = (radius: number, tube: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = world) => mesh(new THREE.TorusGeometry(radius, tube, 12, 96), mat, x, y, z, parent);

  const island = cylinder(5.9, 5.25, 0.8, stone, 0, -0.4, 0);
  island.scale.z = 0.72;
  const middle = cylinder(5.3, 3.8, 1.25, dark, 0, -1.35, 0);
  middle.scale.z = 0.7;
  const underside = cylinder(3.75, 1.3, 1.3, stone, -0.4, -2.5, -0.2);
  underside.scale.z = 0.72;
  const rockGeometry = new THREE.IcosahedronGeometry(1, 0);
  for (let i = 0; i < 68; i++) {
    const angle = random() * Math.PI * 2;
    const radius = 4.4 + random() * 1.65;
    const rock = mesh(rockGeometry, i % 3 ? stone : mossStone, Math.sin(angle) * radius, -0.35 - random() * 0.5, Math.cos(angle) * radius * 0.7);
    rock.scale.set(0.38 + random() * 0.7, 0.35 + random() * 0.8, 0.3 + random() * 0.8);
    rock.rotation.set(random(), random() * 4, random());
  }
  for (let i = 0; i < 13; i++) mesh(rockGeometry, stone, (random() - 0.5) * 8, -2.2 - random() * 0.7, (random() - 0.5) * 4).scale.set(0.3 + random() * 0.5, 0.8 + random() * 0.9, 0.35 + random() * 0.4);

  cylinder(2.6, 2.7, 0.16, ground, 0, 0.08, -0.35);
  cylinder(2.38, 2.5, 0.12, dark, 0, 0.2, -0.35);
  torus(2.43, 0.018, amber, 0, 0.27, -0.35).rotation.x = Math.PI / 2;
  for (let i = 0; i < 6; i++) box(1.5 + i * 0.12, 0.07, 0.32, metal, 0, 0.23 - i * 0.04, 2.05 + i * 0.29);

  // The Commons arrival portal frames an entirely procedural sunset landscape.
  const portal = new THREE.Group();
  portal.position.set(0, 2.72, -0.6);
  portal.rotation.y = -0.16;
  world.add(portal);
  torus(2.37, 0.25, metal, 0, 0, 0, portal);
  torus(2.37, 0.2, dark, 0, 0, 0.14, portal);
  torus(2.14, 0.032, amber, 0, 0, 0.19, portal);
  torus(2.61, 0.018, metal, 0, 0, 0.02, portal);
  for (let i = 0; i < 32; i++) {
    const angle = i / 32 * Math.PI * 2;
    const mark = box(0.035, 0.19, 0.065, i % 4 === 0 ? amber : dark, Math.sin(angle) * 2.38, Math.cos(angle) * 2.38, 0.23, portal);
    mark.rotation.z = -angle;
  }
  const landscape = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `
      varying vec2 vUv;
      void main(){
        vec2 p=vUv;
        vec3 sky=mix(vec3(.64,.23,.075),vec3(.035,.075,.08),smoothstep(.25,.95,p.y));
        float halo=exp(-length((p-vec2(.6,.47))*vec2(1.,1.1))*7.);
        sky+=vec3(1.,.47,.14)*halo*.9;
        float sun=1.-smoothstep(.026,.033,distance(p,vec2(.6,.47)));
        sky=mix(sky,vec3(1.,.9,.61),sun);
        for(int i=3;i>=0;i--){
          float f=float(i);
          float ridge=.23+f*.045+sin(p.x*(11.+f*3.)+f*4.)*(.026+f*.009)+sin(p.x*27.+f)*.013;
          sky=mix(sky,vec3(.025+f*.024,.055+f*.012,.053+f*.006),1.-smoothstep(ridge-.003,ridge+.003,p.y));
        }
        gl_FragColor=vec4(sky,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  mesh(new THREE.CircleGeometry(2.11, 96), landscape, 0, 0, 0.03, portal);
  const portalLight = new THREE.PointLight('#ffb465', 12, 10, 2);
  portalLight.position.set(0, 2, 1.5);
  world.add(portalLight);

  const studio = new THREE.Group();
  studio.position.set(-4.05, 0.05, -0.5);
  studio.rotation.y = 0.2;
  world.add(studio);
  box(1.9, 0.16, 2.15, ground, 0, 0.08, 0, studio);
  for (let i = 0; i < 3; i++) {
    const y = 0.49 + i * 0.63;
    box(1.55, 0.49, 1.4, dark, -i * 0.11, y, -i * 0.11, studio);
    box(1.7, 0.1, 1.6, metal, -i * 0.11, y + 0.3, -i * 0.11, studio);
    box(1.37, 0.22, 0.035, glass, -i * 0.11, y, 0.72 - i * 0.11, studio);
    box(1.38, 0.025, 0.04, lime, -i * 0.11, y + 0.13, 0.745 - i * 0.11, studio);
    for (let j = 0; j < 5; j++) box(0.025, 0.24, 0.04, metal, -0.57 + j * 0.28 - i * 0.11, y, 0.75 - i * 0.11, studio);
  }
  box(0.8, 0.65, 0.6, dark, -0.15, 2.35, -0.1, studio).rotation.z = 0.08;
  box(0.5, 0.025, 0.65, amber, -0.15, 2.7, -0.1, studio);

  cylinder(1.25, 1.4, 0.13, ground, 3.9, 0.13, 1.25);
  cylinder(1.08, 1.18, 0.13, dark, 3.9, 0.26, 1.25);
  torus(1.05, 0.025, lime, 3.9, 0.34, 1.25).rotation.x = Math.PI / 2;
  box(0.3, 2.7, 0.3, metal, 3.9, 1.7, 1.25).rotation.y = Math.PI / 4;
  box(0.055, 2.55, 0.33, lime, 3.9, 1.7, 1.25);
  torus(0.62, 0.08, metal, 3.9, 2.4, 1.25).rotation.y = 0.4;
  torus(0.47, 0.025, amber, 3.9, 2.4, 1.29).rotation.y = 0.4;
  box(2, 0.13, 0.75, metal, 2.5, 0.23, 1.6).rotation.y = 0.25;

  const grass = new THREE.InstancedMesh(new THREE.ConeGeometry(0.025, 0.6, 3), material('#83966a'), 180);
  const blade = new THREE.Object3D();
  for (let i = 0; i < 180; i++) {
    const angle = random() * Math.PI * 2;
    const radius = 4.7 + random() * 0.7;
    blade.position.set(Math.sin(angle) * radius, 0.05 + random() * 0.12, Math.cos(angle) * radius * 0.68);
    blade.scale.setScalar(0.5 + random());
    blade.rotation.set((random() - 0.5) * 0.4, random(), (random() - 0.5) * 0.4);
    blade.updateMatrix();
    grass.setMatrixAt(i, blade.matrix);
  }
  world.add(grass);
  for (const [x, z] of [[-2.4, 2.4], [1.8, 2.8], [-3, 1.6], [3.7, 2.6], [-2.8, -2], [2.7, -2.2]]) {
    box(0.09, 0.4, 0.09, dark, x, 0.2, z);
    box(0.13, 0.05, 0.13, amber, x, 0.43, z);
  }
  for (let i = 0; i < 5; i++) box(0.45 + random() * 0.3, 1.2 + random() * 1.8, 0.55, stone, -3 + i * 1.5, 0.5, -2.7).rotation.z = (random() - 0.5) * 0.15;

  const orbit = new THREE.EllipseCurve(0, 0, 7, 4.9, 0, Math.PI * 2, false, 0);
  const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbit.getPoints(128).map(point => new THREE.Vector3(point.x, -1.1, point.y)));
  scene.add(new THREE.LineLoop(orbitGeometry, new THREE.LineBasicMaterial({ color: '#b7cb93', transparent: true, opacity: 0.13 })));
  const selectionRing = torus(1.75, 0.016, lime, 0, 0.18, 0);
  selectionRing.rotation.x = Math.PI / 2;
  selectionRing.castShadow = false;
  return { selectionRing };
}

export default function YorWorldPreview({ selectedDistrict = 'commons', onSelectDistrict }: YorWorldPreviewProps) {
  const canvasHost = useRef<HTMLDivElement>(null);
  const controls = useRef<{ rotate: (amount: number) => void; reset: () => void; select: (district: YorWorldDistrict) => void; play: (enabled: boolean) => void } | null>(null);
  const labels = useRef<Partial<Record<YorWorldDistrict, HTMLButtonElement | null>>>({});
  const [mode, setMode] = useState<'webgl' | 'fallback'>('fallback');
  const [autoOrbit, setAutoOrbit] = useState(false);
  const [dragging, setDragging] = useState(false);
  const selected = useRef(selectedDistrict);
  selected.current = selectedDistrict;

  useEffect(() => { controls.current?.select(selectedDistrict); }, [selectedDistrict]);

  useEffect(() => {
    const host = canvasHost.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'low-power' });
      if (!context) return;
      renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      return;
    }

    let disposed = false;
    let intersecting = true;
    let frame = 0;
    let previousTime = 0;
    let auto = false;
    let pointer: { id: number; x: number; y: number } | null = null;
    let theta = 0.65;
    let targetTheta = theta;
    let elevation = 0.42;
    let targetElevation = elevation;
    let currentScale = 1;
    let targetScale = 1;
    let width = 1;
    let height = 1;
    const target = new THREE.Vector3(0, 0.95, 0);
    const desiredTarget = target.clone();
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-7, 7, 5, -5, 0.1, 100);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Geometry and lighting stay still, so reuse the shadow map while exploring.
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.className = 'yw-canvas';
    host.appendChild(renderer.domElement);

    const world = new THREE.Group();
    scene.add(world);
    const hemisphere = new THREE.HemisphereLight('#c8d4dd', '#0b0c13', 1.2);
    const key = new THREE.DirectionalLight('#ffbf85', 3.2);
    key.position.set(-5, 12, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.normalBias = 0.035;
    Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 35 });
    const rim = new THREE.DirectionalLight('#8eb7d2', 1.6);
    rim.position.set(7, 5, -5);
    scene.add(hemisphere, key, rim);

    const { selectionRing } = createArrivalScene(scene, world);
    const projection = new THREE.Vector3();

    const updateLabels = () => {
      (Object.keys(DISTRICTS) as YorWorldDistrict[]).forEach(district => {
        const label = labels.current[district];
        if (!label) return;
        const [x, y, z] = DISTRICTS[district].position;
        projection.set(x, y + (district === 'studio' ? 1.4 : district === 'commons' ? 1.2 : 1.3), z).project(camera);
        const halfLabel = label.offsetWidth / 2 + 8;
        label.style.left = `${THREE.MathUtils.clamp((projection.x * 0.5 + 0.5) * width, halfLabel, width - halfLabel)}px`;
        label.style.top = `${THREE.MathUtils.clamp((-projection.y * 0.5 + 0.5) * height, 61, height - 70)}px`;
      });
    };
    const render = () => {
      if (disposed) return;
      const radius = 15;
      camera.position.set(Math.sin(theta) * Math.cos(elevation) * radius + target.x, Math.sin(elevation) * radius + target.y, Math.cos(theta) * Math.cos(elevation) * radius + target.z);
      camera.lookAt(target);
      camera.zoom = currentScale;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      updateLabels();
    };
    const animate = (time: number) => {
      frame = 0;
      if (disposed || !intersecting || document.hidden) return;
      const dt = previousTime ? Math.min((time - previousTime) / 1000, 0.06) : 0.016;
      previousTime = time;
      // Orbit starts only after an explicit button press; reduced motion keeps all other transitions immediate.
      if (auto && !pointer) targetTheta += dt * 0.045;
      const lerp = media.matches ? 1 : 1 - Math.exp(-dt * 6);
      theta += (targetTheta - theta) * lerp;
      elevation += (targetElevation - elevation) * lerp;
      target.lerp(desiredTarget, lerp);
      currentScale += (targetScale - currentScale) * lerp;
      render();
      const moving = Math.abs(theta - targetTheta) > 0.0001 || Math.abs(elevation - targetElevation) > 0.0001 || target.distanceToSquared(desiredTarget) > 0.000001 || Math.abs(currentScale - targetScale) > 0.0001;
      if (auto || moving) frame = requestAnimationFrame(animate);
    };
    const requestRender = () => {
      if (!disposed && intersecting && !document.hidden && !frame) frame = requestAnimationFrame(animate);
    };
    const selectDistrict = (district: YorWorldDistrict) => {
      const position = DISTRICTS[district].position;
      desiredTarget.set(position[0] * 0.23, 0.95, position[2] * 0.23);
      targetTheta = district === 'studio' ? -0.18 : district === 'dream' ? 1.08 : 0.65;
      targetElevation = district === 'studio' ? 0.45 : district === 'dream' ? 0.41 : 0.42;
      targetScale = district === 'commons' ? 1 : 1.12;
      selectionRing.position.set(position[0], 0.165, position[2]);
      const scale = district === 'commons' ? 1 : 0.71;
      selectionRing.scale.set(scale, scale, 1);
      requestRender();
    };
    const resize = () => {
      width = Math.max(1, host.clientWidth);
      height = Math.max(1, host.clientHeight);
      const aspect = width / height;
      const vertical = Math.max(4.5, 6.5 / aspect);
      camera.left = -vertical * aspect;
      camera.right = vertical * aspect;
      camera.top = vertical;
      camera.bottom = -vertical;
      renderer.setSize(width, height, false);
      requestRender();
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      renderer.domElement.setPointerCapture(event.pointerId);
      setDragging(true);
    };
    const move = (event: PointerEvent) => {
      if (!pointer || pointer.id !== event.pointerId) return;
      targetTheta -= (event.clientX - pointer.x) * 0.007;
      targetElevation = THREE.MathUtils.clamp(targetElevation + (event.clientY - pointer.y) * 0.004, 0.38, 1.12);
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      requestRender();
    };
    const up = (event: PointerEvent) => {
      if (pointer?.id !== event.pointerId) return;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
      pointer = null;
      setDragging(false);
    };
    const wheel = (event: WheelEvent) => {
      // Ordinary wheel gestures continue to scroll the page. Pinch or Ctrl+wheel zooms the model.
      if (!event.ctrlKey) return;
      event.preventDefault();
      targetScale = THREE.MathUtils.clamp(targetScale - event.deltaY * 0.003, 0.8, 1.3);
      requestRender();
    };
    const visibility = () => {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; previousTime = 0; }
      else requestRender();
    };
    const motionChange = () => {
      if (media.matches) { auto = false; setAutoOrbit(false); }
      requestRender();
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frame);
      frame = 0;
      intersecting = false;
      if (!disposed) { setMode('fallback'); setAutoOrbit(false); }
    };
    controls.current = {
      rotate: amount => { targetTheta += amount; requestRender(); },
      reset: () => { targetTheta = 0.65; targetElevation = 0.42; targetScale = 1; selectDistrict(selected.current); },
      select: selectDistrict,
      play: enabled => { auto = enabled; requestRender(); },
    };
    renderer.domElement.addEventListener('pointerdown', down);
    renderer.domElement.addEventListener('pointermove', move);
    renderer.domElement.addEventListener('pointerup', up);
    renderer.domElement.addEventListener('pointercancel', up);
    renderer.domElement.addEventListener('wheel', wheel, { passive: false });
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    document.addEventListener('visibilitychange', visibility);
    media.addEventListener('change', motionChange);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    const intersectionObserver = new IntersectionObserver(entries => {
      intersecting = entries[0]?.isIntersecting ?? true;
      if (intersecting) requestRender();
      else { cancelAnimationFrame(frame); frame = 0; previousTime = 0; }
    }, { rootMargin: '80px' });
    intersectionObserver.observe(host);
    resize();
    selectDistrict(selected.current);
    try { render(); setMode('webgl'); }
    catch { setMode('fallback'); intersecting = false; }

    return () => {
      disposed = true;
      controls.current = null;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      media.removeEventListener('change', motionChange);
      renderer.domElement.removeEventListener('pointerdown', down);
      renderer.domElement.removeEventListener('pointermove', move);
      renderer.domElement.removeEventListener('pointerup', up);
      renderer.domElement.removeEventListener('pointercancel', up);
      renderer.domElement.removeEventListener('wheel', wheel);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse(object => {
        if (object instanceof THREE.InstancedMesh) object.dispose();
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments) {
          geometries.add(object.geometry);
          (Array.isArray(object.material) ? object.material : [object.material]).forEach(value => materials.add(value));
        }
      });
      geometries.forEach(value => value.dispose());
      materials.forEach(value => value.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  const toggleOrbit = () => {
    const next = !autoOrbit;
    setAutoOrbit(next);
    controls.current?.play(next);
  };

  return (
    <div className={`yw-world${dragging ? ' yw-dragging' : ''}`} data-world-renderer={mode} data-selected-district={selectedDistrict}>
      <div className="yw-aura" aria-hidden="true" />
      <div className="yw-scene-heading"><span className="yw-status-dot" />THE ARRIVAL<span className="yw-heading-divider">/</span><span>{mode === 'webgl' ? 'Explore the scene' : 'Concept environment'}</span></div>
      <div ref={canvasHost} className="yw-canvas-host" role="img" aria-label="Three dimensional preview of Yor World. Use the rotation controls or drag to explore the arrival scene." />
      {mode === 'fallback' && <WorldFallback />}
      {mode === 'webgl' && (Object.keys(DISTRICTS) as YorWorldDistrict[]).map(district => (
        <button key={district} type="button" ref={element => { labels.current[district] = element; }} className={`yw-district-label${selectedDistrict === district ? ' yw-district-active' : ''}`} onClick={() => onSelectDistrict?.(district)} aria-pressed={selectedDistrict === district}>
          <span className="yw-pin-dot" />{DISTRICTS[district].label}
        </button>
      ))}
      <div className="yw-scene-footer">
        <span className="yw-hint">{mode === 'webgl' ? 'Drag to explore' : 'A glimpse of what’s next'}</span>
        {mode === 'webgl' && <div className="yw-controls" role="group" aria-label="World camera controls">
          <button type="button" aria-label="Rotate world left" title="Rotate left" onClick={() => controls.current?.rotate(-Math.PI / 6)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m9 5-7 7 7 7M3 12h18"/></svg></button>
          <button type="button" aria-label="Reset world view" title="Reset view" onClick={() => controls.current?.reset()}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 10a9 9 0 1 1 1 7M3 4v6h6"/></svg></button>
          <button type="button" aria-label="Rotate world right" title="Rotate right" onClick={() => controls.current?.rotate(Math.PI / 6)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m15 5 7 7-7 7M21 12H3"/></svg></button>
          <span className="yw-control-divider" />
          <button type="button" aria-label={autoOrbit ? 'Pause world orbit' : 'Start world orbit'} title={autoOrbit ? 'Pause orbit' : 'Auto orbit'} aria-pressed={autoOrbit} onClick={toggleOrbit}>{autoOrbit ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m9 5 10 7-10 7Z"/></svg>}</button>
        </div>}
      </div>
    </div>
  );
}
