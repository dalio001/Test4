/**
 * HeroParticles — the home hero's signature WebGL layer: ~4,000 mint/cyan/
 * violet particles that swirl in on load and assemble into a large key
 * silhouette at center-right, then gently breathe (sine, 6s). The cursor
 * repels nearby particles with a soft spring-back (displacement + lerp decay,
 * per performance guide).
 *
 * Fallbacks (WebGL unavailable or prefers-reduced-motion) are handled by the
 * parent, which renders `/hero-fallback.png` instead. Code-split via
 * React.lazy — three.js never blocks first paint.
 */

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const COUNT = 4000;
const MINT = new THREE.Color('#35F0A1');
const CYAN = new THREE.Color('#38E1FF');
const VIOLET = new THREE.Color('#8B7CFF');

/** Sample target positions for a key silhouette: bow ring + shaft + teeth. */
function buildKeyTargets(): Float32Array {
  const targets = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const pick = Math.random();
    let x = 0;
    let y = 0;
    if (pick < 0.42) {
      // bow: ring with slight thickness, centered (-1.5, 0.1), radius .62
      const a = Math.random() * Math.PI * 2;
      const r = 0.62 + (Math.random() - 0.5) * 0.16;
      x = -1.5 + Math.cos(a) * r;
      y = 0.1 + Math.sin(a) * r;
    } else if (pick < 0.86) {
      // shaft: capsule from (-0.9, 0.1) to (1.5, 0.1), thickness .16
      x = -0.9 + Math.random() * 2.4;
      y = 0.1 + (Math.random() - 0.5) * 0.16;
    } else {
      // teeth: two downward bars at x=1.05 and x=1.42
      const tx = Math.random() < 0.5 ? 1.05 : 1.42;
      x = tx + (Math.random() - 0.5) * 0.12;
      y = 0.02 - Math.random() * 0.42;
    }
    targets[i * 3] = x;
    targets[i * 3 + 1] = y;
    targets[i * 3 + 2] = (Math.random() - 0.5) * 0.35; // depth jitter
  }
  return targets;
}

function KeyField() {
  const pointsRef = useRef<THREE.Points>(null);
  const mouseWorld = useRef(new THREE.Vector2(999, 999));
  const hasPointer = useRef(false);

  const { geometry, starts, targets, phases, displacement } = useMemo(() => {
    const starts = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const phases = new Float32Array(COUNT);
    const displacement = new Float32Array(COUNT * 3);
    const targets = buildKeyTargets();
    const palette = [MINT, CYAN, CYAN, MINT, VIOLET];
    for (let i = 0; i < COUNT; i++) {
      // random start cloud (sphere shell)
      const a = Math.random() * Math.PI * 2;
      const b = Math.acos(2 * Math.random() - 1);
      const r = 3.2 + Math.random() * 2.4;
      starts[i * 3] = r * Math.sin(b) * Math.cos(a);
      starts[i * 3 + 1] = r * Math.sin(b) * Math.sin(a);
      starts[i * 3 + 2] = (Math.random() - 0.5) * 3;
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      phases[i] = Math.random() * Math.PI * 2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(starts.slice(), 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return { geometry, starts, targets, phases, displacement };
  }, []);

  const startTime = useRef<number | null>(null);

  useFrame((state) => {
    const points = pointsRef.current;
    if (!points) return;
    if (startTime.current === null) startTime.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - startTime.current;

    // assembly progress 0→1 over 2.4s, ease-in-out
    const raw = Math.min(1, t / 2.4);
    const p = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
    const swirl = (1 - p) * 2.2; // angular offset while assembling

    // pointer → world coords at z=0 plane (camera fov 50, z=6)
    if (!hasPointer.current && (state.pointer.x !== 0 || state.pointer.y !== 0)) {
      hasPointer.current = true;
    }
    if (hasPointer.current) {
      const vh = 2 * Math.tan((50 * Math.PI) / 360) * 6;
      const vw = vh * state.viewport.aspect;
      mouseWorld.current.set(state.pointer.x * (vw / 2), state.pointer.y * (vh / 2));
    }

    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const breatheAmp = 0.045 * p; // ~8px at this scale
    const repelR = 0.72;

    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      const tx = targets[ix];
      const ty = targets[ix + 1];
      const tz = targets[ix + 2];

      // assemble with swirl around the key centroid
      const sx = starts[ix];
      const sy = starts[ix + 1];
      const sz = starts[ix + 2];
      const cos = Math.cos(swirl);
      const sin = Math.sin(swirl);
      const rx = sx * cos - sy * sin;
      const ry = sx * sin + sy * cos;
      const z = sz + (tz - sz) * p;

      // idle breathing (sine, per-particle phase)
      const x = rx + (tx - rx) * p + Math.cos(t * ((Math.PI * 2) / 6) * 0.7 + phases[i]) * breatheAmp * 0.5;
      const y = ry + (ty - ry) * p + Math.sin(t * ((Math.PI * 2) / 6) + phases[i]) * breatheAmp;

      // mouse repulsion — displacement with lerp decay (never touch base pos)
      const dx = x + displacement[ix] - (mouseWorld.current.x - 1.35); // key center offset
      const dy = y + displacement[ix + 1] - mouseWorld.current.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < repelR * repelR && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const f = ((repelR - d) / repelR) * 0.16;
        displacement[ix] += (dx / d) * f;
        displacement[ix + 1] += (dy / d) * f;
      }
      displacement[ix] *= 0.95;
      displacement[ix + 1] *= 0.95;
      displacement[ix + 2] *= 0.95;

      arr[ix] = x + displacement[ix];
      arr[ix + 1] = y + displacement[ix + 1];
      arr[ix + 2] = z + displacement[ix + 2];
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} position={[1.35, 0, 0]}>
      <pointsMaterial
        size={0.032}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/** Full-viewport particle canvas (absolute, behind hero content). */
export default function HeroParticles() {
  return (
    <Canvas
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }}
      camera={{ position: [0, 0, 6], fov: 50 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      <KeyField />
    </Canvas>
  );
}
